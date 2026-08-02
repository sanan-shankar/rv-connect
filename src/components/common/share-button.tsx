"use client";

import { useState } from "react";
import { ShareFat, Check } from "@phosphor-icons/react";
import { motion } from "motion/react";
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
}: {
  /** Relative path (may include a `#hash`) appended to `window.location.origin`. */
  href: string;
  className?: string;
  label?: string;
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
    <motion.button
      type="button"
      onClick={handleShare}
      aria-label={label}
      whileTap={{ scale: 0.93 }}
      transition={SPRINGS.snappy}
      // state-layer, not hover:bg-accent: the third of the three action buttons
      // that share a post card's footer, so it takes the same hover as the other
      // two (see love-button.tsx for the -4.50 vs +2.06 dL* measurement). The
      // icon still lifts from muted to full ink on top of it.
      className={`state-layer flex items-center rounded-full px-2.5 py-1.5 text-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${className}`}
    >
      <span className="relative inline-flex h-[18px] w-[18px] items-center justify-center">
        {/* Clean crossfade to a check, no spring overshoot (that read as a forced wiggle). */}
        <motion.span
          className="absolute inline-flex"
          animate={{ opacity: shared ? 0 : 1, scale: shared ? 0.7 : 1 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          <ShareFat size={18} weight="regular" />
        </motion.span>
        <motion.span
          className="absolute inline-flex text-leaf"
          animate={{ opacity: shared ? 1 : 0, scale: shared ? 1 : 0.7 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          <Check size={18} weight="bold" />
        </motion.span>
      </span>
    </motion.button>
  );
}
