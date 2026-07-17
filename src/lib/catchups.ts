/* ------------------------------------------------------------------ *
 *  Catch-ups: the shared engine.
 *
 *  Everything the recurring group newsletter needs that is not a screen or
 *  a server action lives here:
 *   - CATCHUP_PROMPT_SETS: the 30-question library (spec section 4).
 *   - timing + cadence constants and the calendar math.
 *   - the PURE state machine: computeStatus + planNextAction (no DB, no clock
 *     of their own), so every boundary is unit-testable with fake timestamps.
 *   - the IMPURE drivers: advanceEdition (one Prisma transaction per step,
 *     idempotent side effects guarded by the status column + remindersSent
 *     bitmask) and advanceDueCatchups (the lazy, read-time, no-cron advance).
 *   - resolveSpotify: the keyless oembed resolver (the SSRF boundary).
 *   - isMissingCatchupTable: the P2021 guard shared surfaces wrap with, so a
 *     table that does not exist yet can never break an existing page.
 *
 *  No em dashes. User-facing copy says "Rishi Valley", never "Alumni".
 * ------------------------------------------------------------------ */

import type {
  Cadence,
  CatchupNotifyKind,
  CatchupStatus,
  EditionStatus,
  EditionTiming,
  PromptCategory,
  ReminderMode,
} from "@/lib/catchups-types";

/* ------------------------------------------------------------------ *
 *  Why the runtime deps (prisma, the notify builders) load via dynamic
 *  import instead of a static `import`:
 *
 *  The pure state machine below (computeStatus, planNextAction, the
 *  patch helpers, cadence math, resolveSpotify) is unit-tested with
 *  `node --test src/lib/catchups.test.mjs` and MUST run with no database.
 *  Node strips `import type` entirely, so the only remaining static import
 *  here is erased at load; a static `import { prisma }` would instead pull
 *  the generated Prisma client (and a live client instantiation) into the
 *  test's module graph and break it. Loading prisma / the notify module
 *  lazily inside the impure drivers keeps the pure top level dependency
 *  free while the real app (Next resolves the `@/` alias for dynamic
 *  imports too) is unaffected. Do NOT convert these back to static imports.
 * ------------------------------------------------------------------ */

type PrismaLike = (typeof import("@/lib/prisma"))["prisma"];
type NotifyModule = typeof import("@/lib/catchups-notify");

let prismaSingleton: PrismaLike | null = null;
let notifySingleton: NotifyModule | null = null;

async function getPrisma(): Promise<PrismaLike> {
  if (!prismaSingleton) prismaSingleton = (await import("@/lib/prisma")).prisma;
  return prismaSingleton;
}

async function getNotify(): Promise<NotifyModule> {
  if (!notifySingleton) notifySingleton = await import("@/lib/catchups-notify");
  return notifySingleton;
}

// ─── Timing constants (spec section 2.3) ─────────────────────────────────────

export const DAY_MS = 24 * 60 * 60 * 1000;
export const HOUR_MS = 60 * 60 * 1000;

/** Question window: 3 days. Answer window: 7 days. Preparing hold: 24h. */
export const QUESTION_WINDOW_DAYS = 3;
export const ANSWER_WINDOW_DAYS = 7;
export const PREPARING_HOLD_HOURS = 24;
/** Too-few-answers auto-extend, applied at most once. */
export const EXTEND_DAYS = 3;

/** How early the two dated reminders fire, before answersCloseAt. */
export const TWO_DAYS_LEFT_MS = 2 * DAY_MS;
export const LAST_DAY_MS = 1 * DAY_MS;

/** remindersSent bitmask (spec section 2.4). */
export const REMINDER_TWO_DAYS = 1;
export const REMINDER_LAST_DAY = 2;
export const REMINDER_EXTENDED = 4;

/** Forward-only order of the Round state machine. */
export const STATUS_ORDER: EditionStatus[] = [
  "draft",
  "collecting",
  "answering",
  "preparing",
  "published",
];

export const CADENCE_LABELS: Record<Cadence, string> = {
  biweekly: "Biweekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
};

// ─── The question library (spec section 4) ───────────────────────────────────

export type CatchupPromptSet = {
  id: PromptCategory;
  label: string;
  prompts: string[];
};

