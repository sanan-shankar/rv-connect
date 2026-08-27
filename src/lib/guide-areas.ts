/* ------------------------------------------------------------------ *
 *  Which pages have a chapter, and what each one is called.
 *
 *  The order here is the order on /guide, and it is the sidebar's order
 *  rather than alphabetical: somebody looking for the Feed's chapter is
 *  looking where the Feed sits in the nav.
 *
 *  Adding a chapter is two steps, and the second is not optional: add a
 *  row here AND a component in src/components/guide/chapters/. The
 *  route reads this list, so a row without a component is a 404 with a
 *  link pointing at it.
 * ------------------------------------------------------------------ */

export interface GuideArea {
  slug: string;
  /** The chapter's own title. Matches the page's <h1> where there is one. */
  title: string;
  /** One line for the index card. Not the chapter's lede; shorter. */
  blurb: string;
  /** Where "back to the thing itself" goes. */
  href: string;
}

export const GUIDE_AREAS: GuideArea[] = [
  {
    slug: "feed",
    title: "The Feed",
    blurb: "What a post is for here, who sees it, and what to do with one you like.",
    href: "/feed",
  },
  {
    slug: "directory",
    title: "The Directory",
    blurb: "Finding people, the map, and what other members can see about you.",
    href: "/directory",
  },
  {
    slug: "collection",
    title: "The Valley Collection",
    blurb: "What belongs in the archive, how to add to it, and what happens after you do.",
    href: "/collection",
  },
  {
    slug: "letters",
    title: "Letters",
    blurb: "Long writing, kept out of the feed so it is not competing with a photograph.",
    href: "/letters",
  },
  {
    slug: "catchups",
    title: "Catch-ups",
    blurb: "A group newsletter on a schedule. The least obvious thing here, so start with this.",
    href: "/catchups",
  },
  {
    slug: "birds",
    title: "The birds",
    blurb: "Why you are a bird, which one, and how to change it.",
    href: "/birds",
  },
];

export function findGuideArea(slug: string): GuideArea | undefined {
  return GUIDE_AREAS.find((a) => a.slug === slug);
}
