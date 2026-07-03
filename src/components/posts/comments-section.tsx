"use client";

import { useState, useEffect } from "react";
import { Reply, ArrowUp, X } from "lucide-react";
import { BirdAvatar } from "@/components/common/bird-avatar";
import { PersonName } from "@/components/common/person-name";
import { LoveButton } from "@/components/common/love-button";
import Link from "next/link";
import { formatTimeAgo } from "@/lib/utils";
import {
  createComment,
  loadComments,
  toggleCommentLike,
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
    accountType?: string | null;
    verifyState?: string | null;
    batchType: string | null;
    batchYear: number | null;
  };
}

// The thread reveal: rows rise in on a calm, quick stagger. Parent gates the children,
// each child lifts a touch as it arrives. Transform + opacity only.
const LIST_VARIANTS = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } },
};
const ROW_VARIANTS = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: SPRINGS.gentle },
};

export function CommentsSection({
  postId,
  onCommentAdded,
}: {
  postId: string;
  onCommentAdded: () => void;
}) {
  const [comments, setComments] = useState<CommentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(
    null
  );
  const [submitting, setSubmitting] = useState(false);
  const [focused, setFocused] = useState(false);

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
      // Reload comments
      const updated = await loadComments(postId);
      setComments(updated);
      setNewComment("");
      setReplyTo(null);
      onCommentAdded();
    }
    setSubmitting(false);
  }

  // Organize comments: top-level first, then group replies under parents
  const topLevel = comments.filter((c) => !c.parentId);
  const repliesMap = new Map<string, CommentData[]>();
  for (const c of comments) {
    if (c.parentId) {
      const existing = repliesMap.get(c.parentId) || [];
      existing.push(c);
      repliesMap.set(c.parentId, existing);
    }
  }

  function handleLikeToggle(id: string, liked: boolean, count: number) {
    setComments((prev) =>
      prev.map((c) => (c.id === id ? { ...c, liked, likeCount: count } : c))
    );
  }

  // ONE smooth reveal. The panel opens with a single height-auto spring (matches the
  // preview's comments-open feel). The final layout is rendered from the very first
  // frame: list area on top, input form on the bottom, both always present. While the
  // comments are loading we hold a quiet placeholder in the list area, so when the real
  // rows arrive they cross-fade and stagger in (transform + opacity only) instead of
  // forcing a second height jump. There is no loading-then-swap that re-opens the panel.
  return (
    <motion.div
      className="mt-3 border-t border-border pt-3"
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={SPRINGS.gentle}
      style={{ overflow: "hidden" }}
    >
      {/* Comments list */}
      <motion.div
        className="flex flex-col gap-3"
        variants={LIST_VARIANTS}
        initial="hidden"
        animate="show"
      >
        {loading ? (
          <p className="px-1 text-sm text-muted-foreground">Loading comments...</p>
        ) : comments.length === 0 ? (
          <p className="px-1 text-sm text-muted-foreground">
            No comments yet. Be the first.
          </p>
        ) : (
          topLevel.map((comment) => (
            <motion.div key={comment.id} variants={ROW_VARIANTS}>
              <CommentItem
                comment={comment}
                onReply={() =>
                  setReplyTo({ id: comment.id, name: comment.author.name })
                }
                onLikeToggle={handleLikeToggle}
              />
              {/* Replies */}
              {repliesMap.get(comment.id)?.map((reply) => (
                <motion.div
                  key={reply.id}
                  className="ml-9 mt-2"
                  variants={ROW_VARIANTS}
                >
                  <CommentItem
                    comment={reply}
                    onReply={() =>
                      setReplyTo({ id: comment.id, name: reply.author.name })
                    }
                    onLikeToggle={handleLikeToggle}
                  />
                </motion.div>
              ))}
            </motion.div>
          ))
        )}
      </motion.div>

      {/* Comment input */}
      <form onSubmit={handleSubmit} className="mt-3">
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
          {/* Clean INSET focus ring (inline so it never depends on Tailwind arbitrary parsing):
              it lives inside the input, so the panel's overflow-hidden (needed for the open/close
              height animation) can never clip it into the stray top-and-side shape it showed before. */}
          <input
            type="text"
            className="h-9 flex-1 rounded-full border bg-card px-4 text-sm text-foreground outline-none transition-[box-shadow,border-color] duration-150 ease-out placeholder:text-muted-foreground"
            placeholder={replyTo ? `Reply to ${replyTo.name}...` : "Write a comment..."}
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
    </motion.div>
  );
}

function CommentItem({
  comment,
  onReply,
  onLikeToggle,
}: {
  comment: CommentData;
  onReply: () => void;
  onLikeToggle: (id: string, liked: boolean, count: number) => void;
}) {
  async function handleLike() {
    const newLiked = !comment.liked;
    const newCount = newLiked
      ? comment.likeCount + 1
      : comment.likeCount - 1;
    onLikeToggle(comment.id, newLiked, newCount);

    const result = await toggleCommentLike(comment.id);
    if (result.error) {
      // Revert on error
      onLikeToggle(comment.id, comment.liked, comment.likeCount);
      toast.error(result.error);
    }
  }

  return (
    <div className="flex items-start gap-2.5">
      <Link
        href={`/profile/${comment.author.id}`}
        aria-label={comment.author.name}
        className="mt-0.5 shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <BirdAvatar
          user={{ id: comment.author.id, name: comment.author.name, photoUrl: comment.author.photoUrl }}
          size="xs"
        />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="inline-block max-w-full rounded-2xl rounded-tl-md bg-muted px-3.5 py-2">
          <PersonName user={comment.author} className="text-xs" />
          <p className="mt-0.5 text-sm leading-relaxed text-foreground break-words">
            {comment.content}
          </p>
        </div>
        <div className="mt-1 flex items-center gap-3 pl-1 text-xs text-muted-foreground">
          <span>{formatTimeAgo(new Date(comment.createdAt))}</span>
          <button
            onClick={onReply}
            className="font-medium rounded-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:opacity-70 transition-opacity duration-150"
          >
            Reply
          </button>
          <LoveButton
            liked={comment.liked}
            count={comment.likeCount}
            onToggle={handleLike}
            size="sm"
            showCount={comment.likeCount > 0}
            className="font-medium"
          />
        </div>
      </div>
    </div>
  );
}
