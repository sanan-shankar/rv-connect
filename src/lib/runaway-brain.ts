/* ------------------------------------------------------------------ *
 *  The runaway Join button: its mind and its body. Pure TypeScript,
 *  no DOM. runaway-join.tsx feeds it the pointer and the page every
 *  frame and paints whatever pose it hands back. Who it runs from is
 *  runaway-visitor.ts.
 *
 *  Every runaway button on the web asks one question ("is the cursor
 *  within N pixels?") and answers with one move (a random jump, or a
 *  shove straight away). Three tries and you can see the rule. This one
 *  decides the way animals decide to run (escape theory, Ydenberg and
 *  Dill 1986), so there is no single rule to see:
 *
 *  - It judges INTENT, not distance. It reads where the pointer is
 *    heading and how soon it will get there, so a slow drift past can
 *    come within a whisker while a lunge from far off sends it early.
 *    It sees a beat late, like anything with eyes (REACTION_MS).
 *  - A press is a reflex, not a decision. The press itself makes it
 *    flinch, so on the occasions it lets the pointer sit on it (bait),
 *    the click still never lands.
 *  - It picks a move for the moment: a matador's sidestep while it is
 *    calm, a hop once rattled, a dash round you when cornered, ducking
 *    behind the photograph or the edge of the screen and peeking back
 *    out, and creeping home a step at a time while you hold still,
 *    freezing whenever you move (Grandmother's Footsteps).
 *  - It has nerves. Every chase makes it jumpier and calm settles it. A
 *    rattled one hides; a calm one sits in its slot and lets you come.
 *  - Its body follows through: it crouches as you near, leans into its
 *    run, lifts off the page on a hop while its shadow drops away,
 *    squashes when it lands and wobbles back, and its label lags a hair
 *    behind when it sets off.
 * ------------------------------------------------------------------ */

export type Vec = { x: number; y: number };
export type Box = { x: number; y: number; w: number; h: number };

export type World = {
  /** Arena width. Left of 0 or right of w is behind cover: the photograph,
   *  or off the edge of the screen. The arena is clipped at both. */
  w: number;
  /** The band of the arena that is on screen, top to bottom. */
  viewTop: number;
  viewBottom: number;
  /** Home: the full-width slot at the foot of the form. */
  slot: Box;
  /** Fields it would rather not sit on. */
  obstacles: Box[];
  /** Its own size when it is out: the label in a pill. */
  pillW: number;
  pillH: number;
};

export type Sense = {
  /** Where it sees the pointer, a reaction time late. Null when there is none. */
  at: Vec | null;
  /** How the pointer was moving at that moment, px/s. */
  vel: Vec;
  /** How fast the pointer is moving right now, with no delay, px/s. */
  speedNow: number;
  /** ms since the pointer last moved, or since it went away. */
  stillFor: number;
  touch: boolean;
};

export type Pose = {
  /** Centre, arena px. */
  x: number;
  y: number;
  /** The width it is drawn at: the slot's when docked, the pill's when out. */
  ext: number;
  rot: number;
  sx: number;
  sy: number;
  /** 0 on the page, 1 at the top of a hop. */
  lift: number;
  labelX: number;
  labelY: number;
  /** False while it sits in its slot and the real button is what shows. */
  out: boolean;
  /** Opacity of the dashed slot it leaves behind. */
  ghost: number;
};

export type Debug = {
  mode: string;
  /** Where it is, arena px. */
  pill: Vec;
  nerves: number;
  bait: boolean;
  seen: Vec | null;
  ahead: Vec | null;
  candidates: { x: number; y: number; s: number }[];
  target: Vec | null;
};

/* ---- tuning ------------------------------------------------------- */

/** How late it sees the pointer, ms. Re-rolled every few hundred ms, the way
 *  attention wanders, so its timing is never exactly the same twice. */
const REACTION_MS = [70, 125] as const;
/** Seconds for its nerves to settle to a third once the chasing stops. */
const NERVES_CALM_S = 9;
/** Visible sliver when peeking out from cover, px: the least and the most. */
const PEEK_MIN = 22;
const PEEK_MAX = 46;

type Kind = "gather" | "sidestep" | "hop" | "flinch" | "dash" | "tiptoe" | "sneak" | "settle" | "bounce";
type Dodge = "sidestep" | "hop" | "flinch" | "dash";

/** How long each move takes for a distance d (px), how much it overshoots
 *  (zeta: 1 lands dead, lower wobbles past), and how high it lifts. */
const MOVES: Record<Kind, { ms: (d: number) => number; zeta: number; lift: number }> = {
  // The full-width bar pulling in toward its far end, an inchworm. Timed to
  // match the width spring, so the far end stays put while the near one goes.
  gather: { ms: () => 210, zeta: 0.95, lift: 0 },
  // Only just clearing your line, a hair late. A matador, not a rabbit.
  sidestep: { ms: (d) => 110 + d * 0.5, zeta: 0.7, lift: 0.1 },
  hop: { ms: (d) => 200 + d * 0.45, zeta: 0.82, lift: 1 },
  // The press reflex, the fastest thing it does.
  flinch: { ms: (d) => 70 + d * 0.25, zeta: 0.72, lift: 0.35 },
  dash: { ms: (d) => 220 + d * 0.32, zeta: 0.86, lift: 0.3 },
  tiptoe: { ms: () => 170, zeta: 0.95, lift: 0.28 },
  sneak: { ms: (d) => 420 + d * 1.2, zeta: 1, lift: 0 },
  settle: { ms: () => 240, zeta: 1, lift: 0.12 },
  // A hop on the spot: "missed me".
  bounce: { ms: () => 280, zeta: 1, lift: 0.75 },
};

/** The escapes. `reach`: the distances each considers, px. `safeMin`: the
 *  least clearance from the pointer it will accept. `safeCap`: clearance past
 *  which it stops caring, low for the sidestep because the comedy is in how
 *  little it needs to move. `thrift`: what each px of travel costs it. */
