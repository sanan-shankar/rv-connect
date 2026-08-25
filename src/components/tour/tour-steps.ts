/* ------------------------------------------------------------------ *
 *  tour-steps.ts — the ordered stop config for the first-run product
 *  walkthrough. Pure data: no React, no DOM. This is the single source of
 *  truth for both the tour's order AND its copy, so the two can never
 *  drift apart.
 *
 *  Voice: warm, plain, short sentences, no jargon, no em dashes, always
 *  "Rishi Valley" never "RV Connect". The owner hates the word
 *  "quiet"/"quietly" in user-facing copy; it never appears below (the
 *  spec's server-cost joke in the Feed note is rephrased without it).
 *
 *  TOUR_STOPS is the run list, in order; the progress dots count it. A stop
 *  is added or removed by editing that array, nothing else.
 * ------------------------------------------------------------------ */

export type TourStopId = "feed" | "directory" | "collection" | "catchups";

export interface TourStop {
  id: TourStopId;
  /** Route to navigate to for this stop. */
  route: string;
  /** The `data-tour="..."` key the destination page reports (tour-anchors.ts). */
  spotlight: string;
  title: string;
  /** Paragraphs, rendered in order. */
  body: string[];
  /** Optional soft callout block (a nested, smaller-radius aside). */
  note?: string;
}

export interface TourCardCopy {
  title: string;
  body: string[];
}

/** First arrival at the feed: offered, never forced. */
export const TOUR_OFFER: TourCardCopy = {
  title: "Want a quick look around?",
  body: [
    "Hello, and welcome in. I am the valley's hoopoe, and I can show you around in about a minute.",
    "Four short stops. You can stop me whenever you like.",
  ],
};

/** Shown once the four real stops are done. */
export const TOUR_FINISH: TourCardCopy = {
  title: "That is the tour",
  body: [
    "That is everything for now. Have a wander, and add something whenever you feel like it. There is no rush.",
    'If you ever want this again, use "hoopoe tour" in the Admin panel.',
  ],
};

export const TOUR_STOPS: TourStop[] = [
  {
    id: "feed",
    route: "/feed",
    spotlight: "feed-composer",
    title: "The Feed",
    body: [
      "This is where the valley shares its news and reads it. Someone is planning a reunion, a batch has an update, the school has an announcement: it goes here, where everyone can see it.",
      'You can like a post, leave a comment, and reply to what other people say. To share something of your own, tap where it says "Share a memory, a sighting, or a note for the valley."',
    ],
    note:
      "One small thing, and it matters. This is not here to replace your WhatsApp groups. The everyday chatter, the good-mornings, the quick forwards: those are lovely, and they belong there. If all of it moved over here, the cost of keeping it would break us before long.\n\n" +
      "Think of it this way. The group chats are full of wonderful messages, and most of them scroll away and are gone by morning. The Feed is for the ones worth keeping: the updates you would happily come back to and read again.",
  },
  {
    id: "directory",
    route: "/directory",
    spotlight: "directory-search",
    title: "The Directory",
    body: [
      "This is how you find people again. Search by name, or open the map to see where everyone landed. You can also browse batch by batch.",
      'Tap "Filters" to narrow things down: a city, a range of years, a profession.',
      "That last one is worth knowing if you are early in your working life. You can find the people from the valley who do the kind of work you are curious about, and simply say hello.",
    ],
  },
  {
    id: "collection",
    route: "/collection",
    spotlight: "collection-contribute",
    title: "The Valley Collection",
    body: [
      "Have you ever tried to show someone what Rishi Valley looks like, searched online, and found nothing that did it justice? This is us fixing that.",
      'People have started little photo archives of the valley over the years, each on their own. This is the one we build together. Anyone can add to it with the "Contribute" button.',
      "The photos that belong here are the ones of the school that others would love to see: the banyan in good light, the hills at dawn, the birds, a corner you never forgot. A caption and a tag on each one help people find it later.",
    ],
    note:
      "A few of us look after the Collection and take down anything that does not belong. So please go about this responsibly, and it will stay a place everyone is glad to open.",
  },
  {
    id: "catchups",
    route: "/catchups",
    spotlight: "catchups-explainer",
    title: "Catch-ups",
    body: [
      "A Catch-up is a little group letter that comes around now and then. It happens in three easy steps.",
      "First, everyone adds a question or two. Then, for a few days, everyone answers. When the window closes, all the answers are gathered into one issue the whole group reads.",
      "Ask, answer, read. It is a lovely way to hear from the people you do not speak to every day.",
    ],
  },
];
