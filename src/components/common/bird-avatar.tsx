import { getInitials } from "@/lib/utils";
import { birdFor, BIRD_SPECIES_COUNT, BIRD_POSE_COUNT } from "@/lib/avatar";

/**
 * BirdAvatar - the default identity mark across the app.
 *
 * Precedence: uploaded photo > manual (avatarColor/avatarSpecies) > deterministic bird from id.
 * Server-renderable (no hooks). 16 species x 10 disc colours x 4 poses = 640 distinct birds,
 * selected by a salted FNV-1a hash of the user id so the distribution is even and the axes do
 * not correlate. Every silhouette is an off-white fill CENTERED in the disc (viewBox 0..32,
 * geometry balanced around 16,16) with a negative-space eye punched in the disc colour.
 *
 * Sizes: 28 (xs / inline + comments + mentions), 40 (sm / post header + composer + rails),
 * 64 (md / directory cards), 104 (lg / profile cover).
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

const WHITE = "#FBFBF8";

/**
 * One species silhouette, centered in a 0..32 viewBox (balanced around 16,16).
 * `eye` is the disc colour, so the eye reads as negative space cut into the white body.
 * Each glyph is a single body path plus at most two accent sub-paths (crest / tail / beak),
 * authored on an integer-ish grid so it stays crisp from 28px to 104px.
 */
