"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { IS_DEMO } from "@/lib/demo";
import { prisma } from "@/lib/prisma";
import { adminMessageSchema } from "@/lib/validators";
import { deriveSubject, previewOf, threadTitle } from "@/lib/admin-threads";
import {
  isMessageRateLimited,
  isThreadRateLimited,
  notifyAdmins,
} from "@/lib/admin-threads-server";
import { ownedUploadUrls } from "@/lib/upload-ownership";
import { adminThreadLink } from "@/lib/notification-links";
import { DOUBLE_SUBMIT_MS } from "@/lib/double-submit";

/**
 * Every mutation for member <-> admin conversations.
 *
 * The security rule, applied in each action against the session and never
 * against anything the caller passes: a member may read and write ONLY the
 * threads whose memberId is their own; only role === "admin" may read every
 * thread or write as an admin. There is no client-supplied "isAdmin" anywhere.
 */

type ActionResult =
  | { error: string; threadId?: undefined }
  | { threadId: string; error?: undefined };

/** The admin half of the rule above, in one place instead of three.
 *  Returns the acting admin, or null for everybody else. Each of the three
 *  admin actions below spelled this same session read and role compare out for
 *  itself; a security check that exists three times is one that can be fixed
 *  twice and left wrong once. `auth()` is cache()d per request, so pulling it
 *  into a helper costs nothing. */
async function actingAdmin() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") return null;
  return session.user;
}

type ParsedPayload =
  | { ok: false; error: string }
  | { ok: true; body: string; kind?: "bug" | "idea" | "message"; imageUrl?: string };

/** Validates the shared body/kind/image payload and the optional screenshot URL.
 *  `callerId` is the SESSION user's id, so the screenshot must sit under the
 *  caller's OWN `uploads/<their id>/` prefix -- not merely be some uploaded URL. */
function parsePayload(
  input: { body: string; kind?: string; imageUrl?: string },
  callerId: string
): ParsedPayload {
  const parsed = adminMessageSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "That message didn't go through",
    };
  }
  const { imageUrl } = parsed.data;
  // A screenshot URL must be one this caller uploaded. ownedUploadUrls checks
  // both halves of the C2 rule: minted-by-this-app AND owner-prefixed, so a
  // hand-rolled action call cannot plant a remote tracking pixel OR hotlink
  // another member's upload into a thread (the gap the old isUploadedImageUrl
  // prefix-only check left open).
  if (imageUrl) {
    const owned = ownedUploadUrls([imageUrl], callerId);
    if (!owned.ok) {
      return {
        ok: false,
        error: "That image didn't come from an upload here. Try attaching it again.",
      };
    }
  }
  return { ok: true, ...parsed.data };
}

/**
 * The fast path: one text box, send. Kind and screenshot are optional, and a
 * subject is derived from the text so the member is never asked to name their
 * own bug report.
 */
export async function startThread(input: {
  body: string;
  kind?: string;
  imageUrl?: string;
}): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not signed in" };
  if (IS_DEMO) return { error: "Messages here reach a real person, so the demo keeps this one closed." };

  const parsed = parsePayload(input, session.user.id);
  if (!parsed.ok) return { error: parsed.error };
  const { body, kind, imageUrl } = parsed;

  if (await isThreadRateLimited(session.user.id)) {
    return { error: "That's a lot of messages at once. Give it an hour and send the rest." };
  }

  /* The server half of the double-submit guard (audit C-128).
     A message is free text, so no unique index can dedupe it, and the
     composer's `sending` STATE guard binds on the next render -- which
     Cmd+Enter key-repeat plus a Send click gets past, and which two tabs never
     saw. The same person opening the same conversation with the same words
     seconds apart is a duplicate submission, and every one of them pages the
     admins again. Same window and same reasoning as the feed's. */
  const twin = await prisma.adminThread.findFirst({
    where: {
      memberId: session.user.id,
      createdAt: { gte: new Date(Date.now() - DOUBLE_SUBMIT_MS) },
      messages: { some: { authorId: session.user.id, fromAdmin: false, body } },
    },
    select: { id: true },
  });
  if (twin) {
    revalidatePath("/messages");
    return { threadId: twin.id };
  }

  const thread = await prisma.adminThread.create({
    data: {
      memberId: session.user.id,
      kind: kind ?? "message",
      subject: deriveSubject(body),
      adminUnread: true,
      messages: {
        create: { authorId: session.user.id, fromAdmin: false, body, imageUrl },
      },
    },
    select: { id: true },
  });

  await notifyAdmins(
    `${session.user.name} wrote: ${previewOf(body, 70)}`,
    adminThreadLink(thread.id)
  );

  revalidatePath("/messages");
  revalidatePath("/admin");
  return { threadId: thread.id };
}

