import assert from "node:assert/strict";
import test from "node:test";

import { shouldAutoOfferTour } from "./tour-auto-offer.ts";

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
