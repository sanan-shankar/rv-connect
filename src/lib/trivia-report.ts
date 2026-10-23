import { TRIVIA_QUESTIONS, judge, normalize, questionById, type Question } from "./trivia-bank.ts";

/* ------------------------------------------------------------------ *
 *  What the trivia gate's log says, worked out.
 *
 *  Pure: rows in, a report out, no database and no "@/..." imports, so the
 *  unit tests and the lab room's sample run the exact arithmetic the admin
 *  room does. src/lib/admin-trivia.ts fetches the rows; this file is the
 *  only place that decides what they mean. docs/spec/admin.md §9.11.
 *
 *  THE UNIT IS A SHOWING. A question put in front of someone, and whatever
 *  they did with it before the next question or the end: got it first go,
 *  got it after a miss, moved on without trying, missed and moved on or
 *  left, or left without typing anything. Every per-question number is a
 *  share of showings, because "how many wrong answers did the tree get"
 *  counts one stubborn person ten times and a question nobody tried not at
 *  all.
 *
 *  THE PERSON IS A BROWSER. Somebody who tries on a phone and finishes on a
 *  laptop is two here until they join, at which point both are their name.
 *  The room says "people" and means this; the alternative was a word nobody
 *  would read.
 * ------------------------------------------------------------------ */

export type TriviaRow = {
  id: string;
  browserId: string;
  questionId: string;
  kind: string;
  answer: string | null;
  how: string | null;
  matched: string | null;
  device: string | null;
  country: string | null;
  userId: string | null;
  createdAt: Date;
};

export type TriviaMember = {
  id: string;
  name: string;
  photoUrl: string | null;
  birdOverride: string | null;
  accountType: string | null;
  batchType: string | null;
  batchYear: number | null;
  verifyState: string | null;
  createdAt: Date;
};

export type AddedAnswer = {
  id: string;
  questionId: string;
  answer: string;
  typed: string;
  createdAt: Date;
};

export type Outcome = "firstGo" | "afterMiss" | "movedOn" | "missed" | "left";
export const OUTCOMES: readonly Outcome[] = ["firstGo", "afterMiss", "movedOn", "missed", "left"];

/** Typed kinds: the rows that carry words. */
const TYPED = new Set(["wrong", "right", "dontknow", "limited"]);
/** A miss inside a showing. A refusal by the limit counts: they typed and were turned away. */
const MISS = new Set(["wrong", "limited"]);

/* Somebody whose last move was this recent is probably still on the page.
   Their showing is neither won nor lost yet, and calling it "left" would
   mark every live visitor during the Centenary as a drop-out. */
const STILL_HERE_MS = 10 * 60 * 1000;

/* Below this many showings that ended in something, a question's shares are
   two or three people's habits, and a verdict on them would be a guess. */
const MIN_SAMPLE = 5;

/* ---------------------------------------------------------------- */

type Showing = {
  browserId: string;
  questionId: string;
  shownAt: number | null;
  missed: boolean;
  outcome: Outcome | "open";
  /** Seconds from the question appearing to the right answer, or to the swap. */
  seconds: number | null;
};

/** Same-millisecond rows (a swap writes its skip and the next question in one
    insert) sort the skip first, so the new question opens after the old closes. */
function byTime(a: TriviaRow, b: TriviaRow): number {
  const d = a.createdAt.getTime() - b.createdAt.getTime();
  if (d !== 0) return d;
  return (a.kind === "shown" ? 1 : 0) - (b.kind === "shown" ? 1 : 0);
}

