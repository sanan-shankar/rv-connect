"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useHeartToggle, useBookmarkToggle } from "@/components/posts/use-engagement";
import { toggleLike, toggleBookmark } from "@/app/(main)/feed/actions";
import { LoveButton } from "@/components/common/love-button";
import { BookmarkButton } from "@/components/common/bookmark-button";
import { ShareButton } from "@/components/common/share-button";

/* The two heaviest things on a letter page, deferred the way post-card.tsx
   already defers both of them. They were static here only because this file
   was written after that one and did not copy the shape: on /feed neither is
   in the first load, on /letters/[id] both were.

   The comments block keeps its SERVER render (no `ssr: false`) because it is
   `alwaysOpen` on a letter and draws its own skeleton rows from
   `expectedCount` -- taking that out of the HTML would leave a hole under the
   letter until hydration. This is a client-chunk split only. */
import { FEED_COMMENT_ACTIONS } from "@/components/posts/feed-comment-actions";

const CommentsSection = dynamic(() =>
  import("@/components/posts/comments-section").then((m) => m.CommentsSection)
);

export function LetterEngagement({
  postId,
  initialLiked,
  initialLikeCount,
  initialBookmarked,
  initialCommentCount,
  viewerIsAdmin = false,
}: {
  postId: string;
  initialLiked: boolean;
  initialLikeCount: number;
  initialBookmarked: boolean;
  initialCommentCount: number;
  /** Site admin reading this letter: turns on per-comment moderation.
   *  Removing the LETTER lives in the byline's menu (letter-menu.tsx), beside
   *  Report, exactly where a post card keeps it -- it used to be a bare
   *  ShieldAlert in the action row below, labelled "Remove letter (admin)",
   *  which is the parenthetical role note the menu-item rule bans. */
  viewerIsAdmin?: boolean;
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [commentCount, setCommentCount] = useState(initialCommentCount);

  const fireLike = useHeartToggle(() => toggleLike(postId));
  const fireBookmark = useBookmarkToggle(() => toggleBookmark(postId));

  function handleLike() {
    void fireLike({ liked, count: likeCount }, ({ liked: next, count }) => {
      setLiked(next);
      setLikeCount(count);
    });
  }

  function handleBookmark() {
    void fireBookmark(bookmarked, setBookmarked);
  }

  const shareHref = `/letters/${postId}`;

  return (
    <div className="mt-10 border-t border-border pt-4">
      {/* Same shared action row as the feed/group PostCard: one heart, one bookmark, one share.
          The negative margin keeps the heart glyph flush with the letter's text column. */}
      <div className="-mx-2.5 flex items-center gap-1 text-muted-foreground">
        <LoveButton liked={liked} count={likeCount} onToggle={handleLike} label="Like this letter" />
        <span className="px-2.5 py-1.5 text-sm">{commentCount} comments</span>
        <BookmarkButton
          saved={bookmarked}
          onToggle={handleBookmark}
          id={postId}
          className="ml-auto"
          label={bookmarked ? "Remove bookmark" : "Save letter"}
        />
        <ShareButton href={shareHref} label="Copy link to letter" />
      </div>

      <CommentsSection
        targetId={postId}
        actions={FEED_COMMENT_ACTIONS}
        onCommentAdded={() => setCommentCount((c) => c + 1)}
        onCommentRemoved={() => setCommentCount((c) => Math.max(0, c - 1))}
        alwaysOpen
        viewerIsAdmin={viewerIsAdmin}
        expectedCount={commentCount}
      />
    </div>
  );
}
