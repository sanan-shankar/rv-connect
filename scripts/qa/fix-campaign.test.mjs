import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

/* ------------------------------------------------------------------ *
 *  A fix campaign runs one way.
 *
 *  Before 2026-09-05 the owner ran them by hand: paste the audit's
 *  fix-prompt into a fresh Opus Max session, wait an hour, paste it into
 *  the next one, all night. /fix-campaign is that loop written down so a
 *  single session can run it -- and the shape only holds if something
 *  checks it, which is the same lesson hand-run-passes.test.mjs exists
 *  for. The owner, 2026-08-28: "I don't want each session to create new
 *  documentation and do it a new way. we have to have a
 *  workflow/protocol for it."
 *
 *  What this pins: that the skill is still findable, that an OPEN
 *  campaign's fix-prompt carries the four sections the protocol reads
 *  and writes, and that the owner's one hard preference about how he is
 *  asked questions has not been quietly reverted.
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
const SKILL = join(SKILLS_HOME, "fix-campaign", "SKILL.md");
const CAMPAIGNS = "docs/audit-fix";

/** The statuses a campaign board may use. A word outside this set is a
 *  board no later session can resume from, because resuming means
 *  finding the first phase that is not DONE. */
const STATUSES = new Set(["DONE", "PARTIAL", "OPEN", "OWNER-GATED", "DECLINED"]);

/** Every section /fix-campaign reads or writes. Missing one does not
 *  fail loudly at run time -- the session simply invents a replacement,
 *  which is the drift this whole file exists to stop. */
const SECTIONS = ["## Campaign board", "## Owner questions", "## Owner answers", "## Ledger"];

if (existsSync(SKILLS_HOME)) {
  test("the skill is installed and still says what triggers it", () => {
    assert.ok(existsSync(SKILL), `${SKILL} is gone; every fix-prompt points at it`);
    const front = readFileSync(SKILL, "utf8").split("---")[1] ?? "";
    /* The description is the only thing that decides whether a session
       reaching for a fix-prompt finds this skill at all. Both phrases
       appear in how the owner actually asks for it. */
    for (const phrase of ["fix campaign", "fix-prompt.md"]) {
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
}

test("CLAUDE.md still routes a fix campaign here", () => {
  /* A skill nothing points at is a skill the next session does not
     invoke, and the skills table is the pointer. Matching a bare
     "/fix-campaign" anywhere in the file is not enough -- the prose
     mentions it too, so dropping the table row passed. Pin the row. */
  assert.match(
    readFileSync("CLAUDE.md", "utf8"),
    /^\|.*\|\s*`\/fix-campaign`\s*\|\s*$/m,
    "CLAUDE.md's skills table has lost the /fix-campaign row"
  );
});

/** Found rather than listed, so an audit added next month is checked the
 *  day its fix campaign opens. */
const PROMPTS = readdirSync(CAMPAIGNS, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => `${CAMPAIGNS}/${e.name}/fix-prompt.md`)
  .filter((p) => existsSync(p));

test("there is at least one fix-prompt to check", () => {
  assert.ok(PROMPTS.length > 0, `no fix-prompt.md under ${CAMPAIGNS}/ -- has a campaign moved?`);
});

for (const path of PROMPTS) {
  const body = readFileSync(path, "utf8");

  /* A closed campaign is history. Audit 1's prompt has a different shape
     ("Status board", "Session log") because it was run by hand before
     this protocol existed, and retrofitting it would be a lie about what
     happened. The marker is explicit so nothing is exempt by accident. */
  const closed = body.includes("<!-- campaign: closed -->");
  if (closed) continue;

  test(`${path}: carries the four sections the protocol uses`, () => {
    for (const section of SECTIONS) {
      assert.ok(
        body.includes(section),
        `${path} has no "${section}" -- either add it, or mark the campaign closed`
      );
    }
  });

  test(`${path}: every board status is one a session can resume from`, () => {
    const board = body.split("## Campaign board")[1]?.split(/\n## /)[0] ?? "";
    const rows = board
      .split("\n")
      .filter((l) => l.trim().startsWith("|") && !/^\s*\|[\s|:-]+\|\s*$/.test(l))
      .map((l) => l.split("|").map((c) => c.trim()))
      .filter((cells) => cells.length > 2 && !/^Phase$/i.test(cells[1]));

    assert.ok(rows.length > 0, `${path}'s campaign board has no phase rows`);
    for (const cells of rows) {
      const status = cells[2].replace(/\*/g, "").trim();
      assert.ok(
        STATUSES.has(status),
        `${path}: phase "${cells[1]}" has status "${status}"; use one of ${[...STATUSES].join(", ")}`
      );
    }
  });
}
