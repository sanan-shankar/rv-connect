"use client";

import { useState } from "react";
import { ShareFat, Check } from "@phosphor-icons/react";
import { m } from "motion/react";
import { toast } from "sonner";
import { SPRINGS } from "@/components/common/motion";

/**
 * One shared share button for the whole app (feed posts, group posts, letters,
 * anything else). Same tier as {@link LoveButton} / {@link BookmarkButton}: the
 * ShareFat arrow that crossfades to a check on copy. This replaced the Letters'
 * old ShareNetwork three-dots glyph so every surface shares the one arrow.
 *
 * It owns the whole interaction: copies `origin + href` to the clipboard, toasts,
 * and plays the check crossfade for ~1.4s. Callers just hand it a relative href.
 */
export function ShareButton({
  href,
  className = "",
  label = "Copy link",
  onDark = false,
}: {
  /** Relative path (may include a `#hash`) appended to `window.location.origin`. */
  href: string;
  className?: string;
  label?: string;
  /** Floating over a photograph in the full-screen viewer, which is the one
   *  region in the app whose surface does not follow the theme: the ink
   *  `state-layer` has nothing to darken on a near-black wash, and the ink
   *  hover would put the arrow into the picture. See {@link LoveButton}. */
  onDark?: boolean;
}) {
  const [shared, setShared] = useState(false);

  async function handleShare() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${href}`);
      setShared(true);
      setTimeout(() => setShared(false), 1400);
      toast.success("Link copied");
    } catch {
      toast.error("Could not copy the link");
    }
  }

  return (
    <m.button
      type="button"
      onClick={handleShare}
      aria-label={label}
      whileTap={{ scale: 0.93 }}
      transition={SPRINGS.snappy}
      // state-layer, not hover:bg-accent: the third of the three action buttons
      // that share a post card's footer, so it takes the same hover as the other
      // two (see love-button.tsx for the -4.50 vs +2.06 dL* measurement). The
      // icon still lifts from muted to full ink on top of it.
      className={`flex items-center rounded-full px-2.5 py-1.5 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 ${
        onDark
          ? "text-white/80 transition-colors duration-150 hover:bg-white/12 hover:text-white focus-visible:outline-white"
          : "state-layer hover:text-foreground focus-visible:outline-ring"
      } ${className}`}
    >
      <span className="relative inline-flex h-[18px] w-[18px] items-center justify-center">
        {/* Clean crossfade to a check, no spring overshoot (that read as a forced wiggle). */}
        <m.span
          className="absolute inline-flex"
          animate={{ opacity: shared ? 0 : 1, scale: shared ? 0.7 : 1 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          <ShareFat size={18} weight="regular" />
        </m.span>
        <m.span
          className="absolute inline-flex text-leaf"
          animate={{ opacity: shared ? 1 : 0, scale: shared ? 1 : 0.7 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          <Check size={18} weight="bold" />
        </m.span>
      </span>
    </m.button>
  );
}
