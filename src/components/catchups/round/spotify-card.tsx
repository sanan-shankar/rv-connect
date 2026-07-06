/* ------------------------------------------------------------------ *
 *  <SpotifyCard> - the resolved song-of-the-moment, spec 3.4.1.
 *
 *  Plain <img> (no next.config change), an "Open in Spotify" outlink, and
 *  NEVER the oembed iframe (CSP + theme). `art` is null when resolution
 *  failed soft (timeout / bad response) or the fetch never ran; the card
 *  still renders as an on-theme placeholder rather than a broken image.
 * ------------------------------------------------------------------ */

import { ArrowUpRight } from "lucide-react";
import { MusicNotes } from "@phosphor-icons/react/dist/ssr";
import type { CatchupSongView } from "@/lib/catchups-types";

export function SpotifyCard({ song }: { song: CatchupSongView }) {
  return (
    <a
      href={song.url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-[var(--space-m)] flex items-center gap-4 rounded-[var(--radius-md)] border border-border bg-background/60 p-3 hover:border-leaf/40 hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-[0.99]"
    >
      {song.art ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={song.art}
          alt=""
          className="h-20 w-20 shrink-0 rounded-[var(--radius-sm)] object-cover shadow-[0_6px_16px_-8px_rgba(0,0,0,0.35)]"
        />
      ) : (
        <span className="grid h-20 w-20 shrink-0 place-items-center rounded-[var(--radius-sm)] bg-leaf/10 text-leaf">
          <MusicNotes size={28} weight="duotone" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold text-foreground">{song.title}</p>
        <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Open in Spotify
          <ArrowUpRight className="h-3 w-3" />
        </p>
      </div>
    </a>
  );
}