function showingsOf(rows: TriviaRow[], now: number): Showing[] {
  const out: Showing[] = [];
  let open: Showing | null = null;
  let lastAt = 0;

  const close = (s: Showing, endedOpen: boolean) => {
    if (s.outcome === "open") {
      s.outcome = endedOpen && now - lastAt < STILL_HERE_MS ? "open" : s.missed ? "missed" : "left";
    }
    out.push(s);
  };
  const begin = (r: TriviaRow, shown: boolean): Showing => ({
    browserId: r.browserId,
    questionId: r.questionId,
    shownAt: shown ? r.createdAt.getTime() : null,
    missed: false,
    outcome: "open",
    seconds: null,
  });

  for (const r of rows) {
    lastAt = r.createdAt.getTime();
    if (r.kind === "shown") {
      if (open) close(open, false);
      open = begin(r, true);
      continue;
    }
    /* A row for a question nobody showed (the hourly cap dropped the "shown",
       or the rows predate a reload) still happened; it opens its own showing. */
    if (!open || open.questionId !== r.questionId) {
      if (open) close(open, false);
      open = begin(r, false);
    }
    const s: Showing = open;
    const since = s.shownAt === null ? null : Math.max(0, (lastAt - s.shownAt) / 1000);
    if (MISS.has(r.kind)) {
      s.missed = true;
    } else if (r.kind === "right") {
      s.outcome = s.missed ? "afterMiss" : "firstGo";
      s.seconds = since;
      close(s, false);
      open = null;
    } else if (r.kind === "skipped" || r.kind === "dontknow") {
      s.outcome = s.missed ? "missed" : "movedOn";
      s.seconds = since;
      close(s, false);
      open = null;
    }
  }
  if (open) close(open, true);
  return out;
}

/* ---------------------------------------------------------------- */

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** Edit distance, capped: anything past `cap` reports `cap + 1`. */
export function editDistance(a: string, b: string, cap = 2): number {
  if (Math.abs(a.length - b.length) > cap) return cap + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      const v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      cur.push(v);
      if (v < best) best = v;
    }
    if (best > cap) return cap + 1;
    prev = cur;
  }
  return Math.min(prev[b.length], cap + 1);
}

/**
 * The valley's calendar day (India keeps one offset and no summer time).
 *
 * The same answer as `valleyDayKey` in src/lib/utils.ts, which is the
 * canonical one and what the UI uses. This copy exists because this file is
 * imported under plain Node by its tests and utils.ts drags in clsx and
 * tailwind-merge; trivia-report.test.mjs pins the two to the same day.
 */
export function valleyDay(t: Date | number): string {
  return new Date(new Date(t).getTime() + 5.5 * 3_600_000).toISOString().slice(0, 10);
}

/** Which generation a member belongs to, for the matrix. */
function cohortOf(m: Pick<TriviaMember, "accountType" | "batchYear">): string | null {
  if (m.accountType === "teacher" || m.accountType === "ex_teacher") return "Teachers";
  if (m.batchYear == null) return null;
  return `${Math.floor(m.batchYear / 10) * 10}s`;
}

/* ---------------------------------------------------------------- */

export type Verdict = "works" | "skipped" | "missed" | "mixed" | "early";

export type QuestionStat = {
  id: string;
  label: string;
  question: string;
  /** Showings that ended one way or another. */
  shown: number;
  outcomes: Record<Outcome, number>;
  /** Showings that ended in something other than leaving. */
  answered: number;
  medianSecondsToRight: number | null;
  medianSecondsToMoveOn: number | null;
  verdict: Verdict;
  /** Higher is better. Only used to order the cards. */
  score: number;
};

/** A member as the room draws them. */
export type MemberRef = TriviaMember;

export type Candidate = {
  questionId: string;
  label: string;
  /** Normalised, the form Accept stores. */
  norm: string;
  /** The way it was typed most often, for the room to show. */
  typed: string;
  /** Every distinct way it was typed, most frequent first. */
  variants: string[];
  people: number;
  /** Of those people, how many got through on some OTHER question. */
  gotInElsewhere: number;
  /** ...and how many fixed it on this one, with what. */
  correctedTo: string | null;
  members: MemberRef[];
  /** How it sits beside an accepted answer, if it does. */
  near: Near | null;
  lastAt: Date;
  /** Already passes under today's rules (accepted since it was typed). */
  acceptedSince: boolean;
  refused: boolean;
  score: number;
};

export type TypedEvent = {
  id: string;
  questionId: string;
  label: string;
  kind: "wrong" | "right" | "dontknow" | "limited";
  how: string | null;
  answer: string;
  at: Date;
  device: string | null;
  country: string | null;
  member: MemberRef | null;
  /** On a wrong answer: today's rules would let it in. */
  acceptedSince: boolean;
};

export type StuckTrail = {
  browserId: string;
  device: string | null;
  country: string | null;
  lastAt: Date;
  steps: { label: string; kind: string; answer: string | null }[];
};

