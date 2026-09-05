import { prisma } from "./prisma";
import { writeAudit } from "./audit";
import { purgeUserAccount, drainPendingImagePurges, DELETION_GRACE_DAYS } from "./account-purge";
import { RECENTLY_DELETED_DAYS } from "./catchup-shelf";
import { promoteGroupSuccessor } from "./group-succession";
import { reportSwallowed } from "./report-error";
import { valleyDayKey } from "./utils";

/**
 * The retention sweep (audit M34, GDPR Art. 5(1)(e)): personal data stops
 * accumulating forever. Every window below is the owner's decision, recorded
 * 2026-08-19 in docs/SECURITY.md (retention table), not a default anyone reached
 * for — change them there first, here second.
 *
 * Run nightly by .github/workflows/retention.yml calling
 * /api/retention/sweep with CRON_SECRET (GitHub Actions rather than a Vercel
 * cron, because the Hobby plan's two cron slots are already spent on the
 * Catch-up tick and the demo reset). Every step is a hard-cutoff deleteMany,
 * so a missed night simply means tomorrow's sweep deletes two days' worth:
 * idempotent, and safe to run twice.
 */

const DAY_MS = 86_400_000;

/** Accounts purged per nightly pass. See the comment at its use site. */
const PURGE_BATCH = 10;
/** Binned Catch-up copies emptied per nightly pass. See the comment at its use site. */
const CATCHUP_BIN_BATCH = 200;
const cutoff = (days: number) => new Date(Date.now() - days * DAY_MS);

/** Owner's schedule. Days, not "2y", so the cutoff arithmetic stays exact. */
const KEEP_DAYS = {
  /** Conversations with the admin: 2 years. Long enough that "as we discussed
   *  last year" still has its receipts; not a permanent transcript. */
  adminMessages: 730,
  /** Reports: 3 years. Moderation history outlives the messages because a
   *  pattern of being reported is the thing it exists to show. */
  reports: 1095,
  /** Payment records: 10 years, the outer bound of tax-record obligations. */
  contributions: 3650,
  /** Notifications: 30 days. Purely transient by design, and the shortest
   *  window here because the bell answers "what happened while I was away",
   *  not "what has ever happened" -- and the per-user cap of 100 already
   *  means an active member never scrolls back a month anyway.
   *
   *  It said 365 until 2026-09-04. snapshot.yml had been calling prune.mjs
   *  with --days 30 the whole time, so the table was really emptied at 30
   *  while this file, docs/SECURITY.md and the privacy policy all promised a
   *  year (refactor audit 2, ORCH-04). M55 had fixed that split by moving
   *  this number UP to match the promise; it missed the flag in the workflow,
   *  so the split survived the fix. The owner chose the behaviour over the
   *  promise: 30 days everywhere, and the flag is gone so there is one number
   *  in one place again. */
  notifications: 30,
  /** LoginAttempt and AuditLog: 1 year. Enough to investigate any incident
   *  someone actually notices; not a permanent behavioural record. */
  securityLogs: 365,
  /** OutboundEmail: 180 days. The rows hold recipient addresses, and a
   *  delivery question older than six months has never once come up. */
  sentEmailLog: 180,
  /** Visit and SearchLog: 90 days, which is exactly what the deepest surface
   *  reads.
   *
   *  Both are identifiable presence telemetry (each row carries a userId) and
   *  until 2026-08-21 nothing anywhere deleted either -- they were added after
   *  prune.mjs was written and never reached the sweep, so the two fastest
   *  growing tables in the schema had no expiry at all (bug audit B-093).
   *
   *  It was 180, double the deepest lookback, as margin. The margin was the
   *  problem: Visit is one ~750-byte row per session, and this project's own
   *  stated scale -- 2,000 members at 30 views a day, ~8 views a session -- is
   *  about 7,500 rows a day. At 180 days that is 1.35M rows and well over half
   *  a gigabyte, against a 500MB plan that Place already spends 97MB of
   *  (bug-report-2 C-164). ContentView was deliberately built as a bounded
   *  counter for exactly this arithmetic; Visit was never run through it.
   *
   *  90 costs no answer. The deepest lookback in the whole analytics room is
   *  loadRhythm's heatmap and loadSearches at 90 days, and everything else is
   *  30 -- so the rows this now removes are precisely the ones no query can
   *  reach. Keep this number and that lookback equal; the test says so too. */
  presence: 90,
  /** A binned Catch-up copy: 30 days in "Recently deleted", then the
   *  membership row goes for real. Imported rather than written out, because
   *  the countdown a member reads on the row ("4 days left") and the cutoff
   *  this sweep deletes by have to be the same number or the row lies. */
  catchupBin: RECENTLY_DELETED_DAYS,
} as const;

