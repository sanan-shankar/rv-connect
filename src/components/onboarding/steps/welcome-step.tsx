"use client";

import type { OnboardingUser } from "../types";
import { firstName, StepActions, StepHead, StepNext, YouCard } from "../step-kit";

/**
 * Step 1: Welcome. Greets by first name and shows the member their own
 * Directory card as it stands, a bird, a name and a batch, which is what the
 * next steps fill in. The line names those steps rather than promising they
 * are quick or optional; the Skip beside every button already says that.
 *
 * The hoopoe's post-signup welcome plays on Done, not here (see
 * onboarding-flow.tsx), so there is never a second bird on screen.
 */
export function WelcomeStep({
  user,
  hasHouses,
  onNext,
}: {
  user: OnboardingUser;
  /** False for teachers and for anyone whose years are unknown: they have no
   *  houses step, so the line does not promise one. */
  hasHouses: boolean;
  onNext: () => void;
}) {
  const who = user.accountType === "alumnus" ? "batchmates" : "old students";

  return (
    <>
      <StepHead
        as="h1"
        title={`Welcome, ${firstName(user.name)}.`}
        line={`This is you in the Directory. Add where you live${hasHouses ? ", what you do and your houses" : " and what you do"} so ${who} can find you.`}
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
