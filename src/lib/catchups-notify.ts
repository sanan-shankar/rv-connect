/* ------------------------------------------------------------------ *
 *  Catch-ups: notification builders.
 *
 *  Writes rows into the existing `Notification` model for the Catch-up
 *  triggers in catchups.md section 11. `Notification.type` is a free string,
 *  so these new types need no migration.
 *
 *  Each builder accepts a `CatchupDb` (the shared client OR a transaction
 *  client) so it can run inside `advanceEdition`'s transaction and commit
 *  atomically with the status flip (exactly-once), or standalone from a
 *  server action.
 *
 *  Recipients follow section 11's rules, and since 2026-10-17 one budget sits
 *  over them. His answer to how many bells an Edition may ring for somebody
 *  who is not taking part: "Only 'a round started' and 'it's published'. No
 *  reminders unless you've turned them on yourself." So:
 *   - questions-open (somebody started one) and published: every member.
 *   - answers-open: only the people TAKING PART -- who asked a question in
 *     this Edition, or turned reminders on (`takingPartIds`).
 *   - the daily / last-day reminder: only members with no Entry yet who
 *     turned it on; no pref row means `DEFAULT_REMINDER_MODE`, which is off.
 *   - the questions extension: nobody (planNextAction, silent).
 *   - the manual nudge is deleted: it reached every non-answerer whatever
 *     they had chosen, and on a batch any of forty people could fire it.
 *   - love (optional): the answer's author, coalesced so it cannot spam.
 *   - added (bug fix, 2026-09-27): not audience math at all -- exactly the
 *     people `addCatchupMembers` just enrolled, never whoever added them.
 *
 *  All copy is placeholder. The owner rewrites it later (spec section 11).
 * ------------------------------------------------------------------ */

