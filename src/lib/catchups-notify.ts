/* ------------------------------------------------------------------ *
 *  Catch-ups: notification builders.
 *
 *  Writes rows into the existing `Notification` model for the six Catch-up
 *  triggers in catchups.md section 5. `Notification.type` is a free string,
 *  so these new types need no migration.
 *
 *  Each builder accepts a `CatchupDb` (the shared client OR a transaction
 *  client) so it can run inside `advanceEdition`'s transaction and commit
 *  atomically with the status flip (exactly-once), or standalone from a
 *  server action.
 *
 *  Recipients follow section 5's rules:
 *   - questions-open / answers-open / published: all group members, minus
 *     anyone who has deleted their own copy (B-063; see `groupMemberIds`).
 *   - the two dated reminders: only members with no Entry yet, filtered by
 *     CatchupPref.reminderMode (default "all" when a member has no pref row).
 *   - the manual Keeper nudge: all non-answerers, bypassing "off".
 *   - love (optional): the answer's author, coalesced so it cannot spam.
 *
 *  All copy is placeholder. The owner rewrites it later (spec section 5).
 * ------------------------------------------------------------------ */

import { answerReminderMessage } from "@/lib/catchups-core";
import type {
  CatchupDb,
  NotifyAnswersOpenFn,
  NotifyLoveFn,
  NotifyPublishedFn,
  NotifyQuestionsOpenFn,
  NotifyReminderFn,
  ReminderMode,
} from "@/lib/catchups-types";

// ─── Recipient helpers ───────────────────────────────────────────────────────

/**
 * Everyone this Catch-up should reach.
 *
 * Everyone in the group, which since build phase 5 is the whole answer.
 *
 * It used to subtract whoever had thrown their own copy away (bug audit
 * B-063): a binned copy sat in "Recently deleted" for thirty nights with the
 * membership row still in place, so the audience and the membership disagreed
 * for a month and this query was what kept them honest. Deleting became
 * LEAVING (his, N18), and leaving takes the `GroupMember` row in the same
 * breath, so there is nothing left to subtract -- a member who is out is out
 * of this query by construction.
 *
 * An ARCHIVED copy is not excluded, and that is deliberate. Archiving is
 * filing; muting has its own control (`CatchupPref.reminderMode`), and quietly
 * making one mean the other would leave a member who filed a Catch-up away
 * missing the Edition they were still expecting.
 */
async function groupMemberIds(db: CatchupDb, groupId: string): Promise<string[]> {
  const rows = await db.groupMember.findMany({ where: { groupId }, select: { userId: true } });
  return rows.map((r) => r.userId);
}

async function answeredUserIds(db: CatchupDb, editionId: string): Promise<Set<string>> {
  const rows = await db.catchupEntry.findMany({
    where: { editionId },
    select: { authorId: true },
    distinct: ["authorId"],
  });
  return new Set(rows.map((r) => r.authorId));
}

/** Members who have not written any Entry in this Edition. */
async function nonAnswererIds(
  db: CatchupDb,
  groupId: string,
  editionId: string
): Promise<string[]> {
  const [members, answered] = await Promise.all([
    groupMemberIds(db, groupId),
    answeredUserIds(db, editionId),
  ]);
  return members.filter((id) => !answered.has(id));
}

async function createMany(
  db: CatchupDb,
  userIds: string[],
  type: string,
  message: string,
  link: string
): Promise<void> {
  const recipients = [...new Set(userIds)];
  if (recipients.length === 0) return;
  await db.notification.createMany({
    data: recipients.map((userId) => ({ userId, type, message, link })),
  });
}

// ─── Triggers ────────────────────────────────────────────────────────────────

/** Edition enters `collecting`: invite everyone to add a question. */
export const notifyQuestionsOpen: NotifyQuestionsOpenFn = async (db, ctx) => {
  const members = (await groupMemberIds(db, ctx.groupId)).filter(
    (id) => id !== ctx.excludeUserId
  );
  await createMany(
    db,
    members,
    "catchup_questions_open",
    `${ctx.groupName} is starting a Catch-up. Add a question you want everyone to answer.`,
    `/catchups/${ctx.catchupId}`
  );
};

/** Edition enters `answering`: answers are open. Re-fired to non-answerers on a too-few extension. */
export const notifyAnswersOpen: NotifyAnswersOpenFn = async (db, ctx) => {
  const audience = ctx.onlyNonAnswerers
    ? await nonAnswererIds(db, ctx.groupId, ctx.editionId)
    : await groupMemberIds(db, ctx.groupId);
  const members = audience.filter((id) => id !== ctx.excludeUserId);
  await createMany(
    db,
    members,
    "catchup_answers_open",
    `Answers are open for ${ctx.groupName}'s Catch-up. Share yours.`,
    `/catchups/${ctx.catchupId}/answer`
  );
};

