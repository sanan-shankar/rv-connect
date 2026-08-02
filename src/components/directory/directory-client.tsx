"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { AnimatePresence, motion } from "motion/react";
import { Search, SlidersHorizontal, ArrowLeft } from "lucide-react";
import { SPRINGS } from "@/components/common/motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  FacetSelect,
  FacetSearchSelect,
  RangeFacetPill,
  SortPill,
  ActiveFilterChips,
  ResultCount,
  FilterSheet,
  type ActiveChip,
} from "@/components/common/filters";
import {
  PROFESSION_OPTIONS,
  HOUSE_OPTIONS,
  TYPE_OPTIONS,
  directorySortOptions,
  directoryDefaultSort,
} from "@/lib/directory-facets";
import { ProfileCard } from "./profile-card";
import { AlumniMap, type CityPin, type PinPerson } from "./alumni-map";
import { loadDirectoryPage } from "@/app/(main)/directory/actions";
import { useTourAnchor } from "@/components/tour/tour-anchors";
import { NoResultsHoopoe } from "@/components/mascot/moments/no-results-hoopoe";

interface User {
  id: string;
  name: string;
  avatarColor: string | null;
  photoUrl?: string | null;
  birdOverride?: string | null;
  accountType?: string | null;
  verifyState?: string | null;
  batchType: string | null;
  batchYear: number | null;
  currentCity: string | null;
  jobTitle: string | null;
}

interface DirectoryFiltersState {
  q: string;
  year: string;
  city: string;
  profession: string;
  house: string;
  type: string;
  yearFrom: string;
  yearTo: string;
  sort: string;
}

interface DirectoryClientProps {
  users: User[];
  resultCount: number;
  cityPins: CityPin[];
  unmappedCount: number;
  unmappedPeople: PinPerson[];
  batchYearCounts: { year: number; count: number }[];
  facultyCount: number;
  cities: string[];
  minBatchYear: number;
  maxBatchYear: number;
  initialFilters: DirectoryFiltersState;
  hasFilter: boolean;
  nextCursor: string | null;
}

function batchRangeText(from: string, to: string): string {
  if (from && to) return `Batch: ${from} to ${to}`;
  if (from) return `Batch: ${from} onward`;
  if (to) return `Batch: up to ${to}`;
  return "Batch";
}

