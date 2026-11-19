"use client";

/* ------------------------------------------------------------------ *
 *  The Join button that will not be pressed.
 *
 *  Loaded by runaway-stage.tsx only once the principal's name is on the
 *  form, so nobody else ever downloads it. The form's own Join stays where
 *  it is and looks exactly as it should until she reaches for it. Then this
 *  takes over: a pill drawn to match it pulls in from the far end like an
 *  inchworm and will not be caught. How it decides what to do is
 *  src/lib/runaway-brain.ts. This file feeds that the pointer and the page
 *  every frame and paints the pose it hands back, in transforms and opacity
 *  only.
 *
 *  It is the one control in the app that moves when a pointer comes near,
 *  which the design system forbids everywhere else (hover never moves a
 *  control). That is the joke, and it only ever runs for her.
 *
 *  It runs about in a clipped layer it adds to the page's column (marked
 *  data-runaway-column). The clip is the cover: on a desktop the column's
 *  left edge is the photograph's, so it can duck behind the picture and
 *  peek back out; on a phone it is the screen's edges, and the page never
 *  scrolls sideways.
 * ------------------------------------------------------------------ */

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { buttonVariants } from "@/components/ui/button";
import type { HoopoeApi } from "@/components/mascot/hoopoe-kit";
import { Eyes, RunawayBrain, type Box, type Debug, type Pose, type World } from "@/lib/runaway-brain";
import { cn } from "@/lib/utils";

/** The fields it would rather not sit on, in arena px. */
function fieldsIn(form: HTMLFormElement, stage: DOMRect): Box[] {
  const boxes: Box[] = [];
  for (const el of form.querySelectorAll<HTMLElement>('input:not([type="hidden"]), [role="radiogroup"], label')) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) boxes.push({ x: r.left - stage.left, y: r.top - stage.top, w: r.width, h: r.height });
  }
  return boxes;
}

/** Writes a style only when it changed: an unchanged write still costs a restyle. */
function put(el: HTMLElement, prop: "transform" | "opacity" | "width" | "height" | "visibility", value: string) {
  if (el.style[prop] !== value) el.style[prop] = value;
}

const px = (n: number) => n.toFixed(2);

