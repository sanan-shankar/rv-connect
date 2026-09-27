"use client";

/* ------------------------------------------------------------------ *
 *  A pasted link, resolved into a card.
 *
 *  Transplanted here from the Catch-up reader (edition/reader-parts.tsx,
 *  which had it from the lab's `Media` card, sketches/_parts.tsx -- the
 *  shape he reviewed: the whole card is the button and the url is never
 *  printed. "We can just have the title, and the person, and the
 *  thumbnail. And small." (R6)
 *
 *  MOVED HERE so a post and a letter can draw the exact same card a
 *  Catch-up answer does, rather than a second copy of it. Nothing about
 *  the component changed in the move -- same markup, same classes, same
 *  three kinds -- and the Catch-up reader now imports it from here too, so
 *  there is one definition rather than two that can drift.
 *
 *  Three kinds, one card, and the difference is only the picture and the
 *  second line:
 *
 *    spotify  a 52px square, the height of an album cover. No second line:
 *             Spotify's keyless oembed has no artist, and the platform's
 *             name is not one (F33).
 *    youtube  the same 52px height at 92 wide, so it reads as a frame from a
 *             film, with a play badge; the channel under the title.
 *    link     any other page (his, 2026-09-14: "can't you show preview for
 *             any link even if they're not songs?"). Its preview image in
 *             the video's frame, and the site's own name -- or its address,
 *             when it gives none -- under the title, because with the url
 *             hidden that line is the only way to know where the card goes.
 *
 *  With no picture, or one that fails to load, a 52px tile holds a glyph:
 *  the music mark for a song, a link for a page. The images are ours
 *  (link-preview.ts re-hosts them), so a plain <img> needs no CSP entry;
 *  `next/image` is skipped because a 92px thumbnail gains nothing from the
 *  optimizer.
 * ------------------------------------------------------------------ */

import { useState } from "react";
import { LinkSimple, MusicNotes, Play } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { LinkCardView } from "@/lib/link-preview-core";

function siteOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function LinkCard({ link, className }: { link: LinkCardView; className?: string }) {
  const [broken, setBroken] = useState(false);
  const square = link.kind === "spotify";
  const second = link.kind === "link" ? (link.subtitle ?? siteOf(link.url)) : link.subtitle;

  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "state-layer flex items-center gap-3 rounded-[10px] border border-border bg-card p-2 transition-[scale] duration-150 ease-out active:scale-[0.985] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        className,
      )}
    >
      {link.thumbUrl && !broken ? (
        <span className="relative shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={link.thumbUrl}
            alt=""
            loading="lazy"
            decoding="async"
            onError={() => setBroken(true)}
            className="h-[52px] rounded-[6px] bg-muted object-cover"
            style={{ width: square ? 52 : 92 }}
          />
          {link.kind === "youtube" && (
            <span className="absolute left-1/2 top-1/2 grid h-6 w-6 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-black/60 text-white">
              <Play size={11} weight="fill" />
            </span>
          )}
        </span>
      ) : (
        <span className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-[6px] bg-muted text-muted-foreground">
          {link.kind === "link" ? (
            <LinkSimple size={22} weight="duotone" />
          ) : (
            <MusicNotes size={22} weight="duotone" />
          )}
        </span>
      )}
      <span className="min-w-0">
        {/* A page's title is the site's typing, not ours, and can be one long
            unbroken run; it breaks rather than widening the card past a
            390px phone. */}
        <span className="line-clamp-2 block break-words text-[14.5px] font-semibold leading-tight text-foreground [overflow-wrap:anywhere]">
          {link.title}
        </span>
        {second && (
          <span className="mt-1 block truncate text-[12.5px] text-muted-foreground">{second}</span>
        )}
      </span>
    </a>
  );
}