export const CATCHUP_PROMPT_SETS: CatchupPromptSet[] = [
  {
    id: "valley-days",
    label: "Valley days",
    prompts: [
      "Which teacher's voice do you still hear in your head, and what does it say?",
      "What would surprise your school self most about the life you have now?",
      "Where on campus did you go when you needed to be on your own for a while?",
      "What is something you learned in the Valley that has quietly stayed with you?",
      "Who did you sit up talking to long after lights out, and what about?",
      "What do you miss about those years that you never expected to?",
    ],
  },
  {
    id: "right-now",
    label: "Right now",
    prompts: [
      "Where has life taken you since the Valley?",
      "What does an ordinary day look like for you now?",
      "What is something you have learned recently, about anything at all?",
      "What are you working on these days, at work or otherwise?",
      "Who do you come home to, and what does home look like right now?",
      "What has been on your mind lately that you would tell a friend over tea?",
    ],
  },
  {
    id: "most-likely-to",
    label: "Most likely to",
    prompts: [
      "Who from the Valley do you still talk to, and how did you keep it going?",
      "Whose name still comes up when you tell stories from those years?",
      "Who did you lose touch with that you would love to hear from again?",
      "Who would you drop everything to see if they passed through town?",
      "Who did you learn the most from who was not one of the teachers?",
      "Who would you trust to tell you the truth when you needed to hear it?",
    ],
  },
  {
    id: "on-the-horizon",
    label: "On the horizon",
    prompts: [
      "What are you quietly working toward this year?",
      "What is a trip you keep meaning to take but have not yet?",
      "What do you want more of in your life a year from now?",
      "What is something you want to learn while you still have the time?",
      "If a few of us met up somewhere next year, where should it be?",
      "What would make the next stretch of your life a good one?",
    ],
  },
  {
    id: "small-things",
    label: "Small things",
    prompts: [
      "What have you been reading, cooking, or growing lately?",
      "What is the best thing you have eaten in the last month?",
      "What is a small ritual that quietly makes your days better?",
      "Send a photo of the view from wherever you are sitting right now.",
      "What is something small that made you laugh this week?",
      "What has been on repeat for you lately? A song, a show, anything.",
    ],
  },
];

/** The Round 1 auto-suggestion (spec section 3.2): one valley-days + one right-now prompt. */
export function suggestSeedPrompts(): Array<{ category: PromptCategory; text: string }> {
  const valley = CATCHUP_PROMPT_SETS.find((s) => s.id === "valley-days");
  const rightNow = CATCHUP_PROMPT_SETS.find((s) => s.id === "right-now");
  const seeds: Array<{ category: PromptCategory; text: string }> = [];
  if (valley?.prompts[0]) seeds.push({ category: "valley-days", text: valley.prompts[0] });
  if (rightNow?.prompts[0]) seeds.push({ category: "right-now", text: rightNow.prompts[0] });
  return seeds;
}

// ─── Calendar math ───────────────────────────────────────────────────────────

/** UTC-safe month addition (deterministic across machines; no timezone machinery, per spec). */
function addMonths(date: Date, n: number): Date {
  const d = new Date(date.getTime());
  d.setUTCMonth(d.getUTCMonth() + n);
  return d;
}

export function addDays(date: Date, n: number): Date {
  return new Date(date.getTime() + n * DAY_MS);
}

/** nextOpensAt = publishedAt + cadenceGap: 14d biweekly, ~1 month monthly, ~3 months quarterly. */
export function addCadenceGap(from: Date, cadence: Cadence): Date {
  switch (cadence) {
    case "biweekly":
      return addDays(from, 14);
    case "quarterly":
      return addMonths(from, 3);
    case "monthly":
    default:
      return addMonths(from, 1);
  }
}

export function roundLabel(n: number): string {
  return `Round ${n}`;
}

/** Catchup.title, or the "{group} Catch-ups" fallback. */
export function catchupTitle(title: string | null | undefined, groupName: string): string {
  return title?.trim() || `${groupName} Catch-ups`;
}

