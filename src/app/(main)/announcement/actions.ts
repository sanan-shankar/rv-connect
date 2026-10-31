"use server";

import { auth } from "@/lib/auth";
import { ANNOUNCEMENT_AT } from "@/lib/announcement";
import { IS_DEMO } from "@/lib/demo";
import { prisma } from "@/lib/prisma";

/**
 * The announcement window has opened for this member. It is one page, so
 * opening it is seeing it. Stamped on the account so it never opens again on
 * any device. docs/spec/announcement.md section 2.
 *
 * Takes nothing from the client, like markGuideSeen: the only fact it records
 * is "now, for the signed-in member", which the member could make happen
 * anyway by opening the Feed.
 *
 * A conditional updateMany: only a stamp missing or older than this
 * announcement's date is replaced, so a second call is a no-op and a later
 * announcement (a new ANNOUNCEMENT_AT) gets its own stamp.
 *
 * Answers whether the stamp is now in place (a second call finds it there and
 * answers yes), so the window can try again while it is open. Failure is
 * otherwise silent in production: nobody should meet an error because a window
 * could not be bookkept, and the browser keeps its own note, so a write that
 * never lands costs at most a second showing on another device. The demo never
 * opens the window; this refuses there anyway, before the client extension in
 * prisma.ts would. Development logs a failure, because a guard that hides its
 * own breakage is worse than no guard.
 */
export async function markAnnouncementSeen(): Promise<boolean> {
  if (IS_DEMO) return true;
  const session = await auth();
  if (!session?.user?.id) return false;

  try {
    await prisma.user.updateMany({
      where: {
        id: session.user.id,
        OR: [{ announcementSeenAt: null }, { announcementSeenAt: { lt: ANNOUNCEMENT_AT } }],
      },
      data: { announcementSeenAt: new Date() },
    });
    return true;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[markAnnouncementSeen] could not stamp the announcement", err);
    }
    return false;
  }
}
