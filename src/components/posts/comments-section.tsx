"use client";

import { useState, useEffect } from "react";
import { Send, Reply } from "lucide-react";
import { Heart } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/common/user-avatar";
import { formatTimeAgo } from "@/lib/utils";
import {
  createComment,
  loadComments,
  toggleCommentLike,
} from "@/app/(main)/feed/actions";
import { toast } from "sonner";

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

  if (loading) {
    return (
      <div className="mt-3 border-t border-border pt-3">
        <p className="text-sm text-muted-foreground">Loading comments...</p>
      </div>
    );
  }

  return (
    <div className="mt-3 border-t border-border pt-3">
      {/* Comments list */}
      <div className="space-y-3">
        {topLevel.map((comment) => (
          <div key={comment.id}>
            <CommentItem
              comment={comment}
              onReply={() =>
                setReplyTo({ id: comment.id, name: comment.author.name })
              }
              onLikeToggle={(id, liked, count) => {
                setComments((prev) =>
                  prev.map((c) =>
                    c.id === id ? { ...c, liked, likeCount: count } : c
                  )
                );
              }}
            />
            {/* Replies */}
            {repliesMap.get(comment.id)?.map((reply) => (
              <div key={reply.id} className="ml-8 mt-2">
                <CommentItem
                  comment={reply}
                  onReply={() =>
                    setReplyTo({ id: comment.id, name: reply.author.name })
                  }
                  onLikeToggle={(id, liked, count) => {
                    setComments((prev) =>
                      prev.map((c) =>
                        c.id === id ? { ...c, liked, likeCount: count } : c
                      )
                    );
                  }}
                />
              </div>
            ))}
          </div>
        ))}

        {comments.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No comments yet. Be the first!
          </p>
        )}
      </div>

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
              replyTo ? `Reply to ${replyTo.name}...` : "Write a comment..."
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
    </div>
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
    <div className="flex gap-2">
      <UserAvatar
        name={comment.author.name}
        avatarColor={comment.author.avatarColor}
        size="sm"
      />
      <div className="flex-1">
        <div className="rounded-lg bg-muted px-3 py-2">
          <span className="text-xs font-semibold text-foreground">
            {comment.author.name}
          </span>
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
            className={`inline-flex items-center gap-1 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-90 transition-transform duration-150 ${
              comment.liked ? "text-heart" : "hover:text-foreground"
            }`}
          >
            {/* Heart is ALWAYS red on the first frame; transition:none prevents a black flash. */}
            <Heart
              size={12}
              weight={comment.liked ? "fill" : "duotone"}
              color="#E03A33"
              style={{ opacity: comment.liked ? 1 : 0.45, transition: "none" }}
            />
            {comment.likeCount > 0 && <span>{comment.likeCount}</span>}
          </button>
        </div>
      </div>
    </div>
  );
}
