/* ------------------------------------------------------------------ *
 *  The pressure corpus: one invented Catch-up holding every kind of
 *  content a real one can produce, and several it should survive but
 *  cannot currently be given.
 *
 *  WHY, in the owner's words (brief ¶51): "you should def create a fake
 *  catch up or two and fill it with literally every type of content we
 *  might come across and make sure it surves the most varying input.
 *  incredibly robust can be produced with only pressure testing."
 *
 *  Every direction room in /lab/catchups renders THIS as well as the two
 *  real published Editions. A layout that only ever meets 133 well-behaved
 *  answers is not a layout that has been tested; it is a layout that has
 *  been lucky. The magazine engine (track M) reads the same file.
 *
 *  INVENTED PEOPLE, INVENTED WORDS. Not one line here is a real member's.
 *  That is the whole reason this file can be committed while
 *  `scripts/dev/.exports/` cannot: rooms get the real Editions by reading
 *  the database live, which is what the owner approved (handover, owner
 *  question 5), and the repo gets only made-up text. The photographs are
 *  the app's own public Collection stills, already in `public/images/`,
 *  chosen for their shapes rather than their subjects.
 *
 *  THE CAPS ARE REAL AND THE FIXTURE RESPECTS THEM, then steps over each
 *  one on purpose. Measured in the shipped code on 2026-09-05:
 *
 *      answer body            6,000 characters   actions.ts:147
 *      photos per answer      3                  actions.ts:148
 *      question text          300 characters     actions.ts:129
 *      questions per Edition    40                 MAX_ACCEPTED_PROMPTS_PER_EDITION
 *      people per Catch-up    100                lib/catchup-caps.ts
 *      Catch-up name          80 characters      actions.ts:117
 *
 *  This matters, and it corrects the campaign's own decision D35, which
 *  asked for "an answer of 3,000 words" and "ten photos on one answer".
 *  Neither can exist: 3,000 words is about 18,000 characters against a
 *  6,000 cap, and the photo cap is three. A corpus built to impossible
 *  extremes tests a renderer against input the app cannot make, and
 *  passes over the extremes it CAN. So the rule here is: sit exactly on
 *  each cap, and include one row that breaks it, because a cap added
 *  after the fact does not shrink the rows that predate it.
 * ------------------------------------------------------------------ */

import type { CatchupExportFile, ExportedAnswer, ExportedPerson } from "@/lib/catchups-export";

/** Public Collection stills, picked for shape. Real dimensions, measured. */
const SQUARE = "/images/collection/demo-banyan-arch.webp"; //  900 x  900
const LANDSCAPE = "/images/collection/demo-banyan-canopy.webp"; // 1280 x  760
const WIDE = "/images/collection/v1.webp"; // 1200 x  800
const PORTRAIT = "/images/collection/v2.webp"; //  800 x 1100
const TALL = "/images/collection/v3.webp"; //  900 x 1300

const img = (url: string) => ({ url, file: null, bytes: null });

let seq = 0;
const id = (prefix: string) => `${prefix}-${(seq += 1).toString().padStart(3, "0")}`;

/* Every id this file has minted, because the first version of `personOf`
   stripped everything that was not a-z out of the name and two thirds of
   the cast came out sharing an id. "Member 1" through "Member 93" were all
   `px-member-`; so were all 24 wallers and all 40 of the crowd; and the
   Devanagari and Arabic names, having no a-z in them at all, were both
   `px--` -- one id for two different people, which is the one thing an id
   may never be. Nothing here rendered a warning until a room finally drew
   the corpus, and then it was 186 duplicate React keys at once. Digits
   stay in the slug now, and a collision takes a suffix. */
const usedIds = new Set<string>();

function personOf(
  name: string,
  batchYear: number | null,
  birdOverride: string | null = null
): ExportedPerson {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const base = `px-${slug || "person"}`;
  let unique = base;
  for (let n = 2; usedIds.has(unique); n += 1) unique = `${base}-${n}`;
  usedIds.add(unique);
  return { id: unique, name, batchYear, photoUrl: null, birdOverride };
}

/* The cast. Each one is here to break something specific.
   No name belongs to anybody; they are invented for their SHAPE. */
