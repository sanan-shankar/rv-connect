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
}

/**
 * Optical landing lift, in px. The auth pages apply this as a constant
 * `translateY(-PERCH_LIFT_PX)` on the tight box around their hoopoe — the same
 * box whose measured rect they report as the perch — so the report, the
 * flyer's landing, and the destination bird all agree to the pixel while all
 * sitting marginally high. Why high: a bird alighting a touch above the
 * geometric spot reads as perched ON it; geometric centring read as sunk INTO
 * it (owner: "it lands a couple of pixels too low. let it land marginally
 * higher"). 2px is the whole ask — any more starts to read as floating.
 */
export const PERCH_LIFT_PX = 2;

/**
 * sessionStorage key the launcher sets right before it pushes to the auth
 * route, and the destination reads-once on mount. It is what tells the
 * destination page "you were arrived-at by a flight, so keep your own hoopoe
 * hidden until the flyer hands off." A direct visit / reload finds no flag and
 * renders its hoopoe normally with no flight. The value is the {@link FlightTarget}.
 */
export const FLIGHT_FLAG = "rv:mascot-flight";

/**
 * The landing's other one-shot flag, the same shape and set in the same
 * breath: it holds the target whose OPENING FRAME the landing drew during
 * the photo slide (auth-first-frame.tsx), so the destination knows its
 * entrance has already been played and mounts settled instead of sliding
 * the same column in a second time. It lives here rather than beside the
 * frame because useFlightArrival is what reads it, and this is the module
 * that already carries the landing-to-auth-page handshake.
 */
export const AUTH_PREVIEW_FLAG = "rv:auth-preview";

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
