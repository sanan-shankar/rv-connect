"use client";

/* ------------------------------------------------------------------ *
 *  OnboardingFlow — the post-signup guided setup. Five steps: Welcome,
 *  The register (admission number, city, profession), Houses (year by
 *  year), Photo, Done. Every data step is individually skippable (its
 *  own "Skip for now" advances without saving) and "Finish later" is
 *  always visible in the header, dropping straight back to /feed at any
 *  point. Nothing here is a hard gate: a member can use the whole site
 *  having completed none of it.
 *
 *  The one hoopoe for this route is mounted by the server page
 *  (`<CelebrationSignals>` in welcome/page.tsx), not by any step here
 *  — see that file's comment for why the post-signup welcome moment now
 *  plays on this route instead of /feed.
 * ------------------------------------------------------------------ */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { SPRINGS } from "@/components/common/motion";
import { cn } from "@/lib/utils";
import { hasSeenOnboarding, markOnboardingSeen } from "@/lib/onboarding-local";
import { WelcomeStep } from "./steps/welcome-step";
import { RegisterStep } from "./steps/register-step";
import { HousesStep } from "./steps/houses-step";
import { PhotoStep } from "./steps/photo-step";
import { DoneStep } from "./steps/done-step";

export type OnboardingStepId = "welcome" | "register" | "houses" | "photo" | "done";

const STEP_ORDER: OnboardingStepId[] = ["welcome", "register", "houses", "photo", "done"];

export interface OnboardingUser {
  id: string;
  name: string;
  photoUrl: string | null;
  avatarColor: string | null;
  admissionNumber: number | null;
  currentCity: string | null;
  workplace: string | null;
  jobTitle: string | null;
  yearJoined: number | null;
  yearLeft: number | null;
}

export function OnboardingFlow({
  user,
  initialStep,
}: {
  user: OnboardingUser;
  initialStep: OnboardingStepId;
}) {
  const router = useRouter();
  const [step, setStep] = useState<OnboardingStepId>(initialStep);
  // Deep links (?step=...) render immediately; a bare "welcome" arrival
  // waits the one tick the mount effect below needs to decide whether to
  // bounce an already-onboarded visitor away, so that never flashes first.
  const [ready, setReady] = useState(initialStep !== "welcome");

  // Two things get decided here, both client-only and both exactly once:
  //
  // 1. "Already onboarded, don't force the wizard on them" — deliberately
  //    NOT a server redirect() (see welcome/page.tsx's comment on why: this
  //    page's own actions cause Next to refetch this route's server data,
  //    admissionNumber included, so a server-side check would fire the
  //    INSTANT the register step saves and bounce mid-wizard). Reading
  //    user.admissionNumber here, inside an effect that only ever runs once
  //    per true mount, captures its value from the first paint only — a
  //    later data refresh from this page's own actions changes the prop but
  //    never re-enters this branch.
  // 2. The "seen before but didn't finish" resume-where-you-left-off skip
  //    past Welcome a second time (localStorage — onboarding-local.ts).
  //
  // hasCheckedRef makes this idempotent under React Strict Mode's dev-only
  // double effect invocation (mount -> cleanup -> mount again, same
  // instance): without it, the "not seen" branch's own write would be
  // visible to the second pass and wrongly read as "seen", skipping a
  // brand-new account straight past Welcome.
  const hasCheckedRef = useRef(false);
  useEffect(() => {
    if (hasCheckedRef.current) return;
    hasCheckedRef.current = true;
    if (initialStep !== "welcome") {
      markOnboardingSeen(user.id);
      return;
    }
    if (user.admissionNumber != null) {
      router.replace("/feed");
      return; // stay !ready — /feed takes over in a moment
    }
    if (hasSeenOnboarding(user.id)) {
      setStep("register");
    } else {
      markOnboardingSeen(user.id);
    }
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!ready) return null;

  const index = STEP_ORDER.indexOf(step);
  const dotSteps = STEP_ORDER.slice(0, -1); // "done" has no dot of its own

  function goNext() {
    const next = STEP_ORDER[STEP_ORDER.indexOf(step) + 1];
    if (next) setStep(next);
  }
  function goBack() {
    const prev = STEP_ORDER[STEP_ORDER.indexOf(step) - 1];
    if (prev) setStep(prev);
  }
  function finishLater() {
    markOnboardingSeen(user.id);
    router.push("/feed");
  }

  return (
    <div className="mx-auto flex min-h-[65vh] w-full max-w-[460px] flex-col justify-center py-[var(--space-xl)]">
      {step !== "done" && (
        <div className="mb-[var(--space-l)] flex items-center justify-between gap-3">
          <div
            className="flex items-center gap-[var(--space-xs)]"
            role="group"
            aria-label={`Step ${index + 1} of ${dotSteps.length}`}
          >
            {dotSteps.map((id, i) => {
              const state = i === index ? "current" : i < index ? "done" : "upcoming";
              return (
                <button
                  key={id}
                  type="button"
                  aria-label={`Go back to step ${i + 1}`}
                  aria-current={state === "current" ? "step" : undefined}
                  disabled={state === "upcoming"}
                  onClick={() => state !== "upcoming" && setStep(id)}
                  className={cn(
                    "h-2 rounded-full transition-[width,background-color,opacity] duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                    state === "current" && "w-6 bg-canopy",
                    state === "done" && "w-2 cursor-pointer bg-canopy/45 hover:bg-canopy/70",
                    state === "upcoming" && "w-2 cursor-default bg-border"
                  )}
                />
              );
            })}
          </div>
          <button
            type="button"
            onClick={finishLater}
            className="shrink-0 rounded-sm text-[13px] font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            Finish later
          </button>
        </div>
      )}

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={SPRINGS.gentle}
          className="w-full"
        >
          {step === "welcome" && <WelcomeStep name={user.name} onNext={goNext} />}
          {step === "register" && (
            <RegisterStep user={user} onNext={goNext} onBack={goBack} onSkip={goNext} />
          )}
          {step === "houses" && (
            <HousesStep user={user} onNext={goNext} onBack={goBack} onSkip={goNext} />
          )}
          {step === "photo" && (
            <PhotoStep user={user} onNext={goNext} onBack={goBack} onSkip={goNext} />
          )}
          {step === "done" && <DoneStep name={user.name} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