const CAST = {
  ordinary: personOf("Ravi Menon", 2011, "common-kingfisher"),
  /* 78 characters. The answer tile prints name and batch on one row; this is
     what happens when that row cannot hold the name. */
  veryLongName: personOf(
    "Padmanabhan Venkataraghavan Subramanian Krishnamoorthy Balasubramaniam III",
    1984,
    "indian-peafowl"
  ),
  /* Diacritics, a non-Latin script and a right-to-left name: three different
     ways a font stack, a `truncate` and a text-transform can each fail. */
  diacritics: personOf("Zoë Ngâm-Đứcović", 1999, "verditer-flycatcher"),
  devanagari: personOf("अनुराधा भट्टाचार्य", 2003, "spotted-owlet"),
  arabic: personOf("نور الدين الحسيني", 1996, "peregrine-falcon"),
  /* No batch year. Six real members have none (handover F1), so the tile's
     "BATCH OF '23" line has to survive its absence. */
  noBatch: personOf("Kim Park", null),
  /* One character. The other end of the name problem. */
  shortest: personOf("A", 2020, "spotted-owlet"),
} as const;

const answer = (
  author: ExportedPerson,
  body: string | null,
  extra: Partial<ExportedAnswer> = {}
): ExportedAnswer => ({
  id: id("ans"),
  author,
  body,
  images: [],
  songUrl: null,
  songTitle: null,
  songArt: null,
  hearts: [],
  createdAt: "2026-08-14T09:00:00.000Z",
  updatedAt: "2026-08-14T09:00:00.000Z",
  ...extra,
});

/** Lorem that reads like a person, because a wall of "lorem ipsum" hides the
 *  one thing long text is here to test: whether the measure and the leading
 *  survive a paragraph somebody actually wrote. */
const PARAGRAPH =
  "I went back in April for the first time since I left, and the thing that undid me was not the " +
  "buildings at all. It was the sound. That particular quiet the valley has at four in the afternoon, " +
  "before the birds start up again, which I had completely forgotten I knew. I stood by the tamarind " +
  "for a while feeling ridiculous about it. ";

/** Exactly `n` characters of it, cut on a word so the fixture is readable. */
function words(n: number): string {
  let s = "";
  while (s.length < n) s += PARAGRAPH;
  return s.slice(0, n).replace(/\s\S*$/, "");
}

const question = (
  text: string,
  kind: "text" | "photo" | "songs",
  answers: ExportedAnswer[],
  category: string | null = null
) => ({
  id: id("q"),
  author: CAST.ordinary,
  text,
  category,
  kind,
  source: "member" as const,
  showAsker: true,
  accepted: true,
  position: 0,
  createdAt: "2026-08-01T09:00:00.000Z",
  answers,
});

/* ─── the questions ──────────────────────────────────────────────────────── */

const LENGTHS = question("How has the year been?", "text", [
  answer(CAST.shortest, "Fine."),
  answer(CAST.ordinary, "🫠"),
  answer(CAST.diacritics, "😭😭😭🐦‍⬛🌳🫶🏽✨"),
  /* Exactly on the 6,000-character cap. */
  answer(CAST.veryLongName, words(6000), { hearts: ["a", "b", "c"] }),
  /* Over it. A cap added later does not shrink the rows that predate it, and a
     reader that assumes the cap will clip, scroll or crash on this one. */
  answer(CAST.devanagari, words(9000)),
  /* One word in a tile built for a paragraph: his ¶31, "only about 15% of the
     real estate is used, and the rest is just white space". */
  answer(CAST.noBatch, "Same."),
  /* Nothing at all. The app draws "Showed up for this Edition without adding
     anything here." */
  answer(CAST.arabic, null),
  /* Only whitespace, which `sharedNothing` does not currently catch. */
  answer(personOf("Whitespace Only", 2007), "   \n\n   "),
  /* A single unbroken 123-character token: the exact shape of the live Spotify
     links that push the phone layout sideways (recon.md section 0). */
  answer(
    personOf("Link Paster", 2015),
    "https://open.spotify.com/track/0000000000000000000000?si=0000000000000000&utm_source=copy-link&rowId=000000000000000000"
  ),
  /* A word with no spaces at all, which is the same failure without a url to
     blame it on. */
  answer(personOf("Supercalifragilistic", 1990), "Pneumonoultramicroscopicsilicovolcanoconiosis".repeat(4)),
  /* Markdown the composer's wire format understands, plus a mention. */
  answer(
    personOf("Formatter", 2001),
    "It was ***genuinely*** the best year, __underlined__ and ~~struck~~, ask @[Ravi Menon](px-ravi-menon)."
  ),
  /* Characters that must survive `renderRichText`'s escaping and land as text,
     not as markup. */
  answer(personOf("Angle Brackets", 2013), "<script>alert(1)</script> & \"quotes\" and 'apostrophes' <b>"),
]);

