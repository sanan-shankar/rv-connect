"use client";

/* ------------------------------------------------------------------ *
 *  <Hoopoe> — the Rishi Valley mascot. ONE rigged SVG puppet (folding
 *  crest fan, hide-able brows, two big cross-faded eyes, ONE clean
 *  decurved bill, two shoulder-pivoted barred wings, optional tail,
 *  stubby legs + feet) driven by ONE queued, awaitable, interruptible
 *  controller exposed via ref / useHoopoe.
 *
 *  Look: a baby hoopoe. Big round head, huge low eyes, soft pudgy body,
 *  no eyebrows at rest, no mouth, no cheek blush. Cuddly, not stern.
 *
 *  Drawing space: viewBox "0 -10 120 152" user units, front-on chibi.
 *  Locomotion is sold front-on with bouncy waddle-hops + a graceful
 *  flight arc; turning is a gentle lean (never an oval squash).
 *
 *  House rules honored: animate ONLY transform + opacity; house springs.
 *  Per the owner the delights are ALWAYS active (no reduced-motion).
 *  transform-box: view-box is forced on every [data-part] (motion
 *  defaults to fill-box, which silently breaks shared anatomical pivots).
 * ------------------------------------------------------------------ */

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import {
  m,
  useAnimate,
  useMotionValue,
  useSpring,
  useTransform,
  type AnimationPlaybackControls,
} from "motion/react";
import {
  SPRINGS,
  EASE_SPRING,
  EASE_SOFT,
  LEGS_DOWN_AT,
  PARTS,
  EXPRESSIONS,
  makeDamper,
  useValleyMotion,
  wait,
  clamp,
  rand,
  type Chord,
  type Dir,
  type Expression,
  type FlyInEdge,
  type HoopoeApi,
  type Level,
  type SemanticEvent,
  type Step,
  type Target,
} from "./hoopoe-kit";

const C = {
  body: "#D5854A",
  bodyHi: "#EEB683",
  bodySh: "#BC6F39",
  head: "#DA9056",
  crest: "#DD9259",
  crestHi: "#E7A772",
  crestTip: "#2B2722",
  crestBand: "#FBF4E6",
  wingShoulder: "#D98C54",
  barDark: "#322C25",
  barLight: "#F4E7CC",
  tailDark: "#2B2722",
  tailBand: "#FBF4E6",
  bill: "#4A4038",
  billHi: "#6E6055",
  leg: "#8A7F71",
  eye: "#2B2722",
  catchlight: "#FFFFFF",
  brow: "#B0763F",
  shadow: "#3A2E22",
  heart: "#E03A33",
};

// Extra clearance, in px, above the viewport for a "sky" fly-in spawn: the
// soft drop shadow renders below the feet and the first cruise frames already
// descend a few px, so without this slack the shadow could peek over the top
// edge on the bird's very first visible frame. 24px covers the shadow's
// offset plus several frames of initial descent with room to spare.
const SKY_PAD_PX = 24;

// pivot tucked into the crown (head top is ~y29) so feather bases never detach when the fan opens/folds
const CREST_PIVOT = { x: 60, y: 37 };
const CREST_ANGLES = [-52, -39, -26, -13, 0, 13, 26, 39, 52];
const REST_SPREAD = 1.0; // baked into the drawn fan; chord crest.sx multiplies this

/* ---- static art (no animated transforms baked in) ---- */
function Feather({ angle, i }: { angle: number; i: number }) {
  const a = angle * REST_SPREAD;
  const baseY = CREST_PIVOT.y;
  const tipY = baseY - 31;
  const midY = baseY - 17;
  const capBot = tipY + 6; // black tip spans tip..capBot
  const bandBot = capBot + 3; // warm-white sub-band sits between cinnamon and the black tip
  const cinn = i % 2 ? C.crest : C.crestHi;
  return (
    <g data-feather transform={`rotate(${a} ${CREST_PIVOT.x} ${baseY})`}>
      <path d={`M54.6 ${baseY} Q52.6 ${midY} 60 ${tipY} Q67.4 ${midY} 65.4 ${baseY} Z`} fill={cinn} />
      <path d={`M57 ${capBot} Q60 ${capBot - 0.6} 63 ${capBot} L62.6 ${bandBot} Q60 ${bandBot - 0.6} 57.4 ${bandBot} Z`} fill={C.crestBand} />
      <path d={`M56.6 ${capBot} Q60 ${tipY - 1.5} 63.4 ${capBot} Q60 ${capBot - 1.4} 56.6 ${capBot} Z`} fill={C.crestTip} />
    </g>
  );
}

function Wing({ side }: { side: -1 | 1 }) {
  // folded little wing, hugging the body side (hangs down from the shoulder)
  const fold =
    side < 0
      ? "M42 84 Q30 88 31 106 Q37 113 45 103 Q47 94 48 88 Q46 84 42 84 Z"
      : "M78 84 Q90 88 89 106 Q83 113 75 103 Q73 94 72 88 Q74 84 78 84 Z";
  const foldBars = (
    side < 0
      ? [[33, 103, 43, 100], [34, 96, 45, 93], [36, 89, 46.5, 87]]
      : [[87, 103, 77, 100], [86, 96, 75, 93], [84, 89, 73.5, 87]]
  ).map((b, k) => (
    <path key={k} d={`M${b[0]} ${b[1]} Q${(b[0] + b[2]) / 2} ${(b[1] + b[3]) / 2 - 1} ${b[2]} ${b[3]}`} stroke={C.barLight} strokeWidth={2.8} fill="none" strokeLinecap="round" />
  ));
  // extended "arm" wing — reaches OUT horizontally and tapers to a TIP (used for point / wave / fly).
  // the taper gives "point" a directional read instead of a blunt blob; it also looks like a real
  // (pointed) wingtip when flapping. cross-faded by opacity.
  const arm =
    side < 0
      ? "M42 84 Q26 82 7 89 Q26 96 44 94 Q49 89 42 84 Z"
      : "M78 84 Q94 82 113 89 Q94 96 76 94 Q71 89 78 84 Z";
  const armBars = (side < 0
    ? [[15, 88, 23, 89], [24, 89, 32, 90], [34, 90, 42, 92]]
    : [[105, 88, 97, 89], [96, 89, 88, 90], [86, 90, 78, 92]]
  ).map((b, k) => (
    <path key={k} d={`M${b[0]} ${b[1]} L${b[2]} ${b[3]}`} stroke={C.barLight} strokeWidth={2.2} fill="none" strokeLinecap="round" />
  ));
  return (
    <g data-part={side < 0 ? "leftWing" : "rightWing"}>
      <g data-wing={side < 0 ? "foldL" : "foldR"}>
        <path d={fold} fill={C.barDark} />
        {foldBars}
      </g>
      <g data-wing={side < 0 ? "armL" : "armR"} opacity={0}>
        <path d={arm} fill={C.barDark} />
        {armBars}
      </g>
    </g>
  );
}

function Leg({ side }: { side: -1 | 1 }) {
  const px = side < 0 ? 52 : 68;
  const hipY = 118;
  const ankleY = 128;
  return (
    <g data-part={side < 0 ? "leftLeg" : "rightLeg"}>
      <line x1={px} y1={hipY} x2={px} y2={ankleY} stroke={C.leg} strokeWidth={3.2} strokeLinecap="round" />
      <g stroke={C.leg} strokeWidth={2.3} fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d={`M${px} ${ankleY} L${px - 4.5} ${ankleY + 3.5}`} />
        <path d={`M${px} ${ankleY} L${px} ${ankleY + 4.5}`} />
        <path d={`M${px} ${ankleY} L${px + 4.5} ${ankleY + 3.5}`} />
      </g>
    </g>
  );
}

function EyeShapes({ cx, cy, s }: { cx: number; cy: number; s: number }) {
  return (
    <>
      <g data-eyeshape="round" opacity={1}>
        <ellipse cx={cx} cy={cy} rx={6.9 * s} ry={8.1 * s} fill={C.eye} />
        <circle cx={cx - 2.2 * s} cy={cy - 2.9 * s} r={2.5 * s} fill={C.catchlight} />
        <circle cx={cx + 1.8 * s} cy={cy + 1.8 * s} r={1.1 * s} fill={C.catchlight} opacity={0.85} />
      </g>
      <g data-eyeshape="wide" opacity={0}>
        <ellipse cx={cx} cy={cy} rx={7.9 * s} ry={9.3 * s} fill={C.eye} />
        <circle cx={cx - 2.5 * s} cy={cy - 3.3 * s} r={2.8 * s} fill={C.catchlight} />
        <circle cx={cx + 2 * s} cy={cy + 2 * s} r={1.2 * s} fill={C.catchlight} opacity={0.85} />
      </g>
      <g data-eyeshape="happy" opacity={0}>
        <path d={`M${cx - 6 * s} ${cy + 2 * s} Q${cx} ${cy - 6 * s} ${cx + 6 * s} ${cy + 2 * s}`} stroke={C.eye} strokeWidth={3.8} fill="none" strokeLinecap="round" />
      </g>
      <g data-eyeshape="sleepy" opacity={0}>
        <path d={`M${cx - 5.4 * s} ${cy - 0.6 * s} Q${cx} ${cy + 3.8 * s} ${cx + 5.4 * s} ${cy - 0.6 * s}`} stroke={C.eye} strokeWidth={3.4} fill="none" strokeLinecap="round" />
      </g>
      {/* fully shut: a near-flat lid, distinct from sleepy's drowsy-but-open curve above */}
      <g data-eyeshape="closed" opacity={0}>
        <path d={`M${cx - 5.6 * s} ${cy} Q${cx} ${cy + 1.4 * s} ${cx + 5.6 * s} ${cy}`} stroke={C.eye} strokeWidth={3} fill="none" strokeLinecap="round" />
      </g>
    </>
  );
}

function Brow({ side, cx, y }: { side: -1 | 1; cx: number; y: number }) {
  // hidden at rest (opacity 0); the controller fades them in only for emotional poses.
  return (
    <g data-part={side < 0 ? "browL" : "browR"} opacity={0}>
      <path d={`M${cx - 4.8} ${y} Q${cx} ${y - 2} ${cx + 4.8} ${y}`} stroke={C.brow} strokeWidth={2.2} fill="none" strokeLinecap="round" />
    </g>
  );
}

/* ---- the controller hook: builds the queued, awaitable HoopoeApi ---- */
/* ---- poke timing ---- */
// Taps closer together than this are one streak. Somebody tapping on purpose
// lands them 150 to 300ms apart; a tap a whole second after the last is a new
// poke, not the old one continuing.
const POKE_STREAK_MS = 1000;
// The fifth tap in a streak flusters it. Two to four is play; five is somebody
// seeing what happens, and the huff is the answer.
const POKE_FLUSTER_AT = 5;
// How long it keeps its face turned away. Long enough to read as a sulk,
// short enough to be over before the joke is.
const HUFF_HOLD_MS = 1100;
// Where the eyes go while a pointer rests on the bird: straight up at you.
// It is the hover state of the one clickable thing here that cannot change
// colour, and it moves nothing but the pupils.
const HOVER_GAZE_Y = -0.45;

