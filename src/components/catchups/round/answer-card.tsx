/* ------------------------------------------------------------------ *
 *  <AnswerCard> - one member's answer.
 *
 *  Composition varies by what the member actually shared (text / photos /
 *  a song), so the "text cards, photo cards, song cards" rhythm the spec
 *  asks for comes from real data rather than fabricated variants.
 *
 *  Owner review 2026-07-25:
 *   - padding was ~26px while the heart was a 12px icon, so the card read
 *     as a huge box around a speck. Padding is now one symmetric LiftKit
 *     token and the heart is the app-standard `md`;
 *   - the decorative ruled-line texture behind the answer text is gone (the
 *     rules never lined up with the text baseline, which is the exact
 *     complaint that killed them on the answering page), and so is the
 *     hairline above the heart, which separated nothing;
 *   - the three-position stagger (alternating self-start/self-end at
 *     90/96/86% width) is gone. It gave every card a different left and
 *     right edge for no reason a reader could name, which read as a
 *     rendering fault rather than rhythm. One clean column now.
 *
 *  `kind` comes from `promptKind(prompt.category)` and only changes how a
 *  `songs` answer prints (see below). A `photo-wall` question never reaches
 *  this component: QuestionSection prints those as a wall.
 * ------------------------------------------------------------------ */

import Link from "next/link";
import { IdentityRow } from "@/components/common/identity-row";
import { SpotifyCard } from "@/components/catchups/round/spotify-card";
import { EntryLoveButton } from "@/components/catchups/round/entry-love-button";
import type { CatchupEntryView, CatchupSongView, PromptKind } from "@/lib/catchups-types";
import { PhotoFrame } from "@/components/common/photo-frame";
import { PhotoRows } from "@/components/common/photo-rows";
import { PhotoCarousel } from "@/components/common/photo-carousel";
import { PHOTO_SIZES_CENTERED_FULL } from "@/lib/image-cdn";
import type { StoredPhoto } from "@/lib/photo-layout";
import { cn } from "@/lib/utils";
import { renderRichText } from "@/lib/rich-text";

export type RoundEntry = CatchupEntryView & { authorMeta: string };

function AnswerPhotos({ images, photos }: { images: string[]; photos: (StoredPhoto | null)[] }) {
  /* A lone photograph used to be a "near-full-bleed hero": aspect-[16/10] on a
     phone, aspect-[21/9] above it, object-cover, centred. Which is to say a
     portrait of four friends was cut down to a letterbox of their shoulders --
     the owner, watching his own Catch-up: "all of their faces are cropped out
     and you can't see them... sometimes the catch up just shows a bunch of
     shoulders. Like, why?" It now gets the same rule as the feed and letters:
     true shape if it is square or wider, 3:4 on a bed of itself if it is
     taller, nothing cut off the sides of a face. */
  if (images.length === 1) {
    return (
      <div className="mt-[var(--space-s)]">
        {/* The bucket's own url, not an optimiser transform. A Catch-up is a
            newsletter: everyone opens the same Round within a day of each
            other, so a cold transform is not amortised across viewers the way
            a feed photo's is -- it is paid by nearly all of them at once. */}
        <PhotoFrame
          src={images[0]}
          photo={photos[0] ?? null}
          sizes={PHOTO_SIZES_CENTERED_FULL}
          fallbackClassName="aspect-[16/10] sm:aspect-[21/9]"
          className="rounded-[var(--radius-md)] border border-border"
        />
      </div>
    );
  }
  /* More than two: a carousel, the same rule the feed uses. Only legacy rows
     reach any of this -- the answer form has taken one photograph per answer
     since it shipped (`PhotoAttachments max={1}`). */
  if (images.length > 2) {
    return (
      <PhotoCarousel
        className="mt-[var(--space-s)]"
        photos={images.map((src, i) => ({ src, photo: photos[i] ?? null }))}
        sizes={PHOTO_SIZES_CENTERED_FULL}
        onOpen={() => {}}
        onPreload={() => {}}
      />
    );
  }

  /* Exactly two: justified rows, each at its true shape. They used to tile
     into squares, which is the same guillotine the lone hero applied, just
     twice at once. A pair that has not been measured keeps the squares rather
     than half a layout. */
  const shapes = photos.length === images.length && photos.every(Boolean) ? photos : null;
  if (!shapes) {
    return (
      <div className={cn("mt-[var(--space-s)] grid gap-2", images.length === 2 ? "grid-cols-2" : "grid-cols-3")}>
        {images.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={src}
            alt=""
            loading="lazy"
            className="aspect-square w-full rounded-[var(--radius-md)] border border-border object-cover"
          />
        ))}
      </div>
    );
  }
  return (
    <PhotoRows photos={shapes as StoredPhoto[]} className="mt-[var(--space-s)]">
      {(photo, i, cell) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={images[i]}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-full w-full rounded-[var(--radius-md)] border border-border object-cover"
          style={{
            aspectRatio: cell.aspectRatio,
            objectPosition: cell.objectPosition,
            maxHeight: cell.maxHeight,
          }}
        />
      )}
    </PhotoRows>
  );
}

