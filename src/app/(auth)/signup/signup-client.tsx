"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { TriviaGate } from "@/components/auth/trivia-gate";
import { SignupForm } from "@/components/auth/signup-form";
import { Hoopoe } from "@/components/mascot/hoopoe";
import { useHoopoe } from "@/components/mascot/use-hoopoe";
import { AuthPhotoPanel } from "@/components/auth/auth-panel";
import type { HoopoeApi } from "@/components/mascot/hoopoe-kit";
import { HoopoeWarmup } from "@/components/mascot/hoopoe-warmup";
import { SPRINGS } from "@/components/common/motion";
import { cn } from "@/lib/utils";
import { PERCH_LIFT_PX } from "@/components/mascot/mascot-flight";
import { useFlightArrival } from "@/components/mascot/use-flight-arrival";
import { nextPathFromLocation } from "@/lib/next-path";

type Step = "trivia" | "register";

export default function SignupClient({
  turnstileSiteKey,
}: {
  turnstileSiteKey: string | null;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("trivia");
  // Read by runIntro below, which fires from flight-handoff / fly-in
  // callbacks whose closures were captured long before the step could
  // change; the ref always answers with the step on screen NOW. Synced in
  // an effect (not during render, which the refs lint rightly rejects);
  // every reader is itself an async callback that runs strictly after the
  // commit that changed the step, so the effect is never stale for them.
  const stepRef = useRef<Step>("trivia");
  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  // ONE hoopoe, hoisted here and handed to both steps, so the same bird greets
  // you, quizzes you (reacting to a right or wrong answer), then watches you
  // fill the form and covers its eyes over your password. It is continuous
  // across the step change because it never unmounts. We split the ref off and
  // pass only the (stable) controller verbs to the steps; the page re-renders
  // only on the step swap, so the forwarded object identity stays steady.
  const { ref: hoopoeRef, ...hoopoe } = useHoopoe();

  const introDone = useRef(false);

  // A warm greeting: happy, a wave, a crest flick, then it just rests.
  // On a flight arrival this runs at handoff (the flyer having just landed).
  //
  // There used to be an `api.express("curious")` on the next line, meant to
  // read as the bird leaning in ready to quiz you. It did not land where it
  // looked like it would. `react()` is deliberately NOT enqueued: it awaits
  // each verb in turn, so at this instant only the greet's FIRST step (the
  // wave) is in the queue, and a verb called synchronously on the next line
  // jumps in behind it, ahead of the greet's own remaining steps. The real
  // running order was wave -> curious -> happy -> crestFlick, which is why
  // the brows the owner objected to appeared right at the wave's tail:
  // `curious` carries brow.op 0.5. Removed rather than resequenced, because
  // the owner's read of the finished moment ("the happy is fine, and then the
  // crest flick is awesome ... and then it rests nicely") has no room in it
  // for a fourth pose. If a curious beat is ever wanted back, it belongs
  // INSIDE the greet sequence, not called alongside it.
  function runIntro(api: HoopoeApi) {
    // Self-guarding, because useFlightArrival calls this from every arrival
    // path and the failsafe can bring two of them together.
    if (introDone.current) return;
    // A greet belongs to the trivia step it was aimed at. On a flight
    // arrival the handoff can land AFTER a fast visitor has already
    // answered the question, and greeting then is worse than pointless:
    // the form's mount effect has tucked the wings over the (hidden)
    // password by the time the greet's wave runs, and the wave writes the
    // wing rotations right over the tuck, stranding the wings half-hung at
    // the bird's sides (owner's Safari screenshots, 2026-08-18). If the
    // moment has passed, let it pass; the tuck is the correct pose now.
    introDone.current = true;
    if (stepRef.current !== "trivia") return;
    api.react("greet");
  }

  // How the bird gets here: the landing "Join" flight on a desktop, or a
  // descent from off-screen on a phone, plus everything that keeps this page's
  // own hoopoe hidden and pixel-aligned until the flyer hands off. /login and
  // the three email pages run the same hook; the greeting above is what
  // differs.
  const { hoopoeBoxRef, entranceRef, hoopoeShown, preFlightVeil, onHoopoeReady, reportPerchRect } =
    useFlightArrival({ flightKey: "signup", runIntro });

  return (
    // Not a grid: the photo half is viewport-fixed (below), so it must never take part
    // in row-height sizing with the form column. `lg:pl-[...]` reserves the same width
    // the fixed panel occupies, so the form content starts right where the photo ends.
    <div className="min-h-screen lg:pl-[58.3333%]">
      <AuthPhotoPanel />

      {/* Form half: warm panel. The inner content slides in from the right on the
          gentle spring while the photo half stays anchored (lateral pass from the
          landing), the way /login does. The hoopoe sits above the steps and stays
          mounted across the trivia -> register swap; only the step content crossfades. */}
      <div className="flex min-h-screen flex-col bg-background px-[var(--space-l)] py-[var(--space-l)]">
        <Link
          href="/"
          className="inline-flex items-center gap-1 self-start rounded-sm text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>

        <motion.div
          ref={entranceRef}
          // Anchoring is per step. The short trivia step centres (`my-auto`);
          // one fixed anchor for both left it hanging high over a void, the
          // owner's "spaced weird, not in the middle". The register step is
          // top-anchored, because `my-auto` there re-centred the column every
          // time its height changed, so flipping Alumnus/Teacher moved the
          // very control being clicked (and on mobile the shrinking page
          // yanked the scroll with it). `layout="position"` glides the column
          // between the two anchors at the step swap - position only, never
          // size, which is the stretch-free variant - so the bird rises to
          // make room for the form instead of teleporting.
          layout="position"
          className={cn(
            "w-full max-w-[400px] self-center text-center",
            step === "trivia" ? "my-auto" : "mt-[8vh] mb-auto"
          )}
          initial={{ opacity: 0, x: 48 }}
          animate={{ opacity: 1, x: 0 }}
          transition={SPRINGS.gentle}
          onAnimationComplete={reportPerchRect}
        >
          <div className={cn("mx-auto mb-1 grid h-[112px] place-items-center", preFlightVeil && "max-lg:opacity-0")}>
            {/* Tight box around the SVG so its rect is the exact perch target;
                hidden + idle-off until the flyer hands off, then revealed with
                NO fade (the flyer holds two frames over this exact rect, so two
                identical opaque birds swap invisibly — a fade dipped the
                stack's combined opacity and read as a dissolve). The box rides
                PERCH_LIFT_PX high (argued in mascot-flight.ts); its measured
                rect includes the lift, so report, flyer and bird all agree. */}
            <div
              ref={hoopoeBoxRef}
              data-hoopoe-perch
              style={{ opacity: hoopoeShown ? 1 : 0, transform: `translateY(-${PERCH_LIFT_PX}px)` }}
            >
              <Hoopoe ref={hoopoeRef} size={96} onReady={onHoopoeReady} idle={hoopoeShown} />
            </div>
          </div>

          <AnimatePresence mode="wait" initial={false}>
            {step === "trivia" ? (
              <motion.div
                key="trivia"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={SPRINGS.gentle}
              >
                {/* No subtitle here either (owner, 2026-08-14): the question
                    IS the explanation. */}
                <h1 className="font-heading text-[27px] leading-tight tracking-tight text-foreground">
                  First, a quick check
                </h1>
                <TriviaGate hoopoe={hoopoe} onPass={() => setStep("register")} />
              </motion.div>
            ) : (
              <motion.div
                key="register"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={SPRINGS.gentle}
              >
                {/* No subtitle: the fields say everything the old grey line
                    said, and the calm is the point (owner reference:
                    Revolut's one-heading form, 2026-08-14). */}
                <h1 className="font-heading text-[27px] leading-tight tracking-tight text-foreground">
                  A bit about yourself
                </h1>
                <SignupForm
                  hoopoe={hoopoe}
                  turnstileSiteKey={turnstileSiteKey}
                  /* ?next= rides on to /welcome so it survives onboarding
                     too: someone who followed a Catch-up invite with no
                     account goes signup -> the five setup steps -> the
                     invitation, instead of being dropped on the feed. */
                  onSuccess={() =>
                    router.push(
                      `/welcome?next=${encodeURIComponent(nextPathFromLocation())}`
                    )
                  }
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Warms the flight rig off-screen in case a visitor lands here directly
          and bounces back to the landing hero to fly again. See
          hoopoe-warmup.tsx. */}
      <HoopoeWarmup />
    </div>
  );
}
