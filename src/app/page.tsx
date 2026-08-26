import type { Metadata } from "next";
import { LandingHero } from "@/components/landing/landing-hero";

export const metadata: Metadata = {
  title: {
    absolute: "Rishi Valley",
  },
  description:
    "A space for the Rishi Valley community to stay connected.",
};

/**
 * The landing page is the hero and nothing else (owner, 2026-08-04: "I want to
 * make the landing page no longer scroll ... I don't want to delete everything
 * under the landing page, I just need to improve it further before it's
 * shipped").
 *
 * Everything below the hero lives in `@/components/landing/showcase`, and this
 * route does not import it, so none of it -- six "use client" modules included
 * -- reaches the client manifest of the most-visited signed-out page. It used
 * to sit here behind a `SHOW_SHOWCASE = false` flag, which switched off the
 * RENDERING but not the module graph.
 *
 * To put it back, two lines:
 *   import { Showcase, ShowcaseChrome } from "@/components/landing/showcase";
 * then `<ShowcaseChrome />` above the hero and `<Showcase />` below it, and
 * flip `showScrollCue` to true so the hero points at something again. Read
 * showcase.tsx's header first: two things must be settled before it goes
 * public.
 */
export default function LandingPage() {
  return (
    <div className="bg-background">
      {/* No scroll cue: with the showcase off there is nothing below the fold
          for it to point at. */}
      <LandingHero showScrollCue={false} />
    </div>
  );
}
