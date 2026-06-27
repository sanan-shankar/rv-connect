"use client";

import { useState } from "react";
import { Heart } from "@phosphor-icons/react";
import { toast } from "sonner";
import { togglePhotoLove } from "@/app/(main)/collection/actions";

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
  const [pop, setPop] = useState(false);

  async function handle() {
    const next = !loved;
    setLoved(next);
    setCount((c) => (next ? c + 1 : c - 1));
    if (next) {
      setPop(true);
      setTimeout(() => setPop(false), 320);
    }
    const result = await togglePhotoLove(photoId);
    if (result.error) {
      setLoved(!next);
      setCount((c) => (next ? c - 1 : c + 1));
      toast.error(result.error);
    }
  }

  return (
    <button
      onClick={handle}
      aria-pressed={loved}
      className={`flex items-center gap-1.5 rounded-full border border-border px-3.5 py-2 text-sm font-medium transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
        loved ? "text-heart" : "text-muted-foreground hover:text-heart"
      }`}
    >
      <span className={`inline-flex transition-transform ${pop ? "scale-125" : ""}`}>
        <Heart size={18} weight={loved ? "fill" : "regular"} />
      </span>
      {count}
    </button>
  );
}