const PHOTOS = question("Show us where you are.", "text", [
  /* One of each orientation, alone. */
  answer(CAST.ordinary, "Square.", { images: [img(SQUARE)] }),
  answer(CAST.diacritics, "Landscape.", { images: [img(LANDSCAPE)] }),
  answer(CAST.noBatch, "Portrait, which is where the tile wastes the sides.", { images: [img(TALL)] }),
  /* Three portraits together: exactly the photo cap, and the case his ¶28
     describes when you swipe from a tall photo into a wide one. */
  answer(CAST.veryLongName, "Three tall ones.", {
    images: [img(PORTRAIT), img(TALL), img(PORTRAIT)],
  }),
  /* Mixed orientations in one answer: the viewer's size snap (V1). */
  answer(CAST.devanagari, "Tall, then wide, then square.", {
    images: [img(TALL), img(WIDE), img(SQUARE)],
  }),
  /* Over the cap of three. Rows written before a cap keep their photographs. */
  answer(personOf("Over The Cap", 1988), "Six, which the composer would refuse today.", {
    images: [img(SQUARE), img(LANDSCAPE), img(PORTRAIT), img(TALL), img(WIDE), img(SQUARE)],
  }),
  /* A photograph whose bytes are gone: a broken url. The renderer must draw
     something rather than an empty box with a caption under it. */
  answer(personOf("Broken Photo", 2018), "This one has lost its file.", {
    images: [{ url: "/images/collection/this-file-does-not-exist.webp", file: null, bytes: null }],
  }),
  /* Photographs with no words at all. */
  answer(CAST.shortest, null, { images: [img(LANDSCAPE)] }),
  /* A caption long enough to need the More/Less control (R14, D38). */
  answer(personOf("Long Caption", 2009), words(700), { images: [img(PORTRAIT)] }),
]);

const SONGS = question(
  "Songs you've had on repeat lately",
  "songs",
  [
    /* A Spotify link the resolver can read. */
    answer(CAST.ordinary, "Straight Line Was A Lie", {
      songUrl: "https://open.spotify.com/track/1KpAjuTO2M9eYnaGz6uoTc",
      songTitle: "Straight Line Was A Lie",
      songArt: "/images/collection/c1.webp",
    }),
    /* A YouTube link, which today's resolver does not handle at all. */
    answer(CAST.diacritics, "https://www.youtube.com/watch?v=dQw4w9WgXcQ"),
    /* A host nobody has written a resolver for. */
    answer(CAST.noBatch, "https://bandcamp.example/album/a-record-nobody-indexed"),
    /* A link that resolves to nothing: the network path that must not leave a
       skeleton on screen for ever. */
    answer(CAST.devanagari, "https://open.spotify.com/track/000000000000000000000"),
    /* A song given only as a name, which is what `namedSong` in answer-card.tsx
       exists for. */
    answer(CAST.veryLongName, "Some song whose name somebody typed instead of pasting a link"),
    /* Two links in one answer. Nothing in the app expects this and ¶50 asks for
       a preview "whenever they paste a link to a song". */
    answer(
      personOf("Two Links", 2006),
      "Both of these: https://open.spotify.com/track/3UbEemDEz6b6l5EBiswULJ and " +
        "https://www.youtube.com/watch?v=aaaaaaaaaaa"
    ),
  ],
  "songs"
);

const PHOTO_WALL = question(
  "Put up a photograph from this year.",
  "photo",
  Array.from({ length: 24 }, (_, i) =>
    answer(
      personOf(`Waller ${i + 1}`, 1990 + (i % 30), i % 3 === 0 ? "spotted-owlet" : null),
      i % 4 === 0 ? "With a caption." : null,
      { images: [img([SQUARE, LANDSCAPE, PORTRAIT, TALL, WIDE][i % 5])], hearts: i % 5 === 0 ? ["a"] : [] }
    )
  ),
  "photo-wall"
);

/* One answer only. A question section built for a grid has to look deliberate
   holding a single tile. */
const LONELY = question("Did anyone else go back this summer?", "text", [
  answer(CAST.ordinary, "I did, in April. It was very quiet."),
]);

/* Nobody answered. The reader currently prints the heading and nothing. */
const UNANSWERED = question("What are you reading?", "text", []);

/* Forty answers under one question: the widest a real Edition gets. */
const CROWDED = question(
  "Describe your month in three words.",
  "text",
  Array.from({ length: 40 }, (_, i) =>
    answer(personOf(`Crowd ${i + 1}`, 1975 + i), ["Slow. Warm. Long.", "Busy busy busy", "🌊🌊🌊", words(240)][i % 4], {
      hearts: Array.from({ length: i % 7 }, (_, h) => `h${h}`),
    })
  )
);

