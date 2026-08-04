import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { BirdGlyphV2, GALLERY_SPECIES } from "@/components/common/bird-avatar-v2";

export const metadata: Metadata = {
  title: "Birds",
  description: "The fifty bird species of Rishi Valley, and the avatars everyone wears.",
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
      <PageHeader
        title="The Birds of the Valley"
        subtitle="Fifty species, each one a possible avatar. Every member without a photo wears one of these."
      />
      <ul className="grid grid-cols-2 gap-x-[var(--space-m)] gap-y-[var(--space-l)] sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {GALLERY_SPECIES.map(({ index: i, name }) => (
          <li key={i} className="flex flex-col items-center text-center">
            <span
              className="relative inline-grid shrink-0 place-items-center"
              style={{ width: 96, height: 96 }}
              aria-label={name}
              role="img"
            >
              <BirdGlyphV2 seed={`birds-gallery-${i}`} px={96} speciesOverride={i} />
            </span>
            <span className="mt-[var(--space-xs)] text-[13px] font-medium leading-snug text-muted-foreground">
              {name}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
