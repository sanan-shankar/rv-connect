"use client";

import { useState, useEffect, useRef } from "react";
import { IdentityRow } from "@/components/common/identity-row";

interface MentionUser {
  id: string;
  name: string;
  avatarColor: string | null;
  photoUrl?: string | null;
  birdOverride?: string | null;
  batchYear: number;
}

interface MentionDropdownProps {
  query: string;
  onSelect: (user: MentionUser) => void;
}

export function MentionDropdown({ query, onSelect }: MentionDropdownProps) {
  const [users, setUsers] = useState<MentionUser[]>([]);
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
          setUsers(data);
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

  const visibleUsers = trimmedQuery.length > 0 ? users : [];

  if (!trimmedQuery || (visibleUsers.length === 0 && !loading)) return null;

  return (
    <div className="absolute left-0 right-0 z-20 mt-1 max-h-48 overflow-y-auto rounded-lg border border-border bg-card shadow-lg">
      {loading && users.length === 0 ? (
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
            className="w-full px-3 py-2 text-left hover:bg-accent"
          >
            <IdentityRow
              user={{
                id: user.id,
                name: user.name,
                avatarColor: user.avatarColor,
                photoUrl: user.photoUrl,
                birdOverride: user.birdOverride,
              }}
              avatarSize="xs"
              className="gap-2"
              textClassName="flex-1 gap-0.5"
              name={user.name}
              nameClassName="truncate text-sm font-medium leading-none text-foreground"
              meta={`Batch of '${String(user.batchYear).slice(-2)}`}
              metaClassName="leading-none"
            />
          </button>
        ))
      )}
    </div>
  );
}