const DODGES: Record<Dodge, { reach: number[]; safeMin: number; safeCap: number; thrift: number }> = {
  sidestep: { reach: [40, 56, 74, 96], safeMin: 26, safeCap: 64, thrift: 0.9 },
  hop: { reach: [100, 135, 175, 220], safeMin: 46, safeCap: 190, thrift: 0.22 },
  flinch: { reach: [64, 84, 108], safeMin: 42, safeCap: 110, thrift: 0.35 },
  dash: { reach: [170, 240, 320, 420], safeMin: 70, safeCap: 300, thrift: 0.04 },
};

/* ---- geometry and springs ------------------------------------------ */

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const dist = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);
const ZERO: Vec = { x: 0, y: 0 };

/** Distance from p to a horizontal pill of width e and height h centred on c;
 *  negative inside it. */
export function capsule(p: Vec, c: Vec, e: number, h: number): number {
  const dx = Math.max(Math.abs(p.x - c.x) - Math.max(0, (e - h) / 2), 0);
  return Math.hypot(dx, p.y - c.y) - h / 2;
}

/** Distance from p to the segment a-b. */
function segDist(a: Vec, b: Vec, p: Vec): number {
  const vx = b.x - a.x;
  const vy = b.y - a.y;
  const len2 = vx * vx + vy * vy || 1;
  const t = clamp(((p.x - a.x) * vx + (p.y - a.y) * vy) / len2, 0, 1);
  return Math.hypot(a.x + vx * t - p.x, a.y + vy * t - p.y);
}

type Spring = { x: number; v: number };
const rest = (x = 0): Spring => ({ x, v: 0 });

/** One step of a damped spring toward `goal`, with stiffness k, damping ratio
 *  zeta and an outside force. It settles exactly: left alone, a value decays
 *  through numbers like 1e-77 for a minute and a half, and every one is a new
 *  transform string the page has to restyle. */
function spring(s: Spring, goal: number, k: number, zeta: number, h: number, force = 0) {
  s.v += (k * (goal - s.x) - 2 * zeta * Math.sqrt(k) * s.v + force) * h;
  s.x += s.v * h;
  if (force === 0 && Math.abs(goal - s.x) < 1e-4 && Math.abs(s.v) < 1e-3) {
    s.x = goal;
    s.v = 0;
  }
}

type Path = { p0: Vec; q: Vec; p1: Vec };
type Move = Path & { kind: Kind; u: Spring; k: number; landed: boolean; then?: () => void };

/** A quadratic curve, carried on straight past its end for an overshoot. */
function along(m: Path, u: number): Vec {
  if (u > 1) {
    return { x: m.p1.x + (u - 1) * 2 * (m.p1.x - m.q.x), y: m.p1.y + (u - 1) * 2 * (m.p1.y - m.q.y) };
  }
  const a = (1 - u) * (1 - u);
  const b = 2 * u * (1 - u);
  const c = u * u;
  return { x: a * m.p0.x + b * m.q.x + c * m.p1.x, y: a * m.p0.y + b * m.q.y + c * m.p1.y };
}

type Threat = { C: Vec | null; V: Vec; d: number; tHit: number; trigger: boolean };
const CALM: Threat = { C: null, V: ZERO, d: Infinity, tHit: Infinity, trigger: false };

/* ---- the eyes ------------------------------------------------------ */

/** Keeps a short memory of the pointer and reports it a reaction time late. */
export class Eyes {
  private samples: { t: number; x: number; y: number }[] = [];
  private lastMoveAt = 0;
  private gone = true;
  private touch = false;
  private touching = false;
  private liftedAt = -Infinity;
  private latency: number = REACTION_MS[0];
  private latencyAt = -Infinity;
  private seenVel: Vec = { x: 0, y: 0 };

  /** Client px. */
  see(t: number, x: number, y: number, touch: boolean) {
    const last = this.samples[this.samples.length - 1];
    // A break in the trail (back into the window after a while, somewhere
    // else) starts a new one. Bridged, the gap reads as a 2,000px/s lunge.
    if (last && t - last.t > 120 && Math.hypot(x - last.x, y - last.y) > 80) this.samples = [];
    const prev = this.samples[this.samples.length - 1];
    if (!prev || Math.hypot(x - prev.x, y - prev.y) > 0.5) this.lastMoveAt = t;
    this.samples.push({ t, x, y });
    while (this.samples.length > 2 && t - this.samples[0].t > 700) this.samples.shift();
    this.touch = touch;
    this.gone = false;
  }

  down(t: number, x: number, y: number, touch: boolean) {
    // A finger (or a pen, or a jump) lands without having moved there: there
    // is no trail to read a speed from, and a stale one would read as a lunge.
    const last = this.samples[this.samples.length - 1];
    if (touch || !last || Math.hypot(x - last.x, y - last.y) > 24) this.samples = [];
    this.see(t, x, y, touch);
    if (touch) this.touching = true;
  }

  up(t: number, touch: boolean) {
    if (!touch) return;
    this.touching = false;
    this.liftedAt = t;
  }

  /** The mouse left the window, or the window lost focus. */
  leave(t: number) {
    this.gone = true;
    this.samples = [];
    this.lastMoveAt = t;
  }

  /** What it sees now, in arena px (client minus the arena's offset). */
  perceive(now: number, offX: number, offY: number, rng: () => number): Sense {
    const present =
      this.samples.length > 0 && !this.gone && (!this.touch || this.touching || now - this.liftedAt < 120);
    if (!present) {
      return { at: null, vel: ZERO, speedNow: 0, stillFor: now - this.lastMoveAt, touch: this.touch };
    }
    if (now - this.latencyAt > 350) {
      this.latency = lerp(REACTION_MS[0], REACTION_MS[1], rng());
      this.latencyAt = now;
    }
    const p = this.sampleAt(now - this.latency);
    const q = this.sampleAt(now - this.latency - 60);
    this.seenVel = {
      x: this.seenVel.x * 0.35 + ((p.x - q.x) / 0.06) * 0.65,
      y: this.seenVel.y * 0.35 + ((p.y - q.y) / 0.06) * 0.65,
    };
    const n = this.samples.length;
    const a = this.samples[n - 1];
    const b = this.samples[n - 2];
    const speedNow =
      b && now - a.t < 60 ? Math.hypot(a.x - b.x, a.y - b.y) / Math.max(0.004, (a.t - b.t) / 1000) : 0;
    return {
      at: { x: p.x - offX, y: p.y - offY },
      vel: { ...this.seenVel },
      speedNow,
      stillFor: now - this.lastMoveAt,
      touch: this.touch,
    };
  }

