/* ------------------------------------------------------------------ *
 *  The published Edition, as both readers see it.
 *
 *  An Edition is read on two surfaces — inline on the Catch-up home
 *  (`[catchupId]/page.tsx`) and at its own permalink
 *  (`edition/[editionId]/page.tsx`) — and until this file existed each of
 *  them carried its own copy of the heavy query, the anonymity mapping
 *  and the song rule. `loadPublishedIssue`'s docblock admitted it in so
 *  many words: "Mirrors the heavy query in edition/[editionId]/page.tsx".
 *
 *  They had already drifted. The permalink printed a song as soon as it
 *  had a NAME for one; the home printed one only when a URL was stored,
 *  so an entry whose Spotify resolution had failed soft showed a song on
 *  one page and nothing on the other. That is the same shape as C-019,
 *  where two renderers disagreed about anonymity on these very pages, and
 *  it is why the rules live here now rather than being kept in step by
 *  hand. The permalink's song rule is the one that survived: it is the
 *  later of the two and the only one that was ever argued for in a
 *  comment.
 *
 *  SECRECY, and the reason this is a loader and not a component: answer
 *  bodies must never be pulled into a server render of an Edition that has
 *  not revealed yet, Keeper included (spec 2.5, threat T-catchups-04).
 *  Both callers confirm a FRESH `published` status before they call this,
 *  and this function does not check it for them — it is the heavy read
 *  itself, so anything that calls it has already decided the Edition is
 *  public. A future surface that wants Edition contents must make the same
 *  decision first; there is no other gate below this line.
 * ------------------------------------------------------------------ */

import { prisma } from "@/lib/prisma";
import { photoFactsFor } from "@/lib/image-record";
import { askerVisible } from "@/lib/catchups-core";
import type {
  CatchupEntryView,
  CatchupPersonRef,
  CatchupPromptView,
  PromptCategory,
  PromptSource,
} from "@/lib/catchups-types";
import { batchLine, parseJsonArray } from "@/lib/utils";
import { IDENTITY_SELECT } from "@/lib/people-select";

/**
 * One member's answer, as both readers receive it: the stored row plus the
 * byline this app prints under a name everywhere else.
 *
 * It used to live in `edition/answer-card.tsx` and be imported back up here by
 * the loader that produces it, which is upside down -- and it outlived that
 * component, which build phase 8 deleted when the reader was rebuilt from the
 * front runner. A type belongs with the function that makes one.
 */
export type EditionEntry = CatchupEntryView & { authorMeta: string };

export type PublishedEditionView = {
  number: number;
  publishedAt: Date | null;
  sections: Array<{ prompt: CatchupPromptView; entries: EditionEntry[] }>;
};

const toPersonRef = (u: {
  id: string;
  name: string;
  photoUrl: string | null;
  birdOverride?: string | null;
}): CatchupPersonRef => ({
  id: u.id,
  name: u.name,
  photoUrl: u.photoUrl,
  birdOverride: u.birdOverride,
});

/**
 * Every question and answer in a published Edition, with this viewer's hearts
 * resolved. Null when the Edition row is gone: the home renders nothing, the
 * permalink calls `notFound()`.
 */