/** Effective Keeper = the creator OR any group admin (spec section 7). */
export function isEffectiveKeeper(opts: {
  viewerId: string | null | undefined;
  createdById: string | null | undefined;
  groupRole: string | null | undefined;
}): boolean {
  if (!opts.viewerId) return false;
  if (opts.createdById && opts.viewerId === opts.createdById) return true;
  return opts.groupRole === "admin";
}

// ─── Pure state machine ──────────────────────────────────────────────────────

function ms(t: Date | string | null | undefined): number | null {
  if (t == null) return null;
  const n = new Date(t).getTime();
  return Number.isNaN(n) ? null : n;
}

/**
 * The status a Round SHOULD be in given its timestamps and the clock. Pure and
 * forward-only: it never returns a status earlier than the stored one, and it
 * never writes. Draft and published are terminal to the clock (draft only opens
 * by an explicit Keeper action; published is forever).
 */
export function computeStatus(ed: EditionTiming, now: Date): EditionStatus {
  const t = now.getTime();
  const passed = (at: Date | string | null | undefined) => {
    const m = ms(at);
    return m != null && t >= m;
  };

  let s = ed.status;
  if (s === "draft" || s === "published") return s;

  if (s === "collecting") {
    if (!passed(ed.questionsCloseAt)) return "collecting";
    s = "answering";
  }
  if (s === "answering") {
    if (!passed(ed.answersCloseAt)) return "answering";
    s = "preparing";
  }
  if (s === "preparing") {
    if (!passed(ed.publishAt)) return "preparing";
    s = "published";
  }
  return s;
}

/** The single next forward step the clock justifies, or null when the Round is settled. */
export function nextEditionStatus(ed: EditionTiming, now: Date): EditionStatus | null {
  const target = computeStatus(ed, now);
  const ci = STATUS_ORDER.indexOf(ed.status);
  const ti = STATUS_ORDER.indexOf(target);
  if (ti <= ci) return null;
  return STATUS_ORDER[ci + 1];
}

/** The mid-window reminder due right now (if any), while still answering. */
export function dueReminder(
  ed: EditionTiming,
  now: Date
): { bit: number; modes: ReminderMode[] } | null {
  if (ed.status !== "answering") return null;
  const close = ms(ed.answersCloseAt);
  if (close == null) return null;
  const t = now.getTime();
  if (t >= close) return null; // past the window; we transition instead of nudging

  const twoDaySent = (ed.remindersSent & REMINDER_TWO_DAYS) !== 0;
  const lastDaySent = (ed.remindersSent & REMINDER_LAST_DAY) !== 0;

  if (!twoDaySent && t >= close - TWO_DAYS_LEFT_MS) {
    return { bit: REMINDER_TWO_DAYS, modes: ["all"] };
  }
  if (!lastDaySent && t >= close - LAST_DAY_MS) {
    return { bit: REMINDER_LAST_DAY, modes: ["all", "last"] };
  }
  return null;
}

/** Too-few-answers: extend once when the answer window closes with zero entries. */
export function shouldExtendForTooFew(ed: EditionTiming, entryCount: number): boolean {
  return entryCount === 0 && (ed.remindersSent & REMINDER_EXTENDED) === 0;
}

// ─── Transition patches (pure; shared by advanceEdition AND the WP2 actions) ──

export type EditionPatch = {
  status?: EditionStatus;
  answersCloseAt?: Date;
  publishAt?: Date;
  publishedAt?: Date;
  remindersSent?: number;
};

/** collecting -> answering. Sets the 7-day answer window. */
export function answeringPatch(now: Date): EditionPatch {
  return { status: "answering", answersCloseAt: addDays(now, ANSWER_WINDOW_DAYS) };
}

/** answering -> preparing. Sets the 24h ritual hold (publishAt = answersCloseAt + 24h). */
export function preparingPatch(ed: EditionTiming, now: Date): EditionPatch {
  const existing = ms(ed.publishAt);
  if (existing != null) return { status: "preparing" };
  const base = ms(ed.answersCloseAt) ?? now.getTime();
  return { status: "preparing", publishAt: new Date(base + PREPARING_HOLD_HOURS * HOUR_MS) };
}

/** preparing -> published. */
export function publishPatch(now: Date): EditionPatch {
  return { status: "published", publishedAt: now };
}

