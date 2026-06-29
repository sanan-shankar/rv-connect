import { getInitials } from "@/lib/utils";
import { birdFor, BIRD_SPECIES_COUNT, BIRD_POSE_COUNT, SPECIES_PINS } from "@/lib/avatar";
import { BirdGlyphV2, BG_MODE } from "@/components/common/bird-avatar-v2";

/**
 * Render the Rishi Valley colour bird set (v2). Flip to `false` to fall back to the legacy
 * mono-white silhouettes. The bird's background treatment is controlled by BG_MODE in
 * bird-avatar-v2.tsx ("none" = no disc, the chosen look).
 */
const USE_V2 = true;

/**
 * BirdAvatar - the default identity mark across the app.
 *
 * Precedence: uploaded photo > manual (avatarColor/avatarSpecies) > deterministic bird from id.
 * Server-renderable (no hooks). 52 species x 10 disc colours x 4 poses = 2080 distinct birds,
 * selected by a salted FNV-1a hash of the user id so the distribution is even and the axes do
 * not correlate. Every silhouette is an off-white fill CENTERED in the disc (viewBox 0..32,
 * visual mass balanced around 16,16) with a negative-space eye punched in the disc colour.
 *
 * House style (so 52 birds feel like one family, yet each is its own creature):
 *   - One off-white fill (#FBFBF8). No strokes. Subtle opacity drops on wings/tails read as soft
 *     tonal separation, never a second colour.
 *   - Plump, rounded bodies and a big forward eye = cute at 28px.
 *   - Each species carries ONE dominant gesture (crest / beak / tail / posture / neck) so it is
 *     distinguishable from every other at a glance, not a feature-toggle of a shared base.
 *   - Mass kept inside ~radius 13 of centre; long tails/beaks are balanced by offsetting the body
 *     so the centroid stays at 16,16 (no bottom-hanging, no left/right drift).
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
 * One species silhouette, centered in a 0..32 viewBox (visual mass balanced around 16,16).
 * `eye` is the disc colour, so the eye reads as negative space cut into the white body.
 */
