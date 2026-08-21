"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { togglePhotoLove } from "@/app/(main)/collection/actions";
import { callAction } from "@/lib/call-action";
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
    const next = !loved;
    setLoved(next);
    setCount((c) => (next ? c + 1 : c - 1));
    busy.current = true;
    try {
      const result = await callAction(() => togglePhotoLove(photoId));
      if (result.error) {
        setLoved(!next);
        setCount((c) => (next ? c - 1 : c + 1));
        toast.error(result.error);
      }
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