  private sampleAt(t: number): Vec {
    const s = this.samples;
    if (t <= s[0].t) return s[0];
    for (let i = s.length - 1; i > 0; i--) {
      const a = s[i - 1];
      const b = s[i];
      if (t >= a.t && t <= b.t) {
        const k = b.t === a.t ? 1 : (t - a.t) / (b.t - a.t);
        return { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k) };
      }
    }
    return s[s.length - 1];
  }
}

/* ---- the mind and the body ---------------------------------------- */

type Mode = "docked" | "out" | "hiding" | "creeping" | "docking";

export type BrainOptions = {
  rng?: () => number;
  /** The first time it ever leaves its slot. */
  onWake?: () => void;
  /** A press that found nothing there: the hoopoe's cue to giggle. */
  onMiss?: () => void;
};

export class RunawayBrain {
  mode: Mode = "docked";
  /** 0 calm .. 1 rattled. */
  nerves = 0;
  /** Sitting in its slot willing to let a careful hand come all the way. */
  bait = false;

  private w: World | null = null;
  private now = 0;
  private sense: Sense = { at: null, vel: ZERO, speedNow: 0, stillFor: 0, touch: false };
  private threat: Threat = CALM;
  private readonly rng: () => number;
  private readonly seed: number;
  private readonly opts: BrainOptions;

  private pos: Vec = { x: 0, y: 0 };
  private vel: Vec = { x: 0, y: 0 };
  private move: Move | null = null;
  private lift = 0;
  private readonly ext = rest();
  private readonly lean = rest();
  private readonly squash = rest();
  private readonly crouch = rest();
  private readonly labelX = rest();
  private readonly labelY = rest();
  private watch = 0;
  private watchSide = 0;
  private ghost = 0;

  private side: -1 | 1 = 1;
  private hideY = 0;
  private readonly peek = rest();
  private peekGoal = 0;
  private hiddenAt = 0;
  private readyAt = 0;
  private spottedAt = -Infinity;
  private relocateDelay = 900;
  private relocations = 0;
  private patience = 1;
  private boredAfter = 2000;
  private hideNext = false;

  private nextStepAt = 0;
  private bounceAt = Infinity;
  private landings: { x: number; y: number; t: number }[] = [];
  private flees: number[] = [];
  private dodges: number[] = [];
  private lastFleeAt = -Infinity;
  private lastReplanAt = -Infinity;
  private lastTauntAt = 0;
  private woke = false;
  private candidates: { x: number; y: number; s: number }[] = [];
  private target: Vec | null = null;

  constructor(opts: BrainOptions = {}) {
    this.opts = opts;
    this.rng = opts.rng ?? Math.random;
    this.seed = this.rng() * 100;
  }

  /** For the tests: where it is, and how wide. */
  get centre(): Vec {
    return { ...this.pos };
  }
  get width(): number {
    return this.ext.x;
  }
  get moving(): boolean {
    return this.move !== null;
  }

  /** What the lab's overlay draws. */
  get debug(): Debug {
    const { C, V } = this.threat;
    return {
      mode: this.move ? `${this.mode}: ${this.move.kind}` : this.mode,
      pill: { ...this.pos },
      nerves: this.nerves,
      bait: this.bait,
      seen: C,
      ahead: C ? { x: C.x + V.x * 0.24, y: C.y + V.y * 0.24 } : null,
      candidates: this.candidates,
      target: this.target,
    };
  }

  /** Home in its slot with nothing near or moving: the frame loop may sleep
   *  until the pointer next moves. */
  get resting(): boolean {
    if (this.mode !== "docked" || this.ghost > 0 || !this.w) return false;
    const s = this.sense;
    return !s.at || (s.stillFor > 200 && capsule(s.at, this.pos, this.ext.x, this.w.pillH) > 150);
  }

  /** New geometry without a step. A press that wakes a sleeping loop is
   *  judged against the page as it is now, not as it was. */
  place(world: World) {
    this.w = world;
    if (this.mode !== "docked") return;
    this.pos = this.home();
    this.ext.x = world.slot.w;
    this.ext.v = 0;
  }

  step(dt: number, now: number, world: World, sense: Sense) {
    this.place(world);
    this.now = now;
    this.sense = sense;
    this.nerves *= Math.exp(-dt / NERVES_CALM_S);
    this.threat = this.assess(sense);
    this.decide(this.threat);
    if (dt > 0) {
      // Stiff springs need small steps to stay stable.
      const n = Math.ceil(dt / 0.004);
      for (let i = 0; i < n; i++) this.integrate(dt / n);
    }
    const away = this.mode !== "docked" && !(this.mode === "docking" && !this.move);
    this.ghost = clamp(this.ghost + (away ? 6 : -6) * dt, 0, 1);
  }

  pose(): Pose {
    const speed = Math.hypot(this.vel.x, this.vel.y);
    const stretch = Math.min(speed / 3200, 0.12);
    const L = this.lift;
    const idle = this.mode === "out" && !this.move;
    const breath = idle ? 1 + 0.006 * Math.sin(this.now / 520 + this.seed) : 1;
    let sx = (1 + 0.07 * L + 0.1 * this.squash.x + 0.035 * this.crouch.x) * breath;
    let sy = (1 + 0.07 * L - 0.13 * this.squash.x - 0.07 * this.crouch.x) * breath;
    if (Math.abs(this.vel.x) >= Math.abs(this.vel.y)) {
      sx *= 1 + stretch;
      sy *= 1 - stretch * 0.45;
    } else {
      sy *= 1 + stretch * 0.5;
      sx *= 1 - stretch * 0.3;
    }
    return {
      x: this.pos.x,
      y: this.pos.y,
      ext: this.ext.x,
      rot: this.lean.x,
      sx,
      sy,
      lift: L,
      labelX: this.labelX.x,
      labelY: this.labelY.x,
      out: this.mode !== "docked",
      ghost: this.ghost,
    };
  }

