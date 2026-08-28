"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useCallback, useRef, useEffect, useMemo, useTransition } from "react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { AnimatePresence, m } from "motion/react";
import { EASE_OUT_SMOOTH } from "@/components/common/motion";
import { SegmentedPills } from "@/components/common/segmented-pills";
import { PageHeader } from "@/components/layout/page-header";
import { SearchPill } from "@/components/layout/search-pill";
import { Button } from "@/components/ui/button";
import { FacetSearchSelect } from "@/components/common/filters/facet-search-select";
import { FacetSelect } from "@/components/common/filters/facet-select";
import { FilterButton, FilterPopover } from "@/components/common/filters/filter-popover";
import { FilterSheet } from "@/components/common/filters/filter-sheet";
import { RangeFacetPill } from "@/components/common/filters/range-facet-pill";
import { SentenceLine, type SentenceToken } from "@/components/common/filters/sentence-line";
import { TYPE_OPTIONS } from "@/lib/directory-facets";
import { tagLabel } from "@/lib/profession-tags";
import { toast } from "sonner";
import { callAction } from "@/lib/call-action";
import { ProfileCard } from "./profile-card";
import { AlumniMap, type CityPin, type PinPerson } from "./alumni-map";
import { loadDirectoryPage } from "@/app/(main)/directory/actions";
import { NoResultsHoopoe } from "@/components/mascot/moments/no-results-hoopoe";
import { cn } from "@/lib/utils";

