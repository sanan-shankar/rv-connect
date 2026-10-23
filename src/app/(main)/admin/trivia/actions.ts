"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminActor } from "@/lib/admin";
import { writeAudit } from "@/lib/audit";
import { isUniqueViolation } from "@/lib/prisma-errors";
import { judge, normalize, questionById } from "@/lib/trivia-bank";

/* ------------------------------------------------------------------ *
 *  The trivia gate room's one write: accept an answer the gate turned
 *  away, and undo it (docs/spec/admin.md §9.11).
 *
 *  An accepted answer is a TriviaAnswer row, matched EXACTLY after
 *  normalize() and never widened by the one-letter rule (trivia-bank.ts
 *  judge). It changes who can get into the site, so both directions are
 *  audit-logged with the admin who did it.
 * ------------------------------------------------------------------ */

type Result = { success: true } | { error: string };

/* Long enough for any real answer; the gate's own log caps what it keeps at 200. */
const MAX_TYPED = 120;

function revalidate(questionId: string) {
  revalidatePath("/admin/trivia");
  revalidatePath(`/admin/trivia/${questionId}`);
}

export async function acceptTriviaAnswer(questionId: string, typed: string): Promise<Result> {
  const actor = await requireAdminActor();
  if (!actor.ok) return { error: actor.error };

  const q = typeof questionId === "string" ? questionById(questionId) : undefined;
  if (!q) return { error: "That question no longer exists." };
  const words = typeof typed === "string" ? typed.trim().slice(0, MAX_TYPED) : "";
  const answer = normalize(words);
  /* Two letters is the floor because one letter accepted for a whole question
     is a gate anybody walks through by trying the alphabet. */
  if (answer.length < 2) return { error: "That answer is too short to accept." };
  const verdict = judge(q, words);
  if (verdict.ok) {
    revalidate(q.id);
    return { success: true };
  }
  /* The judge refuses a question's own word before it reads this table, so
     accepting one would write a row and an audit line that never take
     effect. The room hides the button for these; this is the server's half. */
  if (verdict.how === "refused") {
    return { error: "The question refuses that word on purpose, so it cannot be accepted." };
  }

  try {
    await prisma.triviaAnswer.create({
      data: { questionId: q.id, answer, typed: words, addedById: actor.actorId },
    });
  } catch (err) {
    /* Two clicks, or two admins: the answer is accepted either way. */
    if (!isUniqueViolation(err)) throw err;
    revalidate(q.id);
    return { success: true };
  }
  await writeAudit({
    actorId: actor.actorId,
    action: "admin.trivia_accept",
    targetType: "trivia",
    targetId: q.id,
    ip: actor.ip,
    detail: words,
  });
  revalidate(q.id);
  return { success: true };
}

export async function unacceptTriviaAnswer(id: string): Promise<Result> {
  const actor = await requireAdminActor();
  if (!actor.ok) return { error: actor.error };
  if (typeof id !== "string") return { error: "Not found." };

  const gone = await prisma.triviaAnswer.findUnique({ where: { id } });
  if (!gone) return { success: true };
  await prisma.triviaAnswer.deleteMany({ where: { id } });
  await writeAudit({
    actorId: actor.actorId,
    action: "admin.trivia_unaccept",
    targetType: "trivia",
    targetId: gone.questionId,
    ip: actor.ip,
    detail: gone.typed,
  });
  revalidate(gone.questionId);
  return { success: true };
}