/** Too-few extension: push the answer window 3 days and set the extended bit. */
export function extendPatch(ed: EditionTiming, now: Date): EditionPatch {
  return {
    answersCloseAt: addDays(now, EXTEND_DAYS),
    remindersSent: ed.remindersSent | REMINDER_EXTENDED,
  };
}

// ─── The one-step plan (pure) ────────────────────────────────────────────────

export type EditionAction =
  | { kind: "none" }
  | {
      kind: "transition";
      from: EditionStatus;
      to: EditionStatus;
      patch: EditionPatch;
      notify: CatchupNotifyKind | null;
      setsNextOpensAt: boolean;
    }
  | { kind: "extend"; patch: EditionPatch; notify: "catchup_answers_open" }
  | { kind: "reminder"; bit: number; modes: ReminderMode[]; patch: EditionPatch };

/**
 * What advanceEdition should do next, as a single step. Pure: given the same
 * edition + entryCount + now it always returns the same action, and once a step
 * has been applied (status advanced, or the guarding bit set) it returns { none }.
 * That total, deterministic shape is exactly what makes idempotency unit-testable
 * without a database.
 */
export function planNextAction(ed: EditionTiming, entryCount: number, now: Date): EditionAction {
  const next = nextEditionStatus(ed, now);

  if (next) {
    if (ed.status === "answering" && next === "preparing") {
      if (shouldExtendForTooFew(ed, entryCount)) {
        return { kind: "extend", patch: extendPatch(ed, now), notify: "catchup_answers_open" };
      }
      return {
        kind: "transition",
        from: "answering",
        to: "preparing",
        patch: preparingPatch(ed, now),
        notify: null,
        setsNextOpensAt: false,
      };
    }
    if (next === "answering") {
      return {
        kind: "transition",
        from: ed.status,
        to: "answering",
        patch: answeringPatch(now),
        notify: "catchup_answers_open",
        setsNextOpensAt: false,
      };
    }
    if (next === "published") {
      return {
        kind: "transition",
        from: "preparing",
        to: "published",
        patch: publishPatch(now),
        notify: "catchup_published",
        setsNextOpensAt: true,
      };
    }
    // Any other single step (e.g. a staged draft opening) carries no clock side effects.
    return {
      kind: "transition",
      from: ed.status,
      to: next,
      patch: { status: next },
      notify: null,
      setsNextOpensAt: false,
    };
  }

  const rem = dueReminder(ed, now);
  if (rem) {
    return {
      kind: "reminder",
      bit: rem.bit,
      modes: rem.modes,
      patch: { remindersSent: ed.remindersSent | rem.bit },
    };
  }

  return { kind: "none" };
}

// ─── Friendly status copy (shared so every surface reads the same) ────────────

function daysUntilLabel(t: Date | string | null | undefined, now: Date): string | null {
  const m = ms(t);
  if (m == null) return null;
  const diff = m - now.getTime();
  if (diff <= 0) return "closing";
  const days = Math.ceil(diff / DAY_MS);
  if (days <= 1) return "last day";
  return `${days} days left`;
}

export function describeEditionStatus(
  ed: {
    status: EditionStatus;
    number: number;
    questionsCloseAt?: Date | string | null;
    answersCloseAt?: Date | string | null;
  },
  now: Date = new Date()
): string {
  switch (ed.status) {
    case "draft":
      return "Draft";
    case "collecting": {
      const left = daysUntilLabel(ed.questionsCloseAt, now);
      return left ? `Questions open, ${left}` : "Questions open";
    }
    case "answering": {
      const left = daysUntilLabel(ed.answersCloseAt, now);
      return left ? `Answering now, ${left}` : "Answering now";
    }
    case "preparing":
      return "Preparing the Round";
    case "published":
      return `${roundLabel(ed.number)} published`;
    default:
      return "";
  }
}

// ─── Spotify (keyless oembed; the SSRF boundary) ─────────────────────────────

export type SpotifyResult =
  | { ok: false; error: string }
  | { ok: true; songUrl: string; songTitle: string; songArt: string | null };

/** Optional intl prefix, then exactly track / album / playlist and a base62 id. */
const SPOTIFY_PATH_RE = /^(?:\/intl-[a-z]{2})?\/(track|album|playlist)\/([A-Za-z0-9]+)/;

