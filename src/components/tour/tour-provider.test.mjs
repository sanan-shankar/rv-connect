import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const providerPath = new URL("./tour-provider.tsx", import.meta.url);

test("TourProvider defaults auto-offers off and delegates the dormant decision lazily", async () => {
  const source = await readFile(providerPath, "utf8");

  assert.match(source, /autoOffer\?: boolean;/);
  assert.match(source, /autoOffer = false/);
  assert.match(source, /shouldAutoOfferTour\(\{\s*autoOffer,\s*pathname,\s*phase,/);
  assert.match(source, /hasSeenOnboarding: \(\) => hasSeenOnboarding\(userId\)/);
  assert.match(source, /hasSettledTour: \(\) => hasSettledTour\(userId\)/);
  assert.match(source, /\[autoOffer, pathname, phase, userId\]/);
});

test("TourProvider keeps manual start exposed independently of the auto-offer gate", async () => {
  const source = await readFile(providerPath, "utf8");

  assert.match(source, /const start = useCallback\(\(\) => \{[\s\S]*?setPhase\("running"\);/);
  assert.match(source, /<TourContext\.Provider value=\{\{ start \}\}>/);
});
