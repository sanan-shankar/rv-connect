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
  /** The sidebar's word for the page, for "Next: Directory". The titles are
   *  too long for a button on a phone ("Next: The Valley Collection"). */
  short: string;
  /** One line for the index card. Not the chapter's lede; shorter. */
  blurb: string;
}

export const GUIDE_AREAS: GuideArea[] = [
  {
    slug: "feed",
    title: "The Feed",
    short: "Feed",
    blurb: "What belongs in the Feed, what is better left to WhatsApp, and what you can do with a post.",
  },
  {
    slug: "directory",
    title: "The Directory",
    short: "Directory",
    blurb: "The map, batches and people, and who can see what on your profile.",
  },
  {
    slug: "collection",
    title: "The Valley Collection",
    short: "Collection",
    blurb: "Adding photographs, finding them, and your Class Collection.",
  },
  {
    slug: "letters",
    title: "Letters",
    short: "Letters",
    blurb: "Writing longer or more considered than a post, and keeping drafts.",
  },
  {
    slug: "catchups",
    title: "Catch-ups",
    short: "Catch-ups",
    blurb: "A newsletter a group writes for each other, and how an Edition comes together.",
  },
  {
    slug: "birds",
    title: "The birds",
    short: "Birds",
    blurb: "Why you are a bird, and which one.",
  },
];

/** The tour's own first page: what the tour is and how to get it back.
 *  Not a chapter (no page's title opens it, and /guide/welcome is a 404);
 *  it exists only at the front of the tour. Owner, 2026-09-27: "Maybe the
 *  guide and double click to get back to it thing could be mention before
 *  feed on its own beautiful window?" */
export const WELCOME: GuideArea = {
  slug: "welcome",
  title: "How to use this site",
  short: "the start",
  blurb: "",
};

export function findGuideArea(slug: string): GuideArea | undefined {
  if (slug === WELCOME.slug) return WELCOME;
  return GUIDE_AREAS.find((a) => a.slug === slug);
}

/* The five chapters that run one after another, in the order he gave them
   (2026-09-27: "the guide for the feed read through it. And then click
   next, go to directory, click next, and go cycle through of them"). Birds
   is a chapter but not a stop: it describes an avatar, not a part of the
   site. Teachers skip Catch-ups, because /catchups sends them to the Feed
   (catchups/layout.tsx), so the chapter would describe a door they cannot
   open. */
const CHAIN = ["feed", "directory", "collection", "letters", "catchups"];

export function guideChain(isTeacher: boolean): string[] {
  return isTeacher ? CHAIN.filter((slug) => slug !== "catchups") : CHAIN;
}

/** The first-run tour: the welcome page, then the chain. */
export function tourChain(isTeacher: boolean): string[] {
  return [WELCOME.slug, ...guideChain(isTeacher)];
}

/** The chapter after this one in the viewer's chain, if there is one. */
export function nextGuideArea(slug: string, chain: string[]): GuideArea | undefined {
  const i = chain.indexOf(slug);
  return i >= 0 && i < chain.length - 1 ? findGuideArea(chain[i + 1]) : undefined;
}
