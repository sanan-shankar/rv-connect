"use client";

/* ------------------------------------------------------------------ *
 *  <EntryLoveButton> - the one red heart, wired to `toggleEntryLove`.
 *
 *  The optimistic flip, the double-tap guard and the adopt-the-answer rule
 *  all come from `useHeartToggle`, shared with the feed card, the letter
 *  page, a comment row and the Collection photo. Renders the shared
 *  `LoveButton` only - the heart itself is never forked (spec 3.6 /
 *  DESIGN-SYSTEM sec 7).
 * ------------------------------------------------------------------ */

import { useState } from "react";
import { useHeartToggle } from "@/components/posts/use-engagement";
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

  const fire = useHeartToggle(() => toggleEntryLove(entryId));

  function handleToggle() {
    void fire({ liked, count }, ({ liked: next, count: c }) => {
      setLiked(next);
      setCount(c);
    });
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
