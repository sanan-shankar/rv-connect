import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const verifiedMarkPath = new URL("./verified-mark.tsx", import.meta.url);

/* The wording is an owner decision (abb9381): the leaf says "Verified", not
   "Verified member". Its padding and type metrics are not pinned here -- that
   is `npm run visual`'s job, and pinning class strings only breaks the suite
   every time someone adjusts spacing. */
test("the member leaf tooltip says only Verified", async () => {
  const source = await readFile(verifiedMarkPath, "utf8");

  assert.match(source, /: "Verified";/);
  assert.doesNotMatch(source, /Verified member/);
});

/* The label was an absolute child of the leaf, so the post card's
   overflow-hidden and the name row's overflow-x-clip sliced it (owner,
   2026-09-15). It must render through a portal, where no ancestor can clip. */
test("the leaf's label renders in a portal, out of reach of clipping ancestors", async () => {
  const source = await readFile(verifiedMarkPath, "utf8");

  assert.match(source, /<Tooltip\.Portal>/);
  assert.doesNotMatch(source, /absolute top-1\/2/);
});
