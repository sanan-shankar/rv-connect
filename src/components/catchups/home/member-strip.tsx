"use client";

/* ------------------------------------------------------------------ *
 *  <MemberStrip> - the overlapping bird-avatar cluster used for the
 *  group roster (collecting status card) and the "who has answered"
 *  fill-in strip (answering status card). No answer CONTENT is ever
 *  shown here, only presence - members who have not yet answered are
 *  dimmed, never named or singled out (spec 3.6 "do not shame
 *  non-answerers" applies here just as much as in the reader).
 * ------------------------------------------------------------------ */

import { BirdAvatar } from "@/components/common/bird-avatar";
import { cn } from "@/lib/utils";
import type { HomePersonRef } from "./types";

export function MemberStrip({
  members,
  highlightIds,
  max = 8,
  size = 28,
  className,
}: {
  members: HomePersonRef[];
  /** Ids to show at full opacity. Omit to show every member at full opacity. */
  highlightIds?: Set<string>;
  max?: number;
  size?: number;
  className?: string;
}) {
  const shown = members.slice(0, max);
  const extra = members.length - shown.length;
  const overlap = -Math.round(size * 0.3);

  return (
    <div className={cn("flex items-center", className)}>
      {shown.map((m, i) => {
        const dim = highlightIds ? !highlightIds.has(m.id) : false;
        return (
          <div
            key={m.id}
            className={cn(
              "rounded-full ring-2 ring-card transition-opacity duration-150",
              dim && "opacity-40 grayscale-[0.4]"
            )}
            style={{ marginLeft: i === 0 ? 0 : overlap }}
            title={m.name}
          >
            <BirdAvatar user={m} size={size} />
          </div>
        );
      })}
      {extra > 0 && (
        <div
          className="grid shrink-0 place-items-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground ring-2 ring-card"
          style={{ width: size, height: size, marginLeft: overlap }}
        >
          +{extra}
        </div>
      )}
    </div>
  );
}
