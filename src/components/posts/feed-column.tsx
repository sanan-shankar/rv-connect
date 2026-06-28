"use client";

import { useState } from "react";
import { CreatePostForm, type ComposerScope } from "./create-post-form";
import { PostFeed, type FeedScope } from "./post-feed";
import type { AvatarUser } from "@/components/common/bird-avatar";

/**
 * FeedColumn: composer + feed sharing a reload trigger, so a freshly created
 * post appears immediately without a full navigation. Used by the main feed
 * and by group feeds (pass groupId).
 */
export function FeedColumn({
  groupId,
  scope = "all",
  composerScope,
  showControls = true,
  placeholder,
  currentUser,
  emptyTitle,
  emptyHint,
}: {
  groupId?: string;
  scope?: FeedScope;
  composerScope?: ComposerScope;
  showControls?: boolean;
  placeholder?: string;
  currentUser?: AvatarUser;
  emptyTitle?: string;
  emptyHint?: string;
}) {
  const [reloadKey, setReloadKey] = useState(0);

  return (
    <div className="space-y-5">
      <CreatePostForm
        groupId={groupId}
        scope={composerScope}
        placeholder={placeholder}
        currentUser={currentUser}
        onPosted={() => setReloadKey((k) => k + 1)}
      />
      <PostFeed
        groupId={groupId}
        scope={scope}
        showControls={showControls}
        reloadKey={reloadKey}
        emptyTitle={emptyTitle}
        emptyHint={emptyHint}
      />
    </div>
  );
}
