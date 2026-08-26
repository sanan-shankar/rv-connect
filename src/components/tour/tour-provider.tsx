"use client";

/* ------------------------------------------------------------------ *
 *  <TourProvider> — the tour's state machine (walkthrough spec sec 3, 7).
 *  Mounted once in `(main)/layout.tsx`, alongside `AppShell`, so it (and
 *  its persistent card + hoopoe) survives every client navigation between
 *  the tour's four real routes.
 *
 *  Owns: phase, which stop we're on, the offer-on-first-feed-arrival
 *  logic, navigation between stops, and the hoopoe choreography for each
 *  arrival (reading rects from the tour-anchors registry, the same
 *  reporter pattern the cross-page mascot flight bus uses). Persists
 *  terminal state (completed/dismissed) via tour-local.ts.
 *
 *  `useTour().start()` is exposed for the owner Admin page's "hoopoe tour"
 *  action. It deliberately ignores any settled state (see tour-local's doc
 *  comment), so a manual run is always available to the owner.
 * ------------------------------------------------------------------ */

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { hasSeenOnboarding } from "@/lib/onboarding-local";
import { shouldAutoOfferTour } from "@/lib/tour-auto-offer";
import { hasSettledTour, markTourCompleted, markTourDismissed } from "@/lib/tour-local";
import { awaitSpotlight, clearSpotlight } from "./tour-anchors";
import { TOUR_STOPS } from "./tour-steps";
import type { TourPanelApi } from "./tour-panel";

/* The three pieces of tour UI load on demand, the way mascot-flight-layer.tsx
   loads the hoopoe rig. TourProvider mounts on EVERY (main) page, but the tour
   only ever runs on the demo deployment (autoOffer={IS_DEMO}) or from the
   owner's admin button -- so for every real member these 442 lines, and the
   1,522-line Hoopoe rig they statically pull in behind them, sat in the shared
   authed chunk to render nothing.

   The provider itself stays static: `useTour()` has to keep working
   synchronously wherever it is called. Only what renders at `phase !== "idle"`
   is deferred, which is behind a click or a first-feed arrival, where one
   network fetch is invisible. */
const TourOffer = dynamic(() => import("./tour-offer").then((m) => m.TourOffer), {
  ssr: false,
});
const TourPanel = dynamic(() => import("./tour-panel").then((m) => m.TourPanel), {
  ssr: false,
});
const TourSpotlight = dynamic(() => import("./tour-spotlight").then((m) => m.TourSpotlight), {
  ssr: false,
});

type Phase = "idle" | "offering" | "running";

interface TourContextValue {
  /** Begin the tour from Stop 1, regardless of any stored completed/dismissed state. */
  start: () => void;
}

interface TourProviderProps {
  userId: string;
  children: React.ReactNode;
  autoOffer?: boolean;
}

const TourContext = createContext<TourContextValue | null>(null);

export function useTour(): TourContextValue {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error("useTour must be used within <TourProvider>");
  return ctx;
}

// A short beat after landing on /feed before considering the offer, so it
// never appears mid-entrance-animation of the page itself.
const OFFER_ARM_DELAY_MS = 700;

// Matches the panel's own bottom-sheet breakpoint (tour-panel.tsx).
const MOBILE_BREAKPOINT_PX = 640;

// Breathing room kept between the spotlight hole and the viewport top /
// the sheet's own top edge, so the ring never touches either.
const MOBILE_TOP_MARGIN_PX = 16;
const MOBILE_SHEET_MARGIN_PX = 16;

/**
 * Scrolls the spotlight target into view. On desktop this is a plain
 * centre-of-viewport scroll. On mobile the panel becomes a bottom sheet
 * docked to the bottom of the screen, and its height varies stop to stop
 * (short body vs. a body plus a note callout), so we read its *live*
 * measured top (`panelTop`, from tour-panel.tsx) rather than assuming a
 * fixed reservation. The target's centre is placed around 30-40% down the
 * viewport (spec sec 8) but always clamped so its top and bottom both
 * stay clear of the sheet: a fixed 40% works for small controls but would
 * still let a tall target (e.g. the Catch-ups explainer card in its
 * empty-state, uncompacted form) run its bottom edge under the sheet.
 */
function scrollTargetIntoView(el: HTMLElement, panelTop: number) {
  if (window.innerWidth >= MOBILE_BREAKPOINT_PX) {
    el.scrollIntoView({ block: "center", behavior: "auto" });
    return;
  }
  const rect = el.getBoundingClientRect();
  const availableTop = MOBILE_TOP_MARGIN_PX;
  const availableBottom = Math.max(panelTop - MOBILE_SHEET_MARGIN_PX, availableTop + 1);

  const preferredCenter = window.innerHeight * 0.35;
  const minCenter = availableTop + rect.height / 2;
  const maxCenter = availableBottom - rect.height / 2;
  // Clamp the preferred centre into the space that's actually free of the
  // sheet. If the target is taller than that space altogether (rare, but
  // possible for an uncompacted card), fall back to pinning its top to the
  // top margin: that keeps as much of it visible above the sheet as
  // physically fits, rather than centring it and hiding both ends.
  const desiredCenter =
    maxCenter >= minCenter
      ? Math.min(Math.max(preferredCenter, minCenter), maxCenter)
      : availableTop + rect.height / 2;

  const targetCenter = rect.top + rect.height / 2;
  window.scrollBy({ top: targetCenter - desiredCenter, left: 0, behavior: "auto" });
}

