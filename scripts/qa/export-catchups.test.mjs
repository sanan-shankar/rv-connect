import test from "node:test";
import assert from "node:assert/strict";
import { read, decomment, balancedBody } from "../../src/lib/test-kit.mjs";

/* ------------------------------------------------------------------ *
 *  The Catch-ups export keeps its promise about files.
 *
 *  scripts/dev/export-catchups.mjs reads all of production, so it is never
 *  run to test it. What can be held without running it is the promise
 *  src/lib/catchups-export.ts makes: a file the JSON names is on disk, and
 *  a file that did not arrive is recorded as `file: null`, so a restore can
 *  tell "there was none" from "it was lost". Recorded answers broke both
 *  halves at once: no audio/ folder was ever made, and nothing nulled a
 *  recording that failed to copy (bug audit 3, T2b-03).
 * ------------------------------------------------------------------ */

const SCRIPT = "scripts/dev/export-catchups.mjs";
const src = decomment(read(SCRIPT));
const COPY_LOOP = "for (const { url: u, file } of wanted)";

test("every copied file's folder is made where the file is written", () => {
  const copy = balancedBody(src, COPY_LOOP);
  assert.ok(copy, `${SCRIPT} no longer copies its files in a loop over \`wanted\`; re-read this test`);
  const written = copy.indexOf("writeFile(path.join(OUT, file)");
  const made = copy.indexOf("mkdir(path.dirname(path.join(OUT, file))");
  assert.ok(written > 0, "the copy loop no longer writes the file it fetched");
  assert.ok(made >= 0 && made < written, "the copy loop writes a file without first making its folder");
  // A list of folders kept apart from wantPhoto is how audio/ was missed.
  assert.doesNotMatch(src, /mkdir\(path\.join\(OUT,\s*["'`]/, "a fixed list of folders is back; make each file's own");
});

test("every kind of copied file is recorded as null when it did not arrive", () => {
  const copy = balancedBody(src, COPY_LOOP);
  assert.ok(copy, `${SCRIPT} no longer copies its files in a loop over \`wanted\`; re-read this test`);
  const settle = balancedBody(src.slice(src.indexOf(copy) + copy.length), "for (const c of out.catchups)");
  assert.ok(settle, "the pass that records what did not arrive is gone");
  // One `wantPhoto(` call per kind of file: avatars, photographs, recordings.
  const kinds = [...src.matchAll(/\bwantPhoto\(/g)].length;
  const nulled = [...settle.matchAll(/[\w?.]+\.(?:photoFile|file) = null/g)].map((m) => m[0]);
  assert.ok(kinds >= 3, `only ${kinds} kinds of file found; re-read this test`);
  assert.equal(
    nulled.length,
    kinds,
    `${kinds} kinds of file are copied, but only these are nulled when missing: ${nulled.join(", ")}`,
  );
  assert.ok(nulled.some((n) => n.includes("audio")), "a recording that did not arrive keeps a path to nothing");
});
