"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useHeartToggle, useBookmarkToggle } from "@/components/posts/use-engagement";
import { ShieldAlert } from "lucide-react";
import { toggleLike, toggleBookmark, adminRemovePost } from "@/app/(main)/feed/actions";
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
   letter until hydration. This is a client-chunk split only.

   The moderation dialog is admin-only and opens on a press, so it gets
   `ssr: false` and the `viewerIsAdmin` guard below keeps it unfetched for
   everybody else. */
const CommentsSection = dynamic(() =>
  import("@/components/posts/comments-section").then((m) => m.CommentsSection)
);
const ModerationDialog = dynamic(
  () => import("@/components/admin/moderation-dialog").then((m) => m.ModerationDialog),
  { ssr: false }
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
  /** Site admin reading this letter: shows "Remove letter" and per-comment moderation. */
  viewerIsAdmin?: boolean;
}) {
  const router = useRouter();
  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [commentCount, setCommentCount] = useState(initialCommentCount);
  const [showModeration, setShowModeration] = useState(false);

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

  async function handleModerationConfirm(note: string) {
    const result = await adminRemovePost(postId, note || undefined);
    if (!result.error) router.push("/letters");
    return result;
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