/**
 * Resolve a user-supplied Spotify URL through the keyless oembed endpoint.
 * SSRF boundary: the host MUST be exactly open.spotify.com over https, and the
 * path MUST be a track / album / playlist. Anything else is rejected with a
 * friendly error. On a valid link we fetch with a 3s timeout and fail soft:
 * the answer is never blocked on Spotify.
 */
export async function resolveSpotify(
  rawUrl: string,
  opts: { fetchImpl?: typeof fetch; timeoutMs?: number } = {}
): Promise<SpotifyResult> {
  const input = (rawUrl ?? "").trim();
  if (!input) return { ok: false, error: "Paste a Spotify link to add a song." };

  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    return {
      ok: false,
      error: "That does not look like a link. Paste a Spotify track, album, or playlist.",
    };
  }

  if (parsed.protocol !== "https:" || parsed.hostname !== "open.spotify.com") {
    return { ok: false, error: "Only Spotify links work here. Paste one from open.spotify.com." };
  }

  const match = SPOTIFY_PATH_RE.exec(parsed.pathname);
  if (!match) {
    return { ok: false, error: "Paste a link to a Spotify track, album, or playlist." };
  }

  const kind = match[1];
  const id = match[2];
  const songUrl = `https://open.spotify.com/${kind}/${id}`;

  const fetchImpl = opts.fetchImpl ?? globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    return { ok: true, songUrl, songTitle: songUrl, songArt: null };
  }

  const timeoutMs = opts.timeoutMs ?? 3000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(
      `https://open.spotify.com/oembed?url=${encodeURIComponent(songUrl)}`,
      { signal: controller.signal }
    );
    if (!res.ok) return { ok: true, songUrl, songTitle: songUrl, songArt: null };
    const data = (await res.json()) as { title?: unknown; thumbnail_url?: unknown };
    const title =
      typeof data.title === "string" && data.title.trim() ? data.title.trim() : songUrl;
    const art =
      typeof data.thumbnail_url === "string" && data.thumbnail_url ? data.thumbnail_url : null;
    return { ok: true, songUrl, songTitle: title, songArt: art };
  } catch {
    // Timeout, network failure, or bad JSON: fail soft, still store the link.
    return { ok: true, songUrl, songTitle: songUrl, songArt: null };
  } finally {
    clearTimeout(timer);
  }
}

// ─── The missing-table guard (P2021) ─────────────────────────────────────────

/**
 * True when an error means "a Catchup* table does not exist yet" (pre-migration).
 * Shared surfaces (the app-shell piggyback, the group card) wrap their queries
 * with this so a missing table degrades to "no Catch-up data" instead of a 500.
 */
export function isMissingCatchupTable(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: unknown; message?: unknown };
  const code = typeof e.code === "string" ? e.code : "";
  if (code === "P2021") return true; // Prisma: the table does not exist
  if (code === "42P01") return true; // Postgres undefined_table (raw, via the pg adapter)
  const msg = typeof e.message === "string" ? e.message : "";
  // Defensive fallback, scoped to our tables so an unrelated error is never masked.
  if (/Catchup/.test(msg) && /does not exist/i.test(msg)) return true;
  return false;
}

// ─── Impure drivers ──────────────────────────────────────────────────────────

type AdvanceMeta = {
  catchupId: string;
  groupId: string;
  groupName: string;
  cadence: Cadence;
  catchupStatus: CatchupStatus;
};

export type AdvanceEditionInput = EditionTiming & {
  id: string;
  catchupId: string;
  catchup?: {
    id?: string;
    cadence?: string | null;
    status?: string | null;
    group?: { id: string; name: string } | null;
  } | null;
};

const EDITION_TIMING_SELECT = {
  status: true,
  questionsCloseAt: true,
  answersCloseAt: true,
  publishAt: true,
  publishedAt: true,
  remindersSent: true,
} as const;

function toTiming(row: {
  status: string;
  questionsCloseAt: Date | string | null;
  answersCloseAt: Date | string | null;
  publishAt: Date | string | null;
  publishedAt: Date | string | null;
  remindersSent: number;
}): EditionTiming {
  return {
    status: row.status as EditionStatus,
    questionsCloseAt: row.questionsCloseAt,
    answersCloseAt: row.answersCloseAt,
    publishAt: row.publishAt,
    publishedAt: row.publishedAt,
    remindersSent: row.remindersSent,
  };
}