/**
 * How many notifications one member keeps, regardless of age.
 *
 * The age cutoff above is the real bound on this table; this is the second
 * belt, for the member who is mentioned two hundred times in a month.
 *
 * It used to live in `getNotifications`, which ran two queries to enforce it on
 * every first-page open of the bell -- and enforced it only for members who
 * opened the bell, which is not a bound at all. It is one nightly statement
 * here instead, in the same file as every other number that says how long this
 * app keeps things.
 */
const KEEP_NOTIFICATIONS = 100;

/**
 * The steps that are nothing but a hard cutoff: one `deleteMany` against one
 * date column, and a count back.
 *
 * Eight of them were written out longhand, five lines each, differing only in
 * the model, the column and the number of days. Anything needing a
 * transaction, a batch, a window function or a successor hand-off is NOT
 * here: `adminMessages`, the notification cap, `catchupCopies` and the
 * account purge are each written out below because each is genuinely its own
 * thing.
 *
 * `run` is a closure rather than a model NAME and a column name, which is the
 * obvious way to write this and the wrong one. Strings would need a cast past
 * Prisma's types, and then a typo in either would compile, fail once a night
 * against a table that does not exist, and be swallowed into
 * `reportSwallowed` -- a silent leak of the exact kind this sweep exists to
 * prevent. Written this way, `tsc` checks every model and every column.
 *
 * The order matters in exactly one place and it is kept: `notifications` runs
 * in this list, and the per-member cap runs after it, so the cap still ranks
 * what the age cutoff left behind.
 */
const CUTOFF_STEPS = [
  { key: "reports", days: KEEP_DAYS.reports,
    run: (lt: Date) => prisma.report.deleteMany({ where: { createdAt: { lt } } }) },
  { key: "contributions", days: KEEP_DAYS.contributions,
    run: (lt: Date) => prisma.contribution.deleteMany({ where: { createdAt: { lt } } }) },
  { key: "notifications", days: KEEP_DAYS.notifications,
    run: (lt: Date) => prisma.notification.deleteMany({ where: { createdAt: { lt } } }) },
  { key: "loginAttempts", days: KEEP_DAYS.securityLogs,
    run: (lt: Date) => prisma.loginAttempt.deleteMany({ where: { createdAt: { lt } } }) },
  { key: "auditLogs", days: KEEP_DAYS.securityLogs,
    run: (lt: Date) => prisma.auditLog.deleteMany({ where: { createdAt: { lt } } }) },
  { key: "outboundEmails", days: KEEP_DAYS.sentEmailLog,
    run: (lt: Date) => prisma.outboundEmail.deleteMany({ where: { createdAt: { lt } } }) },
  /* The only one not on `createdAt`: a visit is spent when it ENDS, and a
     session still open across the cutoff is a live session. */
  { key: "visits", days: KEEP_DAYS.presence,
    run: (lt: Date) => prisma.visit.deleteMany({ where: { endedAt: { lt } } }) },
  { key: "searches", days: KEEP_DAYS.presence,
    run: (lt: Date) => prisma.searchLog.deleteMany({ where: { createdAt: { lt } } }) },
] as const;