/** A member replying inside their own thread. Reopens a closed thread. */
export async function replyToThread(
  threadId: string,
  input: { body: string; imageUrl?: string }
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not signed in" };
  if (IS_DEMO) return { error: "Messages here reach a real person, so the demo keeps this one closed." };

  const parsed = parsePayload(input, session.user.id);
  if (!parsed.ok) return { error: parsed.error };
  const { body, imageUrl } = parsed;

  const thread = await prisma.adminThread.findUnique({
    where: { id: threadId },
    select: { id: true, memberId: true, kind: true, subject: true },
  });
  // Ownership, server-side, every time. A member may only ever write into
  // their own thread; a wrong id is indistinguishable from a missing one.
  if (!thread || thread.memberId !== session.user.id) {
    return { error: "We couldn't find that conversation" };
  }

  if (await isMessageRateLimited(session.user.id)) {
    return { error: "That's a lot of messages at once. Give it an hour and send the rest." };
  }

  // Same guard as startThread above (audit C-128): a repeated send inside one
  // conversation posts the line twice and notifies the admins twice.
  const twinReply = await prisma.adminMessage.findFirst({
    where: {
      threadId,
      authorId: session.user.id,
      fromAdmin: false,
      body,
      createdAt: { gte: new Date(Date.now() - DOUBLE_SUBMIT_MS) },
    },
    select: { id: true },
  });
  if (twinReply) return { threadId };

  await prisma.$transaction([
    prisma.adminMessage.create({
      data: { threadId, authorId: session.user.id, fromAdmin: false, body, imageUrl },
    }),
    prisma.adminThread.update({
      where: { id: threadId },
      // Only the OTHER side's flag is touched here. Writing your own `false`
      // in the same statement is what made this a lost update: an admin reply
      // and a member reply committing in the same instant overwrote each
      // other's dot, so a message that was genuinely there arrived with no
      // unread mark (audit B-201). Replying is not reading anyway; opening the
      // thread is, and that path already clears the flag with its own
      // conditional updateMany.
      data: {
        lastMessageAt: new Date(),
        adminUnread: true,
        status: "open",
      },
    }),
  ]);

  await notifyAdmins(
    `${session.user.name} replied about "${threadTitle(thread)}"`,
    adminThreadLink(threadId)
  );

  revalidatePath("/messages");
  revalidatePath(`/messages/${threadId}`);
  revalidatePath("/admin");
  return { threadId };
}

/** An admin replying in any thread. Notifies the member it belongs to. */
export async function adminReplyToThread(
  threadId: string,
  input: { body: string; imageUrl?: string }
): Promise<ActionResult> {
  const admin = await actingAdmin();
  if (!admin) return { error: "Not authorized" };

  const parsed = parsePayload(input, admin.id);
  if (!parsed.ok) return { error: parsed.error };
  const { body, imageUrl } = parsed;

  const thread = await prisma.adminThread.findUnique({
    where: { id: threadId },
    select: { id: true, memberId: true, kind: true, subject: true },
  });
  if (!thread) return { error: "We couldn't find that conversation" };

  await prisma.$transaction([
    prisma.adminMessage.create({
      data: { threadId, authorId: admin.id, fromAdmin: true, body, imageUrl },
    }),
    prisma.adminThread.update({
      where: { id: threadId },
      // The member's own flag is left alone; see replyToThread above.
      data: {
        lastMessageAt: new Date(),
        memberUnread: true,
        status: "open",
      },
    }),
    prisma.notification.create({
      data: {
        userId: thread.memberId,
        type: "admin_message",
        message: `The admins replied: ${previewOf(body, 70)}`,
        link: `/messages/${threadId}`,
      },
    }),
  ]);

  revalidatePath("/admin");
  revalidatePath(`/messages/${threadId}`);
  return { threadId };
}

/** Admin-only: park a thread that's been dealt with. A member reply reopens it. */
export async function setThreadStatus(
  threadId: string,
  status: "open" | "closed"
): Promise<ActionResult> {
  if (!(await actingAdmin())) return { error: "Not authorized" };
  if (status !== "open" && status !== "closed") return { error: "Unknown status" };

  const thread = await prisma.adminThread.findUnique({
    where: { id: threadId },
    select: { id: true },
  });
  if (!thread) return { error: "We couldn't find that conversation" };

  /* Status only. Closing is not READING (audit C-053).
     This cleared `adminUnread` unconditionally, so a member reply that
     committed after the admin's page rendered -- which sets adminUnread and
     reopens the thread -- was wiped by the next "Sorted", and the message went
     into the closed pile with nothing anywhere saying it had arrived. Same
     reasoning the reply path already carries for B-201: opening a thread is
     what marks it read, and `markThreadSeenByAdmin` owns that flag. */
  await prisma.adminThread.update({
    where: { id: threadId },
    data: { status },
  });

  revalidatePath("/admin");
  revalidatePath(`/messages/${threadId}`);
  return { threadId };
}

/** Clears the admin's "new" marker without replying (used when a queue row is opened). */
export async function markThreadSeenByAdmin(
  threadId: string,
  /** The newest message the caller had rendered, if it knows. */
  seenThrough?: Date
): Promise<ActionResult> {
  if (!(await actingAdmin())) return { error: "Not authorized" };
  /* Only when nothing has arrived since the page was built (audit C-061).
     `seenThrough` is the newest message the admin actually had on screen. A
     reply committing between that query and this write used to have its
     just-set flag cleared without ever being rendered, so the thread looked
     read and the message was invisible until somebody opened it again by
     chance. Callers that pass nothing keep the old unconditional clear. */
  await prisma.adminThread.updateMany({
    where: {
      id: threadId,
      adminUnread: true,
      ...(seenThrough ? { lastMessageAt: { lte: seenThrough } } : {}),
    },
    data: { adminUnread: false },
  });
  return { threadId };
}
