import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

/* ------------------------------------------------------------------ *
 *  A campaign runs one way.
 *
 *  Before 2026-09-05 the owner ran them by hand: paste the audit's
 *  fix-prompt into a fresh Opus Max session, wait an hour, paste it into
 *  the next one, all night. /campaign is that loop written down so a
 *  single session can run it -- and the shape only holds if something
 *  checks it, which is the same lesson hand-run-passes.test.mjs exists
 *  for. The owner, 2026-08-28: "I don't want each session to create new
 *  documentation and do it a new way. we have to have a
 *  workflow/protocol for it."
 *
 *  Renamed from /fix-campaign on 2026-09-05 when its scope widened past
 *  audits to any campaign with phases and a board -- the catch-ups
 *  rework was the second one, and a skill called "fix-campaign" is a
 *  skill a design session does not think applies to it.
 *
 *  What this pins: that the skill is still findable under the names he
 *  actually types, that it still carries the two rules he asked for by
 *  name (how he is questioned, and when a fan-out is allowed), and that
 *  a campaign file which claims to run under it carries the sections the
 *  protocol reads and writes.
 *
 *  What it deliberately does NOT pin: the wording of any question, the
 *  chunk size, which phase runs when, or anything about the judgement a
 *  campaign makes. Those are the session's job.
 * ------------------------------------------------------------------ */

/* The skill is installed globally, not in this repo -- the owner asked
   for it on 2026-09-05 ("make sure this skill is accessible globally,
   not just in this folder"), which is also what §4.4 of refactor audit 2
   recommends for skill packs generally. So it is checked only on a
   machine that has a global skills folder at all. CI has none, and a
   check that silently passes there is honest rather than fail-open:
   there is genuinely nothing to check. On the owner's machine the folder
   exists, so a deleted or reverted skill still reds his run. */
const SKILLS_HOME = join(homedir(), ".claude", "skills");
const SKILL = join(SKILLS_HOME, "campaign", "SKILL.md");

/** The statuses a campaign board may use. A word outside this set is a
 *  board no later session can resume from, because resuming means
 *  finding the first phase that is not DONE. */
const STATUSES = new Set(["DONE", "PARTIAL", "OPEN", "OWNER-GATED", "DECLINED"]);

/** Every section /campaign reads or writes. Missing one does not fail
 *  loudly at run time -- the session simply invents a replacement, which
 *  is the drift this whole file exists to stop. Matched loosely because
 *  an audit writes "## Campaign board" and "## Ledger" while a rework
 *  writes "## Status board" and "## The ledger: every ask in the brief";
 *  the heading's wording is not the thing worth pinning. */
