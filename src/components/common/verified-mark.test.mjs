import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const verifiedMarkPath = new URL("./verified-mark.tsx", import.meta.url);

test("the member leaf tooltip says only Verified", async () => {
  const source = await readFile(verifiedMarkPath, "utf8");

  assert.match(source, /: "Verified";/);
  assert.doesNotMatch(source, /Verified member/);
});

test("the leaf tooltip owns compact type metrics and optical centering", async () => {
  const source = await readFile(verifiedMarkPath, "utf8");

  assert.match(source, /inline-flex items-center/);
  assert.match(source, /px-\[var\(--space-m\)\] py-\[var\(--space-xs\)\]/);
  assert.match(source, /text-\[0\.6875rem\] leading-\[1\.25\]/);
  assert.match(source, /className="translate-y-px"/);
});
