"use client";

import { useState } from "react";
import { toast } from "sonner";
import { toggleLike, toggleBookmark } from "@/app/(main)/feed/actions";
import { CommentsSection } from "@/components/posts/comments-section";
import { LoveButton } from "@/components/common/love-button";
import { BookmarkButton } from "@/components/common/bookmark-button";
import { ShareButton } from "@/components/common/share-button";

export function LetterEngagement({
  postId,
  groupId,
  initialLiked,
  initialLikeCount,
  initialBookmarked,
  initialCommentCount,
}: {
  postId: string;
  groupId: string | null;
  initialLiked: boolean;
  initialLikeCount: number;
  initialBookmarked: boolean;
  initialCommentCount: number;
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [commentCount, setCommentCount] = useState(initialCommentCount);

  async function handleLike() {
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => (next ? c + 1 : c - 1));
    const result = await toggleLike(postId);
    if (result.error) {
      setLiked(!next);
      setLikeCount((c) => (next ? c - 1 : c + 1));
      toast.error(result.error);
    }
  }

  async function handleBookmark() {
    const next = !bookmarked;
    setBookmarked(next);
    const result = await toggleBookmark(postId);
    if (result.error) {
      setBookmarked(!next);
      toast.error(result.error);
    }
  }

  const shareHref = groupId ? `/groups/${groupId}` : `/letters/${postId}`;

  return (
    <div className="mt-10 border-t border-border pt-4">
      {/* Same shared action row as the feed/group PostCard: one heart, one bookmark, one share.
          The negative margin keeps the heart glyph flush with the letter's text column. */}
      <div className="-mx-2.5 flex items-center gap-1 text-muted-foreground">
        <LoveButton liked={liked} count={likeCount} onToggle={handleLike} />
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
        postId={postId}
        onCommentAdded={() => setCommentCount((c) => c + 1)}
        alwaysOpen
      />
    </div>
  );
}
