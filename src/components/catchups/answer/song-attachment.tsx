"use client";

/* ------------------------------------------------------------------ *
 *  <SongAttachment> — "Add a song" (spec 3.4.1). A single Spotify URL
 *  field; on save it calls `previewSpotify` (this package's read-only
 *  preview wrapper) and `submitEntry` (WP2, the persistence + SSRF
 *  boundary) in parallel, then renders the resolved album-art card. Fails
 *  soft: an invalid link shows an inline note and never blocks the rest of
 *  the answer, matching submitEntry's own fail-soft behaviour exactly.
 * ------------------------------------------------------------------ */

import { useState } from "react";
import { ArrowUpRight, X } from "lucide-react";
import { MusicNotes } from "@phosphor-icons/react";
import { toast } from "sonner";
import { submitEntry } from "@/app/(main)/catchups/actions";
import { SpringPress } from "@/components/common/motion";
import type { SongState } from "./types";
import { previewSpotify } from "./spotify-preview-action";

export function SongAttachment({
  promptId,
  song,
  onChange,
}: {
  promptId: string;
  song: SongState;
  onChange: (song: SongState) => void;
}) {
  const [input, setInput] = useState(song?.url ?? "");
  const [saving, setSaving] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  async function handleSave() {
    const trimmed = input.trim();
    setFieldError(null);
    if (trimmed === (song?.url ?? "")) return;

    if (!trimmed) {
      onChange(null);
      const result = await submitEntry({ promptId, songUrl: "" });
      if (result && "error" in result) toast.error(result.error);
      return;
    }

    setSaving(true);
    try {
      const [preview, saved] = await Promise.all([
        previewSpotify(trimmed),
        submitEntry({ promptId, songUrl: trimmed }),
      ]);
      if (saved && "error" in saved) {
        toast.error(saved.error);
        return;
      }
      if (preview.ok) {
        onChange({ url: preview.songUrl, title: preview.songTitle, art: preview.songArt });
        setInput(preview.songUrl);
      } else {
        // Fail soft: leave the previous saved song (if any) untouched, same
        // as submitEntry itself, and surface why inline rather than a toast.
        setFieldError(preview.error);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove() {
    setInput("");
    setFieldError(null);
    onChange(null);
    const result = await submitEntry({ promptId, songUrl: "" });
    if (result && "error" in result) toast.error(result.error);
  }

  if (song) {
    return (
      <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-border bg-background/60 p-2.5">
        {song.art ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={song.art} alt="" className="h-14 w-14 shrink-0 rounded-[10px] object-cover" />
        ) : (
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-[10px] bg-leaf/10 text-leaf">
            <MusicNotes size={22} weight="duotone" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{song.title}</p>
          <a
            href={song.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-0.5 inline-flex items-center gap-1 rounded-sm text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground hover:text-leaf focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            Open in Spotify
            <ArrowUpRight className="h-3 w-3" />
          </a>
        </div>
        <SpringPress
          as="button"
          onClick={handleRemove}
          className="inline-grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          {...({ type: "button", "aria-label": "Remove song" } as object)}
        >
          <X className="h-4 w-4" />
        </SpringPress>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2.5">
        <div className="relative flex-1">
          <MusicNotes
            size={16}
            weight="duotone"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="url"
            inputMode="url"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                (e.target as HTMLInputElement).blur();
              }
            }}
            placeholder="Paste a Spotify link"
            className="w-full rounded-[var(--radius-input)] border border-border bg-card py-2.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-leaf/40"
          />
        </div>
        {saving && <span className="shrink-0 text-xs text-muted-foreground">Adding...</span>}
      </div>
      {fieldError && <p className="mt-1.5 text-xs text-destructive">{fieldError}</p>}
    </div>
  );
}
