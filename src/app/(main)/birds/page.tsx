import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { BirdGlyphV2, GALLERY_SPECIES } from "@/components/common/bird-avatar-v2";
import { GALLERY_GLYPH, GALLERY_GRID, GALLERY_NAME } from "@/components/common/bird-gallery-order";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Birds",
  // The number comes from the list the grid renders, so the two can never disagree (it said
  // "fifty" for a year and stopped being true in the 2026-10 birds expansion).
  description: `The ${GALLERY_SPECIES.length} bird species of Rishi Valley, and the avatars everyone wears.`,
};

/**
 * Public gallery of the Rishi Valley bird set, one glyph per species with its name. These are the
 * deterministic alumni avatars; every member without a photo is one of these birds. The list comes
 * from GALLERY_SPECIES (bird-avatar-v2.tsx), which is where the reserved Indian Roller is held back,
 * so this gallery can never drift from the names shown elsewhere in the app or quietly put the
 * owner's bird back on the shelf.
 *
 * Adapted from the /lab/birds-rv scratch page for a public, in-app route: this version drops
 * the preview's own full-bleed background and standalone heading in favour of the shared app shell
 * and PageHeader every other (main) route uses. Renders BirdGlyphV2 directly with
 * `speciesOverride={i}` (not BirdAvatar, whose species prop is id-hash-derived) so the gallery shows
 * the archetype AT each index, guaranteed.
 */
export default function BirdsPage() {
  return (
    <div>
      {/* Title only, no subtitle (owner, 2026-08-18): the grid says what the
          page is better than a sentence can. /pick-bird mirrors this exact
          layout, through GALLERY_GRID (bird-gallery-order.ts). */}
      <PageHeader
        guide="birds" title="The Birds of the Valley" />
      <ul className={GALLERY_GRID}>
        {GALLERY_SPECIES.map(({ index: i, name }) => (
          <li key={i} className="flex flex-col items-center text-center">
            <span className={GALLERY_GLYPH} aria-label={name} role="img">
              <BirdGlyphV2 seed={`birds-gallery-${i}`} px={96} speciesOverride={i} />
            </span>
            <span className={cn(GALLERY_NAME, "text-muted-foreground")}>
              {name}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
