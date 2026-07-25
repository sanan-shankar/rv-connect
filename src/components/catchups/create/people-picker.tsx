"use client";

/* ------------------------------------------------------------------ *
 *  <PeoplePicker> — choose who a Catch-up is with.
 *
 *  Groups are being retired as a user-facing feature (owner, 2026-07-25:
 *  "for now, let us have basically no groups, let's just have catch-ups
 *  ... within catch-ups you'll have to build in the functionality to
 *  create your own group"). So a Catch-up is started from a set of
 *  PEOPLE, and the Group row that still backs membership underneath is
 *  created silently by `createCatchupWithPeople`.
 *
 *  Two ways in, because they are the two real cases: search someone by
 *  name, or add a whole batch at once (the batch Catch-up being the one
 *  everybody wants). You are always in your own Catch-up, so you are
 *  never listed or removable here.
 * ------------------------------------------------------------------ */

import { useEffect, useRef, useState } from "react";
import { Loader2, Plus, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BirdAvatar } from "@/components/common/bird-avatar";

export interface PickedPerson {
  id: string;
  name: string;
  photoUrl: string | null;
  birdOverride: string | null;
  batchYear: number | null;
}

const DEBOUNCE_MS = 200;

export function PeoplePicker({
  value,
  onChange,
  myBatchYear,
}: {
  value: PickedPerson[];
  onChange: (next: PickedPerson[]) => void;
  /** Enables the "everyone from my batch" shortcut when known. */
  myBatchYear: number | null;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PickedPerson[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingBatch, setAddingBatch] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const id = ++requestId.current;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        // Ignore a response that a newer keystroke has already superseded.
        if (id !== requestId.current) return;
        setResults(Array.isArray(data) ? data : []);
      } catch {
        if (id === requestId.current) setResults([]);
      } finally {
        if (id === requestId.current) setSearching(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  function add(person: PickedPerson) {
    if (value.some((p) => p.id === person.id)) return;
    onChange([...value, person]);
    setQuery("");
    setResults([]);
  }

  function remove(id: string) {
    onChange(value.filter((p) => p.id !== id));
  }

  async function addMyBatch() {
    if (myBatchYear == null) return;
    setAddingBatch(true);
    try {
      const res = await fetch(`/api/users-by-batch?detail=1&batches=${myBatchYear}`);
      const data = await res.json();
      const people: PickedPerson[] = data?.users ?? [];
      const existing = new Set(value.map((p) => p.id));
      const fresh = people.filter((p) => p && p.id && !existing.has(p.id));
      if (fresh.length === 0) {
        toast.info("Everyone from your batch is already here");
      } else {
        onChange([...value, ...fresh]);
      }
    } catch {
      toast.error("Could not load your batch just now");
    } finally {
      setAddingBatch(false);
    }
  }

  const unpicked = results.filter((r) => !value.some((p) => p.id === r.id));

  return (
    <div className="space-y-[var(--space-s)]">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name"
          aria-label="Search people by name"
          className="pl-9"
        />
        {searching && (
          <Loader2
            className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground"
            aria-hidden
          />
        )}
      </div>

      {query.trim() && !searching && unpicked.length === 0 && (
        <p className="text-[13px] text-muted-foreground">No one found by that name.</p>
      )}

      {unpicked.length > 0 && (
        <ul className="space-y-1">
          {unpicked.map((person) => (
            <li key={person.id}>
              <button
                type="button"
                onClick={() => add(person)}
                className="flex w-full items-center gap-[var(--space-s)] rounded-[var(--radius-md)] border border-transparent px-2.5 py-2 text-left transition-colors duration-150 hover:border-canopy/40 hover:bg-canopy/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-[0.99]"
              >
                <BirdAvatar
                  user={{
                    id: person.id,
                    name: person.name,
                    photoUrl: person.photoUrl,
                    birdOverride: person.birdOverride,
                  }}
                  size="xs"
                />
                <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-foreground">
                  {person.name}
                </span>
                {person.batchYear != null && (
                  <span className="shrink-0 text-[12px] tabular-nums text-muted-foreground">
                    {person.batchYear}
                  </span>
                )}
                <Plus className="h-4 w-4 shrink-0 text-canopy" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      {myBatchYear != null && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addMyBatch}
          disabled={addingBatch}
        >
          {addingBatch ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Everyone from {myBatchYear}
        </Button>
      )}

      {value.length > 0 && (
        <ul className="flex flex-wrap gap-1.5 pt-1">
          {value.map((person) => (
            <li key={person.id}>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-canopy/10 py-1 pl-1.5 pr-2 text-[13px] font-medium text-canopy">
                <BirdAvatar
                  user={{
                    id: person.id,
                    name: person.name,
                    photoUrl: person.photoUrl,
                    birdOverride: person.birdOverride,
                  }}
                  size="xs"
                />
                <span className="max-w-[12rem] truncate">{person.name}</span>
                <button
                  type="button"
                  aria-label={`Remove ${person.name}`}
                  onClick={() => remove(person.id)}
                  className="grid size-5 shrink-0 place-items-center rounded-full text-canopy/70 outline-none transition-colors duration-150 hover:bg-canopy/20 hover:text-canopy focus-visible:ring-2 focus-visible:ring-canopy/40 active:scale-90"
                >
                  <X className="size-3" strokeWidth={2.5} />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
