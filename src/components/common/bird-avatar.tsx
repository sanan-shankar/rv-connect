import { getInitials } from "@/lib/utils";
import { birdFor } from "@/lib/avatar";

/**
 * BirdAvatar - the default identity mark across the app.
 * Precedence: uploaded photo > manual (avatarColor/avatarSpecies) > deterministic bird from id.
 * Server-renderable (no hooks). The click-to-chirp easter egg is added in the polish phase.
 */

export interface AvatarUser {
  id?: string | null;
  name?: string | null;
  photoUrl?: string | null;
  avatarColor?: string | null;
  avatarSpecies?: number | null;
}

const SIZE_TOKENS = { xs: 28, sm: 40, md: 64, lg: 104 } as const;
type SizeToken = keyof typeof SIZE_TOKENS;

/** White silhouette for a species, centered in a 0..32 viewBox. `eye` punches the disc colour. */
function Species({ i, eye }: { i: number; eye: string }) {
  const body = (
    <path
      d="M5.5 19 C5.5 13.5 10 10 16 10 C22 10 26 13.3 26 18.3 C26 23 21.8 25.6 16 25.6 C10 25.6 5.5 23.5 5.5 19 Z"
      fill="#fff"
      opacity="0.97"
    />
  );
  const shortTail = <path d="M6 19 L1.5 16.5 L3.5 21.5 Z" fill="#fff" opacity="0.95" />;
  const longTail = <path d="M7 20 L0 25 L4.5 21.5 L1.5 17.5 Z" fill="#fff" opacity="0.95" />;
  const beak = <path d="M25 16.4 L30.5 17.6 L25 19.4 Z" fill="#fff" opacity="0.97" />;
  const bigBeak = <path d="M24 15.4 L31.5 17.6 L24 20 Z" fill="#fff" opacity="0.97" />;
  const fanCrest = (
    <path d="M15.5 10 L14.5 4 L17 8 L18.5 3 L20 8 L21.5 5 L21 10 Z" fill="#fff" opacity="0.97" />
  );
  const tuftCrest = <path d="M16 10 L15 5 L17.5 8.5 L19 5 L20 10 Z" fill="#fff" opacity="0.97" />;
  const eyeDot = <circle cx="20.3" cy="16.2" r="1.5" fill={eye} />;

  let inner: React.ReactNode;
  switch (i) {
    case 1: // crested (hoopoe-like)
      inner = (<>{shortTail}{body}{fanCrest}{beak}{eyeDot}</>);
      break;
    case 2: // long-tail (parakeet-like)
      inner = (<>{longTail}{body}{beak}{eyeDot}</>);
      break;
    case 3: // round (sunbird-like), no visible tail
      inner = (<>{body}{beak}{eyeDot}</>);
      break;
    case 4: // big-beak (kingfisher-like)
      inner = (<>{shortTail}{body}{bigBeak}{eyeDot}</>);
      break;
    case 5: // tufted (bulbul-like)
      inner = (<>{longTail}{body}{tuftCrest}{beak}{eyeDot}</>);
      break;
    default: // 0: perched
      inner = (<>{shortTail}{body}{beak}{eyeDot}</>);
  }
  return <g transform="translate(0.6,1.6)">{inner}</g>;
}

export function BirdAvatar({
  user,
  size = "sm",
  ring = false,
  className = "",
}: {
  user: AvatarUser;
  size?: SizeToken | number;
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
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={user.photoUrl} alt="" className="h-full w-full object-cover" />
      </span>
    );
  }

  const seed = user.id || user.name || "valley";
  const bird = birdFor(seed);
  const color = user.avatarColor || bird.color;
  const species = user.avatarSpecies ?? bird.species;

  return (
    <span
      className={`${base} ${className}`}
      style={{ width: px, height: px, background: color, ...ringStyle }}
      aria-label={user.name ?? "Member"}
    >
      <svg
        width={Math.round(px * 0.66)}
        height={Math.round(px * 0.66)}
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden
      >
        <Species i={species} eye={color} />
      </svg>
      {!user.name ? null : <span className="sr-only">{getInitials(user.name)}</span>}
    </span>
  );
}
