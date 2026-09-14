/* ------------------------------------------------------------------ *
 *  The votes the room draws, one per case the result has to survive:
 *  two choices, six, one nobody picked, a landslide, a tie, forty on one
 *  choice, choices at the 80-character cap, and a single voter.
 *
 *  Invented names, real birds. A bird is the member's own deterministic
 *  glyph from their id, so every face here is one of the fifty that ship.
 *  Four people come from the pressure corpus because each breaks
 *  something on purpose: a 78-character name, diacritics, Devanagari,
 *  and a name of one letter.
 * ------------------------------------------------------------------ */

import { PRESSURE_FIXTURE } from "../_fixtures/pressure";

export type Person = { id: string; name: string; photoUrl: null; birdOverride: string | null };
export type Voter = { person: Person; line: string | null };
export type Choice = { id: string; text: string; voters: Voter[] };
export type VoteCase = { key: string; label: string; question: string; asker: string; choices: Choice[] };

const person = (name: string): Person => ({
  id: `vote-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
  name,
  photoUrl: null,
  birdOverride: null,
});

const POOL: Person[] = [
  "Leela Nair", "Joseph Mathew", "Meera Raghavan", "Arjun Rao", "Priya Menon", "Kavya Iyer",
  "Rohan Das", "Ananya Kulkarni", "Vikram Shetty", "Sneha Pillai", "Aditya Bose", "Tara Chandran",
  "Nikhil Varma", "Ishita Sen", "Karthik Subramaniam", "Divya Hegde", "Siddharth Joshi", "Nandini Rao",
  "Rahul Krishnan", "Aparna Nambiar", "Farhan Qureshi", "Gauri Deshpande", "Harsh Mehta", "Isha Kapoor",
  "Jai Reddy", "Kiran Bhat", "Lakshmi Srinivasan", "Manav Gill", "Neha Agarwal", "Omkar Patil",
  "Pooja Venkatesh", "Raghav Menon", "Sanjana Murthy", "Tanvi Shah", "Uday Kamath", "Varun Prakash",
  "Yamini Rajan", "Zubin Irani", "Devika Thomas", "Abhay Naidu", "Ritu Malhotra", "Samir Chatterjee",
].map(person);

/* The pressure corpus's awkward names, found by shape rather than retyped,
   so a change to that file changes this one. */
const corpus = PRESSURE_FIXTURE.catchups.flatMap((c) =>
  c.editions.flatMap((e) => e.questions.flatMap((q) => q.answers.map((a) => a.author)))
);
const fromCorpus = (starts: string): Person => {
  const found = corpus.find((p) => p.name.startsWith(starts));
  return found
    ? { id: found.id, name: found.name, photoUrl: null, birdOverride: found.birdOverride }
    : person(starts);
};
const LONG_NAME = fromCorpus("Padmanabhan");
const DIACRITICS = fromCorpus("Zoë");
const DEVANAGARI = fromCorpus("अनुराधा");
const ONE_LETTER = fromCorpus("A");

/** `n` people from the pool starting at `from`, and a line for some of them. */
function voters(from: number, n: number, lines: Record<number, string> = {}): Voter[] {
  return Array.from({ length: n }, (_, k) => ({
    person: POOL[(from + k) % POOL.length],
    line: lines[k] ?? null,
  }));
}

let seq = 0;
const choice = (text: string, who: Voter[]): Choice => ({ id: `c${(seq += 1)}`, text, voters: who });

export const CASES: VoteCase[] = [
  {
    key: "two",
    label: "Two choices",
    question: "Who believes Sanan made this website?",
    asker: "Priya Menon",
    choices: [
      choice("He made it", voters(0, 7, { 1: "Nobody else would argue about hover states for this long." })),
      choice("Someone made it for him", voters(7, 4, { 0: "Have you met Sanan?" })),
    ],
  },
  {
    key: "six",
    label: "Six choices",
    question: "Who is most likely to be famous by the next reunion?",
    asker: "Arjun Rao",
    choices: [
      choice("Leela", voters(10, 4)),
      choice("Joseph", voters(14, 3, { 2: "He has a podcast now. Nobody listens to it, but still." })),
      choice("Kavya", voters(17, 3)),
      choice("Rohan", voters(20, 2)),
      choice("Meera", [{ person: DIACRITICS, line: null }]),
      choice("Nobody, we peaked at school", [{ person: DEVANAGARI, line: "Said with love." }]),
    ],
  },
  {
    key: "nobody",
    label: "One nobody picked",
    question: "Where should the next reunion be?",
    asker: "Leela Nair",
    choices: [
      choice("Back in the valley", voters(0, 6, { 3: "Where else." })),
      choice("Bangalore", voters(6, 3)),
      choice("Goa", []),
    ],
  },
  {
    key: "landslide",
    label: "A landslide",
    question: "Was the dining hall food actually good?",
    asker: "Joseph Mathew",
    choices: [
      choice("Yes, and I still miss the curd rice", voters(3, 17, { 5: "The Sunday payasam alone." })),
      choice("No", voters(20, 1, { 0: "Someone has to say it." })),
    ],
  },
  {
    key: "tie",
    label: "A tie",
    question: "Rest hour: did you actually sleep?",
    asker: "Meera Raghavan",
    choices: [
      choice("Every single day", voters(8, 5)),
      choice("Never, not once", voters(13, 5, { 1: "I read under the sheet with a torch." })),
    ],
  },
  {
    key: "forty",
    label: "Forty on one",
    question: "Were you at the reunion in December?",
    asker: "Kavya Iyer",
    choices: [
      choice("I was there", voters(0, 40, { 12: "Best three days of the year." })),
      choice("I missed it", voters(40, 2, { 0: "Next time, promise." })),
    ],
  },
  {
    key: "long",
    label: "Long choices",
    question: "Who would last longest if the trek bus broke down on the ghat road?",
    asker: "Rohan Das",
    choices: [
      choice(
        "Whoever packed the Parle-G, the torch and the spare socks nobody else brought",
        [{ person: LONG_NAME, line: null }, ...voters(22, 2)]
      ),
      choice("The one who talked to the driver in Telugu and got us a lift to Madanapalle", voters(25, 2)),
      choice("Honestly nobody, we would all still be arguing about which way the road goes", [
        { person: ONE_LETTER, line: "This one." },
      ]),
    ],
  },
  {
    key: "one",
    label: "One voter",
    question: "Should we do a vote every Edition?",
    asker: "Tara Chandran",
    choices: [
      choice("Yes", voters(11, 1, { 0: "Only if more than one of us votes." })),
      choice("No", []),
    ],
  },
];

export function caseOf(key: string | null): VoteCase {
  return CASES.find((c) => c.key === key) ?? CASES[0];
}
