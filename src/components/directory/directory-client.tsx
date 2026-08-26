"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { Search, ArrowLeft } from "lucide-react";
import { SegmentedPills } from "@/components/common/segmented-pills";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  FacetSelect,
  FacetSearchSelect,
  RangeFacetPill,
  FilterSheet,
  FilterButton,
  FilterPopover,
  SentenceLine,
  type SentenceToken,
} from "@/components/common/filters";
import { HOUSE_OPTIONS, TYPE_OPTIONS } from "@/lib/directory-facets";
import { toast } from "sonner";
import { callAction } from "@/lib/call-action";
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
  /** True for a viewer below Stage 1 of the trust model (email not yet
   *  confirmed): the server sent counts and pin geography but NO people, so
   *  the people surfaces explain themselves instead of claiming "no one
   *  matches". The rule itself lives server-side (directory/page.tsx and
   *  actions.ts); this only makes it legible. */
  namesLocked?: boolean;
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
  namesLocked = false,
}: DirectoryClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tourAnchorRef = useTourAnchor<HTMLDivElement>("directory-search");
  const [query, setQuery] = useState(initialFilters.q);
  /* One panel, two presentations: `panelOpen` is the desktop popover,
     `sheetOpen` the mobile bottom sheet. Separate flags rather than one,
     because both can be mounted at once across a resize and closing one
     must not close the other out from under it. */
  const [panelOpen, setPanelOpen] = useState(false);
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

  /* Which list the rows on screen belong to. Bumped every time the server
     hands down a new first page, and captured by any "Load more" in flight:
     a page fetched under the OLD filters used to be appended to the NEW list
     when it landed a moment later, and its cursor adopted with it, so the
     member saw two different result sets stitched together and every later
     page continued the wrong one (audit M36). */
  const listGeneration = useRef(0);

  useEffect(() => {
    // Resyncs the list from freshly server-rendered props when the query changes. The server is the source of truth here; this mirrors it into the local paging state.
    listGeneration.current += 1;
    setResults(users);
    setCursor(nextCursor);
    setBrowseView(hasFilter ? "people" : "map");
  }, [users, nextCursor, hasFilter]);

  /* The search debounce outlives this component without it. Type, then
     navigate away inside the 300ms, and the timer still fires its
     router.push("/directory?q=...") and hauls the member back to a page they
     had left (audit Low 71). */
  useEffect(() => {
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, []);

  async function handleLoadMore() {
    if (!cursor) return;
    setLoadingMore(true);
    const generation = listGeneration.current;
    try {
      // callAction: a rejected page (deploy skew, dropped network, expired
      // session) used to leave "Load more" disabled for the rest of the
      // session, since the setLoadingMore(false) below never ran (audit B-042).
      const data = await callAction(() =>
        loadDirectoryPage({
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
          // Only read if the cursor row has left the result set; see the
          // recovery in loadDirectoryPage (audit M39).
          loaded: results.length,
        })
      );
      // The filters changed while this was in flight, so these rows belong to
      // a list that is no longer on screen (audit M36). Dropping them is the
      // whole fix: the server has already sent the new first page.
      if (generation !== listGeneration.current) return;
      if ("error" in data) {
        toast.error(data.error);
        return;
      }
      setResults((prev) => {
        const seen = new Set(prev.map((u) => u.id));
        return [...prev, ...data.users.filter((u) => !seen.has(u.id))];
      });
      setCursor(data.nextCursor);
    } finally {
      setLoadingMore(false);
    }
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

  const cityOptions = useMemo(() => cities.map((c) => ({ value: c, label: c })), [cities]);
  /* Sorting is gone from the chrome entirely (owner, 2026-08-03: "I think we
     just remove sorting, I don't see anyone gonna use it"). The `sort` param
     is still read from the URL and still forwarded to the server below, so an
     old bookmark keeps working and the server keeps its default ordering; only
     the control that nobody was going to touch is removed. */

  /* The sentence's tokens. BARE values, not the kit's "Label: Value" chip
     form: inside a sentence the facet's name is implied by its value, and
     "12 results, City: Chennai" reads like a database row rather than a
     line of English. Order is the order someone would say them. */
  const sentenceTokens: SentenceToken[] = [];
  /* The Profession CONTROL is deliberately not rendered (owner, 2026-08-26).
     It filtered `User.workplace` by exact equality against an 18-value list
     that the deleted onboarding Industry select used to write; measured on the
     live database that day, it matched 0 of 63 members while 28 had a
     workplace, because workplace now holds a free-text ORGANISATION and the
     role lives in jobTitle. The facet returns when the LLM-derived profession
     tag ships (docs/planning/FEATURES.md section 2), which needs its own
     column -- the equality arm below is not reusable for it.
     `directory-rule.test.mjs` fails the day that column appears, so this
     cannot be forgotten.
     This chip stays on purpose: it is the only way to clear a bookmarked
     ?profession= now that no control can. */
  if (initialFilters.profession) {
    sentenceTokens.push({
      key: "profession",
      label: initialFilters.profession,
      onClear: () => updateFilters("profession", ""),
    });
  }
  if (initialFilters.city) {
    sentenceTokens.push({
      key: "city",
      label: initialFilters.city,
      onClear: () => updateFilters("city", ""),
    });
  }
  if (initialFilters.yearFrom || initialFilters.yearTo) {
    sentenceTokens.push({
      key: "batch",
      label: batchRangeText(initialFilters.yearFrom, initialFilters.yearTo),
      onClear: () => updateBatchRange({ from: "", to: "" }),
    });
  }
  if (initialFilters.house) {
    sentenceTokens.push({
      key: "house",
      label: initialFilters.house,
      onClear: () => updateFilters("house", ""),
    });
  }
  if (initialFilters.type) {
    const typeOption = TYPE_OPTIONS.find((o) => o.value === initialFilters.type);
    sentenceTokens.push({
      key: "type",
      label: typeOption?.label ?? initialFilters.type,
      onClear: () => updateFilters("type", ""),
    });
  }
  if (initialFilters.year) {
    sentenceTokens.push({
      key: "year",
      label: yearLabel,
      onClear: () => updateFilters("year", ""),
    });
  }

  /* What the Filters button tallies: the facets it actually opens. The free
     text search and the batch-tile year are set elsewhere (the search box, a
     Batches tile), so counting them here would blame the button for state it
     does not own. */
  const activeFacetCount =
    (initialFilters.city ? 1 : 0) +
    (initialFilters.yearFrom || initialFilters.yearTo ? 1 : 0) +
    (initialFilters.house ? 1 : 0) +
    (initialFilters.type ? 1 : 0);

  // People (results) only appears while a filter is active; the map and batches
  // are always reachable so filtering narrows the map rather than replacing it.
  const views: ("map" | "batches" | "people")[] = hasFilter
    ? ["people", "map", "batches"]
    : ["map", "batches"];
  const viewSegments = views.map((v) => ({
    key: v,
    label: v === "map" ? "Map" : v === "batches" ? "Batches" : "People",
  }));

  // Shared between the desktop rail and the mobile FilterSheet (which stacks
  // every facet full-width) so neither rewrites the same six facet configs.
  // Primary = the facets that stay visible on the desktop toolbar row
  // (City, Batch); secondary stays behind "More filters".
  function renderPrimaryFacets(fullWidth: boolean, compact = false) {
    // h-9 in the desktop popover, h-10 (the full touch target) in the mobile
    // sheet. twMerge lets the later height win over PILL_BASE's h-10.
    const className = fullWidth ? (compact ? "w-full h-9" : "w-full") : undefined;
    return (
      <>
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

  function renderSecondaryFacets(fullWidth: boolean, compact = false) {
    const className = fullWidth ? (compact ? "w-full h-9" : "w-full") : undefined;
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
      {/* THE CHROME: two rows, and it cannot grow a third.
          Row one is search + Filters + Sort, a fixed 40px forever. Row two is
          the sentence line, which the page already owed for the result count,
          now also carrying the applied filters as removable tokens and the
          view toggle on its right.

          Adding a filter therefore costs ZERO vertical pixels. That is the
          whole point (owner, 2026-08-03: "use sentence for filter"; Concept B
          in /lab/directory). What this replaced showed one filter in three
          places at once: a facet pill on the toolbar, a chip in the mobile
          strip, and a tally on the More-filters button, and opening that
          disclosure pushed the entire page down. */}
      <div ref={tourAnchorRef} data-tour="directory-search" className="mb-4 space-y-2.5">
        <div className="flex flex-nowrap items-center gap-2">
          {renderBackButton()}
          {renderSearchBox("relative min-w-0 flex-1")}
          {/* Desktop: the facets live in a popover on this button. Mobile: the
              same facets, in the kit's existing bottom sheet (it carries its
              own "Show N" footer, which is the right ending for a full-screen
              surface and wrong for a small anchored panel). */}
          <div className="hidden lg:block">
            <FilterPopover
              open={panelOpen}
              onOpenChange={setPanelOpen}
              trigger={<FilterButton count={activeFacetCount} onClick={() => setPanelOpen((v) => !v)} />}
            >
              {/* `compact` shrinks the facets to h-9 in the panel; the sheet on
                  mobile keeps them at the full h-10 touch target. */}
              {renderPrimaryFacets(true, true)}
              {renderSecondaryFacets(true, true)}
            </FilterPopover>
          </div>
          <FilterButton
            count={activeFacetCount}
            onClick={() => setSheetOpen(true)}
            className="lg:hidden"
          />
        </div>

        {/* Below sm the sentence cannot hold a count, tokens AND a three-way
            toggle side by side, so the toggle takes its own full-width row.
            It is one more row, but it still does not GROW: the sentence is
            present at every filter count, holding just the count when nothing
            is set. The property that matters survives the breakpoint. */}
        <div className="sm:hidden">
          <SegmentedPills
            ariaLabel="Browse view"
            layoutId="directoryViewNarrow"
            segments={viewSegments}
            value={browseView}
            onChange={setBrowseView}
            // Full width here, so the segments split it evenly rather than
            // huddling at the left end of a wide bar. `fill` carries the
            // width; the track must not also be sent a w-full class.
            fill
            className="bg-card"
          />
        </div>
        <SentenceLine
          count={resultCount}
          singular={hasFilter ? "result" : "person"}
          plural={hasFilter ? "results" : "people"}
          tokens={sentenceTokens}
          onClearAll={clearAll}
          onOpenPanel={() => (window.innerWidth >= 1024 ? setPanelOpen(true) : setSheetOpen(true))}
          max={2}
          right={
            <div className="hidden sm:block">
              {/* Canopy-filled thumb, same control as the profile Writing
                  switcher (owner, 2026-08-02). People appears only while
                  filtering; map and batches stay reachable so a filter narrows
                  the map in place instead of abandoning it for a flat grid. */}
              <SegmentedPills
                ariaLabel="Browse view"
                layoutId="directoryView"
                segments={viewSegments}
                value={browseView}
                onChange={setBrowseView}
                className="bg-card"
              />
            </div>
          }
        />
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

      {browseView === "people" ? (
        <div>
          {yearLabel && (
            <div className="mb-3 text-sm font-medium text-foreground">{yearLabel}</div>
          )}

          {namesLocked ? (
            /* Not the no-results card: nothing failed to match, the viewer is
               simply below the tier that sees people. Same fix as everywhere
               else, and the banner up top carries the resend button. */
            <div className="card-elevated rounded-[var(--radius)] border border-border bg-card p-12 text-center">
              <p className="font-heading text-lg tracking-tight text-foreground">
                Confirm your email to browse the people.
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Tap the link we sent you and every name opens up. The map is yours either way.
              </p>
            </div>
          ) : results.length === 0 ? (
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
              {/* Just the escape hatch. This used to reprint every active
                  filter as chips, which was the third copy of the same state
                  on one screen; the sentence line directly above already lists
                  them, each removable. */}
              {hasFilter && (
                <Button variant="outline" className="mt-4 rounded-full" onClick={clearAll}>
                  Clear all
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* No gap below sm: there the cards are borderless rows, and a
                  16px gutter between rows in a plain series reads as things
                  drifting apart. From sm up they are boxed cards in a grid and
                  need the gutter back. */}
              <div
                ref={gridRef}
                className="grid grid-cols-1 gap-0 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3"
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
          /* Just the map. The "Top cities" card that used to sit under it is
             gone (owner, 2026-08-03), and its wrapper went with it: a
             space-y-4 stack separating one child from nothing is not a
             layout. The cities it listed are the five biggest pins, which is
             what the map is already showing, at their real positions. */
          <AlumniMap
            pins={cityPins}
            unmapped={unmappedCount}
            unmappedPeople={unmappedPeople}
            namesLocked={namesLocked}
          />
        )
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          {batchYearCounts.map(({ year, count }) => (
            <button
              key={year}
              onClick={() => updateFilters("year", String(year))}
              className="card-elevated group flex flex-col items-center rounded-[var(--radius)] border border-border bg-card p-4 pt-3.5 transition-[border-color,transform] duration-200 hover:border-canopy/40 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
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
              className="card-elevated group flex flex-col items-center rounded-[var(--radius)] border border-border bg-card p-4 pt-3.5 transition-[border-color,transform] duration-200 hover:border-canopy/40 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
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
