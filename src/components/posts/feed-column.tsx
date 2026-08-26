"use client";

import { useState } from "react";
import { CreatePostForm } from "./create-post-form";
import { PostFeed } from "./post-feed";
import type { AvatarUser } from "@/components/common/bird-avatar";

/**
 * FeedColumn: composer + feed sharing a reload trigger, so a freshly created
 * post appears immediately without a full navigation. One caller, the main
 * feed; the group-feed variant it also used to serve went with Groups.
 */
export function FeedColumn({
  showControls = true,
  currentUser,
  userPlaces,
  initialSearch,
  lastSeenAt,
}: {
  showControls?: boolean;
  currentUser?: AvatarUser;
  /** The signed-in poster's own cities, for the composer's "Show to" audience control. */
  userPlaces?: string[];
  /** Seeds the feed's search (e.g. `?q=` from the header search pill) even
   *  when the inline search/filter row (`showControls`) is hidden. */
  initialSearch?: string;
  /** The account's "New since you were last here" marker, read server-side.
   *  Passed straight through; see PostFeed for what it draws. */
  lastSeenAt?: string | null;
}) {
  const [reloadKey, setReloadKey] = useState(0);

  return (
    <div className="space-y-5">
      <CreatePostForm
        currentUser={currentUser}
        userPlaces={userPlaces}
        onPosted={() => setReloadKey((k) => k + 1)}
      />
      <PostFeed
        showControls={showControls}
        reloadKey={reloadKey}
        initialSearch={initialSearch}
        lastSeenAt={lastSeenAt}
      />
    </div>
  );
}
