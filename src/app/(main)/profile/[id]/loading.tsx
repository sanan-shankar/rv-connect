import { PeaksMark } from "@/components/layout/peaks-mark";
import { ButtonSkeleton, SegmentedPillsSkeleton } from "@/components/common/skeleton";
import { PostListSkeleton } from "@/components/posts/post-card-skeleton";
import { IDENTITY_VARS, SHEET_SHADOW, SWITCHER_SHADOW, SheetMaterial } from "@/components/profile/letterhead-sheet";

/**
 * The profile's loading state, shaped like the letterhead it precedes: one
 * sheet with the colophon, the name, the facts and the houses, the Writing
 * switcher under it, then the posts. The skeleton is the page with the ink
 * drained out rather than a rough sketch of it, so nothing re-corners,
 * re-pads or jumps when the real page swaps in.
 *
 * Built on letterhead-profile.tsx's own sheet, imported from
 * letterhead-sheet.tsx rather than retyped: the 20px perch clearance; the
 * sheet's radius, border, shadow, grain and glow; the @container padding the
 * name's cqi type is sized against; and the lockup's CSS variables, so the
 * colophon's 16px row, the 8px step and the name's line (its clamp at
 * leading 1.05) are the page's own numbers at every width. The peaks mark is
 * drawn as itself; it is the same mark on every sheet.
 *
 * What it draws is the profile most members have, counted on the live
 * database (2026-09-21, 194 members): the perched bird, because 95% have no
 * photograph; an occupation line (53% have one); the three facts; a Houses
 * section (65%); no About (2%). "Get in touch" sits beside the name from sm
 * and at the foot of the sheet on a phone, where the real one moves.
 */
export default function ProfileLoading() {
  return (
    <div className="pt-5">
      <div className="relative" style={IDENTITY_VARS}>
        {/* PerchedBird's own spot: 48px above the sheet's edge, 80px, at 0.8
            from the bottom on a phone. The disc sits inline in a block, as the
            real bird does, because that line's descent is part of the box the
            0.8 scales from: a bare 80px box landed it 2px high. */}
        <div className="absolute -top-12 right-6 z-20 origin-bottom scale-[0.8] sm:right-10 sm:scale-100">
          <span className="block">
            <span className="skeleton-warm inline-grid size-20 rounded-full" />
          </span>
        </div>

        <div
          className="relative overflow-hidden rounded-[var(--radius-2xl)] border border-border bg-card"
          style={{ boxShadow: SHEET_SHADOW }}
        >
          <SheetMaterial />
          <div className="@container relative p-6 sm:p-10">
            <header>
              <div className="flex items-start gap-[var(--space-m)]">
                <div className="min-w-0 flex-1">
                  <div className="flex h-[var(--lh-colophon)] w-fit items-center gap-[9px] text-cinnamon">
                    <PeaksMark size={16} />
                    <div className="skeleton-warm h-2.5 w-[76px] rounded-md" />
                  </div>
                  <div
                    className="mt-[var(--lh-gap)] flex items-center"
                    style={{ fontSize: "var(--lh-name)", height: "calc(var(--lh-name) * 1.05)" }}
                  >
                    <div className="skeleton-warm h-[0.6em] w-[6.5em] max-w-full rounded-md" />
                  </div>
                </div>
                <div className="hidden shrink-0 sm:block" style={{ marginTop: "var(--lh-cta-top)" }}>
                  <ButtonSkeleton icon label="Get in touch" />
                </div>
              </div>
              <div className="mt-[var(--space-xs)] flex h-6 items-center">
                <div className="skeleton-warm h-3 w-48 max-w-full rounded-md" />
              </div>
            </header>

            {/* The facts: an 11px label over a 15px value, three across from
                sm, the third across both columns on a phone. */}
            <div className="mt-[var(--space-l)] grid grid-cols-2 gap-x-[var(--space-l)] gap-y-[var(--space-m)] sm:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className={i === 2 ? "col-span-2 sm:col-span-1" : "min-w-0"}>
                  <div className="flex h-[16.5px] items-center">
                    <div className="skeleton-warm h-2 w-14 rounded-md" />
                  </div>
                  <div className="mt-[var(--space-xs)] flex h-[20.25px] items-center">
                    <div className="skeleton-warm h-3 w-28 max-w-full rounded-md" />
                  </div>
                </div>
              ))}
            </div>

            {/* Houses: the 12px label, then the trail's 22.5px pills -- one
                row across a laptop's sheet, two on a phone, where the trail
                turns back on itself. */}
            <div className="mt-[var(--space-l)]">
              <div className="flex h-[18px] items-center">
                <div className="skeleton-warm h-2.5 w-16 rounded-md" />
              </div>
              <div className="mt-[var(--space-s)] space-y-[20.5px] sm:space-y-0">
                <div className="flex gap-7">
                  {["w-24", "w-[88px]", "w-24", "w-[104px]"].map((w, i) => (
                    <div
                      key={i}
                      className={`skeleton-warm h-[22.5px] rounded-full ${w} ${i > 1 ? "hidden sm:block" : ""}`}
                    />
                  ))}
                </div>
                <div className="flex justify-end gap-7 sm:hidden">
                  <div className="skeleton-warm h-[22.5px] w-24 rounded-full" />
                  <div className="skeleton-warm h-[22.5px] w-[104px] rounded-full" />
                </div>
              </div>
            </div>

            <div className="mt-[var(--space-l)] sm:hidden">
              <ButtonSkeleton icon label="Get in touch" />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-[var(--space-l)] sm:mt-[var(--space-xl)]">
        {/* The Writing switcher, with its lift off the page. */}
        <SegmentedPillsSkeleton
          segments={["All", "Posts", "Letters", "Photos"].map((label) => ({ label, count: "0" }))}
          style={{ boxShadow: SWITCHER_SHADOW }}
        />

        <div className="mt-[var(--space-m)]">
          <PostListSkeleton />
        </div>
      </div>
    </div>
  );
}
