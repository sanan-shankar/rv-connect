"use client";

/* ------------------------------------------------------------------ *
 *  OnboardingFlow — the post-signup guided setup. Five steps: Welcome,
 *  The register (admission number, city, profession), Houses (year by
 *  year), Photo, Done. Teacher accounts get four: Houses is a student
 *  record, so their order skips it and the register step hides the
 *  admission field. So does anyone whose years here are unknown, because
 *  the chain editor has nothing to lay out without them. Every data step
 *  is individually skippable (its own "Skip" advances without saving)
 *  and "Finish later" is always visible in the header, dropping straight
 *  back to /feed at any point. Nothing here is a hard gate: a member can
 *  use the whole site having completed none of it.
 *
 *  One sheet, anchored to the top of the page, with the header (Back,
 *  the dots, Finish later) along its top edge and only the step inside
 *  it changing. The wizard used to centre each step vertically in 65vh,
 *  so the dots sat at a different height on every step (425, 253, 393
 *  and 253px down a phone) and jumped as you went; the header on the
 *  photograph wash also left the upcoming dots nearly invisible. On the
 *  sheet's paper they read the way the guide's chapters show them.
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
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { AnimatePresence, m } from "motion/react";
import { SPRINGS } from "@/components/common/motion";
import { careerRange } from "@/lib/house-spans";
import { cn } from "@/lib/utils";
import { StepDots } from "@/components/common/step-dots";
import { hasFired, markFired } from "@/components/mascot/moments/one-shot";
import { ONBOARDING_SEEN, type OnboardingStepId, type OnboardingUser } from "./types";
import { ChevronLeft } from "lucide-react";
import { WelcomeStep } from "./steps/welcome-step";
import { DoneStep } from "./steps/done-step";

/* THE THREE HEAVY STEPS ARRIVE ONE CLICK BEFORE THEY ARE NEEDED. Welcome is a
   heading, a paragraph and a button, and it was costing every new member 115 KB
   of the steps behind it: the register step's LocationPicker drags base-ui's
   combobox (53 KB), houses drags the chain editor and a popover (29 KB), photo
   drags the crop and attach dialogs (33 KB). A step switch is state, so all
   five shipped whichever one rendered. Every new member pays that once, on a
   phone, straight after signing up -- the slowest connection they will ever use
   this site on.

   SSR IS LEFT ON deliberately (no `ssr: false`): `?step=register` is a real
   deep link and `ready` starts true for one, so these DO render at rest. The
   split is a client-chunk split, not a paint deferral. `PRELOAD` below fetches
   the next step as soon as the current one is on screen, so "Let's go" never
   waits on a network round trip. */
const RegisterStep = dynamic(() => import("./steps/register-step").then((m) => m.RegisterStep));
const HousesStep = dynamic(() => import("./steps/houses-step").then((m) => m.HousesStep));
const PhotoStep = dynamic(() => import("./steps/photo-step").then((m) => m.PhotoStep));

const PRELOAD: Partial<Record<OnboardingStepId, () => Promise<unknown>>> = {
  register: () => import("./steps/register-step"),
  houses: () => import("./steps/houses-step"),
  photo: () => import("./steps/photo-step"),
};

const STEP_ORDER: OnboardingStepId[] = ["welcome", "register", "houses", "photo", "done"];

/* Back and Finish later: bare text, so no state layer (a tint behind two
   words reads as a stray chip), and the opacity is the press answer. The
   vertical padding is taken back by the negative margin, so the words sit
   in a 13px line while the finger gets 44px (DESIGN-SYSTEM §10). */