  /** A pointer went down at `at` (arena px). True when it was aimed at the
   *  button: it has already flinched by the time this returns. */
  press(at: Vec, touch: boolean): boolean {
    const w = this.w;
    if (!w) return false;
    const d = capsule(at, this.pos, this.ext.x, w.pillH);
    const hit = d < (touch ? 18 : 6);
    if (hit) this.nerves = Math.min(1, this.nerves + 0.3);
    if (this.mode === "hiding") {
      if (hit || (touch && d < 60)) this.duck();
      if (hit) this.opts.onMiss?.();
      return hit;
    }
    if (hit) {
      this.leaveSlot();
      this.flee("press", at);
      this.opts.onMiss?.();
      return true;
    }
    if (touch && d < (this.mode === "docked" ? 70 : 90)) {
      // A finger coming down nearby: the closest thing a phone has to a hand
      // reaching for it.
      this.leaveSlot();
      this.flee("approach", at);
    } else if (touch && this.mode !== "docked") {
      this.lean.v += Math.sign(at.x - this.pos.x) * 60;
    }
    return false;
  }

  /** Enter or Space on the focused button. */
  keyPoke() {
    if (!this.w) return;
    this.nerves = Math.min(1, this.nerves + 0.15);
    this.opts.onMiss?.();
    if (this.mode === "hiding") return this.duck();
    this.leaveSlot();
    this.flee("key", { x: this.pos.x + this.rng() - 0.5, y: this.pos.y + this.rng() - 0.5 });
  }

  /** Someone tried to submit the form some other way (Enter in a field). */
  startle() {
    if (!this.w) return;
    this.nerves = Math.min(1, this.nerves + 0.1);
    if (this.mode === "docked") return this.keyPoke();
    if (this.mode === "hiding") return this.duck();
    if (!this.move) this.startMove("bounce", this.pos);
  }

  /* ---- perceiving ---- */

  private assess(s: Sense): Threat {
    const w = this.w!;
    if (!s.at) {
      this.watch = 0;
      return CALM;
    }
    const C = s.at;
    const V = s.vel;
    const d = capsule(C, this.pos, this.ext.x, w.pillH);
    let tHit = Infinity;
    for (let i = 1; i <= 8; i++) {
      const t = i * 0.045;
      if (capsule({ x: C.x + V.x * t, y: C.y + V.y * t }, this.pos, this.ext.x, w.pillH) < 3) {
        tHit = t;
        break;
      }
    }
    const docked = this.mode === "docked";
    // Its personal space and how far ahead it reacts. Both grow with its
    // nerves, and both breathe a little over time, so no edge is ever found
    // twice in the same place.
    const wobble = 0.85 + 0.3 * (0.5 + 0.5 * Math.sin(this.now / 610 + this.seed));
    const personal = ((docked ? 3 : 10) + 50 * this.nerves) * wobble + (s.touch ? 34 : 0);
    const ahead = ((docked ? 0.075 : 0.1) + 0.17 * this.nerves) * wobble;
    let trigger = d < personal || tHit < ahead;
    // Bait: sitting in its slot it lets a careful hand come all the way, and
    // only a lunge gives the game away. The press is what it is waiting for.
    if (docked && this.bait && Math.hypot(V.x, V.y) < 900) trigger = false;
    // How hard it is watching: closer, and coming its way, is more.
    const len = Math.max(1, Math.hypot(C.x - this.pos.x, C.y - this.pos.y));
    const closing = (V.x * (this.pos.x - C.x) + V.y * (this.pos.y - C.y)) / len;
    this.watch = d < 240 ? clamp((240 - d) / 200, 0, 1) * (closing > 30 ? 1 : 0.45) : 0;
    this.watchSide = Math.sign(C.x - this.pos.x);
    return { C, V, d, tHit, trigger };
  }

  /* ---- deciding ---- */

  private decide(t: Threat) {
    if (this.now >= this.bounceAt) {
      this.bounceAt = Infinity;
      if (!this.move && this.mode === "out" && t.d > 70) this.startMove("bounce", this.pos);
    }
    switch (this.mode) {
      case "docked":
        if (t.trigger) this.wake(t.C);
        return;
      case "out":
        return this.decideOut(t);
      case "hiding":
        return this.decideHiding(t);
      case "creeping":
        return this.decideCreeping(t);
      case "docking":
        if (t.trigger) {
          this.mode = "out";
          this.flee("approach", t.C!, t.V);
        } else if (!this.move && Math.abs(this.ext.x - this.w!.slot.w) < 1) {
          this.mode = "docked";
          // Half the time it comes home as bait, once it has calmed down.
          this.bait = this.nerves < 0.6 && this.rng() < 0.55;
        }
        return;
    }
  }

  private decideOut(t: Threat) {
    const m = this.move;
    if (m) {
      // Mid-move, it carries on unless the pointer is making for where it is
      // headed. The gather gives way the moment she follows it along the bar.
      // A run for cover never does: nothing can follow it behind the
      // photograph, so being chased there is the point of going.
      const late = this.now - this.lastReplanAt > 110;
      const caught = m.kind === "gather" ? t.trigger && m.u.x > 0.3 : this.onStage(m.p1) && this.unsafe(m.p1, t);
      if (t.C && late && caught) {
        this.lastReplanAt = this.now;
        this.flee("approach", t.C, t.V);
      }
      return;
    }
    if (t.trigger) return this.flee("approach", t.C!, t.V);
    if (!this.onStage(this.pos)) {
      // The page moved under it (a resize, the keyboard): back into view.
      const w = this.w!;
      const { lo, hi } = this.band(w.pillH);
      const to = { x: clamp(this.pos.x, w.pillW / 2 + 10, w.w - w.pillW / 2 - 10), y: clamp(this.pos.y, lo, hi) };
      if (this.onStage(to)) this.startMove("sneak", to);
      return;
    }
    if (this.hideNext) {
      this.hideNext = false;
      if (this.goHide(t.C)) return;
    }
    if (this.canCreep()) {
      this.mode = "creeping";
      this.nextStepAt = this.now + 160;
      return;
    }
    // A long stand-off with the pointer parked well away: a hop on the spot.
    if (t.C && this.sense.stillFor > 3200 && t.d > 200 && this.now - this.lastTauntAt > 6500) {
      this.lastTauntAt = this.now;
      this.startMove("bounce", this.pos);
    }
  }

