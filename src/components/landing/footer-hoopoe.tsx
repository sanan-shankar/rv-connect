"use client";

/* ------------------------------------------------------------------ *
 *  FooterHoopoe - the landing page's one resident hoopoe: perched on
 *  a little ledge at the very bottom of the footer, right where the
 *  ambient leaf pile settles. Owner ask: "the hoopoe at the bottom of
 *  the page, just kind of fluttering about from one spot to another,
 *  reactions every now and then... a reward for scrolling."
 *
 *  Behaviour, on a slow randomized cadence:
 *   - most of the time: a short hop-and-slide to a different one of 3
 *     fixed perch spots along the ledge
 *   - sometimes: a small in-place reaction - preen, peck, a look
 *     left-then-right, or a crest flick
 *  All of it composes existing hoopoe-kit verbs; nothing here touches
 *  the rig itself.
 *
 *  Perch travel deliberately does NOT use the rig's `flyTo` verb: that
 *  arc is built for long cross-page glides (see mascot-flight.ts) and
 *  enforces a tall minimum arc + a full leg tuck for its whole airborne
 *  span regardless of distance. Reused for this ledge's few-pixel-apart
 *  perches, it launched the bird high out of the ledge with its legs
 *  tucked out of sight (hidden behind the body, which paints over them)
 *  for the entire trip - the bug this file now avoids. `flutterTo`
 *  below instead slides the puppet's own wrapper sideways (a plain
 *  transform, eased with SPRINGS.gentle) while `hop()` gives it a small
 *  in-place bounce; legs stay visibly bent throughout, never hidden.
 *
 *  Polish pass (judged as "reads like a stray corner sticker"):
 *   - sized up to a real payoff (was a 44px afterthought tucked at 22%
 *     from the left) and re-centered so its default/rest spot is the
 *     ledge's middle, with the 3 flutter spots pulled into a tighter,
 *     still-centered band instead of roaming out toward the edges.
 *   - a small deterministic (no Math.random - SSR-safe) leaf-and-shadow
 *     "ground accent" sits under each of the 3 fixed perch spots, so the
 *     bird always lands ON something - feet in leaves, a soft cast
 *     shadow under them - instead of empty beige, regardless of which
 *     perch is live or how filled the ambient drift happens to be.
 *   - one extra idle beat on top of the rig's own always-on breathing:
 *     a slow, gentle bob + side-to-side tilt on the puppet's own wrapper
 *     (transform/opacity only, SPRINGS.settle from motion.tsx), so the
 *     bird reads as a deliberately placed, alive reward even while it
 *     is doing nothing else.
 *
 *  One-hoopoe rule: this is the ONLY hoopoe on the landing page (the
 *  old scroll companion is gone). The hero's CTA-to-auth-page flight
 *  (mascot-flight.ts) is the other bird that can appear on this route,
 *  mid-flight, via a portal carrying a `<Hoopoe>` with the shared
 *  `hoopoe-mascot` class. Rather than subscribing to the flight bus
 *  directly (`onLaunch`/`onHandoff` are a single-slot pair already
 *  claimed by MascotFlightLayer - registering a second listener here
 *  would silently steal that slot and break the real flight), this
 *  polls the same DOM signal `one-hoopoe-guard.ts` uses, just scoped to
 *  exclude this component's own puppet. In practice the two can't
 *  actually be on screen together anyway (the hero CTAs that launch a
 *  flight sit far above the fold, the footer is the last thing on the
 *  page), but the check costs nothing and keeps the rule airtight.
 *
 *  Respects prefers-reduced-motion (a deliberate, scoped exception:
 *  the app-wide `useMotionGovernor` never gates on the OS preference by
 *  design, but that governs the rig's own always-on idle breathing -
 *  this file's own scheduling of cross-ledge flights and reactions is
 *  new orchestration on top of it, and the task asks it to stand down
 *  to a static perch when the visitor has asked for less motion). Tab
 *  visibility still goes through the shared governor.
 *
 *  Cheap by construction: no rAF loop, just one IntersectionObserver
 *  and one self-rescheduling setTimeout. Only transform + opacity ever
 *  animate, whether inside the rig's own controller or on this file's own
 *  wrapper layers (bob/tilt, the flutter slide).
 * ------------------------------------------------------------------ */