const SECTIONS = [
  [/^##\s+(Campaign|Status) board/m, "a campaign or status board"],
  [/^##\s+Owner questions/m, "## Owner questions"],
  [/^##\s+Owner answers/m, "## Owner answers"],
  [/^##.*\bledger\b/im, "a ledger section"],
];

if (existsSync(SKILLS_HOME)) {
  test("the skill is installed and still says what triggers it", () => {
    assert.ok(existsSync(SKILL), `${SKILL} is gone; every campaign file points at it`);
    const front = readFileSync(SKILL, "utf8").split("---")[1] ?? "";
    /* The description is the only thing that decides whether a session
       reaching for a campaign file finds this skill at all. Every phrase
       here appears in how the owner actually asks for it, and the two
       file names are how a session arrives holding one. */
    for (const phrase of ["fix campaign", "fix-prompt.md", "handover.md", "rework", "resume"]) {
      assert.ok(front.includes(phrase), `${SKILL}'s description no longer mentions "${phrase}"`);
    }
  });

  test("the owner is asked in plain text, not through a blocking picker", () => {
    /* 2026-09-05: "i'd rather not use the question asking tool, because
       those are kinda restrictive and quit if you close the app." A batch
       of fifty questions in a modal is lost the moment his laptop sleeps;
       the same batch in a committed file is not. A future session will
       find AskUserQuestion tidier and be wrong. */
    assert.match(
      readFileSync(SKILL, "utf8"),
      /Do not use `AskUserQuestion`/,
      `${SKILL} no longer forbids AskUserQuestion for the owner's question batch`
    );
  });

  test("the skill still says when a fan-out is allowed and when it is not", () => {
    /* 2026-09-05, when the scope widened: "give it the freedom to choose
       workflow and subagents but tell it what should be used when." The
       freedom without the guidance is how a campaign ends up fanning out
       a phase that had to be one sequence, so the guidance is the part
       worth pinning. The default stays sequential -- his words the same
       day: "i'm in no rush so it's fine it's one after another." */
    const body = readFileSync(SKILL, "utf8");
    assert.match(body, /^### Workflow or subagents$/m, `${SKILL} has lost its fan-out guidance`);
    assert.match(
      body,
      /default is sequential/i,
      `${SKILL} no longer says that running units one after another is the default`
    );
  });
}

test("CLAUDE.md still routes a campaign here", () => {
  /* A skill nothing points at is a skill the next session does not
     invoke, and the skills table is the pointer. Matching a bare
     "/campaign" anywhere in the file is not enough -- the prose
     mentions it too, so dropping the table row passed. Pin the row. */
  assert.match(
    readFileSync("CLAUDE.md", "utf8"),
    /^\|.*\|\s*`\/campaign`\s*\|\s*$/m,
    "CLAUDE.md's skills table has lost the /campaign row"
  );
});

/** Campaign files are found rather than listed, so an audit opened next
 *  month is checked the day its campaign starts. Two shapes qualify: an
 *  audit's fix-prompt and a rework's handover. A file is only held to
 *  the protocol if it says it runs under the protocol -- which is also
 *  how the collection rework, run by hand before the skill existed,
 *  stays out of scope without needing an exemption. */
function campaignFiles() {
  const found = [];
  for (const [root, leaf] of [
    ["docs/audit-fix", "fix-prompt.md"],
    ["docs/planning", "handover.md"],
  ]) {
    if (!existsSync(root)) continue;
    for (const entry of readdirSync(root, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const path = `${root}/${entry.name}/${leaf}`;
      if (existsSync(path)) found.push(path);
    }
  }
  return found;
}

const PROMPTS = campaignFiles().filter((p) => readFileSync(p, "utf8").includes("/campaign"));

test("there is at least one campaign file to check", () => {
  assert.ok(
    PROMPTS.length > 0,
    "no campaign file names /campaign -- has a campaign moved, or lost its pointer to the skill?"
  );
});

for (const path of PROMPTS) {
  const body = readFileSync(path, "utf8");

  /* A closed campaign is history. Audit 1's prompt has a different shape
     because it was run by hand before this protocol existed, and
     retrofitting it would be a lie about what happened. The marker is
     explicit so nothing is exempt by accident. */
  if (body.includes("<!-- campaign: closed -->")) continue;

  test(`${path}: carries the four sections the protocol uses`, () => {
    for (const [pattern, label] of SECTIONS) {
      assert.match(body, pattern, `${path} has no ${label} -- add it, or mark the campaign closed`);
    }
  });

  test(`${path}: every board status is one a session can resume from`, () => {
    const board = body.split(/\n##\s+(?:Campaign|Status) board/)[1]?.split(/\n## /)[0] ?? "";
    const rows = board
      .split("\n")
      .filter((l) => l.trim().startsWith("|") && !/^\s*\|[\s|:-]+\|\s*$/.test(l))
      .map((l) => l.split("|").map((c) => c.trim()))
      .filter((cells) => cells.length > 2 && !/^(Phase|Item|Status)$/i.test(cells[2]));

    assert.ok(rows.length > 0, `${path}'s board has no phase rows`);
    for (const cells of rows) {
      const status = cells[2].replace(/\*/g, "").trim();
      assert.ok(
        STATUSES.has(status),
        `${path}: phase "${cells[1]}" has status "${status}"; use one of ${[...STATUSES].join(", ")}`
      );
    }
  });
}
