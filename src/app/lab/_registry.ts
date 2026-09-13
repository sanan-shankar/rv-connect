/* ------------------------------------------------------------------ *
 *  The lab registry.
 *
 *  Every dev/lab route in the app that lives outside the real
 *  product, (main) and (auth), gets exactly one entry here. This is the
 *  fix for the owner's complaint (2026-07-30): rooms under /preview/delight
 *  were invisible from /preview/delight/second-look and vice versa, and
 *  routes like /preview/logo had no index at all.
 *
 *  Resolved in two steps. First `/lab` became the one index. Then the whole
 *  /preview tree was MOVED here (2026-07-30, owner: "I don't want preview to
 *  exist anymore ... everything should be under lab"), flattened so that
 *  "delight" and "second-look" survive only as the group headings below and
 *  not as URL segments. /preview is gone; its URLs are not redirected.
 *
 *  `/lab` (./page.lab.tsx) renders this list; nothing may be reachable on
 *  disk that is not also reachable from here.
 *
 *  EVERY ROOM'S FILE IS `page.lab.tsx`, NOT `page.tsx`. That suffix is on
 *  `pageExtensions` in next.config.ts for every build except the public
 *  demo's, which is how the lab leaves the demo's build and only the demo's
 *  (owner, 2026-09-08, question 23). Name a new room `page.tsx` and it works
 *  perfectly here and quietly ships to a deployment where /lab is closed.
 *  `scripts/qa/lab-audit.mjs` refuses either mistake.
 *
 *  `scripts/qa/lab-audit.mjs` proves that both directions hold: every
 *  page file on disk has a row below, and every href below points at a
 *  real one. Add the row in the SAME change that adds the page.
 *
 *  Adding a room: append an entry. Retiring one: flip its status to
 *  "archived" rather than deleting the row (or the file) so history
 *  stays visible instead of silently vanishing again.
 *
 *  A room with URL-nested sub-pages (an overview plus /lab/room/x pages)
 *  lists them as `children` on the overview entry, so /lab shows ONE
 *  card per room with the sub-pages tucked under it (owner, 2026-07-30:
 *  "groups rethink is showing as 5 different pages. It should just show
 *  as one page the overview and the rest are there under that").
 *  Children keep the `href:` key name: scripts/qa/lab-audit.mjs regexes
 *  every href out of this file, so a child under any other key would be
 *  reported as stranded.
 * ------------------------------------------------------------------ */

export type LabStatus = "active" | "archived";

export type LabGroup =
  | "Delight"
  | "Second look"
  | "Profiles"
  | "Brand"
  | "Tools";

/** A sub-page of a room: reachable from its parent's card, never its own card. */
export interface LabChildEntry {
  href: string;
  title: string;
  /** one honest line, surfaced as the link's tooltip rather than card copy */
  note: string;
}

export interface LabEntry {
  href: string;
  title: string;
  group: LabGroup;
  status: LabStatus;
  /** one honest line: what this room is actually for */
  note: string;
  /** URL-nested sub-pages, folded under this card (archived with it) */
  children?: LabChildEntry[];
}

/** display order for the group sections on /lab */
export const GROUP_ORDER: LabGroup[] = [
  "Delight",
  "Second look",
  "Profiles",
  "Brand",
  "Tools",
];

