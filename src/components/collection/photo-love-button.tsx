"use client";

import { useState } from "react";
import { togglePhotoLove } from "@/app/(main)/collection/actions";
import { useHeartToggle } from "@/components/posts/use-engagement";
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

  const fire = useHeartToggle(() => togglePhotoLove(photoId));

  function handle() {
    void fire({ liked: loved, count }, ({ liked, count: c }) => {
      setLoved(liked);
      setCount(c);
    });
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
