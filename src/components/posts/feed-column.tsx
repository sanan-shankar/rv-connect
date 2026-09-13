"use client";

import { useCallback, useRef, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { CreatePostForm } from "./create-post-form";
import { PostFeed } from "./post-feed";
import { BirdAvatar, type AvatarUser } from "@/components/common/bird-avatar";
import { SPRINGS } from "@/components/common/motion";
import { OWN_BIRD_LAYOUT_ID, useNewPostDock } from "@/components/feed/new-post-dock";

/* The composer opens at the top of the feed, under the header, and the posts
   make room. Only transform and opacity move: the card fades and settles from
   its top right (the corner nearest the New post badge), and the feed below is
   a single `layout="position"` block, so it slides as a translate rather than
   anything animating a height.
   `custom` is whether a post just landed. Landed, the card dissolves quickly
   into the post that is now first in the feed; dismissed empty, it folds back
   up toward the badge it came from. */
const COMPOSER_MOTION = {
  hidden: { opacity: 0, y: -10, scale: 0.98 },
  shown: { opacity: 1, y: 0, scale: 1, transition: SPRINGS.gentle },
  exit: (landed: boolean) =>
    landed
      ? { opacity: 0, transition: { duration: 0.16, ease: "easeOut" as const } }
      : { opacity: 0, y: -10, scale: 0.98, transition: SPRINGS.snappy },
};

/**
 * FeedColumn: composer + feed sharing a reload trigger, so a freshly created
 * post appears immediately without a full navigation. One caller, the main
 * feed. The composer is opened and closed through NewPostDock, which the
 * header's New post badge shares.
 */
export function FeedColumn({
  currentUser,
  userPlaces,
  initialSearch,
  lastSeenAt,
}: {
  currentUser?: AvatarUser;
  /** The signed-in poster's own cities, for the composer's "Show to" audience control. */
  userPlaces?: string[];
  /** Seeds the feed's search: the `?q=` the header search pill sets. */
  initialSearch?: string;
  /** The account's "New since you were last here" marker, read server-side.
   *  Passed straight through; see PostFeed for what it draws. */
  lastSeenAt?: string | null;
}) {
  const { open, landed, close } = useNewPostDock();
  const [reloadKey, setReloadKey] = useState(0);
  /* True between a post publishing and the feed coming back with it. The
     composer stays up, on "Posting...", for that stretch, and closes into the
     feed only once the new post is really there. */
  const landingRef = useRef(false);

  const onReloaded = useCallback(() => {
    if (!landingRef.current) return;
    landingRef.current = false;
    close({ landed: true });
  }, [close]);

  return (
    <div className="flex flex-col">
      <AnimatePresence initial={false} mode="popLayout" custom={landed}>
        {open && (
          <m.div
            key="composer"
            variants={COMPOSER_MOTION}
            initial="hidden"
            animate="shown"
            exit="exit"
            style={{ transformOrigin: "top right" }}
            /* The gap to the first post belongs to the composer, so it arrives
               and leaves with it instead of being a gap that animates. */
            className="pb-5"
          >
            <CreatePostForm
              currentUser={currentUser}
              userPlaces={userPlaces}
              avatarSlot={currentUser && <OwnBirdSlot user={currentUser} />}
              onDismiss={close}
              onPosted={() => {
                landingRef.current = true;
                setReloadKey((k) => k + 1);
              }}
            />
          </m.div>
        )}
        <m.div key="feed" layout="position" transition={SPRINGS.gentle}>
          <PostFeed
            reloadKey={reloadKey}
            onReloaded={onReloaded}
            initialSearch={initialSearch}
            lastSeenAt={lastSeenAt}
          />
        </m.div>
      </AnimatePresence>
    </div>
  );
}

/** Where the member's own bird lands in the composer. It reads the dock
 *  itself rather than taking `open` as a prop: a closing composer is frozen
 *  by AnimatePresence at its last props, and a frozen slot would keep the
 *  bird while the badge draws it too. A context read still updates, so the
 *  bird leaves the moment the composer starts to close and flies home. */
function OwnBirdSlot({ user }: { user: AvatarUser }) {
  const { open } = useNewPostDock();
  return (
    /* relative z-10: the bird flies in from the header over the text field,
       which comes later in the DOM and otherwise paints across it mid-flight. */
    <span className="relative z-10 mt-0.5 grid size-10 shrink-0 place-items-center">
      {open && (
        <m.span layoutId={OWN_BIRD_LAYOUT_ID} transition={SPRINGS.gentle} className="grid place-items-center">
          <BirdAvatar user={user} size="sm" />
        </m.span>
      )}
    </span>
  );
}
