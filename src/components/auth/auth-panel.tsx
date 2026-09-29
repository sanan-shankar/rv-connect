"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "@/components/common/link";
import { ArrowLeft } from "lucide-react";
import { m } from "motion/react";
import { Hoopoe } from "@/components/mascot/hoopoe";
import type { HoopoeApi } from "@/components/mascot/hoopoe-kit";
import { useFlightArrival } from "@/components/mascot/use-flight-arrival";
import { Wordmark } from "@/components/layout/peaks-mark";
import { SPRINGS } from "@/components/common/motion";
import { cn } from "@/lib/utils";
import { HERO_IMAGE_SRC, HERO_IMAGE_BLUR } from "@/components/landing/hero-photo";

/* ------------------------------------------------------------------ *
 *  The auth page shell: valley photograph on the left, warm form
 *  column on the right, one hoopoe above the heading.
 *
 *  /login and /signup keep their own shell rather than taking this one:
 *  those two are the endpoints of the landing page's cross-page bird
 *  flight, so their hoopoe has to sit in a measured box inside a
 *  measured entrance, and /signup's column re-anchors between its two
 *  steps. The three email pages (forgot-password, reset-password,
 *  verify-email) are never a flight destination and never change shape,
 *  so they take this.
 *
 *  What IS shared with those two, deliberately, so the five pages read
 *  as one place: the photo half and its 58.3333% split (AuthPhotoPanel,
 *  below), the lateral entrance on the gentle spring, and the arrival
 *  machinery itself — the mobile fly-in and its veil come from
 *  useFlightArrival, which is where the flight wiring lives too.
 * ------------------------------------------------------------------ */

/**
 * The valley photograph every auth page opens on, with the brand over it.
 *
 * Pinned to the viewport with `fixed` + `inset-y-0` rather than sharing a grid
 * row with the form column, so its size and crop stay constant however tall
 * the form gets (a password field toggling, an error line, /signup swapping
 * Alumnus for Teacher). The form column scrolls underneath it; the photo never
 * resizes.
 *
 * Geometry, and the reason this is one component rather than three copies: the
 * inner box is a full 100vw `object-cover` render — the SAME scale the landing
 * hero uses — right-aligned inside this 58.33vw panel and clipped. So the
 * panel shows exactly the RIGHT slice of the landing composition, at the
 * landing's zoom, with the left part cropped off. That is what the landing
 * "Sign in" slide lands on, so the handoff has no jump, and it is why the crop
 * must not drift between the five pages: it was written out three times, and
 * the comment warning about drift was written out three times with it.
 */
export function AuthPhotoPanel() {
  return (
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
      {/* Canonical wordmark lockup, at the landing hero's own size and
          position so it stays put across the sign-in handoff. */}
      <Link
        href="/"
        className="absolute left-8 top-7 inline-flex items-center gap-2.5 rounded-sm text-white lg:left-16 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        style={{ filter: "drop-shadow(0 1px 6px rgba(20,30,22,0.55))" }}
      >
        <Wordmark markClassName="text-white" textClassName="block" />
      </Link>
    </div>
  );
}

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
  const introDone = useRef(false);

  // The arrival beat, such as it is: these three pages have no flight aimed at
  // them, so the bird either is simply there (desktop) or descends once the
  // page settles (mobile), and either way the page above gets told once.
  function runIntro(api: HoopoeApi) {
    if (introDone.current) return;
    introDone.current = true;
    onHoopoeReady?.(api);
  }

  // `flightKey: null` switches off the perch/handoff half — nothing flies
  // here, so there is nothing to report a rest rect to. What remains is the
  // mobile fly-in and its pre-paint veil, shared with /login and /signup
  // rather than written a third time.
  const { preFlightVeil, onHoopoeReady: handleReady } = useFlightArrival({
    flightKey: null,
    runIntro,
  });

  return (
    // Not a grid: the photo half is viewport-fixed, so it must never take part
    // in row-height sizing with the form column. `lg:pl-[...]` reserves the
    // width the fixed panel occupies.
    <div className="min-h-screen lg:pl-[58.3333%]">
      <AuthPhotoPanel />

      <div className="flex min-h-screen flex-col bg-background px-[var(--space-l)] py-[var(--space-l)]">
        <Link
          href={back.href}
          className="inline-flex items-center gap-1 self-start rounded-sm text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <ArrowLeft className="h-4 w-4" />
          {back.label}
        </Link>

        <m.div
          // 400px, the shared auth column: /login and /signup moved there
          // with the calm-form redesign, and these three ride along.
          className="my-auto w-full max-w-[400px] self-center text-center"
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
        </m.div>
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
  /** Optional since the calm-form pass: a page whose fields already say
   *  everything passes no children and gets just the title. The paragraph
   *  survives where it carries REAL information (where a link went, why a
   *  link died, whose account is being reset) - that is content, not the
   *  decorative subtitle the owner removed from /signup and /login. */
  children?: React.ReactNode;
}) {
  return (
    <>
      <h1 className="font-heading text-[27px] leading-tight tracking-tight text-foreground">
        {title}
      </h1>
      {/* 34ch. These pages carry more to say than "sign in" does (what a link
          does, how long it lasts, where to look if it did not arrive), and at
          30ch that ran to four lines with a two-word orphan on the last. 34 is
          still inside a comfortable measure and breaks the same copy into
          three balanced lines. */}
      {children && (
        <p className="mx-auto mt-2 mb-7 max-w-[34ch] text-sm leading-relaxed text-muted-foreground">
          {children}
        </p>
      )}
    </>
  );
}
