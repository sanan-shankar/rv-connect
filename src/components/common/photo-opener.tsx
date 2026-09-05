"use client";

/* ------------------------------------------------------------------ *
 *  <PhotoOpener> - one photograph, as a press that opens the shared
 *  viewer at it.
 *
 *  It was written five times: post-card's `PhotoButton`, answer-photos'
 *  `Opener`, and inline buttons in letter-images and photo-wall, all
 *  carrying the same class string, the same aria-label shape and the same
 *  pair of preload handlers. `grep` for the class found exactly those.
 *  photo-river's `Tile` is the fifth and stays where it is: it has a scrim,
 *  no border and a caption for a label, which is a different control.
 *
 *  The preload is wired in here rather than passed, so a caller cannot add
 *  a sixth copy that forgets it -- and forgetting it is what the owner met
 *  when he pressed a photograph and waited: "Oh, wow. This doesn't even
 *  load. What? I clicked on picture. Okay. Loaded."
 * ------------------------------------------------------------------ */

import { preloadImageViewer } from "@/components/common/lazy-image-viewer";
import { cn } from "@/lib/utils";

export function PhotoOpener({
  index,
  count,
  onOpen,
  label,
  className,
  children,
}: {
  index: number;
  /** How many photographs this press is one of. Decides the default label. */
  count: number;
  onOpen: (index: number) => void;
  /** Overrides the default label. The Catch-up wall names the person instead
   *  of the position, because a wall is many people's photographs and whose it
   *  is tells you more than which. */
  label?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(index)}
      onPointerEnter={preloadImageViewer}
      onFocus={preloadImageViewer}
      aria-label={
        label ??
        (count > 1
          ? `View photo ${index + 1} of ${count} full screen`
          : "View this photo full screen")
      }
      className={cn(
        /* The border is here rather than passed in: three of the four callers
           had it in their own base class and the fourth passed it at every
           call site, so it was never optional. photo-river's Tile is the only
           opener in the app without one, and it is not this component. */
        "block w-full overflow-hidden rounded-[var(--radius-md)] border border-border transition-opacity duration-150 hover:opacity-95 active:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        className
      )}
    >
      {children}
    </button>
  );
}
