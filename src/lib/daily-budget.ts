import { Ratelimit } from "@upstash/ratelimit";
import { prisma } from "@/lib/prisma";
import { upstashRedis, reportLimiterFailure } from "@/lib/rate-limit";
import { IS_DEMO } from "@/lib/demo";
import { reportSwallowed } from "@/lib/report-error";
import { createSpentMemo } from "@/lib/spent-memo";

/* ------------------------------------------------------------------ *
 *  What one account, or one address, may spend in a day (bug audit 3,
 *  O-09; the design is docs/audit-fix/2026-09-24-bug-audit-3/work/
 *  o09-budget-design.md).
 *
 *  `rate-limit.ts` bounds how FAST: so many a minute, an hour. The things
 *  it protects are spent by the day or the month and shared by everyone --
 *  the database's 500 MB, the 95 mails a day, every member's bell, the
 *  Upstash month itself -- and a rate held all day is still a flood. This
 *  is the second instrument: how MUCH, per subject, per rolling 24 hours,
 *  or a standing ceiling on what one account may keep at once.
 *
 *  TWO STORES, and why the second exists.
 *
 *  `rows` is the default. Where the action already writes a row that names
 *  its subject (a search, a draft), the budget is "count my rows since a
 *  day ago". It costs no Upstash command, it is exact across instances, and
 *  a script that empties Upstash first cannot switch it off. It is the shape
 *  `MAX_VISITS_PER_DAY` and the email queue's ENQUEUE_LIMIT already had.
 *  Every one names the index its count rides on, and budget-coverage.test
 *  checks that index is in the schema.
 *
 *  `redis` is for what writes no row of its own: a fetch, a read, a door
 *  keyed on an address. A 24-hour sliding window in Upstash under its own
 *  prefix (`bd:`), so it never shares a key with the `rl:` meters.
 *
 *  A `rows` budget may overshoot by whatever lands together: two saves in
 *  the same instant both count the same rows and both pass. That is the
 *  same honest slack `demo.ts`'s ceilings carry, and it is a handful of
 *  rows on a ceiling of hundreds, never a way past it.
 *
 *  WHEN A STORE FAILS. `outage` is argued per entry. `open` is the house
 *  posture, the same as `rate-limit.ts`'s: a ceiling must not stop members
 *  because Redis blinked. `closed` is for what is decoration or telemetry,
 *  where failing closed costs a missing thumbnail or one statistics row.
 *
 *  WHAT A REFUSED MEMBER SEES. A deliberate write is told in one plain
 *  sentence. Telemetry and fan-out beyond the budget are `silent`: the
 *  member's own action goes through, the extra row or fetch does not
 *  happen, and the owner hears about the account doing it, at most once a
 *  day per subject per instance.
 *
 *  Nothing here throws.
 * ------------------------------------------------------------------ */

const DAY_MS = 86_400_000;

type BudgetSpec = {
  /** What `subject` is. */
  per: "account" | "ip" | "recipient" | "catchup" | "actor";
  /** The ceiling: per rolling 24 hours, or at any one time. */
  limit: number;
  window: "24 h" | "standing";
  outage: "open" | "closed";
  /** The member is told this, or (null) the refusal is silent. */
  sentence: string | null;
} & (
  | {
      store: "rows";
      /** `Model(column, column)`: the index the count rides on. */
      index: string;
      /** This subject's rows since `since` (null for a standing ceiling). */
      count: (subject: string, since: Date | null) => Promise<number>;
    }
  | { store: "redis" }
);

/**
 * Every budget in the app, each with the argument for its number. Entries
 * land with the change that spends them; budget-coverage.test fails one that
 * nothing spends.
 */
