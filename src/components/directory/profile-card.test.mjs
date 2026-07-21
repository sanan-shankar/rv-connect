import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const profileCardPath = new URL("./profile-card.tsx", import.meta.url);

test("directory cards shorten the stored disambiguated location label", async () => {
  const source = await readFile(profileCardPath, "utf8");

  assert.match(source, /shortPlaceLabel\(user\.currentCity\)/);
  assert.doesNotMatch(source, /\{user\.currentCity\}/);
});