export function TourProvider({ userId, children, autoOffer = false }: TourProviderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const pathnameRef = useRef(pathname);
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  const [phase, setPhase] = useState<Phase>("idle");
  const [index, setIndex] = useState(0); // 0..stops.length; stops.length === the Finish beat
  const runTokenRef = useRef(0);
  const apiRef = useRef<TourPanelApi | null>(null);
  const [spotlightKey, setSpotlightKey] = useState<string | null>(null);

  const stops = TOUR_STOPS;

  // Dormant by default. When explicitly opted in, offer on the first /feed
  // arrival only while nothing has been decided yet.
  useEffect(() => {
    if (
      !shouldAutoOfferTour({
        autoOffer,
        pathname,
        phase,
        hasSeenOnboarding: () => hasSeenOnboarding(userId),
        hasSettledTour: () => hasSettledTour(userId),
      })
    )
      return;
    const t = setTimeout(() => setPhase("offering"), OFFER_ARM_DELAY_MS);
    return () => clearTimeout(t);
  }, [autoOffer, pathname, phase, userId]);

  const runStop = useCallback(
    async (i: number) => {
      const token = ++runTokenRef.current;
      const api = apiRef.current;
      if (!api) return;

      if (i >= stops.length) {
        // Finish beat: stay on the current page, hoopoe celebrates.
        setSpotlightKey(null);
        await api.hoopoe.flyTo(api.perchPoint());
        if (token !== runTokenRef.current) return;
        await api.hoopoe.celebrate(2);
        if (token !== runTokenRef.current) return;
        await api.hoopoe.crest(true);
        if (token !== runTokenRef.current) return;
        await api.hoopoe.nod();
        if (token !== runTokenRef.current) return;
        await api.hoopoe.express("happy");
        return;
      }

      const stop = stops[i];
      setSpotlightKey(null);
      // Only clear + wait for a fresh registration when we're actually
      // navigating to a different route. If the stop's route is the one
      // we're already on (Offer -> Stop 1, both /feed), no remount happens,
      // so the anchor already registered by that page's mount-time effect
      // is the correct one; clearing it here would wipe it with nothing
      // left to re-report it, and the tour would time out with no spotlight.
      const needsNav = pathnameRef.current !== stop.route;
      if (needsNav) {
        clearSpotlight(stop.spotlight);
        router.push(stop.route);
      }

      const el = await awaitSpotlight(stop.spotlight, 2500);
      if (token !== runTokenRef.current) return;

      if (!el) {
        // No anchor found (slow page, or the control moved): never hang the
        // tour. The card's copy still stands on its own without a spotlight.
        await api.hoopoe.express("curious");
        return;
      }

      scrollTargetIntoView(el, api.panelTop());
      const rect = el.getBoundingClientRect();
      setSpotlightKey(stop.spotlight);

      const hover = {
        x: Math.min(Math.max(rect.left + rect.width / 2, 60), window.innerWidth - 60),
        y: Math.max(rect.top - 64, 72),
      };
      await api.hoopoe.flyTo(hover);
      if (token !== runTokenRef.current) return;
      await api.hoopoe.point(rect);
      if (token !== runTokenRef.current) return;
      await api.hoopoe.flyTo(api.perchPoint());
      if (token !== runTokenRef.current) return;
      await api.hoopoe.express("content");
    },
    [router, stops]
  );

  useEffect(() => {
    if (phase !== "running") return;
    void runStop(index);
  }, [phase, index, runStop]);

  const start = useCallback(() => {
    runTokenRef.current++; // abort anything mid-flight from a prior run
    setIndex(0);
    setPhase("running");
    if (pathnameRef.current !== stops[0].route) router.push(stops[0].route);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  function next() {
    setIndex((i) => Math.min(i + 1, stops.length));
  }
  function back() {
    setIndex((i) => Math.max(i - 1, 0));
  }
  function teardown() {
    runTokenRef.current++; // abort any in-flight hoopoe beat
    setSpotlightKey(null);
    setPhase("idle");
  }
  function skip() {
    markTourDismissed(userId);
    teardown();
  }
  function finish() {
    markTourCompleted(userId);
    teardown();
  }
  function maybeLater() {
    markTourDismissed(userId);
    setPhase("idle");
  }

  return (
    <TourContext.Provider value={{ start }}>
      {children}
      {/* Gated on the phase rather than mounted-always-and-null-inside: a
          dynamic() component fetches its chunk the moment it mounts, so
          leaving this mounted at idle would defer nothing. TourSpotlight
          already returned null when inactive, and its effect cleanup is the
          same work unmounting does. */}
      {phase === "running" && (
        <TourSpotlight active spotlightKey={spotlightKey} />
      )}
      {phase === "offering" && <TourOffer onStart={start} onMaybeLater={maybeLater} />}
      {phase === "running" && (
        <TourPanel
          registerApi={(api) => {
            apiRef.current = api;
          }}
          stop={index < stops.length ? stops[index] : null}
          index={index}
          total={stops.length}
          onNext={next}
          onBack={back}
          onSkip={skip}
          onFinish={finish}
        />
      )}
    </TourContext.Provider>
  );
}