  private decideHiding(t: Threat) {
    const w = this.w!;
    const now = this.now;
    const sliver = { x: this.edgeX(this.peek.x), y: this.hideY };
    const C = t.C;
    const near = !!C && (dist(C, sliver) < 150 || t.tHit < 0.3);
    if (near) {
      this.peekGoal = 0;
      this.spottedAt = now;
    } else if (now < this.readyAt || now - this.spottedAt < 350) {
      this.peekGoal = 0;
    } else {
      // Bolder the longer it is left alone, with a little fidget in and out.
      const since = now - Math.max(this.readyAt, this.spottedAt + 350);
      this.peekGoal = lerp(PEEK_MIN, PEEK_MAX, clamp(since / 2500, 0, 1)) + 4 * Math.sin(now / 700 + this.seed);
    }
    // Seen, and tucked out of sight: somewhere else to look from. Found there
    // as well, it gives up hiding and bursts back out to play. Hiding is an
    // interlude in the chase, never the end of it (owner, 2026-11-19: having
    // to sit still to get the game back was the one deflating moment).
    if (this.peek.x < 1.5 && this.spottedAt > this.hiddenAt && now - this.spottedAt > this.relocateDelay) {
      return this.relocations >= this.patience ? this.emerge(false) : this.relocate(C);
    }
    // The page scrolled the hiding place away: follow, out of sight.
    const { lo, hi } = this.band(w.pillH);
    if (this.peek.x < 1.5 && (this.hideY < lo || this.hideY > hi)) return this.relocate(C);
    // Nor does it wait to be left alone. A second or two of peeking and it
    // comes out by itself, moving or not, unless she is waiting right by the
    // way out. Keeping still brings it out sooner, and creeping for home.
    const clear = !C || dist(C, sliver) > 180;
    const still = !C ? this.sense.stillFor > 900 : this.sense.stillFor > 1400;
    const peeking = now - Math.max(this.readyAt, this.spottedAt);
    if (clear && this.peek.x > 14 && (still || peeking > this.boredAfter)) this.emerge(still);
  }

  private decideCreeping(t: Threat) {
    if (t.trigger) {
      this.mode = "out";
      return this.flee("approach", t.C!, t.V);
    }
    const home = this.home();
    const s = this.sense;
    // She is waiting by the slot: no going home while she sits there.
    if (s.at && dist(s.at, home) < 150 && s.stillFor > 500) {
      this.mode = "out";
      return;
    }
    // Grandmother's Footsteps: it only moves while you keep still.
    if (s.at && s.speedNow > 60) {
      if (this.move?.kind === "tiptoe") this.freeze();
      this.nextStepAt = Math.max(this.nextStepAt, this.now + 320 + this.rng() * 260);
      return;
    }
    if (this.move || this.now < this.nextStepAt) return;
    const d = dist(this.pos, home);
    if (d < 2) return this.dock();
    let step = Math.min(d, 18 + this.rng() * 14);
    if (d - step < 26) step = d;
    let a = Math.atan2(home.y - this.pos.y, home.x - this.pos.x);
    if (d > 40) a += (this.rng() - 0.5) * 0.45;
    this.startMove("tiptoe", { x: this.pos.x + Math.cos(a) * step, y: this.pos.y + Math.sin(a) * step });
    // The step itself, then a pause before the next.
    this.nextStepAt = this.now + MOVES.tiptoe.ms(0) + 170 + this.rng() * 340;
  }

  private canCreep(): boolean {
    const s = this.sense;
    if (this.now - this.lastFleeAt < 900) return false;
    if (!s.at) return s.stillFor > 1000;
    if (s.stillFor < 900) return false;
    const home = this.home();
    return dist(s.at, home) > 170 && segDist(this.pos, home, s.at) > 100;
  }

  /* ---- acting ---- */

  /** Out of its slot: pull in toward the far end, away from the hand coming
   *  down, like an inchworm. */
  private wake(C: Vec | null) {
    this.leaveSlot();
    const w = this.w!;
    const s = w.slot;
    const right = C ? C.x < s.x + s.w / 2 : this.rng() < 0.5;
    this.startMove("gather", { x: right ? s.x + s.w - w.pillW / 2 : s.x + w.pillW / 2, y: s.y + s.h / 2 });
  }

  private leaveSlot() {
    this.bait = false;
    this.mode = "out";
    if (this.woke) return;
    this.woke = true;
    this.opts.onWake?.();
  }

  private flee(cause: "approach" | "press" | "key", C: Vec, V: Vec = ZERO) {
    const now = this.now;
    if (cause === "approach") this.nerves = Math.min(1, this.nerves + 0.14);
    this.flees = this.flees.filter((f) => now - f < 6000);
    this.flees.push(now);
    this.lastFleeAt = now;
    let kind: Dodge;
    if (cause === "press") kind = "flinch";
    else if (cause === "key") kind = "hop";
    else if (this.nerves < 0.3) kind = this.rng() < 0.75 ? "sidestep" : "hop";
    else kind = this.rng() < 0.25 ? "sidestep" : "hop";
    // Chased three times in a few seconds and properly rattled: half the time
    // it bolts for cover now, otherwise it hides at the next quiet moment.
    if (cause === "approach" && this.flees.length >= 3 && this.nerves > 0.55) {
      if (this.rng() < 0.5 && this.goHide(C)) return;
      this.hideNext = this.rng() < 0.6;
    }
    const plan =
      this.plan(kind, C, V) ?? (kind === "sidestep" ? this.plan("hop", C, V) : null) ?? this.plan("dash", C, V);
    if (plan) {
      this.startMove(plan.kind, plan.to, plan.q);
      if (cause === "press" && this.rng() < 0.35) this.bounceAt = now + MOVES.flinch.ms(dist(this.pos, plan.to)) + 90;
    } else if (!this.goHide(C)) {
      // Boxed in on every side. A hop on the spot will do for a hand that is
      // only near, but never under a press: then it takes the furthest spot
      // on stage from where it was pressed, fields or no fields.
      const out = cause === "press" ? this.furthestFrom(C) : null;
      if (out) this.startMove("dash", out, this.bend("dash", out, C));
      else this.startMove("bounce", this.pos);
    }
  }