export function RunawayRunner({
  stage,
  hoopoe,
  debug = false,
  onFirstRun,
}: {
  /** The wrapper round the form (runaway-stage.tsx). */
  stage: RefObject<HTMLElement | null>;
  /** The page's hoopoe: it watches the chase and giggles at every miss. */
  hoopoe?: HoopoeApi;
  /** Draw what it is thinking (the lab). */
  debug?: boolean;
  /** The first time it leaves its slot: the real page remembers the browser. */
  onFirstRun?: () => void;
}) {
  const [column, setColumn] = useState<HTMLElement | null>(null);
  const arenaRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<HTMLSpanElement>(null);
  const shadowRef = useRef<HTMLSpanElement>(null);
  const runnerRef = useRef<HTMLButtonElement>(null);
  const capLRef = useRef<HTMLSpanElement>(null);
  const capRRef = useRef<HTMLSpanElement>(null);
  const midRef = useRef<HTMLSpanElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const brainRef = useRef<RunawayBrain | null>(null);
  const wakeRef = useRef<() => void>(() => {});
  const hoopoeRef = useRef(hoopoe);
  const firstRunRef = useRef(onFirstRun);
  useEffect(() => {
    hoopoeRef.current = hoopoe;
    firstRunRef.current = onFirstRun;
  });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- The column it runs about in exists only after mount, and the portal needs it as state to render into it.
    setColumn(stage.current?.closest<HTMLElement>("[data-runaway-column]") ?? null);
  }, [stage]);

  useEffect(() => {
    const arena = arenaRef.current;
    const form = stage.current?.querySelector("form");
    const bar = form?.querySelector<HTMLButtonElement>('button[type="submit"]');
    const ghost = ghostRef.current;
    const shadow = shadowRef.current;
    const runner = runnerRef.current;
    const capL = capLRef.current;
    const capR = capRRef.current;
    const mid = midRef.current;
    const label = labelRef.current;
    if (!arena || !form || !bar || !ghost || !shadow || !runner || !capL || !capR || !mid || !label) return;
    const eyes = new Eyes();
    let lastPoke = -Infinity;
    let lastGaze = -Infinity;
    const brain = new RunawayBrain({
      onWake: () => firstRunRef.current?.(),
      onMiss: () => {
        const now = performance.now();
        // One giggle per miss. Pokes inside the hoopoe's one-second streak
        // window escalate to a bounce and then a huff, and this is not the
        // bird being annoyed: it is the bird enjoying the show.
        if (now - lastPoke > 1200) {
          lastPoke = now;
          hoopoeRef.current?.poke();
        }
      },
    });
    brainRef.current = brain;

    let rect = arena.getBoundingClientRect();
    let fields: Box[] = [];
    let fieldsAt = -Infinity;
    const measure = (now: number): World => {
      rect = arena.getBoundingClientRect();
      const s = bar.getBoundingClientRect();
      const vv = window.visualViewport;
      const top = vv ? vv.offsetTop : 0;
      const bottom = top + (vv ? vv.height : window.innerHeight);
      if (now - fieldsAt > 700) {
        fieldsAt = now;
        fields = fieldsIn(form, rect);
      }
      return {
        w: rect.width,
        viewTop: Math.max(0, top - rect.top),
        viewBottom: Math.min(rect.height, bottom - rect.top),
        slot: { x: s.left - rect.left, y: s.top - rect.top, w: s.width, h: s.height },
        obstacles: fields,
        pillW: runner.offsetWidth,
        pillH: runner.offsetHeight,
      };
    };

    let wasOut = false;
    const paint = (p: Pose, w: World) => {
      // The space it leaves: the app's dashed pill for "something belongs here
      // and is not there yet" (PENDING_TINT in houses-chain.tsx).
      put(ghost, "opacity", p.ghost.toFixed(3));
      if (p.ghost > 0) {
        put(ghost, "width", `${w.slot.w}px`);
        put(ghost, "height", `${w.slot.h}px`);
        put(ghost, "transform", `translate3d(${px(w.slot.x)}px, ${px(w.slot.y)}px, 0)`);
      }
      if (p.out !== wasOut) {
        wasOut = p.out;
        // The handoff is exact: at this frame both are the slot's full width
        // in the same place, so swapping which one shows cannot be seen.
        put(runner, "visibility", p.out ? "visible" : "hidden");
        bar.style.opacity = p.out ? "0" : "";
        bar.style.pointerEvents = p.out ? "none" : "";
        if (p.out) bar.tabIndex = -1;
        else bar.removeAttribute("tabindex");
        if (p.out && document.activeElement === bar) runner.focus({ preventScroll: true });
      }
      if (!p.out) return;
      const span = Math.max(0, p.ext - w.pillH);
      put(runner, "transform", `translate3d(${px(p.x - w.pillW / 2)}px, ${px(p.y - w.pillH / 2)}px, 0) rotate(${px(p.rot)}deg) scale(${p.sx.toFixed(4)}, ${p.sy.toFixed(4)})`);
      // The fill is drawn in three pieces so it can stretch to the slot's full
      // width and back with round ends at every frame: the caps slide, only
      // the middle scales.
      put(capL, "transform", `translateX(${px(-span / 2)}px)`);
      put(capR, "transform", `translateX(${px(span / 2)}px)`);
      put(mid, "transform", `scaleX(${(span / Math.max(1, w.pillW - w.pillH)).toFixed(4)})`);
      put(label, "transform", `translate(${px(p.labelX)}px, ${px(p.labelY)}px)`);
      // Its shadow stays on the page: lower, wider and fainter the higher it hops.
      put(shadow, "width", `${w.pillW}px`);
      put(shadow, "transform", `translate3d(${px(p.x - w.pillW / 2)}px, ${px(p.y - w.pillH / 2 + 5 + 9 * p.lift)}px, 0) scale(${((p.ext / w.pillW) * (1 + 0.12 * p.lift)).toFixed(4)}, ${(1 + 0.3 * p.lift).toFixed(4)})`);
      put(shadow, "opacity", (0.32 * p.lift).toFixed(3));
    };

    // The loop sleeps while it sits home with nothing near, which is most of
    // the time she spends typing, and wakes on the next pointer move.
    let raf = 0;
    let asleep = false;
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(0.034, Math.max(0, (now - last) / 1000));
      last = now;
      const world = measure(now);
      brain.step(dt, now, world, eyes.perceive(now, rect.left, rect.top, Math.random));
      const pose = brain.pose();
      // The hoopoe follows the chase with its head (behind its wings, if they
      // are over its eyes for the password). Given a point rather than the
      // element, so it reads no layout after this frame's writes.
      if (pose.out && brain.moving && now - lastGaze > 140) {
        lastGaze = now;
        hoopoeRef.current?.gaze({ x: rect.left + pose.x, y: rect.top + pose.y });
      }
      paint(pose, world);
      if (brain.resting) asleep = true;
      else raf = requestAnimationFrame(frame);
    };
    const wake = () => {
      if (!asleep) return;
      asleep = false;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    wakeRef.current = wake;

    const onMove = (e: PointerEvent) => {
      eyes.see(performance.now(), e.clientX, e.clientY, e.pointerType === "touch");
      wake();
    };
    const onDown = (e: PointerEvent) => {
      const now = performance.now();
      const touch = e.pointerType === "touch";
      eyes.down(now, e.clientX, e.clientY, touch);
      // Judged against the page as it is now: the loop may have been asleep
      // through a scroll.
      brain.place(measure(now));
      brain.press({ x: e.clientX - rect.left, y: e.clientY - rect.top }, touch);
      wake();
    };
    const onUp = (e: PointerEvent) => eyes.up(performance.now(), e.pointerType === "touch");
    const onLeave = () => eyes.leave(performance.now());
    // Every submit the stage turns away (Enter in a field, a phone's Go key)
    // makes it jump.
    const onSubmit = () => {
      brain.startle();
      wake();
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    // Capture, so the reflex fires before anything under the pointer hears the press.
    window.addEventListener("pointerdown", onDown, { capture: true, passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    window.addEventListener("pointercancel", onUp, { passive: true });
    window.addEventListener("resize", wake);
    window.addEventListener("blur", onLeave);
    document.documentElement.addEventListener("mouseleave", onLeave);
    form.addEventListener("submit", onSubmit);
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown, { capture: true });
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      window.removeEventListener("resize", wake);
      window.removeEventListener("blur", onLeave);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      form.removeEventListener("submit", onSubmit);
      // Hand the form its own button back exactly as it was.
      bar.style.opacity = "";
      bar.style.pointerEvents = "";
      bar.removeAttribute("tabindex");
      brainRef.current = null;
    };
  }, [column, stage]);

  if (!column) return null;
  return createPortal(
    <div ref={arenaRef} className="pointer-events-none absolute inset-0 z-20 overflow-clip">
      <span
        ref={ghostRef}
        aria-hidden
        className="absolute left-0 top-0 rounded-full border border-dashed border-muted-foreground/40 bg-foreground/[0.025] opacity-0"
      />
      <span ref={shadowRef} aria-hidden className="absolute left-0 top-0 h-11 rounded-full bg-canopy opacity-0 blur-[7px]" />
      <button
        ref={runnerRef}
        type="button"
        // Hidden until it first leaves the slot; the frame loop takes over.
        style={{ visibility: "hidden" }}
        // The real Join's own classes, so the two match at the handoff and
        // keep matching if the Button is ever retuned. Its fill is drawn by
        // the three spans instead, and the frame loop owns its transform, so
        // nothing may transition it.
        className={cn(
          buttonVariants({ variant: "primary", size: "lg" }),
          "pointer-events-auto absolute left-0 top-0 cursor-pointer touch-manipulation bg-transparent transition-none"
        )}
        onClick={(e) => e.preventDefault()}
        onKeyDown={(e) => {
          if (e.key !== "Enter" && e.key !== " ") return;
          e.preventDefault();
          if (e.repeat) return;
          brainRef.current?.keyPoke();
          wakeRef.current();
        }}
      >
        {/* The canopy fill in three pieces (see paint). They sit inside the
            Button's own transparent 1px border, exactly where its clipped fill
            sits, so at the handoff the two are the same pixels: 42 and 21 are
            h-11's 44px less that border. */}
        <span ref={capLRef} aria-hidden className="absolute top-0 left-[calc(50%-21px)] size-[42px] rounded-full bg-canopy" />
        <span ref={midRef} aria-hidden className="absolute inset-y-0 left-[21px] right-[21px] bg-canopy" />
        <span ref={capRRef} aria-hidden className="absolute top-0 left-[calc(50%-21px)] size-[42px] rounded-full bg-canopy" />
        <span ref={labelRef} className="relative">
          Join
        </span>
      </button>
      {debug && <Mind brain={brainRef} />}
    </div>,
    column
  );
}

