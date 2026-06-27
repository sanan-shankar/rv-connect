"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useCallback } from "react";
import { Search, Filter, ArrowLeft } from "lucide-react";
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
import { AlumniMap, type CityPin } from "./alumni-map";

interface User {
  id: string;
  name: string;
  avatarColor: string | null;
  accountType?: string | null;
  verifyState?: string | null;
  batchType: string | null;
  batchYear: number | null;
  currentCity: string | null;
  jobTitle: string | null;
}

interface DirectoryClientProps {
  users: User[];
  cityPins: CityPin[];
  unmappedCount: number;
  batchYearCounts: { year: number; count: number }[];
  cities: string[];
  industries: string[];
  initialFilters: {
    q: string;
    year: string;
    city: string;
    industry: string;
  };
  hasFilter: boolean;
}

export function DirectoryClient({
  users,
  cityPins,
  unmappedCount,
  batchYearCounts,
  cities,
  industries,
  initialFilters,
  hasFilter,
}: DirectoryClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialFilters.q);
  const [showFilters, setShowFilters] = useState(
    !!(initialFilters.city || initialFilters.industry)
  );
  const [browseView, setBrowseView] = useState<"map" | "batches">("map");

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
      const timeout = setTimeout(() => {
        updateFilters("q", value);
      }, 300);
      return () => clearTimeout(timeout);
    },
    [updateFilters]
  );

  const showingYear = !!initialFilters.year;

  return (
    <div>
      {/* Search + filters — always visible */}
      <div className="mb-6 space-y-3">
        <div className="flex gap-2">
          {showingYear && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.push("/directory")}
              title="Back to all batches"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search alumni by name..."
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              className="h-10 rounded-full border-border bg-card pl-10"
            />
          </div>
          <Button
            variant={showFilters ? "default" : "outline"}
            onClick={() => setShowFilters(!showFilters)}
            className={showFilters ? "bg-primary text-primary-foreground" : ""}
          >
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius)] border border-border bg-card p-3">
            <Select
              value={initialFilters.city || "all"}
              onValueChange={(v) => updateFilters("city", v === "all" ? "" : v ?? "")}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Filter by city" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All cities</SelectItem>
                {cities.map((city) => (
                  <SelectItem key={city} value={city}>
                    {city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={initialFilters.industry || "all"}
              onValueChange={(v) => updateFilters("industry", v === "all" ? "" : v ?? "")}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Filter by industry" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All industries</SelectItem>
                {industries.map((ind) => (
                  <SelectItem key={ind} value={ind}>
                    {ind}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Show user list if any filter is active, otherwise batch grid */}
      {hasFilter ? (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {initialFilters.year && (
                <span className="mr-1 font-medium text-foreground">
                  Batch of &apos;{initialFilters.year.slice(-2)}
                </span>
              )}
              {users.length} {users.length === 1 ? "alumnus" : "alumni"} found
            </p>
          </div>

          {users.length === 0 ? (
            <div className="card-elevated rounded-[var(--radius)] border border-border bg-card p-12 text-center">
              <p className="font-heading text-lg text-foreground">
                No alumni found matching your filters.
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Try broadening your search or removing some filters.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {users.map((user) => (
                <ProfileCard key={user.id} user={user} />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>
          {/* Map | Batches switch */}
          <div className="mb-4 inline-flex rounded-full border border-border bg-card p-1">
            {(["map", "batches"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setBrowseView(v)}
                className={`rounded-full px-4 py-1.5 text-[13px] font-semibold capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
                  browseView === v
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {v === "map" ? "Map" : "Batches"}
              </button>
            ))}
          </div>

          {browseView === "map" ? (
            cityPins.length === 0 && unmappedCount === 0 ? (
              <div className="card-elevated rounded-[var(--radius)] border border-border bg-card p-12 text-center">
                <p className="font-heading text-lg tracking-tight text-foreground">
                  The map fills in as alumni add their city.
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Add yours from your profile and watch the valley spread across the world.
                </p>
              </div>
            ) : (
              <AlumniMap pins={cityPins} unmapped={unmappedCount} />
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
                    {count} {count === 1 ? "alumnus" : "alumni"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