const BUDGETS = {
  /** Searches written to the log per member per day (bug audit 3, C6-04).
   *  logSearch's dedupe folds one person typing into one row; it never
   *  bounded a caller alternating two words, which wrote a row a request,
   *  about 170,000 a day through the city picker's own meter, kept 90 days
   *  and drawn on the owner's analytics. 200 is fifteen times the most any
   *  member has searched in one day (13, every row kept, 2026-11-03), so it
   *  meets nobody; at the ceiling an account holds about 6 MB of rows.
   *  Silent: the search still answers, only the row is not written. Closed:
   *  if the count cannot be asked, the row is not worth writing either. */
  searchRows: {
    per: "account",
    limit: 200,
    window: "24 h",
    store: "rows",
    index: "SearchLog(userId, createdAt)",
    count: (subject, since) =>
      prisma.searchLog.count({ where: { userId: subject, ...(since ? { createdAt: { gte: since } } : {}) } }),
    outage: "closed",
    sentence: null,
  },
  /** Letters in progress one account keeps at once (bug audit 3, C6-03). A
   *  draft is the one thing an account that never confirmed its email may
   *  write (audit M32: writing privately harms nobody), and it is kept for
   *  ever, seen by nobody else, so the `posts` meter bounded how fast and
   *  nothing bounded how many: about 86 MB a day from one account. 20 is
   *  what the Letters page's drafts strip already shows, so a member at the
   *  ceiling can see every draft that holds them there; 0 drafts exist
   *  today. A standing count, not a day's. Open on an outage: if the count
   *  cannot be asked, the save that follows cannot be written either. */
  letterDrafts: {
    per: "account",
    limit: 20,
    window: "standing",
    store: "rows",
    index: "Post(authorId, createdAt)",
    count: (subject) => prisma.post.count({ where: { authorId: subject, kind: "letter", status: "draft" } }),
    outage: "open",
    sentence: "You have 20 letters in progress. Publish or delete one to start another.",
  },
  /** The same, for an account whose email is not confirmed: 3, so the
   *  never-confirmed account the finding describes keeps about 60 KB, not a
   *  share of the database. Confirming lifts it to 20, which is what the
   *  sentence offers; such an account cannot publish yet. */
  letterDraftsUnconfirmed: {
    per: "account",
    limit: 3,
    window: "standing",
    store: "rows",
    index: "Post(authorId, createdAt)",
    count: (subject) => prisma.post.count({ where: { authorId: subject, kind: "letter", status: "draft" } }),
    outage: "open",
    sentence: "You have 3 letters in progress. Confirm your email address to keep more, or delete one to start another.",
  },
  /** Links the server fetches on a member's behalf per day (bug audit 3,
   *  T2b-02): a page of up to 512 KB, an image of up to 5 MB, a decode and
   *  one permanent object each. Counted on NEW urls only, ones with no
   *  LinkPreview row yet, so re-saving a letter, or every reader of it,
   *  costs nothing; charged to whoever wrote the link, at every door that
   *  schedules one (link-preview.ts). 40 is four link-heavy letters a day:
   *  eight previews exist after two months, and the busiest body holds two.
   *  Silent: the link prints as an ordinary link until a later save or view
   *  finds room. Closed, because a preview is decoration: an Upstash outage
   *  costs a missing card, where open would hand a flood a free fetcher. */
  previewFetches: {
    per: "account",
    limit: 40,
    window: "24 h",
    store: "redis",
    outage: "closed",
    sentence: null,
  },
} as const satisfies Record<string, BudgetSpec>;

export type BudgetName = keyof typeof BUDGETS;

export type BudgetVerdict = { ok: true } | { ok: false; error: string; silent: boolean };

function spec(name: BudgetName): BudgetSpec {
  return BUDGETS[name];
}

/* ------------------------------------------------------------ plumbing */

const limiters = new Map<string, Ratelimit>();

/* A subject this instance has already seen with nothing left answers from
   memory until its window turns, at most fifteen minutes (spent-memo.ts, the
   sign-in door's memo): a link that cannot be fetched must not cost an
   Upstash command on every page view that shows it. */
const spent = createSpentMemo();
const memoKey = (name: BudgetName, subject: string) => `${name}\0${subject}`;

function windowFor(name: BudgetName, limit: number): Ratelimit | null {
  const r = upstashRedis();
  if (!r) return null;
  let limiter = limiters.get(name);
  if (!limiter) {
    limiter = new Ratelimit({
      redis: r,
      // Sliding, like every window in the app: nobody waits for midnight,
      // and nobody spends two days' budget across it.
      limiter: Ratelimit.slidingWindow(limit, "24 h"),
      prefix: `bd:${process.env.NODE_ENV === "production" ? "p" : "d"}:${name}`,
      timeout: 3000,
    });
    limiters.set(name, limiter);
  }
  return limiter;
}

