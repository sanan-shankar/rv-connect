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
 * Group membership minus anyone who has thrown their own copy away (bug audit
 * B-063). A deleted copy sits in "Recently deleted" for 30 days before the
 * nightly sweep takes the membership row for real, and those 30 days are an
 * undo window, not a notice period: a member who binned a Catch-up must stop
 * hearing from it the moment they do, or the bin is only a filing cabinet with
 * a countdown.
 *
 * An ARCHIVED copy is not excluded, and that is deliberate. Archiving is
 * filing; muting has its own control (`CatchupPref.reminderMode`), and quietly
 * making one mean the other would leave a member who filed a Catch-up away
 * missing the Round they were still expecting.
 */
async function groupMemberIds(
  db: CatchupDb,
  groupId: string,
  catchupId: string
): Promise<string[]> {
  const [rows, binned] = await Promise.all([
    db.groupMember.findMany({ where: { groupId }, select: { userId: true } }),
    db.catchupPref.findMany({
      where: { catchupId, deletedAt: { not: null } },
      select: { userId: true },
    }),
  ]);
  const out = new Set(binned.map((r) => r.userId));
  return rows.map((r) => r.userId).filter((id) => !out.has(id));
}

async function answeredUserIds(db: CatchupDb, editionId: string): Promise<Set<string>> {
  const rows = await db.catchupEntry.findMany({
    where: { editionId },
    select: { authorId: true },
    distinct: ["authorId"],
  });
  return new Set(rows.map((r) => r.authorId));
}

/** Members who have not written any Entry in this Round. */
async function nonAnswererIds(
  db: CatchupDb,
  groupId: string,
  catchupId: string,
  editionId: string
): Promise<string[]> {
  const [members, answered] = await Promise.all([
    groupMemberIds(db, groupId, catchupId),
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

/** Round enters `collecting`: invite everyone to add a question. */
export const notifyQuestionsOpen: NotifyQuestionsOpenFn = async (db, ctx) => {
  const members = (await groupMemberIds(db, ctx.groupId, ctx.catchupId)).filter(
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

/** Round enters `answering`: answers are open. Re-fired to non-answerers on a too-few extension. */
export const notifyAnswersOpen: NotifyAnswersOpenFn = async (db, ctx) => {
  const audience = ctx.onlyNonAnswerers
    ? await nonAnswererIds(db, ctx.groupId, ctx.catchupId, ctx.editionId)
    : await groupMemberIds(db, ctx.groupId, ctx.catchupId);
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
    groupMemberIds(db, ctx.groupId, ctx.catchupId),
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

  const message = ctx.bypassOff
    ? `${ctx.keeperName ?? "The Keeper"} is waiting on you for ${ctx.groupName}'s Catch-up.`
    : days <= 1
      ? `Last day to answer ${ctx.groupName}'s Catch-up.`
      : `${days} days left to answer ${ctx.groupName}'s Catch-up.`;

  await createMany(db, recipients, "catchup_reminder", message, link);
};

/** Round enters `published`: the reveal notification, the moment the ritual pays off. */
export const notifyPublished: NotifyPublishedFn = async (db, ctx) => {
  const members = (await groupMemberIds(db, ctx.groupId, ctx.catchupId)).filter(
    (id) => id !== ctx.excludeUserId
  );
  await createMany(
    db,
    members,
    "catchup_published",
    `Your ${ctx.groupName} Catch-up is ready to read.`,
    `/catchups/round/${ctx.editionId}`
  );
};

/**
 * Optional post-publish stickiness nudge: someone hearted your answer. Coalesced
 * to at most one unread `catchup_love` per author per Round so it can never spam.
 */
export const notifyLove: NotifyLoveFn = async (db, ctx) => {
  if (ctx.authorId === ctx.likerId) return; // never notify yourself
  const link = `/catchups/round/${ctx.editionId}`;
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
