/* ------------------------------------------------------------------ *
 *  The trivia gate's question bank, and the one judge of an answer.
 *
 *  Moved out of trivia-actions.ts on 2026-10-23. A "use server" file may
 *  export only async functions, and two other places now need to judge an
 *  answer exactly the way the gate does: the recorder, which writes down
 *  WHICH rule let an answer in, and the admin room, which re-judges every
 *  answer the gate ever turned away against today's rules so that one
 *  accepted since stops being listed as worth accepting.
 *
 *  THE ANSWERS MUST NEVER REACH A BROWSER. This file is imported by server
 *  code only, and trivia-log-rule.test.mjs fails if a "use client" file, or
 *  anything a client file imports, ever pulls it in. (It cannot carry
 *  `import "server-only"`: the unit tests import it under plain Node.)
 *
 *  No "@/..." imports, for the same reason: Node resolves this file
 *  directly in the tests.
 * ------------------------------------------------------------------ */

export type Question = {
  id: string;
  /**
   * What the question is ABOUT, for the admin room's lists, where the whole
   * question is too long to repeat on every row. Never the answer.
   */
  label: string;
  question: string;
  answers: string[];
  /**
   * Answers that are a sentence rather than a name: accepted when the guess
   * MENTIONS one of these, anywhere in it. Only the dinner question needs it.
   */
  contains?: string[];
  /**
   * Guesses turned away even when one edit from an accepted answer: the word
   * the question itself hands over. Only the folk dancing question needs it.
   */
  never?: string[];
};

/**
 * Accepted answers (widened 2026-08-04, owner). Three rules do most of the work
 * so these lists stay short and readable:
 *
 *   1. `normalize()` below strips spaces, punctuation, a leading "the" and a
 *      trailing "house"/"tree"/"valley", so one entry covers "BBT", "b.b.t.",
 *      "The Big Banyan Tree" and "cauvery house" alike. Entries here are
 *      already in that stripped form.
 *   2. `NEAR_MISS_MIN_LENGTH` lets an entry of 5+ characters match on a
 *      single typo (see `withinOneEdit`), which is what actually covers "any
 *      spelling variations" without anyone predicting every one of them:
 *      kavery, kaveree, cauvary and friends all land within one edit of a
 *      spelling below. Initialisms stay exact-match, because at three
 *      characters one edit is most of the word.
 *   3. A question whose answer is a plate of food rather than a name carries
 *      a `contains` list instead. "Egg curry and tomato rice", "just paneer"
 *      and "tomato rice I think" are the same answer, and enumerating the
 *      phrasings people use for a menu is a game nobody wins.
 *
 * These are people who went to the school. The gate is there to stop a
 * stranger with a search engine, not to mark a spelling test.
 */
export const TRIVIA_QUESTIONS: Question[] = [
  {
    id: "banyan",
    label: "The tree",
    question: "What tree was the school built around?",
    answers: [
      // the plain answer and its common spellings
      "banyan",
      "banian",
      "banyon",
      "bunyan",
      // what people who were actually there call it
      "bigbanyan",
      "bbt",
      "kbt",
      "krishnamurtibanyan",
      "krishnamurthibanyan",
      "jkbanyan",
    ],
  },
  {
    id: "cauvery",
    label: "Next to Krishna",
    question: "What house is next to Krishna?",
    answers: [
      // every spelling the owner listed, plus the ones a single edit away
      // from them is not guaranteed to reach (c/k and v/b both swap here)
      "cauvery",
      "cauveri",
      "caveri",
      "cavery",
      "kaveri",
      "kavery",
      "kaveree",
      "kauveri",
      "kauvery",
      "kaberi",
      "kabery",
      "caberi",
      "cabery",
    ],
  },
  {
    id: "caverock",
    label: "From the games field",
    question: "Which hill is most clearly visible from the games field?",
    answers: [
      "caverock",
      // said in full often enough to earn its own entry: normalize() takes a
      // trailing "house", "tree" and "valley" off, but not "hill"
      "caverockhill",
    ],
  },
  {
    id: "auditorium",
    label: "Singing assemblies",
    question: "In which building are singing assemblies held?",
    answers: [
      "auditorium",
      "seniorauditorium",
      // what it is called out loud. "audi" is four characters, so it has to
      // land exactly; the longer entries carry the one-edit allowance
      "senioraudi",
      "audi",
    ],
  },
  {
    id: "thursdaydinner",
    label: "Thursday dinner",
    question: "What is served for dinner on Thursdays?",
    // A menu, so it is answered by mention rather than by name (rule 3 above).
    // The one-edit allowance does not reach inside a sentence, which is why
    // the likelier misspellings are spelt out here instead of inferred.
    answers: [],
    contains: [
      "egg",
      "paneer",
      "paner",
      "panir",
      "panner",
      "tomatorice",
      "tomatoerice",
      "tomoatorice",
      "tamatorice",
    ],
  },
  {
    id: "tuckshop",
    label: "Chocolatey goodness",
    question: "Which building has your fortnightly dose of chocolatey goodness?",
    answers: ["tuckshop", "grubtuck", "tuck"],
  },
  {
    id: "raavi",
    label: "Golden, Silver, Neem",
    question: "Complete the list: Golden, Silver, Neem and _____?",
    // "Raavi valley" arrives here as "raavi", the suffix stripped. "ravi" is
    // four characters, so it is listed rather than left to the one-edit rule.
    answers: ["raavi", "ravi"],
  },
  {
    id: "roundhut",
    label: "Which hut",
    question: "Which hut was round?",
    answers: ["roundhut", "round"],
  },
  {
    id: "folkie",
    label: "Folk dancing",
    question: "What is folk dancing called here?",
    // "foki" and "fokee" are each one edit from "fokie", so they land on their
    // own. "foky" is four characters, so it is listed rather than inferred.
    // "folky" is one edit from "folk", the word the question itself hands
    // over, which is why "folk" is turned away by name.
    answers: ["folkie", "fokie", "folky", "foky"],
    never: ["folk"],
  },
  {
    id: "asthachal",
    label: "Up the hill",
    question:
      "During which activity do you walk up a hill and sit quietly on a rock while the mosquitoes drain you?",
    // "asta" and "aastha" are one edit from "astha", but "ashta" is a
    // transposition, which withinOneEdit counts as two -- hence both spellings
    // of each length.
    answers: ["asthachal", "ashtachal", "astha", "ashta"],
  },
];

