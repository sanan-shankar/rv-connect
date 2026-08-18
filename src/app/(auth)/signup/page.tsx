"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { TriviaGate } from "@/components/auth/trivia-gate";
import { SignupForm } from "@/components/auth/signup-form";
import { Hoopoe } from "@/components/mascot/hoopoe";
import { useHoopoe } from "@/components/mascot/use-hoopoe";
import type { HoopoeApi } from "@/components/mascot/hoopoe-kit";
import { HoopoeWarmup } from "@/components/mascot/hoopoe-warmup";
import { Wordmark } from "@/components/layout/peaks-mark";
import { SPRINGS } from "@/components/common/motion";
import { cn } from "@/lib/utils";
import { HERO_IMAGE_SRC, HERO_IMAGE_BLUR } from "@/components/landing/hero-photo";
import { reportPerch, onHandoff, FLIGHT_FLAG, PERCH_LIFT_PX } from "@/components/mascot/mascot-flight";
import { nextPathFromLocation } from "@/lib/next-path";

type Step = "trivia" | "register";

export default function SignupPage() {
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

  // When the ONE hoopoe is flying in from the landing "Join" CTA, keep this
  // page's own hoopoe hidden + at rest until the flyer lands and hands off, so
  // only one bird is ever on screen. A direct visit shows it from the start.
  const [arrivedViaFlight] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.sessionStorage.getItem(FLIGHT_FLAG) === "signup";
    } catch {
      return false;
    }
  });

  // Mobile has no Join button to launch a cross-page flight from (the photo
  // panel and its CTA only exist at lg+), so on a narrow viewport the owner
  // wants the same "one bird" feeling delivered a different way: the page
  // loads bare, then ~500ms later the hoopoe flies itself in from off-screen
  // and perches exactly where the static mascot would otherwise sit. Decided
  // once at mount via the identical `min-width: 1024px` gate the landing
  // hero's desktop-only flight uses, so it never fires on a viewport wide
  // enough to have gotten the button-to-perch flight instead. The
  // `arrivedViaFlight` check guards the (practically-impossible but
  // guarded-for) case of a desktop flight landing on a since-narrowed
  // viewport: that arrival already has its own reveal path below and must
  // never also trigger this one, or two hoopoes could end up in the air.
  const [mobileFlyIn] = useState(() => {
    if (typeof window === "undefined") return false;
    if (arrivedViaFlight) return false;
    try {
      return !window.matchMedia("(min-width: 1024px)").matches;
    } catch {
      return false;
    }
  });
  // Guards the scheduled fly-in so it can only ever fire once.
  const mobileFlyInFired = useRef(false);

  const hoopoeBoxRef = useRef<HTMLDivElement>(null);
  // The form entrance element (the motion.div that slides x 48 -> 0). The
  // perch report below reads its live transform to un-shift rects measured
  // mid-entrance.
  const entranceRef = useRef<HTMLDivElement>(null);
  const hoopoeApiRef = useRef<HoopoeApi | null>(null);
  const introDone = useRef(false);
  // Hidden until the flyer hands off when arriving via a flight; shown from the
  // start on a direct visit (there is no flyer to wait for). Deliberately does
  // NOT also fold in the mobile case here: a mismatched inline `style`
  // attribute between the server render (which can never know the viewport)
  // and the client's first hydration pass is a class of hydration error React
  // does not patch up (it leaves the server value in place until some
  // unrelated update touches the node). The mobile fly-in instead hides the
  // bird with the SSR-safe `max-lg:opacity-0` CLASS below — className swaps
  // hydrate fine, and a media-scoped class is inert at lg+ so the server can
  // render it unconditionally.
  const [hoopoeShown, setHoopoeShown] = useState(!arrivedViaFlight);

  // Mobile fly-in, part 1: the pre-flight veil. Rendered on the bird's OUTER
  // box (the inner box carries an inline opacity, which would beat any class)
  // as `max-lg:opacity-0`, so on a phone the seated bird is invisible from the
  // very first painted frame — including the SSR paint, which the previous
  // hide-after-hydration approach could not cover on a slow device. Lifted
  // before paint for every non-fly-in arrival so a later narrow-resize can
  // never hide a legitimately visible bird; the fly-in effect below lifts it
  // for the mobile path once the bird is posed off-screen.
  const [preFlightVeil, setPreFlightVeil] = useState(true);
  useLayoutEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- deliberate pre-paint lift; see the comment above
    if (!mobileFlyIn) setPreFlightVeil(false);
  }, [mobileFlyIn]);

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

  function onHoopoeReady(api: HoopoeApi) {
    hoopoeApiRef.current = api;
    if (!arrivedViaFlight && !mobileFlyIn) runIntro(api);
  }

  // Where this hoopoe will rest, reported to the flight bus. The form entrance
  // above the bird animates x 48 -> 0 on a spring, so a rect measured while it
  // is still sliding sits shifted by whatever translation remains; subtracting
  // the entrance element's live transform yields the SETTLED rect. That makes
  // the mount-time report below exactly as accurate as the settle-time one —
  // and the mount-time report is the fix for the owner's "lands lower and then
  // corrects" jank: the old single report only fired AFTER the entrance
  // spring finished, ~2s in, when the flyer's cruise had already ended on a
  // provisional guess ~25px low.
  const reportPerchRect = useCallback(() => {
    if (!arrivedViaFlight) return;
    const el = hoopoeBoxRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    let dx = 0;
    let dy = 0;
    const host = entranceRef.current;
    if (host) {
      const t = getComputedStyle(host).transform;
      if (t && t !== "none") {
        const m = new DOMMatrix(t);
        dx = m.e;
        dy = m.f;
      }
    }
    reportPerch({ left: r.left - dx, top: r.top - dy, width: r.width, height: r.height });
  }, [arrivedViaFlight]);

  // Report the perch EARLY — before this page's first paint, while the flyer
  // is still mid-cruise — and keep it fresh (ResizeObserver + resize + scroll,
  // the tour-spotlight measuring pattern) until the handoff makes it moot. The
  // flight bus explicitly supports repeated reports and the flyer retargets
  // smoothly every frame, so the bird is never aiming at a stale rect.
  // `perchWatchStop` lets the handoff reveal below drop the listeners the
  // moment they stop mattering.
  const perchWatchStop = useRef<(() => void) | null>(null);
  // No explicit mount-time call: the ResizeObserver's guaranteed initial
  // delivery IS the mount report, and it arrives in the rendering phase after
  // layout, so it forces nothing. See the full note on the identical effect in
  // (auth)/login/page.tsx — an explicit call here, in any effect scheduling,
  // read geometry before the just-mounted page's first layout and forced a
  // ~85ms synchronous layout that the flight's rAF cruise ate as skipped
  // frames.
  useEffect(() => {
    if (!arrivedViaFlight) return;
    const el = hoopoeBoxRef.current;
    const ro = new ResizeObserver(reportPerchRect);
    if (el) ro.observe(el);
    window.addEventListener("resize", reportPerchRect);
    window.addEventListener("scroll", reportPerchRect, { passive: true, capture: true });
    const stop = () => {
      ro.disconnect();
      window.removeEventListener("resize", reportPerchRect);
      window.removeEventListener("scroll", reportPerchRect, true);
      perchWatchStop.current = null;
    };
    perchWatchStop.current = stop;
    return stop;
  }, [arrivedViaFlight, reportPerchRect]);

  // Flight handoff: reveal + greet when the flyer lands; the fallback timer (set
  // longer than the flyer's own failsafe) guarantees the bird is never stranded
  // hidden.
  useEffect(() => {
    if (!arrivedViaFlight) return;
    try {
      window.sessionStorage.removeItem(FLIGHT_FLAG);
    } catch {
      // storage disabled: nothing to clear
    }
    // One-shot: on the failsafe path the flyer's forced handoff AND the
    // fallback timer below can both land here, and running the greet intro
    // twice queued a double wave.
    let revealed = false;
    const reveal = () => {
      if (revealed) return;
      revealed = true;
      perchWatchStop.current?.();
      setHoopoeShown(true);
      const api = hoopoeApiRef.current;
      if (api && !introDone.current) runIntro(api);
    };
    const unsub = onHandoff(reveal);
    // Must stay ABOVE the flight layer's own failsafe (5800ms at the default
    // speed, mascot-flight-layer.tsx), so the flyer always hands off before
    // this fires and the two birds are never both on screen. Raised 4000 ->
    // 6000 on 2026-08-04 with the slower cruise; the same three numbers live
    // in that file's header comment.
    const fallback = setTimeout(reveal, 6000);
    return () => {
      unsub();
      clearTimeout(fallback);
    };
  }, [arrivedViaFlight]);

  // Mobile fly-in, part 2: ~500ms after the page settles, the hoopoe flies
  // itself in from above the viewport onto its own rest anchor (no target =
  // wherever it is mounted), landing exactly where the static mascot would
  // otherwise sit. `flyIn` is a same-mount primitive (no cross-page bus
  // involved), so no `reportPerch`/`onHandoff` wiring is needed here; it only
  // ever fires when `arrivedViaFlight` is false, so it can never race the
  // flight-bus reveal above.
  useEffect(() => {
    if (!mobileFlyIn) return;
    const timer = setTimeout(() => {
      if (mobileFlyInFired.current) return;
      const api = hoopoeApiRef.current;
      if (!api) {
        // The rig never reported ready (it mounts statically, so this is
        // near-impossible): show the seated bird rather than none at all.
        setPreFlightVeil(false);
        return;
      }
      mobileFlyInFired.current = true;
      // "sky", not "top": the top edge spawns relative to the rig's own box,
      // which sits mid-viewport here, so the bird used to pop in already on
      // screen. The sky edge starts it fully above the VIEWPORT (see
      // offCanvasStart in hoopoe.tsx) for a genuine descent from off-screen.
      void api.flyIn("sky").then(() => {
        if (!introDone.current) runIntro(api);
      });
      // Lift the veil two frames later: motion renders the fly-in's duration-0
      // pose warps on its NEXT animation frame, so revealing in the same tick
      // could paint one frame of the seated bird at the perch before the warp
      // moves it off-screen. Instant reveal, no fade — the bird is above the
      // viewport by then, so a fade could only ever be seen as a mid-air
      // ghost during the descent.
      requestAnimationFrame(() => requestAnimationFrame(() => setPreFlightVeil(false)));
    }, 500);
    return () => clearTimeout(timer);
  }, [mobileFlyIn]);

  return (
    // Not a grid: the photo half is viewport-fixed (below), so it must never take part
    // in row-height sizing with the form column. `lg:pl-[...]` reserves the same width
    // the fixed panel occupies, so the form content starts right where the photo ends.
    <div className="min-h-screen lg:pl-[58.3333%]">
      {/* Photo half: the valley, with the brand overlaid (matches /login). Pinned to the
          viewport with `fixed` + `inset-y-0` (not part of the grid row), so its size and
          crop are constant no matter how tall the form column gets when switching between
          Alumnus/Teacher fields, error states, etc. The form column scrolls the page under
          it; the photo never resizes.

          Same geometry as /login: a full 100vw `object-cover` render (landing's scale),
          right-aligned in this 58.33vw panel and clipped, so both auth pages and the
          landing hero share one continuous crop. */}
      <div className="fixed inset-y-0 left-0 hidden w-[58.3333%] overflow-hidden lg:block">
        <div className="absolute inset-y-0 right-0 w-screen">
          <Image
            src={HERO_IMAGE_SRC}
            alt=""
            fill
            priority
            placeholder="blur"
            blurDataURL={HERO_IMAGE_BLUR}
            className="object-cover"
            sizes="100vw"
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-br from-[#16241a]/55 via-[#16241a]/15 to-transparent"
          />
        </div>
        <Link
          href="/"
          className="absolute left-8 top-7 inline-flex items-center gap-2.5 rounded-sm text-white lg:left-16 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          style={{ filter: "drop-shadow(0 1px 6px rgba(20,30,22,0.55))" }}
        >
          <Wordmark markClassName="text-white" textClassName="block" />
        </Link>
      </div>

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
