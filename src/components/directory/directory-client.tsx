"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useCallback } from "react";
import { Search, Filter, X } from "lucide-react";
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
  batchYears: number[];
  cities: string[];
  initialFilters: {
    q: string;
    type: string;
    year: string;
    city: string;
  };
}

export function DirectoryClient({
  users,
  batchYears,
  cities,
  initialFilters,
}: DirectoryClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialFilters.q);
  const [showFilters, setShowFilters] = useState(
    !!(initialFilters.type !== "all" || initialFilters.year || initialFilters.city)
  );

  const hasActiveFilters =
    initialFilters.type !== "all" || initialFilters.year || initialFilters.city;

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

  const clearFilters = useCallback(() => {
    router.push("/directory");
    setQuery("");
  }, [router]);

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

  return (
    <div>
      {/* Search and filters */}
      <div className="mb-8 space-y-3">
        <div className="flex gap-2">
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
            {hasActiveFilters && (
              <span className="ml-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary-foreground text-[10px] font-bold text-primary">
                !
              </span>
            )}
          </Button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3">
            <Select
              value={initialFilters.type}
              onValueChange={(v) => updateFilters("type", v ?? "all")}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Batch type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="ICSE">ICSE</SelectItem>
                <SelectItem value="ISC">ISC</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={initialFilters.year || "all"}
              onValueChange={(v) => updateFilters("year", v === "all" ? "" : v ?? "")}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Batch year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All years</SelectItem>
                {batchYears.map((year) => (
                  <SelectItem key={year} value={String(year)}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={initialFilters.city || "all"}
              onValueChange={(v) => updateFilters("city", v === "all" ? "" : v ?? "")}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="City" />
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

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="mr-1 h-3 w-3" />
                Clear
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Results */}
      <p className="mb-4 text-sm text-muted-foreground">
        {users.length} {users.length === 1 ? "alumnus" : "alumni"} found
      </p>

      {users.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
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
  );
}
