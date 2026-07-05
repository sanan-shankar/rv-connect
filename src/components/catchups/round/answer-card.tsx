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
 *  Footer carries the shared LoveButton (via EntryLoveButton) and a DORMANT
 *  reply slot: inert, non-interactive markup that leaves room for comments
 *  later without wiring them now (spec 3.6 / scope fence sec 8). It is
 *  deliberately not a <button> - a control that does nothing would fail the
 *  "every clickable has hover/focus/active" rule by being clickable with no
 *  effect, so it is plain text instead.
 * ------------------------------------------------------------------ */

import Link from "next/link";
import { ChatCircleDots } from "@phosphor-icons/react/dist/ssr";
import { IdentityRow } from "@/components/common/identity-row";
import { SpotifyCard } from "@/components/catchups/round/spotify-card";
import { EntryLoveButton } from "@/components/catchups/round/entry-love-button";
import type { CatchupEntryView } from "@/lib/catchups-types";
import { cn } from "@/lib/utils";

export type RoundEntry = CatchupEntryView & { authorMeta: string };

// alignment + max-width, cycling every three cards so the stack breathes
// without ever feeling random. Mobile always goes full-width (spec: the one
// legitimate single column).
const STAGGER = [
  { align: "self-start", width: "lg:max-w-[88%]" },
  { align: "self-end", width: "lg:max-w-[94%]" },
  { align: "self-start", width: "lg:max-w-[78%]" },
];

const RULED_LINES_STYLE = {
  backgroundImage:
    "repeating-linear-gradient(to bottom, transparent, transparent 26px, color-mix(in srgb, var(--color-ink) 5%, transparent) 27px)",
} as const;

function AnswerPhotos({ images }: { images: string[] }) {
  const cols = images.length === 1 ? "grid-cols-1" : images.length === 2 ? "grid-cols-2" : "grid-cols-3";
  return (
    <div className={cn("mt-[var(--space-m)] grid gap-2", cols)}>
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

export function AnswerCard({ entry, index }: { entry: RoundEntry; index: number }) {
  const stagger = STAGGER[index % STAGGER.length];
  const hasBody = Boolean(entry.body && entry.body.trim());
  const hasPhotos = entry.images.length > 0;
  const hasSong = Boolean(entry.song);
  const sharedNothing = !hasBody && !hasPhotos && !hasSong;

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

      <div className="mt-[var(--space-m)] flex items-center justify-between border-t border-border/70 pt-[var(--space-s)]">
        <EntryLoveButton entryId={entry.id} initialLoved={entry.lovedByViewer} initialCount={entry.loveCount} />
        <p className="flex items-center gap-1.5 text-[11.5px] font-medium text-muted-foreground/70">
          <ChatCircleDots size={14} weight="duotone" />
          Replies aren&apos;t open yet
        </p>
      </div>
    </article>
  );
}