function Species({ i, eye }: { i: number; eye: string }) {
  const s = ((i % BIRD_SPECIES_COUNT) + BIRD_SPECIES_COUNT) % BIRD_SPECIES_COUNT;
  const W = WHITE;
  const Eye = ({ cx, cy, r = 1.5 }: { cx: number; cy: number; r?: number }) => (
    <circle cx={cx} cy={cy} r={r} fill={eye} />
  );

  switch (s) {
    case 0: // Hoopoe — big fanned crest + long down-curved bill
      return (
        <g>
          <ellipse cx="15.5" cy="18.5" rx="8.3" ry="7.3" fill={W} opacity="0.97" />
          {[-34, -17, 0, 17, 34].map((d, k) => (
            <g key={k} transform={`rotate(${d} 16 13)`}>
              <rect x="14.9" y="1.5" width="2.1" height="11.5" rx="1.05" fill={W} opacity="0.97" />
              <circle cx="15.95" cy="2.6" r="1.3" fill={W} opacity="0.97" />
            </g>
          ))}
          <path d="M23 15.5 Q29.5 15.2 29 19.5 Q26.8 17 23 18 Z" fill={W} opacity="0.97" />
          <path d="M7.6 20.5 L2.2 23.5 L5.2 18.8 Z" fill={W} opacity="0.94" />
          <Eye cx={18.8} cy={15.4} />
        </g>
      );
    case 1: // Rose-ringed parakeet — hooked bill + long tapering tail
      return (
        <g>
          <path d="M10 21 L1 28 L8 22 L6.5 18.5 Z" fill={W} opacity="0.95" />
          <ellipse cx="17" cy="16.5" rx="8" ry="7.5" fill={W} opacity="0.97" />
          <path d="M24.5 13.5 Q29.5 14 28.5 17.8 Q26.8 19 24.5 18 Q27.4 16.4 24.5 15 Z" fill={W} opacity="0.97" />
          <Eye cx={20.5} cy={14} />
        </g>
      );
    case 2: // Green bee-eater — slim body + twin tail streamers + thin straight bill
      return (
        <g>
          <ellipse cx="16" cy="16.5" rx="9" ry="6" fill={W} opacity="0.97" />
          <path d="M8 17.5 L0.5 20.5 L7 18.6 Z" fill={W} opacity="0.95" />
          <path d="M8 18.5 L1 24 L7.5 20 Z" fill={W} opacity="0.9" />
          <path d="M24.5 14.7 L31.5 16 L24.5 17.3 Z" fill={W} opacity="0.97" />
          <Eye cx={20} cy={14.6} />
        </g>
      );
    case 3: // Purple sunbird — tiny round body + steeply down-curved thin bill, upright
      return (
        <g>
          <ellipse cx="15.5" cy="17.5" rx="6.8" ry="7.4" fill={W} opacity="0.97" />
          <path d="M21.5 12.5 Q27 11.5 25.6 16.5 Q24.6 14 21.6 14.5 Z" fill={W} opacity="0.97" />
          <path d="M10 22 L6 24.5 L9.5 20.5 Z" fill={W} opacity="0.92" />
          <Eye cx={18.4} cy={13.6} r={1.4} />
        </g>
      );
    case 4: // White-throated kingfisher — chunky body + oversized dagger bill + short tail
      return (
        <g>
          <ellipse cx="15" cy="17.5" rx="8.5" ry="8.5" fill={W} opacity="0.97" />
          <path d="M6.5 21 L2.5 23 L6 18.5 Z" fill={W} opacity="0.94" />
          <path d="M22 12.6 L31.8 16 L22 18 Z" fill={W} opacity="0.97" />
          <Eye cx={18.4} cy={13.6} />
        </g>
      );
    case 5: // Red-vented bulbul — rounded body + single pointed peak crest
      return (
        <g>
          <ellipse cx="16" cy="17.5" rx="8.2" ry="7.5" fill={W} opacity="0.97" />
          <path d="M15 11 L12 4 L18 9.5 Z" fill={W} opacity="0.97" />
          <path d="M24 15 L29.5 16 L24 17.6 Z" fill={W} opacity="0.97" />
          <path d="M7.5 20 L2.5 23 L6.5 18.6 Z" fill={W} opacity="0.94" />
          <Eye cx={19} cy={14.6} />
        </g>
      );
    case 6: // Indian roller — broad-shouldered, squared head, short bill, stocky
      return (
        <g>
          <rect x="6" y="9.5" width="20" height="16" rx="7.5" fill={W} opacity="0.97" />
          <path d="M25.5 14.5 L30.5 16 L25.5 17.6 Z" fill={W} opacity="0.97" />
          <Eye cx={20} cy={14.6} />
        </g>
      );
    case 7: // Drongo — sleek body + deeply forked tail
      return (
        <g>
          <ellipse cx="17" cy="16.5" rx="8" ry="6.2" fill={W} opacity="0.97" />
          <path d="M10 17.5 L1 20 L8 18.3 L1.5 25 L9.5 19.6 Z" fill={W} opacity="0.95" />
          <path d="M24.5 14.6 L30 16 L24.5 17.4 Z" fill={W} opacity="0.97" />
          <Eye cx={20.5} cy={14.4} />
        </g>
      );
    case 8: // Coppersmith barbet — very round ball + stub bill
      return (
        <g>
          <circle cx="15.5" cy="16.5" r="9" fill={W} opacity="0.97" />
          <path d="M24 15 L28 16.5 L24 18 Z" fill={W} opacity="0.97" />
          <Eye cx={19} cy={14} />
        </g>
      );
    case 9: // Paradise flycatcher — crested head + single long ribbon tail
      return (
        <g>
          <path d="M12 19 L1 27 L10 20.5 Z" fill={W} opacity="0.93" />
          <ellipse cx="17" cy="16.5" rx="7.5" ry="6.2" fill={W} opacity="0.97" />
          <path d="M17 10.5 L15 4.5 L19 9.5 Z" fill={W} opacity="0.97" />
          <path d="M24.5 14.8 L30 16 L24.5 17.3 Z" fill={W} opacity="0.97" />
          <Eye cx={20.5} cy={14.2} />
        </g>
      );
    case 10: // Indian peahen — long neck + small 3-dot head tuft
      return (
        <g>
          <ellipse cx="14" cy="19.5" rx="8.5" ry="7" fill={W} opacity="0.97" />
          <path d="M17 18 Q20.5 11.5 20 7 L22.6 7 Q23.2 12.5 19.5 19 Z" fill={W} opacity="0.97" />
          <circle cx="21.2" cy="5.4" r="1.05" fill={W} opacity="0.97" />
          <circle cx="22.4" cy="4.2" r="1.05" fill={W} opacity="0.97" />
          <circle cx="19.9" cy="4.3" r="1.05" fill={W} opacity="0.97" />
          <Eye cx={21} cy={9} r={1.3} />
          <path d="M6 21 L1.5 23.5 L6 20 Z" fill={W} opacity="0.92" />
        </g>
      );
    case 11: // Tailorbird — tiny, cocked-up short tail, fine bill
      return (
        <g>
          <ellipse cx="15.5" cy="18" rx="7" ry="6.5" fill={W} opacity="0.97" />
          <path d="M9 21 L5 13.5 L10.5 19 Z" fill={W} opacity="0.95" />
          <path d="M23.5 15.2 L29 16 L23.5 17.2 Z" fill={W} opacity="0.97" />
          <Eye cx={19} cy={15} />
        </g>
      );
    case 12: // Swift — slim body + long swept-back wings (crescent) + forked tail
      return (
        <g>
          <path d="M16 13 Q6 12 1.8 17.5 Q8 15 13.5 16.4 L16 16 L18.5 16.4 Q24 15 30.2 17.5 Q26 12 16 13 Z" fill={W} opacity="0.93" />
          <ellipse cx="16" cy="16" rx="4.2" ry="3.4" fill={W} opacity="0.97" />
          <path d="M13.5 17.5 L10.5 23 L16 18.8 L21.5 23 L18.5 17.5 Z" fill={W} opacity="0.92" />
          <Eye cx={17.6} cy={14.7} r={1.4} />
        </g>
      );
    case 13: // Lapwing — round body + two thin head plumes swept back
      return (
        <g>
          <ellipse cx="16.5" cy="18" rx="8" ry="7" fill={W} opacity="0.97" />
          <path d="M15 11.5 Q10.5 6 6.5 5 Q10 8.5 12.5 12 Z" fill={W} opacity="0.95" />
          <path d="M24.5 15 L29.5 16 L24.5 17.5 Z" fill={W} opacity="0.97" />
          <path d="M8 20.5 L3.5 23 L7.5 19.6 Z" fill={W} opacity="0.93" />
          <Eye cx={19.6} cy={15} />
        </g>
      );
    case 14: // Owl — upright, broad head, two ear tufts, two big eyes
      return (
        <g>
          <ellipse cx="16" cy="18.5" rx="8" ry="9" fill={W} opacity="0.97" />
          <path d="M10.5 11 L9 5 L13.5 9.5 Z" fill={W} opacity="0.97" />
          <path d="M21.5 11 L23 5 L18.5 9.5 Z" fill={W} opacity="0.97" />
          <Eye cx={12.8} cy={15} r={1.9} />
          <Eye cx={19.2} cy={15} r={1.9} />
          <path d="M14.6 17.5 L17.4 17.5 L16 19.8 Z" fill={eye} />
        </g>
      );
    case 15: // Munia / finch — round body + thick conical seed bill
      return (
        <g>
          <ellipse cx="15" cy="17.5" rx="8" ry="7.4" fill={W} opacity="0.97" />
          <path d="M22.5 13.2 L30.5 16.4 L22.5 19.6 Z" fill={W} opacity="0.97" />
          <path d="M7.5 20.5 L3 18.6 L8 19.5 Z" fill={W} opacity="0.93" />
          <Eye cx={18.4} cy={14.6} />
        </g>
      );
    case 16: // Owlet — round, two big eyes, tiny beak (no ear tufts)
      return (
        <g>
          <ellipse cx="16" cy="17.5" rx="8.5" ry="8.5" fill={W} opacity="0.97" />
          <Eye cx={12.8} cy={15.5} r={2} />
          <Eye cx={19.2} cy={15.5} r={2} />
          <path d="M14.7 18 L17.3 18 L16 20 Z" fill={eye} />
        </g>
      );
    case 17: // Duck — plump body + flat broad bill + small upturned tail
      return (
        <g>
          <path d="M8 18 L2.5 16.5 L8 20 Z" fill={W} opacity="0.94" />
          <ellipse cx="16" cy="18.5" rx="9" ry="6.5" fill={W} opacity="0.97" />
          <circle cx="21.5" cy="13.5" r="5" fill={W} opacity="0.97" />
          <path d="M25 12.5 Q31 12.2 31 15.2 Q31 16.4 25 15.8 Z" fill={W} opacity="0.95" />
          <Eye cx={22.6} cy={12.4} r={1.3} />
        </g>
      );
    case 18: // Swan — round body + tall S-curved neck + small bill
      return (
        <g>
          <ellipse cx="14.5" cy="20" rx="8.5" ry="6" fill={W} opacity="0.97" />
          <path d="M18.5 21 Q14.5 14 18 9 Q21.5 5 24.5 7.5 Q21 7 19.5 11 Q17.5 15.5 21.5 20.5 Z" fill={W} opacity="0.97" />
          <path d="M24.5 7 L28 8.5 L24.5 9.2 Z" fill={W} opacity="0.95" />
          <path d="M6 21 L1.5 22.5 L6.5 20 Z" fill={W} opacity="0.92" />
          <Eye cx={22.6} cy={8.4} r={1.2} />
        </g>
      );
    case 19: // Flamingo — slender body + long curved neck + hooked bill (no legs)
      return (
        <g>
          <ellipse cx="13.5" cy="19" rx="7.8" ry="5.6" fill={W} opacity="0.97" />
          <path d="M16 17 Q22 15.5 22.5 10 Q23 6 19.5 6 Q24 6.5 24 10.5 Q23.5 15 18.5 18 Z" fill={W} opacity="0.97" />
          <path d="M19.6 6 Q16.6 5.6 17.6 8.4 Q18.8 7.2 20 7.8 Z" fill={W} opacity="0.96" />
          <path d="M7 20 L2.5 21.5 L7.5 18.6 Z" fill={W} opacity="0.92" />
          <Eye cx={21} cy={8} r={1.15} />
        </g>
      );
    case 20: // Peacock — small body + raised fan of tail eyes
      return (
        <g>
          <path d="M16 18 A11 11 0 0 1 5.2 13" fill="none" />
          {[-58, -38, -19, 0, 19, 38, 58].map((d, k) => (
            <g key={k} transform={`rotate(${d} 16 19)`}>
              <circle cx="16" cy="6.5" r="1.7" fill={W} opacity="0.95" />
              <rect x="15.4" y="8" width="1.2" height="5" fill={W} opacity="0.6" />
            </g>
          ))}
          <ellipse cx="16" cy="20.5" rx="5" ry="5.5" fill={W} opacity="0.97" />
          <path d="M16 15.5 L15 11.5 L17 11.5 Z" fill={W} opacity="0.95" />
          <circle cx="15.4" cy="10.6" r="0.9" fill={W} opacity="0.95" />
          <Eye cx={17.4} cy={19.5} r={1.2} />
        </g>
      );
    case 21: // Rooster — comb + wattle + arched sickle tail
      return (
        <g>
          <path d="M9 22 Q4 20 3 13 Q6 17 9.5 17 Q6.5 19.5 11 22 Z" fill={W} opacity="0.95" />
          <ellipse cx="16.5" cy="19" rx="7.5" ry="6.5" fill={W} opacity="0.97" />
          <circle cx="20.5" cy="13.5" r="4.3" fill={W} opacity="0.97" />
          <path d="M17 10 Q18.5 7.5 20 9.5 Q21.5 7 23 9.5 Q24.5 8 25 10.5 L17.5 11 Z" fill={W} opacity="0.96" />
          <path d="M24 12 L26 16 L23.5 15 Z" fill={W} opacity="0.97" />
          <path d="M20 17.5 Q22 19.5 21 21.5 Z" fill={W} opacity="0.9" />
          <Eye cx={22} cy={12.8} r={1.2} />
        </g>
      );
    case 22: // Hen — plump body + small comb + short perky tail
      return (
        <g>
          <path d="M8.5 17 L4 13.5 L9 16 Z" fill={W} opacity="0.94" />
          <ellipse cx="16.5" cy="19" rx="8" ry="6.5" fill={W} opacity="0.97" />
          <circle cx="20.5" cy="14" r="4.3" fill={W} opacity="0.97" />
          <path d="M18 10 Q19 8.5 20 10 Q21 8.5 22 10 L22.5 11 L18 11 Z" fill={W} opacity="0.96" />
          <path d="M24 14 L27 15.5 L24 16.5 Z" fill={W} opacity="0.96" />
          <Eye cx={22} cy={13.2} r={1.2} />
        </g>
      );
    case 23: // Penguin — upright body + flippers + little feet
      return (
        <g>
          <ellipse cx="16" cy="17" rx="7.5" ry="10" fill={W} opacity="0.97" />
          <path d="M9 15 Q5.5 19 8 24 Q9.5 20 10.5 18 Z" fill={W} opacity="0.92" />
          <path d="M23 15 Q26.5 19 24 24 Q22.5 20 21.5 18 Z" fill={W} opacity="0.92" />
          <path d="M13 26.5 L11 29 L15 27.5 Z" fill={W} opacity="0.9" />
          <path d="M19 26.5 L21 29 L17 27.5 Z" fill={W} opacity="0.9" />
          <path d="M16 11.5 L13.5 13.5 L18.5 13.5 Z" fill={eye} opacity="0.9" />
          <Eye cx={13.6} cy={10} r={1.3} />
          <Eye cx={18.4} cy={10} r={1.3} />
        </g>
      );
    case 24: // Pelican — big body + long bill with throat pouch
      return (
        <g>
          <ellipse cx="14" cy="18.5" rx="8.5" ry="7" fill={W} opacity="0.97" />
          <circle cx="20" cy="12.5" r="4.2" fill={W} opacity="0.97" />
          <path d="M22.5 11 Q30 11 30 14 L24 16 Q22 18 22 14.5 Z" fill={W} opacity="0.95" />
          <path d="M6 20 L1.5 21.5 L6.5 19 Z" fill={W} opacity="0.92" />
          <Eye cx={21.2} cy={11.6} r={1.2} />
        </g>
      );
    case 25: // Stork — body + upright neck + long straight bill (no legs)
      return (
        <g>
          <ellipse cx="13.5" cy="19" rx="7.8" ry="5.6" fill={W} opacity="0.97" />
          <path d="M16 16 Q18 10 17.5 8 L19.5 8 Q20 11 18.5 16.5 Z" fill={W} opacity="0.97" />
          <path d="M19 7.5 L28.5 8.6 L19 9.8 Z" fill={W} opacity="0.96" />
          <path d="M7 20 L2.5 21.5 L7.5 18.6 Z" fill={W} opacity="0.92" />
          <Eye cx={18} cy={8.6} r={1.15} />
        </g>
      );
    case 26: // Crane — body + long neck + single head plume (no legs)
      return (
        <g>
          <ellipse cx="13.5" cy="19" rx="7.8" ry="5.4" fill={W} opacity="0.97" />
          <path d="M16 16.5 Q19 10.5 18.5 8 L20.5 8 Q21 11.5 18.5 17 Z" fill={W} opacity="0.97" />
          <path d="M19.5 7.5 Q23 5 25 6.5 Q22 6.5 20.5 9 Z" fill={W} opacity="0.95" />
          <path d="M20.5 7.5 L25.5 8.5 L20.5 9.5 Z" fill={W} opacity="0.96" />
          <Eye cx={19.4} cy={8.5} r={1.1} />
        </g>
      );
    case 27: // Heron — body + tucked S-neck + dagger bill (no legs)
      return (
        <g>
          <ellipse cx="15" cy="19" rx="8" ry="5.8" fill={W} opacity="0.97" />
          <path d="M18 16 Q15.5 12 18.5 9.5 Q21 7.5 21.5 10.5 Q19 10 18.5 13 Q18 15.5 20.5 16.5 Z" fill={W} opacity="0.97" />
          <path d="M21 9 L30 11 L21 12 Z" fill={W} opacity="0.96" />
          <path d="M7.5 20.5 L3 22 L7.8 19.2 Z" fill={W} opacity="0.92" />
          <Eye cx={20.4} cy={10.4} r={1.1} />
        </g>
      );
    case 28: // Hornbill — heavy down-curved bill + casque
      return (
        <g>
          <ellipse cx="14" cy="18" rx="8" ry="7" fill={W} opacity="0.97" />
          <path d="M19 13 Q31 12 30 18 Q27 16.5 21 16.5 Q19.5 15 19 13 Z" fill={W} opacity="0.97" />
          <path d="M20 12.5 Q28 10.5 28.5 13 Q24 12.5 21 13.5 Z" fill={W} opacity="0.95" />
          <path d="M6.5 20 L2 21.5 L6.5 18.8 Z" fill={W} opacity="0.92" />
          <Eye cx={18.6} cy={14} r={1.2} />
        </g>
      );
    case 29: // Toucan — round body + oversized down-curved bill
      return (
        <g>
          <ellipse cx="13.5" cy="18" rx="8" ry="7.5" fill={W} opacity="0.97" />
          <path d="M18 13 Q31 12.5 28.5 19 Q25 16.8 19.5 17 Q18 15 18 13 Z" fill={W} opacity="0.97" />
          <path d="M7 21 L2.5 23 L6.5 19.5 Z" fill={W} opacity="0.93" />
          <Eye cx={17} cy={14} r={1.3} />
        </g>
      );
    case 30: // Woodpecker — upright on a trunk, chisel bill, stiff propped tail
      return (
        <g>
          <ellipse cx="16" cy="16.5" rx="6.5" ry="9" fill={W} opacity="0.97" />
          <path d="M13.5 23 L11 30 L15.5 25 Z" fill={W} opacity="0.94" />
          <path d="M14 8 L11 4.5 L15.5 7 Z" fill={W} opacity="0.96" />
          <path d="M21.5 12.5 L29 14 L21.5 15.5 Z" fill={W} opacity="0.97" />
          <Eye cx={18.5} cy={12} r={1.4} />
        </g>
      );
    case 31: // Hummingbird — needle bill + tiny body + flicked wing
      return (
        <g>
          <ellipse cx="15" cy="18" rx="6" ry="5" fill={W} opacity="0.97" />
          <path d="M13 16 Q6 9 2 11 Q8 13 11 18 Z" fill={W} opacity="0.9" />
          <path d="M19.5 14.6 L31 16 L19.5 17.4 Z" fill={W} opacity="0.96" />
          <path d="M10 21 L6.5 24 L9.5 20 Z" fill={W} opacity="0.9" />
          <Eye cx={17.4} cy={16.4} r={1.3} />
        </g>
      );
    case 32: // Dove — plump body + small round head + tapered tail (gentle)
      return (
        <g>
          <path d="M9 19 L1.8 22 L8.5 20 Z" fill={W} opacity="0.93" />
          <ellipse cx="16" cy="18.5" rx="7.6" ry="6" fill={W} opacity="0.97" />
          <circle cx="20.5" cy="13.8" r="4.3" fill={W} opacity="0.97" />
          <path d="M24.2 13.4 L27.4 14.6 L24.2 15.6 Z" fill={W} opacity="0.96" />
          <Eye cx={21.6} cy={13} r={1.3} />
        </g>
      );
    case 33: // Sparrow — chunky body + stout conical bill + short cocked tail
      return (
        <g>
          <path d="M9 20 L4 14.5 L10 18 Z" fill={W} opacity="0.94" />
          <ellipse cx="15.5" cy="18.5" rx="7.5" ry="6.8" fill={W} opacity="0.97" />
          <path d="M23 14.8 L28 16.2 L23 17.6 Z" fill={W} opacity="0.97" />
          <Eye cx={19} cy={15} />
        </g>
      );
    case 34: // Robin — upright rounded belly + fine pointed bill + perky tail
      return (
        <g>
          <path d="M9.5 22 L5.2 22.8 L10 18.5 Z" fill={W} opacity="0.93" />
          <ellipse cx="16" cy="17.5" rx="6.9" ry="8" fill={W} opacity="0.97" />
          <path d="M22.5 14.5 L28.5 15.4 L22.5 16.6 Z" fill={W} opacity="0.97" />
          <Eye cx={19} cy={13.6} />
        </g>
      );
    case 35: // Swallow — sleek body + pointed swept wings + deeply forked tail
      return (
        <g>
          <ellipse cx="17" cy="16.5" rx="7" ry="4.6" fill={W} opacity="0.97" />
          <path d="M16 14 Q9 7 4 9 Q11 11 14 16 Z" fill={W} opacity="0.93" />
          <path d="M11 17.5 L2 19 L9.5 18.5 L2.5 23 L10.5 19.6 Z" fill={W} opacity="0.94" />
          <path d="M24 14.8 L29.5 16 L24 17.2 Z" fill={W} opacity="0.97" />
          <Eye cx={20.5} cy={15} />
        </g>
      );
    case 36: // Magpie — compact body + very long graduated tail
      return (
        <g>
          <path d="M9 19 L0.5 23.5 L8.5 20.5 L1.5 26.5 L9.5 21.5 Z" fill={W} opacity="0.94" />
          <ellipse cx="17.5" cy="16.5" rx="7" ry="6" fill={W} opacity="0.97" />
          <path d="M24.5 14.8 L30 16 L24.5 17.3 Z" fill={W} opacity="0.97" />
          <Eye cx={21} cy={14.4} />
        </g>
      );
    case 37: // Cockatiel — tall recurved wispy crest + round cheek
      return (
        <g>
          <ellipse cx="16" cy="18.5" rx="7.5" ry="7" fill={W} opacity="0.97" />
          <path d="M14 12 Q12 4 16.5 2 Q15 5 16.5 11 Z" fill={W} opacity="0.97" />
          <path d="M16 11.5 Q15 5 18.5 3.5 Q17.5 6 18 11.5 Z" fill={W} opacity="0.95" />
          <path d="M23.5 15.5 Q27.5 15.2 27 18 Q25.5 16.6 23.5 17.2 Z" fill={W} opacity="0.97" />
          <path d="M8 21 L3.5 23 L7.5 19.6 Z" fill={W} opacity="0.92" />
          <Eye cx={19} cy={15} />
        </g>
      );
    case 38: // Cardinal — tall pointed triangular crest + stout body
      return (
        <g>
          <ellipse cx="16" cy="18.5" rx="7.5" ry="7" fill={W} opacity="0.97" />
          <path d="M16.5 12 L11.5 3 L20 9.5 Z" fill={W} opacity="0.97" />
          <path d="M23.5 15.5 L28.5 16.6 L23.5 17.8 Z" fill={W} opacity="0.97" />
          <path d="M8.5 21 L4 23 L8 19.6 Z" fill={W} opacity="0.92" />
          <Eye cx={19} cy={15.4} />
        </g>
      );
    case 39: // Wagtail — slim horizontal body + very long flat tail
      return (
        <g>
          <ellipse cx="18" cy="16" rx="6.5" ry="4.6" fill={W} opacity="0.97" />
          <path d="M13 17 L1 21.5 L12.5 18.5 Z" fill={W} opacity="0.95" />
          <path d="M24 14.5 L29 15.6 L24 16.8 Z" fill={W} opacity="0.97" />
          <Eye cx={21} cy={14.2} />
        </g>
      );
    case 40: // Spoonbill — body + neck + long bill ending in a flat spatula
      return (
        <g>
          <ellipse cx="13.5" cy="19" rx="7.8" ry="5.4" fill={W} opacity="0.97" />
          <path d="M16 16.5 Q18.4 11.5 18 9 L20 9 Q20.4 12 18.5 17 Z" fill={W} opacity="0.97" />
          <path d="M19.2 8.6 L25.5 9 Q29.5 8.7 29.5 10.2 Q29.5 11.7 25.5 11.2 L19.2 10.8 Z" fill={W} opacity="0.96" />
          <path d="M7 20 L2.6 21.5 L7.6 18.7 Z" fill={W} opacity="0.92" />
          <Eye cx={18.5} cy={9.6} r={1.1} />
        </g>
      );
    case 41: // Avocet — slim elegant body + long thin upturned bill
      return (
        <g>
          <ellipse cx="14.5" cy="19" rx="7.6" ry="5.2" fill={W} opacity="0.97" />
          <path d="M16.5 16 Q19 11 18.5 8.5 L20.3 8.5 Q20.7 12 18.6 16.5 Z" fill={W} opacity="0.97" />
          <path d="M20 9 Q26 7.2 29 4 Q27 8 20.6 10.4 Z" fill={W} opacity="0.95" />
          <path d="M7.5 20 L3 21.5 L7.8 18.7 Z" fill={W} opacity="0.92" />
          <Eye cx={19.2} cy={9.4} r={1.1} />
        </g>
      );
    case 42: // Eagle — stout perched raptor + heavy hooked beak + fierce brow
      return (
        <g>
          <ellipse cx="15.5" cy="18.5" rx="7.6" ry="7.6" fill={W} opacity="0.97" />
          <path d="M9 15 Q5.5 17.5 7 22 Q9 18.5 10.5 17.5 Z" fill={W} opacity="0.9" />
          <path d="M15.5 11.8 L22.5 12.2 L22 14.4 L16 14.6 Z" fill={W} opacity="0.97" />
          <path d="M22 13.6 Q26.8 13.4 25.4 17 Q24.2 14.9 21.8 15.4 Z" fill={W} opacity="0.97" />
          <path d="M13 25 L19 25 L16 27.6 Z" fill={W} opacity="0.93" />
          <Eye cx={19.4} cy={14} r={1.25} />
        </g>
      );
    case 43: // Falcon — sleek upright body + swept-back pointed wing + hooked beak
      return (
        <g>
          <ellipse cx="16" cy="17.5" rx="5.9" ry="7.8" fill={W} opacity="0.97" />
          <path d="M13.5 13 Q6.5 15.5 4.5 22 Q11 17.5 14.5 16.8 Z" fill={W} opacity="0.9" />
          <path d="M21 13 Q24.6 13 23.6 15.8 Q22.5 14.2 21 14.6 Z" fill={W} opacity="0.96" />
          <path d="M14 25 L18 25 L16 28.5 Z" fill={W} opacity="0.93" />
          <Eye cx={18.4} cy={12.8} r={1.3} />
        </g>
      );
    case 44: // Kite — raptor head + long deeply forked tail
      return (
        <g>
          <ellipse cx="16.5" cy="16" rx="7" ry="5.5" fill={W} opacity="0.97" />
          <path d="M16 13 Q9 9 5 12 Q11 12 14 15.5 Z" fill={W} opacity="0.92" />
          <path d="M14 18.5 L7 27 L15 20.5 L9 27.5 L16 20 Z" fill={W} opacity="0.93" />
          <path d="M23 14 Q26.5 14 25.5 16.6 Q24.5 15.2 23 15.4 Z" fill={W} opacity="0.96" />
          <Eye cx={20} cy={14} r={1.3} />
        </g>
      );
    case 45: // Goose — chunky body + straight long neck + stout bill
      return (
        <g>
          <ellipse cx="13.5" cy="19.5" rx="8.5" ry="6" fill={W} opacity="0.97" />
          <path d="M16 16 Q19 10 18.5 7 L21 7 Q21.5 11 18.5 16.5 Z" fill={W} opacity="0.97" />
          <path d="M21 6.5 L25.5 7.8 L21 9 Z" fill={W} opacity="0.96" />
          <path d="M6 21 L1.5 22.5 L6.5 20 Z" fill={W} opacity="0.92" />
          <Eye cx={19.6} cy={8} r={1.2} />
        </g>
      );
    case 46: // Moorhen — round body + frontal shield (forehead bump) + small bill
      return (
        <g>
          <ellipse cx="15.5" cy="18.5" rx="8" ry="7" fill={W} opacity="0.97" />
          <path d="M19.5 13.5 Q20 9.5 22 9.8 Q23 12 22.5 14 Z" fill={W} opacity="0.96" />
          <path d="M23 13 L27 14.2 L23 15.4 Z" fill={W} opacity="0.96" />
          <path d="M8 21 L3.5 23 L7.5 19.6 Z" fill={W} opacity="0.92" />
          <Eye cx={20.4} cy={13.6} r={1.3} />
        </g>
      );
    case 47: // Quail — very round + tiny + teardrop top-knot
      return (
        <g>
          <ellipse cx="16" cy="19" rx="8.5" ry="6.5" fill={W} opacity="0.97" />
          <path d="M14 13 Q13 7 16 6 Q16.5 9 16.5 12.5 Z" fill={W} opacity="0.96" />
          <circle cx="13.6" cy="6.3" r="1.4" fill={W} opacity="0.96" />
          <path d="M23 16 L27.5 17 L23 18.2 Z" fill={W} opacity="0.96" />
          <path d="M8.5 21.5 L4.5 19.8 L9 20.6 Z" fill={W} opacity="0.92" />
          <Eye cx={19} cy={16} />
        </g>
      );
    case 48: // Puffin — upright chunky body + big triangular bill
      return (
        <g>
          <ellipse cx="15.5" cy="18" rx="7" ry="8.4" fill={W} opacity="0.97" />
          <path d="M9.5 16 Q6.5 19 8.5 23 Q10 19.5 11 18.5 Z" fill={W} opacity="0.9" />
          <path d="M20.5 11.8 L29.5 15.5 L20.5 19 Z" fill={W} opacity="0.97" />
          <Eye cx={18.4} cy={13.4} r={1.4} />
        </g>
      );
    case 49: // Kiwi — round body + very long thin straight bill (no legs)
      return (
        <g>
          <ellipse cx="14.5" cy="17.5" rx="9" ry="7.8" fill={W} opacity="0.97" />
          <path d="M22 14.8 L31 15.8 L22 17.2 Z" fill={W} opacity="0.96" />
          <Eye cx={18} cy={14.6} r={1.3} />
        </g>
      );
    case 50: // Cockatoo — big recurved sweeping crest + heavy body
      return (
        <g>
          <ellipse cx="16.5" cy="19" rx="7.5" ry="7" fill={W} opacity="0.97" />
          <path d="M13 13 Q9 3 15 1 Q12.5 5 14.5 12 Z" fill={W} opacity="0.97" />
          <path d="M15 12 Q12 2.5 18 1.5 Q15.5 5 16.5 12 Z" fill={W} opacity="0.94" />
          <path d="M17 12 Q15 3 20.5 3 Q17.5 6 18.5 12.5 Z" fill={W} opacity="0.9" />
          <path d="M23.5 16 L28 16.5 Q26 18.5 23.5 17.6 Z" fill={W} opacity="0.97" />
          <Eye cx={19.5} cy={15.6} />
        </g>
      );
    default: // 51: Jay — modest forward crest + sleek body + medium tail
      return (
        <g>
          <path d="M10 19 L2.5 23 L9.5 20.5 Z" fill={W} opacity="0.94" />
          <ellipse cx="16.5" cy="17.5" rx="7.5" ry="6.2" fill={W} opacity="0.97" />
          <path d="M14.5 11.5 Q13.5 6.5 17 5.5 Q15.5 8 16.5 11.5 Z" fill={W} opacity="0.96" />
          <path d="M24 15 L29 16 L24 17.3 Z" fill={W} opacity="0.97" />
          <Eye cx={19.4} cy={14.6} />
        </g>
      );
  }
}

/** Pose transform applied to the whole glyph: mirror, crest/tail lift, both, or none. */
function poseTransform(pose: number): string | undefined {
  switch (((pose % BIRD_POSE_COUNT) + BIRD_POSE_COUNT) % BIRD_POSE_COUNT) {
    case 1:
      return "rotate(-7 16 16)"; // slight lift
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
  // Manual override > owner/staff pin > deterministic hash.
  const speciesPick = user.avatarSpecies ?? SPECIES_PINS[seed];

  if (USE_V2) {
    // No-disc modes ("none"/"outline") must NOT clip to a circle, or the crest/bill get cut.
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
          colorOverride={user.avatarColor}
          speciesOverride={speciesPick}
        />
        {!user.name ? null : <span className="sr-only">{getInitials(user.name)}</span>}
      </span>
    );
  }

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
