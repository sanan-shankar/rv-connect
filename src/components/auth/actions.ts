"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signupSchema } from "@/lib/validators";
import { titleCase, normalizePhone } from "@/lib/normalize";
import { hasPassedTrivia } from "./trivia-actions";

/**
 * The board credential (ISC/ICSE), derived from the two facts we now collect:
 * the year they left and their batch (12th-grade graduating year). Their grade
 * in the final year is 12 minus the gap between the batch year and the year
 * they left, so a 12th-grade leaver reads ISC, a 10th/11th leaver ICSE, and an
 * earlier leaver has no board credential. Mirrors computeBatchFromSchooling's
 * old grade-based rule without needing the retired gradeJoined field.
 */
function batchTypeFromLeaving(
  yearLeft: number,
  batchYear: number
): "ISC" | "ICSE" | null {
  const gradeAtLeaving = 12 - (batchYear - yearLeft);
  if (gradeAtLeaving >= 12) return "ISC";
  if (gradeAtLeaving >= 10) return "ICSE";
  return null;
}

export async function registerUser(formData: FormData) {
  // The trivia gate is enforced server-side: a valid signed pass cookie must be
  // present, so the gate cannot be skipped by jumping straight to register.
  if (!(await hasPassedTrivia())) {
    return { error: "Please answer the entry question before signing up." };
  }

  const password = formData.get("password") as string;

  if (!password || password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const accountType = (formData.get("accountType") as string) || "alumnus";
  const isAlum = accountType === "alumnus";
  const num = (key: string) =>
    formData.get(key) ? Number(formData.get(key)) : undefined;
  const rawPhone = (formData.get("phone") as string) || "";
  const raw = {
    firstName: formData.get("firstName") as string,
    lastName: formData.get("lastName") as string,
    email: formData.get("email") as string,
    password,
    phone: rawPhone.trim() || undefined,
    accountType,
    // Alumni give their batch directly plus the two plain years they joined and
    // left; the board credential is derived below. Teachers send none of these.
    yearJoined: isAlum ? num("yearJoined") : undefined,
    yearLeft: isAlum ? num("yearLeft") : undefined,
    batchYear: isAlum ? num("batchYear") : undefined,
  };

  const parsed = signupSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  if (isAlum && parsed.data.yearLeft! < parsed.data.yearJoined!) {
    return { error: "The year you left cannot be before the year you joined." };
  }

  // batchYear is written straight through (the person told us their batch).
  // batchType (the board credential) is the only derived value now, worked out
  // from the year they left and their batch.
  let batchYear: number | null = null;
  let batchType: "ICSE" | "ISC" | null = null;
  if (isAlum) {
    batchYear = parsed.data.batchYear!;
    batchType = batchTypeFromLeaving(parsed.data.yearLeft!, batchYear);
  }

  // Check if user already exists
  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });

  if (existing) {
    return { error: "An account with this email already exists. Try signing in instead." };
  }

  // Hash the password
  const hashedPassword = await bcrypt.hash(password, 12);

  // First name and surname are collected separately but stored as one plain
  // name, joined by a single space. Both halves are already trimmed by the
  // schema; titleCase silently fixes casing (all-caps or all-lowercase typing)
  // so "AMY IYER" and "amy iyer" both store as "Amy Iyer".
  const name = `${titleCase(parsed.data.firstName)} ${titleCase(parsed.data.lastName)}`;

  // Phone is optional and never verified; we only normalize it to digits with
  // an optional leading "+" so every stored number reads the same way.
  const phone = parsed.data.phone ? normalizePhone(parsed.data.phone) : null;

  // Create the user. gradeJoined is deliberately not written here: sign-up now
  // takes the batch directly, so that column stays untouched.
  const user = await prisma.user.create({
    data: {
      name,
      email: parsed.data.email,
      password: hashedPassword,
      phone,
      accountType: parsed.data.accountType,
      batchType,
      batchYear,
      yearJoined: parsed.data.yearJoined ?? null,
      yearLeft: parsed.data.yearLeft ?? null,
    },
  });

  // Every alumnus is auto-added to their batch group ("Batch of {year}"), which
  // is created on demand by the first person from that batch to join. No manual
  // joining. Teachers have no batch and skip this. A failure here must not sink
  // an otherwise-successful registration, so it is best-effort.
  if (isAlum && batchYear != null) {
    try {
      await joinBatchGroup(user.id, batchYear);
    } catch (err) {
      console.error("Batch group auto-join failed", err);
    }
  }

  return { success: true, email: parsed.data.email };
}

/**
 * Find-or-create the "Batch of {year}" group and add the user as a member.
 * Idempotent on membership via the GroupMember (groupId, userId) unique
 * constraint, so re-running is safe.
 */
async function joinBatchGroup(userId: string, batchYear: number) {
  const name = `Batch of ${batchYear}`;

  // Group.name is not unique in the schema, so match by exact name. The first
  // person from a batch creates the group (they become its creator only to
  // satisfy the required FK; everyone joins as a plain member since a batch
  // group has no keeper).
  let group = await prisma.group.findFirst({
    where: { name },
    select: { id: true },
  });

  if (!group) {
    group = await prisma.group.create({
      data: {
        name,
        description: `Everyone from the batch of ${batchYear}.`,
        visibility: "public",
        creatorId: userId,
      },
      select: { id: true },
    });
  }

  await prisma.groupMember.upsert({
    where: { groupId_userId: { groupId: group.id, userId } },
    create: { groupId: group.id, userId, role: "member" },
    update: {},
  });
}
