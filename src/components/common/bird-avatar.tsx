import Image from "next/image";
import { getInitials } from "@/lib/utils";
import { speciesForMember } from "@/lib/avatar";
import { BirdGlyphV2, BG_MODE, resolveBirdOverride } from "@/components/common/bird-avatar-v2";

/**
 * BirdAvatar - the default identity mark across the app.
 *
 * Precedence: uploaded photo > birdOverride (manual per-user species slug, DB column) > owner/staff
 * pin (SPECIES_PINS) > deterministic bird from id (with the Hoopoe mascot slot excluded - see
 * hashSpeciesFor in src/lib/avatar.ts). Server-renderable (no hooks). It delegates to
 * BirdGlyphV2 — the set of 50 Rishi Valley birds in real colours (see bird-avatar-v2.tsx),
 * whose background treatment is controlled by BG_MODE there ("none" = no disc, the chosen
 * look). There is no avatarColor override: the bird always drives its own colour from src/lib/avatar.ts,
 * so removing a photo returns the same deterministic bird (never a new random one). The
 * `avatarColor` prop that used to be accepted-and-ignored here is gone, along with the column and
 * the twenty-odd selects, types and JWT claims that fed it (2026-08-27). `avatarSpecies` is still
 * accepted for source compatibility with older preview mocks but no longer takes part in the real
 * precedence chain — use `birdOverride` instead.
 *
 * Sizes: 28 (xs / inline + comments + mentions), 40 (sm / post header + composer + rails),
 * 64 (md / directory cards), 104 (lg / profile cover).
 */

export interface AvatarUser {
  id?: string | null;
  name?: string | null;
  photoUrl?: string | null;
  /** @deprecated unused in the real precedence chain — kept for older preview-mock callers. Use `birdOverride`. */
  avatarSpecies?: number | null;
  /** Manual per-user species override (DB column `User.birdOverride`), a slug like "peregrine-falcon". */
  birdOverride?: string | null;
}

const SIZE_TOKENS = { xs: 28, sm: 40, md: 64, lg: 104 } as const;
type SizeToken = keyof typeof SIZE_TOKENS;

export function BirdAvatar({
  user,
  size = "sm",
  ring = false,
  className = "",
}: {
  user: AvatarUser;
  size?: SizeToken | number;
  /** A card-coloured separator for overlapping rows (`-space-x-*`).
   *
   *  **Drawn on the photo path, and on the bird path only when BG_MODE is
   *  "inset".** BG_MODE is "none", so on a bird this is deliberately inert.
   *  That is not an oversight and it should not be "fixed" by dropping the
   *  guard below: measured on the Catch-up card at 2x on 2026-09-05, a 4px
   *  ring on a 28px avatar overlapped by -space-x-2 (8px) consumes the entire
   *  overlap, so each glyph is sliced to a crescent by its neighbour's ring
   *  and the "+N" chip reads as "- N". A photo is clipped to a circle and
   *  wears the ring as a border; an unclipped glyph does not.
   *
   *  So a stacked row IS mixed today: members with a photograph get a ring,
   *  members on a bird do not, and the "+N" chip hand-writes the same shadow.
   *  The owner looked at both and kept these pixels (2026-09-05). If BG_MODE
   *  ever moves to "inset", this starts drawing everywhere and the row
   *  becomes consistent on its own. */
  ring?: boolean;
  className?: string;
}) {
  const px = typeof size === "number" ? size : SIZE_TOKENS[size];
  const ringStyle = ring ? { boxShadow: "0 0 0 4px var(--card)" } : undefined;
  const base =
    "relative inline-grid place-items-center shrink-0 overflow-hidden rounded-full";

  if (user.photoUrl) {
    return (
      <span
        className={`${base} ${className}`}
        style={{ width: px, height: px, ...ringStyle }}
        aria-label={user.name ?? "Member"}
        role="img"
      >
        {/* Owner, 2026-08-03: profile pictures arrived after the rest of the
            page. Two separate causes, both fixed here.
            1. This was a raw <img> straight at the R2 original. Avatars are
               stored at up to 1920px (api/upload/route.ts resizes to that),
               so a real one measured 45.9KB to fill a 30px hole: ~20x the
               bytes needed. Routing through next/image with an explicit
               width/height makes Next serve a bucket-sized WebP (~2-4KB) and
               emit a 1x/2x srcset. `sizes` is deliberately NOT set: for a
               fixed-size image that would switch Next to `w` descriptors and
               hand the choice back to the viewport, which is wrong for a box
               whose size we already know exactly.
            2. next/image is lazy BY DEFAULT, which would have made the very
               symptom worse. A member's face is identity, it is tiny once
               optimised, and it is usually above the fold, so it loads
               eagerly. fetchPriority stays auto on purpose: marking a whole
               feed of avatars "high" just makes them compete with each
               other and with the LCP image. */}
        <Image
          src={user.photoUrl}
          alt=""
          width={px}
          height={px}
          loading="eager"
          className="h-full w-full object-cover"
        />
      </span>
    );
  }

  const seed = user.id || user.name || "valley";
  // birdOverride (resolved, Hoopoe-guarded) > owner/staff pin > deterministic hash (Hoopoe-excluded).
  const overrideIndex = resolveBirdOverride(user.id, user.birdOverride);
  const speciesPick = speciesForMember(seed, overrideIndex);

  // No-disc modes ("none"/"outline") must NOT clip to a circle, or the crest/bill get cut.
  // `clipped` also gates the ring below -- see the `ring` prop's docblock for
  // why an unclipped glyph must not wear one.
  const clipped = BG_MODE === "inset";
  const v2Base = clipped
    ? base
    : "relative inline-grid place-items-center shrink-0";
  return (
    <span
      className={`${v2Base} ${className}`}
      style={{ width: px, height: px, ...(clipped ? ringStyle : undefined) }}
      aria-label={user.name ?? "Member"}
      role="img"
    >
      <BirdGlyphV2
        seed={seed}
        px={px}
        speciesOverride={speciesPick}
      />
      {!user.name ? null : <span className="sr-only">{getInitials(user.name)}</span>}
    </span>
  );
}

