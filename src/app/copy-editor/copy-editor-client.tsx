"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { EntryCard } from "./entry-card";
import { isEdited, type GroupDef, type InventoryEntry } from "./groups";

type GroupWithEntries = GroupDef & { entryIds: string[] };

export function CopyEditorClient({
  entries,
  groups,
  generated,
}: {
  entries: InventoryEntry[];
  groups: GroupWithEntries[];
  generated: string;
}) {
  const [entryMap, setEntryMap] = useState<Record<string, InventoryEntry>>(() =>
    Object.fromEntries(entries.map((e) => [e.id, e]))
  );
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [selectedGroupId, setSelectedGroupId] = useState(groups[0]?.id ?? "");
  const [search, setSearch] = useState("");
  const [onlyEdited, setOnlyEdited] = useState(false);

  const orderedEntries = useMemo(() => entries.map((e) => entryMap[e.id] ?? e), [entries, entryMap]);
  const totalEdited = useMemo(() => orderedEntries.filter(isEdited).length, [orderedEntries]);

  const groupProgress = useMemo(
    () =>
      groups.map((g) => {
        const total = g.entryIds.length;
        const edited = g.entryIds.reduce((acc, id) => acc + (isEdited(entryMap[id]) ? 1 : 0), 0);
        return { id: g.id, total, edited };
      }),
    [groups, entryMap]
  );

  function handleEntryUpdate(id: string, patch: { replacement: string | null; notes: string | null }) {
    setEntryMap((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  function handleSavingChange(id: string, saving: boolean) {
    setSavingIds((prev) => {
      const next = new Set(prev);
      if (saving) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  const searchTerm = search.trim().toLowerCase();
  const isSearching = searchTerm.length > 0;

  const visibleEntries = useMemo(() => {
    let list: InventoryEntry[];
    if (isSearching) {
      list = orderedEntries.filter(
        (e) =>
          e.text.toLowerCase().includes(searchTerm) ||
          e.situation.toLowerCase().includes(searchTerm) ||
          e.route.toLowerCase().includes(searchTerm)
      );
    } else {
      const group = groups.find((g) => g.id === selectedGroupId);
      const idSet = new Set(group?.entryIds ?? []);
      list = orderedEntries.filter((e) => idSet.has(e.id));
    }
    if (onlyEdited) list = list.filter(isEdited);
    return list;
  }, [orderedEntries, isSearching, searchTerm, groups, selectedGroupId, onlyEdited]);

  const selectedGroup = groups.find((g) => g.id === selectedGroupId);
  const selectedProgress = groupProgress.find((g) => g.id === selectedGroupId);

  function selectGroup(id: string) {
    setSelectedGroupId(id);
    setSearch("");
  }

  const navButtonClass = (active: boolean) =>
    cn(
      "rounded-full px-3.5 py-1.5 text-left text-sm transition-transform duration-150 outline-none",
      "hover:-translate-y-px active:translate-y-0 active:scale-[0.98]",
      "focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1",
      active
        ? "bg-canopy text-white shadow-[0_5px_13px_-12px_var(--color-canopy)]"
        : "text-foreground hover:bg-muted"
    );

  return (
    <div className="min-h-screen bg-background">
      <header className="glass sticky top-0 z-[var(--z-elevated)] border-b border-border">
        <div className="mx-auto max-w-[1400px] px-[var(--space-m)] py-[var(--space-s)] sm:px-[var(--space-l)]">
          <div className="flex flex-wrap items-baseline justify-between gap-[var(--space-xs)]">
            <div>
              <h1 className="font-heading text-xl font-semibold tracking-tight text-foreground">
                Copy editor
              </h1>
              <p className="mt-[var(--space-xxs)] max-w-2xl text-sm text-muted-foreground">
                Every user-facing string on Rishi Valley, {entries.length} in all. Leave a box
                empty and that line ships exactly as shown. Type a replacement and it saves
                automatically a moment after you stop typing.
              </p>
            </div>
            <div className="flex items-center gap-[var(--space-s)]">
              <SaveIndicator saving={savingIds.size > 0} />
              <div className="text-right">
                <p className="font-heading text-lg leading-none font-semibold text-canopy">
                  {totalEdited} / {entries.length}
                </p>
                <p className="text-[11px] text-muted-foreground">edited</p>
              </div>
            </div>
          </div>

          <div className="mt-[var(--space-s)] h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full w-full origin-left rounded-full bg-canopy transition-transform duration-300 ease-out"
              style={{
                transform: `scaleX(${entries.length ? totalEdited / entries.length : 0})`,
              }}
            />
          </div>

          <div className="mt-[var(--space-m)] flex flex-wrap items-center gap-[var(--space-s)]">
            <div className="relative min-w-[16rem] flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search text, situation, or route"
                className="pl-9"
                aria-label="Search all entries"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                  className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-full p-1 text-muted-foreground outline-none transition-transform duration-150 hover:-translate-y-1/2 hover:scale-110 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
            <Button
              type="button"
              variant={onlyEdited ? "primary" : "outline"}
              size="sm"
              onClick={() => setOnlyEdited((v) => !v)}
              aria-pressed={onlyEdited}
            >
              Only edited
            </Button>
          </div>

          {/* Mobile group nav: horizontal scroll strip, single-column layout below */}
          <nav
            aria-label="Sections"
            className="mt-[var(--space-m)] -mx-[var(--space-m)] flex gap-[var(--space-xxs)] overflow-x-auto px-[var(--space-m)] pb-1 md:hidden"
          >
            {groups.map((g) => {
              const progress = groupProgress.find((p) => p.id === g.id);
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => selectGroup(g.id)}
                  className={cn(navButtonClass(!isSearching && selectedGroupId === g.id), "shrink-0")}
                >
                  {g.label}
                  <span className="ml-1.5 opacity-70">
                    {progress?.edited ?? 0}/{progress?.total ?? 0}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1400px] items-start gap-[var(--space-l)] px-[var(--space-m)] py-[var(--space-l)] sm:px-[var(--space-l)]">
        {/* Desktop sidebar */}
        <nav
          aria-label="Sections"
          className="sticky top-[9.5rem] hidden w-64 shrink-0 flex-col gap-[var(--space-xxs)] md:flex"
        >
          {groups.map((g) => {
            const progress = groupProgress.find((p) => p.id === g.id);
            const done = progress && progress.total > 0 && progress.edited === progress.total;
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => selectGroup(g.id)}
                className={cn(
                  navButtonClass(!isSearching && selectedGroupId === g.id),
                  "flex items-center justify-between"
                )}
              >
                <span>{g.label}</span>
                <span
                  className={cn(
                    "text-xs tabular-nums",
                    !isSearching && selectedGroupId === g.id
                      ? "text-white/80"
                      : done
                        ? "text-canopy"
                        : "text-muted-foreground"
                  )}
                >
                  {progress?.edited ?? 0}/{progress?.total ?? 0}
                </span>
              </button>
            );
          })}
        </nav>

        <main className="min-w-0 flex-1">
          <div className="mb-[var(--space-m)]">
            <h2 className="font-heading text-lg font-semibold text-foreground">
              {isSearching
                ? `Search results for "${search.trim()}"`
                : selectedGroup?.label ?? "All"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isSearching
                ? `${visibleEntries.length} matching ${visibleEntries.length === 1 ? "line" : "lines"}`
                : `${selectedProgress?.edited ?? 0} of ${selectedProgress?.total ?? 0} edited`}
              {onlyEdited ? " (showing only edited)" : ""}
            </p>
          </div>

          {visibleEntries.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-[var(--space-xl)] text-center text-sm text-muted-foreground">
              No entries match here.
            </div>
          ) : (
            <div className="flex flex-col gap-[var(--space-m)]">
              {visibleEntries.map((entry) => (
                <EntryCard
                  key={entry.id}
                  entry={entry}
                  onEntryUpdate={handleEntryUpdate}
                  onSavingChange={handleSavingChange}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      <footer className="px-[var(--space-l)] pb-[var(--space-xl)] text-center text-[11px] text-muted-foreground">
        Inventory generated {generated}. Dev-only tool, not linked anywhere in the app.
      </footer>
    </div>
  );
}

function SaveIndicator({ saving }: { saving: boolean }) {
  return (
    <span
      className={cn(
        "hidden items-center gap-1.5 text-xs sm:flex",
        saving ? "text-cinnamon" : "text-muted-foreground"
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          saving ? "animate-pulse bg-cinnamon" : "bg-canopy"
        )}
      />
      {saving ? "Saving…" : "All changes saved"}
    </span>
  );
}