function Species({ i, eye }: { i: number; eye: string }) {
  const s = ((i % BIRD_SPECIES_COUNT) + BIRD_SPECIES_COUNT) % BIRD_SPECIES_COUNT;

  // Shared body shapes, all centered on x=16.
  const bodyOval = (
    <ellipse cx="16" cy="17" rx="9.5" ry="8" fill={WHITE} opacity="0.97" />
  );
  const bodyRound = <circle cx="16" cy="16.5" r="8.5" fill={WHITE} opacity="0.97" />;
  const bodyUpright = (
    <ellipse cx="16" cy="17.5" rx="7" ry="9" fill={WHITE} opacity="0.97" />
  );
  const eyeDot = <circle cx="19.2" cy="14.6" r="1.45" fill={eye} />;
  const eyeDotHigh = <circle cx="19" cy="13.2" r="1.4" fill={eye} />;

  switch (s) {
    case 0: // Hoopoe — fanned 5-spike crest + long down-curved bill
      return (
        <g>
          {bodyOval}
          {[-22, -11, 0, 11, 22].map((deg, k) => (
            <g key={k} transform={`rotate(${deg} 16 11)`}>
              <rect x="15.1" y="1.5" width="1.8" height="9" rx="0.9" fill={WHITE} opacity="0.97" />
            </g>
          ))}
          <path d="M24 14.5 Q29.5 14 29 18.5 Q27 16.5 24 17.5 Z" fill={WHITE} opacity="0.97" />
          <path d="M6.5 19 L1.5 22 L4 17 Z" fill={WHITE} opacity="0.95" />
          {eyeDot}
        </g>
      );
    case 1: // Rose-ringed parakeet — hooked bill + longest tapering tail
      return (
        <g>
          <path d="M9 20 L0.5 27 L7 21.5 L5.5 18 Z" fill={WHITE} opacity="0.95" />
          {bodyOval}
          <path d="M24.5 14 Q29 14.5 28 17.5 Q26.5 18.5 24.5 17.5 Q27 16 24.5 15 Z" fill={WHITE} opacity="0.97" />
          {eyeDot}
        </g>
      );
    case 2: // Green bee-eater — slim body + two thin tail streamers + straight bill
      return (
        <g>
          <ellipse cx="16" cy="17" rx="9" ry="6.5" fill={WHITE} opacity="0.97" />
          <path d="M8 18 L1 22 L7 19.2 Z" fill={WHITE} opacity="0.95" />
          <path d="M8 19 L1.5 24.5 L7.5 20.5 Z" fill={WHITE} opacity="0.92" />
          <path d="M24.5 15.5 L31 16.4 L24.5 17.6 Z" fill={WHITE} opacity="0.97" />
          {eyeDot}
        </g>
      );
    case 3: // Purple sunbird — tiny round body + steeply down-curved thin bill
      return (
        <g>
          {bodyRound}
          <path d="M23.5 13.5 Q28 13 27 17 Q26 15.5 23.5 15.5 Z" fill={WHITE} opacity="0.97" />
          <path d="M8 18 L3 20.5 L7.5 18.8 Z" fill={WHITE} opacity="0.93" />
          {eyeDotHigh}
        </g>
      );
    case 4: // White-throated kingfisher — chunky body + oversized dagger bill + short tail
      return (
        <g>
          <ellipse cx="16" cy="17.5" rx="9" ry="8.5" fill={WHITE} opacity="0.97" />
          <path d="M7 20 L2.5 22 L6 18 Z" fill={WHITE} opacity="0.95" />
          <path d="M23 13.8 L31.5 16.5 L23 17.8 Z" fill={WHITE} opacity="0.97" />
          {eyeDotHigh}
        </g>
      );
    case 5: // Red-vented bulbul — rounded body + single pointed peak crest
      return (
        <g>
          {bodyOval}
          <path d="M16 9.5 L13.5 3.5 L17.5 8 Z" fill={WHITE} opacity="0.97" />
          <path d="M24.5 15 L29.5 16 L24.5 17.5 Z" fill={WHITE} opacity="0.97" />
          <path d="M7 19 L2 22 L6 18 Z" fill={WHITE} opacity="0.95" />
          {eyeDot}
        </g>
      );
    case 6: // Indian roller — broad-shouldered, squared head, short bill, stocky
      return (
        <g>
          <rect x="6.5" y="9.5" width="19" height="15" rx="7" fill={WHITE} opacity="0.97" />
          <path d="M25 15 L30 16 L25 17.5 Z" fill={WHITE} opacity="0.97" />
          <path d="M7 20 L2.5 22.5 L6.5 19 Z" fill={WHITE} opacity="0.95" />
          {eyeDot}
        </g>
      );
    case 7: // Drongo — sleek body + deeply forked tail
      return (
        <g>
          <ellipse cx="16.5" cy="17" rx="8.5" ry="6.5" fill={WHITE} opacity="0.97" />
          <path d="M9 18 L1 21 L7 19 L1 25 L8.5 20 Z" fill={WHITE} opacity="0.95" />
          <path d="M24 15.5 L29.5 16.5 L24 17.8 Z" fill={WHITE} opacity="0.97" />
          {eyeDot}
        </g>
      );
    case 8: // Coppersmith barbet — very round, stub bill, neckless ball
      return (
        <g>
          <circle cx="16" cy="16.5" r="9.2" fill={WHITE} opacity="0.97" />
          <path d="M24.8 15 L28.5 16.5 L24.8 18 Z" fill={WHITE} opacity="0.97" />
          {eyeDot}
        </g>
      );
    case 9: // Paradise flycatcher — crested head + single very long ribbon tail
      return (
        <g>
          <path d="M11 19 L0.5 26 L9 20.5 Z" fill={WHITE} opacity="0.94" />
          <ellipse cx="16.5" cy="17" rx="8" ry="6.5" fill={WHITE} opacity="0.97" />
          <path d="M17 9.5 L15.5 4 L19 8.5 Z" fill={WHITE} opacity="0.97" />
          <path d="M24.5 15 L29.5 16.2 L24.5 17.5 Z" fill={WHITE} opacity="0.97" />
          {eyeDot}
        </g>
      );
    case 10: // Indian peahen — long neck + small 3-dot head tuft
      return (
        <g>
          <ellipse cx="15" cy="19" rx="9" ry="7.5" fill={WHITE} opacity="0.97" />
          <path d="M19 17 Q22 11 21.5 6.5 L24 6.5 Q24.5 12 21.5 18 Z" fill={WHITE} opacity="0.97" />
          <circle cx="22.4" cy="4.6" r="1.1" fill={WHITE} opacity="0.97" />
          <circle cx="23.6" cy="3.3" r="1.1" fill={WHITE} opacity="0.97" />
          <circle cx="21.1" cy="3.5" r="1.1" fill={WHITE} opacity="0.97" />
          <circle cx="22.3" cy="8.4" r="1.3" fill={eye} />
          <path d="M6 20 L1.5 22.5 L6 19 Z" fill={WHITE} opacity="0.93" />
        </g>
      );
    case 11: // Tailorbird / warbler — smallest, cocked-up short tail, fine bill
      return (
        <g>
          <ellipse cx="16" cy="17.5" rx="7.5" ry="6.5" fill={WHITE} opacity="0.97" />
          <path d="M9 20 L4 17 L9.5 18.5 Z" fill={WHITE} opacity="0.95" />
          <path d="M24 15.5 L29 16.2 L24 17.3 Z" fill={WHITE} opacity="0.97" />
          {eyeDot}
        </g>
      );
    case 12: // Swift — slim, swept scimitar wing, forked tail
      return (
        <g>
          <ellipse cx="16" cy="17" rx="8.5" ry="5.5" fill={WHITE} opacity="0.97" />
          <path d="M16 13 Q8 6 4 9 Q11 11 14 16 Z" fill={WHITE} opacity="0.95" />
          <path d="M9 18 L2.5 21 L8.5 18.8 L3 23 L9.5 19.6 Z" fill={WHITE} opacity="0.94" />
          <path d="M24 15.5 L29 16.3 L24 17.4 Z" fill={WHITE} opacity="0.97" />
          {eyeDot}
        </g>
      );
    case 13: // Lapwing — round body + two thin head plumes
      return (
        <g>
          {bodyOval}
          <path d="M15 9.5 Q12.5 5 9.5 4.5 Q12 7 13.5 10 Z" fill={WHITE} opacity="0.96" />
          <path d="M24.5 15 L29.5 16 L24.5 17.5 Z" fill={WHITE} opacity="0.97" />
          <path d="M7 19.5 L2.5 22 L6.5 18.8 Z" fill={WHITE} opacity="0.95" />
          {eyeDot}
        </g>
      );
    case 14: // Owlet — upright, broad head, two ear tufts, big eyes
      return (
        <g>
          {bodyUpright}
          <path d="M11 11 L10 6 L13.5 9.5 Z" fill={WHITE} opacity="0.97" />
          <path d="M21 11 L22 6 L18.5 9.5 Z" fill={WHITE} opacity="0.97" />
          <circle cx="13.2" cy="14.5" r="1.6" fill={eye} />
          <circle cx="18.8" cy="14.5" r="1.6" fill={eye} />
          <path d="M14.6 16.5 L17.4 16.5 L16 18.6 Z" fill={eye} />
        </g>
      );
    default: // 15: Munia / finch — small round body, stubby conical bill, perched
      return (
        <g>
          <ellipse cx="16" cy="17" rx="8" ry="7.5" fill={WHITE} opacity="0.97" />
          <path d="M24.6 14.8 L29 16.5 L24.6 18.2 Z" fill={WHITE} opacity="0.97" />
          <path d="M8 20 L3.5 18 L8.5 19 Z" fill={WHITE} opacity="0.94" />
          {eyeDot}
        </g>
      );
  }
}