import { answerReminderMessage, DEFAULT_REMINDER_MODE } from "@/lib/catchups-core";
import { formatDisplayDateLong } from "@/lib/utils";
import type {
  CatchupDb,
  NotifyAddedFn,
  NotifyAnswersOpenFn,
  NotifyCommentFn,
  NotifyLoveFn,
  NotifyPublishedFn,
  NotifyQuestionsOpenFn,
  NotifyReminderFn,
  NotifySealedFn,
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

/**
 * The members TAKING PART in one Edition: whoever asked a question in it, and
 * whoever turned this Catch-up's reminders on. Everybody else gets two bells an
 * Edition and no more -- it started, it is out -- which is his answer of
 * 2026-10-17 ("Only 'a round started' and 'it's published'"). Asking counts
 * even when it was anonymous: the bell is the asker's own, and says nothing
 * to anyone else about who asked.
 */
async function takingPartIds(
  db: CatchupDb,
  ctx: { catchupId: string; groupId: string; editionId: string }
): Promise<string[]> {
  const [members, askers, optedIn] = await Promise.all([
    groupMemberIds(db, ctx.groupId),
    db.catchupPrompt.findMany({
      where: { editionId: ctx.editionId, authorId: { not: null } },
      select: { authorId: true },
      distinct: ["authorId"],
    }),
    db.catchupPref.findMany({
      where: { catchupId: ctx.catchupId, reminderMode: { in: ["all", "last"] } },
      select: { userId: true },
    }),
  ]);
  const taking = new Set<string>([
    ...askers.map((a) => a.authorId as string),
    ...optedIn.map((p) => p.userId),
  ]);
  return members.filter((id) => taking.has(id));
}

async function answeredUserIds(db: CatchupDb, editionId: string): Promise<Set<string>> {
  const rows = await db.catchupEntry.findMany({
    where: { editionId },
    select: { authorId: true },
    distinct: ["authorId"],
  });
  return new Set(rows.map((r) => r.authorId));
}

/**
 * Take a Catch-up's reminders out of the bell: everyone's, or one member's.
 *
 * A reminder names a deadline ("Answers close 7 am Sunday ..."), so it stops
 * being true the moment the deadline passes or moves, and for one member the
 * moment they answer. Nothing took them back: only the next day's reminder,
 * a Keeper's extension or leaving cleared one, so the last of a round sat
 * unread on the badge after the Edition had come out, until the thirty-day
 * sweep (bug audit 3, T7b-15; his Q9 asked for them cleared). Used by the
 * close (`notifyPublished`, `notifySealed`), both extensions, and an answer
 * being saved. Matched on type and the home's exact link, which is all
 * `notifyReminder` writes.
 */
export async function clearReminders(
  db: CatchupDb,
  catchupId: string,
  userId?: string
): Promise<void> {
  await db.notification.deleteMany({
    where: { type: "catchup_reminder", link: `/catchups/${catchupId}`, ...(userId ? { userId } : {}) },
  });
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

/**
 * Edition enters `collecting`: invite everyone to add a question.
 *
 * Named after whoever pressed Start when somebody did (2026-10-17). Nothing
 * starts on its own any more, so this bell is always one person in the group
 * asking the rest, and saying who is what makes it read that way rather than
 * as the app on a timer. Creation has no starter to name here: the Catch-up's
 * own name is the news.
 */
export const notifyQuestionsOpen: NotifyQuestionsOpenFn = async (db, ctx) => {
  const members = (await groupMemberIds(db, ctx.groupId)).filter(
    (id) => id !== ctx.excludeUserId
  );
  await createMany(
    db,
    members,
    "catchup_questions_open",
    ctx.starterName
      ? `${ctx.starterName} started a new Edition of ${ctx.catchupName}. Add a question you want everyone to answer.`
      : `${ctx.catchupName} is starting a Catch-up. Add a question you want everyone to answer.`,
    `/catchups/${ctx.catchupId}`
  );
};

/**
 * Edition enters `answering`: answers are open. Re-fired to non-answerers on a
 * too-few extension. Either way, only to the people taking part
 * (`takingPartIds`); everyone else hears about this Edition twice, when it
 * starts and when it is out.
 */
export const notifyAnswersOpen: NotifyAnswersOpenFn = async (db, ctx) => {
  const [taking, answered] = await Promise.all([
    takingPartIds(db, ctx),
    ctx.onlyNonAnswerers ? answeredUserIds(db, ctx.editionId) : Promise.resolve(new Set<string>()),
  ]);
  const members = taking.filter((id) => id !== ctx.excludeUserId && !answered.has(id));
  await createMany(
    db,
    members,
    "catchup_answers_open",
    `Answers are open for ${ctx.catchupName}'s Catch-up. Share yours.`,
    /* The HOME, not `/answer`. Answering moved onto the Catch-up's own home
       in build phase 7 and `/catchups/[id]/answer` is a 308 to it; a bell
       link that has to bounce through a redirect is one avoidable round trip
       on the tap this notification exists to invite. The rows written before
       that were for
       `prisma/migrations-manual/2026-09-09-answering-moves-to-the-home.sql`
       to move, and it was not run until 2026-10-30, by which time the 30-day
       sweep had taken all 22: they aged out still pointing at `/answer`,
       through the redirect (bug audit 3, T7b-03). */
    `/catchups/${ctx.catchupId}`
  );
};

/**
 * A reminder to non-answerers who asked for one. Fires once a DAY while the
 * answer window is open (owner, 2026-08-05), with `daysLeft` counting down.
 *
 * Who gets one:
 *   - "all" (shown as Daily): every day.
 *   - "last": only on the last day.
 *   - "off": never. And a member who never chose is `DEFAULT_REMINDER_MODE`,
 *     which is off since 2026-10-17 ("No reminders unless you've turned them
 *     on yourself"); it used to be daily.
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
  // The home, not `/answer` -- see notifyAnswersOpen above.
  const link = `/catchups/${ctx.catchupId}`;
  const days = ctx.daysLeft ?? 0;
  const [members, answered] = await Promise.all([
    groupMemberIds(db, ctx.groupId),
    answeredUserIds(db, ctx.editionId),
  ]);
  const nonAnswerers = members.filter((id) => !answered.has(id));

  const prefs = await db.catchupPref.findMany({
    where: { catchupId: ctx.catchupId, userId: { in: nonAnswerers } },
    select: { userId: true, reminderMode: true },
  });
  const prefByUser = new Map<string, ReminderMode>(
    prefs.map((p) => [p.userId, p.reminderMode as ReminderMode])
  );
  const isLastDay = days <= 1;
  const recipients = nonAnswerers.filter((id) => {
    const mode = prefByUser.get(id) ?? DEFAULT_REMINDER_MODE;
    if (mode === "all") return true;
    if (mode === "last") return isLastDay;
    return false;
  });

  if (members.length > 0) {
    await db.notification.deleteMany({
      where: { userId: { in: members }, type: "catchup_reminder", link },
    });
  }
  if (recipients.length === 0) return;

  /* The sentence names the hour, India time, in the page's own words, and
     counts valley calendar days before that (audits C-141/C-031); the last
     one is the hour alone (bug audit 3, T7b-15). `days` above is a 24-hour
     count and stays that way: it keys the once-a-day bucket and decides who a
     "last day only" member is, and re-timing every nudge is not what fixing a
     sentence should do. */
  await createMany(
    db,
    recipients,
    "catchup_reminder",
    answerReminderMessage(ctx.catchupName, ctx.closesAt, new Date()),
    link
  );
};

/**
 * Edition enters `published`: the reveal notification, the moment the ritual
 * pays off. The round's reminders leave the bell in the same transaction:
 * they name a deadline that has just passed (`clearReminders`).
 */
export const notifyPublished: NotifyPublishedFn = async (db, ctx) => {
  await clearReminders(db, ctx.catchupId);
  const members = (await groupMemberIds(db, ctx.groupId)).filter(
    (id) => id !== ctx.excludeUserId
  );
  await createMany(
    db,
    members,
    "catchup_published",
    ctx.capsule
      ? `The ${ctx.catchupName} time capsule is open.`
      : `Your ${ctx.catchupName} Catch-up is ready to read.`,
    `/catchups/edition/${ctx.editionId}`
  );
};

/**
 * A time capsule closed (build phase 14): everyone is told the day it opens.
 *
 * To the HOME, not the Edition. There is nothing at the Edition's own address
 * to read for a year (his 34b), and a bell whose only destination is a page
 * saying so is a dead end. Everyone in the group, writers or not, because the
 * rhythm moves on without them either way.
 *
 * Copy is a stand-in until the owner picks the sealed Edition's look. The
 * round's reminders go, as they do when an Edition publishes.
 */
export const notifySealed: NotifySealedFn = async (db, ctx) => {
  await clearReminders(db, ctx.catchupId);
  const members = (await groupMemberIds(db, ctx.groupId)).filter(
    (id) => id !== ctx.excludeUserId
  );
  await createMany(
    db,
    members,
    "catchup_sealed",
    `${ctx.catchupName}'s Catch-up is sealed until ${formatDisplayDateLong(ctx.opensAt)}.`,
    `/catchups/${ctx.catchupId}`
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
      message: `${ctx.likerName} loved your answer in ${ctx.catchupName}'s Catch-up.`,
      link,
    },
  });
};