export type GateReport = {
  door: {
    arrived: number;
    tried: number;
    through: number;
    joined: number;
    /** Got through on the very first thing they typed. */
    firstGo: number;
    medianSecondsToThrough: number | null;
    hereNow: number;
  };
  byDevice: { device: string; arrived: number; through: number }[];
  questions: QuestionStat[];
  /** Turned-away answers the evidence says a real alumnus typed. */
  candidates: Candidate[];
  /** Every turned-away answer, grouped, most people first: the question page's list. */
  turnedAway: Candidate[];
  stuck: StuckTrail[];
  recent: TypedEvent[];
  daily: { day: string; arrived: number; through: number; joined: number }[];
  generations: {
    cohorts: string[];
    rows: { questionId: string; label: string; cells: { cohort: string; answered: number; right: number }[] }[];
  };
  matching: Record<"exact" | "typo" | "mention" | "added", number>;
  events: number;
};

/* ---------------------------------------------------------------- */

function verdictOf(o: Record<Outcome, number>): { verdict: Verdict; score: number; answered: number } {
  const answered = o.firstGo + o.afterMiss + o.movedOn + o.missed;
  if (answered === 0) return { verdict: "early", score: -9, answered };
  const share = (n: number) => n / answered;
  const score =
    share(o.firstGo) + 0.5 * share(o.afterMiss) - 0.5 * share(o.movedOn) - 0.5 * share(o.missed);
  if (answered < MIN_SAMPLE) return { verdict: "early", score: score - 5, answered };
  /* Order is the order of what the owner would do about it: a question people
     will not even try is a different problem from one they get wrong. The
     lines were set against the lab's invented month, where an earlier, stricter
     set called six questions of ten "mixed" and so said nothing about any of
     them. Revisit them against the Centenary's real numbers. */
  if (share(o.movedOn) >= 0.3) return { verdict: "skipped", score, answered };
  if (share(o.missed) >= 0.25) return { verdict: "missed", score, answered };
  if (share(o.firstGo) >= 0.5) return { verdict: "works", score, answered };
  return { verdict: "mixed", score, answered };
}

function acceptedEntries(q: Question, added: readonly string[]): string[] {
  return [...q.answers, ...(q.contains ?? [])].map(normalize).concat(added);
}

export type Near = { entry: string; how: "spelling" | "contains" | "part" };

/**
 * How a turned-away answer sits beside the ones we take, if it does at all.
 *
 *   spelling  within two letters ("asthchal" and "asthachal")
 *   contains  an accepted answer is inside it ("asthachal walk")
 *   part      it is inside an accepted answer ("grub" of "grubtuck")
 *
 * Four letters on both sides before any of it counts: "egg" sits inside
 * "eggcurry" and a two-letter answer sits inside half the bank.
 */
function nearest(norm: string, entries: string[]): Near | null {
  if (norm.length < 4) return null;
  let best: Near | null = null;
  let bestD = 3;
  for (const e of entries) {
    if (e.length < 4 || e === norm) continue;
    if (norm.includes(e)) return { entry: e, how: "contains" };
    if (e.includes(norm)) best ??= { entry: e, how: "part" };
    const d = editDistance(norm, e, 2);
    if (d < bestD && (!best || best.how === "spelling")) {
      best = { entry: e, how: "spelling" };
      bestD = d;
    }
  }
  return best;
}


/**
 * Everything the room draws, from the rows the loader fetched.
 *
 * `addedByQuestion` is TriviaAnswer, normalised, keyed by question id: it is
 * what makes "accepted since" mean today's rules and not the day it was typed.
 */
