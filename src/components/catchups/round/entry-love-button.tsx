"use client";

/* ------------------------------------------------------------------ *
 *  <EntryLoveButton> - the one red heart, wired to `toggleEntryLove`.
 *
 *  Same optimistic-update-then-reconcile shape as LetterEngagement's
 *  `handleLike` (src/components/letters/letter-engagement.tsx): flip the
 *  local state immediately, call the server action, and roll back with a
 *  toast if it reports an error. Renders the shared `LoveButton` only - the
 *  heart itself is never forked (spec 3.6 / DESIGN-SYSTEM sec 7).
 * ------------------------------------------------------------------ */

import { useState } from "react";
import { toast } from "sonner";
import { LoveButton } from "@/components/common/love-button";
import { toggleEntryLove } from "@/app/(main)/catchups/actions";

export function EntryLoveButton({
  entryId,
  initialLoved,
  initialCount,
}: {
  entryId: string;
  initialLoved: boolean;
  initialCount: number;
}) {
  const [liked, setLiked] = useState(initialLoved);
  const [count, setCount] = useState(initialCount);

  async function handleToggle() {
    const next = !liked;
    setLiked(next);
    setCount((c) => (next ? c + 1 : c - 1));
    const result = await toggleEntryLove(entryId);
    if (result && "error" in result && result.error) {
      setLiked(!next);
      setCount((c) => (next ? c - 1 : c + 1));
      toast.error(result.error);
    }
  }

  return (
    <LoveButton
      liked={liked}
      count={count}
      onToggle={handleToggle}
      size="md"
      label={liked ? "Remove your heart from this answer" : "Heart this answer"}
    />
  );
}
