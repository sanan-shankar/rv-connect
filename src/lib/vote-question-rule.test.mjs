import assert from "node:assert/strict";
import test from "node:test";
import { resolve } from "node:path";

import { read, decomment, walk, ROOT } from "./test-kit.mjs";
import {
  VOTE_CATEGORY,
  VOTE_MIN_CHOICES,
  VOTE_MAX_CHOICES,
  VOTE_CHOICE_MAX,
  decideVoteChoices,
  decideVoteAnswer,
  voteResult,
} from "./vote-question-rule.ts";

/* ------------------------------------------------------------------ *
 *  A question the group votes on (Catch-ups rework, phase 13), written
 *  down as what each rule refuses. His answer 37 (2026-09-14): whoever
 *  writes the question writes two to six choices, and members pick one
 *  and cannot add their own.
 * ------------------------------------------------------------------ */

test("two to six choices, eighty characters each, his numbers", () => {
  assert.equal(VOTE_MIN_CHOICES, 2);
  assert.equal(VOTE_MAX_CHOICES, 6);
  assert.equal(VOTE_CHOICE_MAX, 80);
});

test("the vote category is the same string in the shared vocabulary", () => {
  const src = decomment(read("src/lib/catchups-types.ts"));
  const list = src.slice(src.indexOf("export const PROMPT_CATEGORIES"), src.indexOf("] as const"));
  assert.match(list, new RegExp(`"${VOTE_CATEGORY}"`), "PROMPT_CATEGORIES does not accept a vote");
  assert.match(src, /category === "vote"\) return "vote"/, "promptKind does not return vote for a vote");
  assert.match(read("scripts/dev/export-catchups.mjs"), /category === "vote"/, "the export mislabels a vote's kind");
});

test("choices: a vote needs two to six", () => {
  assert.equal(decideVoteChoices("vote", ["Yes"]).ok, false);
  assert.equal(decideVoteChoices("vote", []).ok, false);
  assert.equal(decideVoteChoices("vote", undefined).ok, false, "a vote with no choices was accepted");
  assert.deepEqual(decideVoteChoices("vote", ["Yes", "No"]), { ok: true, choices: ["Yes", "No"] });
  const six = ["a", "b", "c", "d", "e", "f"];
  assert.equal(decideVoteChoices("vote", six).ok, true);
  assert.equal(decideVoteChoices("vote", [...six, "g"]).ok, false, "a seventh choice was accepted");
});

test("choices: blank rows are spare fields, not choices", () => {
  assert.deepEqual(decideVoteChoices("vote", ["  Yes ", "", "No", "   "]), { ok: true, choices: ["Yes", "No"] });
  assert.equal(decideVoteChoices("vote", ["Yes", "", "  "]).ok, false, "one real choice and two blanks passed");
  // A payload stuffed with blanks is refused before it is counted.
  assert.equal(decideVoteChoices("vote", ["Yes", "No", ...Array(20).fill("")]).ok, false);
});

test("choices: the text cap, and no choice twice", () => {
  const long = "x".repeat(VOTE_CHOICE_MAX);
  assert.equal(decideVoteChoices("vote", [long, "No"]).ok, true, "exactly eighty was refused");
  const over = decideVoteChoices("vote", [`${long}y`, "No"]);
  assert.equal(over.ok, false);
  assert.match(over.error, /80 characters/);
  const twice = decideVoteChoices("vote", ["Yes", "yes "]);
  assert.equal(twice.ok, false);
  assert.match(twice.error, /same/);
});

test("choices: only a vote has them", () => {
  for (const category of [null, undefined, "right-now", "photo-wall", "songs"]) {
    assert.deepEqual(decideVoteChoices(category, undefined), { ok: true, choices: [] });
    assert.deepEqual(decideVoteChoices(category, ["", " "]), { ok: true, choices: [] });
    assert.equal(decideVoteChoices(category, ["Yes", "No"]).ok, false, `${category} took choices`);
  }
  assert.equal(decideVoteChoices("vote", "Yes,No").ok, false, "a string was read as a list");
  assert.equal(decideVoteChoices("vote", ["Yes", 2]).ok, false);
});

const answer = (over = {}) => ({
  isVote: true,
  pollOptionId: "clchoice0000000000000000a",
  sendsImages: false,
  sendsRecording: false,
  sendsSong: false,
  ...over,
});

