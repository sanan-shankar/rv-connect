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
