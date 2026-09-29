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
 *  affordance. On top of that, the things that make ~30 rooms
 *  actually manageable:
 *
 *    - A search box that filters by title, note and path as you type,
 *      so finding a room is one word rather than a scroll.
 *    - Archive and unarchive on every card, persisted to the
 *      LabRoomState table (see ./actions.ts), so the owner curates the
 *      list on the domain as well as locally. Archived rooms are a
 *      separate view, not a hidden appendix.
 *    - A room's URL-nested sub-pages fold under its one card as a
 *      quiet link list (owner: groups-rethink "should just show as one
 *      page the overview and the rest are there under that").
 * ------------------------------------------------------------------ */

import { useMemo, useOptimistic, useState, useTransition } from "react";
import Link from "@/components/common/link";
import { toast } from "sonner";
import { Archive, ArchiveRestore, ArrowUpRight, CornerDownRight, Search, X } from "lucide-react";
import { FadeRise, SpringPress } from "@/components/common/motion";
import { GROUP_ORDER, type LabEntry, type LabGroup } from "./_registry";
import { setArchived } from "./actions";
import { cn } from "@/lib/utils";

type View = "active" | "archived";

export function LabClient({ entries, editable }: { entries: LabEntry[]; editable: boolean }) {
  const [view, setView] = useState<View>("active");
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();

  /* The card flips the moment it is pressed; the server action and its
     revalidate catch up behind it. On failure the transition settles with no
     revalidated data, so useOptimistic snaps the card back by itself. */
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
    startTransition(async () => {
      applyOptimistic({ href: entry.href, archived });
      /* The try/catch is load-bearing: a stale tab whose server-action id was
         invalidated by an HMR recompile REJECTS this call, and uncaught that
         rejection is exactly the red dev-overlay badge the owner kept seeing.
         Caught, it is a toast and the card snaps back. */
      try {
        const result = await setArchived(entry.href, archived);
        if (!result.ok) toast.error(result.error ?? "Could not save.");
      } catch {
        toast.error("Could not save. Reload the page and try again.");
      }
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
        e.group.toLowerCase().includes(q) ||
        // A sub-page match surfaces its parent's card (the only card it is on).
        (e.children ?? []).some(
          (c) =>
            c.title.toLowerCase().includes(q) ||
            c.note.toLowerCase().includes(q) ||
            c.href.toLowerCase().includes(q)
        )
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
                    "rounded-full px-4 py-1.5 text-[13px] font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
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
              className="h-10 w-full rounded-full border border-border bg-card pl-9 pr-9 text-[14px] text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                // state-layer replaces hover:bg-accent + active:bg-mist: this
                // button sits on the search input's card fill, where accent was
                // 2 dL* off the surface and mist went the wrong way (a press
                // that turns tan). One translucent tint does both steps.
                className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors duration-150 state-layer hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </FadeRise>

      {!editable && (
        <p className="mt-4 text-[12.5px] text-muted-foreground">
          Archiving is saved for everyone, so it needs an admin sign-in. This is a read-only view.
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
 * One room. The card's upper region is the overview link (the delight index's
 * shape, which the owner asked for back), the archive control is layered on
 * top as its own button so it never fights the link for the click, and any
 * sub-pages sit below as their own quiet link rows. The card chrome lives on
 * the wrapper because links may not nest: the overview link and the child
 * links are siblings inside one bordered surface.
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
  const children = room.children ?? [];

  return (
    <div
      className={cn(
        "group relative flex h-full flex-col rounded-[var(--radius)] border border-border bg-card transition-[border-color] duration-150 hover:border-leaf/40 focus-within:border-leaf/40",
        isArchived && "opacity-75"
      )}
      style={{ boxShadow: "0 1px 2px rgba(35,36,30,0.04), 0 20px 40px -30px rgba(35,36,30,0.5)" }}
    >
      <Link
        href={room.href}
        className="block flex-1 rounded-[inherit] p-[18px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
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

      {children.length > 0 && (
        /* The hairline earns its keep by splitting two click targets: above it
           the whole surface opens the overview, below it each row is its own
           sub-page. 7px inset + 11px row padding = the card's own 18px text
           edge, and 16 - 7 = 9 keeps the 8.8px row highlight concentric with
           the card (the radius ladder's third rung). */
        <div className="border-t border-border/60 p-[7px]">
          {children.map((child) => (
            <Link
              key={child.href}
              href={child.href}
              title={child.note}
              className="flex items-center gap-2 rounded-[var(--radius-sm)] px-[11px] py-2 text-[12.5px] font-semibold text-muted-foreground transition-colors duration-150 state-layer hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <CornerDownRight className="h-3 w-3 shrink-0 text-muted-foreground/60" aria-hidden />
              <span className="truncate">{child.title}</span>
            </Link>
          ))}
        </div>
      )}

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
            : "Sign in as an admin to archive"
        }
        className="absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-[color,transform] duration-150 state-layer hover:text-foreground active:scale-95 disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
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
