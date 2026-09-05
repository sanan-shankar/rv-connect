"use client";

/* ------------------------------------------------------------------ *
 *  <GuideBody> — the lazy half of the guide sheet: the overlay and the
 *  six chapters behind it.
 *
 *  It exists to be a chunk boundary and nothing else. <GuideLayer> is
 *  mounted once in the (main) layout and renders null until somebody
 *  presses a page title, but a static import ships the module however
 *  the branch goes -- so the overlay and all six chapters were in the
 *  first load of all 39 member routes, ~14 KB raw, for a sheet most
 *  visits never open.
 *
 *  The press is not the first the door knows about it: <GuideDoor>
 *  prefetches this module on pointer-enter and on focus, so by the time
 *  a click lands the chunk is in cache and the sheet's 200ms entrance is
 *  exactly what it was.
 * ------------------------------------------------------------------ */

import { CHAPTERS } from "./chapters";
import { GuideOverlay } from "./guide-overlay";

export function GuideBody({ slug, title }: { slug: string; title: string }) {
  const Chapter = CHAPTERS[slug];
  if (!Chapter) return null;
  return (
    <GuideOverlay title={title}>
      <Chapter />
    </GuideOverlay>
  );
}