export function buildGateReport(input: {
  rows: TriviaRow[];
  members: TriviaMember[];
  addedByQuestion: Map<string, string[]>;
  now: Date;
  /** How many days the traffic strip covers. */
  days: number;
}): GateReport {
  const now = input.now.getTime();
  const members = new Map(input.members.map((m) => [m.id, m]));
  const added = (id: string) => input.addedByQuestion.get(id) ?? [];

  const byBrowser = new Map<string, TriviaRow[]>();
  for (const r of input.rows) {
    if (!questionById(r.questionId)) continue;
    const list = byBrowser.get(r.browserId);
    if (list) list.push(r);
    else byBrowser.set(r.browserId, [r]);
  }

  /* Per browser: who they became, where they got in, how. */
  const memberOf = new Map<string, TriviaMember>();
  const through = new Set<string>();
  const allShowings: Showing[] = [];
  let firstGo = 0;
  let tried = 0;
  let hereNow = 0;
  const toThrough: number[] = [];
  const devices = new Map<string, { arrived: number; through: number }>();
  const stuck: StuckTrail[] = [];

  for (const [browserId, rows] of byBrowser) {
    rows.sort(byTime);
    const linked = rows.find((r) => r.userId && members.has(r.userId));
    if (linked?.userId) memberOf.set(browserId, members.get(linked.userId)!);

    const typed = rows.filter((r) => TYPED.has(r.kind));
    const answers = typed.filter((r) => r.kind !== "dontknow");
    const right = rows.find((r) => r.kind === "right");
    const last = rows[rows.length - 1].createdAt.getTime();
    if (typed.length > 0) tried++;
    if (right) {
      through.add(browserId);
      if (answers[0]?.kind === "right") firstGo++;
      toThrough.push((right.createdAt.getTime() - rows[0].createdAt.getTime()) / 1000);
    } else if (now - last < STILL_HERE_MS) {
      hereNow++;
    } else if (typed.length > 0) {
      stuck.push({
        browserId,
        device: rows[0].device,
        country: rows[0].country,
        lastAt: rows[rows.length - 1].createdAt,
        steps: rows
          .filter((r) => r.kind !== "shown")
          .map((r) => ({
            label: questionById(r.questionId)!.label,
            kind: r.kind,
            answer: r.answer,
          })),
      });
    }

    const device = rows[0].device ?? "unknown";
    const d = devices.get(device) ?? { arrived: 0, through: 0 };
    d.arrived++;
    if (right) d.through++;
    devices.set(device, d);

    allShowings.push(...showingsOf(rows, now));
  }

  /* ---- the questions ---- */
  const questions: QuestionStat[] = TRIVIA_QUESTIONS.map((q) => {
    const mine = allShowings.filter((s) => s.questionId === q.id && s.outcome !== "open");
    const outcomes = { firstGo: 0, afterMiss: 0, movedOn: 0, missed: 0, left: 0 } as Record<Outcome, number>;
    for (const s of mine) outcomes[s.outcome as Outcome]++;
    const { verdict, score, answered } = verdictOf(outcomes);
    return {
      id: q.id,
      label: q.label,
      question: q.question,
      shown: mine.length,
      outcomes,
      answered,
      medianSecondsToRight: median(
        mine.filter((s) => (s.outcome === "firstGo" || s.outcome === "afterMiss") && s.seconds !== null).map((s) => s.seconds!),
      ),
      medianSecondsToMoveOn: median(
        mine.filter((s) => s.outcome === "movedOn" && s.seconds !== null).map((s) => s.seconds!),
      ),
      verdict,
      score,
    };
  }).sort((a, b) => b.score - a.score || b.shown - a.shown);

  /* ---- answers turned away, grouped ---- */
  type Group = {
    q: Question;
    norm: string;
    typed: Map<string, number>;
    browsers: Set<string>;
    lastAt: Date;
    refused: boolean;
  };
  const groups = new Map<string, Group>();
  for (const r of input.rows) {
    if (!MISS.has(r.kind) || !r.answer) continue;
    const q = questionById(r.questionId);
    if (!q) continue;
    const norm = normalize(r.answer);
    if (!norm) continue;
    const key = `${q.id}\u0000${norm}`;
    const g = groups.get(key) ?? {
      q,
      norm,
      typed: new Map(),
      browsers: new Set(),
      lastAt: r.createdAt,
      refused: false,
    };
    const raw = r.answer.trim();
    g.typed.set(raw, (g.typed.get(raw) ?? 0) + 1);
    g.browsers.add(r.browserId);
    if (r.createdAt > g.lastAt) g.lastAt = r.createdAt;
    if (r.how === "refused") g.refused = true;
    groups.set(key, g);
  }

  const allCandidates: Candidate[] = [...groups.values()].map((g) => {
    const variants = [...g.typed.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t);
    let gotInElsewhere = 0;
    let correctedTo: string | null = null;
    const seen = new Map<string, MemberRef>();
    for (const b of g.browsers) {
      const rows = byBrowser.get(b) ?? [];
      const fixedHere = rows.find((r) => r.kind === "right" && r.questionId === g.q.id);
      if (fixedHere) correctedTo ??= fixedHere.answer;
      else if (through.has(b)) gotInElsewhere++;
      const m = memberOf.get(b);
      if (m) seen.set(m.id, m);
    }
    const near = nearest(g.norm, acceptedEntries(g.q, added(g.q.id)));
    const people = g.browsers.size;
    const acceptedSince = judge(g.q, variants[0], added(g.q.id)).ok;
    return {
      questionId: g.q.id,
      label: g.q.label,
      norm: g.norm,
      typed: variants[0],
      variants,
      people,
      gotInElsewhere,
      correctedTo,
      members: [...seen.values()],
      near,
      lastAt: g.lastAt,
      acceptedSince,
      refused: g.refused,
      /* Nearness to an accepted answer leads: it is the one signal that says
         the answer is RIGHT rather than merely common. Then people who got in
         on another question -- they knew enough to pass and believed this.
         Fixing it themselves on the same question counts least: the gate's
         own nudge did the work there. */
      score: (near ? 6 : 0) + people + 2 * gotInElsewhere + (correctedTo ? 0.5 : 0),
    };
  });

  /* Worth a look: near an accepted answer, or a shared belief among people
     who demonstrably know the place. The second rule wants THREE of them,
     because at Centenary volumes nearly everyone gets in somewhere, so two
     people who passed and shared a wrong answer is a coincidence, and the
     lab's invented month put "Banyan" for Golden, Silver, Neem at the top of
     this list on exactly that rule. Every other miss is on its question's
     own page. */
  const candidates = allCandidates
    .filter(
      (c) =>
        !c.acceptedSince &&
        !c.refused &&
        (c.near !== null || c.gotInElsewhere >= 3),
    )
    /* Near ones first as a tier, whatever the counts: "probably right" is a
       different thing from "a lot of people think so", and should read first. */
    .sort(
      (a, b) =>
        Number(!!b.near) - Number(!!a.near) ||
        b.score - a.score ||
        b.lastAt.getTime() - a.lastAt.getTime(),
    );

  /* ---- what people typed ---- */
  const recent: TypedEvent[] = input.rows
    .filter((r) => TYPED.has(r.kind) && r.answer && questionById(r.questionId))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .map((r) => {
      const q = questionById(r.questionId)!;
      const m = memberOf.get(r.browserId);
      return {
        id: r.id,
        questionId: q.id,
        label: q.label,
        kind: r.kind as TypedEvent["kind"],
        how: r.how,
        answer: r.answer!,
        at: r.createdAt,
        device: r.device,
        country: r.country,
        member: m ?? null,
        acceptedSince: MISS.has(r.kind) && r.how !== "refused" && judge(q, r.answer!, added(q.id)).ok,
      };
    });

  /* ---- the rhythm, by the valley's day ---- */
  const dayKeys: string[] = [];
  for (let i = input.days - 1; i >= 0; i--) dayKeys.push(valleyDay(now - i * 86_400_000));
  const dayIndex = new Map(dayKeys.map((k, i) => [k, i]));
  const daily = dayKeys.map((day) => ({ day, arrived: 0, through: 0, joined: 0 }));
  for (const [b, rows] of byBrowser) {
    const days = new Set(rows.map((r) => valleyDay(r.createdAt)));
    for (const k of days) {
      const i = dayIndex.get(k);
      if (i !== undefined) daily[i].arrived++;
    }
    const right = rows.find((r) => r.kind === "right");
    const ri = right ? dayIndex.get(valleyDay(right.createdAt)) : undefined;
    if (ri !== undefined) daily[ri].through++;
    const m = memberOf.get(b);
    const ji = m ? dayIndex.get(valleyDay(m.createdAt)) : undefined;
    if (ji !== undefined) daily[ji].joined++;
  }

  /* ---- generations x questions ---- */
  const cells = new Map<string, { answered: number; right: number }>();
  const cohortSet = new Set<string>();
  for (const s of allShowings) {
    if (s.outcome === "open" || s.outcome === "left") continue;
    const m = memberOf.get(s.browserId);
    const c = m ? cohortOf(m) : null;
    if (!c) continue;
    cohortSet.add(c);
    const key = `${s.questionId}\u0000${c}`;
    const cell = cells.get(key) ?? { answered: 0, right: 0 };
    cell.answered++;
    if (s.outcome === "firstGo" || s.outcome === "afterMiss") cell.right++;
    cells.set(key, cell);
  }
  /* Decades oldest first, teachers last: the order a reader looks along. */
  const cohorts = [...cohortSet].sort((a, b) =>
    a === "Teachers" ? 1 : b === "Teachers" ? -1 : a.localeCompare(b),
  );
  const generations = {
    cohorts,
    rows: questions.map((q) => ({
      questionId: q.id,
      label: q.label,
      cells: cohorts.map((c) => ({ cohort: c, ...(cells.get(`${q.id}\u0000${c}`) ?? { answered: 0, right: 0 }) })),
    })),
  };

  const matching = { exact: 0, typo: 0, mention: 0, added: 0 };
  for (const r of input.rows) {
    if (r.kind === "right" && r.how && r.how in matching) matching[r.how as keyof typeof matching]++;
  }

  return {
    door: {
      arrived: byBrowser.size,
      tried,
      through: through.size,
      joined: memberOf.size,
      firstGo,
      medianSecondsToThrough: median(toThrough),
      hereNow,
    },
    byDevice: [...devices.entries()]
      .map(([device, v]) => ({ device, ...v }))
      .sort((a, b) => b.arrived - a.arrived),
    questions,
    candidates,
    turnedAway: [...allCandidates].sort(
      (a, b) => b.people - a.people || b.lastAt.getTime() - a.lastAt.getTime(),
    ),
    stuck: stuck.sort((a, b) => b.lastAt.getTime() - a.lastAt.getTime()),
    recent,
    daily,
    generations,
    matching,
    events: input.rows.length,
  };
}

