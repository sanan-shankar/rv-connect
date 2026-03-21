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

interface User {
  id: string;
  name: string;
  avatarColor: string | null;
  batchType: string;
  batchYear: number;
  currentCity: string | null;
  jobTitle: string | null;
}

interface DirectoryClientProps {
  users: User[];
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
              className="pl-10"
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
          <div className="flex flex-wrap items-center gap-3 glass rounded-lg p-3">
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
            <div className="glass rounded-xl p-12 text-center">
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
          <h2 className="mb-4 text-sm font-medium text-muted-foreground">
            Browse by batch year
          </h2>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
            {batchYearCounts.map(({ year, count }) => (
              <button
                key={year}
                onClick={() => updateFilters("year", String(year))}
                className="group flex flex-col items-center rounded-xl glass p-4 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-xl"
              >
                <span className="font-heading text-lg font-bold text-foreground group-hover:text-primary">
                  &apos;{String(year).slice(-2)}
                </span>
                <span className="mt-1 text-xs text-muted-foreground">
                  {count} {count === 1 ? "alumnus" : "alumni"}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
