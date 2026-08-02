/* ------------------------------------------------------------------ *
 *  <SongCard> - one member's song, inside their answer card.
 *
 *  Two shapes, driven by whether we have a link:
 *   - `song.url` present (a pasted Spotify link, resolved via oembed):
 *     the whole row is an outlink. Plain <img> for the art, never the
 *     oembed iframe (CSP + theme). `art` is null when resolution failed
 *     soft, so the row falls back to an on-theme placeholder.
 *   - `song.url` empty (the `songs` prompt kind, where people type a song
 *     by name and there is nothing to link to): the same row, rendered as
 *     plain text with no link. AnswerCard builds that shape from the
 *     entry's body, which is where the song name is actually stored.
 *
 *  Sized to sit inside the answer card's 16px padding, so it reads as a
 *  nested row rather than a second big box.
 * ------------------------------------------------------------------ */

import { ArrowUpRight } from "lucide-react";
import { MusicNotes } from "@phosphor-icons/react/dist/ssr";
import type { CatchupSongView } from "@/lib/catchups-types";

const ROW_CLASS =
  "mt-[var(--space-s)] flex items-center gap-3 rounded-[var(--radius-md)] border border-border bg-background/60 p-[var(--space-s)]";

function SongBody({ song }: { song: CatchupSongView }) {
  const linked = Boolean(song.url);
  return (
    <>
      {song.art ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={song.art}
          alt=""
          className="h-14 w-14 shrink-0 rounded-[var(--radius-sm)] object-cover shadow-[0_6px_16px_-8px_rgba(0,0,0,0.35)]"
        />
      ) : (
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-[var(--radius-sm)] bg-leaf/10 text-leaf">
          <MusicNotes size={24} weight="duotone" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold text-foreground">{song.title}</p>
        {linked && (
          <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Open in Spotify
            <ArrowUpRight className="h-3 w-3" />
          </p>
        )}
      </div>
    </>
  );
}

export function SpotifyCard({ song }: { song: CatchupSongView }) {
  if (!song.url) {
    return (
      <div className={ROW_CLASS}>
        <SongBody song={song} />
      </div>
    );
  }

  return (
    <a
      href={song.url}
      target="_blank"
      rel="noopener noreferrer"
      // state-layer replaces `hover:bg-background`, which only pushed this row
      // from a 60% tan wash to a 100% one (~2.5 dL*, right at the noticeable
      // floor) and sank toward the page colour instead of reading as a state.
      className={`${ROW_CLASS} state-layer hover:border-leaf/40 active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring`}
    >
      <SongBody song={song} />
    </a>
  );
}
