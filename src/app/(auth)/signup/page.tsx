"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
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
import { Wordmark } from "@/components/layout/peaks-mark";
import { SPRINGS } from "@/components/common/motion";
import { HERO_IMAGE_SRC, HERO_IMAGE_BLUR } from "@/components/landing/hero-photo";
import { reportPerch, onHandoff, FLIGHT_FLAG } from "@/components/mascot/mascot-flight";

type Step = "trivia" | "register";

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("trivia");

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
  const hoopoeApiRef = useRef<HoopoeApi | null>(null);
  const introDone = useRef(false);
  // Hidden until the flyer hands off when arriving via a flight; shown from the
  // start on a direct visit (there is no flyer to wait for). Deliberately does
  // NOT also fold in `mobileFlyIn` here: a mismatched inline `style` attribute
  // between the server render (which can never know the viewport) and the
  // client's first hydration pass is a class of hydration error React does not
  // patch up (it leaves the server value in place until some unrelated update
  // touches the node), so computing this from a client-only viewport check
  // would leave the hoopoe wrongly VISIBLE at its rest pose through the whole
  // hidden window instead of hidden. The mobile fly-in effect below hides it
  // instead, via a plain client-only state update after mount (not a
  // hydration commit), which React always reconciles correctly.
  const [hoopoeShown, setHoopoeShown] = useState(!arrivedViaFlight);

  // Mobile fly-in, part 1: the instant we know this is a fly-in viewport, hide
  // the hoopoe before the browser paints (useLayoutEffect, not useEffect), so
  // the SSR-rendered "already sitting there" frame is never actually shown.
  // This is a genuine post-hydration update, so it is exempt from the
  // attribute-hydration-mismatch pitfall the comment above describes.
  useLayoutEffect(() => {
    if (mobileFlyIn) setHoopoeShown(false);
  }, [mobileFlyIn]);

  // a warm wave-and-nod greeting, then it leans in, curious, ready to quiz you.
  // On a flight arrival this runs at handoff (the flyer having just landed).
  function runIntro(api: HoopoeApi) {
    api.react("greet");
    api.express("curious");
    introDone.current = true;
  }

  function onHoopoeReady(api: HoopoeApi) {
    hoopoeApiRef.current = api;
    if (!arrivedViaFlight && !mobileFlyIn) runIntro(api);
  }

  // Flight handoff: reveal + greet when the flyer lands; the fallback timer (set
  // longer than the flyer's own failsafe) guarantees the bird is never stranded
  // hidden. The perch rect itself is reported once the entry settles (below).
  useEffect(() => {
    if (!arrivedViaFlight) return;
    try {
      window.sessionStorage.removeItem(FLIGHT_FLAG);
    } catch {
      // storage disabled: nothing to clear
    }
    const reveal = () => {
      setHoopoeShown(true);
      const api = hoopoeApiRef.current;
      if (api && !introDone.current) runIntro(api);
    };
    const unsub = onHandoff(reveal);
    const fallback = setTimeout(reveal, 4000);
    return () => {
      unsub();
      clearTimeout(fallback);
    };
  }, [arrivedViaFlight]);

  // Mobile fly-in, part 2: ~500ms after the page settles, reveal the (now
  // hidden, per the layout effect above) hoopoe and have it fly itself in
  // from off-screen onto its own rest anchor (no target = wherever it is
  // mounted), landing exactly where the static mascot would otherwise sit.
  // `flyIn` is a same-mount primitive (no cross-page bus involved), so no
  // `reportPerch`/`onHandoff` wiring is needed here; it only ever fires when
  // `arrivedViaFlight` is false, so it can never race the flight-bus reveal
  // above.
  useEffect(() => {
    if (!mobileFlyIn) return;
    const timer = setTimeout(() => {
      if (mobileFlyInFired.current) return;
      const api = hoopoeApiRef.current;
      if (!api) return;
      mobileFlyInFired.current = true;
      setHoopoeShown(true);
      api.flyIn("top").then(() => {
        if (!introDone.current) runIntro(api);
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [mobileFlyIn]);

  function reportPerchRect() {
    if (!arrivedViaFlight) return;
    const el = hoopoeBoxRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    reportPerch({ left: r.left, top: r.top, width: r.width, height: r.height });
  }

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
          className="absolute left-8 top-7 inline-flex items-center gap-2.5 rounded-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 lg:left-16"
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
          className="inline-flex items-center gap-1 self-start rounded-sm text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>

        <motion.div
          className="my-auto w-full max-w-[400px] self-center text-center"
          initial={{ opacity: 0, x: 48 }}
          animate={{ opacity: 1, x: 0 }}
          transition={SPRINGS.gentle}
          onAnimationComplete={reportPerchRect}
        >
          <div className="mx-auto mb-1 grid h-[112px] place-items-center">
            {/* Tight box around the SVG so its rect is the exact perch target;
                hidden + idle-off until the flyer hands off. */}
            <div
              ref={hoopoeBoxRef}
              style={{ opacity: hoopoeShown ? 1 : 0, transition: "opacity 160ms ease" }}
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
                <h1 className="font-heading text-[27px] leading-tight tracking-tight text-foreground">
                  First, a quick check
                </h1>
                <p className="mx-auto mb-6 mt-2 max-w-[32ch] text-sm leading-relaxed text-muted-foreground">
                  Answer this to prove you&apos;re one of us.
                </p>
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
                <h1 className="font-heading text-[27px] leading-tight tracking-tight text-foreground">
                  Join the community
                </h1>
                <p className="mx-auto mb-6 mt-2 max-w-[34ch] text-sm leading-relaxed text-muted-foreground">
                  Tell us a bit about yourself so your batchmates can find you.
                </p>
                <SignupForm hoopoe={hoopoe} onSuccess={() => router.push("/welcome")} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
