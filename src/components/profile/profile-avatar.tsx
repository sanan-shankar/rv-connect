"use client";

/* ------------------------------------------------------------------ *
 *  ProfileAvatar - the large bird avatar on a member's profile header,
 *  with two profile-only touches (never in the feed):
 *
 *   1. TAP REACTION: a tap gives the bird a gentle spring lift + tiny
 *      turn that settles cleanly (SPRINGS from motion.tsx, no keyframes,
 *      no remount), and pops the species name in a solid warm chip that
 *      rises + fades in. The chip is opaque with a layered shadow so it
 *      stays readable over ANY cover photo. (Owner round-2: the old
 *      concentric "sound arc" effect was jagged and invisible over the
 *      cover, so it is dropped in favour of this clear reaction + name.)
 *
 *   2. SPECIES ON HOVER/FOCUS: hovering or keyboard-focusing the avatar
 *      shows the same chip, naming its bird species (derived the same way
 *      BirdGlyphV2 does, via birdFor + the ARCHETYPES display name). A
 *      real uploaded photo has no species, so the chip is hidden then.
 *
 *  Light-mode app. transform/opacity only. Motion runs by choice (no
 *  prefers-reduced-motion gating, per owner decision).
 * ------------------------------------------------------------------ */

import { useRef, useState } from "react";
import { motion, AnimatePresence, useAnimationControls } from "motion/react";
import { BirdAvatar, type AvatarUser } from "@/components/common/bird-avatar";
import { birdFor, SPECIES_PINS } from "@/lib/avatar";
import { ARCHETYPES } from "@/components/common/bird-avatar-v2";
import { SPRINGS } from "@/components/common/motion";

type SizeToken = "xs" | "sm" | "md" | "lg";

/**
 * The species name behind a member's avatar, mirroring BirdGlyphV2's lookup
 * (manual avatarSpecies > owner/staff pin > deterministic hash). Returns null
 * when the member uses a real uploaded photo, so the caller can hide the chip.
 */
function speciesNameFor(user: AvatarUser): string | null {
  if (user.photoUrl) return null;
  const seed = user.id || user.name || "valley";
  const pick = user.avatarSpecies ?? SPECIES_PINS[seed] ?? birdFor(seed).species;
  return ARCHETYPES[pick % ARCHETYPES.length]?.name ?? "Valley bird";
}

export function ProfileAvatar({
  user,
  size = "lg",
  ring = false,
  className = "",
}: {
  user: AvatarUser;
  size?: SizeToken | number;
  ring?: boolean;
  className?: string;
}) {
  const species = speciesNameFor(user);
  const [hovered, setHovered] = useState(false);
  const [chirped, setChirped] = useState(false);
  const controls = useAnimationControls();
  const lastChirp = useRef(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const showTip = !!species && (hovered || chirped);
  const tipId = species ? `profile-species-${user.id ?? "member"}` : undefined;

  function chirpNow() {
    const now = Date.now();
    if (now - lastChirp.current < 520) return; // rate-limit rapid taps
    lastChirp.current = now;

    // Gentle spring lift + tiny turn, then a soft settle back to rest. Two
    // named springs (no keyframe arrays, no key-remount) so it reads smooth
    // and cute rather than the old abrupt snap. Restarting mid-flight just
    // re-interpolates from the current value, so repeat taps stay fluid.
    controls.start({ scale: 1.12, rotate: -5 }, SPRINGS.snappy);
    clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      controls.start({ scale: 1, rotate: 0 }, SPRINGS.gentle);
    }, 130);

    if (species) {
      setChirped(true);
      clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => setChirped(false), 1700);
    }
  }

  return (
    <span
      className={`group relative inline-flex cursor-pointer rounded-full focus-visible:outline-none ${className}`}
      role="button"
      tabIndex={0}
      aria-label={
        species ? `${user.name ?? "Member"}, ${species}` : (user.name ?? "Member")
      }
      aria-describedby={showTip ? tipId : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      onClick={chirpNow}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          chirpNow();
        }
      }}
    >
      {/* Species chip: solid warm ink chip, opaque + shadowed so it reads over
          any cover photo. Centred above the avatar; rises + fades on show. */}
      {species && (
        <span
          className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-[3] -translate-x-1/2"
          aria-hidden
        >
          <AnimatePresence>
            {showTip && (
              <motion.span
                id={tipId}
                className="relative block whitespace-nowrap rounded-full bg-foreground px-3 py-1.5 text-[11.5px] font-bold text-background"
                style={{
                  boxShadow:
                    "0 1px 2px rgba(35,36,30,0.28), 0 10px 24px -12px rgba(35,36,30,0.7)",
                }}
                initial={{ opacity: 0, y: 6, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.96 }}
                transition={SPRINGS.snappy}
              >
                {species}
                <span className="absolute left-1/2 top-full -ml-1 -mt-1 h-2 w-2 rotate-45 rounded-[1px] bg-foreground" />
              </motion.span>
            )}
          </AnimatePresence>
        </span>
      )}

      {/* the bird itself: driven by animation controls for the tap bounce */}
      <motion.span
        className="inline-grid place-items-center rounded-full group-focus-visible:ring-2 group-focus-visible:ring-ring/60"
        animate={controls}
        initial={false}
        style={{ willChange: "transform" }}
      >
        <BirdAvatar user={user} size={size} ring={ring} />
      </motion.span>
    </span>
  );
}
