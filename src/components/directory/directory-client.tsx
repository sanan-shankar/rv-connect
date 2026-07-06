"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useCallback, useRef, useEffect } from "react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { motion } from "motion/react";
import { Search, Filter, ArrowLeft, ArrowUpDown } from "lucide-react";
import { SPRINGS } from "@/components/common/motion";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ProfileCard } from "./profile-card";
import { AlumniMap, type CityPin, type PinPerson } from "./alumni-map";
import { loadDirectoryPage } from "@/app/(main)/directory/actions";
import { NoResultsHoopoe } from "@/components/mascot/moments/no-results-hoopoe";

interface User {
  id: string;
  name: string;
  avatarColor: string | null;
  photoUrl?: string | null;
  accountType?: string | null;
  verifyState?: string | null;
  batchType: string | null;
  batchYear: number | null;
  currentCity: string | null;
  jobTitle: string | null;
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
  industries: string[];
  initialFilters: {
    q: string;
    year: string;
    city: string;
    industry: string;
    yearFrom: string;
    yearTo: string;
    sort: string;
  };
  hasFilter: boolean;
  nextCursor: string | null;
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
  industries,
  initialFilters,
  hasFilter,
  nextCursor,
}: DirectoryClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialFilters.q);
  const [showFilters, setShowFilters] = useState(
    !!(
      initialFilters.city ||
      initialFilters.industry ||
      initialFilters.yearFrom ||
      initialFilters.yearTo
    )
  );
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
        industry: initialFilters.industry || undefined,
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
      if (value && value !== "all") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
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

  const showingYear = !!initialFilters.year;
  const yearLabel =
    initialFilters.year === "faculty"
      ? "Faculty"
      : initialFilters.year
        ? `Batch of '${initialFilters.year.slice(-2)}`
        : "";

  // Top five cities, derived from the same pins the map plots.
  const topCities = [...cityPins].sort((a, b) => b.count - a.count).slice(0, 5);

  // People (results) only appears while a filter is active; the map and batches
  // are always reachable so filtering narrows the map rather than replacing it.
  const views: ("map" | "batches" | "people")[] = hasFilter
    ? ["people", "map", "batches"]
    : ["map", "batches"];

  return (
    <div>
      {/* Tier 1: one search box + a Filters toggle. Always visible. */}
      <div className="mb-6 space-y-3">
        <div className="flex gap-2">
          {(showingYear || hasFilter) && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.push("/directory")}
              title="Back to browse"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, city, or profession..."
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              className="h-10 rounded-full border-border bg-card pl-10"
            />
          </div>
          <Button
            variant={showFilters ? "default" : "outline"}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4" />
            Filters
          </Button>
        </div>

        {/* Tier 2: facets, on demand. */}
        {showFilters && (
          <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius)] border border-border bg-card p-3">
            <Select
              value={initialFilters.city || "all"}
              onValueChange={(v) => updateFilters("city", v === "all" ? "" : (v ?? ""))}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Any city" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any city</SelectItem>
                {cities.map((city) => (
                  <SelectItem key={city} value={city}>
                    {city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={initialFilters.industry || "all"}
              onValueChange={(v) => updateFilters("industry", v === "all" ? "" : (v ?? ""))}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Any profession" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any profession</SelectItem>
                {industries.map((ind) => (
                  <SelectItem key={ind} value={ind}>
                    {ind}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="number"
              inputMode="numeric"
              placeholder="Batch from"
              defaultValue={initialFilters.yearFrom}
              onBlur={(e) => updateFilters("yearFrom", e.target.value)}
              className="h-9 w-[120px] rounded-[var(--radius-md)]"
            />
            <Input
              type="number"
              inputMode="numeric"
              placeholder="Batch to"
              defaultValue={initialFilters.yearTo}
              onBlur={(e) => updateFilters("yearTo", e.target.value)}
              className="h-9 w-[120px] rounded-[var(--radius-md)]"
            />

            <div className="ml-auto flex items-center gap-2">
              <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
              <Select
                value={initialFilters.sort || "relevance"}
                onValueChange={(v) =>
                  updateFilters("sort", v === "relevance" ? "" : (v ?? ""))
                }
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">Most recent</SelectItem>
                  <SelectItem value="name">Name A to Z</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

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
            <p className="text-sm text-muted-foreground">
              {yearLabel && (
                <span className="mr-1 font-medium text-foreground">{yearLabel}</span>
              )}
              {resultCount} {resultCount === 1 ? "person" : "people"} found
              {resultCount > results.length && (
                <span className="text-muted-foreground/80"> · showing {results.length}</span>
              )}
            </p>
          </div>

          {results.length === 0 ? (
            <div className="card-elevated rounded-[var(--radius)] border border-border bg-card p-12 text-center">
              <div className="mb-3 flex justify-center">
                <NoResultsHoopoe size={76} />
              </div>
              <p className="font-heading text-lg text-foreground">
                No one matches your search.
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Try a shorter search or clear a filter.
              </p>
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
                ? "No one on the map matches your filters."
                : "The map fills in as people add their city."}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {hasFilter
                ? "Try the People view, widen a filter, or clear your search."
                : "Add yours from your profile and watch the valley spread across the world."}
            </p>
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
                      className="flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1.5 text-[13px] text-foreground transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-95"
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
              className="card-elevated group flex flex-col items-center rounded-[var(--radius)] border border-border bg-card p-4 pt-3.5 transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-[0.97]"
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
              className="card-elevated group flex flex-col items-center rounded-[var(--radius)] border border-border bg-card p-4 pt-3.5 transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-[0.97]"
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
