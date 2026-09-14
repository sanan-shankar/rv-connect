/* ------------------------------------------------------------------ *
 *  The cases every drawing of a sealed Edition is judged against.
 *
 *  The dates come from the real clock (`capsuleOpensAt`), not from
 *  taste: sealed by the 07:30 IST cron on 14 September 2026, it opens at
 *  07:00 IST on 14 September 2027. Each case moves "today" instead.
 *
 *  The names are made up. The birds are the real ones.
 * ------------------------------------------------------------------ */

import { capsuleOpensAt, valleyDaysLeft } from "@/lib/catchups-core";
import { CATCHUP_PICTURES } from "@/lib/catchup-pictures";

export const SEALED_AT = new Date("2026-09-14T02:00:00Z");
export const OPENS_AT = capsuleOpensAt(SEALED_AT);

export type Person = { id: string; name: string };

const NAMES = [
  "Meera Raghavan",
  "Arjun Iyer",
  "Leela Menon",
  "Joseph Thomas",
  "Priya Natarajan",
  "Kabir Sethi",
  "Ananya Rao",
  "Rohan Kulkarni",
  "Tara Fernandes",
  "Vikram Hegde",
  "Nandini Pillai",
];

const person = (name: string): Person => ({ id: `capsule-${name.toLowerCase().replace(/\s+/g, "-")}`, name });

const ELEVEN = NAMES.map(person);
const BATCH = Array.from({ length: 34 }, (_, i) => person(`${NAMES[i % NAMES.length]} ${i}`));

export type CaseKey = "year" | "tomorrow" | "today" | "opened" | "empty" | "batch" | "joined";

export type CapsuleCase = {
  key: CaseKey;
  label: string;
  catchupName: string;
  picture: { src: string; focus: string };
  /** The moment the drawing is looked at. */
  now: Date;
  writers: Person[];
  /** False for somebody who joined after it sealed. */
  viewerWrote: boolean;
  /** Anything this case says that the others do not. */
  note: string | null;
};

const base = {
  catchupName: "In the loop",
  picture: CATCHUP_PICTURES[1],
  writers: ELEVEN,
  viewerWrote: true,
  note: null,
};

export const CASES: CapsuleCase[] = [
  { ...base, key: "year", label: "364 days left", now: new Date("2026-09-15T04:00:00Z") },
  { ...base, key: "tomorrow", label: "1 day left", now: new Date("2027-09-13T04:00:00Z") },
  { ...base, key: "today", label: "Opens this morning", now: new Date("2027-09-14T00:30:00Z") },
  { ...base, key: "opened", label: "Opened", now: new Date("2027-09-14T03:00:00Z") },
  {
    ...base,
    key: "empty",
    label: "Nobody wrote in",
    now: new Date("2027-02-02T04:00:00Z"),
    writers: [],
    viewerWrote: false,
    note: "Nobody wrote in this one. It still opens, and there is nothing inside.",
  },
  {
    ...base,
    key: "batch",
    label: "A batch",
    catchupName: "Batch of 2023",
    picture: CATCHUP_PICTURES[2],
    now: new Date("2027-04-20T04:00:00Z"),
    writers: BATCH,
  },
  {
    ...base,
    key: "joined",
    label: "Joined after",
    now: new Date("2027-06-01T04:00:00Z"),
    viewerWrote: false,
    note: "Written before you joined. It opens for you too.",
  },
];

export function caseOf(key: string | null): CapsuleCase {
  return CASES.find((c) => c.key === key) ?? CASES[0];
}

/** How far through its year the capsule is, 0 to 1. */
export function progressOf(c: CapsuleCase): number {
  const span = OPENS_AT.getTime() - SEALED_AT.getTime();
  return Math.min(1, Math.max(0, (c.now.getTime() - SEALED_AT.getTime()) / span));
}

export function isOpen(c: CapsuleCase): boolean {
  return c.now.getTime() >= OPENS_AT.getTime();
}

/** The words for how long is left, counted in the valley's own days. */
export function leftWords(c: CapsuleCase): string {
  if (isOpen(c)) return "Opened this morning";
  const days = valleyDaysLeft(OPENS_AT, c.now);
  if (days === null || days === 0) return "Opens at seven this morning";
  if (days === 1) return "Opens tomorrow morning";
  return `${days} days to go`;
}

/** The Edition's own photographs, once it is open. Stand-ins from the pool. */
export const INSIDE = CATCHUP_PICTURES.map((p) => p.src);
