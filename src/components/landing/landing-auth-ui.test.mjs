import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const sidebarPath = new URL("../layout/sidebar.tsx", import.meta.url);

test("Support navigation uses Lucide HeartHandshake", async () => {
  const source = await readFile(sidebarPath, "utf8");

  assert.match(source, /\bHeartHandshake,?/);
  assert.match(source, /href: "\/support", label: "Support", icon: HeartHandshake/);
  assert.doesNotMatch(source, /\bPiggyBank\b/);
});
