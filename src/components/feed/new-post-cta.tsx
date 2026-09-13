"use client";

import { Plus } from "lucide-react";
import { m } from "motion/react";
import { BirdAvatar, type AvatarUser } from "@/components/common/bird-avatar";
import { SPRINGS } from "@/components/common/motion";
import { OWN_BIRD_LAYOUT_ID, useNewPostDock } from "./new-post-dock";

/**
 * NewPostCTA: the feed header's primary action, and the member's own bird.
 *
 * The bird wears a small canopy plus at its corner, the "add to your story"
 * shape. It replaced a composer pill above the posts and a separate New post
 * pill in the header, which did the same job twice (owner, 2026-09-13). Two
 * attempts to put the bird INSIDE a pill were turned down along the way: in a
 * disc it shrank to 24px and wore a box it has nowhere else, and cutting a
 * socket for it out of the green left a crescent with sharp ends. The record
 * of all of them is /lab/new-post.
 *
 * Pressing it opens the composer at the top of the feed: the bird flies into
 * the composer's avatar slot, and the badge unfolds into a full 40px canopy
 * circle in the place the bird left, so the button is still a button while
 * the bird is out. Pressing it again while the composer is open only focuses
 * the editor -- it never closes a draft.
 */
export function NewPostCTA({ user }: { user: AvatarUser }) {
  const { open: out, openComposer } = useNewPostDock();

  function press() {
    if (!out) {
      openComposer();
      return;
    }
    document
      .querySelector<HTMLElement>("[data-composer] [contenteditable]")
      ?.focus({ preventScroll: true });
  }

  return (
    <button
      type="button"
      onClick={press}
      aria-expanded={out}
      aria-label="New post"
      title="New post"
      /* The composer's outside-click test skips this, so pressing the badge
         while the composer is open cannot close it and reopen it. */
      data-new-post
      className="group/np relative inline-grid size-10 shrink-0 place-items-center rounded-full outline-none select-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      {!out && (
        <m.span layoutId={OWN_BIRD_LAYOUT_ID} transition={SPRINGS.gentle} className="grid place-items-center">
          <BirdAvatar user={user} size="sm" />
        </m.span>
      )}

      {/* The halo, on its own element. It is what lets a green plus sit on a
          green bird, so it only exists while there is a bird under it and
          fades as the bird leaves. As a box-shadow on the disc it stayed on
          the unfolded circle (doubled to 4px by the scale) and sat under the
          hover's brightness filter, which lifted it into a white ring (owner,
          2026-09-14). 24px on the badge's own centre is the 2px ring. */}
      <m.span
        aria-hidden
        className="absolute -right-1.5 -bottom-1.5 size-6 rounded-full bg-background"
        initial={false}
        animate={{ opacity: out ? 0 : 1 }}
        transition={{ duration: 0.12 }}
      />

      {/* The badge is the button's green, folded small. When the bird leaves
          it unfolds into the 40px circle the bird left. Geometry: the 20px
          badge sits 4px past the slot's corner, so its centre is at (34, 34)
          and the slot's at (20, 20); -14 on each axis and scale 2 lands it
          exactly on the bird's circle. Transform only, on `snappy`, so it has
          settled before the bird, flying home on `gentle`, arrives.
          Hover and press are the canopy CTA's own from button.tsx: the 1.08
          brightness lift, the 0.97 sink and the canopy drop shadow. */}
      <m.span
        aria-hidden
        className="absolute -right-1 -bottom-1 size-5 rounded-full bg-canopy shadow-[0_5px_13px_-12px_var(--color-canopy)] group-hover/np:brightness-[1.08] group-active/np:scale-[0.97]"
        initial={false}
        animate={out ? { x: -14, y: -14, scale: 2 } : { x: 0, y: 0, scale: 1 }}
        transition={SPRINGS.snappy}
      />

      {/* Two pluses rather than one scaled with the disc: doubled, the
          badge's 12px plus with its 3px stroke would be 6px thick. The small
          one rides the disc to the centre and fades; the ordinary 17px plus
          fades in from where the badge was. */}
      <m.span
        aria-hidden
        className="pointer-events-none absolute -right-1 -bottom-1 grid size-5 place-items-center text-white"
        initial={false}
        animate={out ? { opacity: 0, x: -14, y: -14 } : { opacity: 1, x: 0, y: 0 }}
        transition={SPRINGS.snappy}
      >
        <Plus className="size-3" strokeWidth={3} />
      </m.span>
      <m.span
        aria-hidden
        className="pointer-events-none absolute inset-0 grid place-items-center text-white"
        initial={false}
        animate={out ? { opacity: 1, x: 0, y: 0, scale: 1 } : { opacity: 0, x: 14, y: 14, scale: 0.7 }}
        transition={SPRINGS.snappy}
      >
        <Plus className="h-[17px] w-[17px]" />
      </m.span>
    </button>
  );
}
