/**
 * Who the Join button runs from.
 *
 * The owner's prank (2026-11-18): when the principal of Rishi Valley signs up,
 * the Join button at the foot of the signup form will not let itself be
 * pressed, ever. This file only answers "is it her?" from what she has typed
 * so far. The button is src/components/auth/runaway-stage.tsx (watching the
 * form) and runaway-join.tsx (the runner), and how it behaves is
 * src/lib/runaway-brain.ts.
 *
 * Her name is Anantha Jyothi (the school's own listings and the press, checked
 * 2026-11-18), and it gets written several ways: Ananta, Jyoti, Jyothy, Jothi.
 * She may also swap the two, put both in one box, or add a family name. So the
 * test is on whole WORDS after folding the spellings together, never on a
 * substring: "Anantharaman" must not count as "Anantha", nor "Jyothirmayi" as
 * "Jyothi".
 */

import { normalizeRosterName } from "./roster-rule.ts";

/** Flip to false to retire the prank. Nothing else needs to change. */
export const RUNAWAY_ENABLED = true;

/** Set in localStorage the first time the button runs from this browser, so a
 *  reload or a changed name does not let her through. Neutral on purpose. */
export const RUNAWAY_MEMORY_KEY = "rv:join-runs";

// The roster's own normaliser does case, accents and every non-letter, the
// way batch-roster names are matched. On top of that: no "h" at all
// (Anantha/Ananta, Jyothi/Jyoti), "y" read as "i" (Jyothy), and doubled
// letters single (a slipped Annantha).
const fold = (word: string) => word.replace(/h/g, "").replace(/y/g, "i").replace(/(.)\1+/g, "$1");
const words = (s: string) => normalizeRosterName(s).split(" ").filter(Boolean).map(fold);

/** One word, folded to the shape every spelling of it shares. */
export const foldName = (word: string) => words(word).join("");

const ANANTA = "ananta";
// Jyothi, Jyoti, Jyothy, Jyoty fold to "jioti"; the Tamil Jothi to "joti".
const JYOTI = ["jioti", "joti"];

function namesHer(w: string[], teacher: boolean): boolean {
  // `first` beside Jyothi as two words, or run together either way round
  // ("Ananthajyothi").
  const pairs = (first: string) =>
    (w.includes(first) && w.some((x) => JYOTI.includes(x))) ||
    w.some((x) => JYOTI.some((j) => x === first + j || x === j + first));
  // An initial for the first name, "A. Jyothi", is believed only from someone
  // who also said Teacher: on its own it could be any number of people.
  return pairs(ANANTA) || (teacher && pairs("a"));
}

export type VisitorFields = {
  firstName: string;
  lastName: string;
  email?: string;
  /** The Alumnus / Teacher answer. She will say Teacher. */
  teacher?: boolean;
};

export function isRunawayVisitor({ firstName, lastName, email = "", teacher = false }: VisitorFields): boolean {
  if (namesHer([...words(firstName), ...words(lastName)], teacher)) return true;
  const [local = "", domain = ""] = email.trim().toLowerCase().split("@");
  // The school's principal@ address, whatever she types for a name.
  if (/^principal/.test(local) && /(^|\.)rishivalley\.org$/.test(domain)) return true;
  return namesHer(words(local), teacher);
}
