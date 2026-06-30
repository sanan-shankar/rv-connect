"use client";

/* ------------------------------------------------------------------ *
 *  ProfileAvatar - the large bird avatar on a member's profile header,
 *  with two profile-only touches (never in the feed):
 *
 *   1. TAP REACTION + CHIRP: a tap gives the bird a confident 2-state
 *      spring (lift + slight turn that settles cleanly) and emits a few
 *      clean concentric sky-blue sound arcs from the beak that expand
 *      and fade. Translated from the approved /preview/delight/feedback
 *      lab (the avatar beak-chirp + the species-on-hover tooltip).
 *
 *   2. SPECIES ON HOVER/FOCUS: hovering or keyboard-focusing the avatar
 *      names its bird species (derived the same way BirdGlyphV2 does, via
 *      birdFor + the ARCHETYPES display name). A real uploaded photo has
 *      no species, so the tooltip is hidden in that case.
 *
 *  Light-mode app. transform/opacity only; any 3+ keyframe array is a
 *  tween with EASE_POP, never a spring. Motion runs by choice (no
 *  prefers-reduced-motion gating, per owner decision).
 * ------------------------------------------------------------------ */

import { useRef, useState } from "react";
import { motion } from "motion/react";
import { BirdAvatar, type AvatarUser } from "@/components/common/bird-avatar";
import { birdFor, SPECIES_PINS } from "@/lib/avatar";
import { ARCHETYPES } from "@/components/common/bird-avatar-v2";
import { SPRINGS, EASE_POP } from "@/components/common/motion";

type SizeToken = "xs" | "sm" | "md" | "lg";

/**
 * The species name behind a member's avatar, mirroring BirdGlyphV2's lookup
 * (manual avatarSpecies > owner/staff pin > deterministic hash). Returns null
 * when the member uses a real uploaded photo, so the caller can hide the tip.
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
  const [chirp, setChirp] = useState(0);
  const lastChirp = useRef(0);

  function chirpNow() {
    const now = Date.now();
    if (now - lastChirp.current < 650) return; // rate-limit repeat taps
    lastChirp.current = now;
    setChirp((c) => c + 1);
  }

  const tipId = species ? `profile-species-${user.id ?? "member"}` : undefined;

  return (
    <span
      className={`relative inline-flex flex-col items-center ${className}`}
      style={{ cursor: "pointer", outline: "none" }}
      role="button"
      tabIndex={0}
      aria-label={
        species ? `${user.name ?? "Member"}, ${species}` : (user.name ?? "Member")
      }
      aria-describedby={tipId}
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
      {/* species tooltip: static centering wrapper, motion animates only the tip's opacity + transform */}
      {species && (
        <span
          className="pointer-events-none absolute left-1/2 bottom-[calc(100%+6px)] z-[3] flex -translate-x-1/2 justify-center"
          aria-hidden
        >
          <motion.span
            id={tipId}
            className="relative whitespace-nowrap rounded-lg bg-foreground px-2.5 py-1.5 text-[11.5px] font-bold text-background"
            style={{
              transformOrigin: "50% 120%",
              boxShadow:
                "0 2px 6px rgba(0,0,0,0.08), 0 14px 28px -20px rgba(0,0,0,0.6)",
            }}
            initial={false}
            animate={
              hovered
                ? { opacity: 1, y: 0, scale: 1 }
                : { opacity: 0, y: 6, scale: 0.96 }
            }
            transition={hovered ? SPRINGS.snappy : { duration: 0.14, ease: "easeOut" }}
          >
            {species}
            <span
              className="absolute left-1/2 top-full -ml-1 -mt-1 h-2 w-2 rotate-45 rounded-[1px] bg-foreground"
            />
          </motion.span>
        </span>
      )}

      {/* the bird itself: a confident 2-state spring lift + turn that settles cleanly */}
      <motion.span
        className="relative inline-grid place-items-center"
        key={chirp}
        initial={chirp > 0 ? { scale: 1.16, rotate: -9 } : false}
        animate={{ scale: hovered ? 1.04 : 1, rotate: 0 }}
        transition={
          chirp > 0
            ? { type: "spring", stiffness: 460, damping: 17, mass: 0.7 }
            : SPRINGS.snappy
        }
      >
        <BirdAvatar user={user} size={size} ring={ring} />

        {/* clean concentric sound arcs emitting from the beak (upper-right) */}
        {chirp > 0 && (
          <span
            className="pointer-events-none absolute -right-2.5 top-1 z-[2] h-[30px] w-[30px]"
            aria-hidden
          >
            {[0, 1, 2].map((n) => (
              <motion.span
                key={`${chirp}-${n}`}
                className="absolute right-0 top-1/2 rounded-full border-2 border-sky"
                style={{
                  width: n === 0 ? 7 : n === 1 ? 14 : 22,
                  height: n === 0 ? 7 : n === 1 ? 14 : 22,
                  marginTop: n === 0 ? -3.5 : n === 1 ? -7 : -11,
                  clipPath: "polygon(50% 50%, 100% 6%, 100% 94%)",
                  transformOrigin: "0% 50%",
                }}
                initial={{ opacity: 0, scale: 0.35 }}
                animate={{ opacity: [0, 0.85, 0], scale: 1 }}
                transition={{
                  duration: 0.62,
                  ease: EASE_POP,
                  delay: n * 0.09,
                  times: [0, 0.3, 1],
                }}
              />
            ))}
          </span>
        )}
      </motion.span>
    </span>
  );
}
