/* ------------------------------------------------------------------ *
 *  /lab/catchups/swipe - the swipe that goes back two photographs.
 *
 *  The owner, brief 28: "I've reached the last picture. Now if I swipe
 *  right to go back, instead of taking me to the second picture when I'm
 *  on the third picture, it takes me all the way back to the first
 *  picture. Why? I don't know. And even when it takes me back to the
 *  first picture, it overshoots by a lot, and it's this very janky,
 *  sudden, fast-moving thing." He confirmed on 2026-09-09 that it
 *  happens on the phone AND the laptop.
 *
 *  It has not reproduced on a development machine, across six attempts
 *  on 2026-09-08 and 09: a real touch swipe, the arrow keys, a
 *  trackpad-style wheel fling and two swipes 150ms apart, at 390 and at
 *  1440. The stepping code clamps at both ends and one gesture calls it
 *  exactly once. So the difference is not the code, it is the GESTURE:
 *  a headless browser has no inertia phase and a real finger does.
 *
 *  Rather than guess at a fix for code that measures correct, this room
 *  puts the instrument on the owner's own device. It draws the real
 *  photographs from the answer he was looking at, opens them in the SAME
 *  shared viewer the feed and the Collection use, and writes down two
 *  things while he swipes: every pointer that touches the glass, and
 *  every time the photograph on screen changes. Nothing is simulated and
 *  nothing is patched -- the viewer is imported exactly as the app
 *  imports it.
 *
 *  What the trace answers, in one gesture:
 *
 *    one pointer, one change     the viewer is fine and the fault is
 *                                elsewhere
 *    one pointer, two changes    a single swipe is stepping twice, which
 *                                is the bug, and the trace says how far
 *                                apart the two landed
 *    two pointers, two changes   the finger is being counted twice, and
 *                                the gap between them is the fix's
 *                                threshold
 *
 *  Admin only, through the lab layout. Reads one answer, writes nothing.
 * ------------------------------------------------------------------ */

import { requireLabAdmin } from "@/app/lab/_gate";
import { prisma } from "@/lib/prisma";
import { SwipeTrace } from "./_trace";

export const dynamic = "force-dynamic";

/** The answer he was looking at, or any other with three photographs on it. */
async function photographs(): Promise<string[]> {
  const entries = await prisma.catchupEntry.findMany({
    where: { images: { not: null }, edition: { status: "published" } },
    select: { images: true },
    orderBy: { createdAt: "asc" },
    take: 40,
  });
  for (const e of entries) {
    try {
      const urls = JSON.parse(e.images ?? "[]") as unknown;
      if (Array.isArray(urls) && urls.length >= 3 && urls.every((u) => typeof u === "string")) {
        return urls as string[];
      }
    } catch {
      /* An answer whose images column is not JSON is not this room's problem. */
    }
  }
  return [];
}

export default async function SwipeRoom() {
  await requireLabAdmin();
  return <SwipeTrace photos={await photographs()} />;
}