interface Ctx {
  animate: ReturnType<typeof useAnimate>[1];
  scopeEl: () => SVGSVGElement | null;
  gazeX: ReturnType<typeof useMotionValue<number>>;
  gazeY: ReturnType<typeof useMotionValue<number>>;
  variant: "full" | "icon";
}

function useController(ctx: Ctx): { api: HoopoeApi; damper: ReturnType<typeof makeDamper> } {
  const { animate, scopeEl, gazeX, gazeY, variant } = ctx;
  const queue = useRef<Array<() => Promise<void>>>([]).current;
  const live = useRef<Set<AnimationPlaybackControls>>(new Set()).current;
  const draining = useRef(false);
  const damper = useRef(makeDamper()).current;
  const rootX = useRef(0);
  const rootY = useRef(0);
  const celebrateAt = useRef(0);
  // The chord the face is wearing, so a poke hands it back exactly as found:
  // the forgot-password bird rests `curious`, and a giggle that ended on
  // `content` would quietly change the mood of the screen it was tapped on.
  const chordNow = useRef<Chord>(EXPRESSIONS.content);
  const pokeCount = useRef(0);
  const pokeAt = useRef(0);
  const pokePending = useRef(false);
  const huffing = useRef(false);
  // Abort token the queue races against. motion v12 `control.stop()` does NOT resolve `.finished`
  // (only natural completion or cancel does), so without this an interrupted verb would leave
  // `pump` awaiting forever and wedge every later enqueue. stop() flips + releases the token.
  const abortRef = useRef<{ aborted: boolean; p: Promise<void>; release: () => void }>(undefined as never);
  function arm() {
    let release = () => {};
    const p = new Promise<void>((r) => (release = r));
    abortRef.current = { aborted: false, p, release };
  }
  if (!abortRef.current) arm();

  // motion's animate() is heavily overloaded; a single loose cast keeps the verb
  // code readable (we only ever animate transform + opacity, by selector or element).
  const anim = animate as unknown as (
    target: unknown,
    keyframes: Record<string, unknown>,
    opts?: Record<string, unknown>
  ) => AnimationPlaybackControls;

  // a no-op control for selectors that match nothing (e.g. the tail when tail={false}, or the legs
  // in the icon variant). motion throws "No valid elements provided" on a zero-match selector, so we
  // short-circuit: every verb can freely animate any part whether or not it is currently rendered.
  const NOOP = { finished: Promise.resolve(), stop() {} } as unknown as AnimationPlaybackControls;
  const A = (sel: string, target: Record<string, unknown>, opts?: Record<string, unknown>) => {
    const root = scopeEl();
    // root is null once the rig unmounts (e.g. a fast navigation racing an in-flight
    // verb); falling through to motion's animate() with no root crashes inside
    // resolveElements, so bail out to the same no-op every other missing-target case uses.
    if (!root || root.querySelector(sel) === null) return NOOP;
    const controls = anim(sel, target, opts);
    live.add(controls);
    controls.finished.finally(() => live.delete(controls));
    return controls;
  };
  const stepLen = 14;
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const enqueue = (step: () => Promise<void>): Promise<void> =>
    new Promise((resolve, reject) => {
      queue.push(() => step().then(resolve, reject));
      pump();
    });

  async function pump() {
    if (draining.current) return;
    draining.current = true;
    try {
      while (queue.length) {
        const step = queue.shift()!;
        const token = abortRef.current;
        await Promise.race([
          step().catch((e) => {
            if (process.env.NODE_ENV !== "production") console.error("[hoopoe] step error", e);
          }),
          token.p,
        ]);
        if (token.aborted) break; // stop()/cancel() interrupted; abandon the in-flight step
      }
    } finally {
      draining.current = false;
      if (queue.length) pump(); // drain anything enqueued during/after an abort (e.g. cancel -> rest)
    }
  }

  // ----- eye shape cross-fade -----
  function setEye(shape: string) {
    (["round", "wide", "happy", "sleepy", "closed"] as const).forEach((s) =>
      A(`[data-eyeshape=${s}]`, { opacity: s === shape ? 1 : 0 }, { duration: 0.12 })
    );
  }

  // ----- apply an expression chord (many parts at once) -----
  // NOTE: we deliberately do NOT touch PARTS.body here. The always-on idle breathe owns body
  // {scaleY,y}; if a chord also wrote body.scaleY the two would fight for the whole hold (jitter on
  // the most-praised feature). The head carries the perk/slump instead, and the bird keeps breathing
  // through every expression, which reads more alive.
  function applyChord(c: Chord, opts?: { spring?: Record<string, unknown> }) {
    const sp = opts?.spring ?? SPRINGS.gentle;
    chordNow.current = c;
    setEye(c.eye);
    return Promise.all([
      A(PARTS.crest, { scaleX: c.crest.sx, scaleY: c.crest.sy, rotate: c.crest.rot }, sp),
      A(PARTS.browL, { y: c.brow.y, rotate: c.brow.ang, opacity: c.brow.op }, sp),
      A(PARTS.browR, { y: c.brow.y, rotate: -c.brow.ang, opacity: c.brow.op }, sp),
      A(PARTS.billLower, { rotate: c.bill }, sp),
      A(PARTS.head, { rotate: c.head.rot, y: c.head.y }, sp),
      A(PARTS.tail, { rotate: c.tail.rot, scaleX: c.tail.sx }, sp),
    ].map((x) => x.finished));
  }

  // ----- geometry helpers -----
  // resolve a Target to client-space center
  function clientCenter(target: Target): { x: number; y: number } | null {
    if (!target) return null;
    if (target instanceof HTMLElement) {
      const r = target.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }
    if ("width" in target && "height" in target) {
      return { x: target.left + target.width / 2, y: target.top + target.height / 2 };
    }
    return { x: (target as { x: number }).x, y: (target as { y: number }).y };
  }
  // the root translate that places the bird's anchor (default body center) ON the target point.
  // computed absolutely (not as a delta) so flyTo lands exactly where you tap.
  function rootTranslateFor(target: Target, anchorX = 60, anchorY = 101): { x: number; y: number } {
    const svg = scopeEl();
    const c = clientCenter(target);
    if (!svg || !c) return { x: rootX.current, y: rootY.current };
    const r = svg.getBoundingClientRect();
    const w = r.width || 1;
    const h = r.height || 1;
    // viewBox is "0 -10 120 152" -> x0=0, y0=-10. Map the client point into viewBox units
    // INCLUDING the y origin, or every landing is 10 units too high.
    const localX = 0 + ((c.x - r.left) / w) * 120;
    const localY = -10 + ((c.y - r.top) / h) * 152;
    return { x: localX - anchorX, y: localY - anchorY };
  }
  function dirVector(target: Target | Dir): { nx: number; ny: number } {
    if (target === "left") return { nx: -1, ny: 0 };
    if (target === "right") return { nx: 1, ny: 0 };
    const svg = scopeEl();
    const c = clientCenter(target as Target);
    if (!svg || !c) return { nx: 0, ny: 0 };
    const r = svg.getBoundingClientRect();
    const dx = c.x - (r.left + r.width / 2);
    const dy = c.y - (r.top + r.height / 2);
    const m = Math.hypot(dx, dy) || 1;
    return { nx: dx / m, ny: dy / m };
  }

  // ================= verbs =================
  const blinkOnce = (double = false) =>
    enqueue(async () => {
      await A(PARTS.eyeBlink, { scaleY: [1, 0.04, 1] }, { duration: 0.18, ease: "easeInOut" }).finished;
      if (double) await A(PARTS.eyeBlink, { scaleY: [1, 0.04, 1] }, { duration: 0.18, ease: "easeInOut" }).finished;
    });

  // raw bodies (no enqueue) so composites can chord them; public verbs wrap in enqueue.
  // Nods are SOFT: a gentle dip with a smooth ease (no spring snap), crest lagging a touch.
  async function nodRaw(times = 1) {
    damper.suspend();
    try {
      for (let i = 0; i < times; i++)
        await Promise.all([
          A(PARTS.head, { rotate: [0, 9, 0], y: [0, 2.5, 0] }, { duration: 0.66, ease: EASE_SOFT }).finished,
          A(PARTS.crest, { rotate: [0, -4, 0] }, { duration: 0.7, ease: EASE_SOFT }).finished,
        ]);
    } finally {
      damper.resume();
    }
  }
  const nod = (times = 1) => enqueue(() => nodRaw(times));

  async function shakeRaw(times = 1) {
    damper.suspend();
    try {
      for (let i = 0; i < times; i++)
        await Promise.all([
          A(PARTS.head, { rotate: [0, -7, 7, -4, 0] }, { duration: 0.86, ease: EASE_SOFT }).finished,
          A(PARTS.crest, { rotate: [0, 5, -5, 2, 0] }, { duration: 0.9, ease: EASE_SOFT }).finished,
        ]);
    } finally {
      damper.resume();
    }
  }
  const shake = (times = 1) => enqueue(() => shakeRaw(times));

  async function crestFlickRaw() {
    await A(PARTS.crest, { rotate: [0, -6, 3, 0], scaleY: [1, 1.1, 1] }, { duration: 0.55, ease: EASE_SPRING }).finished;
  }
  const crestFlick = () => enqueue(() => crestFlickRaw());

  // open / fold the crest fan (owner loves the crest; let it close like a real hoopoe)
  const crest = (open: boolean) =>
    enqueue(async () => {
      if (open) await A(PARTS.crest, { scaleX: [null as never, 1.16, 1], scaleY: [null as never, 1.06, 1], rotate: 0 }, { duration: 0.6, ease: EASE_SPRING }).finished;
      else await A(PARTS.crest, { scaleX: 0.18, scaleY: 0.86, rotate: 0 }, SPRINGS.gentle).finished;
    });

  // PREEN: a self-groom, bill dipping into a wing (picks left/right at random so it
  // doesn't always favour a side), then a little crest flick to finish. A rare-idle
  // beat, not a reaction to anything.
  async function preenRaw() {
    const left = Math.random() < 0.5;
    const wing = left ? PARTS.leftWing : PARTS.rightWing;
    const s = left ? -1 : 1;
    damper.suspend();
    try {
      gazeTo(s * 0.6);
      await Promise.all([
        A(PARTS.head, { rotate: s * 14, y: 4 }, SPRINGS.gentle).finished,
        A(wing, { rotate: s * 18 }, SPRINGS.gentle).finished,
        A(PARTS.billLower, { rotate: 6 }, SPRINGS.gentle).finished,
      ]);
      for (let i = 0; i < 2; i++)
        await A(PARTS.head, { rotate: [s * 14, s * 20, s * 14] }, { duration: 0.32, ease: EASE_SOFT }).finished;
      await Promise.all([
        A(PARTS.head, { rotate: 0, y: 0 }, SPRINGS.settle).finished,
        A(wing, { rotate: 0 }, SPRINGS.settle).finished,
        A(PARTS.billLower, { rotate: 0 }, SPRINGS.settle).finished,
      ]);
      gazeTo(0);
      await crestFlickRaw();
    } finally {
      damper.resume();
    }
  }
  const preen = () => enqueue(() => preenRaw());

  // PECK: a quick foraging lunge (head + body dip, bill snaps open then shut) then a
  // happy little upward beat, as if it just caught something. A rare-idle beat.
  async function peckRaw() {
    damper.suspend();
    try {
      await Promise.all([
        A(PARTS.head, { y: [0, 10, 0] }, { duration: 0.3, ease: EASE_SPRING }).finished,
        A(PARTS.billLower, { rotate: [0, 16, 0] }, { duration: 0.3, ease: EASE_SPRING }).finished,
        A(PARTS.body, { y: [0, 3, 0] }, { duration: 0.3, ease: EASE_SOFT }).finished,
      ]);
      setEye("happy");
      await Promise.all([
        A(PARTS.root, { y: [rootY.current, rootY.current - 6, rootY.current] }, { duration: 0.32, ease: EASE_SPRING }).finished,
        A(PARTS.tail, { rotate: [0, 8, 0] }, { duration: 0.32 }).finished,
      ]);
      setEye("round");
    } finally {
      damper.resume();
    }
  }
  const peck = () => enqueue(() => peckRaw());

  const express = (name: Expression, opts?: { hold?: number }) =>
    enqueue(async () => {
      const c = EXPRESSIONS[name];
      if (c.gaze) {
        gazeX.set(c.gaze.x);
        gazeY.set(c.gaze.y);
      }
      const punchy = name === "surprise" || name === "alert";
      const extra: Promise<unknown>[] = [];
      if (punchy) {
        // a quick root recoil up-and-settle gives surprise/alert a real startle beat
        extra.push(A(PARTS.root, { y: [rootY.current, rootY.current - 4, rootY.current] }, { duration: 0.42, ease: EASE_SPRING }).finished);
      }
      if (name === "love") {
        // the signature wing-hug: both wings curl across the chest
        extra.push(
          A(PARTS.leftWing, { rotate: 40 }, SPRINGS.gentle).finished,
          A(PARTS.rightWing, { rotate: -40 }, SPRINGS.gentle).finished
        );
      } else {
        extra.push(
          A(PARTS.leftWing, { rotate: 0 }, SPRINGS.gentle).finished,
          A(PARTS.rightWing, { rotate: 0 }, SPRINGS.gentle).finished
        );
      }
      await Promise.all([applyChord(c, { spring: punchy ? SPRINGS.snappy : undefined }), ...extra]);
      if (opts?.hold) await sleep(opts.hold);
    });

  const wave = (times = 2) =>
    enqueue(async () => {
      damper.suspend();
      try {
        await Promise.all([
          A(PARTS.rightWingFold, { opacity: 0 }, { duration: 0.12 }).finished,
          A(PARTS.rightWingArm, { opacity: 1 }, { duration: 0.12 }).finished,
          A(PARTS.rightWing, { rotate: -64, scaleX: 1 }, SPRINGS.gentle).finished,
        ]);
        for (let i = 0; i < times; i++) await A(PARTS.rightWing, { rotate: [-64, -88, -64] }, { duration: 0.44, ease: "easeInOut" }).finished;
        await Promise.all([
          A(PARTS.rightWing, { rotate: 0 }, SPRINGS.settle).finished,
          A(PARTS.rightWingArm, { opacity: 0 }, { duration: 0.18 }).finished,
          A(PARTS.rightWingFold, { opacity: 1 }, { duration: 0.18 }).finished,
        ]);
      } finally {
        damper.resume();
      }
    });

  // POINT: a real point. The extended wing telescopes OUT toward the target (scaleX reach) and
  // holds horizontally, aimed a little up/down at the target. NOT raised to the brow like a wave.
  const point = (target: Target | Dir, opts?: { label?: string; hold?: number }) =>
    enqueue(async () => {
      const { nx, ny } = dirVector(target);
      const useLeft = nx < 0;
      const wing = useLeft ? PARTS.leftWing : PARTS.rightWing;
      const fold = useLeft ? PARTS.leftWingFold : PARTS.rightWingFold;
      const arm = useLeft ? PARTS.leftWingArm : PARTS.rightWingArm;
      const hold = opts?.hold ?? 850;
      // aim: arm is horizontal at rotate 0; nudge the tip toward the target's vertical offset.
      const aim = clamp(ny * 34, -26, 26) * (useLeft ? 1 : -1);
      gazeTo(typeof target === "string" ? (target === "left" ? -0.85 : 0.85) : (target as Target));
      damper.suspend();
      try {
        // a small lean toward the target (lean the whole bird, no oval squash)
        await A(PARTS.body, { rotate: useLeft ? 3 : -3 }, SPRINGS.gentle).finished;
        await Promise.all([
          A(fold, { opacity: 0 }, { duration: 0.1 }).finished,
          A(arm, { opacity: 1 }, { duration: 0.1 }).finished,
        ]);
        // reach out: telescope the arm from a tucked windup to full extension, ending aimed
        await Promise.all([
          A(wing, { rotate: [useLeft ? 14 : -14, aim], scaleX: [0.62, 1.06, 1] }, { duration: 0.46, ease: EASE_SPRING }).finished,
        ]);
        void crestFlickRaw();
        await sleep(hold);
        await Promise.all([
          A(wing, { rotate: 0, scaleX: 1 }, SPRINGS.settle).finished,
          A(arm, { opacity: 0 }, { duration: 0.2 }).finished,
          A(fold, { opacity: 1 }, { duration: 0.2 }).finished,
          A(PARTS.body, { rotate: 0 }, SPRINGS.gentle).finished,
        ]);
      } finally {
        damper.resume();
      }
    });

  // TURN: a gentle lean + look-over, NOT an oval squash.
  const turn = (dir: Dir | 0) =>
    enqueue(async () => {
      const s = dir === 0 ? 0 : dir === "left" ? -1 : 1;
      gazeTo(dir === 0 ? 0 : dir === "left" ? -0.9 : 0.9);
      await Promise.all([
        A(PARTS.body, { rotate: s * 5 }, SPRINGS.gentle).finished,
        A(PARTS.tail, { rotate: -s * 5 }, SPRINGS.gentle).finished,
      ]);
    });

  // WALK: a bouncy, baby-bird waddle-hop. Rocks side to side, bobs up, paddles its feet.
  async function walkCore(steps: number, dir: Dir) {
    const s = dir === "left" ? -1 : 1;
    damper.suspend();
    try {
      for (let i = 0; i < steps; i++) {
        const rock = i % 2 === 0 ? 1 : -1; // alternate the rock direction each step
        rootX.current += s * stepLen;
        await Promise.all([
          A(PARTS.root, { x: rootX.current, y: [rootY.current, rootY.current - 5, rootY.current], rotate: [0, rock * 3, 0] }, { duration: 0.44, ease: EASE_SPRING }).finished,
          A(PARTS.body, { scaleY: [1, 0.95, 1.03, 1] }, { duration: 0.44, ease: EASE_SOFT }).finished,
          A(PARTS.leftLeg, { rotate: [0, rock > 0 ? -20 : 12, 0] }, { duration: 0.44, ease: EASE_SOFT }).finished,
          A(PARTS.rightLeg, { rotate: [0, rock > 0 ? 12 : -20, 0] }, { duration: 0.44, ease: EASE_SOFT }).finished,
          A(PARTS.head, { rotate: [0, -rock * 2.5, 0], y: [0, -1.5, 0] }, { duration: 0.44, ease: EASE_SOFT }).finished,
          A(PARTS.crest, { rotate: [0, -rock * 5, 0] }, { duration: 0.46, ease: EASE_SOFT }).finished,
          A(PARTS.tail, { rotate: [0, rock * 7, 0] }, { duration: 0.46, ease: EASE_SOFT }).finished,
          A(PARTS.shadow, { scaleX: [1, 0.88, 1], opacity: [0.18, 0.12, 0.18] }, { duration: 0.44, ease: EASE_SOFT }).finished,
        ]);
      }
      await Promise.all([
        A(PARTS.leftLeg, { rotate: 0 }, SPRINGS.settle).finished,
        A(PARTS.rightLeg, { rotate: 0 }, SPRINGS.settle).finished,
        A(PARTS.root, { rotate: 0, y: rootY.current }, SPRINGS.settle).finished,
        A(PARTS.head, { rotate: 0, y: 0 }, SPRINGS.settle).finished,
        A(PARTS.crest, { rotate: 0 }, SPRINGS.settle).finished,
        A(PARTS.tail, { rotate: 0 }, SPRINGS.settle).finished,
      ]);
    } finally {
      damper.resume();
    }
  }
  const walk = (steps: number, dir: Dir = "right") => enqueue(() => (variant === "icon" ? Promise.resolve() : walkCore(steps, dir)));

  const hop = (count = 1, dir?: Dir) =>
    enqueue(async () => {
      if (variant === "icon") return;
      const s = dir === "left" ? -1 : dir === "right" ? 1 : 0;
      damper.suspend();
      try {
        for (let i = 0; i < count; i++) {
          await Promise.all([
            A(PARTS.body, { scaleY: 0.9, y: 3 }, SPRINGS.snappy).finished,
            A(PARTS.leftLeg, { rotate: -10 }, SPRINGS.snappy).finished,
            A(PARTS.rightLeg, { rotate: 10 }, SPRINGS.snappy).finished,
          ]);
          rootX.current += s * 16;
          await Promise.all([
            A(PARTS.root, { y: [null as never, rootY.current - 24, rootY.current], x: rootX.current }, { duration: 0.5, ease: EASE_SPRING }).finished,
            A(PARTS.shadow, { scaleX: [1, 0.7, 1], opacity: [0.18, 0.07, 0.18] }, { duration: 0.5, ease: "easeInOut" }).finished,
            A(PARTS.body, { scaleY: [0.9, 1.08, 0.92, 1], y: [3, -2, 2, 0] }, { duration: 0.5, times: [0, 0.3, 0.85, 1] }).finished,
            A(PARTS.leftLeg, { rotate: [-10, 24, 0] }, { duration: 0.5 }).finished,
            A(PARTS.rightLeg, { rotate: [10, -24, 0] }, { duration: 0.5 }).finished,
            A(PARTS.crest, { rotate: [null as never, -9, 0] }, { duration: 0.5, ease: EASE_SPRING }).finished,
            A(PARTS.tail, { rotate: [null as never, -11, 4, 0] }, { duration: 0.5 }).finished,
          ]);
        }
        await A(PARTS.eyeBlink, { scaleY: [1, 0.06, 1] }, { duration: 0.16 }).finished; // blink on landing
      } finally {
        damper.resume();
      }
    });

  // FLY: lands the bird's body-center exactly on the target. Graceful parabolic arc,
  // smooth continuous wingbeats, body banking into the direction of travel.
  //
  // The cruise + landing (phases 2-3) are factored into `arcAndLand` so `flyIn`
  // (an off-canvas entrance that skips the ground-takeoff crouch of phase 1,
  // since it starts already airborne) can reuse the exact same flight math
  // instead of duplicating it. `flyCore`'s own behavior is unchanged: it still
  // reads `rootX.current`/`rootY.current` right before calling `arcAndLand`,
  // which is the same moment the old inline version captured `startX`/`startY`
  // (phase 1 never touches PARTS.root, so the value is identical either way).
  async function arcAndLand(startX: number, startY: number, p: { x: number; y: number }) {
    const dx = p.x - startX;
    const dy = p.y - startY;
    const dist = Math.hypot(dx, dy);
    // distance-scaled so a long glide takes its time and never feels rushed; capped both ends
    const dur = clamp(0.95 + dist / 150, 1.0, 1.9);
    const dir = Math.sign(dx) || 1;
    // flight: ONE continuous, smooth trajectory. The body follows a graceful analytic path
    // (eased glide across + a smooth arch + a SMALL flap-synced lift bob); only the wings flap in
    // intervals. We densely sample the smooth functions and play them with ease:"linear" so the
    // body's velocity never eases to a stop at each beat (that stop/go was the jaggedness). A real
    // bird cruises smoothly while its wings beat - this matches that.
    const flaps = clamp(Math.round(dist / 70) + 2, 3, 6); // wingbeats over the whole flight
    const cruise = 38 + dist * 0.08; // arch height above the start->end chord
    const bobAmp = 6; // gentle altitude ripple from each beat
    const wMid = -50;
    const wAmp = 24; // wing sweep -74 (up) .. -26 (down)
    const N = 56;
    const smoother = (u: number) => u * u * u * (u * (u * 6 - 15) + 10); // C2-smooth ease (gentle takeoff + landing)
    const txs: number[] = [];
    const tys: number[] = [];
    const lw: number[] = [];
    const rw: number[] = [];
    const bodyRot: number[] = [];
    const stream: number[] = [];
    const shScale: number[] = [];
    const shOp: number[] = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const th = 2 * Math.PI * flaps * t;
      const arch = Math.sin(Math.PI * t); // 0..1..0, smooth
      const bob = -bobAmp * Math.cos(th) * arch; // lift on the downstroke, faded to nothing at the ends
      txs.push(startX + dx * smoother(t));
      tys.push(startY + dy * t - cruise * arch - bob);
      const w = wMid - wAmp * Math.cos(th); // -74 up .. -26 down
      lw.push(w);
      rw.push(-w);
      bodyRot.push(dir * 6 * arch);
      stream.push(-dir * 8 * arch);
      shScale.push(1 - 0.5 * arch);
      shOp.push(0.18 - 0.12 * arch);
    }
    // pin the landing exactly on target
    txs[N] = p.x;
    tys[N] = p.y;
    // Landing gear down mid-descent (LEGS_DOWN_AT of the cruise): the legs are
    // tucked at 138° for flight and used to unfold only in the landing block
    // below, i.e. after the bird was already sitting on the perch — a visibly
    // legless bird for the first beat of every landing. The delay rides the
    // same clock as the cruise so the unfold always falls in the final
    // descent. Fire-and-forget: the landing block no longer re-animates the
    // legs (a superseded spring's `.finished` never resolves, so awaiting a
    // second leg write there could hang this promise chain), and awaiting
    // these here would stall touchdown behind the spring settle.
    A(PARTS.leftLeg, { rotate: 0 }, { ...SPRINGS.gentle, delay: dur * LEGS_DOWN_AT });
    A(PARTS.rightLeg, { rotate: 0 }, { ...SPRINGS.gentle, delay: dur * LEGS_DOWN_AT });
    await Promise.all([
      A(PARTS.root, { x: txs, y: tys }, { duration: dur, ease: "linear" }).finished,
      A(PARTS.leftWing, { rotate: lw }, { duration: dur, ease: "linear" }).finished,
      A(PARTS.rightWing, { rotate: rw }, { duration: dur, ease: "linear" }).finished,
      A(PARTS.body, { rotate: bodyRot, scaleY: 1, y: 0 }, { duration: dur, ease: "linear" }).finished,
      A(PARTS.crest, { rotate: stream }, { duration: dur, ease: "linear" }).finished,
      A(PARTS.tail, { rotate: stream.map((v) => v * 1.2) }, { duration: dur, ease: "linear" }).finished,
      A(PARTS.shadow, { scaleX: shScale, opacity: shOp }, { duration: dur, ease: "linear" }).finished,
    ]);
    rootX.current = p.x;
    rootY.current = p.y;
    // land: wings fold back, a soft cushioned squash, shadow restores. The legs
    // are deliberately NOT touched here: they were already sent to 0 mid-descent
    // above, and their spring may still be settling — superseding it would leave
    // an unresolvable `.finished` (see the comment on the mid-descent unfold).
    await Promise.all([
      A(PARTS.leftWing, { rotate: 0 }, SPRINGS.settle).finished,
      A(PARTS.rightWing, { rotate: 0 }, SPRINGS.settle).finished,
      A(PARTS.leftWingArm, { opacity: 0 }, { duration: 0.2 }).finished,
      A(PARTS.rightWingArm, { opacity: 0 }, { duration: 0.2 }).finished,
      A(PARTS.leftWingFold, { opacity: 1 }, { duration: 0.2 }).finished,
      A(PARTS.rightWingFold, { opacity: 1 }, { duration: 0.2 }).finished,
      A(PARTS.shadow, { scaleX: 1, opacity: 0.18 }, SPRINGS.gentle).finished,
      A(PARTS.body, { scaleY: [1.08, 0.95, 1], y: [0, 3, 0], rotate: 0 }, { duration: 0.45, ease: EASE_SPRING }).finished,
    ]);
  }

  async function flyCore(target: Target) {
    const p = rootTranslateFor(target);
    damper.suspend();
    try {
      // 1. takeoff: a quick, shallow crouch + a push off the legs (kept short so it leaves the
      //    ground promptly instead of sitting low). swap to flight wings, raise into a V, tuck legs.
      await Promise.all([
        A(PARTS.leftWingFold, { opacity: 0 }, { duration: 0.1 }).finished,
        A(PARTS.rightWingFold, { opacity: 0 }, { duration: 0.1 }).finished,
        A(PARTS.leftWingArm, { opacity: 1 }, { duration: 0.1 }).finished,
        A(PARTS.rightWingArm, { opacity: 1 }, { duration: 0.1 }).finished,
        A(PARTS.body, { scaleY: [1, 0.9, 1], y: [0, 4, 0] }, { duration: 0.22, ease: "easeOut" }).finished,
        A(PARTS.leftWing, { rotate: -74 }, SPRINGS.snappy).finished,
        A(PARTS.rightWing, { rotate: 74 }, SPRINGS.snappy).finished,
        A(PARTS.leftLeg, { rotate: 138 }, SPRINGS.gentle).finished,
        A(PARTS.rightLeg, { rotate: -138 }, SPRINGS.gentle).finished,
      ]);
      // 2-3. cruise + land, shared with flyIn.
      await arcAndLand(rootX.current, rootY.current, p);
    } finally {
      damper.resume();
    }
  }
  const flyTo = (target: Target) => enqueue(() => (variant === "icon" ? Promise.resolve() : flyCore(target)));

  // FLY-IN: an off-canvas entrance for a mount with no CTA-click origin to launch a
  // cross-page flight from (e.g. a small mobile auth panel). Instantly (no animated
  // travel) warps the puppet to just outside its own rendered box on the given edge,
  // already posed for flight, then runs the identical cruise-and-land arc `flyTo`
  // uses onto `target` (defaults to the rig's own rest anchor). Requires the SVG's
  // own overflow:visible (already set on the root <m.svg>) and enough clearance
  // in the mounting page for the off-canvas start point not to get clipped.
  function offCanvasStart(edge: FlyInEdge): { x: number; y: number } {
    const svg = scopeEl();
    const r = svg?.getBoundingClientRect();
    const w = r?.width || 120;
    const h = r?.height || 152;
    // convert a px clearance margin into this rig's own viewBox units, so the start
    // point clears the box by the same visual amount regardless of the `size` prop.
    const vbPerPxX = 120 / (w || 1);
    const vbPerPxY = 152 / (h || 1);
    const marginPx = Math.max(w, h) * 1.15;
    if (edge === "left") return { x: -marginPx * vbPerPxX, y: -marginPx * 0.25 * vbPerPxY };
    if (edge === "right") return { x: marginPx * vbPerPxX, y: -marginPx * 0.25 * vbPerPxY };
    if (edge === "sky") {
      // Fully above the VIEWPORT, not merely above the rig's own box. The auth
      // pages' rig sits mid-viewport, so the box-relative "top" margin below
      // started the bird already on screen and it "half-appeared" mid-air.
      // `rect.top + h` px of lift puts the bird's bottom edge exactly at
      // viewport y=0; SKY_PAD_PX more keeps the drop shadow (drawn below the
      // feet) and the first frames of descent clear of the edge. The
      // box-relative margin stays as a floor so a rig scrolled to (or above)
      // the viewport top still starts clear of its own box, never below it.
      const skyPx = Math.max(marginPx, (r?.top ?? 0) + h + SKY_PAD_PX);
      return { x: 0, y: -skyPx * vbPerPxY };
    }
    return { x: 0, y: -marginPx * vbPerPxY }; // "top" (default)
  }
  async function flyInRaw(edge: FlyInEdge, target?: Target) {
    const start = offCanvasStart(edge);
    const end = target ? rootTranslateFor(target) : { x: 0, y: 0 }; // {0,0} = the rig's own rest anchor
    damper.suspend();
    try {
      // snap straight to the airborne pose at the off-canvas point; no ground crouch
      // to play since the bird is meant to already be mid-flight when it appears.
      // The duration-0 warps are AWAITED before the arc (motion applies them on
      // its next frame, not synchronously): starting the arc in the same tick
      // let its keyframes race the warps for the same properties, and a caller
      // revealing the rig for a fly-in could paint one frame of the seated bird
      // at the perch before the warp moved it off-screen (the mobile auth
      // "ghost frame"). Costs at most one frame, off-screen.
      rootX.current = start.x;
      rootY.current = start.y;
      await Promise.all([
        A(PARTS.root, { x: start.x, y: start.y }, { duration: 0 }).finished,
        A(PARTS.leftWingFold, { opacity: 0 }, { duration: 0 }).finished,
        A(PARTS.rightWingFold, { opacity: 0 }, { duration: 0 }).finished,
        A(PARTS.leftWingArm, { opacity: 1 }, { duration: 0 }).finished,
        A(PARTS.rightWingArm, { opacity: 1 }, { duration: 0 }).finished,
        A(PARTS.leftLeg, { rotate: 138 }, { duration: 0 }).finished,
        A(PARTS.rightLeg, { rotate: -138 }, { duration: 0 }).finished,
        A(PARTS.leftWing, { rotate: -50 }, { duration: 0 }).finished,
        A(PARTS.rightWing, { rotate: 50 }, { duration: 0 }).finished,
      ]);
      await arcAndLand(start.x, start.y, end);
    } finally {
      damper.resume();
    }
  }
  const flyIn = (edge: FlyInEdge = "top", target?: Target) =>
    enqueue(() => (variant === "icon" ? Promise.resolve() : flyInRaw(edge, target)));

  const land = () =>
    enqueue(async () => {
      await A(PARTS.body, { scaleY: [1.04, 0.95, 1], y: [0, 2, 0] }, { duration: 0.4, ease: EASE_SPRING }).finished;
    });

  // ---- cross-screen flight pose primitives ----
  // The bird's TRANSLATION across the viewport is owned by an outer layer (the
  // app's mascot flight layer, which carries this rig in a portal from a CTA to
  // the destination form). These verbs drive only the PUPPET so the same bird
  // that flaps here can be positioned anywhere on the page. Values reuse the
  // proven poses from flyCore so a cross-screen flight reads like the in-SVG one.
  const glideCtls = useRef<AnimationPlaybackControls[]>([]).current;
  function stopGlide() {
    for (const c of glideCtls) c.stop();
    glideCtls.length = 0;
  }
  // 1. launch pose: swap to flight (arm) wings, raise them into a V, tuck the
  //    legs up, and give a quick crouch-push off the ground.
  async function takeOffRaw(dir: 1 | -1 = 1) {
    await Promise.all([
      A(PARTS.leftWingFold, { opacity: 0 }, { duration: 0.1 }).finished,
      A(PARTS.rightWingFold, { opacity: 0 }, { duration: 0.1 }).finished,
      A(PARTS.leftWingArm, { opacity: 1 }, { duration: 0.1 }).finished,
      A(PARTS.rightWingArm, { opacity: 1 }, { duration: 0.1 }).finished,
      A(PARTS.body, { scaleY: [1, 0.88, 1], y: [0, 5, 0], rotate: dir * 4 }, { duration: 0.26, ease: "easeOut" }).finished,
      A(PARTS.leftWing, { rotate: -74 }, SPRINGS.snappy).finished,
      A(PARTS.rightWing, { rotate: 74 }, SPRINGS.snappy).finished,
      A(PARTS.leftLeg, { rotate: 138 }, SPRINGS.gentle).finished,
      A(PARTS.rightLeg, { rotate: -138 }, SPRINGS.gentle).finished,
    ]);
  }
  // NOT queued: the flight layer owns the take-off -> glide -> perch timing
  // externally, so these must not go through the puppet's action queue. (Queuing
  // take-off would also wedge the pump: glide supersedes take-off's wing
  // animation, and a superseded motion animation's `.finished` never resolves,
  // so an awaited-in-queue take-off would hang the pump forever.)
  const takeOff = () => (variant === "icon" ? Promise.resolve() : takeOffRaw());

  // 1.5 landing gear: the legs come out of the 138° flight tuck DURING the
  // final descent (the flight layer fires this at LEGS_DOWN_AT of its cruise;
  // arcAndLand times its own equivalent), so the bird crosses touchdown with
  // legs already extended instead of sprouting them after it has landed. Not
  // queued (see takeOff) and fire-and-forget: perch settles the legs again
  // anyway, and nothing must ever await this — a later same-part write would
  // supersede the spring and leave its `.finished` unresolvable.
  const legsDown = () => {
    if (variant === "icon") return;
    A(PARTS.leftLeg, { rotate: 0 }, SPRINGS.gentle);
    A(PARTS.rightLeg, { rotate: 0 }, SPRINGS.gentle);
  };

  // 2. cruise: continuous wingbeats (up -74 .. down -26) plus a steady bank into
  //    the direction of travel and streamed-back crest/tail. Not queued (a live
  //    loop, like gaze); `perch` stops it. dir: +1 travelling right, -1 left.
  function glide(dir: 1 | -1 = 1) {
    if (variant === "icon") return;
    stopGlide();
    // Use the guarded A() so a zero-match selector (the tail when tail={false},
    // which is the flyer's default) is a no-op instead of motion's "No valid
    // elements provided" throw. A() also tracks these in `live` for stop().
    const lw = A(PARTS.leftWing, { rotate: [-74, -26, -74] }, { duration: 0.44, repeat: Infinity, ease: "easeInOut" });
    const rw = A(PARTS.rightWing, { rotate: [74, 26, 74] }, { duration: 0.44, repeat: Infinity, ease: "easeInOut" });
    A(PARTS.body, { rotate: dir * 5 }, SPRINGS.gentle);
    A(PARTS.crest, { rotate: -dir * 7 }, SPRINGS.gentle);
    A(PARTS.tail, { rotate: -dir * 9 }, SPRINGS.gentle);
    glideCtls.push(lw, rw);
  }

  // 3. landing: stop the flap, fold the wings back, drop the legs, and cushion
  //    down with a soft squash + level out. Leaves the bird in a clean rest pose.
  async function perchRaw() {
    stopGlide();
    await Promise.all([
      A(PARTS.leftWing, { rotate: 0 }, SPRINGS.settle).finished,
      A(PARTS.rightWing, { rotate: 0 }, SPRINGS.settle).finished,
      A(PARTS.leftWingArm, { opacity: 0 }, { duration: 0.2 }).finished,
      A(PARTS.rightWingArm, { opacity: 0 }, { duration: 0.2 }).finished,
      A(PARTS.leftWingFold, { opacity: 1 }, { duration: 0.2 }).finished,
      A(PARTS.rightWingFold, { opacity: 1 }, { duration: 0.2 }).finished,
      A(PARTS.leftLeg, { rotate: 0 }, SPRINGS.gentle).finished,
      A(PARTS.rightLeg, { rotate: 0 }, SPRINGS.gentle).finished,
      A(PARTS.crest, { rotate: 0 }, SPRINGS.settle).finished,
      A(PARTS.tail, { rotate: 0 }, SPRINGS.settle).finished,
      A(PARTS.body, { scaleY: [1.08, 0.95, 1], y: [0, 3, 0], rotate: 0 }, { duration: 0.45, ease: EASE_SPRING }).finished,
    ]);
  }
  // NOT queued (see takeOff). perchRaw stops the glide loop itself, and nothing
  // supersedes its fold, so its `.finished` resolves and the layer can await it.
  const perch = () => (variant === "icon" ? Promise.resolve() : perchRaw());

  const celebrate = (level: Level = 2) =>
    enqueue(async () => {
      const now = safeNow();
      const cooldown = level >= 3 ? 3000 : level === 2 ? 1200 : 0;
      if (now > 0 && cooldown > 0 && now - celebrateAt.current < cooldown) return;
      celebrateAt.current = now;
      damper.suspend();
      try {
        // Celebrate FACE-ON, and hand the face back the way we found it.
        //
        // A celebration is nearly always preceded by something that posed the
        // head: the quick check runs react("thinking") first, whose
        // EXPRESSIONS.curious cocks the head 10 degrees and biases the gaze,
        // and nothing downstream ever put either back. So the bird celebrated
        // with its head on one side and then simply kept it there — for the
        // password step and every step after (owner, 2026-08-11: "it turns its
        // head before celebrating. Why turn head ... by default this hoopoe is
        // now with its head turned right").
        //
        // Levelling here rather than in react("thinking") keeps the ponder
        // intact (it is a liked beat) while making the celebration the thing
        // that clears it, which is also correct for every other caller: none of
        // them want to inherit whatever pose happened to precede the moment.
        // Fire-and-forget, so the head levels INTO the opening hop rather than
        // gating it; nothing else writes PARTS.head here, so there is no
        // supersede to strand.
        gazeTo(0);
        void A(PARTS.head, { rotate: 0, y: 0 }, SPRINGS.gentle);
        setEye("happy");
        const dur = level >= 3 ? 1.3 : 0.85;
        const hop1 = level >= 3 ? -38 : -24;
        await Promise.all([
          A(PARTS.root, { y: [rootY.current, rootY.current + hop1, rootY.current] }, { duration: dur, ease: EASE_SPRING }).finished,
          A(PARTS.shadow, { scaleX: [1, 0.6, 1], opacity: [0.18, 0.07, 0.18] }, { duration: dur }).finished,
          A(PARTS.leftWing, { rotate: [0, -104, -24, -104, 0] }, { duration: dur, ease: "easeInOut" }).finished,
          A(PARTS.rightWing, { rotate: [0, 104, 24, 104, 0] }, { duration: dur, ease: "easeInOut" }).finished,
          A(PARTS.tail, { scaleX: [1, 1.2, 1], rotate: [0, 14, -8, 0] }, { duration: dur, ease: EASE_SPRING }).finished,
          A(PARTS.crest, { scaleX: [1, 1.28, 1.1], scaleY: [1, 1.12, 1] }, { duration: dur, ease: EASE_SPRING }).finished,
          burstParticles(level >= 3 ? 9 : level === 2 ? 6 : 3),
        ]);
        await A(PARTS.crest, { scaleX: 1, scaleY: 1 }, SPRINGS.settle).finished;
        // Round eyes back, exactly the way peckRaw hands its happy eyes back.
        // Without this the `happy` arc survived the celebration, and the arc is
        // a stroked curve with no pupil (see EXPRESSIONS.love in hoopoe-kit for
        // why that matters), so the quick check's next step tucked the wings
        // over a face that had never returned to normal (owner, 2026-08-11:
        // "it closes its eyes ... but the eyes are still in love, they're not
        // back to normal. They should be back to normal before closing").
        setEye("round");
      } finally {
        damper.resume();
      }
    });

  function burstParticles(n: number): Promise<unknown> {
    const svg = scopeEl();
    if (!svg) return Promise.resolve();
    const sprites = Array.from(svg.querySelectorAll<SVGElement>("[data-particle]")).slice(0, n);
    return Promise.all(
      sprites.map((el, i) => {
        const ang = -Math.PI / 2 + rand(-0.9, 0.9);
        const dist = rand(28, 48);
        const dx = Math.cos(ang) * dist;
        const dy = Math.sin(ang) * dist;
        return anim(
          el,
          { x: [0, dx], y: [0, dy], opacity: [0, 1, 0], rotate: [0, rand(-120, 120)], scale: [0.4, 1, 0.8] },
          { duration: 0.85, delay: i * 0.04, ease: "easeOut" }
        ).finished;
      })
    );
  }

  // ----- gaze (continuous, not queued) -----
  let ambient: ReturnType<typeof setInterval> | null = null;
  function clearAmbient() {
    if (ambient) {
      clearInterval(ambient);
      ambient = null;
    }
  }
  function gazeTo(to: number | Target) {
    clearAmbient();
    if (typeof to === "number") {
      gazeX.set(clamp(to, -1, 1));
      gazeY.set(0);
      return;
    }
    if (to === null) {
      ambient = setInterval(() => {
        gazeX.set(rand(-0.4, 0.4));
        gazeY.set(rand(-0.25, 0.2));
      }, 2200);
      return;
    }
    const { nx, ny } = dirVector(to);
    gazeX.set(clamp(nx * 1.1, -1, 1));
    gazeY.set(clamp(ny * 1.1, -1, 1));
  }

  // ----- cover / peek (login; not queued) -----
  // the wings lift (y) + draw inward (x) + rotate so they cover the EYES (peek-a-boo), not the beak.
  // a springy overshoot (SPRINGS.bounce) gives a little bounce on the way up/down (attention to detail).
  function coverEyes() {
    A(PARTS.leftWing, { rotate: -163, x: 6, y: -17 }, SPRINGS.bounce as never);
    A(PARTS.rightWing, { rotate: 163, x: -6, y: -17 }, SPRINGS.bounce as never);
  }
  function peek() {
    A(PARTS.leftWing, { rotate: 0, x: 0, y: 0 }, SPRINGS.bounce as never);
    A(PARTS.rightWing, { rotate: 0, x: 0, y: 0 }, SPRINGS.bounce as never);
  }
  // ----- sleep / wake (deep-idle rest; suspends the ambient loop for as long as it holds) -----
  const asleepRef = useRef(false);
  async function sleepRaw() {
    if (asleepRef.current) return; // already asleep, no-op
    asleepRef.current = true;
    // suspend()'s partner resume() lives in wakeRaw (or stop(), if interrupted) rather
    // than a finally block here — unlike every other verb, this hold is meant to
    // persist well past this single async call, for as long as the bird is "asleep".
    damper.suspend();
    gazeX.set(0);
    gazeY.set(0);
    await applyChord(EXPRESSIONS.asleep, { spring: SPRINGS.soft });
  }
  const sleepVerb = () => enqueue(() => sleepRaw());
  async function wakeRaw() {
    if (!asleepRef.current) return; // already awake, no-op
    // a small stretch before opening the eyes: crest flick + a light wing shrug
    await Promise.all([
      A(PARTS.crest, { rotate: [null as never, -6, 3, 0], scaleX: [null as never, 1.08, 1] }, { duration: 0.5, ease: EASE_SPRING }).finished,
      A(PARTS.leftWing, { rotate: [0, -12, 0] }, { duration: 0.5, ease: EASE_SOFT }).finished,
      A(PARTS.rightWing, { rotate: [0, 12, 0] }, { duration: 0.5, ease: EASE_SOFT }).finished,
    ]);
    await applyChord(EXPRESSIONS.content, { spring: SPRINGS.gentle });
    asleepRef.current = false;
    // a soft double-blink as the eyes flutter open (inlined, not the queued blinkOnce()
    // verb: calling another enqueue()'d verb from inside a step that is itself running
    // as part of the queue would deadlock the single pump — see react()'s note below).
    await A(PARTS.eyeBlink, { scaleY: [1, 0.05, 1] }, { duration: 0.2, ease: "easeInOut" }).finished;
    await A(PARTS.eyeBlink, { scaleY: [1, 0.05, 1] }, { duration: 0.2, ease: "easeInOut" }).finished;
    // Resumed AFTER the blinks, not before them (moved 2026-08-03). The ambient
    // idle blink writes the SAME `scaleY` on the SAME PARTS.eyeBlink selector,
    // and it is gated only on `damper.active` (see the idle effect below), so
    // resuming first re-armed it right on top of the ~400ms of blinks this
    // function then awaited. A superseded animation's `.finished` never
    // resolves in motion v12 (the abort-token note at the top of this file),
    // so one unlucky ambient blink hung wake() forever — and with it every
    // caller awaiting it, the sidebar's idle bird being the one that showed.
    // Nothing is lost by holding the damper 400ms longer: the bird is mid-wake,
    // which is precisely when the ambient loop should still be out of the way.
    damper.resume(); // idle breathe/blink/sparkle/flick pick back up
  }
  const wakeVerb = () => enqueue(() => wakeRaw());

  // ----- poke: somebody tapped the bird -----
  // Built from the head, crest, eyes, bill, body and legs and NEVER the wings:
  // the sign-in birds hold their wings over their eyes for as long as the
  // password is hidden, and a tap must not be the thing that uncovers them.
  // For the same reason the startle is applyChord, not express(), which
  // levels the wings.
  function poke() {
    if (asleepRef.current || huffing.current) return;
    const now = safeNow();
    pokeCount.current = now - pokeAt.current < POKE_STREAK_MS ? pokeCount.current + 1 : 1;
    pokeAt.current = now;
    // One queued at a time. Taps that land while it is still reacting only
    // raise the count, so the NEXT reaction is the bigger one.
    if (pokePending.current) return;
    pokePending.current = true;
    void enqueue(pokeRaw);
  }

  async function pokeRaw() {
    pokePending.current = false;
    if (asleepRef.current) return;
    const token = abortRef.current;
    const count = pokeCount.current;
    const before = chordNow.current;
    const gx = gazeX.get();
    const gy = gazeY.get();
    damper.suspend();
    try {
      if (count >= POKE_FLUSTER_AT) {
        pokeCount.current = 0;
        huffing.current = true;
        await flusterRaw(before, token);
      } else if (count >= 2) {
        await bounceRaw(before);
      } else {
        await giggleRaw(before);
      }
    } finally {
      huffing.current = false;
      if (!token.aborted) {
        gazeX.set(gx);
        gazeY.set(gy);
      }
      damper.resume();
    }
  }

  // One tap: happy eyes, the crest pops, a small bounce on the spot.
  async function giggleRaw(c: Chord) {
    setEye("happy");
    await Promise.all([
      A(PARTS.root, { y: [rootY.current, rootY.current - 5, rootY.current] }, { duration: 0.34, ease: EASE_SPRING }).finished,
      A(PARTS.crest, { scaleX: [null as never, c.crest.sx * 1.28, c.crest.sx], scaleY: [null as never, c.crest.sy * 1.1, c.crest.sy], rotate: [null as never, c.crest.rot - 6, c.crest.rot] }, { duration: 0.5, ease: EASE_SPRING }).finished,
      A(PARTS.billLower, { rotate: [null as never, 7, c.bill] }, { duration: 0.34, ease: EASE_SOFT }).finished,
    ]);
    await sleep(120);
    setEye(c.eye);
  }

  // Two to four quick taps: a crouch, a real jump with the feet kicking, and a
  // blink on landing, the same beat the hop verb ends on.
  async function bounceRaw(c: Chord) {
    const times = [0, 0.22, 0.62, 1];
    setEye("happy");
    await Promise.all([
      A(PARTS.body, { scaleY: [null as never, 0.9, 1.07, 1], y: [null as never, 3, -1, 0] }, { duration: 0.5, times }).finished,
      A(PARTS.root, { y: [rootY.current, rootY.current, rootY.current - 16, rootY.current] }, { duration: 0.5, times, ease: "easeInOut" }).finished,
      A(PARTS.shadow, { scaleX: [1, 1, 0.74, 1], opacity: [0.18, 0.18, 0.09, 0.18] }, { duration: 0.5, times }).finished,
      A(PARTS.leftLeg, { rotate: [0, -10, 22, 0] }, { duration: 0.5, times }).finished,
      A(PARTS.rightLeg, { rotate: [0, 10, -22, 0] }, { duration: 0.5, times }).finished,
      A(PARTS.crest, { scaleX: [null as never, c.crest.sx * 1.36, c.crest.sx], scaleY: [null as never, c.crest.sy * 1.14, c.crest.sy] }, { duration: 0.56, ease: EASE_SPRING }).finished,
    ]);
    await A(PARTS.eyeBlink, { scaleY: [1, 0.06, 1] }, { duration: 0.16 }).finished;
    setEye(c.eye);
  }

  // Five in a row: a startle, then it turns its face away with its chin up
  // and its crest folded, peeks back to check you are still there, and
  // forgives you with a little hop and a couple of hearts.
  async function flusterRaw(c: Chord, token: { aborted: boolean }) {
    const s = Math.random() < 0.5 ? -1 : 1;
    await Promise.all([
      applyChord(EXPRESSIONS.surprise, { spring: SPRINGS.snappy }),
      A(PARTS.root, { y: [rootY.current, rootY.current - 7, rootY.current] }, { duration: 0.42, ease: EASE_SPRING }).finished,
    ]);
    await sleep(260);
    if (token.aborted) return;

    gazeX.set(s * 0.95);
    gazeY.set(-0.15);
    setEye("sleepy");
    await Promise.all([
      A(PARTS.head, { rotate: s * 12, y: -1.5 }, SPRINGS.gentle).finished,
      A(PARTS.crest, { scaleX: 0.5, scaleY: 0.86, rotate: s * 8 }, SPRINGS.gentle).finished,
      A(PARTS.brows, { opacity: 0 }, SPRINGS.gentle).finished,
      A(PARTS.billLower, { rotate: 0 }, SPRINGS.gentle).finished,
    ]);
    await sleep(HUFF_HOLD_MS);
    if (token.aborted) return;

    gazeX.set(s * 0.35);
    await sleep(320);
    if (token.aborted) return;

    gazeX.set(0);
    gazeY.set(0);
    setEye("happy");
    await Promise.all([
      A(PARTS.head, { rotate: 0, y: 0 }, SPRINGS.gentle).finished,
      A(PARTS.crest, { scaleX: [null as never, 1.3, 1.1], scaleY: [null as never, 1.1, 1], rotate: 0 }, { duration: 0.55, ease: EASE_SPRING }).finished,
      A(PARTS.root, { y: [rootY.current, rootY.current - 8, rootY.current] }, { duration: 0.4, ease: EASE_SPRING }).finished,
      burstParticles(3),
    ]);
    await sleep(200);
    if (token.aborted) return;
    await applyChord(c);
  }

  // ----- control -----
  function stop() {
    queue.length = 0;
    stopGlide();
    for (const c of live) c.stop(); // commit current values (no snap-back)
    live.clear();
    clearAmbient();
    abortRef.current.aborted = true;
    abortRef.current.release(); // unblock pump's race so it exits cleanly
    arm();
    asleepRef.current = false; // an interrupted sleep no longer owns the damper hold below
    // A poke abandoned mid-reaction never reaches its own finally, so its
    // flags are dropped here or the bird would ignore every tap after.
    pokePending.current = false;
    huffing.current = false;
    pokeCount.current = 0;
    while (damper.active) damper.resume();
  }
  function cancel() {
    stop();
    void rest();
  }
  const rest = () =>
    enqueue(async () => {
      gazeX.set(0);
      gazeY.set(0);
      await Promise.all([
        applyChord(EXPRESSIONS.content),
        A(PARTS.leftWing, { rotate: 0, scaleX: 1, x: 0, y: 0 }, SPRINGS.bounce).finished,
        A(PARTS.rightWing, { rotate: 0, scaleX: 1, x: 0, y: 0 }, SPRINGS.bounce).finished,
        A(PARTS.leftLeg, { rotate: 0 }, SPRINGS.settle).finished,
        A(PARTS.rightLeg, { rotate: 0 }, SPRINGS.settle).finished,
        A(PARTS.body, { rotate: 0 }, SPRINGS.gentle).finished,
        A(PARTS.root, { rotate: 0 }, SPRINGS.settle).finished,
      ]);
    });
  const isBusy = () => queue.length > 0 || draining.current || live.size > 0;

  // ----- semantic sugar -----
  // react is NOT enqueued: it composes the public verbs through sequence(), so each verb queues and
  // drains normally. (Wrapping react in enqueue and awaiting enqueued verbs inside would deadlock the
  // single pump: the awaited verb cannot run until the awaiting step finishes.)
  function react(event: SemanticEvent): Promise<void> {
    switch (event) {
      case "correct":
        return sequence(["express", "happy"], ["nod", 1], ["crestFlick"]);
      case "wrong":
        return sequence(["shake", 1], ["express", "worried", { hold: 450 }], ["express", "content"]);
      case "success":
        return celebrate(2);
      case "error":
        return sequence(["express", "worried"], ["shake", 1]);
      case "thinking":
        gazeX.set(0.35);
        gazeY.set(-0.6); // look up while thinking
        return sequence(["express", "curious"], ["blinkOnce", true]);
      case "greet":
        // Happy FIRST, then the wave (owner, 2026-08-04: "when it's waving I
        // don't want the eyebrows to show ... it looks concerned when it's
        // waving. Maybe let it wave when it's happy instead"). Waving out of
        // whatever pose the bird happened to be in meant the face during the
        // wave was never decided; only the beat after it was. `happy` is the
        // one warm chord with brow.op 0 (hoopoe-kit.ts EXPRESSIONS), so
        // leading with it both fixes the brows and means the wave is finally
        // performed by a bird that is already pleased to see you.
        return sequence(["express", "happy"], ["wave", 2], ["crestFlick"]);
      case "idleBored":
        return sequence(
          () => { gazeX.set(-0.5); },
          ["express", "sleepy", { hold: 500 }],
          () => { gazeX.set(0.5); },
          wait(500),
          ["express", "content"]
        );
      default:
        return Promise.resolve();
    }
  }

  const sequence = (...steps: Step[]): Promise<void> => runSteps(steps);
  async function runSteps(steps: Step[]): Promise<void> {
    for (const st of steps) await runStep(st);
  }
  async function runStep(st: Step): Promise<void> {
    if (typeof st === "function") {
      await st();
      return;
    }
    if (Array.isArray(st)) {
      const [name, ...args] = st;
      const fn = (api as unknown as Record<string, (...a: unknown[]) => Promise<void>>)[name];
      if (fn) await fn(...args);
      return;
    }
    if ("wait" in st) {
      await sleep(st.wait);
      return;
    }
  }

  // Build the api once: every verb closes over stable refs / motion values / the stable `animate`,
  // so freezing the object keeps it correct while giving useImperativeHandle a stable identity.
  const api = useMemo<HoopoeApi>(
    () => ({
      walk, hop, flyTo, land, takeOff, glide, legsDown, perch, turn, point, wave, nod, shake, crest, crestFlick,
      preen, peck, flyIn,
      express, celebrate, blinkOnce, gaze: gazeTo,
      coverEyes, peek, sleep: sleepVerb, wake: wakeVerb, poke, sequence, react, stop, cancel, rest, isBusy,
    }),
    // verbs are stable by construction (see note above); intentionally build once
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // unmount cleanup: clear the ambient gaze loop and freeze any in-flight animations
  useEffect(
    () => () => {
      clearAmbient();
      for (const c of live) c.stop();
      live.clear();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return { api, damper };
}

// Date.now is blocked in some sandboxes; guard for cooldown timing only.
function safeNow(): number {
  try {
    return Date.now();
  } catch {
    return 0;
  }
}

/* ---- the component ---- */
export interface HoopoeProps {
  size?: number;
  variant?: "full" | "icon";
  className?: string;
  initialExpression?: Expression;
  onReady?: (api: HoopoeApi) => void;
  idle?: boolean;
  /** Whether a tap on the bird pokes it (see `poke()`). On by default, so a
   *  new bird anywhere in the app answers a tap without anyone remembering to
   *  ask. Off where a click on or around the bird already means something
   *  else (the 404's fly-to-the-click, the playground's scene, the sidebar
   *  bird that a click wakes) and on birds nobody can reach (in flight, the
   *  off-screen warm-up). */
  pokeable?: boolean;
  tail?: boolean;
  // proportion knobs (defaults = the canonical baby hoopoe; the lab's Proportion Studio drives these)
  headScale?: number; // 0.86..1.0 typical; head shrinks upward, bottom stays attached to the body
  eyeScale?: number; // eye size multiplier
  eyeY?: number; // vertical eye offset in viewBox units (negative = higher = less forehead)
  eyeSpread?: number; // horizontal eye spacing offset (negative = closer together)
  billLength?: number; // beak length multiplier (1 = canonical)
}

export const Hoopoe = forwardRef<HoopoeApi, HoopoeProps>(function Hoopoe(
  { size = 160, variant = "full", className = "", onReady, idle = true, pokeable = true, tail = false, headScale = 1, eyeScale = 1, eyeY = 0, eyeSpread = 0, billLength = 1 },
  ref
) {
  // ---- geometry. Head center is pinned (60,56); a smaller headScale shrinks the cranium AROUND
  // the eyes (so the eyes look bigger and the forehead shrinks) while staying attached to the body.
  // Eyes/bill keep their canonical place; eyeY/eyeSpread/eyeScale/billLength nudge them. ----
  const headRy = 27 * headScale;
  const headRx = 30 * headScale;
  const headCy = 56;
  const eyeCy = 61 + eyeY;
  const eyeDX = 9 + eyeSpread;
  const eyeLx = 60 - eyeDX;
  const eyeRx = 60 + eyeDX;
  const browY = eyeCy - 11;
  // bill: fixed at the top (y62.5), length scales downward. hinge + tip + control points all scale.
  const billTop = 62.5;
  const billHinge = billTop + 11.5 * billLength; // 74 at length 1
  const billTip = billTop + 18 * billLength; // 80.5 at length 1
  const billMidC = billTop + 5.5 * billLength; // upper control
  const billLowC = billHinge + 4 * billLength; // lower control
  const billUpper = `M58.2 ${billTop} Q57.5 ${billMidC} 58.9 ${billHinge} L61.1 ${billHinge} Q62.5 ${billMidC} 61.8 ${billTop} Q60 ${billTop - 1.3} 58.2 ${billTop} Z`;
  const billLowerD = `M58.9 ${billHinge} Q59.3 ${billLowC} 60 ${billTip} Q60.7 ${billLowC} 61.1 ${billHinge} Z`;
  const [scope, animate] = useAnimate();
  const { paused } = useValleyMotion();

  const gazeX = useMotionValue(0);
  const gazeY = useMotionValue(0);
  const sx = useSpring(gazeX, SPRINGS.gentle);
  const sy = useSpring(gazeY, SPRINGS.gentle);
  const eyeTX = useTransform(sx, [-1, 1], [-3.4, 3.4]);
  const eyeTY = useTransform(sy, [-1, 1], [-2.6, 2.6]);
  const headRotMv = useTransform(sx, [-1, 1], [-5, 5]);
  // the beak swings toward where the bird looks AND translates with the eyes (nearly matching eyeTX)
  // so its top never collides with an eye as the face turns.
  const billRot = useTransform(sx, [-1, 1], [-7, 7]);
  const billTX = useTransform(sx, [-1, 1], [-3.3, 3.3]);

  const { api, damper } = useController({
    animate,
    scopeEl: () => scope.current as SVGSVGElement | null,
    gazeX,
    gazeY,
    variant,
  });

  useImperativeHandle(ref, () => api, [api]);

  // Hover: the eyes look up at whoever is pointing at it, and go back to
  // wherever they were on the way out -- unless something else moved them in
  // the meantime (a form's typing gaze, a moment's glance), which wins.
  const gazeBeforeHover = useRef<{ x: number; y: number } | null>(null);
  const onPointerEnter = () => {
    gazeBeforeHover.current = { x: gazeX.get(), y: gazeY.get() };
    gazeX.set(0);
    gazeY.set(HOVER_GAZE_Y);
  };
  const onPointerLeave = () => {
    const was = gazeBeforeHover.current;
    gazeBeforeHover.current = null;
    if (was && gazeX.get() === 0 && gazeY.get() === HOVER_GAZE_Y) {
      gazeX.set(was.x);
      gazeY.set(was.y);
    }
  };

  // expose to onReady once mounted
  const readyRef = useRef(false);
  useEffect(() => {
    if (readyRef.current) return;
    readyRef.current = true;
    onReady?.(api);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- idle: breathe + blink + eye-sparkle bounce + lazy crest flick (always on; pauses only when tab hidden) ----
  useEffect(() => {
    if (!idle || paused) return;
    let breatheCtl: AnimationPlaybackControls | null = null;
    const startBreathe = () => {
      breatheCtl = animate(PARTS.body, { scaleY: [1, 1.025, 1], y: [0, -1.5, 0] }, { duration: 3.6, repeat: Infinity, ease: "easeInOut" });
    };
    const stopBreathe = () => breatheCtl?.stop();
    damper.bind(stopBreathe, startBreathe);
    // ONLY when nothing is holding the stage, and that condition is the whole
    // fix for the sidebar bird that could not be shooed away (owner,
    // 2026-08-11: "sometimes it's just standing there and no website
    // interaction makes it go away ... only way to get rid of it is reload").
    //
    // This effect re-runs whenever `paused` flips, i.e. every time the tab is
    // hidden and shown again — which is overwhelmingly likely during the
    // 90-120s the idle bird waits out. An unconditional restart here writes
    // PARTS.body {scaleY,y} straight over whatever verb is mid-flight, and
    // arcAndLand AWAITS a body write of its own (`{rotate, scaleY, y}`). A
    // superseded animation's `.finished` never resolves in motion v12 (the
    // abort-token note at the top of this file), so the breathe silently
    // wedged flyIn's promise: the bird landed on the rail, the chain never
    // reached sleep(), the queue never drained, and the flyTo that the next
    // mouse move enqueued sat behind a step that could never finish.
    //
    // damper.resume() already starts the breathe when the verb hands the stage
    // back, so skipping it here loses nothing — a damped bird is one that is
    // deliberately not breathing yet.
    if (!damper.active) startBreathe();

    let blinkT: ReturnType<typeof setTimeout>;
    const scheduleBlink = () => {
      blinkT = setTimeout(() => {
        if (!damper.active) {
          const dbl = Math.random() < 0.2;
          animate(PARTS.eyeBlink, { scaleY: [1, 0.05, 1] }, { duration: dbl ? 0.32 : 0.16, ease: "easeInOut" });
        }
        scheduleBlink();
      }, rand(2400, 5200));
    };
    scheduleBlink();

    // a little life in the eyes: an occasional springy sparkle-bounce (the old avatar had this)
    let sparkleT: ReturnType<typeof setTimeout>;
    const scheduleSparkle = () => {
      sparkleT = setTimeout(() => {
        if (!damper.active) animate(PARTS.eyeBlink, { scale: [1, 1.13, 1] }, { duration: 0.46, ease: EASE_SPRING });
        scheduleSparkle();
      }, rand(3600, 7200));
    };
    scheduleSparkle();

    // The ambient crest flick. The crest is the one part of this bird nobody
    // else's mascot has, and a flick costs the viewer nothing to ignore, so it
    // is the cheapest possible way to keep the rig feeling alive between real
    // events (owner, 2026-08-04: "crest flicks are so unintrusive, a sprinkle
    // of a thing they subconsciously notice as cool").
    //
    // It used to be a bare `rotate: [0, -5, 0]`, which is a lean, not a flick:
    // a fan that tips over and comes back without ever opening reads as the
    // whole head having wobbled. This borrows the shape of the deliberate
    // `crestFlickRaw` verb above -- overshoot past centre on the way back, plus
    // a small scaleY pop so the fan visibly springs -- at slightly lower
    // amplitude, because that one answers a click and this one answers nothing.
    // Cadence tightened from 6-13s to 5-11s: often enough to be noticed within
    // a single glance at a page, still rare enough that it never becomes
    // something happening AT you.
    let flickT: ReturnType<typeof setTimeout>;
    const scheduleFlick = () => {
      flickT = setTimeout(() => {
        if (!damper.active) {
          animate(
            PARTS.crest,
            { rotate: [0, -5, 2.5, 0], scaleY: [1, 1.07, 1] },
            { duration: 0.58, ease: EASE_SPRING }
          );
        }
        scheduleFlick();
      }, rand(5000, 11000));
    };
    scheduleFlick();

    return () => {
      stopBreathe();
      clearTimeout(blinkT);
      clearTimeout(sparkleT);
      clearTimeout(flickT);
      damper.bind(
        () => {},
        () => {}
      );
    };
  }, [animate, paused, idle, damper]);

  const W = 120;
  const H = 152;

  return (
    <m.svg
      ref={scope}
      width={size}
      height={(size * H) / W}
      viewBox="0 -10 120 152"
      className={`hoopoe-mascot ${className}`}
      fill="none"
      /* Still aria-hidden and never focusable, pokeable or not: a poke is a
         toy, not a control, and a keyboard or screen-reader visitor misses
         nothing the page needs by not reaching it. */
      aria-hidden
      onClick={pokeable ? api.poke : undefined}
      onPointerEnter={pokeable ? onPointerEnter : undefined}
      onPointerLeave={pokeable ? onPointerLeave : undefined}
      style={{
        overflow: "visible",
        display: "block",
        /* An explicit value, not inherit: several birds sit inside a
           pointer-events-none wrapper so the empty box around them never
           swallows a click, and the bird itself should still take its tap.
           visiblePainted means only the drawn feathers catch it, never the
           transparent corners of the view-box. `manipulation` lets five fast
           taps be five taps on a phone rather than a double-tap zoom. */
        ...(pokeable
          ? { pointerEvents: "visiblePainted", cursor: "pointer", touchAction: "manipulation", userSelect: "none", WebkitTapHighlightColor: "transparent" }
          : null),
        // feed the tunable eye/brow positions to the rig CSS so gaze/blink
        // pivots follow them. As PERCENTAGES of the view-box, same as every
        // fixed origin in RIG_CSS and for the same Safari-zoom reason (see the
        // RIG_CSS header): px here would be multiplied by the page-zoom factor
        // in WebKit and the blink/brow pivots would slide off the face.
        ["--eye-lx" as string]: `${((eyeLx / 120) * 100).toFixed(4)}%`,
        ["--eye-rx" as string]: `${((eyeRx / 120) * 100).toFixed(4)}%`,
        ["--eye-y" as string]: `${((eyeCy / 152) * 100).toFixed(4)}%`,
        ["--brow-y" as string]: `${((browY / 152) * 100).toFixed(4)}%`,
        ["--bill-y" as string]: `${((billHinge / 152) * 100).toFixed(4)}%`,
      } as React.CSSProperties}
    >
      <style>{RIG_CSS}</style>

      <g data-part="root">
        <ellipse data-part="shadow" cx={60} cy={137} rx={24} ry={4.5} fill={C.shadow} opacity={0.18} />

        {/* tail (behind body): a short, neat stub with the hoopoe white band. Toggleable. */}
        {tail && (
          <g data-part="tail">
            <path d="M53 116 Q53 130 55 135 L65 135 Q67 130 67 116 Q60 113 53 116 Z" fill={C.tailDark} />
            <rect x={54.5} y={127} width={11} height={4.5} rx={1} fill={C.tailBand} />
          </g>
        )}

        {/* legs (behind body) */}
        {variant === "full" && <Leg side={-1} />}
        {variant === "full" && <Leg side={1} />}

        <g data-part="body">
          {/* body — small, round, pudgy */}
          <ellipse cx={60} cy={101} rx={22} ry={21} fill={C.body} />
          {/* soft chest highlight */}
          <ellipse cx={60} cy={106} rx={14} ry={13} fill={C.bodyHi} opacity={0.5} />
          {/* faint shadow where the big head overlaps the chest (depth) */}
          <ellipse cx={60} cy={84} rx={19} ry={6} fill={C.bodySh} opacity={0.22} />

          {/* head + face (gaze rotates the outer group; actions rotate the inner head) */}
          <m.g data-part="headGaze" style={{ rotate: headRotMv }}>
            <g data-part="head">
              {/* crest */}
              <g data-part="crest">
                {CREST_ANGLES.map((a, i) => (
                  <Feather key={i} angle={a} i={i} />
                ))}
              </g>
              {/* big round head (cranium scales via headScale, pinned at its centre) */}
              <ellipse cx={60} cy={headCy} rx={headRx} ry={headRy} fill={C.head} />

              {/* bill: ONE clean slender decurved beak, centered. Length scales via billLength.
                  Upper mandible fixed; the tip (billLower) hinges open for surprise. The whole bill
                  swings/shifts with the gaze (billGaze) so it tracks the eyes when turning. */}
              <m.g data-part="billGaze" style={{ x: billTX, rotate: billRot }}>
                <path d={billUpper} fill={C.bill} />
                <ellipse cx={60} cy={63.5} rx={1.7} ry={1.1} fill={C.billHi} opacity={0.7} />
                <g data-part="billLower">
                  <path d={billLowerD} fill={C.bill} />
                </g>
              </m.g>

              {/* brows (hidden at rest; fade in for emotional poses) */}
              <Brow side={-1} cx={eyeLx} y={browY} />
              <Brow side={1} cx={eyeRx} y={browY} />

              {/* eyes: gaze translate (motion) > blink/sparkle scale (idle) > shape layers (opacity) */}
              <m.g data-part="eyeGazeL" style={{ x: eyeTX, y: eyeTY }}>
                <g data-part="eyeBlinkL">
                  <EyeShapes cx={eyeLx} cy={eyeCy} s={eyeScale} />
                </g>
              </m.g>
              <m.g data-part="eyeGazeR" style={{ x: eyeTX, y: eyeTY }}>
                <g data-part="eyeBlinkR">
                  <EyeShapes cx={eyeRx} cy={eyeCy} s={eyeScale} />
                </g>
              </m.g>
            </g>
          </m.g>
        </g>

        {/* wings (in front, so cover-eyes works) */}
        <Wing side={-1} />
        <Wing side={1} />

        {/* celebrate particles (leaves + hearts), hidden until burst. Base position lives on a
            parent <g>; the inner path animates x/y/rotate/scale about its own bbox so motion
            transforms never clobber the base position. */}
        {Array.from({ length: 9 }).map((_, i) => (
          <g key={i} transform={`translate(${52 + (i % 5) * 4} 92)`}>
            <path
              data-particle
              d="M0 -3.4 Q3 0 0 3.4 Q-3 0 0 -3.4 Z"
              fill={i % 3 === 0 ? C.heart : i % 3 === 1 ? "#1F8A4C" : C.crest}
              opacity={0}
            />
          </g>
        ))}
      </g>
    </m.svg>
  );
});

/* transform-box + transform-origin are !important so they beat motion's
   normal inline writes (motion's imperative animate() sets transform-box:
   fill-box inline, which would re-base every shared anatomical pivot to the
   element's own bbox; an important author rule wins over normal inline).

   THE ORIGINS ARE PERCENTAGES, NOT PX, AND THAT IS A SAFARI FIX (2026-08-11).
   The owner's zoom bug (bugs.md #17) never reproduced because every probe ran
   Chrome, and Chrome resolves a px transform-origin on an SVG child in USER
   UNITS, zoom-independent. The owner zooms in SAFARI, and WebKit resolves the
   same px value as zoomed CSS px: every pivot gets multiplied by the page-zoom
   factor. At Cmd+ (~1.4x) the wing pivot "42px 85px" lands at ~(59,119), the
   bird's bottom centre, so cover-eyes swung the wings off BESIDE the body and
   the eyes never got covered; zoomed out it lands up by the head, which put
   the wing over the crest. All three of the owner's screenshots reduce to
   this one conversion.

   A percentage carries no unit for zoom to scale, so it resolves as a ratio
   of the view-box and the pivots survive any zoom.

   THE MAPPING IS MEASURED, NOT TAKEN FROM THE SPEC. css-transforms-1 says the
   view-box reference box sits at the viewBox ORIGIN, which here is y=-10
   ("0 -10 120 152"), making y% = (y+10)/152. Chrome, measured empirically
   (rotate a part 180deg, midpoint of the before/after boxes = the true
   pivot), anchors percentages at 0 instead and resolves y% x 152 directly:
   the spec mapping landed every y-pivot exactly 10 units low. So the mapping
   is x% = x/120, y% = y/152, verified to reproduce the px pivots to within
   0.1 user unit at zoom 1, CSS zoom 1.5 and 0.75, and a live resize. The
   csswg thread "view-box interacts poorly with transform-origin percentages"
   is this exact ambiguity; if a WebKit measurement ever disagrees with
   Chrome's anchor here, that thread is why. The old px value is kept in a
   comment on every line because the drawing is authored in user units. */
const RIG_CSS = `
.hoopoe-mascot [data-part]{ transform-box: view-box !important; }
.hoopoe-mascot [data-particle]{ transform-box: fill-box !important; }
.hoopoe-mascot [data-part=root]{ transform-origin: 50% 81.5789% !important; }      /* 60 124 */
.hoopoe-mascot [data-part=shadow]{ transform-origin: 50% 90.1316% !important; }    /* 60 137 */
.hoopoe-mascot [data-part=tail]{ transform-origin: 50% 76.3158% !important; }      /* 60 116 */
.hoopoe-mascot [data-part=leftWing]{ transform-origin: 35% 55.9211% !important; }  /* 42 85 */
.hoopoe-mascot [data-part=rightWing]{ transform-origin: 65% 55.9211% !important; } /* 78 85 */
.hoopoe-mascot [data-part=leftLeg]{ transform-origin: 43.3333% 77.6316% !important; }  /* 52 118 */
.hoopoe-mascot [data-part=rightLeg]{ transform-origin: 56.6667% 77.6316% !important; } /* 68 118 */
.hoopoe-mascot [data-part=body]{ transform-origin: 50% 66.4474% !important; }      /* 60 101 */
.hoopoe-mascot [data-part=headGaze]{ transform-origin: 50% 52.6316% !important; }  /* 60 80 */
.hoopoe-mascot [data-part=head]{ transform-origin: 50% 52.6316% !important; }      /* 60 80 */
.hoopoe-mascot [data-part=crest]{ transform-origin: 50% 24.3421% !important; }     /* 60 37 */
.hoopoe-mascot [data-part=browL]{ transform-origin: var(--eye-lx,42.5%) var(--brow-y,32.8947%) !important; }
.hoopoe-mascot [data-part=browR]{ transform-origin: var(--eye-rx,57.5%) var(--brow-y,32.8947%) !important; }
.hoopoe-mascot [data-part=eyeGazeL],.hoopoe-mascot [data-part=eyeBlinkL]{ transform-origin: var(--eye-lx,42.5%) var(--eye-y,40.1316%) !important; }
.hoopoe-mascot [data-part=eyeGazeR],.hoopoe-mascot [data-part=eyeBlinkR]{ transform-origin: var(--eye-rx,57.5%) var(--eye-y,40.1316%) !important; }
.hoopoe-mascot [data-part=billGaze]{ transform-origin: 50% 41.1184% !important; }  /* 60 62.5 */
.hoopoe-mascot [data-part=billLower]{ transform-origin: 50% var(--bill-y,48.6842%) !important; } /* 60 74 */
`;
