"use client";

/* ------------------------------------------------------------------ *
 *  useFlightArrival() — everything an auth page does about the ONE
 *  hoopoe arriving on it.
 *
 *  Two ways a bird gets here, and this hook owns both:
 *   1. DESKTOP, via the landing CTA: the flight bus (mascot-flight.ts)
 *      flies a puppet across the navigation, so this page keeps its own
 *      hoopoe hidden, reports where it will rest, and reveals at handoff.
 *   2. MOBILE, where there is no CTA to fly from: the page loads bare and
 *      ~500ms later the bird descends from above the viewport onto its
 *      own rest anchor, so a phone gets the same "one bird" feeling.
 *
 *  This lived three times over — /login, /signup and AuthPanel — with the
 *  perch half written twice comment-for-comment and the fly-in half three
 *  times. The reasoning below is dated and hard-won (the 2026-08-11 forced
 *  layout, the two-frame veil lift, the 5800/6000 failsafe pair); it is
 *  written once here so a fix to one arrival cannot miss another.
 *
 *  Pass `flightKey: null` for a page that is not a flight destination
 *  (the three email pages). The whole perch/handoff half then switches
 *  off and only the mobile fly-in remains.
 *
 *  What the hook does NOT own is `runIntro` — each page's arrival beat is
 *  its own (login's peek-a-boo, signup's greet, the email pages' pass to
 *  their caller), and each keeps its own idea of when that beat is spent.
 *  Give it a self-guarding function: the hook calls it on the mount path,
 *  at handoff, and after the fly-in lands, exactly as the three copies did.
 * ------------------------------------------------------------------ */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { HoopoeApi } from "./hoopoe-kit";
import {
  reportPerch,
  onHandoff,
  FLIGHT_FLAG,
  AUTH_PREVIEW_FLAG,
  type FlightTarget,
} from "./mascot-flight";

