"use client";

import { useRouter } from "next/navigation";
import type { OnboardingUser } from "../types";
import { firstName, StepActions, StepHead, StepNext, YouCard } from "../step-kit";

/**
 * Step 5: Done. The Directory card the member met on Welcome, now with
 * whatever they added, which is the whole point of the last four screens.
 * No auto-redirect timer: the person leaves on their own click, while the
 * post-signup hoopoe plays (onboarding-flow.tsx mounts it here).
 *
 * `next` is normally the feed, but someone who arrived from an invite link is
 * sent back to it, so the thing they originally clicked is the thing they land
 * on. The button says where it goes either way.
 */
export function DoneStep({ user, next = "/feed" }: { user: OnboardingUser; next?: string }) {
  const router = useRouter();
  const who = user.accountType === "alumnus" ? "Batchmates" : "Old students";

  return (
    <>
      <StepHead
        title={`You're in, ${firstName(user.name)}.`}
        line={`${who} can find you in the Directory now.`}
      />
      <div className="mt-[var(--space-m)]">
        <YouCard user={user} />
      </div>
      <StepActions>
        <StepNext type="button" onClick={() => router.push(next)}>
          {next === "/feed" ? "Go to the feed" : "Continue"}
        </StepNext>
      </StepActions>
    </>
  );
}