test("a vote always says what it picked, or that it takes the vote back", () => {
  assert.deepEqual(decideVoteAnswer(answer()), { ok: true, pick: "clchoice0000000000000000a" });
  assert.deepEqual(decideVoteAnswer(answer({ pollOptionId: null })), { ok: true, pick: null });
  const silent = decideVoteAnswer(answer({ pollOptionId: undefined }));
  assert.equal(silent.ok, false, "a line was writable onto a vote nobody cast");
  for (const bad of ["", 42, {}, "x".repeat(65)]) {
    assert.equal(decideVoteAnswer(answer({ pollOptionId: bad })).ok, false, `${String(bad)} accepted`);
  }
});

test("a vote carries a pick and a line, nothing else", () => {
  for (const key of ["sendsImages", "sendsRecording", "sendsSong"]) {
    assert.equal(decideVoteAnswer(answer({ [key]: true })).ok, false, `${key} rode along on a vote`);
  }
});

test("a question that is not a vote takes no pick at all", () => {
  const text = { isVote: false, sendsImages: true, sendsRecording: false, sendsSong: false };
  assert.deepEqual(decideVoteAnswer({ ...text, pollOptionId: undefined }), { ok: true, pick: undefined });
  assert.equal(decideVoteAnswer({ ...text, pollOptionId: "clchoice" }).ok, false);
  assert.equal(decideVoteAnswer({ ...text, pollOptionId: null }).ok, false);
});

const CHOICES = [
  { id: "no", text: "No", position: 1 },
  { id: "yes", text: "Yes", position: 0 },
  { id: "maybe", text: "Only on weekends", position: 2 },
];
const ANSWERS = [
  { id: "e1", pollOptionId: "yes", body: null, author: "leela" },
  { id: "e2", pollOptionId: "no", body: "  obviously ", author: "joseph" },
  { id: "e3", pollOptionId: "yes", body: "", author: "meera" },
  { id: "e4", pollOptionId: "someone-elses", body: null, author: "stray" },
  { id: "e5", pollOptionId: null, body: "a text answer", author: "arjun" },
];

test("nothing about a vote is readable before the Edition is out, counts included", () => {
  for (const status of ["draft", "collecting", "answering", "", "preparing"]) {
    assert.equal(voteResult(status, CHOICES, ANSWERS), null, `${status} leaked a result`);
  }
});

test("the result is who chose what, every choice in the asker's order", () => {
  const result = voteResult("published", CHOICES, ANSWERS);
  assert.deepEqual(
    result.map((r) => [r.choice.text, r.voters.map((v) => v.person)]),
    [
      ["Yes", ["leela", "meera"]],
      ["No", ["joseph"]],
      // A choice nobody picked is still part of the answer.
      ["Only on weekends", []],
    ]
  );
  assert.equal(result[1].voters[0].line, "obviously");
  assert.equal(result[0].voters[1].line, null, "an empty line was drawn as a line");
  // A pick naming another question's choice is dropped, not invented a row.
  assert.ok(!JSON.stringify(result).includes("stray"));
  // No number anywhere in the shape (R32).
  assert.ok(!("count" in result[0]) && !("percent" in result[0]));
});

/* ---- the plumbing around the rule, pinned by shape ------------------ */

test("the database makes a vote for another question's choice impossible", () => {
  const schema = read("prisma/schema.prisma");
  const option = schema.slice(schema.indexOf("model CatchupPromptOption"));
  assert.match(option.slice(0, option.indexOf("\n}")), /@@unique\(\[id, promptId\]\)/);
  const entry = schema.slice(schema.indexOf("model CatchupEntry {"));
  const body = entry.slice(0, entry.indexOf("\n}"));
  assert.match(
    body,
    /pollOption\s+CatchupPromptOption\?\s+@relation\(fields: \[pollOptionId, promptId\], references: \[id, promptId\], onDelete: Cascade\)/,
    "the pick is keyed on the choice alone, so it can name another question's choice"
  );
  // One vote per member per question is the constraint that already existed.
  assert.match(body, /@@unique\(\[promptId, authorId\]\)/);

  const sql = decomment(read("prisma/migrations-manual/2026-09-14-vote-questions.sql").replace(/--.*$/gm, ""));
  assert.match(sql, /FOREIGN KEY \("pollOptionId", "promptId"\)\s+REFERENCES "CatchupPromptOption"\("id", "promptId"\)/);
  assert.match(sql, /ENABLE ROW LEVEL SECURITY/);
  assert.doesNotMatch(sql, /\bDROP\b/i, "the migration drops something");
});

