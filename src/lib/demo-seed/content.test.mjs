import assert from "node:assert/strict";
import test from "node:test";

import { ALL_DEMO_PEOPLE } from "./people.ts";
import {
  CATCHUP_KEEPER,
  CATCHUP_MEMBERS,
  CATCHUP_ROUND_1,
  CATCHUP_ROUND_2,
  DEMO_LETTERS,
  DEMO_PHOTOS,
  DEMO_POSTS,
} from "./content.ts";
import { CITY_COORDS } from "../city-coords.ts";

/* ------------------------------------------------------------------ *
 *  The seed is ~1,500 rows of hand-written cross-references: a like
 *  names a person by slug, an answer names a prompt, a prompt names a
 *  Catch-up member. None of that is type-checked, because they are all
 *  just strings, and every mistake in it fails the same way: the seed
 *  runs for twenty seconds and then dies on a foreign key or a unique
 *  constraint, against a half-written database.
 *
 *  These tests are that failure moved to the front, where it costs a
 *  second instead of a round trip to Supabase. They caught a duplicate
 *  comment-like the first time they were run.
 * ------------------------------------------------------------------ */

const SLUGS = new Set(ALL_DEMO_PEOPLE.map((p) => p.slug));
const ALL_POSTS = [...DEMO_POSTS, ...DEMO_LETTERS];

/** Every slug mentioned anywhere, with a label for the failure message. */
function* everyReference() {
  for (const p of ALL_POSTS) {
    yield [p.author, `post "${p.slug}" author`];
    for (const s of p.likes ?? []) yield [s, `post "${p.slug}" like`];
    for (const s of p.bookmarks ?? []) yield [s, `post "${p.slug}" bookmark`];
    for (const [i, c] of (p.comments ?? []).entries()) {
      yield [c.author, `post "${p.slug}" comment ${i} author`];
      for (const s of c.likes ?? []) yield [s, `post "${p.slug}" comment ${i} like`];
    }
    for (const voters of Object.values(p.poll?.votes ?? {})) {
      for (const s of voters) yield [s, `poll "${p.slug}" vote`];
    }
  }
  for (const ph of DEMO_PHOTOS) {
    yield [ph.uploader, `photo "${ph.slug}" uploader`];
    for (const s of ph.loves) yield [s, `photo "${ph.slug}" love`];
  }
  for (const s of CATCHUP_MEMBERS) yield [s, "Catch-up member"];
  yield [CATCHUP_KEEPER, "Catch-up keeper"];
  for (const [n, round] of [
    [1, CATCHUP_ROUND_1],
    [2, CATCHUP_ROUND_2],
  ]) {
    for (const [i, pr] of round.prompts.entries()) {
      yield [pr.askedBy, `round ${n} prompt ${i} asker`];
      for (const [j, e] of pr.entries.entries()) {
        yield [e.author, `round ${n} prompt ${i} entry ${j} author`];
        for (const s of e.loves ?? []) yield [s, `round ${n} prompt ${i} entry ${j} love`];
      }
    }
  }
}

/** Values appearing more than once in a list. */
const duplicates = (xs) => [...new Set(xs.filter((v, i) => xs.indexOf(v) !== i))];

test("every person referenced in the content actually exists", () => {
  const unknown = [];
  for (const [slug, where] of everyReference()) {
    if (!SLUGS.has(slug)) unknown.push(`${where}: no such person "${slug}"`);
  }
  assert.deepEqual(unknown, [], `\n  ${unknown.join("\n  ")}\n`);
});

test("nobody likes the same thing twice", () => {
  // Like, CommentLike, PhotoLove and CatchupEntryLove are all @@unique on
  // (userId, targetId). A repeat is a crashed seed, not a bigger number.
  const bad = [];
  for (const p of ALL_POSTS) {
    for (const d of duplicates(p.likes ?? [])) bad.push(`post "${p.slug}" liked twice by ${d}`);
    for (const [i, c] of (p.comments ?? []).entries()) {
      for (const d of duplicates(c.likes ?? []))
        bad.push(`post "${p.slug}" comment ${i} liked twice by ${d}`);
    }
  }
  for (const ph of DEMO_PHOTOS) {
    for (const d of duplicates(ph.loves)) bad.push(`photo "${ph.slug}" loved twice by ${d}`);
  }
  for (const [n, round] of [
    [1, CATCHUP_ROUND_1],
    [2, CATCHUP_ROUND_2],
  ]) {
    for (const [i, pr] of round.prompts.entries()) {
      for (const [j, e] of pr.entries.entries()) {
        for (const d of duplicates(e.loves ?? []))
          bad.push(`round ${n} prompt ${i} entry ${j} loved twice by ${d}`);
      }
    }
  }
  assert.deepEqual(bad, [], `\n  ${bad.join("\n  ")}\n`);
});

test("nobody votes twice in one poll, and every vote is for a real option", () => {
  // PollVote is @@unique on (userId, postId): one vote per person per poll.
  const bad = [];
  for (const p of ALL_POSTS) {
    if (!p.poll) continue;
    const options = new Set(p.poll.options);
    for (const key of Object.keys(p.poll.votes)) {
      if (!options.has(key)) bad.push(`poll "${p.slug}": "${key}" is not one of its options`);
    }
    for (const d of duplicates(Object.values(p.poll.votes).flat())) {
      bad.push(`poll "${p.slug}": ${d} voted more than once`);
    }
  }
  assert.deepEqual(bad, [], `\n  ${bad.join("\n  ")}\n`);
});

