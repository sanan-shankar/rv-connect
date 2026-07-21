import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const directoryModulePath = new URL("./directory-module.tsx", import.meta.url);

test("New in the directory shortens stored disambiguated location labels", async () => {
  const source = await readFile(directoryModulePath, "utf8");

  assert.match(source, /shortPlaceLabel\(m\.currentCity\)/);
  assert.doesNotMatch(source, /` · \$\{m\.currentCity\}`/);
});