/* A question at exactly the 300-character cap. The reader truncates its own
   table-of-contents label at 44, so this is where that shows. */
const LONG_QUESTION = question(
  words(300),
  "text",
  [answer(CAST.ordinary, "Yes."), answer(CAST.arabic, "No.")]
);

/* ─── the file ───────────────────────────────────────────────────────────── */

export const PRESSURE_FIXTURE: CatchupExportFile = {
  version: 1,
  takenAt: "2026-09-05T00:00:00.000Z",
  source: "fixture",
  note:
    "Invented. Every kind of content a Catch-up can hold, sitting on each cap and " +
    "one row over it. No real member's words. See the header of this file.",
  catchups: [
    {
      id: "px-catchup-everything",
      groupId: "px-group-everything",
      groupName: "Every kind of thing that can go in a Catch-up, at once",
      batchYear: null,
      title: null,
      intro: "The one that has everything in it.",
      cadence: "monthly",
      status: "active",
      createdById: CAST.ordinary.id,
      nextOpensAt: "2026-10-01T04:30:00.000Z",
      pausedAt: null,
      createdAt: "2026-07-01T04:30:00.000Z",
      updatedAt: "2026-08-15T04:30:00.000Z",
      members: [
        ...Object.values(CAST).map((p, i) => ({
          ...p,
          role: i === 0 ? "admin" : "member",
          joinedAt: "2026-07-01T04:30:00.000Z",
          isKeeper: i === 0,
        })),
        /* Up to the hundred-person cap, so a members panel is judged on the
           size a batch Catch-up will actually reach. Batch of 2023 already has
           39 real members. */
        ...Array.from({ length: 93 }, (_, i) => ({
          ...personOf(`Member ${i + 1}`, 1970 + (i % 56)),
          role: "member",
          joinedAt: "2026-07-02T04:30:00.000Z",
          isKeeper: false,
        })),
      ],
      prefs: [],
      editions: [
        /* An Edition with one question. */
        {
          id: "px-edition-1",
          number: 1,
          theme: null,
          status: "published",
          questionsCloseAt: "2026-07-08T04:30:00.000Z",
          answersCloseAt: "2026-07-15T04:30:00.000Z",
          publishAt: "2026-07-16T04:30:00.000Z",
          publishedAt: "2026-07-16T04:30:00.000Z",
          remindersSent: 0,
          createdAt: "2026-07-01T04:30:00.000Z",
          questions: [LONELY],
        },
        /* Nobody wrote in. Today this still publishes and still gets promoted
           on the index as "0 people wrote in" (recon.md section 2). */
        {
          id: "px-edition-2",
          number: 2,
          theme: null,
          status: "published",
          questionsCloseAt: "2026-08-08T04:30:00.000Z",
          answersCloseAt: "2026-08-15T04:30:00.000Z",
          publishAt: "2026-08-16T04:30:00.000Z",
          publishedAt: "2026-08-16T04:30:00.000Z",
          remindersSent: 0,
          createdAt: "2026-08-01T04:30:00.000Z",
          questions: [UNANSWERED],
        },
        /* Everything else, in one Edition, which is also the longest Edition the
           reader will ever have to draw. */
        {
          id: "px-edition-3",
          number: 3,
          theme: "The one with everything in it",
          status: "published",
          questionsCloseAt: "2026-09-08T04:30:00.000Z",
          answersCloseAt: "2026-09-15T04:30:00.000Z",
          publishAt: "2026-09-16T04:30:00.000Z",
          publishedAt: "2026-09-16T04:30:00.000Z",
          remindersSent: 0,
          createdAt: "2026-09-01T04:30:00.000Z",
          questions: [LENGTHS, PHOTOS, SONGS, PHOTO_WALL, CROWDED, LONG_QUESTION],
        },
      ],
    },
    /* Two members and no Edition at all: the empty end of the range, which every
       batch Catch-up will start at on the day it is created. */
    {
      id: "px-catchup-empty",
      groupId: "px-group-empty",
      groupName: "Batch of 1961",
      batchYear: 1961,
      title: null,
      intro: null,
      cadence: "quarterly",
      status: "active",
      createdById: null,
      nextOpensAt: null,
      pausedAt: null,
      createdAt: "2026-09-01T04:30:00.000Z",
      updatedAt: "2026-09-01T04:30:00.000Z",
      members: [
        { ...CAST.ordinary, role: "member", joinedAt: "2026-09-01T04:30:00.000Z", isKeeper: false },
        { ...CAST.shortest, role: "member", joinedAt: "2026-09-01T04:30:00.000Z", isKeeper: false },
      ],
      prefs: [],
      editions: [],
    },
  ],
};