interface User {
  id: string;
  name: string;
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
  /* The tag histogram the server has already filtered by TAG_FLOOR and cut to
     TAG_VISIBLE_MAX. Options, not raw counts: the two caps are the server's
     decision (they are what the filter can actually honour), so the client is
     handed the answer rather than the arithmetic. */
  professions: { value: string; label: string }[];
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
  professions,
  minBatchYear,
  maxBatchYear,
  initialFilters,
  hasFilter,
  nextCursor,
  namesLocked = false,
}: DirectoryClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialFilters.q);
  /* One panel, two presentations: `panelOpen` is the desktop popover,
     `sheetOpen` the mobile bottom sheet. Separate flags rather than one,
     because both can be mounted at once across a resize and closing one
     must not close the other out from under it. */
  const [panelOpen, setPanelOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  /* Which view the member is looking at, and it is THEIRS from here on.
     It used to be recomputed from `hasFilter` on every props change, so any
     filter at all threw you off the map and onto the grid -- the single
     biggest jolt in the whole interaction. Now (owner's call, 2026-08-28) it
     depends on what you filtered BY: typing a name is looking for a person, so
     it moves to People; picking a facet is looking at a shape, so the map
     stays and narrows in place. Both are set explicitly at the call sites
     (handleSearch, openBatch) rather than derived here.
     A first load already carrying a query or a batch year is the same
     intention arriving by link, so it opens on People. */
  const [browseView, setBrowseView] = useState<"map" | "batches" | "people">(
    initialFilters.q || initialFilters.year ? "people" : "map"
  );
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Every filter change is a NAVIGATION -- same route, new searchParams -- and
     this route has a loading.tsx. Without a transition around the push, React
     unmounts the whole page and paints that skeleton (a stub title, a bar,
     three pills, six card ghosts) before painting the result, on every facet
     pick and every keystroke in the search box. That, not the layout, was the
     lurch the owner described on 2026-08-28: "such a sudden motion ... it's so
     jarring how things move".
     Inside startTransition, React keeps the page that is already on screen and
     hands us `isPending` instead. `directory-rule.test.mjs` pins it, because a
     future router.push written without it brings the skeleton straight back. */
  const [isPending, startTransition] = useTransition();
  /* The pending state is DELAYED, not immediate. A filter that resolves in
     80ms should show nothing at all: a dim that appears and disappears inside
     a tenth of a second is a flicker, which is worse than the wait it reports.
     Past 150ms the member has noticed the delay and the signal is a relief. */
  const [showPending, setShowPending] = useState(false);
  useEffect(() => {
    if (!isPending) {
      setShowPending(false);
      return;
    }
    const t = setTimeout(() => setShowPending(true), 150);
    return () => clearTimeout(t);
  }, [isPending]);

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
  }, [users, nextCursor]);

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

  /* The one door out to the router. Everything that changes a filter goes
     through here so nothing can navigate outside the transition. */
  const navigate = useCallback(
    (url: string) => {
      startTransition(() => router.push(url));
    },
    [router]
  );

  const updateFilters = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      navigate(`/directory?${params.toString()}`);
    },
    [navigate, searchParams]
  );

  const updateBatchRange = useCallback(
    (next: { from: string; to: string }) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next.from) params.set("yearFrom", next.from); else params.delete("yearFrom");
      if (next.to) params.set("yearTo", next.to); else params.delete("yearTo");
      navigate(`/directory?${params.toString()}`);
    },
    [navigate, searchParams]
  );

  const handleSearch = useCallback(
    (value: string) => {
      setQuery(value);
      // Typing is looking for a PERSON, so the view moves on the first
      // keystroke rather than when the results land: the grid is already there
      // holding the previous list while the new one is fetched, which is one
      // move instead of a keystroke followed by a jump 300ms later.
      if (value.trim()) setBrowseView("people");
      if (searchTimer.current) clearTimeout(searchTimer.current);
      searchTimer.current = setTimeout(() => updateFilters("q", value), 300);
    },
    [updateFilters]
  );

  /* A batch tile is a drilldown, not a facet: pressing '09 means "show me the
     people in it", so this is the other place that moves the view. */
  const openBatch = useCallback(
    (value: string) => {
      setBrowseView("people");
      updateFilters("year", value);
    },
    [updateFilters]
  );

  function clearAll() {
    setQuery("");
    navigate("/directory");
  }

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
  /* Profession was hidden on 2026-08-26 (the exact-equality arm it had then
     matched 0 of 63 members) and put back on 2026-08-28 at the owner's word,
     ahead of the tags, with the arm rewritten to a contains over jobTitle and
     workplace. See the facet itself for what the data actually supports. */
  if (initialFilters.profession) {
    sentenceTokens.push({
      key: "profession",
      /* The vocabulary's label, not the raw URL value: the column stores
         slugs, so a chip reading the parameter back would say "social impact"
         where the control says "Social impact". Resolved here rather than off
         the `professions` prop because a tag below TAG_FLOOR is not in that
         list, and a bookmarked link to one still has to draw a chip a person
         can read and clear. */
      label: tagLabel(initialFilters.profession),
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
  /* House lost its CONTROL on 2026-08-28 (owner: "remove filtering by
     house"), and keeps its chip for the same reason profession kept one while
     it was hidden: a bookmarked ?house= must still render a coherent page with
     something on it the member can press to get out of. Nothing can set it any
     more. */
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
    (initialFilters.profession ? 1 : 0) +
    (initialFilters.type ? 1 : 0);

  /* All three, always (owner, 2026-08-28). People used to appear only while a
     filter was active, so the toggle GREW a segment mid-gesture and the two
     already on screen slid sideways under the finger -- one of the four things
     that moved every time a filter landed. A constant toggle is a still frame,
     and People with nothing filtered is simply everyone, in the server's own
     order (newest first, never A-Z; that was the original complaint this page
     was built around). */
  const views: ("map" | "batches" | "people")[] = ["map", "batches", "people"];
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
        {/* Profession, filtering on the derived tag column
            (src/lib/profession-tags.ts), which nobody types: the pair a member
            DOES type -- jobTitle, the role, and workplace, the organisation --
            only says what field they are in when read together, so the tag is
            what a filter can match. It replaced a contains over both, which
            was loose by construction and could only find members whose free
            text happened to contain a bucket's own name.

            HIDDEN ONLY WHEN THE LIST IS EMPTY. It used to hide below two
            options, on the argument that a dropdown offering a single choice
            reads as a broken control; the owner asked for it back on
            2026-08-28 ("did you make the profession tab disappear from
            filters? bring it back"), and a filter that comes and goes on its
            own is the worse of the two surprises.
            What actually empties it is TAG_FLOOR, his own number: a tag needs
            five people before it is offered, and on the live database today
            only "Studying" clears that (25, against Education, Healthcare and
            Law on 2 each). So this control is one choice wide until either the
            membership grows into the floor or the floor comes down -- and both
            of those are his call, not this component's.
            The CHIP is unaffected either way: a bookmarked ?profession= still
            shows and still clears, exactly as the removed House filter's
            does. */}
        {professions.length >= 1 && (
          <FacetSearchSelect
            label="Profession"
            value={initialFilters.profession}
            onChange={(v) => updateFilters("profession", v)}
            options={professions}
            anyLabel="Any profession"
            searchPlaceholder="Search professions..."
            className={className}
          />
        )}
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

  /* renderBackButton is gone (owner, 2026-08-28: "drop it"). It inserted a
     40px arrow at the START of the row the moment anything was filtered, which
     shoved the toggle and everything after it sideways -- and it never said
     anything "Clear all" in the count line does not already say. */

  /* The sentence: the result count the page always owed, which also carries
     every applied filter as a removable token, so a filter costs ZERO vertical
     pixels (owner, 2026-08-03: "use sentence for filter"; Concept B in
     /lab/directory). From sm up it rides INSIDE the control row, in the gap
     between the browse toggle and Filters that used to be empty; below sm it
     drops under the row, because a count, two tokens and "Clear all" cannot
     share 390px with a three-way toggle. It is a line of text either way, not
     a second row of controls. */
  const sentence = (
    <SentenceLine
      count={resultCount}
      singular={hasFilter ? "result" : "person"}
      plural={hasFilter ? "results" : "people"}
      tokens={sentenceTokens}
      onClearAll={clearAll}
      onOpenPanel={() => (window.innerWidth >= 1024 ? setPanelOpen(true) : setSheetOpen(true))}
      max={2}
    />
  );

  return (
    <div>
      {/* Search rides on the title line, as the app's one expand-on-press
          pill, exactly as the Collection's river does it (spec sec. 6). It was
          a full-width bar owning a whole row of the page for a control most
          visits never touch (owner, 2026-08-28: "compress the search button").

          It cannot live in the control row below, which is where it was first
          put: the pill opens as an OVERLAY rather than reflowing its row, and
          at 390px an open field is 68vw -- it swallowed the Map/Batches toggle
          and the back arrow whole, and a phone has no Escape key to shut it
          with. Over a page title it covers nothing anybody can press. */}
      {/* Search and Filters TOGETHER on the title line (owner, 2026-08-28:
          "move the filters to the right of the search"). Two controls of the
          same weight, in the corner where every other page in the app keeps
          its actions, which leaves the row below to be one thing rather than
          a hodgepodge.
          The search pill has to live up here rather than in that row: it opens
          as an OVERLAY rather than reflowing, and at 390px an open field is
          68vw, so in the row it swallowed the toggle whole. Over a title it
          covers nothing anybody can press. */}
      <PageHeader
        guide="directory"
        title="Directory"
        actions={
          <>
            <SearchPill
              value={query}
              onChange={handleSearch}
              placeholder="Search people"
              label="Search people by name, city or work"
              restLabel="Search people"
            />
            <div className="hidden lg:block">
              <FilterPopover
                open={panelOpen}
                onOpenChange={setPanelOpen}
                trigger={
                  <FilterButton count={activeFacetCount} onClick={() => setPanelOpen((v) => !v)} />
                }
              >
                {/* `compact` shrinks the facets to h-9 in the panel; the sheet
                    on mobile keeps them at the full h-10 touch target. */}
                {renderPrimaryFacets(true, true)}
                {renderSecondaryFacets(true, true)}
              </FilterPopover>
            </div>
            {/* Below lg the same facets open the kit's bottom sheet (it carries
                its own "Show N" footer, which is the right ending for a
                full-screen surface and wrong for a small anchored panel).
                Compact below sm, where the word costs 47px the row has not
                got. */}
            <FilterButton
              count={activeFacetCount}
              onClick={() => setSheetOpen(true)}
              compact
              className="sm:hidden"
            />
            <FilterButton
              count={activeFacetCount}
              onClick={() => setSheetOpen(true)}
              className="hidden sm:inline-flex lg:hidden"
            />
          </>
        }
      />

      {/* THE ROW: the browse toggle at one edge, the count and its filter
          tokens at the other, and nothing in between (owner, 2026-08-28:
          "move the numbers to the right instead of beside the map ... we have
          a hodgepodge of elements no real structure ordering spacing").
          Right-anchoring the sentence is not only tidier: it is what makes a
          filter land quietly, because a token added there grows LEFTWARD into
          empty space instead of shoving its neighbours along. */}
      <div className="mb-4 space-y-2.5">
        <div className="flex items-center gap-3">
          {/* Canopy-filled thumb, same control as the profile Writing switcher
              (owner, 2026-08-02). Constant three segments, so this never
              re-flows when a filter lands. */}
          <SegmentedPills
            ariaLabel="Browse view"
            layoutId="directoryView"
            segments={viewSegments}
            value={browseView}
            onChange={setBrowseView}
            className="min-w-0 bg-card"
          />
          <div className="ml-auto hidden min-w-0 sm:block">{sentence}</div>
        </div>

        {/* Below sm the sentence cannot share the row with a three-way toggle,
            so it takes the line under it. It is a line of text, not a second
            row of controls. */}
        <div className="sm:hidden">{sentence}</div>
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

      {/* ONE region, crossfaded. Map, batches and people used to swap
          instantly, so a filter both replaced the whole content area and moved
          every control around it in the same frame. A fade is enough: 120ms
          out, 180ms in, and the incoming view waits for the outgoing one so
          the two are never both on screen fighting for the same space.

          The wrapper dims while a navigation is in flight, and only once
          showPending has waited out its 150ms -- see the note on that state.
          Opacity only, per the motion rule. */}
      <div
        aria-busy={showPending || undefined}
        className={cn(
          "transition-opacity duration-200 ease-out",
          showPending && "opacity-55"
        )}
      >
        <AnimatePresence mode="wait" initial={false}>
          <m.div
            key={browseView}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.18, ease: EASE_OUT_SMOOTH } }}
            exit={{ opacity: 0, transition: { duration: 0.12, ease: "easeOut" } }}
          >
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
                {/* People is a browse view now, reachable with nothing set, so
                    this card can no longer assume it is looking at a filtered
                    list -- it was telling members that "no one matches these
                    filters" about filters they had not set (owner, 2026-08-28).
                    The real cause of that was server-side and is fixed in
                    page.tsx; this is the copy holding up its end. */}
                <p className="font-heading text-lg text-foreground">
                  {hasFilter ? "No one matches these filters." : "Nobody here yet."}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {hasFilter
                    ? "Try removing a filter or clearing your search."
                    : "The directory fills up as people join and finish their profiles."}
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
                onClick={() => openBatch(String(year))}
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
                onClick={() => openBatch("faculty")}
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
          </m.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
