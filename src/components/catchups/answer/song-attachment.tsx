"use client";

/* ------------------------------------------------------------------ *
 *  <SongNameField> — the control for a `songs` prompt. You type the name
 *  of the song. No pasted links: the owner's instruction (2026-07-25) is
 *  "let them just type the name of the song instead of pasting links",
 *  and the per-question Spotify field is gone from every other prompt.
 *
 *  A dumb controlled input. The parent (AnswerCard) owns the draft text
 *  and the autosave-on-blur, exactly as it does for a text prompt, so a
 *  song answer saves through the same path as any other answer.
 *
 *  ── TODO (needs a migration, deliberately not done in this pass) ──────
 *  The prompt asks for songs, plural, and the intent is up to five. That
 *  needs ONE new nullable column, `CatchupEntry.songs Json?`, holding an
 *  array of `{ title: string }` (art/url optional, filled in later if a
 *  lookup is ever added), plus a `songs` field on `submitEntry`'s schema
 *  and a list renderer in `round/answer-card.tsx`. Until that column
 *  exists, one name is stored, and it is stored in `CatchupEntry.body`:
 *  the existing `songUrl`/`songTitle`/`songArt` trio is Spotify-shaped
 *  (`submitEntry` only accepts a resolvable open.spotify.com URL, and the
 *  reader renders the song as an "Open in Spotify" outlink), so a
 *  name-only song written there would save as nothing and read as a dead
 *  link. Do not pack several names into one string, and do not reuse
 *  `images`; add the column.
 * ------------------------------------------------------------------ */

import { MusicNotes } from "@phosphor-icons/react";
import { FIELD_FOCUS } from "@/components/ui/field-focus";

export function SongNameField({
  value,
  onChange,
  onCommit,
}: {
  value: string;
  onChange: (next: string) => void;
  onCommit: () => void;
}) {
  return (
    <div className="relative">
      <MusicNotes
        size={17}
        weight="duotone"
        aria-hidden
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-leaf"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onCommit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            (e.target as HTMLInputElement).blur();
          }
        }}
        placeholder="Song name and artist"
        aria-label="Song name and artist"
        className={`w-full rounded-[var(--radius-input)] border border-border bg-card py-3 pl-11 pr-4 text-[15px] text-foreground placeholder:text-foreground/40 hover:border-leaf/40 outline-none ${FIELD_FOCUS}`}
      />
    </div>
  );
}
