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
 *  `useTour().start()` is exposed for the About page's "Take the tour
 *  again", which deliberately ignores any settled state (see tour-local's
 *  doc comment) — it is the permanent, always-available way back in.
 * ------------------------------------------------------------------ */

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { hasSeenOnboarding } from "@/lib/onboarding-local";
import { hasSettledTour, markTourCompleted, markTourDismissed } from "@/lib/tour-local";
import { awaitSpotlight, clearSpotlight } from "./tour-anchors";
import { ENABLED_TOUR_STOPS } from "./tour-steps";
import { TourOffer } from "./tour-offer";
import { TourPanel, type TourPanelApi } from "./tour-panel";
import { TourSpotlight } from "./tour-spotlight";

type Phase = "idle" | "offering" | "running";

interface TourContextValue {
  /** Begin the tour from Stop 1, regardless of any stored completed/dismissed state. */
  start: () => void;
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

export function TourProvider({ userId, children }: { userId: string; children: React.ReactNode }) {
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

  const stops = ENABLED_TOUR_STOPS;

  // Offer on first arrival at /feed: only while nothing has been decided yet.
  useEffect(() => {
    if (pathname !== "/feed" || phase !== "idle") return;
    if (!hasSeenOnboarding(userId) || hasSettledTour(userId)) return;
    const t = setTimeout(() => setPhase("offering"), OFFER_ARM_DELAY_MS);
    return () => clearTimeout(t);
  }, [pathname, phase, userId]);

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
      clearSpotlight(stop.spotlight);
      if (pathnameRef.current !== stop.route) router.push(stop.route);

      const el = await awaitSpotlight(stop.spotlight, 2500);
      if (token !== runTokenRef.current) return;

      if (!el) {
        // No anchor found (slow page, or the control moved): never hang the
        // tour. The card's copy still stands on its own without a spotlight.
        await api.hoopoe.express("curious");
        return;
      }

      el.scrollIntoView({ block: "center", behavior: "auto" });
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
      <TourSpotlight active={phase === "running"} spotlightKey={spotlightKey} />
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
