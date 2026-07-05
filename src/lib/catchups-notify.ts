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
 *   - questions-open / answers-open / published: all group members.
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

async function groupMemberIds(db: CatchupDb, groupId: string): Promise<string[]> {
  const rows = await db.groupMember.findMany({
    where: { groupId },
    select: { userId: true },
  });
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

/** Members who have not written any Entry in this Round. */
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

/** Round enters `collecting`: invite everyone to add a question. */
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

/** Round enters `answering`: answers are open. Re-fired to non-answerers on a too-few extension. */
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
 * A reminder to non-answerers. `modes` selects which reminderMode values qualify
 * (two-days = ["all"], last-day = ["all","last"]). `bypassOff` (manual Keeper
 * nudge) reaches everyone with no Entry regardless of their pref.
 */
export const notifyReminder: NotifyReminderFn = async (db, ctx) => {
  const nonAnswerers = await nonAnswererIds(db, ctx.groupId, ctx.editionId);
  if (nonAnswerers.length === 0) return;

  let recipients = nonAnswerers;
  if (!ctx.bypassOff) {
    const prefs = await db.catchupPref.findMany({
      where: { catchupId: ctx.catchupId, userId: { in: nonAnswerers } },
      select: { userId: true, reminderMode: true },
    });
    const prefByUser = new Map<string, ReminderMode>(
      prefs.map((p) => [p.userId, p.reminderMode as ReminderMode])
    );
    const allowed = new Set(ctx.modes);
    // Default to "all" when a member has never set a pref.
    recipients = nonAnswerers.filter((id) => allowed.has(prefByUser.get(id) ?? "all"));
  }

  const message = ctx.bypassOff
    ? `${ctx.keeperName ?? "The Keeper"} is waiting on you for ${ctx.groupName}'s Catch-up.`
    : ctx.modes.includes("last")
      ? `Last day to answer ${ctx.groupName}'s Catch-up.`
      : `Two days left to answer ${ctx.groupName}'s Catch-up.`;

  await createMany(
    db,
    recipients,
    "catchup_reminder",
    message,
    `/catchups/${ctx.catchupId}/answer`
  );
};

/** Round enters `published`: the reveal notification, the moment the ritual pays off. */
export const notifyPublished: NotifyPublishedFn = async (db, ctx) => {
  const members = (await groupMemberIds(db, ctx.groupId)).filter(
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
