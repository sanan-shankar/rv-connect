"use client";

/* ------------------------------------------------------------------ *
 *  The lab room list.
 *
 *  Rebuilt 2026-07-30 after the first attempt shipped as a dense
 *  three-column table: "the UI that was in delight was much more
 *  approachable and readable. This is very hard to navigate... it's
 *  functional but that's it."
 *
 *  So it is the delight index's shape again: a grid of real cards, one
 *  per room, each with its title, what it is for, and an Open
 *  affordance. On top of that, the two things that make 39 rooms
 *  actually manageable:
 *
 *    - A search box that filters by title, note and path as you type,
 *      so finding a room is one word rather than a scroll.
 *    - Archive and unarchive on every card, persisted to a file in the
 *      repo (see ./actions.ts), so the owner curates the list instead
 *      of asking for a code change. Archived rooms are a separate
 *      view, not a hidden appendix.
 * ------------------------------------------------------------------ */

import { useMemo, useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { Archive, ArchiveRestore, ArrowUpRight, Search, X } from "lucide-react";
import { FadeRise, SpringPress } from "@/components/common/motion";
import { GROUP_ORDER, type LabEntry, type LabGroup } from "./_registry";
import { setArchived } from "./actions";
import { cn } from "@/lib/utils";

type View = "active" | "archived";

export function LabClient({ entries, editable }: { entries: LabEntry[]; editable: boolean }) {
  const [view, setView] = useState<View>("active");
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  /* The card flips the moment it is pressed; the server action and its
     revalidate catch up behind it. */
  const [optimistic, applyOptimistic] = useOptimistic(
    entries,
    (current: LabEntry[], change: { href: string; archived: boolean }) =>
      current.map((e) =>
        e.href === change.href
          ? { ...e, status: change.archived ? ("archived" as const) : ("active" as const) }
          : e
      )
  );

  function toggle(entry: LabEntry) {
    const archived = entry.status !== "archived";
    setError(null);
    startTransition(async () => {
      applyOptimistic({ href: entry.href, archived });
      const result = await setArchived(entry.href, archived);
      if (!result.ok) setError(result.error ?? "Could not save.");
    });
  }

  const activeCount = optimistic.filter((e) => e.status === "active").length;
  const archivedCount = optimistic.length - activeCount;

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return optimistic.filter((e) => {
      if ((view === "archived") !== (e.status === "archived")) return false;
      if (!q) return true;
      return (
        e.title.toLowerCase().includes(q) ||
        e.note.toLowerCase().includes(q) ||
        e.href.toLowerCase().includes(q) ||
        e.group.toLowerCase().includes(q)
      );
    });
  }, [optimistic, view, query]);

  const grouped = useMemo(() => {
    const byGroup = new Map<LabGroup, LabEntry[]>();
    for (const e of shown) {
      const list = byGroup.get(e.group) ?? [];
      list.push(e);
      byGroup.set(e.group, list);
    }
    return GROUP_ORDER.filter((g) => byGroup.has(g)).map((g) => ({
      group: g,
      rooms: byGroup.get(g)!,
    }));
  }, [shown]);

  return (
    <div className="mx-auto w-full max-w-[1180px] px-5 py-10 sm:px-8 sm:py-12">
      <FadeRise>
        <header>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-cinnamon">Internal</p>
          <h1 className="mt-2 font-heading text-[34px] font-bold leading-none tracking-[-0.025em] text-foreground">
            Lab
          </h1>
          <p className="mt-3 max-w-[62ch] text-[15px] leading-[1.7] text-muted-foreground">
            Every dev and preview room, in one place, so nothing sits stranded behind a link nobody
            remembers. Archive what you are done with; it moves to the other tab rather than
            disappearing.
          </p>
        </header>
      </FadeRise>

      {/* Controls: the two views, and search. */}
      <FadeRise delay={0.05}>
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <div
            role="tablist"
            aria-label="Which rooms to show"
            className="inline-flex items-center gap-1 rounded-full border border-border bg-card p-1"
          >
            {(
              [
                ["active", "Active", activeCount],
                ["archived", "Archived", archivedCount],
              ] as const
            ).map(([key, label, count]) => {
              const on = view === key;
              return (
                <SpringPress
                  key={key}
                  as="button"
                  onClick={() => setView(key)}
                  className={cn(
                    "rounded-full px-4 py-1.5 text-[13px] font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                    on
                      ? "bg-canopy text-white"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  {...({ role: "tab", "aria-selected": on } as object)}
                >
                  {label}
                  <span className={cn("ml-1.5 tabular-nums", on ? "text-white/70" : "text-muted-foreground/70")}>
                    {count}
                  </span>
                </SpringPress>
              );
            })}
          </div>

          <div className="relative min-w-[240px] flex-1 sm:max-w-sm">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-[15px] w-[15px] -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search rooms"
              aria-label="Search rooms"
              className="h-10 w-full rounded-full border border-border bg-card pl-9 pr-9 text-[14px] text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors duration-150 hover:bg-mist hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </FadeRise>

      {error && (
        <p className="mt-4 rounded-[var(--radius-md)] border border-cinnamon/30 bg-cinnamon/10 px-4 py-2.5 text-[13px] text-cinnamon">
          {error}
        </p>
      )}
      {!editable && (
        <p className="mt-4 text-[12.5px] text-muted-foreground">
          Archiving is editable when running locally. This is a read-only view.
        </p>
      )}

      {grouped.length === 0 ? (
        <p className="mt-12 text-[15px] text-muted-foreground">
          {query ? `No room matches "${query.trim()}".` : "Nothing here yet."}
        </p>
      ) : (
        <div className={cn("mt-9 space-y-10", pending && "opacity-95")}>
          {grouped.map(({ group, rooms }, gi) => (
            <FadeRise key={group} delay={0.08 + gi * 0.03}>
              <section>
                <h2 className="font-heading text-[13px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  {group}
                  <span className="ml-2 font-sans text-[12px] font-semibold tracking-normal text-muted-foreground/60">
                    {rooms.length}
                  </span>
                </h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {rooms.map((room) => (
                    <RoomCard
                      key={room.href}
                      room={room}
                      editable={editable}
                      onToggle={() => toggle(room)}
                    />
                  ))}
                </div>
              </section>
            </FadeRise>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * One room. The whole card is the link (the delight index's shape, which
 * the owner asked for back), with the archive control layered on top as
 * its own button so it never fights the link for the click.
 */
function RoomCard({
  room,
  editable,
  onToggle,
}: {
  room: LabEntry;
  editable: boolean;
  onToggle: () => void;
}) {
  const isArchived = room.status === "archived";

  return (
    <div className="group relative">
      <Link
        href={room.href}
        className={cn(
          "block h-full rounded-[var(--radius)] border border-border bg-card p-[18px] transition-[border-color,background-color] duration-150 hover:border-leaf/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
          isArchived && "opacity-75"
        )}
        style={{ boxShadow: "0 1px 2px rgba(35,36,30,0.04), 0 20px 40px -30px rgba(35,36,30,0.5)" }}
      >
        {/* pr keeps the title clear of the archive button in the corner */}
        <h3 className="pr-9 font-heading text-[16.5px] font-bold leading-snug tracking-[-0.01em] text-foreground">
          {room.title}
        </h3>
        <p className="mt-2 text-[13px] leading-[1.55] text-muted-foreground">{room.note}</p>
        <div className="mt-3.5 flex items-center justify-between gap-2">
          <code className="truncate font-sans text-[11.5px] text-muted-foreground/70">
            {room.href}
          </code>
          <span className="inline-flex shrink-0 items-center gap-0.5 text-[12.5px] font-bold text-leaf">
            Open
            <ArrowUpRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </Link>

      <button
        type="button"
        onClick={onToggle}
        disabled={!editable}
        aria-label={isArchived ? `Unarchive ${room.title}` : `Archive ${room.title}`}
        title={
          editable
            ? isArchived
              ? "Move back to Active"
              : "Move to Archived"
            : "Editable when running locally"
        }
        className="absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors duration-150 hover:bg-mist hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-95 disabled:pointer-events-none disabled:opacity-40"
      >
        {isArchived ? (
          <ArchiveRestore className="h-[15px] w-[15px]" />
        ) : (
          <Archive className="h-[15px] w-[15px]" />
        )}
      </button>
    </div>
  );
}