import { useEffect, useRef, useState } from "react";
import { m } from "motion/react";
import { Hoopoe } from "@/components/mascot/hoopoe";
import { rand, type HoopoeApi } from "@/components/mascot/hoopoe-kit";
import { useMotionGovernor, SPRINGS } from "@/components/common/motion";

// Big enough to be the payoff for scrolling the whole page, not a sticker.
const RIG_SIZE = 84;
// Fractions of the ledge's own width. Pulled into a tight, centered band (was
// 0.22/0.5/0.8, which read as "wandered off toward a corner" on a wide
// footer) so every flutter still lands near the middle - "went somewhere,"
// not "left the reward."
const PERCH_FRACTIONS = [0.38, 0.5, 0.62];
const FOOT_INSET = 8; // px the feet sit above the ledge's bottom edge
const CYCLE_MIN_MS = 8000;
const CYCLE_MAX_MS = 16000;
const BLOCKED_RETRY_MS = 4000;

// Palette echoes the ambient leaf drift's own tints (leaf, marigold, cinnamon,
// amber) so the ground accents read as the same family of leaves, not a
// one-off decoration.
const TUFT_COLORS = ["var(--color-leaf)", "#C79318", "var(--color-cinnamon)", "#DB8A2A"] as const;

/** A small leaf cluster + soft cast shadow seated at one fixed perch spot, so
 *  the hoopoe always has something to land ON. Deterministic per index (no
 *  Math.random - server and client must agree) and purely static: no
 *  animation cost, and it never has to chase the puppet's own live position
 *  because it already sits at the exact fraction the puppet flies to. */
function GroundAccent({ frac, index }: { frac: number; index: number }) {
  const leaves = [0, 1, 2].map((i) => {
    const seed = index * 7 + i * 5;
    return {
      dx: -15 + ((seed * 11) % 30),
      size: 13 + ((seed * 7) % 9),
      rot: -35 + ((seed * 23) % 70),
      color: TUFT_COLORS[seed % TUFT_COLORS.length],
    };
  });
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute bottom-0"
      style={{ left: `${frac * 100}%` }}
    >
      <div
        className="absolute rounded-full"
        style={{
          width: 68,
          height: 16,
          left: -34,
          bottom: -3,
          background:
            "radial-gradient(ellipse at center, rgba(58,46,34,0.3) 0%, rgba(58,46,34,0.13) 55%, transparent 78%)",
          filter: "blur(1.5px)",
        }}
      />
      {leaves.map((l, i) => (
        <svg
          key={i}
          width={l.size}
          height={l.size}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
          className="absolute"
          style={{ left: l.dx, bottom: -4, transform: `rotate(${l.rot}deg)`, opacity: 0.82 }}
        >
          <path d="M12 3c5.5 0 8.5 3.8 8.5 9s-3 9-8.5 9-8.5-3.8-8.5-9 3-9 8.5-9Z" fill={l.color} />
        </svg>
      ))}
    </div>
  );
}

/** Same signal one-hoopoe-guard.ts checks (every <Hoopoe> carries the
 *  `hoopoe-mascot` class), scoped to ignore whatever lives inside `self` so a
 *  resident bird doesn't perpetually "see" itself as another hoopoe. */
function anotherHoopoeVisible(self: HTMLElement | null): boolean {
  if (typeof document === "undefined") return false;
  const nodes = document.querySelectorAll<HTMLElement>(".hoopoe-mascot");
  for (const node of Array.from(nodes)) {
    if (!self || !self.contains(node)) return true;
  }
  return false;
}