/**
 * Somebody wrote under your answer, or answered your comment (build phase 9,
 * spec 3.7).
 *
 * COALESCED PER PERSON PER ANSWER, and that is the one place this
 * deliberately parts company with `notifyLove` above, whose bucket is the
 * whole Edition. A heart is a gesture nobody is waiting on, so one unread for
 * an Edition is generous. A comment is somebody talking to you: under the
 * Edition-wide rule the second and third person to write would never be
 * announced at all, and you would only find them by going back and looking.
 * So the bucket is (recipient, writer, answer) -- Alice writing five times
 * under one answer is one bell, Alice and then Ravi is two, and Alice under
 * two different answers of yours is two, because those are two conversations.
 * The ceiling is real people who addressed you, which is not what "spam"
 * means.
 *
 * Owner question 27 records the choice with its alternative, and `spec.md`
 * 3.7 (which had written down the Edition-wide rule by analogy with the
 * heart) is corrected to match.
 *
 * The writer's own name is in the message rather than the type, so the bell's
 * existing icon map needs one row and nothing else.
 */
export const notifyComment: NotifyCommentFn = async (db, ctx) => {
  if (ctx.recipientId === ctx.writerId) return; // never notify yourself

  /* Only somebody the Edition is still open to (audit C-030). A published
     answer stays where it is when its author leaves -- his decision, and the
     Edition is a keepsake the whole group has read -- but the Edition page
     404s for a non-member, so writing to an ex-member puts a bell in their
     pocket aimed at a door that no longer opens for them. */
  const stillIn = await db.groupMember.count({
    where: { groupId: ctx.groupId, userId: ctx.recipientId },
  });
  if (stillIn === 0) return;

  /* The link lands on the ANSWER, not just the Edition: the reader gives
     every tile `id="entry-<id>"` for exactly this. */
  const link = `/catchups/edition/${ctx.editionId}#entry-${ctx.entryId}`;

  const message =
    ctx.kind === "reply"
      ? `${ctx.writerName} replied to you in ${ctx.catchupName}'s Catch-up.`
      : `${ctx.writerName} commented on your answer in ${ctx.catchupName}'s Catch-up.`;

  /* The per-writer bucket, keyed on the WHOLE sentence. `Notification` has no
     column for who sent it, and the sentence is the only place the writer is
     recorded, so it is the key. It is matched EXACTLY, not by prefix: a
     prefix of "Ravi " also matches an unread "Ravi Kumar commented ...", and
     Ravi's bell would be swallowed by somebody else's. Equality can only merge
     two bells that would read identically in the list, which is the thing
     coalescing is for. Built by the same template on both sides, so a change
     to the wording moves both together; the cost is one extra bell for a row
     an older build wrote, once. `comment-target-rule.test.mjs` pins it. */
  const existing = await db.notification.findFirst({
    where: { userId: ctx.recipientId, type: "catchup_comment", link, message, read: false },
    select: { id: true },
  });
  if (existing) return; // coalesce

  await db.notification.create({
    data: { userId: ctx.recipientId, type: "catchup_comment", message, link },
  });
};

/**
 * A Keeper adds someone to a Catch-up that already has a live Edition (bug
 * fix, 2026-09-27): `addCatchupMembers` enrolled people and told none of
 * them. `createCatchupWithPeople` has always covered the FIRST enrollment,
 * with `notifyQuestionsOpen`; this is the second one, for everyone added
 * afterward.
 *
 * `ctx.userIds` is not queried here, unlike every builder above -- the
 * caller already knows exactly who is newly in (`newlyAdded`), and asking
 * `groupMemberIds` again would just notify the whole group a second time.
 */
export const notifyAdded: NotifyAddedFn = async (db, ctx) => {
  await createMany(
    db,
    ctx.userIds,
    "catchup_added",
    `${ctx.addedByName} added you to ${ctx.catchupName}'s Catch-up.`,
    `/catchups/${ctx.catchupId}`
  );
};