/** Pose transform applied to the whole glyph: mirror, crest/tail lift, both, or none. */
function poseTransform(pose: number): string | undefined {
  switch (((pose % BIRD_POSE_COUNT) + BIRD_POSE_COUNT) % BIRD_POSE_COUNT) {
    case 1:
      return "rotate(-7 16 16)"; // slight crest/tail lift
    case 2:
      return "translate(32 0) scale(-1 1)"; // mirror, face the other way
    case 3:
      return "translate(32 0) scale(-1 1) rotate(7 16 16)"; // mirror + lift
    default:
      return undefined;
  }
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
        role="img"
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
  const glyph = Math.round(px * 0.66);

  return (
    <span
      className={`${base} ${className}`}
      style={{
        width: px,
        height: px,
        background: `linear-gradient(180deg, color-mix(in srgb, ${color} 92%, #fff), color-mix(in srgb, ${color} 92%, #000))`,
        ...ringStyle,
      }}
      aria-label={user.name ?? "Member"}
      role="img"
    >
      <svg width={glyph} height={glyph} viewBox="0 0 32 32" fill="none" aria-hidden>
        <g transform={poseTransform(bird.pose)}>
          <Species i={species} eye={color} />
        </g>
      </svg>
      {!user.name ? null : <span className="sr-only">{getInitials(user.name)}</span>}
    </span>
  );
}
