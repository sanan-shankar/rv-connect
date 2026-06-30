"use client";

import { useState, useEffect } from "react";
import { Send, Reply } from "lucide-react";
import { Heart } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BirdAvatar } from "@/components/common/bird-avatar";
import { PersonName } from "@/components/common/person-name";
import Link from "next/link";
import { formatTimeAgo } from "@/lib/utils";
import {
  createComment,
  loadComments,
  toggleCommentLike,
} from "@/app/(main)/feed/actions";
import { toast } from "sonner";
import { motion } from "motion/react";
import { SPRINGS, EASE_POP } from "@/components/common/motion";

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

  // The panel grows open gracefully when comments are revealed: height auto + opacity.
  // height auto is allowed here for the reveal; everything else is transform/opacity.
  return (
    <motion.div
      className="mt-3 border-t border-border pt-3"
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      transition={SPRINGS.gentle}
      style={{ overflow: "hidden" }}
    >
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading comments...</p>
      ) : (
        <>
          {/* Comments list */}
          <motion.div
            className="space-y-3"
            variants={LIST_VARIANTS}
            initial="hidden"
            animate="show"
          >
            {topLevel.map((comment) => (
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
                    className="ml-8 mt-2"
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
            ))}

            {comments.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No comments yet. Be the first!
              </p>
            )}
          </motion.div>

          {/* Comment input */}
          <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
            <div className="flex-1">
              {replyTo && (
                <div className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <Reply className="h-3 w-3" />
                  Replying to {replyTo.name}
                  <button
                    type="button"
                    onClick={() => setReplyTo(null)}
                    className="ml-1 text-foreground hover:underline"
                  >
                    Cancel
                  </button>
                </div>
              )}
              <Input
                placeholder={
                  replyTo
                    ? `Reply to ${replyTo.name}...`
                    : "Write a comment..."
                }
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                maxLength={1000}
              />
            </div>
            <Button
              type="submit"
              size="icon"
              disabled={!newComment.trim() || submitting}
              variant="leaf"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </>
      )}
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
  const [animateLike, setAnimateLike] = useState(false);

  async function handleLike() {
    const newLiked = !comment.liked;
    const newCount = newLiked
      ? comment.likeCount + 1
      : comment.likeCount - 1;
    onLikeToggle(comment.id, newLiked, newCount);
    if (newLiked) {
      setAnimateLike(true);
      setTimeout(() => setAnimateLike(false), 540);
    }

    const result = await toggleCommentLike(comment.id);
    if (result.error) {
      // Revert on error
      onLikeToggle(comment.id, comment.liked, comment.likeCount);
      toast.error(result.error);
    }
  }

  return (
    <div className="flex gap-2">
      <Link href={`/profile/${comment.author.id}`} aria-label={comment.author.name}>
        <BirdAvatar
          user={{ id: comment.author.id, name: comment.author.name }}
          size="xs"
        />
      </Link>
      <div className="flex-1">
        <div className="rounded-lg bg-muted px-3 py-2">
          <PersonName user={comment.author} className="text-xs" />
          <p className="text-sm leading-relaxed text-foreground">{comment.content}</p>
        </div>
        <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
          <span>{formatTimeAgo(new Date(comment.createdAt))}</span>
          <button onClick={onReply} className="rounded-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:opacity-70 transition-opacity duration-150">
            Reply
          </button>
          <button
            onClick={handleLike}
            aria-pressed={comment.liked}
            className={`inline-flex items-center gap-1 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
              comment.liked ? "text-heart" : "hover:text-foreground"
            }`}
          >
            {/* Heart is ALWAYS red, painted on the first frame. transition:none stops it
                tweening through the dark inherited colour, so it can never flash black.
                Only transform animates: a smooth multi-keyframe pop (tween, never a spring),
                matching the post-card heart. */}
            <motion.span
              className="inline-flex will-change-transform"
              animate={animateLike ? { scale: [1, 0.86, 1.28, 0.97, 1] } : { scale: 1 }}
              transition={
                animateLike
                  ? { duration: 0.5, ease: EASE_POP, times: [0, 0.18, 0.5, 0.74, 1] }
                  : { duration: 0 }
              }
            >
              <Heart
                size={12}
                weight={comment.liked ? "fill" : "duotone"}
                color="#E03A33"
                style={{ opacity: comment.liked ? 1 : 0.45, transition: "none" }}
              />
            </motion.span>
            {comment.likeCount > 0 && <span>{comment.likeCount}</span>}
          </button>
        </div>
      </div>
    </div>
  );
}
