"use client";

import { useState, useEffect, useRef } from "react";
import { UserAvatar } from "@/components/common/user-avatar";

interface MentionUser {
  id: string;
  name: string;
  avatarColor: string | null;
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

  useEffect(() => {
    if (!query || query.length < 1) {
      setUsers([]);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/users/search?q=${encodeURIComponent(query)}`
        );
        if (res.ok) {
          const data = await res.json();
          setUsers(data);
        }
      } catch {
        // ignore
      }
      setLoading(false);
    }, 200);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  if (!query || (users.length === 0 && !loading)) return null;

  return (
    <div className="absolute left-0 right-0 z-20 mt-1 max-h-48 overflow-y-auto rounded-lg border border-border bg-card shadow-lg">
      {loading && users.length === 0 ? (
        <div className="px-3 py-2 text-sm text-muted-foreground">
          Searching...
        </div>
      ) : (
        users.map((user) => (
          <button
            key={user.id}
            type="button"
            onMouseDown={(e) => {
              e.preventDefault(); // Prevent textarea blur
              onSelect(user);
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-accent"
          >
            <UserAvatar
              name={user.name}
              avatarColor={user.avatarColor}
              size="sm"
            />
            <div>
              <span className="text-sm font-medium text-foreground">
                {user.name}
              </span>
              <span className="ml-2 text-xs text-muted-foreground">
                Batch of &apos;{String(user.batchYear).slice(-2)}
              </span>
            </div>
          </button>
        ))
      )}
    </div>
  );
}
