"use client";

/* ------------------------------------------------------------------ *
 *  OnboardingFlow — the post-signup guided setup. Five steps: Welcome,
 *  The register (admission number, city, profession), Houses (year by
 *  year), Photo, Done. Teacher accounts get four: Houses is a student
 *  record, so their order skips it and the register step hides the
 *  admission field. Every data step is individually skippable (its
 *  own "Skip for now" advances without saving) and "Finish later" is
 *  always visible in the header, dropping straight back to /feed at any
 *  point. Nothing here is a hard gate: a member can use the whole site
 *  having completed none of it.
 *
 *  The one hoopoe for this route is rendered by the server page
 *  (`<CelebrationSignals>` in welcome/page.tsx), passed down here as the
 *  `celebration` prop rather than mounted as a page-level sibling. This
 *  component decides WHEN it actually enters the tree: only once the
 *  wizard reaches the "done" step, never earlier.
 *
 *  Earlier, celebration-signals.tsx mounted unconditionally alongside the
 *  wizard, so the celebration's one-shot "postSignupWelcome" fired the
 *  instant a fresh account landed on Welcome (step 1 of 5) and played out
 *  in the corner while the very first, bare, card-less step was still on
 *  screen. Two reviewers flagged the wizard as looking washed out for
 *  the whole flow; the actual root cause turned out to be Welcome/Done
 *  being the only two steps without the same opaque bg-card surface
 *  Register/Houses/Photo already use against the shared AppShell
 *  background wash (fixed in welcome-step.tsx/done-step.tsx), but a
 *  delightful arrival moment competing for attention on the very first,
 *  most bare screen of a five-step wizard was never the right place for
 *  it either. Saving it for Done, the payoff screen where there is
 *  nothing left to read or fill in, is both a better tell for the eye
 *  and a better story: you finish, then the bird throws confetti.
 * ------------------------------------------------------------------ */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { SPRINGS } from "@/components/common/motion";
import { cn } from "@/lib/utils";
import { hasSeenOnboarding, markOnboardingSeen } from "@/lib/onboarding-local";
import type { PlaceSelection } from "@/components/common/location-picker";
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
  birdOverride: string | null;
  accountType: string; // "alumnus" | "teacher" | "ex_teacher"
  admissionNumber: number | null;
  subjects: string | null;
  places: PlaceSelection[];
  workplace: string | null;
  jobTitle: string | null;
  yearJoined: number | null;
  yearLeft: number | null;
}

export function OnboardingFlow({
  user,
  initialStep,
  celebration,
  next = "/feed",
}: {
  user: OnboardingUser;
  initialStep: OnboardingStepId;
  /** Where finishing (or skipping) lands. Defaults to the feed; an invite link
   *  followed before signing up passes itself here so the person ends up back
   *  on the invitation instead. Already validated by safeNextPath upstream. */
  next?: string;
  /** The already-rendered `<CelebrationSignals>` server component, handed
   *  down so this client component controls exactly when it enters the
   *  tree (see the file comment above). */
  celebration: React.ReactNode;
}) {
  const router = useRouter();
  // Teachers have no admission number and no houses: both are student-record
  // facts, so their wizard drops the Houses step entirely (and the register
  // step hides its admission field). Derived from the same accountType the
  // signup form collected.
  const isTeacher = user.accountType !== "alumnus";
  const stepOrder = isTeacher ? STEP_ORDER.filter((id) => id !== "houses") : STEP_ORDER;
  const [step, setStep] = useState<OnboardingStepId>(
    // A ?step=houses deep link on a teacher account has no screen to land on;
    // the register step is the nearest real one.
    stepOrder.includes(initialStep) ? initialStep : "register"
  );
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
      router.replace(next);
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

  const index = stepOrder.indexOf(step);
  const dotSteps = stepOrder.slice(0, -1); // "done" has no dot of its own

  function goNext() {
    const next = stepOrder[stepOrder.indexOf(step) + 1];
    if (next) setStep(next);
  }
  function goBack() {
    const prev = stepOrder[stepOrder.indexOf(step) - 1];
    if (prev) setStep(prev);
  }
  function finishLater() {
    markOnboardingSeen(user.id);
    router.push(next);
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
                    "h-2 rounded-full transition-[width,background-color,opacity] duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
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
            // Bare text, so no state layer (a tint behind two words reads as a
            // stray chip). It was missing the press answer, hence the opacity.
            className="shrink-0 rounded-sm text-[13px] font-medium text-muted-foreground transition-[color,opacity] duration-150 hover:text-foreground active:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
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
          {step === "done" && <DoneStep name={user.name} next={next} />}
        </motion.div>
      </AnimatePresence>

      {/* Only mounted once the wizard actually reaches Done, so the
          one-shot post-signup celebration plays as the finishing beat, not
          a distraction on the first, bare "Welcome" screen. */}
      {step === "done" && celebration}
    </div>
  );
}
