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

  await prisma.$transaction([
    prisma.adminMessage.create({
      data: { threadId, authorId: session.user.id, fromAdmin: false, body, imageUrl },
    }),
    prisma.adminThread.update({
      where: { id: threadId },
      data: {
        lastMessageAt: new Date(),
        adminUnread: true,
        memberUnread: false,
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
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    return { error: "Not authorized" };
  }

  const parsed = parsePayload(input, session.user.id);
  if (!parsed.ok) return { error: parsed.error };
  const { body, imageUrl } = parsed;

  const thread = await prisma.adminThread.findUnique({
    where: { id: threadId },
    select: { id: true, memberId: true, kind: true, subject: true },
  });
  if (!thread) return { error: "We couldn't find that conversation" };

  await prisma.$transaction([
    prisma.adminMessage.create({
      data: { threadId, authorId: session.user.id, fromAdmin: true, body, imageUrl },
    }),
    prisma.adminThread.update({
      where: { id: threadId },
      data: {
        lastMessageAt: new Date(),
        memberUnread: true,
        adminUnread: false,
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
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    return { error: "Not authorized" };
  }
  if (status !== "open" && status !== "closed") return { error: "Unknown status" };

  const thread = await prisma.adminThread.findUnique({
    where: { id: threadId },
    select: { id: true },
  });
  if (!thread) return { error: "We couldn't find that conversation" };

  await prisma.adminThread.update({
    where: { id: threadId },
    data: { status, adminUnread: false },
  });

  revalidatePath("/admin");
  revalidatePath(`/messages/${threadId}`);
  return { threadId };
}

/** Clears the admin's "new" marker without replying (used when a queue row is opened). */
export async function markThreadSeenByAdmin(threadId: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    return { error: "Not authorized" };
  }
  await prisma.adminThread.updateMany({
    where: { id: threadId, adminUnread: true },
    data: { adminUnread: false },
  });
  return { threadId };
}
