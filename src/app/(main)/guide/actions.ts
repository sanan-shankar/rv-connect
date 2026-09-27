"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * The guide's first-run tour has ended for this member: finished, or closed
 * any other way. Stamped once, on the account, so it never runs again on any
 * device (owner, 2026-09-27: "only once, make sure that it doesn't happen
 * again and again"). docs/spec/guide.md section 5.3.
 *
 * Takes nothing from the client. The only fact it records is "now, for the
 * signed-in member", so there is nothing a crafted call could say that the
 * member could not already make happen by closing the sheet.
 *
 * A conditional updateMany rather than a read-then-write: the first stamp
 * wins and a second call (the last page reached, then the sheet closed) is a
 * no-op, with no transaction needed.
 *
 * Failure is silent in production, like markFeedSeen: nobody should meet an
 * error because a tour could not be bookkept, and the client keeps its own
 * note that the tour ended, so a failed write costs at most a second tour on
 * another device. In the public demo the write is DENIED by the client
 * extension in prisma.ts (guideSeenAt is not one of the visitor's own profile
 * fields), and the tour never runs there anyway. Development logs it, because
 * a guard that hides its own breakage is worse than no guard.
 */
export async function markGuideSeen(): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;

  try {
    await prisma.user.updateMany({
      where: { id: session.user.id, guideSeenAt: null },
      data: { guideSeenAt: new Date() },
    });
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[markGuideSeen] could not stamp the guide tour", err);
    }
  }
}
