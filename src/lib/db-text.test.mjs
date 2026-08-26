import assert from "node:assert/strict";
import test from "node:test";

import { escapeLike, SEARCH_TERM_MAX } from "./db-text.ts";

/* escapeLike neutralises the LIKE wildcards Prisma's `contains` would otherwise
 * pass through live. The property that keeps it safe to apply everywhere: a
 * query with none of \ % _ is returned byte-for-byte, so normal searches are
 * untouched and only wildcard input is narrowed to the literal it reads as. */

test("plain alphanumeric queries pass through unchanged", () => {
  for (const q of ["Afia", "afia shankar", "Northfield 2004", "O'Brien"]) {
    assert.equal(escapeLike(q), q, `${q} was altered`);
  }
});

test("each LIKE metacharacter is backslash-escaped", () => {
  assert.equal(escapeLike("50%"), "50\\%");
  assert.equal(escapeLike("a_b"), "a\\_b");
  assert.equal(escapeLike("100%_off"), "100\\%\\_off");
});

test("a backslash is escaped first so it cannot double back on a wildcard", () => {
  // "\%" must become "\\%" (escaped backslash, then escaped percent), never
  // "\\%" read as backslash + live wildcard.
  assert.equal(escapeLike("\\%"), "\\\\\\%");
  assert.equal(escapeLike("\\"), "\\\\");
});

/* ---- C-015: an over-long term is a pattern Postgres has to scan ---------- */

test("C-015: escapeLike clamps an over-long term", () => {
  const long = "a".repeat(SEARCH_TERM_MAX * 50);
  assert.equal(escapeLike(long).length, SEARCH_TERM_MAX);
});

test("C-015: the clamp never leaves a dangling LIKE escape", () => {
  /* Backslash-only input is the worst case: each character escapes to two, so
     clamping AFTER escaping would cut a pair in half and hand Postgres a
     pattern ending in a lone backslash, which it refuses outright. */
  const out = escapeLike("\\".repeat(SEARCH_TERM_MAX * 3));
  const trailing = out.length - out.replace(/\\+$/, "").length;
  assert.equal(trailing % 2, 0, `pattern ends in ${trailing} backslashes`);
});