async function loadMeta(edition: AdvanceEditionInput): Promise<AdvanceMeta | null> {
  const included = edition.catchup;
  if (included?.group) {
    return {
      catchupId: edition.catchupId,
      groupId: included.group.id,
      groupName: included.group.name,
      cadence: (included.cadence as Cadence) ?? "monthly",
      catchupStatus: (included.status as CatchupStatus) ?? "active",
    };
  }
  const prisma = await getPrisma();
  const c = await prisma.catchup.findUnique({
    where: { id: edition.catchupId },
    select: {
      id: true,
      cadence: true,
      status: true,
      group: { select: { id: true, name: true } },
    },
  });
  if (!c) return null;
  return {
    catchupId: c.id,
    groupId: c.group.id,
    groupName: c.group.name,
    cadence: c.cadence as Cadence,
    catchupStatus: c.status as CatchupStatus,
  };
}

/**
 * Apply exactly one planned action inside its own transaction. The WHERE clause
 * is the compare-and-swap guard: a transition matches on the current status, a
 * reminder / extension on the current remindersSent. If a concurrent visit
 * already applied it the update touches 0 rows and we fire nothing (idempotent).
 * The notification write shares the transaction, so it commits with the flip or
 * not at all. Returns true when this call did the work.
 */
async function applyEditionAction(
  editionId: string,
  before: EditionTiming,
  action: EditionAction,
  meta: AdvanceMeta,
  now: Date
): Promise<boolean> {
  if (action.kind === "none") return false;
  const prisma = await getPrisma();
  const notify = await getNotify();

  return prisma.$transaction(async (tx) => {
    if (action.kind === "transition") {
      const cas = await tx.catchupEdition.updateMany({
        where: { id: editionId, status: action.from },
        data: action.patch,
      });
      if (cas.count === 0) return false;

      if (action.setsNextOpensAt && meta.catchupStatus === "active") {
        await tx.catchup.update({
          where: { id: meta.catchupId },
          data: { nextOpensAt: addCadenceGap(now, meta.cadence) },
        });
      }
      if (action.notify === "catchup_answers_open") {
        await notify.notifyAnswersOpen(tx, { ...meta, editionId });
      } else if (action.notify === "catchup_published") {
        await notify.notifyPublished(tx, { ...meta, editionId });
      }
      return true;
    }

    if (action.kind === "extend") {
      const cas = await tx.catchupEdition.updateMany({
        where: { id: editionId, status: "answering", remindersSent: before.remindersSent },
        data: action.patch,
      });
      if (cas.count === 0) return false;
      await notify.notifyAnswersOpen(tx, { ...meta, editionId, onlyNonAnswerers: true });
      return true;
    }

    // reminder
    const cas = await tx.catchupEdition.updateMany({
      where: { id: editionId, remindersSent: before.remindersSent },
      data: action.patch,
    });
    if (cas.count === 0) return false;
    await notify.notifyReminder(tx, { ...meta, editionId, modes: action.modes });
    return true;
  });
}

/**
 * Bring one Round to the status the clock justifies, firing each crossed
 * transition's one-time side effects. Loops so a very stale Round settles fully
 * in a single visit; bounded so a logic bug can never spin. Never throws: a
 * missing table (pre-migration) or any error is swallowed, because the app-shell
 * piggyback that calls this runs on every authenticated page.
 */
export async function advanceEdition(
  edition: AdvanceEditionInput,
  now: Date = new Date()
): Promise<void> {
  try {
    const meta = await loadMeta(edition);
    if (!meta) return;
    const prisma = await getPrisma();

    let ed: EditionTiming = toTiming(edition);
    let entryCount: number | null = null;

    for (let i = 0; i < 12; i += 1) {
      // The entry count only matters for the answering -> preparing decision.
      if (
        entryCount === null &&
        ed.status === "answering" &&
        nextEditionStatus(ed, now) === "preparing"
      ) {
        entryCount = await prisma.catchupEntry.count({ where: { editionId: edition.id } });
      }

      const action = planNextAction(ed, entryCount ?? 0, now);
      if (action.kind === "none") break;

      const applied = await applyEditionAction(edition.id, ed, action, meta, now);
      if (!applied) {
        // Lost the compare-and-swap to a concurrent visit: re-read and continue.
        const fresh = await prisma.catchupEdition.findUnique({
          where: { id: edition.id },
          select: EDITION_TIMING_SELECT,
        });
        if (!fresh) break;
        ed = toTiming(fresh);
        entryCount = null;
        continue;
      }

      ed = { ...ed, ...action.patch };
      if (ed.status !== "answering") entryCount = null;
    }
  } catch (err) {
    if (isMissingCatchupTable(err)) return;
    console.error("[catchups] advanceEdition failed", err);
  }
}

