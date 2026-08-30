import { test } from "node:test";
import assert from "node:assert/strict";
import { captionNeedsTidying, tidyCaption } from "./caption-tidy.ts";

/* The first five cases are captions that were actually sitting in the review
   queue on 2026-08-30, which is what prompted the whole thing. */

test("a lowercase caption gets its capital", () => {
  assert.equal(tidyCaption("arts and crafts pottery section"), "Arts and crafts pottery section");
  assert.equal(tidyCaption("singing assembly"), "Singing assembly");
});

test("a caption that was already right is left exactly alone", () => {
  for (const already of [
    "Steps leading to Palm house",
    "Senior hostel boys tunnel ball relay",
    "Sports day- Long run",
    "Class 12 VS Staff tug of war",
  ]) {
    assert.equal(tidyCaption(already), already);
    assert.equal(captionNeedsTidying(already), false);
  }
});

test("a second sentence gets its capital too", () => {
  assert.equal(
    tidyCaption("morning assembly. the whole school was there"),
    "Morning assembly. The whole school was there"
  );
});

/* THE WORDS ARE NOT THE JOB. This test exists to fail if somebody later
   teaches this file to guess at meaning -- articles, spelling, tense. The
   grammar pass is a session reading the sentence, not a regex. */
test("nothing about the words themselves is changed", () => {
  assert.equal(
    tidyCaption("them boys was runing in the feild"),
    "Them boys was runing in the feild"
  );
});

test("whitespace is settled without flattening deliberate lines", () => {
  assert.equal(tidyCaption("  sports   day  "), "Sports day");
  // A list of names one to a line survives, and each line gets its capital.
  assert.equal(tidyCaption("sanan\nafya\nnaveen"), "Sanan\nAfya\nNaveen");
  assert.equal(tidyCaption("a\n\n\n\n\nb"), "A\n\nB");
  assert.equal(tidyCaption("trailing space before comma , and stop ."), "Trailing space before comma, and stop.");
});

test("the invisible zoo from a paste is removed", () => {
  assert.equal(tidyCaption("palm house​"), "Palm house");
  assert.equal(tidyCaption("﻿morning assembly"), "Morning assembly");
});

test("a lonely i becomes I, and everything else keeps its case", () => {
  assert.equal(tidyCaption("me and i in the library"), "Me and I in the library");
  assert.equal(tidyCaption("i'm not sure who this is"), "I'm not sure who this is");
  // Not inside a word, and not the one abbreviation it would ruin.
  assert.equal(tidyCaption("in india, i think"), "In india, I think");
  assert.equal(tidyCaption("the seniors, i.e. class 12"), "The seniors, i.e. Class 12");
});

/* An admin who never typed anything must not be handed a space to save. */
test("nothing is still nothing", () => {
  assert.equal(tidyCaption(""), "");
  assert.equal(tidyCaption("   \n  "), "");
  assert.equal(captionNeedsTidying(""), false);
});

test("tidying twice changes nothing the second time", () => {
  for (const raw of [
    "arts and crafts pottery section",
    "  sports   day  ",
    "sanan\nafya",
    "the seniors, i.e. class 12",
    "me and i in the library",
  ]) {
    const once = tidyCaption(raw);
    assert.equal(tidyCaption(once), once, `not idempotent: ${JSON.stringify(raw)}`);
  }
});

test("it reports honestly whether it changed anything", () => {
  assert.equal(captionNeedsTidying("singing assembly"), true);
  assert.equal(captionNeedsTidying("Singing assembly"), false);
  // Trailing whitespace alone is not worth telling anybody about.
  assert.equal(captionNeedsTidying("Singing assembly  "), false);
});
