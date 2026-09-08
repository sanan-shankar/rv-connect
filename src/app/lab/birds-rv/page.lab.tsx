import { BirdGlyphV2, GALLERY_SPECIES } from "@/components/common/bird-avatar-v2";

/**
 * Public-facing display of the Rishi Valley bird set - one icon per species with its name.
 * These are the deterministic alumni avatars; every member without a photo is one of these birds.
 * The list comes from GALLERY_SPECIES (bird-avatar-v2.tsx), shared with the shipped /birds page.
 *
 * This gallery must show the archetype AT each index, not a hash-derived one: it renders
 * BirdGlyphV2 directly with `speciesOverride={i}` rather than going through BirdAvatar (whose
 * `avatarSpecies` prop is dead - real members are id-hash-derived, which is the wrong mechanism
 * for "here is species #i, guaranteed").
 *
 * The Hoopoe (index 0) IS shown: this page is the species collection, not a member identity, so
 * the mascot belongs on the shelf. The Indian Roller is NOT: it belongs to the owner alone, and a
 * bird nobody can have does not want to be browsable.
 */
const NAMES = GALLERY_SPECIES;

export default function BirdGallery() {
  return (
    <div className="min-h-screen bg-[#EFE7D8] px-6 py-16 text-[#33302B]">
      <div className="mx-auto max-w-6xl">
        <header className="mb-12 text-center">
          <h1 className="font-heading text-4xl tracking-tight">The Birds of the Valley</h1>
        </header>

        <ul className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {NAMES.map(({ index: i, name }) => (
            <li key={i} className="flex flex-col items-center text-center">
              <span
                className="relative inline-grid shrink-0 place-items-center"
                style={{ width: 108, height: 108 }}
                aria-label={name}
                role="img"
              >
                <BirdGlyphV2 seed={"gallery-" + i} px={108} speciesOverride={i} />
              </span>
              <span className="mt-3 text-[13px] font-medium leading-snug text-[#33302B]/85">
                {name}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
