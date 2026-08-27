"use client";

import { useState, useEffect, useRef } from "react";
import { IdentityRow } from "@/components/common/identity-row";
import { batchLine } from "@/lib/utils";

interface MentionUser {
  id: string;
  name: string;
  photoUrl?: string | null;
  birdOverride?: string | null;
  /* Nullable, because the COLUMN is. Typing it `number` did not make it one:
     it just stopped TypeScript from noticing that the line below fed `null`
     into a string. */
  batchYear: number | null;
  accountType?: string | null;
}

interface MentionDropdownProps {
  query: string;
  onSelect: (user: MentionUser) => void;
}

export function MentionDropdown({ query, onSelect }: MentionDropdownProps) {
  /* The results AND the query that produced them, held together (audit
     Low 100). Held apart, the list kept showing the previous query's people
     while a new one was in flight: type "@as", see Asha, add a "h", and Asha
     stayed on screen under "@ash" until the next response landed -- long
     enough to press Enter on the wrong person. */
  const [result, setResult] = useState<{ query: string; users: MentionUser[] }>({
    query: "",
    users: [],
  });
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const trimmedQuery = query.trim();

  useEffect(() => {
    if (trimmedQuery.length < 1) {
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    let cancelled = false;
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/users/search?q=${encodeURIComponent(trimmedQuery)}`
        );
        if (res.ok && !cancelled) {
          const data = await res.json();
          setResult({ query: trimmedQuery, users: data });
        }
      } catch {
        // ignore
      }
      if (!cancelled) setLoading(false);
    }, 200);

    return () => {
      cancelled = true;
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [trimmedQuery]);

  const visibleUsers =
    trimmedQuery.length > 0 && result.query === trimmedQuery ? result.users : [];

  if (!trimmedQuery || (visibleUsers.length === 0 && !loading)) return null;

  return (
    <div className="absolute left-0 right-0 z-20 mt-1 max-h-48 overflow-y-auto rounded-lg border border-border bg-card shadow-lg">
      {loading && visibleUsers.length === 0 ? (
        <div className="px-3 py-2 text-sm text-muted-foreground">
          Searching...
        </div>
      ) : (
        visibleUsers.map((user) => (
          <button
            key={user.id}
            type="button"
            onMouseDown={(e) => {
              e.preventDefault(); // Prevent textarea blur
              onSelect(user);
            }}
            /* state-layer carries hover AND press here; hover:bg-accent was the
               only state this row had, and on a card-coloured panel it sat at
               the just-noticeable threshold. The focus ring is inset because the
               row runs edge to edge inside a panel that clips it. */
            className="state-layer w-full px-3 py-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inset"
          >
            <IdentityRow
              user={{
                id: user.id,
                name: user.name,
                photoUrl: user.photoUrl,
                birdOverride: user.birdOverride,
              }}
              avatarSize="xs"
              className="gap-2"
              textClassName="flex-1 gap-0.5"
              name={user.name}
              nameClassName="truncate text-sm font-medium leading-none text-foreground"
              /* `batchLine`, not a hand-rolled template. The hand-rolled one
                 did `String(user.batchYear).slice(-2)`, and for anybody with
                 no batch year that is `String(null).slice(-2)`, i.e. "ll", so
                 the row read "Batch of 'll". Live example: the Anonymous
                 account, which every curated story is posted as, and which
                 therefore came up for anybody typing "@anon".

                 `blankWhenUnknown` because this is a compact picker row: a
                 manufactured "Member" under a name is filler, and an empty
                 return takes its own separator with it. */
              meta={batchLine(user, { blankWhenUnknown: true })}
              metaClassName="leading-none"
            />
          </button>
        ))
      )}
    </div>
  );
}
