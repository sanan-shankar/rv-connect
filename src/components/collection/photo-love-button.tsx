"use client";

import { useState } from "react";
import { toast } from "sonner";
import { togglePhotoLove } from "@/app/(main)/collection/actions";
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

  async function handle() {
    const next = !loved;
    setLoved(next);
    setCount((c) => (next ? c + 1 : c - 1));
    const result = await togglePhotoLove(photoId);
    if (result.error) {
      setLoved(!next);
      setCount((c) => (next ? c - 1 : c + 1));
      toast.error(result.error);
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