export function DirectoryClient({
  users,
  resultCount,
  cityPins,
  unmappedCount,
  unmappedPeople,
  batchYearCounts,
  facultyCount,
  cities,
  minBatchYear,
  maxBatchYear,
  initialFilters,
  hasFilter,
  nextCursor,
}: DirectoryClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tourAnchorRef = useTourAnchor<HTMLDivElement>("directory-search");
  const [query, setQuery] = useState(initialFilters.q);
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(
    !!(initialFilters.house || initialFilters.type)
  );
  const [sheetOpen, setSheetOpen] = useState(false);
  // When filtering, default to the People (grid) view so results are visible;
  // otherwise the zero-typing browse opens on the Map.
  const [browseView, setBrowseView] = useState<"map" | "batches" | "people">(
    hasFilter ? "people" : "map"
  );
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Accumulated results for keyset "Load more". Seeded from the SSR first page and
  // reset whenever the server hands a new first page (filters changed).
  const [results, setResults] = useState<User[]>(users);
  const [cursor, setCursor] = useState<string | null>(nextCursor);
  const [loadingMore, setLoadingMore] = useState(false);
  const [gridRef] = useAutoAnimate();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Resyncs the list from freshly server-rendered props when the query changes. The server is the source of truth here; this mirrors it into the local paging state.
    setResults(users);
    setCursor(nextCursor);
    setBrowseView(hasFilter ? "people" : "map");
  }, [users, nextCursor, hasFilter]);

  async function handleLoadMore() {
    if (!cursor) return;
    setLoadingMore(true);
    const data = await loadDirectoryPage({
      filters: {
        q: initialFilters.q || undefined,
        year: initialFilters.year || undefined,
        city: initialFilters.city || undefined,
        profession: initialFilters.profession || undefined,
        house: initialFilters.house || undefined,
        type: initialFilters.type || undefined,
        sort: initialFilters.sort || undefined,
        yearFrom: initialFilters.yearFrom || undefined,
        yearTo: initialFilters.yearTo || undefined,
      },
      cursor,
    });
    setResults((prev) => {
      const seen = new Set(prev.map((u) => u.id));
      return [...prev, ...data.users.filter((u) => !seen.has(u.id))];
    });
    setCursor(data.nextCursor);
    setLoadingMore(false);
  }

  const updateFilters = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`/directory?${params.toString()}`);
    },
    [router, searchParams]
  );

  const updateBatchRange = useCallback(
    (next: { from: string; to: string }) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next.from) params.set("yearFrom", next.from); else params.delete("yearFrom");
      if (next.to) params.set("yearTo", next.to); else params.delete("yearTo");
      router.push(`/directory?${params.toString()}`);
    },
    [router, searchParams]
  );

  const handleSearch = useCallback(
    (value: string) => {
      setQuery(value);
      if (searchTimer.current) clearTimeout(searchTimer.current);
      searchTimer.current = setTimeout(() => updateFilters("q", value), 300);
    },
    [updateFilters]
  );

  function clearAll() {
    setQuery("");
    router.push("/directory");
  }

  const showingYear = !!initialFilters.year;
  const yearLabel =
    initialFilters.year === "faculty"
      ? "Faculty"
      : initialFilters.year
        ? `Batch of '${initialFilters.year.slice(-2)}`
        : "";

  // Top five cities, derived from the same pins the map plots.
  const topCities = [...cityPins].sort((a, b) => b.count - a.count).slice(0, 5);

  const cityOptions = useMemo(() => cities.map((c) => ({ value: c, label: c })), [cities]);
  const hasQuery = !!initialFilters.q;
  const sortOptions = directorySortOptions(hasQuery);
  const sortValue = initialFilters.sort || directoryDefaultSort(hasQuery);

  const secondaryCount =
    (initialFilters.house ? 1 : 0) +
    (initialFilters.type ? 1 : 0);

  const activeChips: ActiveChip[] = [];
  if (initialFilters.profession) {
    activeChips.push({
      key: "profession",
      label: `Profession: ${initialFilters.profession}`,
      onClear: () => updateFilters("profession", ""),
    });
  }
  if (initialFilters.city) {
    activeChips.push({
      key: "city",
      label: `City: ${initialFilters.city}`,
      onClear: () => updateFilters("city", ""),
    });
  }
  if (initialFilters.yearFrom || initialFilters.yearTo) {
    activeChips.push({
      key: "batch",
      label: batchRangeText(initialFilters.yearFrom, initialFilters.yearTo),
      onClear: () => updateBatchRange({ from: "", to: "" }),
    });
  }
  if (initialFilters.house) {
    activeChips.push({
      key: "house",
      label: `House: ${initialFilters.house}`,
      onClear: () => updateFilters("house", ""),
    });
  }
  if (initialFilters.type) {
    const typeOption = TYPE_OPTIONS.find((o) => o.value === initialFilters.type);
    activeChips.push({
      key: "type",
      label: `Type: ${typeOption?.label ?? initialFilters.type}`,
      onClear: () => updateFilters("type", ""),
    });
  }

  // People (results) only appears while a filter is active; the map and batches
  // are always reachable so filtering narrows the map rather than replacing it.
  const views: ("map" | "batches" | "people")[] = hasFilter
    ? ["people", "map", "batches"]
    : ["map", "batches"];

  // Shared between the desktop rail and the mobile FilterSheet (which stacks
  // every facet full-width) so neither rewrites the same six facet configs.
  // Primary = the facets that stay visible on the desktop toolbar row
  // (Profession, City, Batch); secondary stays behind "More filters".
  function renderPrimaryFacets(fullWidth: boolean) {
    const className = fullWidth ? "w-full" : undefined;
    return (
      <>
        <FacetSelect
          label="Profession"
          value={initialFilters.profession}
          onChange={(v) => updateFilters("profession", v)}
          options={PROFESSION_OPTIONS}
          anyLabel="Any profession"
          className={className}
        />
        <FacetSearchSelect
          label="City"
          value={initialFilters.city}
          onChange={(v) => updateFilters("city", v)}
          options={cityOptions}
          anyLabel="Any city"
          searchPlaceholder="Search cities..."
          className={className}
        />
        <RangeFacetPill
          from={initialFilters.yearFrom}
          to={initialFilters.yearTo}
          onChange={updateBatchRange}
          minYear={minBatchYear}
          maxYear={maxBatchYear}
          className={className}
        />
      </>
    );
  }

  function renderSecondaryFacets(fullWidth: boolean) {
    const className = fullWidth ? "w-full" : undefined;
    return (
      <>
        <FacetSearchSelect
          label="House"
          value={initialFilters.house}
          onChange={(v) => updateFilters("house", v)}
          options={HOUSE_OPTIONS}
          anyLabel="Any house"
          className={className}
        />
        <FacetSelect
          label="Type"
          value={initialFilters.type}
          onChange={(v) => updateFilters("type", v)}
          options={TYPE_OPTIONS}
          anyLabel="Everyone"
          className={className}
        />
      </>
    );
  }

  // Shared by the mobile and desktop search boxes so neither drifts from the
  // other (the desktop one is a fixed, shorter width; mobile fills the row).
  function renderSearchBox(className: string) {
    return (
      <div className={className}>
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search people by name, city, or work."
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          className="h-10 rounded-full border-border bg-card pl-10"
        />
      </div>
    );
  }

  function renderBackButton() {
    if (!(showingYear || hasFilter)) return null;
    return (
      <Button
        variant="outline"
        size="icon"
        onClick={() => router.push("/directory")}
        title="Back to browse"
      >
        <ArrowLeft className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <div>
      {/* Tier 1: search + always-visible facets. */}
      <div ref={tourAnchorRef} data-tour="directory-search" className="mb-6 space-y-3">
        {/* Desktop (>=1024px): one row -- back (if applicable), a shorter
            fixed-width search box, then Profession/City/Batch, then Sort +
            More filters + Clear all pinned right. The pills themselves
            double as the active-filter chips (Label: Value + x), so there's
            no separate chip row here. */}
        <div className="hidden flex-wrap items-center gap-2.5 lg:flex">
          {renderBackButton()}
          {renderSearchBox("relative w-[320px] shrink-0 xl:w-[380px]")}
          {renderPrimaryFacets(false)}
          <div className="ml-auto flex items-center gap-2.5">
            <SortPill value={sortValue} onChange={(v) => updateFilters("sort", v)} options={sortOptions} />
            <button
              type="button"
              onClick={() => setMoreFiltersOpen((v) => !v)}
              aria-expanded={moreFiltersOpen}
              // state-layer for the neutral hover; the OPEN state stays canopy
              // (aria-expanded), because selection is the app's one green state
              // and must not be expressed by the same wash as hover. Swapping
              // bg-secondary for bg-accent moved this pill one ladder rung,
              // which on the tan page is under the noticeable threshold.
              className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-border bg-secondary px-4 text-[13px] font-medium text-foreground transition-[colors,transform] duration-150 state-layer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-[0.97] aria-expanded:border-canopy/35 aria-expanded:bg-canopy/[0.08] aria-expanded:text-canopy"
            >
              <SlidersHorizontal className="size-3.5" aria-hidden />
              More filters
              {secondaryCount > 0 && <span className="opacity-80">· {secondaryCount}</span>}
            </button>
            {hasFilter && (
              <button
                type="button"
                onClick={clearAll}
                className="shrink-0 whitespace-nowrap rounded-full px-2.5 py-2 text-[13px] font-semibold text-canopy underline-offset-2 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-canopy/40"
              >
                Clear all
              </button>
            )}
          </div>
        </div>

        <AnimatePresence initial={false}>
          {moreFiltersOpen && (
            <motion.div
              key="more-filters"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={SPRINGS.gentle}
              className="hidden flex-wrap items-center gap-2.5 lg:flex"
            >
              {renderSecondaryFacets(false)}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile (<1024px): back (if applicable) + full-width search, then
            Sort + Filters(N) button; a horizontally scrollable chip strip
            mirrors whatever is set since the pills themselves live in the
            sheet on this breakpoint. */}
        <div className="flex gap-2 lg:hidden">
          {renderBackButton()}
          {renderSearchBox("relative flex-1")}
        </div>
        <div className="flex items-center gap-2.5 lg:hidden">
          <SortPill
            value={sortValue}
            onChange={(v) => updateFilters("sort", v)}
            options={sortOptions}
            className="flex-1"
          />
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-border bg-secondary px-4 text-[13px] font-medium text-foreground transition-[colors,transform] duration-150 state-layer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-[0.97]"
          >
            <SlidersHorizontal className="size-3.5" aria-hidden />
            Filters
            {activeChips.length > 0 && <span className="opacity-80">· {activeChips.length}</span>}
          </button>
        </div>
        {activeChips.length > 0 && (
          <ActiveFilterChips chips={activeChips} onClearAll={clearAll} className="lg:hidden" />
        )}
      </div>

      <FilterSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onClearAll={clearAll}
        hasActive={hasFilter}
        showLabel={`Show ${resultCount} ${resultCount === 1 ? "person" : "people"}`}
      >
        {renderPrimaryFacets(true)}
        {renderSecondaryFacets(true)}
      </FilterSheet>

      {/* View toggle. People (results) appears only while filtering; the map and
          batches stay available so an active filter narrows the map in place
          instead of abandoning it for a flat grid. */}
      <div className="mb-4 inline-flex rounded-full border border-border bg-card p-1">
        {views.map((v) => (
          <button
            key={v}
            onClick={() => setBrowseView(v)}
            className={`relative rounded-full px-4 py-1.5 text-[13px] font-semibold capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-[0.97] ${
              browseView === v
                ? "text-canopy"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {browseView === v && (
              <motion.span
                layoutId="directoryViewThumb"
                className="absolute inset-0 z-0 rounded-full border-[1.5px] border-canopy bg-background"
                transition={SPRINGS.snappy}
              />
            )}
            <span className="relative z-10">
              {v === "map" ? "Map" : v === "batches" ? "Batches" : "People"}
            </span>
          </button>
        ))}
      </div>

      {browseView === "people" ? (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-baseline gap-2 text-sm text-muted-foreground">
              {yearLabel && <span className="font-medium text-foreground">{yearLabel}</span>}
              <ResultCount
                count={resultCount}
                singular={hasFilter ? "result" : "person"}
                plural={hasFilter ? "results" : "people"}
                className=""
              />
              {resultCount > results.length && (
                <span className="text-muted-foreground/80">· showing {results.length}</span>
              )}
            </div>
          </div>

          {results.length === 0 ? (
            <div className="card-elevated rounded-[var(--radius)] border border-border bg-card p-12 text-center">
              <div className="mb-3 flex justify-center">
                <NoResultsHoopoe size={76} />
              </div>
              <p className="font-heading text-lg text-foreground">
                No one matches these filters.
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Try removing a filter or clearing your search.
              </p>
              {activeChips.length > 0 && (
                <div className="mt-4 flex flex-wrap justify-center">
                  <ActiveFilterChips chips={activeChips} onClearAll={clearAll} className="justify-center" />
                </div>
              )}
            </div>
          ) : (
            <>
              <div
                ref={gridRef}
                className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
              >
                {results.map((user) => (
                  <ProfileCard key={user.id} user={user} />
                ))}
              </div>
              {cursor && (
                <div className="flex justify-center pt-6">
                  <Button
                    variant="outline"
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="rounded-full"
                  >
                    {loadingMore ? "Loading..." : "Load more"}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      ) : browseView === "map" ? (
        cityPins.length === 0 && unmappedCount === 0 ? (
          <div className="card-elevated rounded-[var(--radius)] border border-border bg-card p-12 text-center">
            <p className="font-heading text-lg tracking-tight text-foreground">
              {hasFilter
                ? "No one on the map matches these filters."
                : "The map fills in as people add their city."}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {hasFilter
                ? "Try the People view, widen a filter, or clear your search."
                : "Add yours from your profile and watch the valley spread across the world."}
            </p>
            {hasFilter && (
              <Button variant="outline" className="mt-4 rounded-full" onClick={clearAll}>
                Clear all
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <AlumniMap
              pins={cityPins}
              unmapped={unmappedCount}
              unmappedPeople={unmappedPeople}
            />
            {topCities.length > 0 && (
              <div className="card-elevated rounded-[var(--radius)] border border-border bg-card p-4">
                <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Top cities
                </h3>
                <div className="flex flex-wrap gap-2">
                  {topCities.map((c) => (
                    <button
                      key={c.city}
                      onClick={() => updateFilters("city", c.city)}
                      className="flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1.5 text-[13px] text-foreground transition-[colors,transform] state-layer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-95"
                    >
                      <span className="font-medium">{c.city}</span>
                      <span className="text-muted-foreground">{c.count}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          {batchYearCounts.map(({ year, count }) => (
            <button
              key={year}
              onClick={() => updateFilters("year", String(year))}
              className="card-elevated group flex flex-col items-center rounded-[var(--radius)] border border-border bg-card p-4 pt-3.5 transition-[colors,transform] duration-200 hover:border-canopy/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-[0.97]"
            >
              <span className="font-heading text-lg font-bold tracking-tight text-foreground group-hover:text-primary">
                &apos;{String(year).slice(-2)}
              </span>
              <span className="mt-1 text-xs text-muted-foreground">
                {count} {count === 1 ? "person" : "people"}
              </span>
            </button>
          ))}
          {facultyCount > 0 && (
            <button
              onClick={() => updateFilters("year", "faculty")}
              className="card-elevated group flex flex-col items-center rounded-[var(--radius)] border border-border bg-card p-4 pt-3.5 transition-[colors,transform] duration-200 hover:border-canopy/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-[0.97]"
            >
              <span className="font-heading text-base font-bold tracking-tight text-foreground group-hover:text-primary">
                Faculty
              </span>
              <span className="mt-1 text-xs text-muted-foreground">
                {facultyCount} {facultyCount === 1 ? "teacher" : "teachers"}
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