/** Below this length a one-edit allowance is most of the word, so don't. */
export const NEAR_MISS_MIN_LENGTH = 5;

/**
 * Reduce an answer to just its letters and digits, so spacing, capitalisation
 * and punctuation can never be the reason someone is turned away: "B.B.T.",
 * "b b t" and "bbt" all arrive here as the same three characters. A leading
 * "the" and a trailing "house"/"tree"/"valley" come off too, because "the
 * banyan tree", "cauvery house" and "Raavi valley" are how people naturally
 * answer these questions.
 */
export function normalize(s: string): string {
  let out = s.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (out.startsWith("the")) out = out.slice(3);
  // Only strip the suffix when something is left in front of it, so a bare
  // "tree" stays "tree" (and stays wrong) instead of collapsing to "".
  for (const suffix of ["house", "tree", "valley"]) {
    if (out.length > suffix.length && out.endsWith(suffix)) {
      out = out.slice(0, -suffix.length);
      break;
    }
  }
  return out;
}

/**
 * True when `a` and `b` are at most one insertion, deletion or substitution
 * apart. Written as an early-exit walk rather than a full edit-distance matrix
 * because we only ever ask about a distance of one: scan together, and on the
 * first disagreement try the three single-edit repairs and require the rest to
 * match exactly.
 */
export function withinOneEdit(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  if (i === a.length && i === b.length) return true; // identical
  const restA = a.slice(i);
  const restB = b.slice(i);
  return (
    restA.slice(1) === restB.slice(1) || // substitution
    restA.slice(1) === restB || // deletion from a
    restA === restB.slice(1) // insertion into a
  );
}

/** Which rule let an answer in, or why it was turned away by name. */
export type JudgeHow = "exact" | "typo" | "mention" | "added" | "refused";

export type Verdict = {
  ok: boolean;
  /** Null for an ordinary wrong answer. */
  how: JudgeHow | null;
  /** The accepted entry it matched, in its normalised form. */
  matched: string | null;
};

/**
 * Judge one answer to one question.
 *
 * `added` is the list accepted from the admin room (`TriviaAnswer`), already
 * normalised. Those match EXACTLY and never on a single typo: a panel entry is
 * one specific thing somebody typed, not a spelling family, and letting the
 * one-edit rule widen it would accept words nobody has ever looked at.
 *
 * Order matters only for what `how` reports. The bank's own exact match is
 * tested first so a plain right answer always reads "exact", then the panel's,
 * then the one-letter allowance, then a mention for the menu question.
 */
export function judge(q: Question, answer: string, added: readonly string[] = []): Verdict {
  const guess = normalize(answer);
  if (q.never?.some((n) => normalize(n) === guess)) {
    return { ok: false, how: "refused", matched: null };
  }
  const named = q.answers.map(normalize);
  const exact = named.find((a) => a === guess);
  if (exact) return { ok: true, how: "exact", matched: exact };
  if (guess && added.includes(guess)) return { ok: true, how: "added", matched: guess };
  const typo = named.find((a) => a.length >= NEAR_MISS_MIN_LENGTH && withinOneEdit(a, guess));
  if (typo) return { ok: true, how: "typo", matched: typo };
  // A `contains` question is answered in a sentence, so it passes the moment
  // the guess mentions one of the things on the plate. Behind the `never`
  // check, unlike the inline judge this replaced, which let a mention through
  // a refusal. No question has both lists today, so nothing changed; a
  // question that ever does gets the stricter reading.
  const mention = q.contains?.map(normalize).find((c) => guess.includes(c));
  if (mention) return { ok: true, how: "mention", matched: mention };
  return { ok: false, how: null, matched: null };
}

export function questionById(id: string): Question | undefined {
  return TRIVIA_QUESTIONS.find((q) => q.id === id);
}
