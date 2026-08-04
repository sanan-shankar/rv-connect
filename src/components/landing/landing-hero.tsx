"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, type Variants } from "motion/react";
import { ChevronDown } from "lucide-react";
import { Wordmark } from "@/components/layout/peaks-mark";
import { Hoopoe } from "@/components/mascot/hoopoe";
import { useHoopoe } from "@/components/mascot/use-hoopoe";
import { HoopoeWarmup } from "@/components/mascot/hoopoe-warmup";
import { SPRINGS, EASE_IN_OUT_SCENE, AUTH_SLIDE_SECONDS } from "@/components/common/motion";
import { HERO_IMAGE_SRC, HERO_IMAGE_BLUR, AUTH_FORM_VW, LOGIN_TRANSITION_FLAG } from "./hero-photo";
import { launchFlight, FLIGHT_FLAG, type FlightTarget } from "@/components/mascot/mascot-flight";

/**
 * Landing hero. Two coordinated behaviours live here:
 *
 * 1. LOAD-IN. The image is the slow asset, so the hero holds on the warm beige
 *    page background until the photo has actually decoded, then fades/rises the
 *    whole composition in together (never a beige-then-photo pop). If the decode
 *    is genuinely slow (> a short budget), a hopping Hoopoe keeps the empty beige
 *    company; a fast/cached load skips straight to content with no loader flash.
 *    If the Hoopoe DID appear, revealing also holds the content entrance back by
 *    `LOADER_EXIT_MS` (matching the Hoopoe's own exit-fade length) so the two
 *    are never simultaneously semi-visible on top of each other; a fast/cached
 *    load (loader never shown) gets zero added delay.
 *
 * 2. SIGN-IN EXIT. Clicking "Sign in" (desktop only, where /login has its photo
 *    split) plays an exit: the headline + CTAs slide out, the nudge fades, and
 *    the image container slides LEFT by AUTH_FORM_VW with no rescale, landing in
 *    exactly the crop the /login photo panel renders at rest. Then we push to
 *    /login, whose static geometry matches the final frame, so the handoff is
 *    seamless. Direct visits to /landing never see any of this.
 */

type Phase = "loading" | "shown" | "exiting";

const REVEAL_STAGGER = 0.07;

// The Hoopoe loader's own exit-fade length. Reused as the content-entrance
// delay below (single source of truth) so the mascot is fully gone before the
// photo/content ramps in, instead of the two cross-dissolving on top of each other.
const LOADER_EXIT_MS = 300;

// The landing-only washes (brand top wash, headline bottom gradient, hover wash)
// carry the current look and fade out as the headline leaves.
const washLandingVariants: Variants = {
  loading: { opacity: 0 },
  shown: { opacity: 1, transition: { duration: 0.6 } },
  exiting: { opacity: 0, transition: { duration: AUTH_SLIDE_SECONDS * 0.6 } },
};

// The /login-matching corner gradient is invisible on the resting landing and
// fades in only during the exit, so the handoff frame matches /login exactly.
// Crossfades over most of the slide so the two washes trade places gradually
// rather than snapping over midway.
const washLoginVariants: Variants = {
  loading: { opacity: 0 },
  shown: { opacity: 0 },
  exiting: { opacity: 1, transition: { duration: AUTH_SLIDE_SECONDS * 0.8 } },
};

const brandVariants: Variants = {
  loading: { opacity: 0, y: -6 },
  shown: { opacity: 1, y: 0, transition: SPRINGS.gentle },
  exiting: { opacity: 1, y: 0 }, // persists across the handoff (same lockup sits on /login)
};

const middleVariants: Variants = {
  loading: { opacity: 0, y: 16 },
  shown: { opacity: 1, y: 0, transition: SPRINGS.gentle },
  exiting: {
    opacity: 0,
    x: -84,
    // Leaves on the same curve as the photo, just a touch quicker, so the
    // headline clears the frame before the photo finishes travelling.
    transition: { duration: AUTH_SLIDE_SECONDS * 0.72, ease: EASE_IN_OUT_SCENE },
  },
};

const nudgeVariants: Variants = {
  loading: { opacity: 0 },
  shown: { opacity: 1, transition: { duration: 0.5 } },
  exiting: { opacity: 0, transition: { duration: AUTH_SLIDE_SECONDS * 0.4 } },
};