export const REGISTRY: LabEntry[] = [
  /* ---------------------------------------------------------------- *
   *  Delight, the general motion + concept lab
   *
   *  Six rooms below ship with status "archived": the owner archived
   *  them from /lab itself (2026-07-30) while the state still lived in
   *  archive-overrides.json. When that file was replaced by the
   *  LabRoomState table those choices were folded in here as the
   *  committed defaults, so they hold even before the table has rows.
   * ---------------------------------------------------------------- */
  {
    href: "/lab/transitions",
    title: "Navigation & transitions",
    group: "Delight",
    status: "archived",
    note: "The sliding sidebar marker, the seg thumb, content cross-fade between views, the landing-to-login lateral pass, and a coordinated first paint.",
  },
  {
    href: "/lab/composer",
    title: "The composer, reworked",
    group: "Delight",
    status: "archived", // owner archive choice, folded in from archive-overrides.json
    note: "A slim pill that unfurls: photo, poll and letter tucked away, no tag walls, bold/italic/underline/strike, click outside to close.",
  },
  {
    href: "/lab/feed-canvas",
    title: "Feed canvas",
    group: "Delight",
    status: "active",
    note: "Making the feed feel full: eleven right-rail modules to choose from with a recommended stack, four fixes for the empty top-right rectangle, and the account-type colour call.",
  },
  {
    href: "/lab/landing",
    title: "The living valley (landing)",
    group: "Delight",
    status: "active",
    note: "A calm photo hero, then a living section: leaves with real veins the cursor parts, and legged birds that walk, peck and hop between frames.",
  },
  {
    href: "/lab/feedback",
    title: "Feedback moments",
    group: "Delight",
    status: "active",
    note: "A smoother heart, an even bookmark that tucks, share without the wiggle, RSVP, poll bars, the bell dot, fund progress, a better chirp.",
  },
  {
    href: "/lab/loading",
    title: "Loading states",
    group: "Delight",
    status: "active",
    note: "Warm valley shimmer that loops clean, leaves that settle on hand-off, the Letters draw-on, a bird crossing the skeleton rows.",
  },
  {
    href: "/lab/loading-ideas",
    title: "Loading, ideas round 2",
    group: "Delight",
    status: "active",
    note: "Richer living loading scenes to choose from before building: sports-day athletes, foraging birds, one reusable relay, sleepers that wake.",
  },
  {
    href: "/lab/eggs",
    title: "Easter eggs & ambient",
    group: "Delight",
    status: "active",
    note: "Hover the logo for a valley fact, the konami valley flash, and an honest note on what actually shipped versus what was parked.",
  },
  {
    href: "/lab/mascot-moments",
    title: "Mascot moments",
    group: "Delight",
    status: "active",
    note: "Ideas catalogue for where the hoopoe appears across the product (guided tour, login fly-in, empty states, loading, a 404, quiet easter eggs); five ideas carry a live mini-demo.",
  },
  {
    href: "/lab/landings",
    title: "Landing page concepts",
    group: "Delight",
    status: "active",
    note: "Five full-page directions for the public landing redesign (Postcard, Notice Board, Prospectus, Living Valley, Clarity), all pulling the same approved copy; append ?v=<key> to deep-link a concept.",
  },
  {
    href: "/lab/hoopoe",
    title: "The hoopoe mascot control room",
    group: "Delight",
    status: "active",
    note: "Drives the real Hoopoe rig and controller through every expression, gaze, cover/peek and crest fold so the whole cast can be judged in one place.",
  },
  {
    href: "/lab/crop",
    title: "What we do to a photograph",
    group: "Delight",
    status: "active",
    note: "Every shape somebody can post, twice: the photograph as it arrived with the part we remove shaded out, and the post as it actually renders. Plus two, three and four together. Throwaway: delete it, public/lab/crop/ and this row once the rules are settled.",
  },
  {
    href: "/lab/new-post",
    title: "The bird in the button",
    group: "Delight",
    status: "active",
    note: "The pill above the feed is gone and your own bird sits in the New post button instead. Press it: two ways the composer opens, in place at the top of the feed or as a sheet, with the bird flying out to meet it and the post landing where you wrote it.",
  },
  {
    href: "/lab/collection",
    title: "An archive with something in it",
    group: "Delight",
    status: "active",
    note: "The rebuilt Collection page, live, against 240 made-up photographs -- the real one holds two. Press a bucket and watch the underline glide, press a decade on the right-hand rail whose marks are how many each holds, or switch the order to Chronological and scroll past the decades.",
    children: [
      {
        href: "/lab/collection/scrub",
        title: "Four ways to say hold this",
        note: "SIGNPOST WON (2026-09-13) and is on /collection now, staying put, with tap-to-open off. The room stays as the record: four faces to flick between on the real 240-photograph river -- two lines you grip, the year itself riding the edge, a bead on a thread, and a ruler you can grab anywhere. The three he did not pick are still here to hold against the one he did.",
      },
      {
        href: "/lab/collection/swap",
        title: "Nothing until everything",
        note: "The caret between the two halves. The title turns over, a small mark holds the place while the page is genuinely fetched and decoded, and then the photographs arrive whole instead of filling in. Today's swap sits beside it, reproduced beat for beat including its half second of grey.",
      },
    ],
  },
  {
    href: "/lab/catchups/sketches",
    title: "The strip is the navigator",
    group: "Delight",
    status: "active",
    note: "The Catch-ups front runner, live: the real Edition on a phone, where the strip under the green bar takes each question as its heading leaves and unfolds into the list when tapped. Five stills of moments deep in the page, the navigator drawn three ways, and the same page at 1512. ?w=reader|screens|laptop.",
  },
  {
    href: "/lab/catchups/settings",
    title: "The settings are a description",
    group: "Delight",
    status: "active",
    note: "The Catch-up settings list with the beige tiles taken out, and every dialog it opens drawn beside it. Name, Picture and Rhythm are the same three rows for everybody -- who you are decides which of them press -- so your batch's panel is no longer one lonely row. Three cases side by side, the phone sheet with an X instead of a grabber, and the four confirmations together.",
  },
  {
    href: "/lab/catchups/wall",
    title: "A wall is not a contact sheet",
    group: "Delight",
    status: "active",
    note: "The photo-wall question, which has existed since Catch-ups was built and has never been drawn. Three shapes to flick between: a run that moves sideways, a drift down the column with each person in the margin, and a stack you move through one at a time. Change the wall under them: one photograph, three, twenty-four, all portrait, two hundred.",
  },
  {
    href: "/lab/catchups/swipe",
    title: "The swipe that goes back two",
    group: "Delight",
    status: "active",
    note: "His: from the last photograph, one swipe back lands on the first. Six attempts on a dev machine could not reproduce it, so this puts the instrument on his own device — the real photographs, the real shared viewer, and a trace of every finger and every change of picture.",
  },
  {
    href: "/lab/reach",
    title: "Where the bird goes",
    group: "Delight",
    status: "active",
    note: "The Get in touch sheet rebuilt as a calling card, four ways. Its tiles were paper on a white float, which is warmth climbing the surface ladder instead of sinking down it, so the boxes are gone and the rows sit on the panel with a copy button each. What is left to decide is the bird: on the green band behind a cream disc, on paper under a printed edge, centred at 64 as a portrait, or dropped so the band can keep the green.",
  },
  {
    href: "/lab/viewer",
    title: "The photograph owns the screen",
    group: "Delight",
    status: "archived", // owner archive choice, folded in from archive-overrides.json
    note: "The rebuilt viewer, live. Edge to edge, chrome that leaves when you stop moving, and a caption you press open where the separate photo page used to be. Archive photographs with buckets, a heart and a delete; a post's three with its counter.",
  },

  /* ---------------------------------------------------------------- *
   *  Second look, the "this already looked fine" audit
   * ---------------------------------------------------------------- */
  {
    href: "/lab/craft",
    title: "Why the sidebar looks 1080p",
    group: "Second look",
    status: "archived", // owner archive choice, folded in from archive-overrides.json
    note: "Idle nav text runs at 70% alpha of white over green (4.31:1 contrast); the same colour fails AA 568 times across the app. Live fixes on the real sidebar specimen.",
  },
  {
    href: "/lab/spine",
    title: "Six different left edges",
    group: "Second look",
    status: "archived", // owner archive choice, folded in from archive-overrides.json
    note: "Every page header looks reasonable alone; side by side, eleven routes use six different left edges, 224px apart end to end.",
  },
  {
    href: "/lab/support",
    title: "The ask that argues against itself",
    group: "Second look",
    status: "active",
    note: "A progress bar drawn near-flat against its own card, animated with a count-up that counts to zero, above a caption saying it does not matter if it never fills.",
  },
  {
    href: "/lab/focus",
    title: "Eleven rings, and the five worth choosing between",
    group: "Delight",
    status: "active",
    note: "The same four text fields in five columns, one focus treatment per column. Click in, Tab down, pick one; field-focus.ts becomes it.",
  },
  {
    href: "/lab/support-ideas",
    title: "Four ways to ask",
    group: "Delight",
    status: "active",
    note: "Four full rebuilds of the Support page (Plate, Aviary, Days, Stamps); append ?v=<key> to deep-link. Aviary renders the PARKED solid-plus-birds design via the shared SupportWood (src/components/support/wood.tsx), which is lab-only: nothing on /support mounts it.",
  },
  {
    href: "/lab/everything",
    title: "Everything else",
    group: "Second look",
    status: "active",
    note: "76 findings from one read-through across nine surfaces: actually broken, working but never decided, and genuinely good, all filterable.",
  },
  {
    href: "/lab/tiles",
    title: "When a box earns its border",
    group: "Second look",
    status: "active",
    note: "Four gates decide whether a border is earned; scores eight real surfaces against them, a feed post passes 4 of 4 while a Catch-up row passes 1.",
  },
  {
    href: "/lab/type",
    title: "The font question",
    group: "Second look",
    status: "archived", // owner archive choice, folded in from archive-overrides.json
    note: "Five live type pairings measured off the actual font binaries, arguing Libre Baskerville is a body face currently doing display work.",
  },
  {
    href: "/lab/directory",
    title: "The directory, reconsidered",
    group: "Second look",
    status: "active",
    note: "The filter bar cannot hold its shape: a flex-wrap row with an ml-auto group grows from 40px to 142px as you set filters, and leaves 275px of void mid-line. Four live chrome concepts, five maps judged on how many objects they put on screen at 2400 members, and the finding that the Profession facet matches 0 of 21 members.",
  },
  {
    href: "/lab/spine-marker",
    title: "One unit, six ways",
    group: "Second look",
    status: "active",
    note: "Six fused treatments for the sidebar's active-row marker, answering the owner's 2026-07-30 complaint that the pill and its cinnamon bar read as two unrelated shapes. F is the owner's own (2026-08-03): the bar grown to full pill height, flush, filled, its concave right edge carved by the pill's own cap. Visit directly.",
  },

  /* ---------------------------------------------------------------- *
   *  Profiles
   * ---------------------------------------------------------------- */
  {
    href: "/lab/profiles",
    title: "Profile page concepts",
    group: "Profiles",
    status: "active",
    note: "Nine directions for the profile redesign (letterhead, letterhead II, letterhead III, field guide, editorial, dossier, broadsheet, passport, terrace) reviewed against one realistic mock alumnus; append ?v=<key> to deep-link a concept. Letterhead III is the current one: the shipped sheet plus the 2026-08-02 tweaks (occupation as a fourth fact, facts on the app's 15px body rung, a bigger colophon number, a stamp that finds the sheet's whitespace, no engraved rule) and a ?chain=<key> switcher over the six house-chain treatments.",
  },
  {
    href: "/lab/chain-lines",
    title: "The colour handoff",
    group: "Profiles",
    status: "active",
    note: "The chain's arrows became lines that carry one house's colour into the next, and the first pass looked flat. Six ways to draw only the line (thread, garland, baton, stitch, rings, wash) on the real nine-house chain, with a width slider to make each one curl. Thread shipped 2026-08-19 and the owner reversed it on 2026-08-21: the profile chain is arrows again. Kept as the record of what a headless connector looks like at six weights.",
  },

  /* ---------------------------------------------------------------- *
   *  Brand: the logo, the bird set, and the early shell directions
   * ---------------------------------------------------------------- */
  {
    href: "/lab/v2",
    title: "The v2 system reference",
    group: "Brand",
    status: "active",
    note: "The approved look the rest of the redesign matches (see CLAUDE.md): the full app shell, feed, and chrome built from the current tokens.",
  },
  {
    href: "/lab/grove",
    title: "Three shell directions, feed view",
    group: "Brand",
    status: "active",
    note: "Dynamic harness (/lab/[dir], valid keys grove | almanac | canopy) rendering one of three early competing shell/feed directions; predates the v2 system that was eventually chosen. Example shown: grove.",
    children: [
      {
        href: "/lab/grove/auth",
        title: "Login view",
        note: "The same three-direction harness (/lab/[dir]/auth), the login screen for whichever key is in the URL. Example shown: grove.",
      },
    ],
  },
  {
    href: "/lab/birds-bg",
    title: "Bird avatar background treatments",
    group: "Brand",
    status: "active",
    note: "Dev harness comparing three avatar background treatments (no background, outline halo, small-in-circle) across all 26 archetypes plus the tricky pale/dark birds; the shipped avatars use no background, so this documents that call.",
  },
  {
    href: "/lab/birds-rv",
    title: "The birds of the valley",
    group: "Brand",
    status: "active",
    note: "Public-facing gallery of the full deterministic alumni bird set, one glyph per species by index, named from the same list the app uses so it can never drift.",
  },
  {
    href: "/lab/centroid",
    title: "Bird glyph centroid probe",
    group: "Brand",
    status: "active",
    note: "Dev-only render target for scripts/dev/centroid.mjs (npm run dev:centroid): one bird glyph alone at 600x600 so the script can compute its true pixel centroid for optical centering.",
  },
  {
    href: "/lab/logo",
    title: "The logo, in context",
    group: "Brand",
    status: "active",
    note: "The selected two-plane PeaksMark, shown standalone and in its real lockup contexts (sidebar green, light surface, photo overlay). Current reference.",
  },
  {
    href: "/lab/glass-edges",
    title: "The line Apple draws inside our icon",
    group: "Brand",
    status: "active",
    note: "Recreating the per-shape edge light iOS puts inside an app icon (bright line on the upper contour, dark on the lower, shadow cast down), measured off a home-screen screenshot and rebuilt as one SVG filter applied per path.",
  },
  {
    href: "/lab/hoopoe-marks",
    title: "If the bird were the logo",
    group: "Brand",
    status: "active",
    note: "Ten identity directions built off the hoopoe instead of the ridge, with the product renamed Hoopoe: crest, profile head, face, feather, roundel, wing bars, monogram, extreme crop. Each as an app icon on a light and a dark ground down to 16px, plus its sidebar lockup.",
  },
  {
    href: "/lab/icon-directions",
    title: "The green has to be in the hills, not behind them",
    group: "Brand",
    status: "active",
    note: "Eight fresh directions for the app icon after the blue/cream/cinnamon version shipped and read like a flag, each shown on a light ground and a dark one down to 16px, plus three sidebar lockup structures.",
  },
  {
    href: "/lab/icon-colours",
    title: "The app icon, in the site's own colours",
    group: "Brand",
    status: "active",
    note: "The icon's three hills repainted in the green, the cinnamon and the blue the rest of the site uses, in every order worth seeing, on paper / white / sidebar green / dark tiles and down at 32px and 16px.",
  },
  {
    href: "/lab/logos",
    title: "Logo options (early)",
    group: "Brand",
    status: "archived",
    note: "Six early non-bird mark directions (wordmark only, monogram, valley + hills, feather, leaf, outline monogram) to choose from. Valley + hills won and is now PeaksMark, documented live at /lab/logo.",
  },

  /* ---------------------------------------------------------------- *
   *  Tools: dev-only utilities, not design rooms
   * ---------------------------------------------------------------- */
  {
    href: "/lab/location-picker",
    title: "Location picker harness",
    group: "Tools",
    status: "active",
    note: "Dev harness for the shared LocationPicker against the live GeoNames search endpoint, both single and multi mode, with the raw controlled state visible for testing.",
  },

  /* ---------------------------------------------------------------- *
   *  Groups rethink: one archived room. Its four concept pages are
   *  children of the overview (the owner's exact complaint about five
   *  cards), which dissolved the single-purpose "Groups rethink" group;
   *  the one card lives in Delight, the general concept lab.
   * ---------------------------------------------------------------- */
  {
    href: "/lab/groups-rethink",
    title: "Groups rethink, overview",
    group: "Delight",
    status: "archived",
    note: "Index and comparison matrix for four static concepts answering 'what should Groups become'. The Groups feature was removed from the app entirely, so this whole tree is superseded.",
    children: [
      {
        href: "/lab/groups-rethink/circles",
        title: "Concept A: Circles for Catch-ups",
        note: "Groups vanish as a noun; a Circle is just the invisible plumbing a Catch-up runs on.",
      },
      {
        href: "/lab/groups-rethink/batches-interest",
        title: "Concept B: Batches + Special Interest",
        note: "Two space types, neither user-created: an auto Batch plus a short admin-curated interest shelf like Burdens of RV.",
      },
      {
        href: "/lab/groups-rethink/dissolve",
        title: "Concept C: Groups dissolve away",
        note: "No groups surface at all; batches and places move into the Directory, cohorts into a Feed filter, Catch-ups onto the batch itself.",
      },
      {
        href: "/lab/groups-rethink/gatherings",
        title: "Concept D: Gatherings (synthesis)",
        note: "Batch rooms plus a curated Gatherings shelf plus threshold Places in the Directory, one demoted nav entry. The recommended concept.",
      },
    ],
  },
];
