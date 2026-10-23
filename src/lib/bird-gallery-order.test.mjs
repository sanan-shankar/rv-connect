import assert from "node:assert/strict";
import test from "node:test";
import { read } from "./test-kit.mjs";
import { GALLERY_ORDER } from "../components/common/bird-gallery-order.ts";

/* The birds page and the paid picker show the birds in GALLERY_ORDER, a curated order
 * (bird-gallery-order.ts). GALLERY_SPECIES drops any name it cannot find, so a bird added to the
 * drawings but not to the order would quietly vanish from both pages, and a renamed one would too.
 * This pins the order to exactly the names the gallery may show: every species except the Indian
 * Roller (the owner's alone) and any " (candidate)" drawing, each once. */
test("the gallery order lists every showable species exactly once", () => {
  const src = read("src/components/common/bird-avatar-v2.tsx");
  const at = src.indexOf("export const SPECIES_FULL_NAMES: string[] = [");
  assert.ok(at >= 0, "bird-avatar-v2.tsx moved SPECIES_FULL_NAMES; update the anchor");
  const names = [...src.slice(at, src.indexOf("];", at)).matchAll(/^\s*"([^"\n]+)",?/gm)].map((m) => m[1]);
  const showable = names.filter((n) => n !== "Indian Roller" && !n.endsWith(" (candidate)"));
  assert.ok(names.includes("Indian Roller"), "the Roller's full name changed; update this test");

  const seen = new Set();
  for (const name of GALLERY_ORDER) {
    assert.ok(!seen.has(name), `${name} is listed twice`);
    seen.add(name);
    assert.ok(showable.includes(name), `${name} is not a showable species (renamed, the Roller, or a candidate)`);
  }
  const missing = showable.filter((n) => !seen.has(n));
  assert.deepEqual(missing, [], `place these in bird-gallery-order.ts: ${missing.join(", ")}`);
});