const sectionVariants: Variants = {
  loading: {},
  shown: { transition: { staggerChildren: REVEAL_STAGGER, delayChildren: 0.04 } },
  exiting: { transition: { staggerChildren: 0.03 } },
};

export function LandingHero({ showScrollCue = true }: { showScrollCue?: boolean }) {
  const router = useRouter();
  const [hovered, setHovered] = useState(false);
  const [phase, setPhase] = useState<Phase>("loading");
  const [showLoader, setShowLoader] = useState(false);
  const [slidePx, setSlidePx] = useState(0);
  const pushed = useRef(false);
  // Which auth route this exit is bound for (set at click). Both share the same
  // photo-slide choreography and the same panel geometry, so the only thing that
  // differs is where we push and which flag the destination reads.
  const exitTarget = useRef<FlightTarget>("login");
  const imgRef = useRef<HTMLImageElement>(null);
  const revealed = useRef(false);
  const loaderTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Whether the loader ever actually appeared on screen. Only then does reveal()
  // hold the entrance back; a fast/cached load (this stays false) reveals with
  // zero added delay, same as before.
  const loaderShown = useRef(false);
  const entranceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // The photo layer fades/rises in on load, then slides left by the form's width
  // on the sign-in exit (no rescale), landing on the /login crop. slidePx is
  // measured at click time from the live viewport.
  const imageVariants: Variants = {
    loading: { opacity: 0, scale: 1.05, x: 0 },
    shown: { opacity: 1, scale: 1, x: 0, transition: SPRINGS.gentle },
    exiting: {
      opacity: 1,
      scale: 1,
      x: slidePx,
      transition: { duration: AUTH_SLIDE_SECONDS, ease: EASE_IN_OUT_SCENE },
    },
  };

  // LOAD-IN: reveal only once the DISPLAYED hero photo (the next/image) has
  // finished loading, so the whole composition rises in together instead of the
  // photo popping in late. Gating on the real <img> (via onLoad + a cache-hit
  // check) also means we never reveal onto a still-blank image.
  const reveal = useCallback(() => {
    if (revealed.current) return;
    revealed.current = true;
    clearTimeout(loaderTimer.current);
    if (loaderShown.current) {
      // The Hoopoe was actually on screen: hide it now (its own AnimatePresence
      // exit fade starts immediately) and hold the content entrance back by the
      // same span, so the exit finishes before the entrance ramps up instead of
      // the two overlapping.
      setShowLoader(false);
      entranceTimer.current = setTimeout(() => {
        setPhase((p) => (p === "loading" ? "shown" : p));
      }, LOADER_EXIT_MS);
    } else {
      // Fast/cached load: the loader never appeared, so reveal immediately with
      // no added delay.
      setPhase((p) => (p === "loading" ? "shown" : p));
    }
  }, []);

  useEffect(() => {
    // Cache hit: the image is already complete before onLoad can fire.
    if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Reveals from the image's load state, including the cache-hit case where the element is already complete and onLoad will never fire.
      reveal();
      return;
    }
    // Otherwise hold on warm beige; only summon the loader if the wait is real,
    // so a fast/cached load skips straight to content with no loader flash.
    loaderTimer.current = setTimeout(() => {
      if (!revealed.current) {
        loaderShown.current = true;
        setShowLoader(true);
      }
    }, 220);
    // Safety net: never strand the page on beige if the photo stalls or errors.
    const maxWait = setTimeout(reveal, 6000);
    router.prefetch("/login");
    router.prefetch("/signup");
    return () => {
      clearTimeout(loaderTimer.current);
      clearTimeout(maxWait);
      clearTimeout(entranceTimer.current);
    };
  }, [reveal, router]);

  function startExit(e: React.MouseEvent<HTMLAnchorElement>, target: FlightTarget) {
    // Let modified clicks / non-desktop viewports navigate normally. The photo
    // split (and therefore the slide + flight) only exists at lg+, so mobile
    // falls back to a plain, clean navigation with no intermediate state and no
    // flight (the mobile layout has no photo panel and a short button-to-perch
    // hop would add jank for little gain — see summary).
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (typeof window === "undefined" || !window.matchMedia("(min-width: 1024px)").matches) return;
    e.preventDefault();
    if (phase === "exiting") return;
    exitTarget.current = target;
    // Launch the hoopoe from exactly this CTA. Measure it now (it is about to
    // slide out), mark the destination so it keeps its own hoopoe hidden until
    // the flyer hands off, then fire the flight in parallel with the slide.
    const r = e.currentTarget.getBoundingClientRect();
    try {
      window.sessionStorage.setItem(FLIGHT_FLAG, target);
    } catch {
      // storage disabled: the flight still flies; the destination just shows
      // its own hoopoe normally (no handoff), which is a graceful fallback.
    }
    launchFlight({ from: { x: r.left + r.width / 2, y: r.top + r.height / 2 }, target });
    setSlidePx(-Math.round((window.innerWidth * AUTH_FORM_VW) / 100));
    setPhase("exiting");
  }

  return (
    <motion.section
      className="relative flex min-h-dvh flex-col overflow-hidden"
      initial="loading"
      animate={phase}
      variants={sectionVariants}
      onMouseEnter={() => setHovered(true)}
      onTouchStart={() => setHovered(true)}
    >
      {/* Photo layer: fades/rises in on load, slides left on the sign-in exit. */}
      <motion.div
        className="absolute inset-0 z-0"
        variants={imageVariants}
        style={{ transformOrigin: "50% 50%" }}
        onAnimationComplete={(def) => {
          if (def === "exiting" && !pushed.current) {
            pushed.current = true;
            const target = exitTarget.current;
            // Tell /login this arrival is the landing slide, so its sign-in form
            // plays the lateral entry; /login reads and clears it on mount. A
            // direct visit / reload never sees this flag and gets no entry
            // animation. (/signup's entry is unconditional, so it needs no such
            // flag.) Set immediately before the push so it is present at mount.
            try {
              if (target === "login") window.sessionStorage.setItem(LOGIN_TRANSITION_FLAG, "1");
            } catch {
              // Private-mode / storage-disabled: fall back to no entry animation.
            }
            router.push(target === "signup" ? "/signup" : "/login");
          }
        }}
      >
        <Image
          ref={imgRef}
          src={HERO_IMAGE_SRC}
          alt=""
          fill
          priority
          placeholder="blur"
          blurDataURL={HERO_IMAGE_BLUR}
          className="object-cover"
          sizes="100vw"
          draggable={false}
          onLoad={reveal}
          onError={reveal}
        />

        {/* Landing-only washes (present now; fade out as the headline leaves). */}
        <motion.div className="absolute inset-0" variants={washLandingVariants}>
          {/* Hover-reactive wash for readability */}
          <div
            className="absolute inset-0 transition-colors duration-700 ease-in-out"
            style={{ backgroundColor: hovered ? "rgba(0,0,0,0.18)" : "rgba(0,0,0,0.03)" }}
          />
          {/* Top wash keeps the small white brand readable without dimming the whole photo. */}
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-40"
            style={{
              backgroundImage:
                "linear-gradient(180deg, rgba(20,30,22,0.34), rgba(20,30,22,0.16) 45%, transparent)",
            }}
          />
          {/* Constant bottom gradient so the headline and cue always have contrast */}
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(180deg, transparent 54%, rgba(20,30,22,0.36))",
            }}
          />
        </motion.div>

        {/* /login-matching corner gradient: hidden until the exit, then it is what
            carries into the /login photo panel (same geometry, same opacity). */}
        <motion.div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-br from-[#16241a]/55 via-[#16241a]/15 to-transparent"
          variants={washLoginVariants}
        />
      </motion.div>

      {/* Brand, top-left. One fixed lockup size everywhere (peaks-mark.tsx), and
          it sits at the same screen position + size on /login, so it stays put
          across the sign-in handoff rather than moving. */}
      <motion.div
        className="relative z-10 px-8 pt-7 lg:px-16"
        style={{ filter: "drop-shadow(0 1px 6px rgba(20,30,22,0.55))" }}
        variants={brandVariants}
      >
        <Wordmark markClassName="text-white" textClassName="block text-white" />
      </motion.div>

      {/* Headline + actions (the middle block that slides out on the exit) */}
      <motion.div className="relative z-10 flex flex-1 items-center" variants={middleVariants}>
        {/* Lifted by exactly the x-height of the 'e' in "Welcome" (owner,
            2026-08-04), measured off the real font rather than estimated:
            33px against the 60px h1, and the h1 changes size twice on the way
            down, so the lift tracks it (0.55 of the heading's font size, which
            is Libre Baskerville's x-height ratio). Lives on this inner block,
            NOT the motion.div above it, because Framer writes `transform`
            inline during the sign-in exit and would overwrite a utility class
            here. */}
        <div className="w-full -translate-y-[20px] px-8 sm:-translate-y-[26px] lg:-translate-y-[33px] lg:px-16">
          <div className="lg:grid lg:grid-cols-[88px_1fr] lg:gap-x-2.5">
            <div className="lg:col-start-2">
              <h1 className="font-heading text-4xl font-bold tracking-[-0.03em] text-white drop-shadow-lg sm:text-5xl lg:text-6xl lg:whitespace-nowrap">
                Welcome back to the valley.
              </h1>
              <p className="mt-4 max-w-[42ch] text-base leading-relaxed text-white/90 drop-shadow-md sm:text-lg lg:max-w-none lg:whitespace-nowrap">
                A space for the Rishi Valley community to stay connected.
              </p>
              {/* Same 16px step as the subtitle above (owner, 2026-08-04: the
                  three blocks "should be equally spaced ... the gap between
                  the first two is fine"). Equal MARGINS also come out as equal
                  INK here, measured 21.6px on both sides at 1440: the
                  subtitle's half-leading is the only thing between the two
                  gaps, and it sits on the inside of each. Was mt-9. */}
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Link
                  href="/signup"
                  onClick={(e) => startExit(e, "signup")}
                  className="inline-flex items-center justify-center rounded-full bg-white px-6 py-2.5 text-[15px] font-semibold text-[#23241E] shadow-md transition-[colors,transform] duration-200 hover:bg-white/90 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  Join the community
                </Link>
                <Link
                  href="/login"
                  onClick={(e) => startExit(e, "login")}
                  className="inline-flex items-center justify-center rounded-full border border-white/55 bg-white/10 px-6 py-2.5 text-[15px] font-semibold text-white backdrop-blur-sm transition-colors duration-200 hover:bg-white/20 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  Sign in
                </Link>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Scroll cue. Suppressed while the showcase below the hero is held back
          (see SHOW_SHOWCASE in src/app/page.tsx): pointing down at a page that
          does not scroll is worse than pointing at nothing. The pb-7 goes with
          it, so the hero's own bottom edge is the page's. */}
      {showScrollCue && (
        <motion.div
          className="relative z-10 flex flex-col items-center gap-3 pb-7 text-white/80"
          variants={nudgeVariants}
        >
          <span className="text-[11px] font-medium uppercase tracking-[0.18em]">See what&apos;s inside</span>
          <ChevronDown className="h-5 w-5 animate-bounce" aria-hidden />
        </motion.div>
      )}

      {/* Slow-load company: a hopping Hoopoe on the warm beige, only if the photo
          is taking a while. Fades away as the hero reveals. */}
      <AnimatePresence>
        {showLoader && (
          <motion.div
            key="hero-loader"
            className="pointer-events-none absolute inset-x-0 bottom-[26%] z-20 flex justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.35 } }}
            exit={{ opacity: 0, transition: { duration: LOADER_EXIT_MS / 1000 } }}
          >
            <HeroLoader />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pays the flight rig's first-mount cost off-screen at idle time, so the
          FIRST real flight (launched by "Sign in" / "Join the community" below)
          never has to. See hoopoe-warmup.tsx for the full why. */}
      <HoopoeWarmup />
    </motion.section>
  );
}

/** The mascot that hops in place while the hero photo decodes on a slow load. */
function HeroLoader() {
  const { ref, hop } = useHoopoe();
  useEffect(() => {
    let alive = true;
    const loop = async () => {
      while (alive) {
        await hop(1);
        if (!alive) break;
        await new Promise((r) => setTimeout(r, 360));
      }
    };
    const t = setTimeout(loop, 180);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [hop]);
  return <Hoopoe ref={ref} size={92} />;
}