/* ---------------------------------------------------------------- *
 *  One question's own page.
 * ---------------------------------------------------------------- */

export type QuestionDetail = {
  stat: QuestionStat;
  /** Every entry the gate accepts for this question, and how often it is what got someone in. */
  accepted: { entry: string; source: "bank" | "mention" | "added"; hits: number; addedId?: string; typed?: string }[];
  /** Right answers the one-letter rule let in, as typed. */
  typoIns: { typed: string; matched: string; count: number }[];
  /** Every answer turned away, grouped, most people first. */
  turnedAway: Candidate[];
  answers: TypedEvent[];
  generations: GateReport["generations"]["rows"][number] & { cohorts: string[] };
};

export function questionDetail(
  report: GateReport,
  rows: TriviaRow[],
  addedRows: AddedAnswer[],
  questionId: string,
): QuestionDetail | null {
  const q = questionById(questionId);
  const stat = report.questions.find((s) => s.id === questionId);
  if (!q || !stat) return null;
  const mine = rows.filter((r) => r.questionId === q.id && r.kind === "right");
  const hits = (entry: string, how?: string) =>
    mine.filter((r) => r.matched === entry && (how === undefined || r.how === how)).length;

  const bank = [...new Set(q.answers.map(normalize))].map((entry) => ({
    entry,
    source: "bank" as const,
    hits: hits(entry, "exact") + hits(entry, "typo"),
  }));
  const mention = [...new Set((q.contains ?? []).map(normalize))].map((entry) => ({
    entry,
    source: "mention" as const,
    hits: hits(entry, "mention"),
  }));
  const fromRoom = addedRows
    .filter((a) => a.questionId === q.id)
    .map((a) => ({ entry: a.answer, source: "added" as const, hits: hits(a.answer, "added"), addedId: a.id, typed: a.typed }));

  const typo = new Map<string, { typed: string; matched: string; count: number }>();
  for (const r of mine) {
    if (r.how !== "typo" || !r.answer) continue;
    const key = normalize(r.answer);
    const t = typo.get(key) ?? { typed: r.answer.trim(), matched: r.matched ?? "", count: 0 };
    t.count++;
    typo.set(key, t);
  }

  const row = report.generations.rows.find((g) => g.questionId === q.id)!;
  return {
    stat,
    accepted: [...bank, ...mention, ...fromRoom],
    typoIns: [...typo.values()].sort((a, b) => b.count - a.count),
    turnedAway: report.turnedAway.filter((c) => c.questionId === q.id),
    answers: report.recent.filter((e) => e.questionId === q.id),
    generations: { ...row, cohorts: report.generations.cohorts },
  };
}
