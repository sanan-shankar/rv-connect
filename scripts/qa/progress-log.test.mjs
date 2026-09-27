/**
 * The session log is an INDEX, and the entries live in `docs/history/`.
 *
 * Why this test exists. The rule used to run the other way: the full entry was
 * written into the root `progress.md`, and a month was supposed to move out
 * once it closed. That rule was written down in two places -- `docs/README.md`
 * and the log's own header -- and nothing enforced it. August 2026 closed and
 * did not move. The file reached **11,604 lines and 601 KB**, the fourth-largest
 * in the repository and half the root's tracked weight, growing about 550 lines
 * a day (refactor audit 2, `root-assets-01` = `docs-04`).
 *
 * The owner inverted it on 2026-09-07 (campaign question 20, answer "20b"):
 * the full entry always goes to the month's file, and the root keeps one line
 * per session. A rule with a test under it is the shape he asked for -- one
 * spec, one globbing test -- rather than a paragraph a future session skims.
 *
 * The same audit found the log running in TWO directions at once, some sessions
 * prepending and some appending, with September entries at both ends
 * (`root-assets-02`). The split merged them by date. Assertion 1 is what stops
 * that recurring: there is only one place an entry can go now.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const read = (p) => readFileSync(join(ROOT, p), "utf8");

const log = read("progress.md");
const logLines = log.split("\n");

/* An entry heading carries a date. A section heading names a month. Both start
   with "## ", so the date is what tells them apart. */
const ENTRY_HEADING = /^##\s+(?:Session\s+)?\d{4}-\d{2}-\d{2}/;

test("progress.md holds no entry bodies -- those live in docs/history/", () => {
  const strays = logLines
    .map((l, i) => [i + 1, l])
    .filter(([, l]) => ENTRY_HEADING.test(l));
  assert.deepEqual(
    strays,
    [],
    `progress.md is the index; an entry's full text goes in docs/history/progress-<YYYY-MM>.md ` +
      `and ONE line goes here. Found ${strays.length} entry heading(s): ` +
      strays.map(([n, l]) => `${n}: ${l.slice(0, 60)}`).join(" | ")
  );
});

test("progress.md stays an index-sized file", () => {
  /* It was 11,604 lines when the inversion happened, and ~350 after. The cap is
     generous enough for years of one-line entries and small enough that a
     session pasting a whole entry back in trips it long before it is the
     fourth-largest file in the repository again. */
  assert.ok(
    logLines.length < 1500,
    `progress.md is ${logLines.length} lines. It is an index of one line per session; ` +
      `something is writing entry bodies into it again.`
  );
});

test("every month the index names has its file, and every archived entry is indexed", () => {
  const sections = [...log.matchAll(/^##\s+\w+\s+(\d{4})\s+—\s+\[full entries\]\((.+?)\)/gm)];
  assert.ok(sections.length > 0, "the index names no month; the log has lost its shape");

  for (const [, , relPath] of sections) {
    assert.ok(existsSync(join(ROOT, relPath)), `progress.md points at ${relPath}, which does not exist`);

    /* Every entry in that month's file must appear as a line here, so the index
       and the record cannot drift apart. Compared on the heading text, because
       the index line is the heading with its "## " removed. */
    const monthHeadings = read(relPath)
      .split("\n")
      .filter((l) => ENTRY_HEADING.test(l))
      .map((l) => l.replace(/^##\s*/, "").trim());

    const missing = monthHeadings.filter((h) => !log.includes(h));
    assert.deepEqual(
      missing,
      [],
      `${relPath} holds ${missing.length} entr(y|ies) that progress.md does not index. ` +
        `Add one line per entry: ${missing.slice(0, 3).map((m) => m.slice(0, 50)).join(" | ")}`
    );
  }
});

test("every session the index lists still has its entry in the month's file", () => {
  /* The other direction of the test above, added 2026-09-27. That day
     9ef7d821 replaced progress-2026-09.md with its own entry (-8,363 lines)
     and five later commits each replaced the one before. The index still
     listed every session, so "every archived entry is indexed" stayed green
     while the month's record went missing. A session that WRITES the month
     file instead of appending to it now fails here. */
  const sections = [...log.matchAll(/^##\s+\w+\s+\d{4}\s+—\s+\[full entries\]\((.+?)\)/gm)];
  for (const m of sections) {
    const relPath = m[1];
    const start = m.index + m[0].length;
    const next = log.indexOf("\n## ", start);
    const listed = log
      .slice(start, next === -1 ? undefined : next)
      .split("\n")
      .filter((l) => /^-\s+(?:Session\s+)?\d{4}-\d{2}-\d{2}/.test(l))
      .map((l) => l.replace(/^-\s+/, "").trim());
    const inMonth = new Set(
      read(relPath)
        .split("\n")
        .filter((l) => ENTRY_HEADING.test(l))
        .map((l) => l.replace(/^##\s*/, "").trim())
    );
    /* An index line may run longer than its heading (sixteen September lines
       do), so a line is matched by the entry whose heading it begins with --
       the same looseness the includes() check above allows. */
    const headings = [...inMonth];
    const missing = listed.filter((t) => !headings.some((h) => t.startsWith(h)));
    assert.deepEqual(
      missing,
      [],
      `${relPath} has lost ${missing.length} entr(y|ies) that progress.md lists. Was the file written over instead ` +
        `of appended to? Recover the text with \`git log -p -- ${relPath}\`. First: ` +
        missing.slice(0, 3).map((t) => t.slice(0, 60)).join(" | ")
    );
  }
});

test("no month file is orphaned from the index without being an 'Earlier months' one", () => {
  /* June and July were archived under the OLD rule and are deliberately not
     itemised -- the index points at them as a block. Anything archived since
     the inversion must be itemised, or an entry could be written to disk and
     never appear in the index anybody actually reads. */
  const EARLIER = new Set(["progress-2026-06.md", "progress-2026-07.md"]);
  const files = readdirSync(join(ROOT, "docs/history")).filter((f) => f.startsWith("progress-"));
  const unlisted = files.filter((f) => !EARLIER.has(f) && !log.includes(f));
  assert.deepEqual(
    unlisted,
    [],
    `docs/history holds month file(s) progress.md never mentions: ${unlisted.join(", ")}`
  );
});
