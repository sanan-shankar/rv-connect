/* ------------------------------------------------------------------ *
 *  The published Round, as both readers see it.
 *
 *  A Round is read on two surfaces — inline on the Catch-up home
 *  (`[catchupId]/page.tsx`) and at its own permalink
 *  (`round/[editionId]/page.tsx`) — and until this file existed each of
 *  them carried its own copy of the heavy query, the anonymity mapping
 *  and the song rule. `loadPublishedIssue`'s docblock admitted it in so
 *  many words: "Mirrors the heavy query in round/[editionId]/page.tsx".
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
 *  bodies must never be pulled into a server render of a Round that has
 *  not revealed yet, Keeper included (spec 2.5, threat T-catchups-04).
 *  Both callers confirm a FRESH `published` status before they call this,
 *  and this function does not check it for them — it is the heavy read
 *  itself, so anything that calls it has already decided the Round is
 *  public. A future surface that wants Round contents must make the same
 *  decision first; there is no other gate below this line.
 * ------------------------------------------------------------------ */

import { prisma } from "@/lib/prisma";
import { askerVisible } from "@/lib/catchups";
import type {
  CatchupPersonRef,
  CatchupPromptView,
  PromptCategory,
  PromptSource,
} from "@/lib/catchups-types";
import type { RoundEntry } from "@/components/catchups/round/answer-card";
import { batchLine, parseJsonArray } from "@/lib/utils";
import { IDENTITY_SELECT } from "@/lib/people-select";

export type PublishedRoundView = {
  number: number;
  publishedAt: Date | null;
  sections: Array<{ prompt: CatchupPromptView; entries: RoundEntry[] }>;
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
 * Every question and answer in a published Round, with this viewer's hearts
 * resolved. Null when the Round row is gone: the home renders nothing, the
 * permalink calls `notFound()`.
 */
export async function loadPublishedRoundView(
  editionId: string,
  viewerId: string
): Promise<PublishedRoundView | null> {
  const round = await prisma.catchupEdition.findUnique({
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
                select: {
                  id: true,
                  name: true,
                  photoUrl: true,
                  birdOverride: true,
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
  if (!round) return null;

  const sections = round.prompts.map((p) => {
    /* Not `p.showAsker || keeper`, which is what the permalink said until
       2026-08-21: a Keeper saw the name behind every anonymous question, in
       the Round the whole group reads, with no cue that it had been asked
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
      // their account. The question stays in the Round — it is what everyone
      // else answered — and the byline goes.
      asker: revealAsker && p.author ? toPersonRef(p.author) : null,
    };
    const entries: RoundEntry[] = p.entries.map((e) => {
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
      return {
        id: e.id,
        promptId: e.promptId,
        author: toPersonRef(e.author),
        authorMeta: batchLine(e.author),
        body: e.body,
        images: parseJsonArray(e.images),
        song: songTitle ? { url: e.songUrl ?? "", title: songTitle, art: e.songArt } : null,
        loveCount: e._count.loves,
        lovedByViewer: e.loves.length > 0,
        createdAt: e.createdAt,
      };
    });
    return { prompt, entries };
  });

  return { number: round.number, publishedAt: round.publishedAt, sections };
}
