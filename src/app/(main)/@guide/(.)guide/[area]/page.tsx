/* ------------------------------------------------------------------ *
 *  The chapter, intercepted, so it opens OVER the page you were on.
 *
 *  This is the owner's pick from /lab/guide (stage D, 2026-08-27). One
 *  chapter written once in src/components/guide/chapters, rendered two
 *  ways depending only on how you arrived:
 *
 *    soft navigation from inside the app  ->  this file, over the page
 *    cold link, refresh, or a shared URL  ->  (main)/guide/[area]
 *
 *  The address bar says /guide/catchups either way, which is the whole
 *  reason for doing it like this rather than with a piece of state: the
 *  link works when somebody mails it to you, and closing puts you back
 *  where you stood instead of on a page you never chose.
 *
 *  `(.)` and not `(..)`: interception counts route SEGMENTS, and both
 *  `@guide` (a slot) and `guide` hang off `(main)` (a group). Neither a
 *  slot nor a group is a segment, so the two are siblings at the root.
 * ------------------------------------------------------------------ */

import { notFound } from "next/navigation";
import { findGuideArea } from "@/lib/guide-areas";
import { CHAPTERS } from "@/components/guide/chapters";
import { GuideOverlay } from "@/components/guide/guide-overlay";

export default async function InterceptedGuideChapter({
  params,
}: {
  params: Promise<{ area: string }>;
}) {
  const { area } = await params;
  const found = findGuideArea(area);
  const Chapter = found ? CHAPTERS[found.slug] : undefined;
  if (!found || !Chapter) notFound();

  return (
    <GuideOverlay title={found.title}>
      <Chapter />
    </GuideOverlay>
  );
}
