"use client";

/* ------------------------------------------------------------------ *
 *  Four structural answers for the directory chrome.
 *
 *  Every one of them renders live against the same synthetic member set
 *  and the same stress state, so they can be compared in the worst case
 *  rather than the demo case. Each reports its own measured height.
 *
 *  The stress states are the ones a DOM probe measured on the shipped bar on
 *  2026-08-03, so "3 rows, 142px" here means what it meant on the real page
 *  that day. The probe itself was retired on 2026-09-05: it anchored on a
 *  `data-tour` attribute, and those left with the hoopoe tour on 2026-08-27,
 *  after which it exited 0 and measured nothing. Re-derive by hand, or write
 *  a new probe, before trusting these against today's bar.
 * ------------------------------------------------------------------ */

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";
import {
  Choice,
  FilterButton,
  MenuRow,
  ModeToggle,
  PanelSection,
  Pop,
  PopWrap,
  SearchField,
  Token,
} from "./_ui";
import {
  applyFilters,
  activeCount,
  cityPoints,
  PROFESSIONS,
  type Filters,
  type Member,
  type SortKey,
} from "./_data";

/* Re-exported so the concepts and the room can keep importing the stress
   states from beside the chrome they stress. The VALUES live in _data.ts;
   see the note there for why a "use client" module cannot own them. */
export { STRESS, type StressKey } from "./_data";

export type Mode = "map" | "batches" | "list";
const MODES: { k: Mode; label: string }[] = [
  { k: "map", label: "Map" },
  { k: "batches", label: "Batches" },
  { k: "list", label: "List" },
];

/* --- the shared filter panel ---------------------------------------- *
 *
 *  ONE panel, the same content on every breakpoint. Desktop anchors it
 *  under the Filters button; mobile renders it inline in a sheet. The
 *  shipped design has three separate homes for a facet (the desktop bar,
 *  the "More filters" second row, and the mobile FilterSheet), which is
 *  why a facet can be visible in one place and hidden in another at the
 *  same moment.
 *
 *  House is gone (owner: "we don't need to filter by house, just delete
 *  that"). Type stays, demoted to the bottom, because it is the one facet
 *  that is genuinely occasional.
 * ------------------------------------------------------------------ */

const DECADES = [
  { label: "1970s", from: 1970, to: 1979 },
  { label: "1980s", from: 1980, to: 1989 },
  { label: "1990s", from: 1990, to: 1999 },
  { label: "2000s", from: 2000, to: 2009 },
  { label: "2010s", from: 2010, to: 2019 },
  { label: "2020s", from: 2020, to: 2029 },
];

