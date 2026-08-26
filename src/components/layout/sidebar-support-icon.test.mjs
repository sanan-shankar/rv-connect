import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const sidebarPath = new URL("./sidebar.tsx", import.meta.url);

/* The Support row's icon has moved twice: PiggyBank, then Lucide's
   HeartHandshake, then Phosphor's Tree (owner, 2026-07-18, commit a2279ff
   "changed support icon"). A tree, because Support is about the valley
   itself rather than a transaction, and PiggyBank in particular read as a
   donation box.

   This test guarded the HeartHandshake step and was never updated when the
   owner moved on, so it sat red for three weeks asserting a reverted
   decision. It now asserts what actually ships. The PiggyBank check is the
   part still worth keeping: that one was rejected on meaning, not taste. */
test("Support navigation uses the Phosphor Tree icon", async () => {
  const source = await readFile(sidebarPath, "utf8");

  assert.match(source, /Tree as PhosphorTree/);
  assert.doesNotMatch(source, /\bPiggyBank\b/);
});
