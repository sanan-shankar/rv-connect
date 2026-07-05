/* ------------------------------------------------------------------ *
 *  Mascot flight bus — the tiny, framework-agnostic bridge that lets the
 *  ONE hoopoe fly from a CTA on one route and perch on the next route's
 *  form, across a client navigation.
 *
 *  Three parties, three responsibilities, one module (shared singleton):
 *   1. The LAUNCHER (landing hero CTA) calls `launchFlight()` at click,
 *      handing over the button's screen point + which page we're flying to.
 *   2. The FLIGHT LAYER (mounted once in the root layout, so it survives
 *      the route change) subscribes via `onLaunch`, flies the puppet, and
 *      `awaitPerch()`s the destination's real resting rect before it lands.
 *   3. The DESTINATION page's own hoopoe stays hidden, `reportPerch()`s
 *      where it will rest, and reveals itself when the flyer `signalHandoff()`s.
 *
 *  There is only ever one flight in the air, so a single-slot design (one
 *  launch callback, one handoff callback, one pending perch) is enough and
 *  keeps the coordination trivial to reason about. Nothing here touches the
 *  DOM or React; it is pure message passing so it can live outside any tree.
 *
 *  A launch can carry an optional `speed` multiplier (see {@link FlightLaunch})
 *  so a future caller can fly faster or slower; the default (`1`, or anything
 *  omitted/invalid) reproduces today's pace exactly.
 * ------------------------------------------------------------------ */

export type FlightTarget = "login" | "signup";

/** A rest rectangle for the perch, in client (viewport) coordinates. Plain
 *  object (not a live DOMRect) so the reporter can pre-correct for a still
 *  animating entrance offset before handing it over. */
export interface PerchRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface FlightLaunch {
  /** Centre of the clicked CTA, in client coordinates (measured at click). */
  from: { x: number; y: number };
  target: FlightTarget;
  /**
   * Playback-speed multiplier for the whole flight. `1` (default) is today's
   * pace; `2` halves every duration (twice as fast), `0.5` doubles them
   * (half speed). Optional and unused by any current launcher — plumbing
   * for a future faster/slower control. Must be a finite number > 0; the
   * flight layer normalizes anything else back to `1` via
   * {@link normalizeFlightSpeed}. Only scales the flight layer's own
   * translation/timing (take-off fade, cruise arc, hand-off fade, and the
   * failsafe timers); the puppet's own wingbeat cadence in hoopoe.tsx is
   * unaffected.
   */
  speed?: number;
}

/** Validate a caller-supplied {@link FlightLaunch.speed}, falling back to the
 *  default pace (`1`) for anything missing, non-finite, or non-positive so a
 *  bad value can never stall or invert a flight's timing. */
export function normalizeFlightSpeed(speed: number | undefined): number {
  return typeof speed === "number" && Number.isFinite(speed) && speed > 0 ? speed : 1;
}

/**
 * sessionStorage key the launcher sets right before it pushes to the auth
 * route, and the destination reads-once on mount. It is what tells the
 * destination page "you were arrived-at by a flight, so keep your own hoopoe
 * hidden until the flyer hands off." A direct visit / reload finds no flag and
 * renders its hoopoe normally with no flight. The value is the {@link FlightTarget}.
 */
export const FLIGHT_FLAG = "rv:mascot-flight";

type LaunchCb = (launch: FlightLaunch) => void;
type HandoffCb = () => void;

let launchCb: LaunchCb | null = null;
let handoffCb: HandoffCb | null = null;
let latestPerch: PerchRect | null = null;
let perchWaiters: Array<(rect: PerchRect) => void> = [];

/** FLIGHT LAYER: subscribe to take-off requests. Returns an unsubscribe fn. */
export function onLaunch(cb: LaunchCb): () => void {
  launchCb = cb;
  return () => {
    if (launchCb === cb) launchCb = null;
  };
}

/** LAUNCHER: fire a flight. Clears any stale perch state from a prior flight. */
export function launchFlight(launch: FlightLaunch): void {
  latestPerch = null;
  perchWaiters = [];
  launchCb?.(launch);
}

/** DESTINATION: report where the perched hoopoe will rest (client rect). Safe
 *  to call more than once (e.g. an early estimate at mount, then the exact rect
 *  once the entrance settles); the flyer always reads the most recent. */
export function reportPerch(rect: PerchRect): void {
  latestPerch = rect;
  const waiters = perchWaiters;
  perchWaiters = [];
  waiters.forEach((resolve) => resolve(rect));
}

/** FLIGHT LAYER: the most recent reported perch, or null if none yet. */
export function getLatestPerch(): PerchRect | null {
  return latestPerch;
}

/** FLIGHT LAYER: resolve once a perch has been reported (or immediately if one
 *  already has). Rejects nothing; on timeout it resolves with null so the
 *  caller can fall back to its provisional target rather than hang forever. */
export function awaitPerch(timeoutMs = 1600): Promise<PerchRect | null> {
  if (latestPerch) return Promise.resolve(latestPerch);
  return new Promise((resolve) => {
    let done = false;
    const settle = (r: PerchRect | null) => {
      if (done) return;
      done = true;
      resolve(r);
    };
    perchWaiters.push((r) => settle(r));
    setTimeout(() => settle(latestPerch), timeoutMs);
  });
}

/** DESTINATION: subscribe to the flyer's "I've landed, take over" signal. */
export function onHandoff(cb: HandoffCb): () => void {
  handoffCb = cb;
  return () => {
    if (handoffCb === cb) handoffCb = null;
  };
}

/** FLIGHT LAYER: tell the destination hoopoe to reveal itself and take over. */
export function signalHandoff(): void {
  handoffCb?.();
}