export function FooterHoopoe() {
  const ledgeRef = useRef<HTMLDivElement>(null);
  const puppetWrapRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<HoopoeApi | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const perchIdx = useRef(1); // starts centered (PERCH_FRACTIONS[1]), matching startFrac below
  const inViewRef = useRef(false);
  const mountedRef = useRef(true);

  const { paused } = useMotionGovernor();
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  // Scoped exception to the app's "never gate on prefers-reduced-motion"
  // rule - see the file docblock above.
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReducedMotion(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  const reducedRef = useRef(reducedMotion);
  reducedRef.current = reducedMotion;

  // One intentional idle beat on top of the rig's own always-on breathing: a
  // slow bob + side-to-side tilt on the puppet's OWN wrapper (a different
  // element than anything the rig's verbs touch, so it never fights preen,
  // peck, or a flutterTo hop mid-move - it just keeps the resting bird feeling
  // alive). transform-only; stands down to a level, static pose under
  // reduced motion, same scoped exception as the rest of this file.
  const [bobUp, setBobUp] = useState(false);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const loop = () => {
      if (mountedRef.current) setBobUp((v) => !v);
      t = setTimeout(loop, rand(2600, 4200));
    };
    t = setTimeout(loop, rand(900, 1800));
    return () => clearTimeout(t);
  }, []);

  // Horizontal offset (px) of the puppet's own wrapper from the ledge's
  // center perch, recomputed fresh (not accumulated) on every flutter so it
  // self-corrects against viewport resizes. Purely a transform (see the
  // JSX below), animated with SPRINGS.gentle.
  const [xOffset, setXOffset] = useState(0);

  useEffect(() => {
    const el = ledgeRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      inViewRef.current = entry.isIntersecting;
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(
    () => () => {
      mountedRef.current = false;
      clearTimeout(timerRef.current);
    },
    [],
  );

  function scheduleNext(delayMs?: number) {
    clearTimeout(timerRef.current);
    if (!mountedRef.current) return;
    timerRef.current = setTimeout(tick, delayMs ?? rand(CYCLE_MIN_MS, CYCLE_MAX_MS));
  }

  // Slides the puppet wrapper sideways to a new perch (a plain transform, see
  // the JSX) with a small in-place hop for flourish, instead of api.flyTo -
  // see the docblock above for why. `hop()` keeps the legs visibly bent the
  // whole time (never the flight tuck), so nothing disappears mid-move.
  async function flutterTo(next: number) {
    const api = apiRef.current;
    const el = ledgeRef.current;
    if (!api || !el) return;
    const width = el.getBoundingClientRect().width || 1;
    setXOffset((PERCH_FRACTIONS[next] - PERCH_FRACTIONS[1]) * width);
    await api.hop(2);
    perchIdx.current = next;
  }

  async function tick() {
    if (!mountedRef.current) return;
    const api = apiRef.current;
    const blocked =
      !api ||
      api.isBusy() ||
      reducedRef.current ||
      pausedRef.current ||
      !inViewRef.current ||
      anotherHoopoeVisible(puppetWrapRef.current);
    if (blocked) {
      scheduleNext(BLOCKED_RETRY_MS);
      return;
    }

    const roll = Math.random();
    try {
      if (roll < 0.45) {
        const choices = PERCH_FRACTIONS.map((_, i) => i).filter((i) => i !== perchIdx.current);
        const next = choices[Math.floor(Math.random() * choices.length)];
        await flutterTo(next);
      } else if (roll < 0.65) {
        await api.preen();
      } else if (roll < 0.8) {
        await api.peck();
      } else if (roll < 0.92) {
        await api.turn("left");
        await api.turn("right");
        await api.turn(0);
      } else {
        await api.crestFlick();
      }
    } finally {
      scheduleNext();
    }
  }

  function handleReady(api: HoopoeApi) {
    apiRef.current = api;
    scheduleNext();
  }

  const startFrac = PERCH_FRACTIONS[1]; // center - the reward starts where it reads, not off to a side

  return (
    <div ref={ledgeRef} aria-hidden className="relative h-32 sm:h-40">
      {PERCH_FRACTIONS.map((f, i) => (
        <GroundAccent key={i} frac={f} index={i} />
      ))}
      <div
        ref={puppetWrapRef}
        className="pointer-events-none absolute z-40"
        style={{ left: `${startFrac * 100}%`, bottom: FOOT_INSET, transform: "translateX(-50%)" }}
      >
        {/* Carries the puppet sideways between perches (see flutterTo above).
            A separate layer from the centering transform on the parent div
            (which stays static) and from the bob/tilt layer below (which
            keeps its own independent motion), so the three transforms never
            fight each other. */}
        <m.div animate={{ x: xOffset }} transition={SPRINGS.gentle}>
          <m.div
            style={{ transformOrigin: "bottom center" }}
            animate={reducedMotion ? { y: 0, rotate: 0 } : { y: bobUp ? -4 : 0, rotate: bobUp ? -2.5 : 2.5 }}
            transition={SPRINGS.settle}
          >
            <Hoopoe size={RIG_SIZE} onReady={handleReady} />
          </m.div>
        </m.div>
      </div>
    </div>
  );
}
