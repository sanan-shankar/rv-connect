"use client";

/* ------------------------------------------------------------------ *
 *  <AlmostReady> — the warm holding scene for Catch-ups.
 *
 *  Two lives:
 *   1. Pre-migration, every /catchups* route renders this when a Prisma
 *      P2021 says the six tables do not exist yet. It must read as an
 *      intentional, beautiful "almost here" state, never a broken page.
 *   2. It doubles as the shape of the "preparing" ritual (spec 2.5): a
 *      settled hoopoe over a warm shimmer while the Round is assembled.
 *
 *  Composition is deliberately not a lone thin column: a soft gradient
 *  medallion holds the settled hoopoe on one side, the copy and a
 *  "coming together" shimmer stack on the other, so it has rhythm.
 *
 *  Motion: transform / opacity only. The hoopoe's idle breathe is always
 *  on (design system sec 7); the panel rises in with the shared FadeRise.
 *
 *  One-hoopoe rule: gated on `useSoloHoopoe()` like every other mascot
 *  moment. When another bird is already on screen, the medallion drops
 *  out entirely and the copy/shimmer column recenters into a single
 *  column rather than leaving a hollow left half.
 * ------------------------------------------------------------------ */

import { Hoopoe } from "@/components/mascot/hoopoe";
import { useSoloHoopoe } from "@/components/mascot/moments/moment-hoopoe";
import { FadeRise } from "@/components/common/motion";
import { cn } from "@/lib/utils";

export function AlmostReady({
  eyebrow = "Catch-ups",
  title = "Catch-ups are almost ready.",
  body = "A gentle group newsletter is being wired up. Everyone answers a few questions, and their replies become one warm issue the whole group reads together. Check back in a moment.",
  className,
}: {
  eyebrow?: string;
  title?: string;
  body?: string;
  className?: string;
}) {
  const solo = useSoloHoopoe();

  return (
    <FadeRise className={cn("mx-auto w-full max-w-3xl", className)}>
      <div className="card-elevated relative overflow-hidden rounded-[var(--radius)] border border-border bg-card">
        {/* layered warm radial wash, so the surface has depth rather than a flat fill */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 90% at 12% 0%, color-mix(in srgb, var(--color-leaf) 10%, transparent), transparent 60%), radial-gradient(120% 90% at 100% 100%, color-mix(in srgb, var(--color-cinnamon) 9%, transparent), transparent 55%)",
          }}
        />

        <div
          className={cn(
            "relative flex flex-col items-center gap-7 p-8 sm:p-10 md:gap-10 md:p-12",
            solo && "md:flex-row md:items-center"
          )}
        >
          {/* the settled hoopoe, resting in a soft medallion -- hidden when
              another hoopoe is already on screen (one-hoopoe rule) */}
          {solo && (
            <div className="relative flex shrink-0 items-center justify-center">
              <div
                aria-hidden
                className="absolute h-36 w-36 rounded-full"
                style={{
                  background:
                    "radial-gradient(circle at 50% 42%, color-mix(in srgb, var(--color-leaf) 16%, transparent), transparent 68%)",
                }}
              />
              <Hoopoe size={132} />
            </div>
          )}

          {/* copy + a quiet preview of the Round coming together */}
          <div className={cn("min-w-0 flex-1 text-center", solo && "md:text-left")}>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-leaf">
              {eyebrow}
            </p>
            <h1 className="mt-2 font-heading text-2xl font-bold tracking-[-0.02em] text-foreground sm:text-[1.7rem]">
              {title}
            </h1>
            <p
              className={cn(
                "mx-auto mt-3 max-w-md text-[14.5px] leading-relaxed text-muted-foreground",
                solo && "md:mx-0"
              )}
            >
              {body}
            </p>

            <div className="mt-7 space-y-3" aria-hidden>
              <div className="skeleton-warm h-3 w-24 rounded-full" />
              <div className="rounded-[var(--radius-md)] border border-border/70 bg-background/50 p-4">
                <div className="skeleton-warm h-4 w-3/4 rounded-md" />
                <div className="skeleton-warm mt-2.5 h-3 w-full rounded-md" />
                <div className="skeleton-warm mt-1.5 h-3 w-5/6 rounded-md" />
                <div className="mt-4 flex items-center gap-2.5">
                  <div className="skeleton-warm h-8 w-8 rounded-full" />
                  <div className="space-y-1.5">
                    <div className="skeleton-warm h-3 w-24 rounded-md" />
                    <div className="skeleton-warm h-2.5 w-16 rounded-md" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </FadeRise>
  );
}
