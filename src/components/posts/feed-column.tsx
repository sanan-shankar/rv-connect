"use client";

import { useState } from "react";
import { CreatePostForm } from "./create-post-form";
import { PostFeed } from "./post-feed";

/**
 * FeedColumn: composer + feed sharing a reload trigger, so a freshly created
 * post appears immediately without a full navigation. Used by the main feed
 * and by group feeds (pass groupId).
 */
export function FeedColumn({
  groupId,
  showControls = true,
  placeholder,
  emptyTitle,
  emptyHint,
}: {
  groupId?: string;
  showControls?: boolean;
  placeholder?: string;
  emptyTitle?: string;
  emptyHint?: string;
}) {
  const [reloadKey, setReloadKey] = useState(0);

  return (
    <div className="space-y-5">
      <CreatePostForm
        groupId={groupId}
        placeholder={placeholder}
        onPosted={() => setReloadKey((k) => k + 1)}
      />
      <PostFeed
        groupId={groupId}
        showControls={showControls}
        reloadKey={reloadKey}
        emptyTitle={emptyTitle}
        emptyHint={emptyHint}
      />
    </div>
  );
}
