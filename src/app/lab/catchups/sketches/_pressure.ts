/* ------------------------------------------------------------------ *
 *  The pressure corpus, in the shape the drawing renders.
 *
 *  WHY THIS FILE EXISTS. The corpus has been on disk since S1 and nothing
 *  has ever been drawn against it. His instruction, brief para 51: "you
 *  should def create a fake catch up or two and fill it with literally
 *  every type of content we might come across and make sure it surves the
 *  most varying input. incredibly robust can be produced with only
 *  pressure testing." A layout that has only ever met 133 well-behaved
 *  answers has not been tested; it has been lucky.
 *
 *  `_fixtures/pressure.ts` is written in the EXPORT's shape, because that
 *  is the one shape a Catch-up takes when it leaves the database
 *  (`src/lib/catchups-export.ts`) and the magazine engine will read the
 *  same file. The drawing speaks `SketchEdition`. This is the only place the
 *  two meet, and it is deliberately the only adapter: one loader, two
 *  sources, so nothing in the room can be true of the real Edition and false
 *  of the fixture.
 *
 *  ONE ROUND, EIGHT QUESTIONS. The fixture holds three Editions, and the
 *  interesting shapes are spread across them: the everything Edition has the
 *  forty-answer question, the twenty-four photograph wall, the 6,000 and
 *  9,000 character answers and the 300-character question; Edition 1 has the
 *  question only one person answered; Edition 2 has the question NOBODY
 *  answered. All eight are folded into one Edition here, because every one of
 *  them is a shape the READER has to survive in a single scroll, and a room
 *  that makes you reload to see the empty one is a room nobody checks the
 *  empty one in. The Edition-level empties (an Edition with one question, a
 *  Edition nobody wrote in) belong to the cover and the home, and the shelf
 *  builder already draws those from this same Edition.
 *
 *  Nothing here is a real member's word or photograph. See the fixture's
 *  own header for why that matters and why it can be committed.
 * ------------------------------------------------------------------ */

import type { StoredPhoto } from "@/lib/photo-layout";
import { PRESSURE_FIXTURE } from "../_fixtures/pressure";
import type {
  CatchupExportFile,
  ExportedAnswer,
  ExportedPerson,
  ExportedQuestion,
} from "@/lib/catchups-export";
import { resolveMedia, stripLinks } from "./_media";
import type { SketchEntry, SketchPerson, SketchEdition } from "./_types";

/** The fixture's photographs are the app's own public stills, and the file
 *  records each one's real pixel size in a comment beside it. Carried here
 *  because a single photograph in an answer is drawn at its OWN shape
 *  (`Photographs` in _parts.tsx), so without these every one of them would
 *  be tested at the 4:3 fallback and the tall/wide cases would not be
 *  tested at all -- which is the whole reason they are in the corpus. */
const SIZES: Record<string, { width: number; height: number }> = {
  "/images/collection/demo-banyan-arch.webp": { width: 900, height: 900 },
  "/images/collection/demo-banyan-canopy.webp": { width: 1280, height: 760 },
  "/images/collection/v1.webp": { width: 1200, height: 800 },
  "/images/collection/v2.webp": { width: 800, height: 1100 },
  "/images/collection/v3.webp": { width: 900, height: 1300 },
};

function photoOf(img: { url: string; width?: number | null; height?: number | null }): StoredPhoto | null {
  /* A file that carries its own pixel size (the exporter writes it since
     the magazine work) wins over the table above, which only knows the
     five public stills. */
  const size = img.width && img.height ? { width: img.width, height: img.height } : SIZES[img.url];
  if (!size) return null;
  return { ...size, focalX: 0.5, focalY: 0.5, blurDataUrl: null };
}

function person(p: ExportedPerson, isKeeper: boolean): SketchPerson {
  return {
    id: p.id,
    name: p.name,
    batchYear: p.batchYear,
    batchLine: p.batchYear ? `Batch of ${p.batchYear}` : "Member",
    photoUrl: p.photoUrl,
    birdOverride: p.birdOverride,
    isKeeper,
  };
}

/** Stable per id, 0 to 4, the same rule the live loader uses so the replies
 *  control is exercised here too. */
function inventedCommentCount(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const n = h % 7;
  return n < 3 ? 0 : n - 2;
}

async function entryOf(
  a: ExportedAnswer,
  keeperId: string | null,
): Promise<SketchEntry> {
  const media = await resolveMedia(a.body);
  return {
    id: a.id,
    author: person(a.author, a.author.id === keeperId),
    body: a.body,
    images: a.images.map((i) => i.url),
    photos: a.images.map((i) => photoOf(i)),
    song: a.songUrl
      ? { url: a.songUrl, title: a.songTitle ?? a.songUrl, art: a.songArt }
      : null,
    media,
    text: stripLinks(a.body),
    loveCount: a.hearts.length,
    lovedByViewer: false,
    createdAt: a.createdAt,
    commentCount: inventedCommentCount(a.id),
  };
}

async function questionOf(q: ExportedQuestion, keeperId: string | null) {
  const asker = q.author ? person(q.author, q.author.id === keeperId) : null;
  return {
    id: q.id,
    text: q.text,
    kind: q.kind as "text" | "photo" | "songs",
    source: q.source,
    showAsker: q.showAsker,
    asker,
    /* The same rule the live loader applies: only a member-written question
       names its asker, and only when they let it. */
    askedBy: q.source === "member" && q.showAsker && asker ? asker.name : null,
    entries: await Promise.all(q.answers.map((a) => entryOf(a, keeperId))),
  };
}

/** The corpus as one Edition the reader can be driven through. */
export async function loadPressureEdition(
  file: CatchupExportFile = PRESSURE_FIXTURE,
): Promise<SketchEdition | null> {
  const catchup = file.catchups.find((c) => c.editions.length > 0);
  if (!catchup) return null;
  const keeperId = catchup.createdById;

  /* Newest Edition first, so the everything Edition's questions lead and the
     two single-question Editions fall in behind them. */
  const editions = [...catchup.editions].sort((a, b) => b.number - a.number);
  const questions = await Promise.all(
    editions.flatMap((r) => r.questions).map((q) => questionOf(q, keeperId)),
  );

  const members = catchup.members.map((m) => person(m, m.isKeeper));
  const contributors: SketchPerson[] = [];
  const seen = new Set<string>();
  for (const q of questions) {
    for (const e of q.entries) {
      if (seen.has(e.author.id)) continue;
      seen.add(e.author.id);
      contributors.push(e.author);
    }
  }

  const newest = editions[0];
  return {
    catchupId: catchup.id,
    catchupName: catchup.title ?? catchup.groupName,
    number: newest.number,
    publishedAt: newest.publishedAt ?? newest.createdAt,
    nextOpensAt: catchup.nextOpensAt,
    cadence: catchup.cadence,
    members,
    contributors,
    questions,
    viewer: members[0],
  };
}
