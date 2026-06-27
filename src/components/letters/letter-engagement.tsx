"use client";

import { useState } from "react";
import { Heart, ShareFat, BookmarkSimple } from "@phosphor-icons/react";
import { toast } from "sonner";
import { toggleLike, toggleBookmark } from "@/app/(main)/feed/actions";
import { CommentsSection } from "@/components/posts/comments-section";

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
  const [animateLike, setAnimateLike] = useState(false);

  async function handleLike() {
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => (next ? c + 1 : c - 1));
    if (next) {
      setAnimateLike(true);
      setTimeout(() => setAnimateLike(false), 320);
    }
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

  async function handleShare() {
    const path = groupId ? `/groups/${groupId}` : `/letters/${postId}`;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${path}`);
      toast.success("Link copied");
    } catch {
      toast.error("Could not copy the link");
    }
  }

  return (
    <div className="mt-10 border-t border-border pt-4">
      <div className="flex items-center gap-1 text-muted-foreground">
        <button
          onClick={handleLike}
          aria-pressed={liked}
          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
            liked ? "text-heart" : "hover:text-heart"
          }`}
        >
          <span className={`inline-flex transition-transform ${animateLike ? "scale-125" : ""}`}>
            <Heart size={18} weight={liked ? "fill" : "regular"} />
          </span>
          <span>{likeCount}</span>
        </button>
        <span className="px-2.5 py-1.5 text-sm">{commentCount} comments</span>
        <button
          onClick={handleBookmark}
          aria-pressed={bookmarked}
          aria-label={bookmarked ? "Remove bookmark" : "Save letter"}
          className={`ml-auto flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
            bookmarked ? "text-leaf" : "hover:text-foreground"
          }`}
        >
          <BookmarkSimple size={18} weight={bookmarked ? "fill" : "regular"} />
        </button>
        <button
          onClick={handleShare}
          aria-label="Copy link to letter"
          className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <ShareFat size={17} weight="regular" />
        </button>
      </div>

      <CommentsSection postId={postId} onCommentAdded={() => setCommentCount((c) => c + 1)} />
    </div>
  );
}
