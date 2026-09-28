"use client";

import type { OnboardingUser } from "../types";
import { firstName, StepActions, StepHead, StepNext, YouCard } from "../step-kit";

/**
 * Step 1: Welcome. Greets by first name and shows the member their own
 * Directory card as it stands, a bird, a name and a batch, which is what the
 * next steps fill in. The card needs no caption: it is plainly them (the owner
 * cut "This is you in the Directory", 2026-09-28: "so cringe"). Nothing about
 * the steps being quick or optional either; the Skip on each one says that.
 *
 * The hoopoe's post-signup welcome plays on Done, not here (see
 * onboarding-flow.tsx), so there is never a second bird on screen.
 */
export function WelcomeStep({
  user,
  onNext,
}: {
  user: OnboardingUser;
  onNext: () => void;
}) {
  const who = user.accountType === "alumnus" ? "batchmates" : "old students";

  return (
    <>
      <StepHead
        as="h1"
        title={`Welcome, ${firstName(user.name)}.`}
        line={`Add a few details so your ${who} can find you.`}
      />
      <div className="mt-[var(--space-m)]">
        <YouCard user={user} />
      </div>
      <StepActions>
        <StepNext type="button" onClick={onNext}>
          Start
        </StepNext>
      </StepActions>
    </>
  );
}
