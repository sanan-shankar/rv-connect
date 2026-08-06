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
 *  everybody wants).
 *
 *  You ARE listed, first, in a chip like everyone else's. Being in your own
 *  Catch-up was always true and used to be left unsaid, which read to
 *  members as being left out: two people asked the owner outright whether
 *  they were even part of a Catch-up because they could not find
 *  themselves in the list (2026-08-04). Saying the obvious thing costs one
 *  chip. It carries no "you" label and no remove button: the position and
 *  the missing X say it, and leaving is not a thing this screen does.
 * ------------------------------------------------------------------ */

import { useState } from "react";
import { Loader2, Plus, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BirdAvatar } from "@/components/common/bird-avatar";
import { useUserSearch } from "@/components/common/use-user-search";
import { cn } from "@/lib/utils";

export interface PickedPerson {
  id: string;
  name: string;
  photoUrl: string | null;
  birdOverride: string | null;
  batchYear: number | null;
}

/**
 * One chip, so the roster cannot end up with two shapes in it.
 *
 * The right padding is 14px rather than matching the left's 6px. The left is
 * tight because a 28px avatar circle sits there and fills the pill's cap on
 * its own; the right ends in text, which has no such bounding circle, and the
 * pill is 38px tall so its cap radius is 19px. At the 10px it used to carry,
 * the last letter of a name sat inside the curve and the chip read as
 * mis-sized next to its neighbours (owner, 2026-08-04). A chip WITH a remove
 * button overrides this back down to 8px, because there the trailing element
 * is a 20px circle that centres in the cap the way the avatar does.
 */
const CHIP_CLASS =
  "inline-flex items-center gap-1.5 rounded-full border border-leaf/30 bg-leaf/[0.07] py-1 pl-1.5 pr-3.5 text-[13px] font-medium text-leaf";

export function PeoplePicker({
  value,
  onChange,
  myBatchYear,
  me,
  canRemove = true,
}: {
  value: PickedPerson[];
  onChange: (next: PickedPerson[]) => void;
  /** Enables the "everyone from my batch" shortcut when known. */
  myBatchYear: number | null;
  /** The viewer, shown first and unremovable. Never part of `value`: the
   *  server adds the creator to the group itself, so including them here
   *  would submit them twice. */
  me: PickedPerson;
  /**
   * Whether the viewer may take people OUT of the roster. Removing someone is
   * the Keeper's call (owner, 2026-08-04), so anyone else sees the same list
   * as plain, un-dismissable pills. True here because the person filling in
   * this form becomes the Keeper; the prop exists so an edit surface opened by
   * an ordinary member cannot quietly inherit the ability.
   */
  canRemove?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [addingBatch, setAddingBatch] = useState(false);
  // Shared with the Catch-up people panel, so the debounce and the
  // stale-response guard cannot drift between the two search fields.
  const { results, searching, reset } = useUserSearch(query);

  function add(person: PickedPerson) {
    if (value.some((p) => p.id === person.id)) return;
    onChange([...value, person]);
    setQuery("");
    reset();
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
                // Neutral row, so the fill is state-layer and not a canopy
                // wash: canopy is the app's SELECTION green (design system
                // rule 4), and a search result under the cursor is not a
                // selected one. The canopy border hint stays.
                className="flex w-full items-center gap-[var(--space-s)] rounded-[var(--radius-md)] border border-transparent px-2.5 py-2 text-left transition-colors duration-150 state-layer hover:border-canopy/40 active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
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

      <ul className="flex flex-wrap gap-1.5 pt-1">
        {/* You, first and always. Same chip shape as the rest so the list
            reads as one roster, minus the remove button. */}
        <li key={me.id}>
          <span className={CHIP_CLASS}>
            <BirdAvatar
              user={{
                id: me.id,
                name: me.name,
                photoUrl: me.photoUrl,
                birdOverride: me.birdOverride,
              }}
              size="xs"
            />
            <span className="max-w-[12rem] truncate">{me.name}</span>
          </span>
        </li>
        {value.map((person) => (
            <li key={person.id}>
              {/* Leaf tint from the protocol's chip trio (people = leaf; the
                  drab canopy/10 pairing is dead). */}
              <span className={cn(CHIP_CLASS, canRemove && "pr-2")}>
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
                {canRemove && (
                  <button
                    type="button"
                    aria-label={`Remove ${person.name}`}
                    onClick={() => remove(person.id)}
                    className="grid size-5 shrink-0 place-items-center rounded-full text-canopy/70 outline-none transition-colors duration-150 hover:bg-canopy/20 hover:text-canopy active:scale-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-canopy"
                  >
                    <X className="size-3" strokeWidth={2.5} />
                  </button>
                )}
              </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
