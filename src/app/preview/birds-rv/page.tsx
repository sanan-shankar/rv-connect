import { BirdAvatar } from "@/components/common/bird-avatar";
import { SPECIES_FULL_NAMES } from "@/components/common/bird-avatar-v2";

/**
 * Public-facing display of the Rishi Valley bird set - one icon per species with its name.
 * These are the deterministic alumni avatars; every member without a photo is one of these birds.
 * Names come from SPECIES_FULL_NAMES (bird-avatar-v2.tsx) so this gallery can never drift from the
 * names shown elsewhere in the app.
 */
const NAMES = SPECIES_FULL_NAMES;

export default function BirdGallery() {
  return (
    <div className="min-h-screen bg-[#EFE7D8] px-6 py-16 text-[#33302B]">
      <div className="mx-auto max-w-6xl">
        <header className="mb-12 text-center">
          <h1 className="font-heading text-4xl tracking-tight">The Birds of the Valley</h1>
        </header>

        <ul className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {NAMES.map((name, i) => (
            <li key={i} className="flex flex-col items-center text-center">
              <BirdAvatar user={{ id: "gallery-" + i, name, avatarSpecies: i }} size={108} />
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
