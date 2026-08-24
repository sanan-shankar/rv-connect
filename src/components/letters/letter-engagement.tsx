"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { callAction } from "@/lib/call-action";
import { settledHeart } from "@/lib/heart";
import { ShieldAlert } from "lucide-react";
import { toggleLike, toggleBookmark, adminRemovePost } from "@/app/(main)/feed/actions";
import { CommentsSection } from "@/components/posts/comments-section";
import { ModerationDialog } from "@/components/admin/moderation-dialog";
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
  viewerIsAdmin = false,
}: {
  postId: string;
  groupId: string | null;
  initialLiked: boolean;
  initialLikeCount: number;
  initialBookmarked: boolean;
  initialCommentCount: number;
  /** Site admin reading this letter: shows "Remove letter" and per-comment moderation. */
  viewerIsAdmin?: boolean;
}) {
  const router = useRouter();
  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [commentCount, setCommentCount] = useState(initialCommentCount);
  const [showModeration, setShowModeration] = useState(false);

  /* One of each in flight at a time; the same refs the feed card carries
     (audit C-010/C-178). */
  const likeBusy = useRef(false);
  const bookmarkBusy = useRef(false);

  async function handleLike() {
    if (likeBusy.current) return;
    const before = { liked, count: likeCount };
    setLiked(!before.liked);
    setLikeCount(before.liked ? before.count - 1 : before.count + 1);
    likeBusy.current = true;
    try {
      const result = await callAction(() => toggleLike(postId));
      if (result.error) {
        setLiked(before.liked);
        setLikeCount(before.count);
        toast.error(result.error);
        return;
      }
      /* What the row says, not what the tap assumed. This page is served from
         Next's client cache on Back, so it can re-mount showing the heart it
         had BEFORE a like -- and tapping that stale-empty heart removes the
         like that is really there. Adopting the answer means the heart at
         least tells the truth about the row (audit C-133). */
      const settled = settledHeart(before, result.liked);
      setLiked(settled.liked);
      setLikeCount(settled.count);
    } finally {
      likeBusy.current = false;
    }
  }

  async function handleBookmark() {
    if (bookmarkBusy.current) return;
    const before = bookmarked;
    setBookmarked(!before);
    bookmarkBusy.current = true;
    try {
      const result = await callAction(() => toggleBookmark(postId));
      if (result.error) {
        setBookmarked(before);
        toast.error(result.error);
        return;
      }
      setBookmarked(result.bookmarked ?? !before);
    } finally {
      bookmarkBusy.current = false;
    }
  }

  async function handleModerationConfirm(note: string) {
    const result = await adminRemovePost(postId, note || undefined);
    if (!result.error) router.push(groupId ? `/groups/${groupId}` : "/letters");
    return result;
  }

  const shareHref = groupId ? `/groups/${groupId}` : `/letters/${postId}`;

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
        {viewerIsAdmin && (
          <button
            onClick={() => setShowModeration(true)}
            aria-label="Remove letter (admin)"
            title="Remove letter (admin)"
            className="grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <ShieldAlert className="h-4 w-4" />
          </button>
        )}
      </div>

      <CommentsSection
        postId={postId}
        onCommentAdded={() => setCommentCount((c) => c + 1)}
        onCommentRemoved={() => setCommentCount((c) => Math.max(0, c - 1))}
        alwaysOpen
        viewerIsAdmin={viewerIsAdmin}
        expectedCount={commentCount}
      />

      {viewerIsAdmin && (
        <ModerationDialog
          open={showModeration}
          onClose={() => setShowModeration(false)}
          itemLabel="letter"
          onConfirm={handleModerationConfirm}
        />
      )}
    </div>
  );
}
