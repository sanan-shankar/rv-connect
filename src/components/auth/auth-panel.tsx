"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { motion } from "motion/react";
import { Hoopoe } from "@/components/mascot/hoopoe";
import type { HoopoeApi } from "@/components/mascot/hoopoe-kit";
import { Wordmark } from "@/components/layout/peaks-mark";
import { SPRINGS } from "@/components/common/motion";
import { cn } from "@/lib/utils";
import { HERO_IMAGE_SRC, HERO_IMAGE_BLUR } from "@/components/landing/hero-photo";

/* ------------------------------------------------------------------ *
 *  The auth page shell: valley photograph on the left, warm form
 *  column on the right, one hoopoe above the heading.
 *
 *  /login and /signup each carry their own copy of this geometry, and
 *  they keep it: those two are the endpoints of the landing page's
 *  cross-page bird flight, so they additionally run the perch-reporting
 *  and handoff machinery from mascot-flight.ts, which is most of their
 *  length and means nothing here. The three email pages
 *  (forgot-password, reset-password, verify-email) are never a flight
 *  destination, so they take this instead of copying 250 lines of
 *  flight wiring three more times.
 *
 *  What IS shared with those two, deliberately, so the five pages read
 *  as one place: the 58.3333% split and its exact photo crop, the
 *  lateral entrance on the gentle spring, and the mobile fly-in.
 * ------------------------------------------------------------------ */

export function AuthPanel({
  back,
  hoopoeRef,
  onHoopoeReady,
  hoopoeSize = 102,
  children,
}: {
  /** Top-left escape hatch. Every one of these pages is a detour off the
   *  sign-in road, so there is always a way back to it. */
  back: { href: string; label: string };
  hoopoeRef: React.Ref<HoopoeApi | null>;
  /** Fired once the rig is mounted and drivable. The page uses it to play its
   *  own arrival beat, which is the only thing that differs between them. */
  onHoopoeReady?: (api: HoopoeApi) => void;
  hoopoeSize?: number;
  children: React.ReactNode;
}) {
  const apiRef = useRef<HoopoeApi | null>(null);
  const introDone = useRef(false);
  const mobileFlyInFired = useRef(false);

  // Same `min-width: 1024px` gate the landing hero's desktop-only flight uses.
  // Below it there is no photo panel and no CTA to fly from, so the bird
  // arrives under its own power instead of simply being there.
  const [mobileFlyIn] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return !window.matchMedia("(min-width: 1024px)").matches;
    } catch {
      return false;
    }
  });

  // The pre-flight veil, as a media-scoped CLASS rather than an inline style:
  // the server cannot know the viewport, and a mismatched inline `style`
  // between the SSR paint and hydration is the class of hydration error React
  // leaves in place. `max-lg:opacity-0` is inert at lg+, so the server can
  // render it unconditionally and a phone never paints the seated bird before
  // it flies in. Lifted before paint on any viewport that is not flying.
  const [preFlightVeil, setPreFlightVeil] = useState(true);
  useLayoutEffect(() => {
    if (!mobileFlyIn) setPreFlightVeil(false);
  }, [mobileFlyIn]);

  function handleReady(api: HoopoeApi) {
    apiRef.current = api;
    if (!mobileFlyIn) {
      introDone.current = true;
      onHoopoeReady?.(api);
    }
  }

  // Mobile: ~500ms after the page settles the bird descends from above the
  // VIEWPORT ("sky", not "top": this rig sits mid-screen, so a box-relative
  // start would have it appear already on screen) and lands on its own rest
  // anchor, exactly where the seated bird would have been.
  useEffect(() => {
    if (!mobileFlyIn) return;
    const timer = setTimeout(() => {
      if (mobileFlyInFired.current) return;
      const api = apiRef.current;
      if (!api) {
        // The rig never reported ready. Show the seated bird rather than none.
        setPreFlightVeil(false);
        return;
      }
      mobileFlyInFired.current = true;
      void api.flyIn("sky").then(() => {
        if (introDone.current) return;
        introDone.current = true;
        onHoopoeReady?.(api);
      });
      // Two frames later: motion renders the fly-in's duration-0 pose warp on
      // its NEXT frame, so revealing in the same tick can paint one frame of
      // the seated bird at the perch before the warp lifts it off-screen.
      requestAnimationFrame(() => requestAnimationFrame(() => setPreFlightVeil(false)));
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mobileFlyIn]);

  return (
    // Not a grid: the photo half is viewport-fixed, so it must never take part
    // in row-height sizing with the form column. `lg:pl-[...]` reserves the
    // width the fixed panel occupies.
    <div className="min-h-screen lg:pl-[58.3333%]">
      {/* The same crop as /login and /signup: a full 100vw object-cover render
          (the landing's own scale), right-aligned inside this 58.33vw panel and
          clipped, so all five auth pages and the landing hero share one
          continuous photograph. */}
      <div className="fixed inset-y-0 left-0 hidden w-[58.3333%] overflow-hidden lg:block">
        <div className="absolute inset-y-0 right-0 w-screen">
          <Image
            src={HERO_IMAGE_SRC}
            alt=""
            fill
            priority
            placeholder="blur"
            blurDataURL={HERO_IMAGE_BLUR}
            className="object-cover"
            sizes="100vw"
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-br from-[#16241a]/55 via-[#16241a]/15 to-transparent"
          />
        </div>
        <Link
          href="/"
          className="absolute left-8 top-7 inline-flex items-center gap-2.5 rounded-sm text-white lg:left-16 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          style={{ filter: "drop-shadow(0 1px 6px rgba(20,30,22,0.55))" }}
        >
          <Wordmark markClassName="text-white" textClassName="block" />
        </Link>
      </div>

      <div className="flex min-h-screen flex-col bg-background px-[var(--space-l)] py-[var(--space-l)]">
        <Link
          href={back.href}
          className="inline-flex items-center gap-1 self-start rounded-sm text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <ArrowLeft className="h-4 w-4" />
          {back.label}
        </Link>

        <motion.div
          className="my-auto w-full max-w-[360px] self-center text-center"
          initial={{ opacity: 0, x: 48 }}
          animate={{ opacity: 1, x: 0 }}
          transition={SPRINGS.gentle}
        >
          <div
            className={cn(
              "mx-auto mb-1 grid h-[128px] place-items-center",
              preFlightVeil && "max-lg:opacity-0",
            )}
          >
            <Hoopoe ref={hoopoeRef} size={hoopoeSize} onReady={handleReady} />
          </div>
          {children}
        </motion.div>
      </div>
    </div>
  );
}

/** The heading pair every auth page opens with, at one size, so /login,
 *  /signup and these three never drift into three different title scales. */
export function AuthHeading({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <h1 className="font-heading text-[27px] leading-tight tracking-tight text-foreground">
        {title}
      </h1>
      {/* 34ch, not /login's 30. These pages carry more to say than "sign in"
          does (what a link does, how long it lasts, where to look if it did
          not arrive), and at 30ch that ran to four lines with a two-word
          orphan on the last. 34 is still inside a comfortable measure and
          breaks the same copy into three balanced lines. */}
      <p className="mx-auto mt-2 mb-7 max-w-[34ch] text-sm leading-relaxed text-muted-foreground">
        {children}
      </p>
    </>
  );
}
