/* ------------------------------------------------------------------ *
 *  Shared copy + assets for the landing-page redesign exploration
 *  (src/app/preview/delight/landings). Every string below is lifted
 *  VERBATIM from the current live landing (src/app/page.tsx and
 *  src/components/landing/*) — see the file/line each block cites. The
 *  owner will rewrite all marketing prose himself later, so no variant
 *  should invent new headline/body copy; pull it from here so all five
 *  concepts are judged on layout and craft, not on who wrote nicer words.
 *
 *  Small functional labels (a button state, an aria-label, a stub's own
 *  callout) are fine to write fresh — this file is for the copy that
 *  actually sells the product.
 *
 *  Assets: SHOTS re-exports the same screenshot map every real page
 *  uses (src/components/landing/shots.ts) plus the hero photo constants
 *  (src/components/landing/hero-photo.ts), so a variant never points at
 *  a duplicate or stale image.
 * ------------------------------------------------------------------ */

export { SHOTS, type Shot } from "@/components/landing/shots";
export {
  HERO_IMAGE_SRC,
  HERO_IMAGE_BLUR,
} from "@/components/landing/hero-photo";

/** src/components/landing/landing-nav.tsx */
export const NAV = {
  signIn: "Sign in",
  join: "Join",
};

/** src/components/landing/landing-hero.tsx */
export const HERO = {
  headline: "Welcome back to the valley.",
  sub: "A space for the Rishi Valley community to stay connected.",
  ctaPrimary: "Join the community",
  ctaSecondary: "Sign in",
  scrollCue: "See what's inside",
};

/** src/app/page.tsx — the intro band right below the hero. */
export const INTRO = {
  eyebrow: "What is inside",
  heading: "The valley scattered everyone. This is where they find each other.",
  body: "Old batchmates and the teachers who taught them. The first batches and the ones who left last summer. One of us built it and looks after it, for the rest of us.",
};

export type Accent = "leaf" | "blue" | "cinnamon";

export interface FeatureCopy {
  index: number;
  eyebrow: string;
  title: string;
  body: string;
  bullets?: string[];
  accent: Accent;
  /** Key into SHOTS + the alt text the real page uses for that shot. */
  shot: { name: keyof typeof import("@/components/landing/shots").SHOTS; alt: string };
}

/** src/app/page.tsx — the five feature rows, in order. */
export const FEATURES: FeatureCopy[] = [
  {
    index: 1,
    eyebrow: "The Directory",
    title: "Everyone, and where they landed.",
    body: "Search by batch, by house, by the city someone lives in now, or by what they do for a living. The friend you last saw at the 2009 leavers' assembly is three taps from here.",
    bullets: [
      "A map with a pin on every town the valley reached",
      "A bird stands in for anyone who has not added a photo yet",
    ],
    accent: "blue",
    shot: { name: "directory", alt: "The directory: a grid of people, each with a bird for an avatar." },
  },
  {
    index: 2,
    eyebrow: "The Feed",
    title: "What everyone is up to, on one page.",
    body: "A pair of grey hornbills at the fig tree by the amphitheatre. A wedding. A new job in a city nobody expected. A question for whoever still remembers the old library. It moves at the pace the valley did.",
    accent: "leaf",
    shot: { name: "feed", alt: "The feed: posts from the valley, one after another down the page." },
  },
  {
    index: 3,
    eyebrow: "Letters",
    title: "Some things need more than a post.",
    body: "Write a Letter instead: the teacher who changed the shape of your life, or a whole essay about the year you finally understood what the place was for. It opens on a page made for reading slowly.",
    accent: "cinnamon",
    shot: { name: "letters", alt: "The Letters page, with a long-form piece about the valley." },
  },
  {
    index: 4,
    eyebrow: "Catch-ups",
    title: "A letter that comes round every season.",
    body: "A few questions land in your inbox. You answer when you get a moment. Once everyone has, all the answers arrive together, so you hear from people you would never have thought to email.",
    accent: "leaf",
    shot: { name: "catchups", alt: "The Catch-ups feature, a gathered group newsletter." },
  },
  {
    index: 5,
    eyebrow: "The Valley Collection",
    title: "The valley remembers.",
    body: "Photographs going back decades. The banyan before the storm took the far branch. Choir on the assembly steps. Founders' Week, class by class. The light coming off Rishikonda at six in the morning.",
    accent: "cinnamon",
    shot: { name: "collection", alt: "The Valley Collection, a shared archive of valley photographs." },
  },
];

/** src/components/landing/trust-section.tsx */
export const TRUST = {
  eyebrow: "Invite only",
  heading: "Small on purpose.",
  body1: "Someone already in vouches for you, and the school checks your name against the rolls. There are no open sign-ups here, and nobody is chasing a bigger number. You will know the place by who turns up in it.",
  body2: "It will not ask you to keep up with it. There is no algorithm and no one selling your attention. Only the people you grew up with, and the valley you grew up in.",
  vouchedBadge: "10 people vouched",
  vouchedNote: "Everyone starts as a bird. Add a photo of your face whenever you are ready, or keep the bird.",
};

/** src/components/landing/landing-footer.tsx */
export const FOOTER = {
  heading: "Come back to the valley.",
  body: "If you grew up here, or taught here, or looked after the place while the rest of us grew up, you already belong. Come and find everyone else.",
  ctaPrimary: "Join the community",
  ctaSecondary: "Sign in",
  tagline: "A space for the Rishi Valley community to stay connected.",
};
