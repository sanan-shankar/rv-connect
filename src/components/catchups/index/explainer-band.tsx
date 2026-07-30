"use client";

/* ------------------------------------------------------------------ *
 *  <ExplainerBand> - the newcomer explainer atop the index (spec
 *  section 1 + 3.1).
 *
 *  Two sizes, picked by the caller from real data (page.tsx), not a
 *  client toggle: a viewer with no Catch-up anywhere yet gets the three
 *  beats at full size, labelled discs they can actually read. Once the
 *  viewer belongs to at least one Catch-up it collapses to a strip that
 *  sits in the page header beside "Start a Catch-up" (owner, 2026-07-30:
 *  "beside the catch up section, not below it") wherever the header row
 *  can afford it, with a fallback row above the cards below that width.
 *  Both variants carry the beats and nothing else: the prose that used
 *  to sit here was cut on owner review (2026-07-25), because "Ask ->
 *  Answer -> Read" already says what a Catch-up is. The "Catch-ups"
 *  eyebrow label that used to sit beside the beats is gone too (owner
 *  review 2026-07-25): the page's own h1 already says "Catch-ups"
 *  immediately above this band, so repeating it here was just the same
 *  word twice in a row for no reason.
 *
 *  Carries the `data-tour="catchups-explainer"` spotlight target for the
 *  product tour (walkthrough spec sec 2) on whichever variant renders,
 *  so the "use client" bump above is solely to host that anchor hook.
 * ------------------------------------------------------------------ */

import { useEffect, useState } from "react";
import { HelpCircle, PenLine, BookOpen, ArrowRight } from "lucide-react";
import { useTourAnchor } from "@/components/tour/tour-anchors";

const BEATS = [
  { icon: HelpCircle, label: "Ask" },
  { icon: PenLine, label: "Answer" },
  { icon: BookOpen, label: "Read" },
] as const;

/* The header-vs-fallback handoff line. Must stay in lockstep with the
   `min-[1280px]` classes on the two compact instances in
   catchups/page.tsx and catchups/loading.tsx: 1280 rather than the
   rail's 1180 because at 1180 the main column is ~504px and the title
   (~175px) + this pill (~155px) + the CTA (~146px) + gaps come to ~502px,
   a collision away from overflowing the flex-nowrap header row. */
const HEADER_PILL_QUERY = "(min-width: 1280px)";

export function ExplainerBand({
  compact = false,
  anchorWhen = "always",
}: {
  compact?: boolean;
  /** Which side of the 1280px line this instance registers the tour
   *  anchor on. The index mounts the compact pill TWICE (header row and
   *  fallback row) and shows exactly one via CSS; the anchor has to
   *  follow the visible one, because a display:none anchor measures 0x0
   *  and the tour would cut its spotlight at the viewport corner. */
  anchorWhen?: "always" | "wide" | "narrow";
}) {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    if (anchorWhen === "always") return;
    const mql = window.matchMedia(HEADER_PILL_QUERY);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Mirrors the header-pill breakpoint into state so the tour anchor tracks whichever of the two mounted instances is actually visible.
    setWide(mql.matches);
    const onChange = () => setWide(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [anchorWhen]);
  const anchorEnabled = anchorWhen === "always" || (anchorWhen === "wide") === wide;
  const tourAnchorRef = useTourAnchor<HTMLDivElement>("catchups-explainer", anchorEnabled);

  if (compact) {
    return (
      <div
        ref={tourAnchorRef}
        data-tour="catchups-explainer"
        // inline-flex, not flex: with no eyebrow or trailing clause left,
        // there is nothing to fill a full-bleed strip, so the pill hugs its
        // three beats instead of stretching an empty band across the column.
        className="inline-flex max-w-full flex-wrap items-center gap-1 rounded-full border border-border/70 bg-card/70 px-4 py-2 text-[12px] font-semibold text-muted-foreground"
      >
        {BEATS.map((beat, i) => (
          <span key={beat.label} className="flex items-center gap-1">
            {beat.label}
            {i < BEATS.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground/50" aria-hidden />}
          </span>
        ))}
      </div>
    );
  }

  return (
    <section
      ref={tourAnchorRef}
      data-tour="catchups-explainer"
      className="card-elevated relative overflow-hidden rounded-[var(--radius)] border border-border bg-card p-[var(--space-m)] sm:p-[var(--space-l)]"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 0% 0%, color-mix(in srgb, var(--color-leaf) 9%, transparent), transparent 60%), radial-gradient(110% 90% at 100% 100%, color-mix(in srgb, var(--color-cinnamon) 8%, transparent), transparent 55%)",
        }}
      />

      {/* With the eyebrow and the paragraph both gone, the beats are the
          entire content, so they just center in the card rather than
          anchoring one end of a row that used to hold a label too. */}
      <div className="relative flex justify-center">
        {/* items-start + an h-10 arrow wrapper keeps each connector vertically
            centered on the icon discs (40px tall), not on the taller
            disc+label column, so the arrows read as linking the circles. */}
        <div className="flex shrink-0 items-start gap-2 sm:gap-3">
          {BEATS.map((beat, i) => (
            <div key={beat.label} className="flex items-start gap-2 sm:gap-3">
              <div className="flex flex-col items-center gap-1.5 text-center">
                <div className="grid h-10 w-10 place-items-center rounded-full border border-border/70 bg-background/60 text-cinnamon">
                  <beat.icon className="h-4 w-4" aria-hidden />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-foreground">
                  {beat.label}
                </span>
              </div>
              {i < BEATS.length - 1 && (
                <div className="flex h-10 items-center" aria-hidden>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
