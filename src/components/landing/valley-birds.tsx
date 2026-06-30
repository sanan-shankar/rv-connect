"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { EASE_POP } from "@/components/common/motion";

/* ------------------------------------------------------------------ *
 *  Cute valley birds for the real landing. Small SVG sprites with
 *  rounded friendly bodies, a warm palette (never black), several
 *  visually distinct species (varying colour, size, beak, tail, crest),
 *  and TWO articulated legs that move individually. A small gait
 *  controller drives a believable hop-walk-peck: walk (legs
 *  alternating), peck (head dips), preen (head turns to the wing), and
 *  an occasional gentle arc hop to the next perch.
 *
 *  Owner FINAL tweak: birds perch and walk/hop ONLY along the TOP edges
 *  of the product frames. There is NO ground-line walker.
 *
 *  Birds = SVG + motion (clean for articulated legs). The leaf field is
 *  canvas2D (valley-leaves.tsx). Transform/opacity only, spring-style
 *  easing. Never pairs a 3+ keyframe array with a spring; the head/wing
 *  tweens here are 2-state so a short tween is used with EASE_POP.
 * ------------------------------------------------------------------ */

type Species = {
  id: string;
  body: string;
  belly: string;
  wing: string;
  beak: string;
  /** crest on the crown */
  crest?: boolean;
  /** long forked tail */
  longTail?: boolean;
  /** overall scale of the sprite */
  scale: number;
};

// warm valley birds, no black. A green barbet, a cinnamon bulbul with a crest,
// a slate-blue flycatcher, a small olive warbler, a sunbird with a long tail.
const SPECIES: Species[] = [
  { id: "barbet", body: "#2E9E59", belly: "#CFE3C2", wing: "#1F8A4C", beak: "#C2622F", scale: 1.0 },
  { id: "bulbul", body: "#9B5A33", belly: "#EAD8C2", wing: "#7C3F22", beak: "#3A3632", crest: true, scale: 1.04 },
  { id: "flycatcher", body: "#4F7CA1", belly: "#E6EDF2", wing: "#3A5F80", beak: "#5A4A3A", scale: 0.92 },
  { id: "warbler", body: "#8A9A52", belly: "#F0EDD4", wing: "#6E7E3E", beak: "#7A5A3A", scale: 0.84 },
  { id: "sunbird", body: "#C2622F", belly: "#F2DEC4", wing: "#9C4E24", beak: "#3A3632", longTail: true, scale: 0.9 },
];

/* one articulated leg. hipX is where it joins the body; `swing` is the foot's
 * forward/back offset and `lift` how high it is raised. Drawn hip to knee to
 * foot, each segment rotating a little, with three little toes. */
function Leg({
  hipX,
  swing,
  lift,
  tone,
}: {
  hipX: number;
  swing: number;
  lift: number;
  tone: string;
}) {
  const hipY = 15.5;
  // svg path coords are computed from swing/lift; clamp so a bad value can
  // never reach an x/y attribute as NaN.
  const sSwing = Number.isFinite(swing) ? swing : 0;
  const sLift = Number.isFinite(lift) ? lift : 0;
  const kneeX = hipX + sSwing * 0.45;
  const kneeY = hipY + 3.2 - sLift * 0.5;
  const footX = hipX + sSwing;
  const footY = hipY + 6.4 - sLift;
  return (
    <g stroke={tone} strokeWidth={1.1} strokeLinecap="round" fill="none">
      <line x1={hipX} y1={hipY} x2={kneeX} y2={kneeY} />
      <line x1={kneeX} y1={kneeY} x2={footX} y2={footY} />
      <line x1={footX} y1={footY} x2={footX - 1.5} y2={footY + 1.4} strokeWidth={0.9} />
      <line x1={footX} y1={footY} x2={footX + 1.5} y2={footY + 1.4} strokeWidth={0.9} />
      <line x1={footX} y1={footY} x2={footX} y2={footY + 1.7} strokeWidth={0.9} />
    </g>
  );
}

/* the sprite. viewBox is 32x26, feet sit near y=22 so the bird stands ON a
 * surface line at the SVG bottom. legL/legR carry per-leg swing+lift, head
 * dips for pecking, headTurn rotates the head for preening. */