test("choices are written with the question, while collecting, and nowhere else", () => {
  const src = decomment(read("src/app/(main)/catchups/actions.ts"));
  const fn = src.slice(src.indexOf("export async function submitPrompt"), src.indexOf("export type CuratePromptInput"));
  const decide = fn.search(/decideVoteChoices\(/);
  const collecting = fn.search(/edition\.status !== "collecting"/);
  const tx = fn.search(/prisma\.\$transaction/);
  const write = fn.search(/tx\.catchupPromptOption\.createMany\(/);
  assert.ok(decide !== -1 && decide < tx, "submitPrompt writes choices it has not checked");
  assert.ok(collecting !== -1 && collecting < tx, "choices are writable outside the question window");
  assert.ok(write > tx, "the choices are not written inside the question's own transaction");
  assert.match(
    fn.slice(tx, write),
    /status: "collecting"/,
    "the question window is not re-read inside the transaction that writes the choices"
  );

  /* Frozen once answering opens, by construction: nothing else writes a
     choice. A later "edit the choices" action must argue its way past this. */
  const writers = walk(resolve(ROOT, "src"), { skip: ["generated", "node_modules", "lab"] })
    .filter((f) => /catchupPromptOption\.(create|createMany|update|updateMany|upsert|delete|deleteMany)\(/.test(decomment(read(f))))
    .map((f) => f.slice(ROOT.length + 1));
  assert.deepEqual(writers, ["src/app/(main)/catchups/actions.ts"]);
  const inActions = src.match(/catchupPromptOption\.(create|createMany|update|updateMany|upsert|delete|deleteMany)\(/g);
  assert.equal(inActions.length, 1, "a second choice write appeared in actions.ts");
});

test("submitEntry checks a pick before it writes, and inside the write", () => {
  const src = decomment(read("src/app/(main)/catchups/actions.ts"));
  const fn = src.slice(src.indexOf("export async function submitEntry"), src.indexOf("export async function toggleEntryLove"));
  const decide = fn.search(/decideVoteAnswer\(/);
  const tx = fn.search(/prisma\.\$transaction/);
  assert.ok(decide !== -1 && decide < tx, "a pick is written without the rule deciding it");
  const inside = fn.slice(tx);
  assert.match(inside, /catchupPromptOption\.count\(\{ where: \{ id: vote\.pick, promptId \} \}\)/, "the choice is not proved to be this question's");
  assert.match(inside, /status: "answering"/, "a vote can be cast outside the answering window");
  assert.match(fn, /!entry\.pollOptionId\)/, "a vote with no words is deleted as an empty answer");
});

test("nobody reads another member's pick outside the places that know the rule", () => {
  /* A tripwire for the transplant. The published reader is where a result is
     drawn, and it must go through voteResult; the home and the answering
     surface only ever read the viewer's own pick. Adding a read anywhere else
     fails here, so the session doing it has to look at spec 3.13 first.
     Catch-ups files only: the feed's own poll has a `pollOptionId` of its
     own (PollVote), which is a different table and a public count. */
  const allowed = new Set([
    "src/app/(main)/catchups/actions.ts",
    "src/lib/catchups-export.ts",
    "src/lib/vote-question-rule.ts",
  ]);
  const readers = walk(resolve(ROOT, "src"), { skip: ["generated", "node_modules", "lab"] })
    .filter((f) => /catchup/i.test(f) && /\.tsx?$/.test(f) && /pollOption/.test(decomment(read(f))))
    .map((f) => f.slice(ROOT.length + 1))
    .filter((f) => !allowed.has(f));
  assert.deepEqual(readers, [], "a new file reads votes; check it cannot show one before publication");
});

test("a member's copy of their data carries their votes and their choices", () => {
  const src = decomment(read("src/app/api/account/export/route.ts"));
  const answers = src.slice(src.indexOf('"catchupAnswers"'), src.indexOf('"catchupQuestions"'));
  assert.match(answers, /pollOption: \{ select: \{ text: true \} \}/);
  const questions = src.slice(src.indexOf('"catchupQuestions"'), src.indexOf('"messagesToAdmin"'));
  assert.match(questions, /options:/);
  const script = read("scripts/dev/export-catchups.mjs");
  assert.match(script, /"CatchupPromptOption"/, "the rework export leaves the choices behind");
  assert.match(script, /pollOptionId: e\.pollOptionId/);
});

test("the purge leaves a question's choices with the question", () => {
  /* A question belongs to everyone who answered it, so a purged asker's
     question stays with a NULL author (account-purge.ts) and its choices stay
     with it; a purged voter's votes go with their answers, by cascade. Neither
     needs a line in the purge, and deleting choices there would silently void
     every other member's vote. */
  const src = decomment(read("src/lib/account-purge.ts"));
  assert.doesNotMatch(src, /catchupPromptOption/);
});
