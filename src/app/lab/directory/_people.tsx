"use client";

/* ------------------------------------------------------------------ *
 *  How a person renders in a result set.
 *
 *  Owner: "when you click on a certain batch it shows everyone's cards a
 *  bit too big, there's too much white space in these cards ... maybe we
 *  can show it with like the bird and then the name on the right of the
 *  bird instead of everything stacked under it. Vertical space is at a
 *  premium here."
 *
 *  So the axis is DENSITY, measured in people-per-1000px of column, not
 *  taste. Every specimen below prints its own measured height.
 * ------------------------------------------------------------------ */

import { useEffect, useRef, useState } from "react";
import { BirdAvatar } from "@/components/common/bird-avatar";
import { cn } from "@/lib/utils";
import { memberLine, type Member } from "./_data";

/** metaLine's rule, local copy: a middle dot only ever appears BETWEEN two
 *  surviving segments, never leading, trailing, or beside an empty one. */
function meta(...parts: (string | null | undefined | false)[]) {
  return parts.filter(Boolean).join(" · ");
}

function cityLine(m: Member) {
  if (m.places.length === 0) return null;
  if (m.places.length === 1) return m.places[0].city;
  // Two cities read as a flat equal series, never "primary and secondary"
  // (owner, 2026-07-30, on the profile letterhead).
  return m.places.map((p) => p.city).join(", ");
}

/* --- A: the shipped card ------------------------------------------- *
 *  Reproduced from src/components/directory/profile-card.tsx so the
 *  comparison is against the real thing rather than a memory of it.
 * ------------------------------------------------------------------ */

export function ShippedCard({ m }: { m: Member }) {
  return (
    <div className="card-elevated flex h-full flex-col items-center rounded-[var(--radius)] border border-border bg-card p-5 text-center">
      <BirdAvatar user={{ id: m.id, name: m.name }} size="md" />
      <h3 className="mt-3 font-semibold tracking-tight text-foreground">{m.name}</h3>
      <p className="mt-0.5 text-[10.5px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">
        {memberLine(m)}
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {m.places[0] && <span>{m.places[0].city}</span>}
        <span>{m.jobTitle}</span>
      </div>
    </div>
  );
}

/* --- B: the row ----------------------------------------------------- *
 *
 *  Bird left, everything else right of it, exactly as asked. Two lines of
 *  text against a 40px avatar, so the row's height is set by the avatar
 *  (40) plus its padding, not by stacked text.
 *
 *  The 40px avatar is `size="sm"`, the same token the sidebar account chip
 *  and the map drilldown already use, so a person reads at one size
 *  everywhere they appear in a list. The shipped card uses `md` (64px),
 *  which is a profile-header size doing list work.
 * ------------------------------------------------------------------ */

export function PersonRow({ m, showCity = true }: { m: Member; showCity?: boolean }) {
  return (
    <div className="state-layer flex items-center gap-3 rounded-[var(--radius-md)] px-2.5 py-2">
      <BirdAvatar user={{ id: m.id, name: m.name }} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14.5px] font-semibold leading-tight text-foreground">
          {m.name}
        </div>
        <div className="mt-0.5 truncate text-[12.5px] leading-tight text-muted-foreground">
          {meta(memberLine(m), m.jobTitle, showCity ? cityLine(m) : null)}
        </div>
      </div>
    </div>
  );
}

/* --- C: the compact card -------------------------------------------- *
 *
 *  For when a grid is still wanted (browsing a batch is a different job
 *  from scanning search results). Same left-aligned lockup as the row, but
 *  boxed, so a 3-up grid still reads as a set of people rather than a
 *  table. Padding is the optical-correction pair: 14px sides and bottom,
 *  10px top (14 / 1.4 line-height), which is where the 12px radius on the
 *  inner elements comes from too.
 * ------------------------------------------------------------------ */

