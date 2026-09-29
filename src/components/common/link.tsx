import NextLink from "next/link";
import type { ComponentProps } from "react";

/* Every link in the app, with prefetching OFF unless a caller asks for it.
 *
 * Next prefetches each <Link> as it scrolls into view, and for a dynamic
 * route with a loading.tsx -- which is every signed-in route here, by the
 * rule that each async route ships one -- that prefetch is a server render
 * of the layouts down to the loading boundary. The (main) layout is the
 * expensive part: the session check, the unread count, the Catch-up
 * advance, the mail drain and touchLastSeen, all for a page nobody opened.
 * The client cache keeps none of it (staleTimes.dynamic is 0), so the next
 * scroll past the same card renders it again.
 *
 * Measured on production, 2026-09-22 to 09-29: /profile/[id] was rendered
 * 27,841 times against ~546 real profile views in the visit log, a third of
 * the project's Active CPU, and the site as a whole rendered ~18 pages for
 * every one a member opened. That is what pushed the owner off Hobby.
 *
 * What prefetching bought was only the loading shimmer appearing on the tap
 * instead of a beat after it: the page's content is dynamic and was never
 * prefetched, so it arrives when it did before. Pass `prefetch` explicitly
 * for a link that genuinely earns it. Nothing imports next/link directly
 * (link-import-rule.test.mjs). See docs/TRAPS.md, "Next.js". */
export default function Link({
  prefetch = false,
  ...props
}: ComponentProps<typeof NextLink>) {
  return <NextLink prefetch={prefetch} {...props} />;
}