  private plan(kind: Dodge, C: Vec, V: Vec): { kind: Dodge; to: Vec; q: Vec } | null {
    const n = 18;
    const off = (this.rng() * Math.PI * 2) / n;
    let best: { to: Vec; s: number } | null = null;
    this.candidates = [];
    for (const r of DODGES[kind].reach) {
      for (let i = 0; i < n; i++) {
        const a = off + (i / n) * Math.PI * 2;
        const to = { x: this.pos.x + Math.cos(a) * r, y: this.pos.y + Math.sin(a) * r };
        const s = this.score(kind, to, C, V);
        if (s === -Infinity) continue;
        this.candidates.push({ ...to, s });
        if (!best || s > best.s) best = { to, s };
      }
    }
    if (!best) return null;
    return { kind, to: best.to, q: this.bend(kind, best.to, C) };
  }

  private score(kind: Dodge, to: Vec, C: Vec, V: Vec): number {
    const w = this.w!;
    const spec = DODGES[kind];
    if (!this.onStage(to)) return -Infinity;
    // How close the pointer comes to that spot over the next quarter second.
    let safe = Infinity;
    for (const t of [0, 0.12, 0.24]) {
      safe = Math.min(safe, capsule({ x: C.x + V.x * t, y: C.y + V.y * t }, to, w.pillW, w.pillH));
    }
    if (safe < spec.safeMin) return -Infinity;
    // Never THROUGH the pointer. Only a dash may pass it, and bend() takes it round.
    if (kind !== "dash" && this.crosses(to, C, 14)) return -Infinity;
    let s = Math.min(safe, spec.safeCap) - spec.thrift * dist(this.pos, to);
    s -= 55 * this.coverage(to);
    // Not back to where it was just nearly caught.
    for (const l of this.landings) {
      const age = (this.now - l.t) / 8000;
      if (age < 1) s -= 42 * (1 - age) * Math.exp(-((to.x - l.x) ** 2 + (to.y - l.y) ** 2) / (2 * 55 * 55));
    }
    // A little homesick while it is calm.
    s -= (1 - this.nerves) * 0.05 * dist(to, this.home());
    // Never the same way three times running.
    const way = Math.sign(to.x - this.pos.x);
    if (this.dodges.length >= 2 && this.dodges.every((d) => d === way)) s -= 16;
    return s + (this.rng() - 0.5) * 20;
  }

  /** The middle of the curve it runs along. A dash bows round the pointer on
   *  the far side; everything else carries its momentum into the turn, so a
   *  chain of escapes curves instead of zig-zagging. */
  private bend(kind: Dodge, to: Vec, C: Vec): Vec {
    const p0 = this.pos;
    const mid = { x: (p0.x + to.x) / 2, y: (p0.y + to.y) / 2 };
    const chord = Math.max(1, dist(p0, to));
    const perp = { x: -(to.y - p0.y) / chord, y: (to.x - p0.x) / chord };
    if (kind === "dash") {
      const off = (C.x - mid.x) * perp.x + (C.y - mid.y) * perp.y;
      const away = off > 0 ? -1 : 1;
      let bow = Math.max(0, this.w!.pillH / 2 + 46 - Math.abs(off));
      for (let i = 0; i < 3; i++) {
        const q = { x: mid.x + perp.x * away * bow * 2, y: mid.y + perp.y * away * bow * 2 };
        let near = Infinity;
        for (let u = 0; u <= 1; u += 0.1) near = Math.min(near, dist(along({ p0, q, p1: to }, u), C));
        if (near > this.w!.pillH / 2 + 24) return q;
        bow = bow * 1.6 + 20;
      }
      return { x: mid.x + perp.x * away * bow * 2, y: mid.y + perp.y * away * bow * 2 };
    }
    const sp = Math.hypot(this.vel.x, this.vel.y);
    const lead = sp > 1 ? Math.min(chord * 0.35, sp * 0.06) : 0;
    const swerve = kind === "hop" ? (this.rng() - 0.5) * 0.25 * chord : 0;
    return {
      x: mid.x + (sp > 1 ? (this.vel.x / sp) * lead : 0) + perp.x * swerve,
      y: mid.y + (sp > 1 ? (this.vel.y / sp) * lead : 0) + perp.y * swerve,
    };
  }

  private goHide(C: Vec | null): boolean {
    const w = this.w!;
    const { lo, hi } = this.band(w.pillH + 8);
    if (hi <= lo) return false;
    let best: { s: number; side: -1 | 1; to: Vec } | null = null;
    for (const side of [-1, 1] as const) {
      for (let k = 0; k <= 6; k++) {
        const y = lerp(lo, hi, k / 6);
        const to = { x: this.edgeX(-w.pillW / 2 - 6, side), y };
        // Its run for cover must not pass you.
        if (C && this.crosses(to, C, 22)) continue;
        const sliver = { x: this.edgeX(12, side), y };
        const s = (C ? Math.min(dist(C, sliver), 420) : 200) - 0.25 * dist(this.pos, to) + (this.rng() - 0.5) * 40;
        if (!best || s > best.s) best = { s, side, to };
      }
    }
    if (!best) return false;
    const { side, to } = best;
    this.startMove("dash", to, undefined, () => {
      this.mode = "hiding";
      this.hideAt(side, to.y, 200 + this.rng() * 250);
      this.relocations = 0;
      // Found once or twice before it gives up hiding; bored of peeking
      // after a second or two.
      this.patience = this.rng() < 0.5 ? 1 : 2;
      this.boredAfter = 1000 + this.rng() * 800;
    });
    return true;
  }