export function CompactCard({ m }: { m: Member }) {
  return (
    <div className="card-elevated state-layer flex items-center gap-3 rounded-[var(--radius)] border border-border bg-card p-3.5 pt-2.5">
      <BirdAvatar user={{ id: m.id, name: m.name }} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14.5px] font-semibold leading-tight text-foreground">
          {m.name}
        </div>
        <div className="mt-1 truncate text-[12px] leading-tight text-muted-foreground">
          {meta(memberLine(m), cityLine(m))}
        </div>
      </div>
    </div>
  );
}

/* --- D: the ruled list ---------------------------------------------- *
 *
 *  No box at all. A hairline between rows, and the row earns nothing else.
 *  This is the /lab/tiles gate applied to a directory result: a result row
 *  is not a separable object, it is one entry in a series, and a series is
 *  what a rule is for. It is also the densest of the four, which is the
 *  whole point of the exercise.
 * ------------------------------------------------------------------ */

export function RuledRow({ m }: { m: Member }) {
  return (
    <div className="state-layer flex items-center gap-3 border-b border-border/60 px-2 py-2.5 last:border-0">
      <BirdAvatar user={{ id: m.id, name: m.name }} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14.5px] font-semibold leading-tight text-foreground">
          {m.name}
        </div>
        <div className="mt-0.5 truncate text-[12.5px] leading-tight text-muted-foreground">
          {meta(m.jobTitle, m.workplace)}
        </div>
      </div>
      {/* Batch and city right-aligned into their own columns: in a long
          scan the eye wants these at a fixed x, not trailing a name of
          variable length. Hidden under 520px, where there is no room for a
          second column and the meta line above absorbs them instead. */}
      <div className="hidden shrink-0 text-right sm:block">
        <div className="text-[12.5px] font-medium leading-tight text-foreground/80">
          {cityLine(m)}
        </div>
        <div className="mt-0.5 text-[11.5px] leading-tight text-muted-foreground tabular-nums">
          {memberLine(m)}
        </div>
      </div>
    </div>
  );
}

/* --- the measuring instrument --------------------------------------- *
 *
 *  Reports the rendered height of whatever it wraps. The room prints
 *  people-per-1000px from these, because "feels too big" and "is 2.6x the
 *  height of the alternative" are different quality arguments and only one
 *  of them survives being disagreed with.
 * ------------------------------------------------------------------ */

export function Measured({
  label,
  count,
  children,
}: {
  label: string;
  /** how many people the wrapped block renders, for the density figure */
  count: number;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [h, setH] = useState<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setH(el.getBoundingClientRect().height);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const per = h ? Math.round((count / h) * 1000) : null;

  return (
    <div className="min-w-0">
      <div className="mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-[12px] font-bold uppercase tracking-[0.1em] text-foreground/70">
          {label}
        </span>
        {h != null && (
          <span className="text-[12.5px] tabular-nums text-muted-foreground">
            {Math.round(h / count)}px per person
            {per != null && (
              <>
                {" · "}
                <b className="font-semibold text-foreground">{per}</b> per 1000px
              </>
            )}
          </span>
        )}
      </div>
      <div ref={ref}>{children}</div>
    </div>
  );
}

/* --- grids ---------------------------------------------------------- */

export function ResultGrid({
  members,
  variant,
  className,
}: {
  members: Member[];
  variant: "shipped" | "compact" | "row" | "ruled";
  className?: string;
}) {
  if (variant === "row") {
    return (
      <div className={cn("flex flex-col", className)}>
        {members.map((m) => (
          <PersonRow key={m.id} m={m} />
        ))}
      </div>
    );
  }
  if (variant === "ruled") {
    return (
      <div className={cn("flex flex-col", className)}>
        {members.map((m) => (
          <RuledRow key={m.id} m={m} />
        ))}
      </div>
    );
  }
  if (variant === "compact") {
    return (
      <div className={cn("grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3", className)}>
        {members.map((m) => (
          <CompactCard key={m.id} m={m} />
        ))}
      </div>
    );
  }
  return (
    <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {members.map((m) => (
        <ShippedCard key={m.id} m={m} />
      ))}
    </div>
  );
}