export function AnswerCard({ entry, kind = "text" }: { entry: RoundEntry; kind?: PromptKind }) {
  const bodyText = entry.body?.trim() ?? "";
  // A `songs` question is answered with the song's NAME, and the answering
  // control saves that name in `body` (CatchupEntry has no name-only song
  // column yet - see the TODO in answer/song-attachment.tsx, and note that
  // `songTitle` is only ever written by the Spotify resolver, so it is never
  // populated for a typed name). Print it as a song row rather than as a bare
  // paragraph, otherwise a songs Round reads identically to a text Round.
  const namedSong: CatchupSongView | null =
    kind === "songs" && !entry.song && bodyText ? { url: "", title: bodyText, art: null } : null;
  const song = entry.song ?? namedSong;
  const hasBody = Boolean(bodyText) && !namedSong;
  const hasPhotos = entry.images.length > 0;
  const sharedNothing = !hasBody && !hasPhotos && !song;

  return (
    <article
      id={`entry-${entry.id}`}
      className="card-elevated w-full rounded-[var(--radius)] border border-border bg-card p-[var(--space-m)]"
    >
      <IdentityRow
        user={entry.author}
        avatarSize="sm"
        avatarHref={`/profile/${entry.author.id}`}
        avatarLabel={entry.author.name}
        name={
          <Link
            href={`/profile/${entry.author.id}`}
            className="font-semibold leading-none text-foreground hover:underline active:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {entry.author.name}
          </Link>
        }
        meta={entry.authorMeta}
      />

      {sharedNothing ? (
        <p className="mt-[var(--space-s)] text-[14.5px] italic leading-[1.7] text-muted-foreground">
          Showed up for this Round without adding anything here.
        </p>
      ) : (
        <>
          {hasBody && (
            /* renderRichText, same as posts/letters/comments: the answer box
               formats live now, so the reader has to honour the markers
               instead of printing them. */
            <p
              className="mt-[var(--space-s)] whitespace-pre-wrap text-[15px] leading-[1.7] text-foreground"
              dangerouslySetInnerHTML={{ __html: renderRichText(entry.body ?? "") }}
            />
          )}
          {hasPhotos && <AnswerPhotos images={entry.images} photos={entry.photos} />}
          {song && <SpotifyCard song={song} />}
        </>
      )}

      {/* Negative margins cancel the LoveButton's own px-2.5/py-1.5 so the
          heart optically sits on the card's padding box, not inset from it. */}
      <div className="-mb-1.5 -ml-2.5 mt-[var(--space-s)]">
        <EntryLoveButton entryId={entry.id} initialLoved={entry.lovedByViewer} initialCount={entry.loveCount} />
      </div>
    </article>
  );
}
