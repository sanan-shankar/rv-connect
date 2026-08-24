"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { togglePhotoLove } from "@/app/(main)/collection/actions";
import { callAction } from "@/lib/call-action";
import { settledHeart } from "@/lib/heart";
import { LoveButton } from "@/components/common/love-button";

export function PhotoLoveButton({
  photoId,
  initialLoved,
  initialCount,
}: {
  photoId: string;
  initialLoved: boolean;
  initialCount: number;
}) {
  const [loved, setLoved] = useState(initialLoved);
  const [count, setCount] = useState(initialCount);

  // One love in flight at a time; see the matching note in post-card.tsx.
  const busy = useRef(false);

  async function handle() {
    if (busy.current) return;
    const before = { liked: loved, count };
    setLoved(!before.liked);
    setCount(before.liked ? before.count - 1 : before.count + 1);
    busy.current = true;
    try {
      const result = await callAction(() => togglePhotoLove(photoId));
      if (result.error) {
        setLoved(before.liked);
        setCount(before.count);
        toast.error(result.error);
        return;
      }
      // What the row says, not what the tap assumed: this page comes back from
      // Next's client cache on Back with the heart it had before (C-133).
      const settled = settledHeart(before, result.loved);
      setLoved(settled.liked);
      setCount(settled.count);
    } finally {
      busy.current = false;
    }
  }

  return (
    <LoveButton
      liked={loved}
      count={count}
      onToggle={handle}
      className="border border-border font-medium"
      label="Like this photo"
    />
  );
}
