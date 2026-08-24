import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

/* ------------------------------------------------------------------ *
 *  Bytes never outlive the row that names them.
 *
 *  Nothing in this system can enumerate the bucket: `keyForUrl` walks a
 *  URL to a key, and every sweep reads rows. So an object that no row
 *  references, and no code deleted, is unreachable for ever -- there is
 *  no list to find it in and no sweep that will ever look. That makes
 *  the moment of NOT creating the row the dangerous one.
 *
 *  This file pins the two shapes that keep it closed, by reading the
 *  source rather than the behaviour, because what is being asserted IS
 *  structural: that no exit was forgotten.
 * ------------------------------------------------------------------ */

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");

/** Source with its comments removed. Prose about a `return { error }` is
 *  not a `return { error }`, and this file counts exits. */
const code = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

/** A named function's body, brace-matched. Anchored on the `function`
 *  keyword, never on the bare name: a file that imports a symbol and
 *  also calls it will hand an indexOf-on-the-name search the IMPORT
 *  line, and every assertion after that passes against nothing. */
function blockAt(src, from) {
  const open = src.indexOf("{", from);
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}" && --depth === 0) return { body: src.slice(open, i + 1), end: i + 1 };
  }
  throw new Error(`unbalanced braces from ${from}`);
}

function bodyOf(src, name) {
  const decl = src.indexOf(`function ${name}(`);
  assert.notEqual(decl, -1, `${name} not found`);
  return blockAt(src, src.indexOf(")", decl)).body;
}

/* ---- C-063: the staged direct-upload original ------------------- */

const collection = read("../app/(main)/collection/actions.ts");
const direct = code(bodyOf(collection, "contributePhotoDirect"));

test("the extraction really is contributePhotoDirect's whole body", () => {
  // If this fails the assertions below are testing a fragment, and their
  // passing means nothing.
  assert.match(direct, /^\{[\s\S]*return \{ success: true, autoApprove \};\s*\}$/);
  assert.ok(direct.includes("COLLECTION_ORIGINAL_KEY.test(input.key)"));
});

test("C-063: every refusal after the key is validated deletes the staged object", () => {
  const guard = direct.indexOf("const refuse = async");
  assert.notEqual(guard, -1, "the single cleanup exit is gone");
  assert.ok(
    /const refuse = async[^;]*?purgeImageKey\(input\.key/s.test(direct),
    "refuse no longer purges the staged key"
  );

  // The property: past the point where we know the key is the caller's own,
  // NO error leaves by any door but `refuse`. A new refusal added below the
  // guard fails here until it is routed through it.
  const after = direct.slice(blockAt(direct, guard).end);
  const bare = [...after.matchAll(/return \{\s*error/g)];
  assert.deepEqual(
    bare.map((m) => after.slice(Math.max(0, m.index - 90), m.index + 40)),
    [],
    "an error return below the guard skips the staged-object cleanup"
  );

  // ...and there are real refusals down there to have routed. Counted, not
  // named, so renaming a message does not touch this test.
  assert.ok(
    [...after.matchAll(/return refuse\(/g)].length >= 5,
    "the refusals stopped going through refuse"
  );
});

test("C-063: the one refusal ABOVE the guard is the unvouched key itself", () => {
  const above = direct.slice(0, direct.indexOf("const refuse = async"));
  const bare = [...above.matchAll(/return \{\s*error/g)].length;
  // auth, demo, bad key. Deleting for a key we cannot vouch for would be
  // aiming a delete at an object the caller merely named.
  assert.equal(bare, 3);
});

/* ---- the fallback the cleanup itself leans on ------------------- */

const purge = code(read("./image-purge.ts"));

test("a refused delete is queued for the nightly drain, not logged and lost", () => {
  const queue = bodyOf(purge, "queue");
  assert.ok(queue.includes("pendingImagePurge.createMany"));
  // Both entry points must reach it, and only on the failure branch.
  assert.ok(/if \(await delImageByKey\(key\)\) return;\s*await queue\(/.test(purge));
  assert.ok(bodyOf(purge, "purgeImageUrls").includes("!results[i]"));
});