function BirdSprite({
  sp,
  legL,
  legR,
  headDip,
  headTurn,
  wingLift,
}: {
  sp: Species;
  legL: { swing: number; lift: number };
  legR: { swing: number; lift: number };
  headDip: number;
  headTurn: number;
  wingLift: number;
}) {
  const tone = "#5A4632";
  // sprite dimensions and the animated head/wing offsets all flow into svg /
  // motion attributes; guard each so none can ever be NaN.
  const wpx = Number.isFinite(32 * sp.scale) ? 32 * sp.scale : 32;
  const hpx = Number.isFinite(26 * sp.scale) ? 26 * sp.scale : 26;
  const dip = Number.isFinite(headDip) ? headDip : 0;
  const turn = Number.isFinite(headTurn) ? headTurn : 0;
  const wing = Number.isFinite(wingLift) ? wingLift : 0;
  return (
    <svg width={wpx} height={hpx} viewBox="0 0 32 26" fill="none" aria-hidden>
      {/* tail */}
      {sp.longTail ? (
        <path d="M7 14 L1 9 L2 13 L1.5 16 Z" fill={sp.wing} />
      ) : (
        <path d="M7.5 14 L2.5 11.5 L4 16 Z" fill={sp.wing} />
      )}
      {/* legs (behind the body so the body hides the hips cleanly) */}
      <Leg hipX={14} swing={legL.swing} lift={legL.lift} tone={tone} />
      <Leg hipX={18} swing={legR.swing} lift={legR.lift} tone={tone} />
      {/* plump rounded body */}
      <ellipse cx="16.5" cy="11.5" rx="8" ry="6.4" fill={sp.body} />
      {/* soft belly */}
      <path d="M9.5 13 C11 17 22 17 23.5 12.5 C21 16 12 16 9.5 13 Z" fill={sp.belly} opacity="0.95" />
      {/* folded wing */}
      <motion.path
        d="M12 9 C16 7.5 21 8.5 22.5 11.5 C20 13.5 14 13.5 12 11.5 Z"
        fill={sp.wing}
        animate={{ y: wing }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
        style={{ transformBox: "view-box", transformOrigin: "13px 11px" }}
      />
      {/* head group: dips for pecking, rotates for preening */}
      <motion.g
        animate={{ y: dip, rotate: turn }}
        transition={{ duration: 0.45, ease: EASE_POP }}
        style={{ transformBox: "view-box", transformOrigin: "22px 8px" }}
      >
        <circle cx="22.5" cy="7.5" r="4.6" fill={sp.body} />
        {sp.crest && <path d="M20 3.5 L21.2 1.2 L22.4 3.4 L23.4 1.6 L24 4 Z" fill={sp.body} />}
        {/* beak */}
        <path d="M26.6 7.2 L31 8.2 L26.6 9 Z" fill={sp.beak} />
        {/* eye with a friendly catchlight */}
        <circle cx="23.6" cy="6.6" r="1.25" fill="#2C2A28" />
        <circle cx="24" cy="6.2" r="0.4" fill="#F6F2E8" />
        {/* cheek blush keeps it cute */}
        <circle cx="21.2" cy="9" r="1.1" fill="#E08A6A" opacity="0.4" />
      </motion.g>
    </svg>
  );
}

type Behaviour = "walk" | "peck" | "preen" | "idle";

/* perch type carries an optional horizontal span the bird walks within */
type Perch = { x: number; y: number; span?: number };

/* A single bird that lives on a row of perches (frame-top surface lines). It
 * walks along its current perch, pauses to peck or preen, and occasionally hops
 * to a neighbouring frame top in a gentle arc. Driven by springs (for position)
 * and short tweens (for the gait), so it never zooms. */
/* every position we ever hand to a motion style must be a real, finite number.
 * a perch measured at the wrong moment (zero-size frame on first paint, or a
 * frame collapsing during navigation away) can carry a 0/undefined/NaN coord.
 * this clamps any such value to a safe finite fallback so a motion style can
 * never receive NaN. */
function fin(n: number, fallback = 0): number {
  return Number.isFinite(n) ? n : fallback;
}
/* a perch is only usable if BOTH coords are finite; otherwise we hold the last
 * good value instead of computing a position from a junk measurement. */
function perchOk(p: Perch | undefined): p is Perch {
  return !!p && Number.isFinite(p.x) && Number.isFinite(p.y);
}

function ValleyBird({
  perches,
  start,
  sp,
  seed,
}: {
  perches: Perch[];
  start: number;
  sp: Species;
  seed: number;
}) {
  const [perch, setPerch] = useState(start);
  const [pos, setPos] = useState(() => {
    const p = perches[start];
    return perchOk(p) ? { x: p.x, y: p.y } : { x: 0, y: 0 };
  });
  const [dir, setDir] = useState<1 | -1>(1);
  const [hop, setHop] = useState(0); // arc height applied during a hop
  const [behaviour, setBehaviour] = useState<Behaviour>("idle");
  const [bob, setBob] = useState(0); // small body bob within a perch
  const [headY, setHeadY] = useState(0); // per-beat peck dip, driven directly
  const [legL, setLegL] = useState({ swing: -1.5, lift: 0 });
  const [legR, setLegR] = useState({ swing: 1.5, lift: 0 });

  const perchRef = useRef(perch);
  perchRef.current = perch;
  const posRef = useRef(pos);
  posRef.current = pos;
  // direction lives in a ref so gait closures always read the live facing,
  // even after a turn-around mid-walk (state alone would be stale in-closure)
  const dirRef = useRef<1 | -1>(1);
  const face = (d: 1 | -1) => {
    dirRef.current = d;
    setDir(d);
  };

  // keep position glued to its perch when frames resize. Only adopt a perch
  // whose coords are finite; a zero-size/collapsing frame is ignored so we hold
  // the last good position rather than jumping to a NaN.
  useEffect(() => {
    const p = perches[perchRef.current];
    if (perchOk(p)) setPos({ x: p.x, y: p.y });
  }, [perches]);

  useEffect(() => {
    if (perches.length === 0) return;
    let alive = true;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const after = (ms: number, fn: () => void) => {
      const id = setTimeout(() => {
        if (alive) fn();
      }, ms);
      timers.push(id);
      return id;
    };
    const rand = (a: number, b: number) => a + Math.random() * (b - a);

    // one walking step: lift the trailing foot, swing it forward, plant it,
    // nudge the body along the perch. Legs alternate via which one we lift.
    function step(lifted: "L" | "R", onDone: () => void) {
      const cur = perches[perchRef.current];
      if (!perchOk(cur)) return onDone();
      const d = dirRef.current;
      if (lifted === "L") setLegL({ swing: -2.5 * d, lift: 3 });
      else setLegR({ swing: -2.5 * d, lift: 3 });
      setBob(-1.2);
      after(150, () => {
        const dd = dirRef.current;
        if (lifted === "L") setLegL({ swing: 2.2 * dd, lift: 0 });
        else setLegR({ swing: 2.2 * dd, lift: 0 });
        setBob(0);
        const c = perches[perchRef.current];
        if (perchOk(c)) {
          const span = Number.isFinite(c.span as number) ? (c.span as number) : 80;
          const half = span / 2;
          const nx = posRef.current.x + 9 * dd;
          // turn around at the ends of the perch (don't advance this beat)
          if (nx > c.x + half) face(-1);
          else if (nx < c.x - half) face(1);
          else if (Number.isFinite(nx)) setPos((p) => ({ ...p, x: nx }));
        }
        after(150, onDone);
      });
    }

    function peck(onDone: () => void) {
      setBehaviour("peck");
      let n = 0;
      const tick = () => {
        if (n >= 3) {
          setHeadY(0);
          setBehaviour("idle");
          return onDone();
        }
        n++;
        setHeadY(5.5);
        setBob(0.8);
        after(150, () => {
          setHeadY(0);
          setBob(0);
          after(180, tick);
        });
      };
      tick();
    }

    function preen(onDone: () => void) {
      setBehaviour("preen");
      after(1100, () => {
        setBehaviour("idle");
        onDone();
      });
    }

    // a gentle arc hop to a neighbouring frame top (never a straight zoom)
    function hopTo(target: number, onDone: () => void) {
      const dest = perches[target];
      if (!perchOk(dest)) return onDone();
      face(dest.x >= posRef.current.x ? 1 : -1);
      // crouch
      setLegL({ swing: -1, lift: -1.5 });
      setLegR({ swing: 1, lift: -1.5 });
      setBob(1.6);
      after(180, () => {
        // push off: tuck legs, lift body in an arc
        setLegL({ swing: 0, lift: 4 });
        setLegR({ swing: 0, lift: 4 });
        setBob(0);
        setHop(22);
        setPerch(target);
        setPos(dest);
        after(360, () => {
          // land + settle
          setHop(0);
          setLegL({ swing: -1.5, lift: 0 });
          setLegR({ swing: 1.5, lift: 0 });
          setBob(-1);
          after(160, () => {
            setBob(0);
            onDone();
          });
        });
      });
    }

    // the loop: pick something to do, do it, schedule the next thing
    function next() {
      if (!alive) return;
      const roll = Math.random();
      if (roll < 0.42) {
        const steps = 2 + ((Math.random() * 3) | 0);
        let i = 0;
        const walkStep = () => {
          if (i >= steps) {
            setLegL({ swing: -1.5, lift: 0 });
            setLegR({ swing: 1.5, lift: 0 });
            return after(rand(400, 900), next);
          }
          step(i % 2 === 0 ? "L" : "R", () => {
            i++;
            walkStep();
          });
        };
        setBehaviour("walk");
        walkStep();
      } else if (roll < 0.62) {
        peck(() => after(rand(500, 1100), next));
      } else if (roll < 0.78) {
        preen(() => after(rand(500, 1000), next));
      } else if (roll < 0.92 && perches.length > 1) {
        // hop to a neighbour frame top
        const opts = [perchRef.current - 1, perchRef.current + 1].filter(
          (i) => i >= 0 && i < perches.length
        );
        const target = opts[(Math.random() * opts.length) | 0];
        hopTo(target, () => after(rand(700, 1400), next));
      } else {
        setBehaviour("idle");
        after(rand(700, 1500), next);
      }
    }
    // stagger each bird's first action by its seed so they desync
    after(seed * 600 + 300, next);

    return () => {
      alive = false;
      timers.forEach(clearTimeout);
    };
    // direction is read live via dirRef inside the gait closures; the loop
    // re-binds only when perches or seed change.
  }, [perches, seed]);

  const headDip = fin(headY);
  const headTurn = behaviour === "preen" ? -42 : 0;
  const wingLift = behaviour === "preen" ? -1.2 : 0;

  // final guard: clamp every number that reaches a motion style. Even if a
  // stale pos/hop/bob ever went non-finite, a motion value can never be NaN.
  const ax = fin(pos.x);
  const ay = fin(pos.y - hop + bob);
  const ascaleX = dir === -1 ? -1 : 1;
  const aleft = fin(-16 * sp.scale);
  const atop = fin(-22 * sp.scale);

  return (
    <motion.div
      className="vlb-bird"
      animate={{ x: ax, y: ay, scaleX: ascaleX }}
      transition={{
        x: { type: "spring", stiffness: 90, damping: 16 },
        y: { type: "spring", stiffness: 140, damping: 14 },
        scaleX: { duration: 0.22, ease: "easeOut" },
      }}
      style={{ left: aleft, top: atop }}
    >
      <BirdSprite
        sp={sp}
        legL={legL}
        legR={legR}
        headDip={headDip}
        headTurn={headTurn}
        wingLift={wingLift}
      />
    </motion.div>
  );
}

/* The bird stage. It measures the frame row it overlays and lays perches ONLY
 * on the TOP EDGE of each product frame (no ground line), then drops a few
 * birds doing different things. Pure overlay: pointer-events:none so it never
 * blocks the leaves underneath. */
export function ValleyBirds({ frameSelector }: { frameSelector: string }) {
  const wrap = useRef<HTMLDivElement | null>(null);
  const [perches, setPerches] = useState<Perch[]>([]);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const measure = () => {
      const host = el.getBoundingClientRect();
      // Do not measure before layout exists. A zero-size host means the section
      // has not laid out yet (first paint) or is collapsing during navigation
      // away; either way any perch we derived would be junk, so bail and keep
      // whatever we already had.
      if (
        !Number.isFinite(host.left) ||
        !Number.isFinite(host.top) ||
        host.width <= 0 ||
        host.height <= 0
      ) {
        return;
      }
      const frames = Array.from(el.parentElement?.querySelectorAll(frameSelector) ?? []);
      const next: Perch[] = [];
      for (const f of frames) {
        const r = (f as HTMLElement).getBoundingClientRect();
        // skip any frame measured at zero size or with a non-finite rect: a
        // perch computed from it would feed NaN into a bird's motion style.
        if (
          r.width <= 0 ||
          r.height <= 0 ||
          !Number.isFinite(r.left) ||
          !Number.isFinite(r.top) ||
          !Number.isFinite(r.width)
        ) {
          continue;
        }
        const x = r.left - host.left + r.width / 2;
        const y = r.top - host.top;
        if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
        next.push({
          x,
          y,
          span: Math.max(40, r.width - 20),
        });
      }
      // if nothing measured cleanly this round, hold the last good perches
      // rather than clearing to an empty/unstable set.
      if (next.length === 0) return;
      // top edges only: no ground-line walker (owner FINAL tweak)
      setPerches(next);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    if (el.parentElement) ro.observe(el.parentElement);
    // re-measure after frames have laid out / fonts settle
    const id = setTimeout(measure, 300);
    return () => {
      ro.disconnect();
      clearTimeout(id);
    };
  }, [frameSelector]);

  if (perches.length === 0) {
    return <div className="vlb-stage" ref={wrap} aria-hidden />;
  }

  // assign a few birds to different starting frame tops and distinct species
  const cast = [
    { start: 0, sp: SPECIES[0], seed: 0 },
    { start: Math.min(1, perches.length - 1), sp: SPECIES[1], seed: 1 },
    { start: perches.length - 1, sp: SPECIES[3], seed: 2 },
  ];
  if (perches.length > 2) {
    cast.push({ start: 2, sp: SPECIES[2], seed: 3 });
  }

  return (
    <div className="vlb-stage" ref={wrap} aria-hidden>
      {cast.map((c, i) => (
        <ValleyBird key={i} perches={perches} start={c.start} sp={c.sp} seed={c.seed} />
      ))}
    </div>
  );
}