test("nobody answers the same Catch-up question twice", () => {
  // CatchupEntry is @@unique on (promptId, authorId).
  const bad = [];
  for (const [n, round] of [
    [1, CATCHUP_ROUND_1],
    [2, CATCHUP_ROUND_2],
  ]) {
    for (const [i, pr] of round.prompts.entries()) {
      for (const d of duplicates(pr.entries.map((e) => e.author))) {
        bad.push(`round ${n} prompt ${i}: ${d} answered twice`);
      }
    }
  }
  assert.deepEqual(bad, [], `\n  ${bad.join("\n  ")}\n`);
});

test("only Catch-up members ask or answer its questions", () => {
  // Not a database constraint, but it would look wrong: a stranger's name
  // appearing in a private group's newsletter.
  const members = new Set(CATCHUP_MEMBERS);
  const bad = [];
  for (const [n, round] of [
    [1, CATCHUP_ROUND_1],
    [2, CATCHUP_ROUND_2],
  ]) {
    for (const [i, pr] of round.prompts.entries()) {
      if (!members.has(pr.askedBy)) bad.push(`round ${n} prompt ${i}: asked by non-member ${pr.askedBy}`);
      for (const e of pr.entries) {
        if (!members.has(e.author)) bad.push(`round ${n} prompt ${i}: answered by non-member ${e.author}`);
      }
    }
  }
  assert.deepEqual(bad, [], `\n  ${bad.join("\n  ")}\n`);
});

test("every seeded city can be placed on the map", () => {
  // A city the gazetteer cannot resolve is a person missing from the
  // directory map, which is one of the surfaces most worth showing off.
  const missing = [];
  for (const p of ALL_DEMO_PEOPLE) {
    for (const city of [p.city, p.secondCity].filter(Boolean)) {
      if (!CITY_COORDS[city]) missing.push(`${p.name}: "${city}" has no coordinates`);
    }
  }
  assert.deepEqual(missing, [], `\n  ${missing.join("\n  ")}\n`);
});

test("letters have titles and posts do not", () => {
  for (const l of DEMO_LETTERS) {
    assert.equal(l.kind, "letter", `${l.slug} should be kind "letter"`);
    assert.ok(l.title, `letter ${l.slug} needs a title`);
  }
  for (const p of DEMO_POSTS) {
    assert.ok(!p.title, `feed post ${p.slug} should not have a title`);
  }
});

test("no em dashes anywhere in the seeded copy", () => {
  // House rule, and this is the largest block of user-facing prose in the
  // repository, so it is the easiest place for one to slip in.
  const offenders = [];
  const check = (text, where) => {
    if (typeof text === "string" && text.includes("—")) offenders.push(where);
  };
  for (const p of ALL_POSTS) {
    check(p.content, `post "${p.slug}"`);
    check(p.title, `title of "${p.slug}"`);
    for (const [i, c] of (p.comments ?? []).entries()) check(c.text, `post "${p.slug}" comment ${i}`);
    for (const o of p.poll?.options ?? []) check(o, `poll option in "${p.slug}"`);
  }
  for (const ph of DEMO_PHOTOS) check(ph.caption, `photo "${ph.slug}" caption`);
  for (const person of ALL_DEMO_PEOPLE) {
    check(person.bio, `${person.name} bio`);
    check(person.about, `${person.name} about`);
  }
  for (const round of [CATCHUP_ROUND_1, CATCHUP_ROUND_2]) {
    for (const pr of round.prompts) {
      check(pr.text, `prompt "${pr.text.slice(0, 30)}"`);
      for (const e of pr.entries) check(e.body, `an answer by ${e.author}`);
    }
  }
  assert.deepEqual(offenders, [], `\n  ${offenders.join("\n  ")}\n`);
});

test("the demo has enough content to look lived in", () => {
  // Guards against someone trimming the seed to a handful of rows and
  // shipping a showcase that looks like an empty room.
  assert.ok(ALL_DEMO_PEOPLE.length >= 30, "want at least 30 people in the directory");
  assert.ok(ALL_POSTS.length >= 20, "want at least 20 posts and letters");
  assert.ok(DEMO_LETTERS.length >= 3, "want at least 3 letters");
  assert.ok(CATCHUP_MEMBERS.length >= 6, "want a Catch-up that feels populated");

  // The directory's decade filters need range to be worth using.
  const years = ALL_DEMO_PEOPLE.map((p) => p.batchYear).filter(Boolean);
  assert.ok(Math.min(...years) < 1980, "want alumni from before 1980");
  assert.ok(Math.max(...years) > 2020, "want alumni from after 2020");

  // And the Teachers tab should not be empty.
  const faculty = ALL_DEMO_PEOPLE.filter(
    (p) => p.accountType === "teacher" || p.accountType === "ex_teacher",
  );
  assert.ok(faculty.length >= 3, "want at least 3 faculty");
});
