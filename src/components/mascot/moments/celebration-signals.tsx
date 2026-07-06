/* ------------------------------------------------------------------ *
 *  CelebrationSignals — the one place that reads the numbers the three
 *  "earned" celebration moments key off of, and hands them down to the
 *  client-side one-shot detector. A server component so the numbers are
 *  always fresh on every visit to whichever page mounts it (a leaf
 *  page.tsx re-renders per navigation; the shared AppShell/layout does
 *  not, which is why this deliberately does NOT live there — see
 *  mascot.md's "wired in" section for the mount, currently just /feed).
 *
 *  "Profile complete" here is a light heuristic for this one delight
 *  moment only (bio + city + workplace + job title filled in) — NOT the
 *  real profile-completion feature tracked in docs/ROADMAP.md, which is
 *  a separate, still-unbuilt, bigger piece of work.
 * ------------------------------------------------------------------ */

import { prisma } from "@/lib/prisma";
import { CelebrationDetector } from "./celebration-detector";

// How long after account creation a visit still counts as "just signed up"
// for the welcome moment. Generous enough to cover a slow first look
// around without ever firing on a routine return visit days later; the
// client-side one-shot latch (one-shot.ts) makes repeat visits inside this
// window permanently safe too.
const NEW_ACCOUNT_WINDOW_MS = 30 * 60 * 1000;

export async function CelebrationSignals({ userId }: { userId: string }) {
  const [user, postCount, letterCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { createdAt: true, bio: true, currentCity: true, workplace: true, jobTitle: true },
    }),
    prisma.post.count({ where: { authorId: userId, isHidden: false } }),
    prisma.post.count({ where: { authorId: userId, kind: "letter", isHidden: false } }),
  ]);

  if (!user) return null;

  const isNewAccount = Date.now() - user.createdAt.getTime() < NEW_ACCOUNT_WINDOW_MS;
  const profileComplete = Boolean(
    user.bio?.trim() && user.currentCity?.trim() && user.workplace?.trim() && user.jobTitle?.trim()
  );

  return (
    <CelebrationDetector
      userId={userId}
      isNewAccount={isNewAccount}
      letterCount={letterCount}
      postCount={postCount}
      profileComplete={profileComplete}
    />
  );
}
