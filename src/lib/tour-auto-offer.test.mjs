import assert from "node:assert/strict";
import test from "node:test";

import { shouldAutoOfferTour } from "./tour-auto-offer.ts";
import { read } from "./test-kit.mjs";

test("automatic tour offers default to disabled without reading local state", () => {
  let onboardingChecks = 0;
  let settledChecks = 0;
  const shouldOffer = shouldAutoOfferTour({
    pathname: "/feed",
    phase: "idle",
    hasSeenOnboarding: () => {
      onboardingChecks += 1;
      return true;
    },
    hasSettledTour: () => {
      settledChecks += 1;
      return false;
    },
  });

  assert.equal(shouldOffer, false);
  assert.equal(onboardingChecks, 0);
  assert.equal(settledChecks, 0);
});

test("an explicit opt-in offers only on the idle feed after onboarding while unsettled", () => {
  const decide = ({ pathname = "/feed", phase = "idle", onboarded = true, settled = false } = {}) =>
    shouldAutoOfferTour({
      autoOffer: true,
      pathname,
      phase,
      hasSeenOnboarding: () => onboarded,
      hasSettledTour: () => settled,
    });

  assert.equal(decide(), true);
  assert.equal(decide({ pathname: "/directory" }), false);
  assert.equal(decide({ phase: "running" }), false);
  assert.equal(decide({ onboarded: false }), false);
  assert.equal(decide({ settled: true }), false);
});

test("ineligible opt-ins avoid local state reads and stop after a failed onboarding check", () => {
  let onboardingChecks = 0;
  let settledChecks = 0;
  const decision = (overrides = {}) =>
    shouldAutoOfferTour({
      autoOffer: true,
      pathname: "/feed",
      phase: "idle",
      hasSeenOnboarding: () => {
        onboardingChecks += 1;
        return false;
      },
      hasSettledTour: () => {
        settledChecks += 1;
        return false;
      },
      ...overrides,
    });

  assert.equal(decision({ pathname: "/directory" }), false);
  assert.equal(decision({ phase: "offering" }), false);
  assert.equal(onboardingChecks, 0);
  assert.equal(settledChecks, 0);

  assert.equal(decision(), false);
  assert.equal(onboardingChecks, 1);
  assert.equal(settledChecks, 0);
});

/* The provider used to have its own test file pinning six literal spellings of
   its wiring -- the dependency array, the JSX of the context provider -- so any
   honest refactor of it went red for no reason. The behaviour it cared about is
   tested above, against the imported function. What is left over, and does not
   survive a rename, is that the provider actually defers to it and starts from
   off. That is two assertions, and they belong here. */
test("the provider defers the decision here, and defaults it off", () => {
  const src = read("src/components/tour/tour-provider.tsx");
  assert.match(src, /shouldAutoOfferTour\(\{/, "the provider decides for itself again");
  assert.match(src, /autoOffer = false/, "auto-offer no longer defaults off");
});
