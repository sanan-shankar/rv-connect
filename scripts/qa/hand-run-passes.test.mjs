import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { decomment } from "../../src/lib/test-kit.mjs";

/* ------------------------------------------------------------------ *
 *  The hand-run passes conform to one shape.
 *
 *  Two exist -- photographs and professions -- and they were built four
 *  weeks apart by different sessions. They came out nearly identical,
 *  which is luck rather than design: the second one read the first.
 *  docs/spec/hand-run-passes.md is that shape written down, and this is
 *  what makes it bite.
 *
 *  The owner, 2026-08-28: "I don't want each session to create new
 *  documentation and do it a new way. we have to have a
 *  workflow/protocol for it." A protocol nothing checks is a document
 *  the third session will not read.
 *
 *  What is deliberately NOT checked here: the judgement itself, the
 *  vocabulary, or the wording of any skill. This pins the SHAPE -- that
 *  the parts exist, are reachable, and put their working data where the
 *  root does not have to see it.
 * ------------------------------------------------------------------ */

const SPEC = "docs/spec/hand-run-passes.md";
const DEV = "scripts/dev";

/** Every pass, found rather than listed: a third one is caught the day it
 *  is written, which a hardcoded list would not do. */
const PASSES = readdirSync(DEV)
  .filter((f) => f.endsWith("-pick.mjs"))
  .map((f) => f.replace(/-pick\.mjs$/, ""));

test("there is a pass to check, and the spec it conforms to", () => {
  assert.ok(PASSES.length > 0, "no *-pick.mjs in scripts/dev -- has a pass been renamed?");
  assert.ok(existsSync(SPEC), `${SPEC} is gone; it is what these tests are enforcing`);
});

for (const name of PASSES) {
  const pick = readFileSync(`${DEV}/${name}-pick.mjs`, "utf8");

  test(`${name}: the picker has an applier`, () => {
    /* A picker with no applier is a pass that exports real members' data
       and has no way to put an answer back -- and no undo log, which is
       the guarantee the whole shape rests on. */
    assert.ok(
      existsSync(`${DEV}/${name}-apply.mjs`),
      `${name}-pick.mjs exists with no ${name}-apply.mjs beside it`
    );
  });

  test(`${name}: the working folder is beside the scripts, not in the root`, () => {
    /* Both passes were built with a root entry first and both were moved
       (2026-08-28: "I don't like items in my root directory if they don't
       have to be"). The folder holds real members' data, so it is the
       clearest case of something the root does not need. */
    const out = pick.match(/const OUT = path\.join\((.*)\);/);
    assert.ok(out, `${name}-pick.mjs has no OUT working folder to check`);
    assert.match(
      out[1],
      /"scripts",\s*"dev",\s*"\.[a-z-]+"/,
      `${name}'s working folder is not scripts/dev/.<name>/ -- see ${SPEC}. ` +
        `It must not be a repo-root entry.`
    );
  });

  test(`${name}: the picker stamps its database and stays read-only`, () => {
    /* The stamp is what lets the applier refuse a demo batch applied to
       the real membership, which is the one mistake here with no undo. */
    assert.match(pick, /database:\s*envFile/, `${name}-pick.mjs does not stamp which database it read`);
    /* Read-only in the literal sense: a picker that can UPDATE is a
       picker that can write an unreviewed answer, with no dry run in
       front of it. */
    assert.doesNotMatch(
      pick,
      /\b(UPDATE|INSERT|DELETE)\s/i,
      `${name}-pick.mjs writes to the database; a picker only ever reads`
    );
  });

  test(`${name}: the picker carries the vocabulary and the rules in the manifest`, () => {
    /* The spec's own words: "A session reading a batch picked last week should
       judge by the vocabulary that was current when it was picked, and a
       manifest that carries its own rules can be read by somebody who never
       opened the skill."

       Nothing enforced it until 2026-09-05, and tag-photos had shipped
       without it -- its manifest was {database, taken, outstanding, photos}
       and its skill told the session to go and read BUCKET_RULES out of
       src/lib/photo-suggest.ts. A rule nobody checks is a rule one of the
       three passes will skip, which is the whole reason this file exists. */
    assert.match(
      pick,
      /\brules:/,
      `${name}-pick.mjs does not put its rules in the manifest -- see ${SPEC}. ` +
        `A batch judged next week must carry the rules it was picked under.`
    );
    assert.match(
      pick,
      /\bvocabulary:/,
      `${name}-pick.mjs does not put its vocabulary in the manifest -- see ${SPEC}.`
    );
  });

  test(`${name}: a new pick keeps the last apply's undo`, () => {
    /* Both pickers started each batch by deleting their whole working
       folder, and the applier's undo logs live in that folder -- so taking
       the next batch threw away the way back from the last apply, the one
       guarantee this shape rests on. Found 2026-10-01, the day the profession
       pass first rewrote words members had typed. A picker clears its batch
       files by name. */
    /* A positive pin rather than a ban on one spelling: every delete in a
       picker names a file inside the folder, so `rmSync(OUT)` or a template
       string fails here just as `rm(OUT, ...)` does. */
    const deletes = [...decomment(pick).matchAll(/\brm(?:Sync)?\(\s*([^\n]{0,40})/g)].map((m) => m[1]);
    for (const target of deletes) {
      assert.match(
        target,
        /^path\.join\(\s*OUT\s*,\s*\S/,
        `${name}-pick.mjs deletes ${target}, not a named file inside its folder -- undo logs live there too`
      );
    }
  });

  test(`${name}: the applier is dry by default and leaves an undo`, () => {
    const apply = readFileSync(`${DEV}/${name}-apply.mjs`, "utf8");
    assert.match(apply, /--apply/, `${name}-apply.mjs has no --apply flag, so it cannot be dry by default`);
    assert.match(apply, /--undo/, `${name}-apply.mjs leaves no way back`);
    assert.match(apply, /applied-/, `${name}-apply.mjs writes no undo log`);
  });

  test(`${name}: a session can find it`, () => {
    /* The owner's actual ask: "I just have to say some keyword and it'll
       know what to do." The keyword is the skill, and the skills table in
       CLAUDE.md is what a session reads before it knows to look for one.
       A pass with no skill is a pass the next session reinvents. */
    const skill = `.claude/skills/${name}/SKILL.md`;
    assert.ok(existsSync(skill), `${name} has no skill at ${skill}, so no keyword reaches it`);
    /* assert.ok rather than assert.match throughout: a failed assert.match
       prints the whole haystack, and these haystacks are entire documents. */
    assert.ok(
      new RegExp(`skills/${name}/SKILL\\.md|/${name}\\b`).test(readFileSync("CLAUDE.md", "utf8")),
      `${name} is not in CLAUDE.md's skills table`
    );
    assert.ok(
      /hand-run-passes\.md/.test(readFileSync(skill, "utf8")),
      `${skill} does not point at ${SPEC}; it will drift into restating it`
    );
  });
}
