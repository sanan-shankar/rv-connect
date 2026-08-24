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

import { useRef, useState } from "react";
import { toast } from "sonner";
import { callAction } from "@/lib/call-action";
import { settledHeart } from "@/lib/heart";
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

  // One heart in flight at a time; see the matching note in post-card.tsx
  // (audit C-010/C-178).
  const busy = useRef(false);

  async function handleToggle() {
    if (busy.current) return;
    const before = { liked, count };
    setLiked(!before.liked);
    setCount(before.liked ? before.count - 1 : before.count + 1);
    busy.current = true;
    try {
      const result = await callAction(() => toggleEntryLove(entryId));
      if (result && "error" in result && result.error) {
        setLiked(before.liked);
        setCount(before.count);
        toast.error(result.error);
        return;
      }
      // What the row says, not what the tap assumed (audit C-133).
      const settled = settledHeart(before, "loved" in result ? result.loved : undefined);
      setLiked(settled.liked);
      setCount(settled.count);
    } finally {
      busy.current = false;
    }
  }

  return (
    <LoveButton
      liked={liked}
      count={count}
      onToggle={handleToggle}
      label={liked ? "Remove your heart from this answer" : "Heart this answer"}
    />
  );
}