/**
 * A reminder to non-answerers. Fires once a DAY while the answer window is
 * open (owner, 2026-08-05), with `daysLeft` counting down; `bypassOff` is the
 * manual Keeper nudge, which reaches everyone with no Entry regardless of
 * their pref.
 *
 * Who gets one:
 *   - "all" (shown as Daily): every day.
 *   - "last": only on the last day.
 *   - "off": never, unless this is the Keeper's manual nudge.
 *
 * Today's reminder REPLACES yesterday's rather than stacking on it (owner:
 * "make sure it deletes the previous notification, so that they don't build
 * up"). The delete is scoped by type + link, so it takes out exactly this
 * Catch-up's reminders and nothing else, and it runs over every group member
 * rather than just today's recipients: someone who has since answered, or who
 * has switched their pref to off, should have their stale nudge cleared too
 * rather than left sitting in the bell forever.
 *
 * Both statements share the caller's transaction, so a reader can never catch
 * the gap where the old one is gone and the new one is not there yet.
 */
export const notifyReminder: NotifyReminderFn = async (db, ctx) => {
  const link = `/catchups/${ctx.catchupId}/answer`;
  const days = ctx.daysLeft ?? 0;
  const [members, answered] = await Promise.all([
    groupMemberIds(db, ctx.groupId),
    answeredUserIds(db, ctx.editionId),
  ]);
  const nonAnswerers = members.filter((id) => !answered.has(id));

  let recipients = nonAnswerers;
  if (!ctx.bypassOff) {
    const prefs = await db.catchupPref.findMany({
      where: { catchupId: ctx.catchupId, userId: { in: nonAnswerers } },
      select: { userId: true, reminderMode: true },
    });
    const prefByUser = new Map<string, ReminderMode>(
      prefs.map((p) => [p.userId, p.reminderMode as ReminderMode])
    );
    const isLastDay = days <= 1;
    recipients = nonAnswerers.filter((id) => {
      // Default to "all" when a member has never set a pref.
      const mode = prefByUser.get(id) ?? "all";
      if (mode === "all") return true;
      if (mode === "last") return isLastDay;
      return false;
    });
  }

  if (members.length > 0) {
    await db.notification.deleteMany({
      where: { userId: { in: members }, type: "catchup_reminder", link },
    });
  }
  if (recipients.length === 0) return;

  /* The sentence counts valley calendar days, the same way the answer page it
     links to does. `days` above is a 24-hour count and stays that way: it keys
     the once-a-day bucket and decides who a "last day only" member is, and
     re-timing every nudge is not what fixing a sentence should do. Before
     this, a deadline at 07:30 IST had the bell saying "Last day to answer"
     from half past seven the morning BEFORE, with the page one tap away
     saying "Answers close tomorrow" (audits C-141/C-031). */
  const message = ctx.bypassOff
    ? `${ctx.keeperName ?? "The Keeper"} is waiting on you for ${ctx.groupName}'s Catch-up.`
    : answerReminderMessage(ctx.groupName, ctx.closesAt, new Date());

  await createMany(db, recipients, "catchup_reminder", message, link);
};

/** Edition enters `published`: the reveal notification, the moment the ritual pays off. */
export const notifyPublished: NotifyPublishedFn = async (db, ctx) => {
  const members = (await groupMemberIds(db, ctx.groupId)).filter(
    (id) => id !== ctx.excludeUserId
  );
  await createMany(
    db,
    members,
    "catchup_published",
    `Your ${ctx.groupName} Catch-up is ready to read.`,
    `/catchups/edition/${ctx.editionId}`
  );
};

/**
 * Optional post-publish stickiness nudge: someone hearted your answer. Coalesced
 * to at most one unread `catchup_love` per author per Edition so it can never spam.
 */
export const notifyLove: NotifyLoveFn = async (db, ctx) => {
  if (ctx.authorId === ctx.likerId) return; // never notify yourself

  /* Only somebody the Edition is still open to (audit C-030).
   *
   * A published answer stays where it is when its author leaves -- that is
   * the owner's decision, and the Edition is a keepsake the whole group has
   * read. But the AUTHOR is gone, and the Edition page 404s for a non-member,
   * so hearting an ex-member's answer put a bell entry in their pocket
   * pointing at a door that no longer opens for them. Checked directly rather
   * than through `groupMemberIds` because this is one person, not an audience.
   *
   * A second count beside it excluded whoever had binned their own copy, and
   * went with the bin in build phase 5: leaving takes the membership row
   * itself, so the one count below is now the whole test. */
  const stillIn = await db.groupMember.count({
    where: { groupId: ctx.groupId, userId: ctx.authorId },
  });
  if (stillIn === 0) return;

  const link = `/catchups/edition/${ctx.editionId}`;
  const existing = await db.notification.findFirst({
    where: { userId: ctx.authorId, type: "catchup_love", link, read: false },
    select: { id: true },
  });
  if (existing) return; // coalesce
  await db.notification.create({
    data: {
      userId: ctx.authorId,
      type: "catchup_love",
      message: `${ctx.likerName} loved your answer in ${ctx.groupName}'s Catch-up.`,
      link,
    },
  });
};
