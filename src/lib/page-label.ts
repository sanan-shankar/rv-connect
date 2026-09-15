/* ------------------------------------------------------------------ *
 *  A page's name in words, for the analytics room.
 *
 *  "/profile/cmr1uahuj000004jx4dc4p8co" reads as noise; "a profile" reads as
 *  a fact. Shared by the live presence list and the journey panels, so a page
 *  is called the same thing in every place the room names it.
 *
 *  Accepts either a real path or the collapsed form the journey queries group
 *  on, where every id segment has become ":id" (ID_SEGMENT below).
 * ------------------------------------------------------------------ */

/* An id segment: cuids are 25 lowercase alphanumerics, and no named route in
   the app has a segment half that long, so twenty is a safe floor. */
export const ID_SEGMENT = /\/[a-z0-9]{20,}(?=\/|$)/g;

const NAMED: Record<string, string> = {
  "/feed": "the feed",
  "/directory": "the directory",
  "/letters": "letters",
  "/letters/new": "writing a letter",
  "/collection": "the collection",
  "/catchups": "catch-ups",
  "/catchups/new": "starting a catch-up",
  "/support": "support",
  "/birds": "the birds",
  "/pick-bird": "choosing a bird",
  "/about": "about",
  "/messages": "messages",
  "/guide": "the guide",
  "/welcome": "setting up their account",
  "/dark-mode": "dark mode",
};

/* Most specific first: "/catchups/:id/answer" has to win over "/catchups/:id". */
const PATTERNS: [RegExp, string][] = [
  [/^\/profile\/:id/, "a profile"],
  [/^\/letters\/:id\/edit/, "editing a letter"],
  [/^\/letters\/:id/, "reading a letter"],
  [/^\/catchups\/edition\/:id/, "reading an Edition"],
  [/^\/catchups\/round\/:id/, "a catch-up round"],
  [/^\/catchups\/:id\/answer/, "answering a catch-up"],
  [/^\/catchups\/:id/, "a catch-up"],
  [/^\/collection\/:id/, "a photo"],
  [/^\/messages\/:id/, "a conversation"],
  [/^\/guide\//, "the guide"],
  [/^\/admin/, "the admin panel"],
];

export function pageLabel(path: string | null): string {
  if (!path) return "somewhere";
  const collapsed = path.replace(ID_SEGMENT, "/:id");
  if (NAMED[collapsed]) return NAMED[collapsed];
  for (const [re, label] of PATTERNS) if (re.test(collapsed)) return label;
  return path;
}

/** A visit's trail in words, with back-to-back repeats of one label folded:
 *  "reading a letter" twice in a row is one stop, not two. */
export function trailLabels(paths: string[]): string[] {
  const out: string[] = [];
  for (const p of paths) {
    const label = pageLabel(p);
    if (out[out.length - 1] !== label) out.push(label);
  }
  return out;
}