  /** Settles it out of sight behind one edge at height y, ready to peek in
   *  `readyIn` ms. */
  private hideAt(side: -1 | 1, y: number, readyIn: number) {
    this.side = side;
    this.hideY = y;
    this.peek.x = 0;
    this.peek.v = 0;
    this.peekGoal = 0;
    this.hiddenAt = this.now;
    this.readyAt = this.now + readyIn;
    this.spottedAt = -Infinity;
    this.relocateDelay = 280 + this.rng() * 370;
  }

  /** Out of sight, it changes hiding place: the other side if she is nearer
   *  this one (it ran round the back, so that takes longer), else further
   *  along the same edge. */
  private relocate(C: Vec | null) {
    const w = this.w!;
    const swap = (!!C && (this.side < 0 ? C.x < w.w * 0.5 : C.x > w.w * 0.5)) || this.rng() < 0.25;
    const { lo, hi } = this.band(w.pillH + 8);
    let y = hi > lo ? lerp(lo, hi, this.rng()) : (w.viewTop + w.viewBottom) / 2;
    for (let i = 0; i < 6 && C && hi > lo && Math.abs(y - C.y) < 140; i++) y = lerp(lo, hi, this.rng());
    // Out of sight only as long as the run round the back would take.
    const side = swap ? (this.side < 0 ? 1 : -1) : this.side;
    this.hideAt(side, y, swap ? 550 + this.rng() * 400 : 280 + this.rng() * 320);
    this.pos = { x: this.edgeX(-w.pillW / 2), y };
    this.vel = { x: 0, y: 0 };
    this.relocations++;
  }

  /** Back out of hiding. Left in peace, it sneaks out by its cover and makes
   *  for home. Still being hunted, it bursts out across the open to wherever
   *  she is not, and hops when it lands: here I am. */
  private emerge(still: boolean) {
    const w = this.w!;
    const { lo, hi } = this.band(w.pillH);
    this.mode = "out";
    const C = this.sense.at;
    if (!still && hi > lo) {
      let best: { to: Vec; s: number } | null = null;
      for (let i = 0; i < 6; i++) {
        for (let j = 0; j < 6; j++) {
          const to = { x: lerp(w.pillW / 2 + 16, w.w - w.pillW / 2 - 16, i / 5), y: lerp(lo, hi, j / 5) };
          if (!this.onStage(to) || (C && this.crosses(to, C, 30))) continue;
          const s =
            (C ? Math.min(dist(to, C), 380) : 200) - 0.15 * dist(this.pos, to) - 40 * this.coverage(to) + (this.rng() - 0.5) * 60;
          if (!best || s > best.s) best = { to, s };
        }
      }
      if (best) {
        this.startMove("dash", best.to, undefined, () => {
          this.bounceAt = this.now + 60;
        });
        return;
      }
    }
    const inward = 24 + this.rng() * 50;
    const to = {
      x: this.edgeX(w.pillW / 2 + inward),
      y: hi > lo ? clamp(lerp(this.hideY, this.home().y, 0.3), lo, hi) : this.hideY,
    };
    this.startMove("sneak", to);
  }

  /** Seen while peeking: gone, fast. */
  private duck() {
    this.peek.v = -420;
    this.spottedAt = this.now;
  }

  /** Caught mid-step: it stops dead, like a statue. */
  private freeze() {
    this.move = null;
    this.vel = { x: 0, y: 0 };
    this.lift = 0;
    this.squash.v += 9;
    this.lean.v -= this.watchSide * 50;
  }

  private dock() {
    this.mode = "docking";
    this.startMove("settle", this.home());
  }

  private startMove(kind: Kind, to: Vec, q?: Vec, then?: () => void) {
    const p0 = { ...this.pos };
    const T = MOVES[kind].ms(dist(p0, to)) / 1000;
    const omega = 4.2 / T;
    const ctrl = q ?? { x: (p0.x + to.x) / 2, y: (p0.y + to.y) / 2 };
    // Keep its current speed along the new path: a change of plan curves
    // rather than stopping dead. B'(0) = 2(q - p0), so u' = speed / |2(q - p0)|.
    const lead = dist(p0, ctrl);
    const tangent = lead > 0.5 ? { x: (ctrl.x - p0.x) / lead, y: (ctrl.y - p0.y) / lead } : ZERO;
    const carried = Math.max(0, this.vel.x * tangent.x + this.vel.y * tangent.y);
    this.move = {
      kind,
      p0,
      q: ctrl,
      p1: { ...to },
      u: { x: 0, v: lead > 0.5 ? Math.min(carried / (2 * lead), omega) : 0 },
      k: omega * omega,
      landed: false,
      then,
    };
    if (kind in DODGES) this.dodges = [...this.dodges.slice(-1), Math.sign(to.x - p0.x)];
    this.target = { ...to };
  }

  /* ---- the body ---- */