export async function loadPublishedEditionView(
  editionId: string,
  viewerId: string
): Promise<PublishedEditionView | null> {
  const edition = await prisma.catchupEdition.findUnique({
    where: { id: editionId },
    select: {
      number: true,
      publishedAt: true,
      prompts: {
        where: { accepted: true },
        /* A createdAt tie-break, so two questions that end up sharing a
           position (a pair submitted in the same instant) still render in a
           stable, sensible order rather than shuffling between renders
           (audit Lows 27/34/57). */
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          text: true,
          category: true,
          source: true,
          showAsker: true,
          accepted: true,
          position: true,
          author: { select: IDENTITY_SELECT },
          entries: {
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              promptId: true,
              body: true,
              images: true,
              songUrl: true,
              songTitle: true,
              songArt: true,
              createdAt: true,
              author: {
                /* No `verifyState`, deliberately, and the same omission the
                   letter page argues for at `letters/[id]/(read)/page.tsx`:
                   this byline is `batchLine(e.author)` and never draws a
                   verified leaf, so the column would be fetched and dropped.
                   Hence not `AUTHOR_CARD_SELECT`, which carries it. */
                select: {
                  ...IDENTITY_SELECT,
                  accountType: true,
                  batchType: true,
                  batchYear: true,
                },
              },
              _count: { select: { loves: true } },
              loves: { where: { userId: viewerId }, select: { id: true } },
            },
          },
        },
      },
    },
  });
  if (!edition) return null;

  /* Every photograph in the Edition, measured in one query rather than one per
     answer: shape, focal point, and the smear that holds its place. Without
     these a single Catch-up photograph was letterboxed to 21:9 and a portrait
     of a group of friends came out as a row of shoulders. */
  const photos = await photoFactsFor(
    edition.prompts.flatMap((p) => p.entries.flatMap((e) => parseJsonArray(e.images)))
  );

  const sections = edition.prompts.map((p) => {
    /* Not `p.showAsker || keeper`, which is what the permalink said until
       2026-08-21: a Keeper saw the name behind every anonymous question, in
       the Edition the whole group reads, with no cue that it had been asked
       anonymously (audit M10). The home page had always got it right, and the
       two were reconciled onto this one function — which is now called once
       rather than from each page. */
    const revealAsker = askerVisible(
      { showAsker: p.showAsker, authorId: p.author?.id ?? null },
      viewerId
    );
    const prompt: CatchupPromptView = {
      id: p.id,
      text: p.text,
      category: p.category as PromptCategory | null,
      source: p.source as PromptSource,
      showAsker: p.showAsker,
      accepted: p.accepted,
      position: p.position,
      // A null author is a member who has since left, or an asker who deleted
      // their account. The question stays in the Edition — it is what everyone
      // else answered — and the byline goes.
      asker: revealAsker && p.author ? toPersonRef(p.author) : null,
      /* And the reading a page prints, decided here rather than in a
         component, because `askerVisible` above is the only thing entitled to
         say who may be named. `revealAsker` is true for a public question and
         for your own anonymous one, so `showAsker` is what separates the two;
         with neither, nobody is named and the page says the question was asked
         anonymously, which is the cue a bare question was missing. */
      askerReading:
        revealAsker && p.author
          ? p.showAsker
            ? { kind: "named", id: p.author.id, name: p.author.name }
            : { kind: "you-anonymous" }
          : p.showAsker
            ? null
            : { kind: "anonymous" },
    };
    const entries: EditionEntry[] = p.entries.map((e) => {
      // The songUrl/songTitle/songArt trio is Spotify-shaped: `songTitle` is
      // only ever written by the oembed resolver, so it carries rows from the
      // old per-question "paste a Spotify link" field. A song is worth
      // printing as soon as we have a name for it, hence the fall back to the
      // raw URL when resolution failed soft. `url: ""` is the signal to
      // SpotifyCard to render an unlinked row.
      //
      // The NEW `songs` prompt kind does not write here at all: it saves the
      // typed song name in `body` (see the TODO in answer/song-attachment.tsx
      // naming the `CatchupEntry.songs Json?` column that would lift it to
      // five). AnswerCard reads `kind` and prints that body as a song row.
      const songTitle = e.songTitle?.trim() || e.songUrl?.trim() || null;
      const images = parseJsonArray(e.images);
      return {
        id: e.id,
        promptId: e.promptId,
        author: toPersonRef(e.author),
        authorMeta: batchLine(e.author),
        body: e.body,
        images,
        photos: images.map((url) => photos.get(url) ?? null),
        song: songTitle ? { url: e.songUrl ?? "", title: songTitle, art: e.songArt } : null,
        loveCount: e._count.loves,
        lovedByViewer: e.loves.length > 0,
        createdAt: e.createdAt,
      };
    });
    return { prompt, entries };
  });

  return { number: edition.number, publishedAt: edition.publishedAt, sections };
}
