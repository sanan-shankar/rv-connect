/* ------------------------------------------------------------------ *
 *  <AnswerCard> - one member's answer, in the staggered card kit (spec 3.6).
 *
 *  Composition varies by what the member actually shared (text / photos /
 *  a song), so the "text cards, photo cards, Spotify cards" rhythm the spec
 *  asks for comes from real data rather than fabricated variants. What THIS
 *  component adds on top is the stagger: a three-position alternating
 *  alignment + width rotation (`STAGGER` below) so the stack itself has
 *  visual rhythm even when every entry is a plain text answer.
 *
 *  "Ruled sheet": a faint repeating horizontal-line texture behind the
 *  answer text, evoking notebook paper (DESIGN-SYSTEM Appendix A: naturalist
 *  field-journal, not a flat card). It is decorative texture, not literal
 *  writing guides, so it is not pinned to the text's exact line box.
 *
 *  Footer carries only the shared LoveButton (via EntryLoveButton). The
 *  "replies aren't open yet" note used to repeat on every card (spec 3.6
 *  polish fix); it is now stated once, under the masthead, instead of ~15
 *  times down the page.
 * ------------------------------------------------------------------ */

import Link from "next/link";
import { IdentityRow } from "@/components/common/identity-row";
import { SpotifyCard } from "@/components/catchups/round/spotify-card";
import { EntryLoveButton } from "@/components/catchups/round/entry-love-button";
import type { CatchupEntryView } from "@/lib/catchups-types";
import { cn } from "@/lib/utils";

export type RoundEntry = CatchupEntryView & { authorMeta: string };

// alignment + max-width, cycling every three cards so the stack breathes
// without ever feeling random. Mobile always goes full-width (spec: the one
// legitimate single column). Kept close together (90/96/86%) — narrower
// swings read as an empty right-hand void beside the sticky TOC rather than
// intentional rhythm (polish pass: the reading column should stay populated).
const STAGGER = [
  { align: "self-start", width: "lg:max-w-[90%]" },
  { align: "self-end", width: "lg:max-w-[96%]" },
  { align: "self-start", width: "lg:max-w-[86%]" },
];

// A photo entry is the one variant that goes near-full-bleed regardless of
// its position in the cycle (spec polish: photos are the visual anchor of
// the stack, not another staggered text card).
const PHOTO_STAGGER = { align: "self-center", width: "lg:max-w-full" } as const;

const RULED_LINES_STYLE = {
  backgroundImage:
    "repeating-linear-gradient(to bottom, transparent, transparent 26px, color-mix(in srgb, var(--color-ink) 5%, transparent) 27px)",
} as const;

function AnswerPhotos({ images }: { images: string[] }) {
  const cols = images.length === 1 ? "grid-cols-1" : images.length === 2 ? "grid-cols-2" : "grid-cols-3";
  // A lone photo is the near-full-bleed hero (spec polish): a wide landscape
  // crop reads as "a photo shared" rather than a cropped thumbnail. Multiple
  // photos stay square so the grid tiles evenly.
  const heroAspect = images.length === 1 ? "aspect-[16/10] sm:aspect-[21/9]" : "aspect-square";
  return (
    <div className={cn("mt-[var(--space-m)] grid gap-2", cols)}>
      {images.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={i}
          src={src}
          alt=""
          loading="lazy"
          className={cn("w-full rounded-[var(--radius-md)] border border-border object-cover", heroAspect)}
        />
      ))}
    </div>
  );
}

export function AnswerCard({ entry, index }: { entry: RoundEntry; index: number }) {
  const hasBody = Boolean(entry.body && entry.body.trim());
  const hasPhotos = entry.images.length > 0;
  const hasSong = Boolean(entry.song);
  const sharedNothing = !hasBody && !hasPhotos && !hasSong;
  // Photos are the stack's visual anchor (spec polish), so they break the
  // text-card stagger rather than following it.
  const stagger = hasPhotos ? PHOTO_STAGGER : STAGGER[index % STAGGER.length];

  return (
    <article
      id={`entry-${entry.id}`}
      className={cn(
        "card-elevated w-full rounded-[var(--radius)] border border-border bg-card p-[var(--space-l)] pt-[var(--space-m)]",
        stagger.align,
        stagger.width
      )}
    >
      <IdentityRow
        user={entry.author}
        avatarSize="sm"
        avatarHref={`/profile/${entry.author.id}`}
        avatarLabel={entry.author.name}
        name={
          <Link
            href={`/profile/${entry.author.id}`}
            className="font-semibold leading-none text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:opacity-70"
          >
            {entry.author.name}
          </Link>
        }
        meta={entry.authorMeta}
      />

      {sharedNothing ? (
        <p className="mt-[var(--space-m)] text-[14.5px] italic leading-[1.7] text-muted-foreground">
          Showed up for this Round without adding anything here.
        </p>
      ) : (
        <>
          {hasBody && (
            <div className="mt-[var(--space-m)] -mx-1 rounded-[var(--radius-md)] px-1 py-1" style={RULED_LINES_STYLE}>
              <p className="whitespace-pre-wrap text-[15px] leading-[1.7] text-foreground">{entry.body}</p>
            </div>
          )}
          {hasPhotos && <AnswerPhotos images={entry.images} />}
          {entry.song && <SpotifyCard song={entry.song} />}
        </>
      )}

      <div className="mt-[var(--space-m)] border-t border-border/70 pt-[var(--space-s)]">
        <EntryLoveButton entryId={entry.id} initialLoved={entry.lovedByViewer} initialCount={entry.loveCount} />
      </div>
    </article>
  );
}
