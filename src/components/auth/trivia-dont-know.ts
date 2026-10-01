/* ------------------------------------------------------------------ *
 *  "I don't know" at the trivia gate.
 *
 *  The owner, 2026-10-01: "if anyone answers I don't know or don't know
 *  or idk or anything of that variant instead of rejecting just
 *  automatically move onto the next question." Someone who says they do
 *  not know has not guessed wrong, so "Not quite. Have another go." was
 *  the wrong reply: they get what the swap arrow gives, a different
 *  question, and nothing else.
 *
 *  Judged in the browser, not by checkTrivia: the swap is free and
 *  unmetered, and a server round trip would spend one of the eight
 *  attempts the gate allows in ten minutes on a person who was only
 *  asking to move on. Nothing here is secret; saying "idk" earns no pass.
 *
 *  THE RULE IS "NOTHING BUT NOT KNOWING". Every word must come from the
 *  vocabulary below, and together they must say one of the CORE things.
 *  So "idk lol", "sorry, I don't know" and "noooo idea" move on, while
 *  "I don't know, maybe egg curry?" goes to the server, because it is an
 *  answer, and a right one. Any word that might be a guess sends the whole
 *  thing to be judged: a hedge is not a pass.
 * ------------------------------------------------------------------ */

/** Said together, these mean "I don't know". Matched with the spaces gone. */
const CORE = [
  "idk", "idek", "dunno", "dontknow", "donotknow", "didntknow",
  "noidea", "notsure", "unsure", "noclue", "notaclue",
  "forgot", "forgotten", "dontremember", "cantremember", "cannotremember",
  "patanahi", "nahipata", "skip", "pass",
];

/** Every word a "don't know" is made of, filler included. */
const VOCAB = new Set(
  [
    ...CORE,
    "i", "im", "ive", "am", "do", "dont", "didnt", "not", "no", "know",
    "idea", "a", "clue", "sure", "have", "cant", "cannot", "remember",
    "really", "honestly", "sorry", "um", "uh", "hmm", "lol", "tbh", "haha",
    "the", "this", "one", "answer", "question", "pata", "nahi",
  ].map(squash),
);
const CORE_SQUASHED = CORE.map(squash);

/** "noooo" and "no", "idkkk" and "idk", are the same word typed with feeling. */
function squash(word: string): string {
  return word.replace(/(.)\1+/g, "$1");
}

/** True when the answer says only that its writer does not know. */
export function saysDontKnow(answer: string): boolean {
  const words = answer
    .toLowerCase()
    // the phone keyboard's curly apostrophe as well as the straight one
    .replace(/['’]/g, "")
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .map(squash);
  if (words.length === 0 || !words.every((w) => VOCAB.has(w))) return false;
  const said = words.join("");
  return CORE_SQUASHED.some((c) => said.includes(c));
}