const BARE =
  "-my-3 inline-flex items-center gap-0.5 rounded-sm py-3 text-[13px] font-medium text-muted-foreground transition-[color,opacity] duration-150 hover:text-foreground active:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

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
  const stepOrder =
    isTeacher || !careerRange(user.yearJoined, user.yearLeft)
      ? STEP_ORDER.filter((id) => id !== "houses")
      : STEP_ORDER;
  const [step, setStep] = useState<OnboardingStepId>(
    // A ?step=houses deep link with no houses step (a teacher, or no years)
    // has no screen to land on; the register step is the nearest real one.
    stepOrder.includes(initialStep) ? initialStep : "register"
  );
  // Deep links (?step=...) render immediately; a bare "welcome" arrival
  // waits the one tick the mount effect below needs to decide whether to
  // bounce an already-onboarded visitor away, so that never flashes first.
  const [ready, setReady] = useState(initialStep !== "welcome");
  /* What the steps have saved this visit, laid over the page's row. The page
     does re-run after each save, but the Directory card on Done and a step
     revisited with Back should show what was just entered without depending
     on that refresh having landed. */
  const [saved, setSaved] = useState<Partial<OnboardingUser>>({});
  const current: OnboardingUser = { ...user, ...saved };
  const save = (patch: Partial<OnboardingUser>) => setSaved((s) => ({ ...s, ...patch }));

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
  //    past Welcome a second time. That is a one-shot latch in localStorage,
  //    so it IS the mascot's one-shot latch: `hasFired`/`markFired` under the
  //    ONBOARDING_SEEN key. It used to be its own 28-line module with its own
  //    prefix, which is the same machine wearing a second name.
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
      markFired(user.id, ONBOARDING_SEEN);
      return;
    }
    if (user.admissionNumber != null) {
      router.replace(next);
      return; // stay !ready — /feed takes over in a moment
    }
    if (hasFired(user.id, ONBOARDING_SEEN)) {
      setStep("register");
    } else {
      markFired(user.id, ONBOARDING_SEEN);
    }
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Fetch the step AFTER this one while this one is being read. A hook, so it
     has to sit above the `!ready` return: the flow renders null for one tick on
     a bare /welcome arrival, and a preload that only started after that tick
     would be racing the button. Not everybody has a houses step, so
     `stepOrder` decides what "next" means rather than STEP_ORDER. */
  const upcoming = stepOrder[stepOrder.indexOf(step) + 1];
  useEffect(() => {
    void PRELOAD[upcoming]?.();
  }, [upcoming]);

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
    markFired(user.id, ONBOARDING_SEEN);
    router.push(next);
  }

  return (
    <div className="mx-auto w-full max-w-[460px] sm:pt-[var(--space-xl)]">
      <div className="card-elevated rounded-[var(--radius)] border border-border bg-card p-[var(--space-m)] sm:p-[var(--space-l)]">
        {step !== "done" && (
          <div className="mb-[var(--space-l)] grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            {index > 0 ? (
              <button type="button" onClick={goBack} className={cn(BARE, "-ml-1 justify-self-start")}>
                <ChevronLeft className="size-4" aria-hidden />
                Back
              </button>
            ) : (
              <span />
            )}
            <StepDots
              count={dotSteps.length}
              current={index}
              onPick={(i) => setStep(dotSteps[i])}
              labelFor={(i) => `Go back to step ${i + 1}`}
            />
            <button type="button" onClick={finishLater} className={cn(BARE, "justify-self-end")}>
              Finish later
            </button>
          </div>
        )}

        <AnimatePresence mode="wait" initial={false}>
          <m.div
            key={step}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={SPRINGS.gentle}
            className="w-full"
          >
            {step === "welcome" && (
              <WelcomeStep user={current} onNext={goNext} />
            )}
            {step === "register" && (
              <RegisterStep user={current} onSaved={save} onNext={goNext} onSkip={goNext} />
            )}
            {step === "houses" && (
              <HousesStep user={current} onSaved={save} onNext={goNext} onSkip={goNext} />
            )}
            {step === "photo" && (
              <PhotoStep user={current} onSaved={save} onNext={goNext} onSkip={goNext} />
            )}
            {step === "done" && <DoneStep user={current} next={next} />}
          </m.div>
        </AnimatePresence>
      </div>

      {/* Only mounted once the wizard actually reaches Done, so the
          one-shot post-signup celebration plays as the finishing beat, not
          a distraction on the first, bare "Welcome" screen. */}
      {step === "done" && celebration}
    </div>
  );
}