export type SweepResult = {
  adminMessages: number;
  reports: number;
  contributions: number;
  notifications: number;
  /** Read notifications past a member's hundredth, regardless of age. */
  notificationsCapped: number;
  loginAttempts: number;
  auditLogs: number;
  outboundEmails: number;
  visits: number;
  searches: number;
  /** Catch-up copies whose 30 days in "Recently deleted" ran out tonight. */
  catchupCopiesEmptied: number;
  accountsPurged: number;
  /** Accounts that were due tonight and are still here, because the member
   *  signed in (which cancels the request) before their turn came round. */
  accountsSpared: number;
  /** Stored images an earlier purge could not remove, cleared on this pass. */
  imagesRetried: number;
  /** ...and how many R2 still refuses. A number that only ever grows is the
   *  signal that credentials or the bucket name have drifted. */
  imagesStillPending: number;
  errors: string[];
};

/**
 * One pass over everything with an expiry. Each step survives the others
 * failing — a bad night for one table must not leave every other table
 * growing — and the pass ends with its own audit entry, so "is retention
 * actually running" is answerable from /admin/audit rather than by asking
 * GitHub.
 */
export async function runRetentionSweep(): Promise<SweepResult> {
  const errors: string[] = [];
  const step = async (name: string, fn: () => Promise<number>): Promise<number> => {
    try {
      return await fn();
    } catch (err) {
      // Reported, not just logged. This runs once a night with nobody
      // watching, and a step that has been failing for a month leaves no
      // symptom until a table is large enough to notice (audit M09's sibling,
      // M54). The pass still continues: one bad table must not leave the other
      // nine growing.
      reportSwallowed("retention", err, { step: name });
      errors.push(name);
      return 0;
    }
  };

  /* Collect the bytes, THEN delete the rows -- the shape declinePhoto,
     deletePost and purgeUserAccount all use.
     
     An AdminMessage may carry one screenshot in R2 (`imageUrl`), and this step
     was a bare deleteMany: the row went and the object stayed, unreferenced
     and now unfindable, because the only thing that could ever have named it
     was the row (audit C-065). The account purge already treats these exact
     bytes as purge-worthy -- collectImageUrls reads the imageUrl of every
     message in a member's threads -- so the sweep was the one path that
     leaked them.

     One transaction, so a failure between the two halves cannot leave the
     queue holding a purge for a message that still exists. */
  const adminMessages = await step("adminMessages", async () =>
    prisma.$transaction(async (tx) => {
      const due = { createdAt: { lt: cutoff(KEEP_DAYS.adminMessages) } };
      const withImages = await tx.adminMessage.findMany({
        where: { ...due, imageUrl: { not: null } },
        select: { imageUrl: true },
      });
      if (withImages.length > 0) {
        await tx.pendingImagePurge.createMany({
          data: withImages.map((m) => ({ url: m.imageUrl as string, reason: "retention" })),
        });
      }
      const removed = (await tx.adminMessage.deleteMany({ where: due })).count;

      /* And the SHELL the transcript hung on (audit C-062).
         AdminMessage cascades from AdminThread, not the other way round, so
         purging every message of an old conversation left the thread itself
         behind for ever -- carrying `subject`, which is DERIVED FROM THE
         MEMBER'S OWN FIRST MESSAGE. So the one line of what they wrote that
         retention was meant to remove is the line that outlived it, and the
         member's list showed a conversation that opens onto nothing. Deleted
         in the same transaction, and only when the thread has no messages left
         at all: a thread with one recent reply is a live conversation whose
         older lines have simply aged out. */
      const emptied = await tx.adminThread.deleteMany({ where: { messages: { none: {} } } });
      return removed + emptied.count;
    }),
  );
  // The eight plain cutoffs, from CUTOFF_STEPS above. Sequential like every
  // other step: they share one serverless invocation's duration budget.
  const cut = {} as Record<(typeof CUTOFF_STEPS)[number]["key"], number>;
  for (const s of CUTOFF_STEPS) {
    cut[s.key] = await step(s.key, async () => (await s.run(cutoff(s.days))).count);
  }
  /* The per-member cap, in the shape the bell used to enforce on every open:
     rank each member's notifications newest-first, and delete the READ ones
     past the hundredth. Read-only (bug audit Low 85) -- an unread notification
     is something nobody has seen yet, and a cap must never be the reason.
     Unread rows still count toward the rank, exactly as they did before, so a
     member sitting on ninety unread keeps ten read ones and not a hundred.

     Raw because Prisma has no window function. The one difference from the
     query it replaces: that one took the hundredth row's timestamp and deleted
     `createdAt <` it, so rows sharing that exact millisecond survived; the
     rank breaks that tie on id. Strictly more exact, and a millisecond apart. */
  const notificationsCapped = await step("notificationCap", async () =>
    prisma.$executeRaw`
      DELETE FROM "Notification"
      WHERE read AND id IN (
        SELECT id FROM (
          SELECT id, row_number() OVER (
            PARTITION BY "userId" ORDER BY "createdAt" DESC, id DESC
          ) AS rn
          FROM "Notification"
        ) t WHERE t.rn > ${KEEP_NOTIFICATIONS}
      )
    `,
  );

  /* "Recently deleted" Catch-ups, emptied (bug audit B-063). A member who
     bins their own copy stops hearing from it at once and keeps a month to
     change their mind; tonight is when the month runs out for the rows below,
     and the membership row goes with the stamp. Only the acting member's own
     row: this is a personal delete by the owner's decision, so nothing here
     touches another member's copy or the Catch-up itself, and their published
     answers stay in the Rounds they were published in.

     Batched like the account purge above, for the same reason -- everything in
     this sweep shares one serverless invocation's duration budget. 200 rather
     than 10, because each of these is two small deletes rather than a whole
     account's transaction plus its R2 objects, and a night that binned more
     than 200 copies across the whole community is not a night this should be
     the slow step of. The remainder rolls to tomorrow by design. */
  let catchupCopiesEmptied = 0;
  await step("catchupCopies", async () => {
    /* Serializable, and the read is INSIDE it.
     *
     * "Restorable for 30 days" is a promise printed on the row, and the naive
     * shape breaks it: read the due list, then delete, and a member pressing
     * "Put back" in the gap has their restore silently undone -- membership
     * gone, no error anywhere, the row that said 4 days left simply not there
     * in the morning (write-path review, 2026-08-21). Under Serializable that
     * restore and this read conflict, so one of them aborts. If it is this
     * one, `step` records the error and tomorrow's pass does the work: the
     * sweep is idempotent by design, so losing a night costs nothing, and a
     * member's undo is the thing worth protecting. Same instrument the
     * last-admin guard uses (audit M26).
     */
    const emptied = await prisma.$transaction(
      async (tx) => {
        const due = await tx.catchupPref.findMany({
          where: { deletedAt: { lt: cutoff(KEEP_DAYS.catchupBin) } },
          select: { id: true, userId: true, catchup: { select: { groupId: true } } },
          orderBy: { deletedAt: "asc" },
          take: CATCHUP_BIN_BATCH,
        });
        if (due.length === 0) return 0;
        // The membership first, then the stamp. In that order a crash in
        // between leaves a member out of the Catch-up with the bin row still
        // showing -- which the next sweep tidies, and which reads as what they
        // asked for. The other order would leave them back on the list with no
        // way to tell.
        /* Hand the hat on before taking the head out of the group (audit
           C-023). A bin emptied tonight can be the last member holding
           "keeper" on a Catch-up whose creator's account is already gone,
           which would leave it running on its clock with nobody able to
           curate, publish or end it. A no-op in every ordinary case. */
        for (const row of due) {
          await promoteGroupSuccessor(tx, row.catchup.groupId, row.userId);
        }
        await tx.groupMember.deleteMany({
          where: { OR: due.map((r) => ({ groupId: r.catchup.groupId, userId: r.userId })) },
        });
        await tx.catchupPref.deleteMany({ where: { id: { in: due.map((r) => r.id) } } });
        return due.length;
      },
      { isolationLevel: "Serializable" }
    );
    catchupCopiesEmptied = emptied;
    if (emptied >= CATCHUP_BIN_BATCH) {
      console.info(
        `[retention] catch-up bin batch full (${emptied}); more copies are due tomorrow`
      );
    }
    return emptied;
  });

  /* The deletion-request purge (audits H9 + M35): accounts whose 60-day
     grace window has closed are erased for real — rows and R2 bytes both,
     via the same purgeUserAccount an admin delete uses. Context for the
     audit entry is captured first, because afterwards nothing remembers who
     the id belonged to. */
  let accountsPurged = 0;
  let accountsSpared = 0;
  const due = await step("accountsPurged:list", async () => {
    const rows = await prisma.user.findMany({
      where: { deletionRequestedAt: { lt: cutoff(DELETION_GRACE_DAYS) } },
      select: { id: true, name: true, email: true, deletionRequestedAt: true },
      orderBy: { deletionRequestedAt: "asc" },
      // Capped, because this is the one step whose cost is unbounded: each
      // purge is its own transaction with a 30s ceiling, run one at a time, all
      // inside a single serverless invocation that has a platform duration
      // limit. Uncapped, a night with a dozen due accounts gets killed
      // mid-loop and the GitHub Actions job fails loudly for something that is
      // working. Oldest first, and the remainder rolls to tomorrow BY DESIGN --
      // the sweep is idempotent, so a backlog drains a batch a night rather
      // than taking the whole run down with it (bug audit, Low 64).
      take: PURGE_BATCH,
    });
    for (const row of rows) {
      /* The cutoff goes WITH the purge, not just into the list above. Between
         that read and this call the member may have signed in, which is how
         the app lets somebody call a deletion off -- and the purge used to
         erase them anyway, minutes after telling them it was cancelled
         (bug-report-2 C-075). Passing the same cutoff makes the delete itself
         conditional; a cancellation is a skip, not a failure. */
      const purged = await purgeUserAccount(row.id, {
        onlyIfRequestedBefore: cutoff(DELETION_GRACE_DAYS),
      });
      if (!purged.ok) {
        if (purged.cancelled) {
          accountsSpared += 1;
          continue;
        }
        errors.push(`purge:${row.id}`);
        continue;
      }
      accountsPurged += 1;
      await writeAudit({
        actorId: null,
        action: "account.purge",
        targetType: "user",
        targetId: row.id,
        detail:
          // The valley's day, matching what the member was emailed when they
          // asked (audit C-146). In UTC the two named different days for any
          // request made between midnight and 05:30 IST.
          `${row.name} <${row.email}> — requested ${row.deletionRequestedAt ? valleyDayKey(row.deletionRequestedAt) : "unknown"}, ` +
          `${purged.imagesDeleted} stored image(s) removed` +
          (purged.imagesFailed > 0 ? `, ${purged.imagesFailed} still queued` : "") +
          (purged.groupsRehomed > 0 ? `, ${purged.groupsRehomed} group(s) handed on` : ""),
      });
    }
    return rows.length;
  });
  if (accountsSpared > 0) {
    console.info(
      `[retention] ${accountsSpared} account(s) were due but had been cancelled; left alone`
    );
  }
  // A full batch means there is more waiting; the next sweep takes the rest.
  if (due >= PURGE_BATCH) {
    console.info(`[retention] purge batch full (${due}); more accounts are due tomorrow`);
  }

  /* Anything an earlier purge could not remove from R2 (a bad minute, a
     timeout, a crash between the row delete and the object delete) waits in
     PendingImagePurge. This is the retry: the one path that can still find
     those bytes, because the rows that named them are long gone (B-011). */
  let imagesRetried = 0;
  let imagesStillPending = 0;
  await step("pendingImages", async () => {
    const drained = await drainPendingImagePurges();
    imagesRetried = drained.deleted;
    imagesStillPending = await prisma.pendingImagePurge.count();
    return drained.deleted;
  });

  const result: SweepResult = {
    adminMessages,
    ...cut,
    notificationsCapped,
    catchupCopiesEmptied,
    accountsPurged,
    accountsSpared,
    imagesRetried,
    imagesStillPending,
    errors,
  };

  await writeAudit({
    actorId: null,
    action: "retention.sweep",
    detail: JSON.stringify(result),
  });

  return result;
}
