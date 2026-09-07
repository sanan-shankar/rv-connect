import { prisma } from "@/lib/prisma";
import { postNotificationLink } from "@/lib/notification-links";

/* ------------------------------------------------------------------ *
 *  Bell rows about a post: the two ways one is written, and the one
 *  way a whole post's rows are taken down.
 *
 *  The writes lived inline in `feed/actions.ts` -- four of them, two
 *  carrying the M33 dedupe below in twelve hand-maintained lines each.
 *  jscpd never flagged the pair because the variable names and the
 *  message differed, which is the shape the fix-prompt calls "a sameness
 *  maintained by hand".
 * ------------------------------------------------------------------ */

/** Everything a bell row is. `link` comes from `postNotificationLink`, never
 *  from a hand-typed `/feed#<id>` -- a letter's comments live on the letter's
 *  own page (audit B-046), and `notification-links.test.mjs` sweeps for the
 *  literal. */
type MemberNotification = {
  userId: string;
  type: string;
  message: string;
  link: string;
};

/** One bell row, unconditionally. For the writes with no dedupe rule: a
 *  comment on your post, a reply to your comment. Both are somebody
 *  deliberately writing words, so a second one is genuinely a second event. */
export async function notifyMember(row: MemberNotification): Promise<void> {
  await prisma.notification.create({ data: row });
}

/**
 * One notification per person per thing, not one per tap (audit M33).
 *
 * Unliking and re-liking used to mint a fresh row every time, so anyone
 * fidgeting with a heart could fill the author's bell with the same sentence.
 * An UNREAD row already saying exactly this is already saying what a second
 * one would say, so if one is sitting there, leave it. Once they have read it,
 * a later like is news again.
 *
 * Matched on the whole row -- userId, type, message and link -- because the
 * message is what the reader sees and the link is where it goes. Two different
 * people liking the same post write two different messages and so two rows,
 * which is right.
 *
 * This was written twice, in `toggleLike` and `toggleCommentLike`, kept in
 * step by a comment saying "same rule as toggleLike". It lives here so the
 * next writer of a "liked your photograph" gets the rule by calling this
 * rather than by copying twelve lines.
 */
export async function notifyMemberOnceUnread(row: MemberNotification): Promise<void> {
  const alreadyTold = await prisma.notification.findFirst({
    where: { ...row, read: false },
    select: { id: true },
  });
  if (alreadyTold) return;
  await prisma.notification.create({ data: row });
}

/**
 * Take down the bell rows that point at a post that is no longer readable.
 *
 * Every like, comment and reply notification links at `postNotificationLink`,
 * and nothing reconciled those rows with the post's own life: delete a letter
 * and the "X replied to your comment" in somebody else's bell still pointed at
 * `/letters/<id>`, which answers 404. Notifications are kept until the
 * 30-day sweep, so the window is a month (bug-report-2 C-054). Catch-ups has
 * done this since it was written -- `clearCatchupNotifications` is the
 * in-repo counterexample this mirrors.
 *
 * Matched on the exact link rather than on a type list, because the link IS
 * the thing that has stopped working, and one post's rows are exactly the ones
 * carrying its link.
 *
 * `keepFor` is the author on a moderator's HIDE: the row is still there, and
 * the author (like an admin) can still open it to see the notice, so their own
 * notifications still lead somewhere. Everybody else gets the 404 and their
 * rows go.
 */
export async function clearPostNotifications(
  post: { id: string; kind?: string | null },
  opts?: { keepFor?: string | null }
): Promise<void> {
  await prisma.notification.deleteMany({
    where: {
      link: postNotificationLink(post),
      ...(opts?.keepFor ? { userId: { not: opts.keepFor } } : {}),
    },
  });
}
