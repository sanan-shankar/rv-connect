"use client";

import { useState, useEffect, useRef } from "react";
import { Reply, ArrowUp, X, ShieldAlert } from "lucide-react";
import { BirdAvatar } from "@/components/common/bird-avatar";
import { PersonName } from "@/components/common/person-name";
import { LoveButton } from "@/components/common/love-button";
import { ModerationDialog } from "@/components/admin/moderation-dialog";
import Link from "next/link";
import { formatTimeAgo } from "@/lib/utils";
import {
  createComment,
  loadComments,
  toggleCommentLike,
  adminRemoveComment,
} from "@/app/(main)/feed/actions";
import { toast } from "sonner";
import { motion } from "motion/react";
import { SPRINGS, SpringPress } from "@/components/common/motion";

interface CommentData {
  id: string;
  content: string;
  parentId: string | null;
  createdAt: string;
  likeCount: number;
  liked: boolean;
  author: {
    id: string;
    name: string;
    avatarColor: string | null;
    photoUrl: string | null;
    birdOverride?: string | null;
    accountType?: string | null;
    verifyState?: string | null;
    batchType: string | null;
    batchYear: number | null;
  };
}

// Renders the comment thread for a post. Feed/group cards toggle it open as an accordion
// (one coordinated open/close timeline); Letters pass `alwaysOpen` to render it expanded.
export function CommentsSection({
  postId,
  onCommentAdded,
  onCommentRemoved,
  alwaysOpen = false,
  viewerIsAdmin = false,
}: {
  postId: string;
  onCommentAdded: () => void;
  /** Fired after an admin's removal is confirmed, so the post's visible comment count drops too. */
  onCommentRemoved?: () => void;
  /** Letters render the thread permanently expanded, so they skip the open/close accordion. */
  alwaysOpen?: boolean;
  /** Site admin viewing this thread: shows the "Remove" moderation control on every comment. */
  viewerIsAdmin?: boolean;
}) {
  const [comments, setComments] = useState<CommentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(
    null
  );
  const [submitting, setSubmitting] = useState(false);
  const [focused, setFocused] = useState(false);
  // The comment currently targeted by the admin moderation dialog, if any.
  const [moderatingId, setModeratingId] = useState<string | null>(null);

  // The panel animates to (and then tracks) the real height of its content. A single
  // ResizeObserver is the ONE clock: the initial open, the comments arriving from the
  // network, and a freshly posted reply all grow the panel on the same height spring
  // instead of a second, jumpy re-open. (Letters skip this: they are always expanded.)
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(0);

  useEffect(() => {
    if (alwaysOpen) return;
    const el = contentRef.current;
    if (!el) return;
    const measure = () => setContentHeight(el.offsetHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [alwaysOpen]);

  useEffect(() => {
    loadComments(postId).then((data) => {
      setComments(data);
      setLoading(false);
    });
  }, [postId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim()) return;
    setSubmitting(true);

    const formData = new FormData();
    formData.set("content", newComment);
    formData.set("postId", postId);
    if (replyTo) formData.set("parentId", replyTo.id);

    const result = await createComment(formData);
    if (result.error) {
      toast.error(result.error);
    } else {
      const updated = await loadComments(postId);
      setComments(updated);
      setNewComment("");
      setReplyTo(null);
      onCommentAdded();
    }
    setSubmitting(false);
  }

  function handleLikeToggle(id: string, liked: boolean, count: number) {
    setComments((prev) =>
      prev.map((c) => (c.id === id ? { ...c, liked, likeCount: count } : c))
    );
  }

  async function handleModerationConfirm(note: string) {
    if (!moderatingId) return { error: "Nothing selected" };
    const result = await adminRemoveComment(moderatingId, note || undefined);
    if (!result.error) {
      setComments((prev) => prev.filter((c) => c.id !== moderatingId));
      onCommentRemoved?.();
    }
    return result;
  }

  // Organise: top-level comments first, replies grouped under their parent.
  const topLevel = comments.filter((c) => !c.parentId);
  const repliesMap = new Map<string, CommentData[]>();
  for (const c of comments) {
    if (c.parentId) {
      const existing = repliesMap.get(c.parentId) || [];
      existing.push(c);
      repliesMap.set(c.parentId, existing);
    }
  }

  // The measured content: divider, the thread, and the composer. List sits on top, the
  // input always sits on the bottom, so the reveal order is the same every single time.
  const body = (
    <div ref={contentRef} className="flex flex-col gap-4 px-0.5 pb-1 pt-3">
      <div className="border-t border-border/70" />

      {loading ? (
        <div className="flex flex-col gap-4" aria-hidden>
          {[0, 1].map((i) => (
            <div key={i} className="flex items-start gap-2.5">
              <div className="skeleton-warm size-7 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="skeleton-warm h-3 w-28 rounded-full" />
                <div
                  className="skeleton-warm h-3 rounded-full"
                  style={{ width: i === 0 ? "82%" : "64%" }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <p className="px-1 text-sm text-muted-foreground">
          No comments yet. Be the first.
        </p>
      ) : (
        <motion.ul
          className="flex flex-col gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          {topLevel.map((comment) => {
            const replies = repliesMap.get(comment.id);
            return (
              <li key={comment.id}>
                <CommentItem
                  comment={comment}
                  onReply={() =>
                    setReplyTo({ id: comment.id, name: comment.author.name })
                  }
                  onLikeToggle={handleLikeToggle}
                  viewerIsAdmin={viewerIsAdmin}
                  onModerate={() => setModeratingId(comment.id)}
                />
                {replies && replies.length > 0 && (
                  <ul className="mt-4 flex flex-col gap-4 border-l border-border/70 pl-4 [margin-left:13px]">
                    {replies.map((reply) => (
                      <li key={reply.id}>
                        <CommentItem
                          comment={reply}
                          onReply={() =>
                            setReplyTo({
                              id: comment.id,
                              name: reply.author.name,
                            })
                          }
                          onLikeToggle={handleLikeToggle}
                          viewerIsAdmin={viewerIsAdmin}
                          onModerate={() => setModeratingId(reply.id)}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </motion.ul>
      )}

      {/* Composer. Always mounted at the bottom, so it appears together with the thread. */}
      <form onSubmit={handleSubmit}>
        {replyTo && (
          <motion.div
            className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-1 text-xs text-muted-foreground"
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={SPRINGS.snappy}
          >
            <Reply className="h-3 w-3 text-leaf" />
            <span>
              Replying to{" "}
              <span className="font-semibold text-foreground">
                {replyTo.name}
              </span>
            </span>
            <button
              type="button"
              onClick={() => setReplyTo(null)}
              aria-label="Cancel reply"
              className="-mr-0.5 ml-0.5 inline-grid size-4 place-items-center rounded-full text-muted-foreground hover:bg-foreground/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:opacity-70"
            >
              <X className="h-3 w-3" />
            </button>
          </motion.div>
        )}
        <div className="flex items-center gap-2">
          {/* Inset focus ring (inline, so the panel's overflow-hidden during the open/close
              animation can never clip it into a stray shape). */}
          <input
            type="text"
            className="h-9 flex-1 rounded-full border bg-card px-4 text-sm text-foreground outline-none transition-[box-shadow,border-color] duration-150 ease-out placeholder:text-muted-foreground"
            placeholder={
              replyTo ? `Reply to ${replyTo.name}...` : "Write a comment..."
            }
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            maxLength={1000}
            style={{
              borderColor: focused
                ? "color-mix(in srgb, var(--color-leaf) 55%, var(--border))"
                : "var(--border)",
              boxShadow: focused
                ? "inset 0 0 0 2px color-mix(in srgb, var(--color-leaf) 28%, transparent)"
                : "none",
            }}
          />
          <SpringPress
            className="inline-grid size-9 shrink-0 place-items-center rounded-full bg-canopy text-white shadow-[0_5px_13px_-12px_var(--color-canopy)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-canopy/60 disabled:opacity-40 disabled:shadow-none"
            {...({
              type: "submit",
              "aria-label": "Post comment",
              disabled: !newComment.trim() || submitting,
            } as object)}
          >
            <ArrowUp className="h-4 w-4" strokeWidth={2.6} />
          </SpringPress>
        </div>
      </form>

      {viewerIsAdmin && (
        <ModerationDialog
          open={moderatingId !== null}
          onClose={() => setModeratingId(null)}
          itemLabel="comment"
          onConfirm={handleModerationConfirm}
        />
      )}
    </div>
  );

  // Letters: permanently expanded, no accordion (avoids a stray open animation on page load).
  if (alwaysOpen) {
    return (
      <div id={`comments-${postId}`} className="mt-3">
        {body}
      </div>
    );
  }

  // Feed / groups: one coordinated timeline. Open springs height 0 -> measured and fades in
  // as a single unit; close collapses everything (rows, divider, input) on one clean tween,
  // with no second step and no divider left behind.
  return (
    <motion.div
      id={`comments-${postId}`}
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: contentHeight, opacity: 1 }}
      exit={{
        height: 0,
        opacity: 0,
        transition: {
          // Noticeably slower than the open (owner feedback: close read as an abrupt snap).
          // Open timing (SPRINGS.gentle below) is untouched.
          height: { duration: 0.55, ease: "easeInOut" },
          opacity: { duration: 0.32, ease: "easeOut" },
        },
      }}
      transition={{
        height: SPRINGS.gentle,
        opacity: { duration: 0.22, ease: "easeOut" },
      }}
      style={{ overflow: "hidden" }}
    >
      {body}
    </motion.div>
  );
}

function CommentItem({
  comment,
  onReply,
  onLikeToggle,
  viewerIsAdmin = false,
  onModerate,
}: {
  comment: CommentData;
  onReply: () => void;
  onLikeToggle: (id: string, liked: boolean, count: number) => void;
  /** Site admin viewing this thread: shows the "Remove" moderation control. */
  viewerIsAdmin?: boolean;
  onModerate?: () => void;
}) {
  async function handleLike() {
    const newLiked = !comment.liked;
    const newCount = newLiked ? comment.likeCount + 1 : comment.likeCount - 1;
    onLikeToggle(comment.id, newLiked, newCount);

    const result = await toggleCommentLike(comment.id);
    if (result.error) {
      onLikeToggle(comment.id, comment.liked, comment.likeCount);
      toast.error(result.error);
    }
  }

  return (
    <div className="flex items-start gap-2.5">
      {/* No top margin: with the name/meta cluster now sitting close together (see the meta
          div's -mt-2.5 below), the avatar (34px) and the two-line cluster (~33px, measured
          top-of-name to bottom-of-meta) are within a px of the same height, so flush
          alignment already centers the avatar against the cluster. */}
      <Link
        href={`/profile/${comment.author.id}`}
        aria-label={comment.author.name}
        className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <BirdAvatar
          user={{
            id: comment.author.id,
            name: comment.author.name,
            photoUrl: comment.author.photoUrl,
            birdOverride: comment.author.birdOverride,
          }}
          size={34}
        />
      </Link>
      <div className="min-w-0 flex-1">
        {/* Clean inline comment (derived from the delight demo): the author's name sits bold and
            in line, the text flows straight after it. No boxy bubble; it wraps for long comments. */}
        <p className="text-[14px] leading-relaxed text-foreground [overflow-wrap:anywhere]">
          <PersonName user={comment.author} className="mr-1.5 align-baseline" />
          {comment.content}
        </p>
        {/* The name/content line and this meta line are one related cluster (proximity
            principle): keep them close, just a couple px apart. leading-relaxed's own bottom
            half-leading already supplies most of that space, so only a small negative nudge
            is needed (the old -mt-1.5 over-cancelled it down to 0px; a bare mt-1 left ~18px,
            which read as belonging to two different rows). h-5 still matches LoveButton's own
            resting height (see the [&>span] override below) so the row never needs to fight or
            clip its child. */}
        <div className="-mt-2.5 flex h-5 items-center gap-3 text-xs text-muted-foreground">
          <span>{formatTimeAgo(new Date(comment.createdAt))}</span>
          <button
            onClick={onReply}
            className="rounded-sm font-medium transition-opacity duration-150 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:opacity-70"
          >
            Reply
          </button>
          <LoveButton
            liked={comment.liked}
            count={comment.likeCount}
            onToggle={handleLike}
            size="sm"
            showCount={comment.likeCount > 0}
            label="Like this comment"
            /* LoveButton's count `<span>` is plain text, so it inherits text-sm's 20px
               line-height while the icon-only span next to it sizes to the 12px heart glyph.
               That mismatch made the WHOLE BUTTON (an `items-center` flex row) grow ~8px the
               instant a like made the count mount, which grew this row (and the comment) on
               like, and previously required an under-sized h-5 clamp that let the button's own
               hover pill / focus ring bleed upward into the text above. Pinning both of the
               button's direct-child spans to a 12px line box (matching the icon's actual
               height) makes the button genuinely 20px tall (12px content + 4px+4px py-1
               padding) in EITHER state, so nothing needs to be clamped or can overflow. */
            className="-ml-1 font-medium [&>span]:leading-[12px]"
          />
          {viewerIsAdmin && (
            <button
              onClick={onModerate}
              aria-label="Remove comment (admin)"
              title="Remove comment (admin)"
              className="ml-auto rounded-sm font-medium text-muted-foreground/70 transition-opacity duration-150 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:opacity-70"
            >
              <ShieldAlert className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