export function FilterPanel({
  filters,
  set,
  members,
  onClearAll,
}: {
  filters: Filters;
  set: (patch: Partial<Filters>) => void;
  members: Member[];
  onClearAll: () => void;
}) {
  const [citySearch, setCitySearch] = useState("");

  // Facet counts are computed against the OTHER filters, not against the
  // whole set and not against the current result. That is the only version
  // that answers the question the number is asked for ("how many would I
  // get if I picked this"), and it is what stops every count reading 0 the
  // moment a filter is set.
  const cityCounts = useMemo(() => {
    const rest = applyFilters(members, { ...filters, city: "" });
    return new Map(cityPoints(rest).map((p) => [p.city, p.count]));
  }, [members, filters]);

  const professionCounts = useMemo(() => {
    const rest = applyFilters(members, { ...filters, profession: "" });
    const m = new Map<string, number>();
    for (const p of rest) m.set(p.profession, (m.get(p.profession) ?? 0) + 1);
    return m;
  }, [members, filters]);

  const cities = useMemo(() => {
    const all = [...cityCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    const q = citySearch.trim().toLowerCase();
    return q ? all.filter(([c]) => c.toLowerCase().includes(q)) : all;
  }, [cityCounts, citySearch]);

  const activeDecade = DECADES.find(
    (d) => String(d.from) === filters.batchFrom && String(d.to) === filters.batchTo
  );

  return (
    <div className="max-h-[min(70vh,560px)] overflow-y-auto">
      <PanelSection title="Profession">
        <div className="flex flex-wrap gap-1.5 px-1">
          {PROFESSIONS.map((p) => (
            <Choice
              key={p}
              label={p}
              count={professionCounts.get(p) ?? 0}
              on={filters.profession === p}
              onClick={() => set({ profession: filters.profession === p ? "" : p })}
            />
          ))}
        </div>
      </PanelSection>

      <PanelSection title="City">
        <div className="px-1">
          <input
            value={citySearch}
            onChange={(e) => setCitySearch(e.target.value)}
            placeholder="Find a city"
            aria-label="Find a city"
            className="mb-2 h-9 w-full rounded-[var(--radius-input)] border border-border bg-card px-3 text-[13px] outline-none placeholder:text-muted-foreground/80 focus:border-leaf"
          />
          {/* A capped scroller, not a wrapping chip cloud: 62 cities of
              wildly different name lengths make a chip cloud a ragged
              300px block, and the list is what the search box above is
              for. 168px shows six rows, which is enough to see that
              scrolling is possible without the panel growing a screen. */}
          <div className="max-h-[168px] overflow-y-auto">
            {cities.length === 0 && (
              <p className="px-2 py-3 text-[13px] text-muted-foreground">No city by that name.</p>
            )}
            {cities.map(([city, count]) => (
              <MenuRow
                key={city}
                selected={filters.city === city}
                onClick={() => set({ city: filters.city === city ? "" : city })}
              >
                <span className="min-w-0 flex-1 truncate">{city}</span>
                <span className="shrink-0 text-[12px] tabular-nums text-muted-foreground">{count}</span>
              </MenuRow>
            ))}
          </div>
        </div>
      </PanelSection>

      <PanelSection title="Batch">
        <div className="flex flex-wrap gap-1.5 px-1">
          {DECADES.map((d) => (
            <Choice
              key={d.label}
              label={d.label}
              on={activeDecade?.label === d.label}
              onClick={() =>
                set(
                  activeDecade?.label === d.label
                    ? { batchFrom: "", batchTo: "" }
                    : { batchFrom: String(d.from), batchTo: String(d.to) }
                )
              }
            />
          ))}
        </div>
        {/* The decades are the fast path and cover the way people actually
            talk about this ("early 2000s"). The two boxes underneath are
            the escape hatch for a real span, and they stay visible rather
            than hiding behind a "custom" toggle, because a disclosure that
            hides two number inputs costs more than it saves. */}
        <div className="mt-2.5 flex items-center gap-2 px-1">
          <input
            inputMode="numeric"
            value={filters.batchFrom}
            onChange={(e) => set({ batchFrom: e.target.value.replace(/\D/g, "").slice(0, 4) })}
            placeholder="From"
            aria-label="Batch from"
            className="h-9 w-[76px] rounded-[var(--radius-input)] border border-border bg-card px-2.5 text-[13px] tabular-nums outline-none placeholder:text-muted-foreground/70 focus:border-leaf"
          />
          <span className="text-[13px] text-muted-foreground">to</span>
          <input
            inputMode="numeric"
            value={filters.batchTo}
            onChange={(e) => set({ batchTo: e.target.value.replace(/\D/g, "").slice(0, 4) })}
            placeholder="To"
            aria-label="Batch to"
            className="h-9 w-[76px] rounded-[var(--radius-input)] border border-border bg-card px-2.5 text-[13px] tabular-nums outline-none placeholder:text-muted-foreground/70 focus:border-leaf"
          />
        </div>
      </PanelSection>

      <PanelSection title="Who">
        <div className="flex flex-wrap gap-1.5 px-1">
          <Choice label="Alumni" on={filters.type === "alumni"} onClick={() => set({ type: filters.type === "alumni" ? "" : "alumni" })} />
          <Choice label="Teachers" on={filters.type === "teachers"} onClick={() => set({ type: filters.type === "teachers" ? "" : "teachers" })} />
        </div>
      </PanelSection>

      <div className="flex items-center justify-between px-3 py-2">
        <button
          type="button"
          onClick={onClearAll}
          className="rounded-full px-2 py-1 text-[13px] font-semibold text-canopy outline-none transition-transform duration-150 hover:underline active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-canopy"
        >
          Clear all
        </button>
      </div>
    </div>
  );
}

/* --- the sort control ----------------------------------------------- *
 *
 *  Owner: "I don't need name a-to-z and name z-to-a ... 'Batch: newest
 *  first' - there's just something not nice about it."
 *
 *  Two things were wrong and they are separable. The LABEL was a key-value
 *  pair reading like a database column, and the LIST carried four options
 *  that are really two options and a direction. So: three keys (Newest,
 *  Batch, Name), a direction arrow that only appears on the keys where a
 *  direction is meaningful, and no "Sort:" prefix anywhere. The trigger
 *  shows the arrow alone until you change it off the default, which is the
 *  progressive-disclosure rule applied to a control instead of a panel.
 * ------------------------------------------------------------------ */

const SORTS: { k: SortKey; label: string; short: string }[] = [
  { k: "newest", label: "Recently joined", short: "Recent" },
  { k: "batch-desc", label: "Batch, newest", short: "Batch" },
  { k: "batch-asc", label: "Batch, oldest", short: "Batch" },
  { k: "name-asc", label: "Name", short: "Name" },
];

export function SortControl({
  value,
  onChange,
  compact = false,
}: {
  value: SortKey;
  onChange: (k: SortKey) => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const current = SORTS.find((s) => s.k === value) ?? SORTS[0];
  const isDefault = value === "newest";

  return (
    <PopWrap>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={`Sort by ${current.label}`}
        className={cn(
          "state-layer inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border border-border bg-card text-[13.5px] font-medium text-foreground outline-none transition-transform duration-150 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-canopy",
          isDefault || compact ? "w-11 justify-center" : "px-4"
        )}
      >
        <svg viewBox="0 0 16 16" className="size-[15px]" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
          <path d="M4.5 2.5v11M2 11l2.5 2.5L7 11" />
          <path d="M11.5 13.5v-11M9 5l2.5-2.5L14 5" />
        </svg>
        {!isDefault && !compact && current.short}
      </button>
      <Pop open={open} onClose={() => setOpen(false)} align="end" width={190}>
        {SORTS.map((s) => (
          <MenuRow
            key={s.k}
            selected={s.k === value}
            onClick={() => {
              onChange(s.k);
              setOpen(false);
            }}
          >
            <span className="flex-1">{s.label}</span>
            {s.k === value && (
              <svg viewBox="0 0 12 12" className="size-3 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 6.5l2.5 2.5L10 3" />
              </svg>
            )}
          </MenuRow>
        ))}
      </Pop>
    </PopWrap>
  );
}

/* --- the sentence line ---------------------------------------------- *
 *
 *  The row that already had to exist ("0 results") absorbs the whole
 *  active-filter display. That is the move that makes filters cost zero
 *  rows: the shipped design pays a row for the count AND up to two more
 *  for the pills that describe the same thing.
 *
 *  It cannot wrap, structurally, and not by CSS luck: the left half is
 *  `min-w-0 overflow-hidden flex-nowrap`, the right half is `shrink-0`,
 *  and the number of tokens rendered is CAPPED IN JS rather than clipped
 *  by overflow, so the overflow indicator is always a real, countable
 *  "+2 more" that opens the panel instead of a token sliced in half.
 * ------------------------------------------------------------------ */

export function describeFilters(f: Filters): { key: string; label: string; clear: Partial<Filters> }[] {
  const out: { key: string; label: string; clear: Partial<Filters> }[] = [];
  if (f.profession) out.push({ key: "profession", label: f.profession, clear: { profession: "" } });
  if (f.city) out.push({ key: "city", label: f.city, clear: { city: "" } });
  if (f.batchFrom || f.batchTo) {
    const label = f.batchFrom && f.batchTo
      ? `${f.batchFrom} to ${f.batchTo}`
      : f.batchFrom ? `${f.batchFrom} onward` : `up to ${f.batchTo}`;
    out.push({ key: "batch", label, clear: { batchFrom: "", batchTo: "" } });
  }
  if (f.type) out.push({ key: "type", label: f.type === "alumni" ? "Alumni" : "Teachers", clear: { type: "" } });
  return out;
}

export function SentenceLine({
  count,
  filters,
  set,
  onClearAll,
  onOpenPanel,
  max = 3,
  right,
}: {
  count: number;
  filters: Filters;
  set: (patch: Partial<Filters>) => void;
  onClearAll: () => void;
  onOpenPanel: () => void;
  /** how many tokens before the rest collapse into "+N more" */
  max?: number;
  right?: React.ReactNode;
}) {
  const all = describeFilters(filters);
  const shown = all.slice(0, max);
  const hidden = all.length - shown.length;

  return (
    <div className="flex min-h-[28px] items-center justify-between gap-3">
      <div className="flex min-w-0 flex-1 flex-nowrap items-center gap-2 overflow-hidden">
        <span className="shrink-0 whitespace-nowrap text-[13.5px] text-muted-foreground">
          <b className="font-semibold tabular-nums text-foreground">{count.toLocaleString("en-IN")}</b>{" "}
          {count === 1 ? "person" : "people"}
        </span>
        {all.length > 0 && <span aria-hidden className="shrink-0 text-muted-foreground/50">·</span>}
        {shown.map((t) => (
          <Token key={t.key} label={t.label} onClear={() => set(t.clear)} />
        ))}
        {hidden > 0 && (
          <button
            type="button"
            onClick={onOpenPanel}
            className="shrink-0 rounded-full px-1.5 py-1 text-[12.5px] font-semibold text-canopy outline-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-canopy"
          >
            +{hidden} more
          </button>
        )}
      </div>
      {/* Clear lives OUTSIDE the overflowing token region, in its own shrink-0
          slot. Inside it, the tokens come first in source order and are
          themselves shrink-0, so Clear was the thing the overflow ate: at 350px
          with two filters set it rendered as "Clea". The control that undoes
          everything is the last thing that should be allowed to get clipped. */}
      {all.length > 0 && (
        <button
          type="button"
          onClick={onClearAll}
          className="shrink-0 rounded-full px-1.5 py-1 text-[12.5px] font-medium text-muted-foreground outline-none hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-canopy"
        >
          Clear
        </button>
      )}
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  Concept A - Nowrap. The control specimen.
 *
 *  The smallest change that stops the screenshot happening: drop
 *  `flex-wrap`, delete the `ml-auto` group, let search take the
 *  remainder, and truncate a set pill's value. It is genuinely better
 *  than shipped and it is about twenty lines.
 *
 *  It is here to be BEATEN, and to make the case for the bigger change
 *  honestly. What it cannot do: absorb a sixth facet, express what is
 *  applied without spending the width to do it, or say anything about
 *  progressive disclosure. At 1024 the pills alone outrun the column.
 * ------------------------------------------------------------------ */

export function ChromeNowrap({
  filters, set, onClearAll, members, count, mode, setMode, sort, setSort, narrow,
}: ChromeProps) {
  const [open, setOpen] = useState(false);
  const n = activeCount(filters);
  return (
    <div className="space-y-3">
      <div className="flex flex-nowrap items-center gap-2">
        <SearchField value={filters.q} onChange={(q) => set({ q })} className="max-w-none" />
        {/* Each pill truncates at 9rem. Without the cap
            "City: Thiruvananthapuram" is 145px and three of those plus the
            right-hand group is 700px of a 1112px column. */}
        <FacetPill label="Profession" value={filters.profession} onClear={() => set({ profession: "" })} onClick={() => setOpen(true)} />
        <FacetPill label="City" value={filters.city} onClear={() => set({ city: "" })} onClick={() => setOpen(true)} />
        <FacetPill
          label="Batch"
          value={filters.batchFrom || filters.batchTo ? `${filters.batchFrom || "..."}-${filters.batchTo || "..."}` : ""}
          onClear={() => set({ batchFrom: "", batchTo: "" })}
          onClick={() => setOpen(true)}
        />
        <PopWrap>
          <FilterButton count={n} open={open} onClick={() => setOpen((v) => !v)} compact />
          <Pop open={open} onClose={() => setOpen(false)} align="end" width={narrow ? 320 : 380}>
            <FilterPanel filters={filters} set={set} members={members} onClearAll={onClearAll} />
          </Pop>
        </PopWrap>
        <SortControl value={sort} onChange={setSort} compact={narrow} />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[13.5px] text-muted-foreground">
          <b className="font-semibold tabular-nums text-foreground">{count.toLocaleString("en-IN")}</b>{" "}
          {count === 1 ? "person" : "people"}
        </span>
        <ModeToggle items={MODES} value={mode} onChange={setMode} />
      </div>
    </div>
  );
}

function FacetPill({
  label, value, onClear, onClick,
}: {
  label: string;
  value: string;
  onClear: () => void;
  onClick: () => void;
}) {
  const set = !!value;
  return (
    <span
      className={cn(
        "inline-flex h-11 shrink-0 items-center rounded-full border text-[13px] font-medium",
        set ? "border-canopy/35 bg-canopy/[0.08] pl-4 pr-1.5 text-canopy" : "state-layer border-border bg-card px-4 text-foreground"
      )}
    >
      <button type="button" onClick={onClick} className="max-w-[9rem] truncate outline-none focus-visible:underline">
        {set ? value : label}
      </button>
      {set && (
        <button
          type="button"
          onClick={onClear}
          aria-label={`Clear ${label}`}
          className="ml-1 grid size-6 shrink-0 place-items-center rounded-full opacity-70 outline-none transition-transform hover:bg-canopy/15 hover:opacity-100 active:scale-90"
        >
          <svg viewBox="0 0 12 12" className="size-2.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <path d="M3 3l6 6M9 3l-6 6" />
          </svg>
        </button>
      )}
    </span>
  );
}

/* ------------------------------------------------------------------ *
 *  Concept B - The sentence. The recommendation.
 *
 *  Two rows, both of which already existed, and neither of which can
 *  grow a third. Row one is search plus two controls and is a fixed
 *  44px forever. Row two is the count line, which the page already
 *  rendered, now carrying the applied filters as removable tokens and
 *  the view toggle on its right.
 *
 *  Adding a filter therefore costs ZERO pixels of vertical space. That
 *  is the whole argument, and it is the one property the shipped design
 *  cannot have, because it displays a filter twice (as a pill on the bar
 *  and as a chip in the empty state) and counts it a third time on the
 *  More filters button.
 * ------------------------------------------------------------------ */

export function ChromeSentence({
  filters, set, onClearAll, members, count, mode, setMode, sort, setSort, narrow,
}: ChromeProps) {
  const [open, setOpen] = useState(false);
  const n = activeCount(filters);
  return (
    <div className="space-y-2.5">
      <div className="flex flex-nowrap items-center gap-2">
        <SearchField value={filters.q} onChange={(q) => set({ q })} />
        <PopWrap>
          <FilterButton count={n} open={open} onClick={() => setOpen((v) => !v)} compact={narrow} />
          <Pop
            open={open}
            onClose={() => setOpen(false)}
            align="end"
            /* On a phone the panel is the column, not a 380px popover hanging
               off its right edge. Same content, same component; only the width
               and the anchor change. */
            width={narrow ? 320 : 380}
          >
            <FilterPanel filters={filters} set={set} members={members} onClearAll={onClearAll} />
          </Pop>
        </PopWrap>
        <SortControl value={sort} onChange={setSort} compact={narrow} />
      </div>

      {/* Phone splits the second row in two, because a 350px column cannot
          hold a count, two tokens and a three-way toggle side by side. It is
          three rows instead of two, and it still does not GROW: the token
          strip is present at every filter count, holding just the count when
          nothing is set. The property that matters survives the breakpoint. */}
      {narrow ? (
        <>
          <ModeToggle items={MODES} value={mode} onChange={setMode} full />
          <SentenceLine
            count={count}
            filters={filters}
            set={set}
            onClearAll={onClearAll}
            onOpenPanel={() => setOpen(true)}
            max={1}
          />
        </>
      ) : (
        <SentenceLine
          count={count}
          filters={filters}
          set={set}
          onClearAll={onClearAll}
          onOpenPanel={() => setOpen(true)}
          right={<ModeToggle items={MODES} value={mode} onChange={setMode} />}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  Concept C - The content filters itself.
 *
 *  The maximal reading of "it should reveal itself when it needs to be
 *  revealed": there is no filter control at all. You narrow by touching
 *  the thing you can see. A map region, a batch tile, the profession on
 *  somebody's row. What you picked shows up in the sentence line and is
 *  removed there.
 *
 *  Built because the idea inside it is right even though the concept
 *  loses: the map and the batch grid ARE filter controls and the shipped
 *  design does not treat them as such (a city pin opens a modal list
 *  instead of setting `city=`, so the map is a dead end rather than a way
 *  in). Where it loses: you cannot construct "Technology AND Bengaluru
 *  AND 2005 to 2015" by clicking, and nothing on screen ever tells you
 *  profession filtering exists.
 * ------------------------------------------------------------------ */

export function ChromeContent({
  filters, set, onClearAll, count, mode, setMode, sort, setSort, members,
}: ChromeProps) {
  /* The panel exists but has NO permanent trigger: it appears only once you
     have already narrowed something, which is the literal reading of "it
     should reveal itself when it needs to be revealed". That is also the
     concept's weakness, stated plainly: until you touch the content, nothing
     on screen tells you profession filtering exists at all. */
  const [open, setOpen] = useState(false);
  const narrowed = activeCount(filters) > 0;
  // The suggestion strip is the whole discoverability budget: three live
  // facets drawn from the data itself, so the surface teaches what can be
  // narrowed without a control that says "Filters".
  const suggestions = useMemo(() => {
    const pts = cityPoints(members).slice(0, 2);
    const byProf = new Map<string, number>();
    for (const m of members) byProf.set(m.profession, (byProf.get(m.profession) ?? 0) + 1);
    const topProf = [...byProf.entries()].sort((a, b) => b[1] - a[1])[0];
    return [
      ...pts.map((p) => ({ label: p.city, count: p.count, apply: { city: p.city } as Partial<Filters> })),
      ...(topProf ? [{ label: topProf[0], count: topProf[1], apply: { profession: topProf[0] } as Partial<Filters> }] : []),
    ];
  }, [members]);

  return (
    <div className="space-y-3">
      <div className="flex flex-nowrap items-center gap-2">
        <SearchField value={filters.q} onChange={(q) => set({ q })} placeholder="Search, or pick a place below" />
        {narrowed && (
          <PopWrap>
            <FilterButton count={activeCount(filters)} open={open} onClick={() => setOpen((v) => !v)} compact />
            <Pop open={open} onClose={() => setOpen(false)} align="end" width={380}>
              <FilterPanel filters={filters} set={set} members={members} onClearAll={onClearAll} />
            </Pop>
          </PopWrap>
        )}
        <SortControl value={sort} onChange={setSort} compact />
      </div>
      <SentenceLine
        count={count}
        filters={filters}
        set={set}
        onClearAll={onClearAll}
        onOpenPanel={() => setOpen(true)}
        right={<ModeToggle items={MODES} value={mode} onChange={setMode} />}
      />
      {activeCount(filters) === 0 && (
        <div className="flex flex-nowrap items-center gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <span className="shrink-0 text-[12.5px] text-muted-foreground">Jump to</span>
          {suggestions.map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => set(s.apply)}
              className="state-layer inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[12.5px] font-medium text-foreground outline-none transition-transform duration-150 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-canopy"
            >
              {s.label}
              <span className="tabular-nums text-muted-foreground">{s.count}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  Concept D - Type to filter.
 *
 *  The search box offers FACETS as well as people. Typing "beng" proposes
 *  "Bengaluru, 78 people" as a filter above the individual name matches;
 *  picking it drops a token into the sentence line and clears the input,
 *  so the box is reusable for the next narrowing.
 *
 *  This is not really a fourth structure. It is a layer that sits on top
 *  of concept B, and the honest recommendation is to ship B first and add
 *  this once the vocabularies are real. It is built here so the feel can
 *  be judged rather than imagined: try "ben", "tech", "20", "lon".
 * ------------------------------------------------------------------ */

type Suggestion =
  | { kind: "facet"; facet: string; label: string; count: number; apply: Partial<Filters> }
  | { kind: "person"; member: Member };

export function ChromeTyped({
  filters, set, onClearAll, members, count, mode, setMode, sort, setSort,
}: ChromeProps) {
  const [open, setOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = useMemo<Suggestion[]>(() => {
    const q = draft.trim().toLowerCase();
    if (q.length < 2) return [];
    const out: Suggestion[] = [];

    // Cities first: a place is the highest-value narrowing in this product
    // and also the one people type by accident when they mean to filter.
    for (const p of cityPoints(members)) {
      if (p.city.toLowerCase().includes(q)) {
        out.push({ kind: "facet", facet: "City", label: p.city, count: p.count, apply: { city: p.city } });
      }
      if (out.length >= 3) break;
    }
    for (const p of PROFESSIONS) {
      if (p.toLowerCase().includes(q)) {
        const c = members.filter((m) => m.profession === p).length;
        if (c > 0) out.push({ kind: "facet", facet: "Profession", label: p, count: c, apply: { profession: p } });
      }
    }
    // A bare year is almost always a batch, so offer it as one.
    if (/^\d{4}$/.test(q)) {
      const c = members.filter((m) => m.batchYear === Number(q)).length;
      if (c > 0) out.push({ kind: "facet", facet: "Batch", label: `Batch of ${q}`, count: c, apply: { batchFrom: q, batchTo: q } });
    }
    const people = members.filter((m) => m.name.toLowerCase().includes(q)).slice(0, 4);
    for (const m of people) out.push({ kind: "person", member: m });
    return out.slice(0, 8);
  }, [draft, members]);

  function commit(s: Suggestion) {
    if (s.kind === "facet") {
      set(s.apply);
      setDraft("");
      setOpen(false);
      inputRef.current?.focus();
    }
  }

  const n = activeCount(filters);

  return (
    <div className="space-y-3">
      <div className="flex flex-nowrap items-center gap-2">
        <PopWrap className="flex min-w-0 flex-1">
          <SearchField
            inputRef={inputRef}
            value={draft}
            onChange={(v) => {
              setDraft(v);
              setOpen(v.trim().length >= 2);
              set({ q: "" });
            }}
            onFocus={() => setOpen(draft.trim().length >= 2)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && suggestions[0]?.kind === "facet") {
                e.preventDefault();
                commit(suggestions[0]);
              }
              if (e.key === "Enter" && suggestions[0]?.kind !== "facet") {
                set({ q: draft });
                setOpen(false);
              }
            }}
            placeholder="Search a name, or type a place to filter"
          />
          <Pop open={open && suggestions.length > 0} onClose={() => setOpen(false)} width={420}>
            {suggestions.map((s, i) =>
              s.kind === "facet" ? (
                <MenuRow key={`f${i}`} onClick={() => commit(s)}>
                  <span className="grid size-5 shrink-0 place-items-center rounded-[5px] bg-canopy/[0.10] text-[9px] font-bold uppercase text-canopy">
                    {s.facet[0]}
                  </span>
                  <span className="min-w-0 flex-1 truncate">
                    <span className="text-muted-foreground">{s.facet} </span>
                    <b className="font-semibold">{s.label}</b>
                  </span>
                  <span className="shrink-0 text-[12px] tabular-nums text-muted-foreground">{s.count}</span>
                </MenuRow>
              ) : (
                <MenuRow key={`p${i}`} onClick={() => { set({ q: s.member.name }); setDraft(s.member.name); setOpen(false); }}>
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-mist text-[9px] font-bold text-muted-foreground">
                    {s.member.name[0]}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{s.member.name}</span>
                  <span className="shrink-0 text-[12px] text-muted-foreground">
                    {s.member.batchYear ? `'${String(s.member.batchYear).slice(-2)}` : "Teacher"}
                  </span>
                </MenuRow>
              )
            )}
          </Pop>
        </PopWrap>
        <PopWrap>
          <FilterButton count={n} open={panelOpen} onClick={() => setPanelOpen((v) => !v)} />
          <Pop open={panelOpen} onClose={() => setPanelOpen(false)} align="end" width={380}>
            <FilterPanel filters={filters} set={set} members={members} onClearAll={onClearAll} />
          </Pop>
        </PopWrap>
        <SortControl value={sort} onChange={setSort} />
      </div>
      <SentenceLine
        count={count}
        filters={filters}
        set={set}
        onClearAll={onClearAll}
        onOpenPanel={() => setPanelOpen(true)}
        right={<ModeToggle items={MODES} value={mode} onChange={setMode} />}
      />
    </div>
  );
}

/* --- the viewport hook ----------------------------------------------- *
 *
 *  `useSyncExternalStore`, not `useState` plus an effect. The effect version
 *  is what most codebases write and it is wrong twice here: it trips
 *  `react-hooks/set-state-in-effect`, and it paints one frame of the desktop
 *  layout on a phone before correcting, which on this page means four
 *  concepts visibly reflowing on load. `useSyncExternalStore` takes a server
 *  snapshot as its third argument, so the server renders the desktop branch
 *  deliberately and the client agrees on the first paint.
 * ------------------------------------------------------------------ */

const NARROW_QUERY = "(max-width: 639px)";

function subscribeNarrow(cb: () => void) {
  const mq = window.matchMedia(NARROW_QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

export function useIsNarrow(): boolean {
  return useSyncExternalStore(
    subscribeNarrow,
    () => window.matchMedia(NARROW_QUERY).matches,
    () => false
  );
}

/* --- shared props + the harness that measures a concept -------------- */

export type ChromeProps = {
  filters: Filters;
  set: (patch: Partial<Filters>) => void;
  onClearAll: () => void;
  members: Member[];
  count: number;
  mode: Mode;
  setMode: (m: Mode) => void;
  sort: SortKey;
  setSort: (s: SortKey) => void;
  /**
   * Phone layout. A PROP rather than a `sm:` breakpoint because the bench
   * below simulates a viewport with a fixed-width container, and Tailwind
   * breakpoints read the window, not the container. In the real app this is
   * one media query; here it has to be passed, or the narrow specimens would
   * silently render their desktop selves and prove nothing.
   */
  narrow?: boolean;
};

/**
 * Wraps a concept, measures its rendered height and counts its visual rows
 * the same way the DOM probe does: by the number of distinct top edges among
 * its own controls. Both numbers are printed, so a claim of "two rows" on
 * this page is checkable by looking at the page.
 */
export function ChromeBench({
  label,
  tone = "option",
  note,
  width,
  children,
}: {
  label: string;
  tone?: "shipped" | "option" | "pick";
  note?: string;
  /** render the concept inside a fixed-width viewport simulation */
  width?: number;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [m, setM] = useState<{ h: number; rows: number } | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      // Rows are CLUSTERED by centre, not bucketed by a rounded top edge.
      // Bucketing was the first attempt and it over-counted: a 20px clear-x
      // nested inside a 44px pill has a top edge 12px below the pill's, so
      // two controls the eye reads as one row fell either side of a bucket
      // boundary and concept A reported three rows while plainly showing two.
      // Clustering on the vertical CENTRE and merging anything within 14px
      // (a third of the control height) counts what a person counts.
      const centres = [...el.querySelectorAll("input, button")]
        .map((c) => c.getBoundingClientRect())
        .filter((b) => b.width > 2 && b.height > 2)
        .map((b) => b.top + b.height / 2)
        .sort((x, y) => x - y);

      let rows = 0;
      let anchor = -Infinity;
      for (const c of centres) {
        if (c - anchor > 14) {
          rows++;
          anchor = c;
        }
      }
      setM({ h: Math.round(el.getBoundingClientRect().height), rows });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [children]);

  const chip =
    tone === "pick" ? "bg-leaf/14 text-leaf" : tone === "shipped" ? "bg-mist text-muted-foreground" : "bg-sky/12 text-sky";

  return (
    <figure className="min-w-0" data-shot={label}>
      <figcaption className="mb-2.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className={cn("rounded-full px-3 py-1 text-[12px] font-bold uppercase tracking-[0.1em]", chip)}>
          {label}
        </span>
        {m && (
          <span className="text-[12.5px] tabular-nums text-muted-foreground">
            <b className="font-semibold text-foreground">{m.h}px</b> tall · {m.rows} row{m.rows === 1 ? "" : "s"}
          </span>
        )}
        {note && <span className="text-[13px] text-muted-foreground">{note}</span>}
      </figcaption>
      {/* When a width is simulated, the WELL takes that width too, so the box
          edge you see IS the pretend viewport edge. Left full-bleed, a 696px
          specimen floated in the middle of a 1168px well and the number in the
          label was the only evidence of the constraint. */}
      <div
        className="overflow-hidden rounded-2xl border border-border bg-mist p-4"
        style={width ? { width: width + 32 } : undefined}
      >
        <div ref={ref} style={width ? { width } : undefined}>
          {children}
        </div>
      </div>
    </figure>
  );
}