/**
 * Open the next Round for a recurring Catch-up once its nextOpensAt has passed.
 * Idempotent: the compare-and-swap on nextOpensAt (set back to null) means only
 * one visit opens it, and the unique [catchupId, number] index is the backstop.
 */
async function openNextRoundIfDue(
  catchup: {
    id: string;
    status: string;
    cadence: string;
    nextOpensAt: Date | null;
    group: { id: string; name: string };
    editions: Array<{ number: number; status: string }>;
  },
  now: Date
): Promise<void> {
  if (catchup.status !== "active") return;
  const opensAt = catchup.nextOpensAt;
  if (!opensAt || now.getTime() < opensAt.getTime()) return;

  const latest = catchup.editions[0];
  // Only open a fresh Round when the previous one has actually published.
  if (!latest || latest.status !== "published") return;

  const prisma = await getPrisma();
  const notify = await getNotify();
  await prisma.$transaction(async (tx) => {
    const cas = await tx.catchup.updateMany({
      where: { id: catchup.id, nextOpensAt: opensAt },
      data: { nextOpensAt: null },
    });
    if (cas.count === 0) return;

    const edition = await tx.catchupEdition.create({
      data: {
        catchupId: catchup.id,
        number: latest.number + 1,
        status: "collecting",
        questionsCloseAt: addDays(now, QUESTION_WINDOW_DAYS),
      },
    });
    await notify.notifyQuestionsOpen(tx, {
      catchupId: catchup.id,
      editionId: edition.id,
      groupId: catchup.group.id,
      groupName: catchup.group.name,
    });
  });
}

/**
 * The lazy, read-time, no-cron advance (spec section 2.4). Finds every stale
 * Round in the viewer's groups (or across all groups when unscoped, so a future
 * CRON_SECRET /api/catchups/tick is a thin wrapper) and advances each, then opens
 * any next Rounds whose nextOpensAt has passed. Wrapped so it can NEVER throw:
 * it is piggy-backed on the app-shell notification-count query that runs on
 * essentially every authenticated page view, and a missing table (pre-migration)
 * or any error must degrade to a no-op, never a 500.
 */
export async function advanceDueCatchups(userId?: string): Promise<void> {
  const now = new Date();
  try {
    const prisma = await getPrisma();
    const scope = userId ? { group: { members: { some: { userId } } } } : {};

    const editions = await prisma.catchupEdition.findMany({
      where: {
        status: { in: ["collecting", "answering", "preparing"] },
        catchup: scope,
      },
      include: {
        catchup: { select: { id: true, cadence: true, status: true, group: { select: { id: true, name: true } } } },
      },
    });

    for (const ed of editions) {
      await advanceEdition(ed as AdvanceEditionInput, now);
    }

    const catchups = await prisma.catchup.findMany({
      where: { status: "active", nextOpensAt: { lte: now }, ...scope },
      include: {
        group: { select: { id: true, name: true } },
        editions: { orderBy: { number: "desc" }, take: 1, select: { number: true, status: true } },
      },
    });

    for (const c of catchups) {
      try {
        await openNextRoundIfDue(c, now);
      } catch (err) {
        if (!isMissingCatchupTable(err)) {
          console.error("[catchups] openNextRoundIfDue failed", err);
        }
      }
    }
  } catch (err) {
    if (isMissingCatchupTable(err)) return; // tables absent (pre-migration): no-op
    console.error("[catchups] advanceDueCatchups failed", err);
    // Swallow: this runs on every authenticated page and must never break one.
  }
}
