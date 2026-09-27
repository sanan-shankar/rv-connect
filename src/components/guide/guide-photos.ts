/* ------------------------------------------------------------------ *
 *  A photograph for each chapter of the guide, chosen by the owner
 *  from the Class Collection, 2026-09-27: "the picture has to say
 *  something about what it is, but not just that. It also should look
 *  good when blown up and the colors should be the right fit for us."
 *
 *  Two crops of each, cut once from the stored original rather than
 *  sent through next/image's optimiser (which is metered, and the
 *  Collection has never used it; lib/image-cdn.ts):
 *    tall  1000x1760, the laptop's pane beside the column (the pane is
 *          ~490x870 CSS px on a 1440x900 screen, so this is its 2x);
 *    wide  1200x800, the phone's band under the title (390 CSS px at 3x).
 *  `tint` is the photograph's own average colour, painted until it
 *  arrives, so the pane never flashes an empty box. `focus` is what the
 *  pane keeps when a short laptop screen makes it wider than the crop
 *  and it has to lose some top and bottom: the library's window, the
 *  ball at the top of the basketball photograph.
 *
 *  The owner's choices: the Feed's Three Sisters, the Collection's
 *  December 2011 silhouettes (the one he linked, not its wider twin),
 *  the library for Letters, Kartik's house for Catch-ups. The school
 *  bell ("We could definitely should definitely use that somewhere")
 *  took the Directory. Birds has the basketball photograph because he
 *  did not want a bird ("Don't wanna use birds"), and Cave Rock at blue
 *  hour, his other offer, is nearly black at this size.
 *
 *  The library was shot turned a little right and tipped down, so its
 *  shelves were uneven and its uprights leaned ("if you can correct it
 *  and just get the shelves even on both sides"). Both crops come from a
 *  copy rotated back to straight on (3 degrees of turn, 8 of tilt,
 *  measured from where the corridor's lines meet), cut from inside the
 *  rotated frame so no empty corner shows, and from below the ceiling,
 *  which he did not like at the top of the tall one.
 * ------------------------------------------------------------------ */

import { HERO_IMAGE_SRC } from "@/components/landing/hero-photo";

export type GuidePhoto = { tall: string; wide: string; tint: string; focus: string };

const at = (slug: string, tint: string, focus = "50% 50%"): GuidePhoto => ({
  tall: `/images/guide/${slug}-tall.webp`,
  wide: `/images/guide/${slug}-wide.webp`,
  tint,
  focus,
});

export const GUIDE_PHOTOS: Record<string, GuidePhoto> = {
  /* The valley photograph the sign-in page opens on, so the tour's first
     window looks like the door members came in by. The cover fills the
     window, so it takes the whole landscape on a laptop (the sign-in
     page's own file, 4:3, which is the window's shape) and a tall cut of
     it on a phone. */
  welcome: { tall: "/images/guide/welcome-tall.webp", wide: HERO_IMAGE_SRC, tint: "#656f41", focus: "50% 50%" },
  feed: at("feed", "#83897a"),
  directory: at("directory", "#7b824d", "50% 40%"),
  collection: at("collection", "#695d58", "50% 30%"),
  letters: at("letters", "#626161", "50% 0%"),
  catchups: at("catchups", "#6e3e3d", "50% 25%"),
  birds: at("birds", "#545453", "50% 0%"),
};