/** The lab's view of what it is thinking: what it sees (a reaction time
 *  late), where it reckons the pointer is going, every spot it weighed for
 *  its last escape (bigger is better), and the one it picked. */
function Mind({ brain }: { brain: RefObject<RunawayBrain | null> }) {
  const [mind, setMind] = useState<Debug | null>(null);
  useEffect(() => {
    let seen = "";
    let candidates: Debug["candidates"] | null = null;
    const id = setInterval(() => {
      const d = brain.current?.debug;
      if (!d) return;
      const key = [d.mode, d.nerves.toFixed(2), d.bait, d.pill.x | 0, d.pill.y | 0, d.seen?.x ?? "", d.seen?.y ?? ""].join();
      if (key === seen && d.candidates === candidates) return;
      seen = key;
      candidates = d.candidates;
      setMind(d);
    }, 90);
    return () => clearInterval(id);
  }, [brain]);
  const dots = useMemo(() => {
    const all = mind?.candidates ?? [];
    const lo = Math.min(...all.map((c) => c.s));
    const span = Math.max(...all.map((c) => c.s)) - lo || 1;
    return all.map((c, i) => (
      <circle key={i} cx={c.x} cy={c.y} r={1.5 + (4 * (c.s - lo)) / span} className="fill-cinnamon/50" />
    ));
  }, [mind?.candidates]);
  if (!mind) return null;
  return (
    <svg aria-hidden className="pointer-events-none absolute inset-0 size-full overflow-visible">
      {dots}
      {mind.target && <circle cx={mind.target.x} cy={mind.target.y} r={9} className="fill-none stroke-canopy" strokeWidth={2} />}
      {mind.seen && mind.ahead && (
        <line x1={mind.seen.x} y1={mind.seen.y} x2={mind.ahead.x} y2={mind.ahead.y} className="stroke-foreground/50" strokeWidth={1.5} strokeDasharray="3 3" />
      )}
      {mind.seen && <circle cx={mind.seen.x} cy={mind.seen.y} r={5} className="fill-foreground/60" />}
      <text x={mind.pill.x} y={mind.pill.y - 34} textAnchor="middle" className="fill-foreground text-[11px] font-medium">
        {mind.mode}
        {mind.bait ? ", bait" : ""} · nerves {mind.nerves.toFixed(2)}
      </text>
    </svg>
  );
}
