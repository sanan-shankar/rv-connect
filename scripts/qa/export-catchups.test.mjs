import test from "node:test";
import assert from "node:assert/strict";
import { read, decomment, balancedBody } from "../../src/lib/test-kit.mjs";
import { bucketKey, bytesFor } from "../dev/_cli.mjs";

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

/* ------------------------------------------------------------------ *
 *  How it reads them (T2b-08). `bytesFor` in scripts/dev/_cli.mjs read
 *  every photograph and recording off the public host with no deadline:
 *  from outside India an uncached file came at 7-40 KB/s, and one stalled
 *  socket hung the export for ever. Three scripts share it.
 * ------------------------------------------------------------------ */

const KEYS = {
  R2_ACCOUNT_ID: "acct",
  R2_ACCESS_KEY_ID: "id",
  R2_SECRET_ACCESS_KEY: "secret",
  R2_BUCKET: "bucket",
  R2_PUBLIC_BASE_URL: "https://images.example/",
};

test("a file on the bucket's host is read through the bucket when the keys are there", () => {
  assert.equal(bucketKey("https://images.example/uploads/u1/2026/08/a.webp", KEYS), "uploads/u1/2026/08/a.webp");
  assert.equal(bucketKey("https://images.example/audio/u1/a.webm", KEYS), "audio/u1/a.webm");
  // Anywhere else, or short of a key, it comes over HTTP.
  assert.equal(bucketKey("https://images.example.attacker.test/uploads/a.webp", KEYS), null);
  assert.equal(bucketKey("https://elsewhere.example/a.webp", KEYS), null);
  assert.equal(bucketKey("https://images.example/uploads/a.webp", { ...KEYS, R2_SECRET_ACCESS_KEY: "" }), null);
  assert.equal(bucketKey("https://images.example/uploads/a.webp"), null);
  // And bytesFor asks that question before it reaches for HTTP.
  const body = balancedBody(read("scripts/dev/_cli.mjs"), "export async function bytesFor");
  assert.ok(body && body.indexOf("bucketKey(") >= 0 && body.indexOf("bucketKey(") < body.indexOf("fetch("));
  assert.match(body, /GetObjectCommand/);
});

test("a file read over HTTP has a deadline", async () => {
  const real = globalThis.fetch;
  let init;
  globalThis.fetch = async (_u, i) => {
    init = i;
    return new Response(new Uint8Array([1, 2, 3]));
  };
  try {
    assert.deepEqual([...(await bytesFor("https://elsewhere.example/a.webp", KEYS))], [1, 2, 3]);
    assert.ok(init?.signal instanceof AbortSignal, "fetched with no deadline: one stalled socket hangs the run");
    // The bucket's own host without the keys (the demo's env) goes the same way.
    init = undefined;
    await bytesFor("https://images.example/uploads/a.webp", { R2_PUBLIC_BASE_URL: KEYS.R2_PUBLIC_BASE_URL });
    assert.ok(init?.signal instanceof AbortSignal);
  } finally {
    globalThis.fetch = real;
  }
});

test("the export hands bytesFor the env it read, so its files come through the bucket", () => {
  assert.match(src, /const \{[^}]*\benv\b[^}]*\} = databaseUrl\(/);
  assert.match(src, /bytesFor\(u, env\)/);
});
