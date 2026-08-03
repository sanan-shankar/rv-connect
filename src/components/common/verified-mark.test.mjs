import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const verifiedMarkPath = new URL("./verified-mark.tsx", import.meta.url);

test("the member leaf tooltip says only Verified", async () => {
  const source = await readFile(verifiedMarkPath, "utf8");

  assert.match(source, /: "Verified";/);
  assert.doesNotMatch(source, /Verified member/);
});
