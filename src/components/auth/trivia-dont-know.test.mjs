import assert from "node:assert/strict";
import test from "node:test";

import { saysDontKnow } from "./trivia-dont-know.ts";

/* The trivia gate moves an "I don't know" on to a fresh question rather
 * than calling it wrong (owner, 2026-10-01). The cases that matter most are
 * the second list: a hedge wrapped round a real answer must still reach the
 * server, or a right answer gets thrown away for a new question. */

test("every way of not knowing moves on", () => {
  for (const said of [
    "I don't know",
    "i dont know",
    "don't know",
    "dont know",
    "I don’t know", // the phone keyboard's curly apostrophe
    "I do not know",
    "idk",
    "IDK",
    "idkkk",
    "idk lol",
    "sorry, idk",
    "idek",
    "dunno",
    "i dunno",
    "no idea",
    "noooo idea",
    "I have no idea",
    "not sure",
    "I'm not sure",
    "honestly not sure tbh",
    "no clue",
    "not a clue",
    "I forgot",
    "can't remember",
    "I don't remember",
    "pata nahi",
    "skip",
    "pass",
    "hmm I really don't know the answer",
  ]) {
    assert.equal(saysDontKnow(said), true, said);
  }
});

test("an answer with a hedge on it is still judged", () => {
  for (const said of [
    "I don't know, maybe egg curry?",
    "egg curry I think, not sure",
    "idk banyan?",
    "not sure, cauvery",
    "tuck shop no idea",
    "idk 1990",
  ]) {
    assert.equal(saysDontKnow(said), false, said);
  }
});

test("a wrong answer or an empty box is not a don't-know", () => {
  for (const said of ["", "   ", "???", "no", "I know", "the answer", "banyan", "folk", "compass"]) {
    assert.equal(saysDontKnow(said), false, JSON.stringify(said));
  }
});