  private integrate(h: number) {
    const w = this.w!;
    const before = { ...this.pos };
    const m = this.move;
    if (m) {
      const spec = MOVES[m.kind];
      spring(m.u, 1, m.k, spec.zeta, h);
      this.pos = along(m, m.u.x);
      this.lift = spec.lift * Math.sin(Math.PI * clamp(m.u.x, 0, 1));
      if (!m.landed && m.u.x >= 0.97) {
        m.landed = true;
        // Weight arriving: a squash that wobbles back, harder for a hop.
        if (m.kind !== "gather" && m.kind !== "sneak") this.squash.v += 6 + 16 * spec.lift;
      }
      if (m.u.x > 0.996 && Math.abs(m.u.v) < 0.08) {
        this.pos = { ...m.p1 };
        this.lift = 0;
        this.move = null;
        if (m.kind !== "tiptoe" && m.kind !== "settle") {
          this.landings = [...this.landings.filter((l) => this.now - l.t < 8000), { ...m.p1, t: this.now }];
        }
        m.then?.();
      }
    } else if (this.mode === "hiding") {
      // Ducks fast, peeks slowly.
      const goingIn = this.peekGoal < this.peek.x;
      spring(this.peek, this.peekGoal, goingIn ? 900 : 90, goingIn ? 0.9 : 1, h);
      this.peek.x = Math.max(0, this.peek.x);
      this.pos = { x: this.edgeX(this.peek.x - w.pillW / 2), y: this.hideY + 3 * Math.sin(this.now / 900 + this.seed) };
    }
    const nv = { x: (this.pos.x - before.x) / h, y: (this.pos.y - before.y) / h };
    const acc = { x: (nv.x - this.vel.x) / h, y: (nv.y - this.vel.y) / h };
    this.vel = this.mode === "docked" ? { x: 0, y: 0 } : nv;

    const out = this.mode !== "docked";
    // Its width: the slot's while home, the pill's while out. Faster when it
    // has to get small in a hurry.
    const extGoal = this.mode === "docked" || (this.mode === "docking" && !m) ? w.slot.w : w.pillW;
    const eo = m?.kind === "flinch" ? 38 : 20;
    spring(this.ext, extGoal, eo * eo, 0.95, h);
    // Leans into its run, away from a pointer it is watching, out from cover.
    // Only as much as its width allows: the same angle that reads as a lean
    // on the pill swings the ends of the full-width bar 20px and looks broken.
    const peekTilt = this.mode === "hiding" ? -this.side * 4 * clamp(this.peek.x / 30, 0, 1) : 0;
    const narrow = w.pillW / Math.max(w.pillW, this.ext.x);
    const leanGoal = out
      ? (clamp(this.vel.x * 0.0055, -8, 8) - this.watchSide * 3 * this.watch + peekTilt) * narrow * narrow
      : 0;
    spring(this.lean, leanGoal, 260, 0.5, h);
    spring(this.squash, 0, 560, 0.28, h);
    spring(this.crouch, out && !m ? this.watch : 0, 170, 0.95, h);
    // The label is a weight on a spring inside it: it lags when the pill sets
    // off and swings through when it stops.
    spring(this.labelX, 0, 420, 0.42, h, clamp(-acc.x * 0.03, -400, 400));
    spring(this.labelY, 0, 420, 0.42, h, clamp(-acc.y * 0.03, -400, 400));
    this.labelX.x = clamp(this.labelX.x, -3, 3);
    this.labelY.x = clamp(this.labelY.x, -2, 2);
  }

  /* ---- the stage ---- */

  private home(): Vec {
    const s = this.w!.slot;
    return { x: s.x + s.w / 2, y: s.y + s.h / 2 };
  }

  /** The on-screen band, `margin` in from its top and bottom. */
  private band(margin: number): { lo: number; hi: number } {
    return { lo: this.w!.viewTop + margin, hi: this.w!.viewBottom - margin };
  }

  /** An x `inset` px in from one cover edge: the left (-1) or the right (1). */
  private edgeX(inset: number, side: -1 | 1 = this.side): number {
    return side < 0 ? inset : this.w!.w - inset;
  }

  /** Whole and on screen, clear of both cover edges. */
  private onStage(p: Vec): boolean {
    const w = this.w!;
    const m = 10;
    return (
      p.x - w.pillW / 2 >= m &&
      p.x + w.pillW / 2 <= w.w - m &&
      p.y - w.pillH / 2 >= w.viewTop + m &&
      p.y + w.pillH / 2 <= w.viewBottom - m
    );
  }

  private furthestFrom(C: Vec): Vec | null {
    let best: Vec | null = null;
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      for (const r of [90, 160, 260]) {
        const to = { x: this.pos.x + Math.cos(a) * r, y: this.pos.y + Math.sin(a) * r };
        if (this.onStage(to) && (!best || dist(to, C) > dist(best, C))) best = to;
      }
    }
    return best;
  }

  /** How much of a pill at p would sit on a field, 0..1. */
  private coverage(p: Vec): number {
    const w = this.w!;
    const x0 = p.x - w.pillW / 2;
    const y0 = p.y - w.pillH / 2;
    let area = 0;
    for (const o of w.obstacles) {
      const ix = Math.min(x0 + w.pillW, o.x + o.w) - Math.max(x0, o.x);
      const iy = Math.min(y0 + w.pillH, o.y + o.h) - Math.max(y0, o.y);
      if (ix > 0 && iy > 0) area += ix * iy;
    }
    return Math.min(1, area / (w.pillW * w.pillH));
  }

  /** Would running straight to `to` take it through the pointer at C? Along
   *  the way it may never come closer to the pointer than it is now, nor
   *  within `gap` of it. One rule, measured on the whole pill, for every case:
   *  a press ON it (where every path starts at the pointer, and the only
   *  wrong way is back across it), a press grazing its edge, and a pointer
   *  well clear that its path must not skim past. */
  private crosses(to: Vec, C: Vec, gap: number): boolean {
    const w = this.w!;
    const floor = Math.min(capsule(C, this.pos, this.ext.x, w.pillH), gap) - 0.5;
    const n = Math.max(4, Math.ceil(dist(this.pos, to) / 30));
    for (let i = 1; i <= n; i++) {
      const p = { x: lerp(this.pos.x, to.x, i / n), y: lerp(this.pos.y, to.y, i / n) };
      if (capsule(C, p, w.pillW, w.pillH) < floor) return true;
    }
    return false;
  }

  private unsafe(to: Vec, t: Threat): boolean {
    if (!t.C) return false;
    const w = this.w!;
    for (const s of [0, 0.1, 0.2, 0.3]) {
      const p = { x: t.C.x + t.V.x * s, y: t.C.y + t.V.y * s };
      if (capsule(p, to, w.pillW, w.pillH) < w.pillH * 0.6) return true;
    }
    return false;
  }
}