export function useFlightArrival({
  flightKey,
  runIntro,
}: {
  /** Which landing CTA can fly here, or null for a page no flight targets. */
  flightKey: FlightTarget | null;
  /** The page's arrival beat. Must no-op if it has already played: the hook
   *  calls it from every arrival path and they can overlap on the failsafe. */
  runIntro: (api: HoopoeApi) => void;
}) {
  // Read fresh on every call rather than closed over at mount, so an effect
  // that ran once still reaches the page's current beat. (All three pages'
  // intros already read their own state through refs, so this changes
  // nothing today; it just removes the trap.) Synced in an effect, not during
  // render, which the refs lint rightly rejects: the ref starts life holding
  // the mount render's function — exactly what the old inline copies closed
  // over — and every reader below is an async callback that runs strictly
  // after some commit, so none of them can see a stale one.
  const runIntroRef = useRef(runIntro);
  useEffect(() => {
    runIntroRef.current = runIntro;
  });

  // One-shot flag: the landing CTA sets this session flag right before it
  // pushes here, purely so the handoff machinery below can tell a genuine
  // hero transition apart from every other arrival. Decide it before first
  // paint via a lazy initializer so there is no flash: on the transition (a
  // soft client navigation) the flag is present; on a direct visit / reload
  // (a full SSR load) server and client both see no flag. Read pure (no
  // clear) for Strict-Mode safety; the handoff effect below is what clears
  // it, so a double-invoked initializer cannot lose the arrival.
  //
  // While true, this page keeps its own hoopoe hidden and at rest until the
  // flyer lands and hands off, so only one bird is ever on screen.
  const [arrivedViaFlight] = useState(() => {
    if (typeof window === "undefined") return false;
    // No flightKey means no flight can be aimed here — and the comparison
    // below would otherwise read a missing flag (null) as a match.
    if (!flightKey) return false;
    try {
      return window.sessionStorage.getItem(FLIGHT_FLAG) === flightKey;
    } catch {
      return false;
    }
  });

  // Did the landing already play this page's entrance for it? It draws the
  // column's opening frame during the photo slide (auth-first-frame.tsx) and
  // names the destination in this flag, so sliding the same column in again
  // on mount would be the second time a visitor watched it arrive. Read
  // before first paint for the same reason the flight flag is, and cleared
  // below so a later direct visit in the same tab still gets its entrance.
  const [entrancePlayedOnLanding] = useState(() => {
    if (typeof window === "undefined") return false;
    if (!flightKey) return false;
    try {
      return window.sessionStorage.getItem(AUTH_PREVIEW_FLAG) === flightKey;
    } catch {
      return false;
    }
  });
  useEffect(() => {
    if (!entrancePlayedOnLanding) return;
    try {
      window.sessionStorage.removeItem(AUTH_PREVIEW_FLAG);
    } catch {
      // storage disabled: the flag could not have been set either.
    }
  }, [entrancePlayedOnLanding]);

  // Mobile has no CTA to launch a cross-page flight from (the photo panel and
  // its CTA only exist at lg+), so on a narrow viewport the owner wants the
  // SAME "one bird" feeling delivered a different way: the page loads bare,
  // then ~500ms later the hoopoe flies in from off-screen and perches exactly
  // where the static mascot would otherwise sit. Decided once at mount via the
  // identical `min-width: 1024px` gate the landing hero's desktop-only flight
  // uses, so this never fires on a viewport wide enough to have gotten the
  // button-to-perch flight instead. The `arrivedViaFlight` check is
  // belt-and-suspenders against the (practically-impossible but guarded-for)
  // case of a desktop flight landing on a since-narrowed viewport: that
  // arrival already has its own reveal path and must never also trigger this
  // one, or two hoopoes could end up in the air.
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

  // The tight box around the hoopoe SVG. Its client rect is the flyer's exact
  // landing target, so the perched flyer and this hoopoe end up pixel-aligned.
  const hoopoeBoxRef = useRef<HTMLDivElement>(null);
  // The form entrance element (the motion.div that slides x 48 -> 0). The
  // perch report below reads its live transform to un-shift rects measured
  // mid-entrance.
  const entranceRef = useRef<HTMLDivElement>(null);
  const hoopoeApiRef = useRef<HoopoeApi | null>(null);

  // Hidden until the flyer hands off when arriving via a flight; shown from the
  // start on a direct visit (there is no flyer to wait for). Deliberately does
  // NOT also fold in the mobile case here: a mismatched inline `style`
  // attribute between the server render (which can never know the viewport)
  // and the client's first hydration pass is a class of hydration error React
  // does not patch up (it leaves the server value in place until some
  // unrelated update touches the node). The mobile fly-in instead hides the
  // bird with the SSR-safe `max-lg:opacity-0` CLASS the pages apply from
  // `preFlightVeil` — className swaps hydrate fine, and a media-scoped class
  // is inert at lg+ so the server can render it unconditionally.
  const [hoopoeShown, setHoopoeShown] = useState(!arrivedViaFlight);

  // Mobile fly-in, part 1: the pre-flight veil. The pages render it on the
  // bird's OUTER box (the inner box carries an inline opacity, which would
  // beat any class) as `max-lg:opacity-0`, so on a phone the seated bird is
  // invisible from the very first painted frame — including the SSR paint,
  // which the previous hide-after-hydration approach could not cover on a slow
  // device. Lifted before paint for every non-fly-in arrival so a later
  // narrow-resize can never hide a legitimately visible bird; the fly-in
  // effect below lifts it for the mobile path once the bird is posed
  // off-screen.
  const [preFlightVeil, setPreFlightVeil] = useState(true);
  useLayoutEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- deliberate pre-paint lift; see the comment above
    if (!mobileFlyIn) setPreFlightVeil(false);
  }, [mobileFlyIn]);

  function onHoopoeReady(api: HoopoeApi) {
    hoopoeApiRef.current = api;
    if (!arrivedViaFlight && !mobileFlyIn) runIntroRef.current(api);
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
  // is still mid-cruise — and keep it fresh (ResizeObserver + resize + scroll)
  // until the handoff makes it moot. The
  // flight bus explicitly supports repeated reports and the flyer retargets
  // smoothly every frame, so the bird is never aiming at a stale rect.
  // `perchWatchStop` lets the handoff reveal below drop the listeners the
  // moment they stop mattering.
  const perchWatchStop = useRef<(() => void) | null>(null);
  // THE MOUNT-TIME REPORT IS THE ResizeObserver'S OWN INITIAL DELIVERY, and
  // that is a flight-smoothness decision, not an accident (2026-08-11).
  //
  // reportPerchRect reads getBoundingClientRect and getComputedStyle. This
  // effect used to also CALL it directly, first as a layout effect and then as
  // a passive one, and in both schedulings it ran before the just-mounted
  // page's first layout, so the read forced a full synchronous layout of a
  // dirty tree — traced at ~85ms, billed to whichever code touches geometry
  // first (this callback, or `autoFocus`, or the router's scroll walk; fixing
  // one just moved the bill to the next). The flight layer drives the bird's
  // cruise from requestAnimationFrame, so those milliseconds came out of the
  // flight as skipped frames: the owner's "it jerks slightly when the sign in
  // content comes in".
  //
  // A ResizeObserver is the one scheduling the platform guarantees to be
  // clean: its callbacks run in the rendering phase AFTER layout, and
  // observe() always produces an initial delivery. So the observer alone
  // reports the perch in the first rendered frame, off a freshly computed
  // layout, forcing nothing — the explicit call added no earliness worth one
  // whole forced layout. The flyer retargets smoothly every frame across a
  // ~2s cruise, so frame-one is early by a mile anyway.
  useEffect(() => {
    if (!arrivedViaFlight) return;
    const el = hoopoeBoxRef.current;
    const ro = new ResizeObserver(reportPerchRect);
    if (el) ro.observe(el);
    // AND the column the box sits in, which is the one that actually moves.
    // The box is a fixed 112px square: it never resizes, so on its own it
    // reported once at mount and never again. Everything that shifts the
    // perch shifts the COLUMN instead — /signup's trivia question arriving a
    // beat after mount and wrapping to two or three lines, a late font, an
    // error line — and because the column is vertically centred, a taller
    // question lifts the box without changing it at all. The bird went on
    // aiming at the rect the box had when the question still read "...", and
    // landed that far below where the perch had moved to (owner, 2026-08-26).
    // Observing the column closes that: it resizes, this fires, and the flyer
    // eases onto the new rect mid-cruise the way it already does for a resize.
    if (entranceRef.current) ro.observe(entranceRef.current);
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

  // Flight handoff: reveal + run the page's beat when the flyer lands. A
  // fallback timer guarantees the bird is never stranded hidden if the flight
  // stalls; it is set longer than the flyer's own failsafe so the two never
  // both show.
  useEffect(() => {
    if (!arrivedViaFlight) return;
    try {
      window.sessionStorage.removeItem(FLIGHT_FLAG);
    } catch {
      // storage disabled: nothing to clear
    }
    // One-shot: on the failsafe path the flyer's forced handoff AND the
    // fallback timer below can both land here inside the intro's settle
    // window, and running the intro twice queued a double greeting.
    let revealed = false;
    const reveal = () => {
      if (revealed) return;
      revealed = true;
      perchWatchStop.current?.();
      setHoopoeShown(true);
      const api = hoopoeApiRef.current;
      if (api) runIntroRef.current(api);
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
      void api.flyIn("sky").then(() => runIntroRef.current(api));
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

  return {
    /** Attach to the tight box around the hoopoe SVG: its rect is the perch. */
    hoopoeBoxRef,
    /** Attach to the sliding form entrance, whose transform is un-shifted. */
    entranceRef,
    /** False only while a flyer is still inbound; drives the box's opacity. */
    hoopoeShown,
    /** True when the landing already slid this column in; mount settled. */
    entrancePlayedOnLanding,
    /** True while a phone must not paint the seated bird; use as a class. */
    preFlightVeil,
    /** Hand to `<Hoopoe onReady>`. */
    onHoopoeReady,
    /** Hand to the entrance's `onAnimationComplete`. */
    reportPerchRect,
  };
}