/** The answer when a store cannot be asked, from the entry's own posture. */
function onOutage(name: BudgetName, s: BudgetSpec): BudgetVerdict {
  return s.outage === "open" ? { ok: true } : refusal(name, s);
}

function refusal(name: BudgetName, s: BudgetSpec): BudgetVerdict {
  return s.sentence
    ? { ok: false, error: s.sentence, silent: false }
    : { ok: false, error: `${name}: ${s.limit} a day`, silent: true };
}

/* A silent refusal is the one kind nobody would otherwise see, so the owner
   hears of it: once per budget and subject per day in this instance, which is
   enough to name the account doing it and not enough to spend Sentry's month. */
const reported = new Map<string, number>();

function reportSilent(name: BudgetName, s: BudgetSpec, subject: string): void {
  if (s.sentence) return;
  const key = `${name}\0${subject}`;
  const now = Date.now();
  if ((reported.get(key) ?? 0) + DAY_MS > now) return;
  if (reported.size > 5_000) reported.clear();
  reported.set(key, now);
  reportSwallowed("daily-budget", new Error(`daily budget spent: ${name}`), {
    budget: name,
    limit: s.limit,
    // An account id is a public cuid; an address is not written down.
    subject: s.per === "ip" ? "(an address)" : subject,
  });
}

const since = (s: BudgetSpec) => (s.window === "standing" ? null : new Date(Date.now() - DAY_MS));

/* ------------------------------------------------------------ the API */

/**
 * Spend `cost` of a budget for `subject` (an account id, an address, ...).
 * A `rows` budget spends nothing itself -- the caller's own write is the
 * spending -- so call it immediately before that write, and only once.
 * Never throws.
 */
export async function spendBudget(
  name: BudgetName,
  subject: string,
  cost = 1,
): Promise<BudgetVerdict> {
  const s = spec(name);
  if (s.store === "rows") {
    let used: number;
    try {
      used = await s.count(subject, since(s));
    } catch (err) {
      reportSwallowed("daily-budget", err, { budget: name, step: "count" });
      return onOutage(name, s);
    }
    if (used + cost <= s.limit) return { ok: true };
    reportSilent(name, s, subject);
    return refusal(name, s);
  }

  // The demo has no Upstash keys on purpose, and every meter passes there
  // (rate-limit.ts); its default-deny Prisma guard is its wall.
  if (IS_DEMO) return { ok: true };
  const limiter = windowFor(name, s.limit);
  if (!limiter) return onOutage(name, s);
  if (spent.known(memoKey(name, subject))) return refusal(name, s);
  try {
    const { success, remaining, reset } = await limiter.limit(subject, { rate: cost });
    if (!success || remaining <= 0) spent.remember(memoKey(name, subject), reset);
    if (success) return { ok: true };
  } catch (err) {
    reportLimiterFailure(name, "budget", err, s.outage === "open");
    return onOutage(name, s);
  }
  reportSilent(name, s, subject);
  return refusal(name, s);
}

/** What is left of a budget for `subject`, for a caller that spends part of
 *  what it wanted, or a surface that says so. Never throws. */
export async function budgetLeft(name: BudgetName, subject: string): Promise<number> {
  const s = spec(name);
  if (s.store === "rows") {
    try {
      return Math.max(0, s.limit - (await s.count(subject, since(s))));
    } catch (err) {
      reportSwallowed("daily-budget", err, { budget: name, step: "count" });
      return s.outage === "open" ? s.limit : 0;
    }
  }
  if (IS_DEMO) return s.limit;
  const limiter = windowFor(name, s.limit);
  if (!limiter) return s.outage === "open" ? s.limit : 0;
  if (spent.known(memoKey(name, subject))) return 0;
  try {
    const { remaining, reset } = await limiter.getRemaining(subject);
    if (remaining <= 0) spent.remember(memoKey(name, subject), reset);
    return Math.max(0, remaining);
  } catch (err) {
    reportLimiterFailure(name, "budget-read", err, s.outage === "open");
    return s.outage === "open" ? s.limit : 0;
  }
}
