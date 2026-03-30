"use client";

import { useState } from "react";
import { MoreHorizontal, Trash2, Flag, Pencil } from "lucide-react";
import { Heart, ChatCircle } from "@phosphor-icons/react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/common/user-avatar";
import { CommentsSection } from "./comments-section";
import { ReportDialog } from "./report-dialog";
import { EditPostDialog } from "./edit-post-dialog";
import { PollDisplay } from "./poll-display";
import { formatTimeAgo, parseJsonArray, renderRichText } from "@/lib/utils";
import { toggleLike, deletePost } from "@/app/(main)/feed/actions";
import { toast } from "sonner";
import Link from "next/link";

const TAG_STYLES: Record<string, string> = {
  "campus-memory": "bg-leaf/10 text-leaf",
  "life-update": "bg-bark/10 text-bark",
  "looking-for-connections": "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  "photo": "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  "general": "bg-muted text-muted-foreground",
};

const TAG_LABELS: Record<string, string> = {
  "campus-memory": "Campus Memory",
  "life-update": "Life Update",
  "looking-for-connections": "Looking for Connections",
  "photo": "Photo",
  "general": "General",
};

export interface PostData {
  id: string;
  content: string;
  tag: string | null;
  images: string | null;
  createdAt: string;
  author: {
    id: string;
    name: string;
    avatarColor: string | null;
    batchType: string;
    batchYear: number;
  };
  commentCount: number;
  likeCount: number;
  liked: boolean;
  isOwn: boolean;
  poll: {
    options: { id: string; text: string; voteCount: number }[];
    totalVotes: number;
    userVotedOptionId: string | null;
  } | null;
}

export function PostCard({ post }: { post: PostData }) {
  const [liked, setLiked] = useState(post.liked);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [showComments, setShowComments] = useState(false);
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [expanded, setExpanded] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [animateLike, setAnimateLike] = useState(false);

  const images = parseJsonArray(post.images);
  const isLongText = post.content.length > 300;
  const displayText =
    isLongText && !expanded ? post.content.slice(0, 300) + "..." : post.content;

  async function handleLike() {
    setLiked(!liked);
    setLikeCount(liked ? likeCount - 1 : likeCount + 1);
    setAnimateLike(true);
    setTimeout(() => setAnimateLike(false), 300);

    const result = await toggleLike(post.id);
    if (result.error) {
      setLiked(liked);
      setLikeCount(likeCount);
      toast.error(result.error);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this post? This cannot be undone.")) return;
    const result = await deletePost(post.id);
    if (result.error) toast.error(result.error);
  }

  return (
    <>
      <Card id={post.id}>
        <CardContent className="pt-5">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Link href={`/profile/${post.author.id}`}>
                <UserAvatar
                  name={post.author.name}
                  avatarColor={post.author.avatarColor}
                  size="md"
                />
              </Link>
              <div>
                <Link
                  href={`/profile/${post.author.id}`}
                  className="text-sm font-semibold text-foreground hover:underline"
                >
                  {post.author.name}
                </Link>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>
                    Batch of &apos;{String(post.author.batchYear).slice(-2)}
                  </span>
                  <span>·</span>
                  <span>{formatTimeAgo(new Date(post.createdAt))}</span>
                </div>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger className="rounded-md p-1.5 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none active:scale-95 transition-transform duration-150">
                <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {post.isOwn ? (
                  <>
                    <DropdownMenuItem onClick={() => setShowEdit(true)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDelete} variant="destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </>
                ) : (
                  <DropdownMenuItem onClick={() => setShowReport(true)}>
                    <Flag className="mr-2 h-4 w-4" />
                    Report
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Tag */}
          {post.tag && (
            <div className="mt-2.5">
              <span
                className={`inline-block rounded-md px-2.5 py-0.5 text-xs font-medium ${
                  TAG_STYLES[post.tag] || TAG_STYLES.general
                }`}
              >
                {TAG_LABELS[post.tag] || post.tag}
              </span>
            </div>
          )}

          {/* Content */}
          <div className="mt-2.5">
            <p
              className="whitespace-pre-wrap text-sm leading-relaxed text-foreground"
              dangerouslySetInnerHTML={{ __html: renderRichText(displayText) }}
            />
            {isLongText && !expanded && (
              <button
                onClick={() => setExpanded(true)}
                className="mt-1 text-sm font-medium text-leaf hover:text-leaf-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded-sm active:opacity-70 transition-opacity duration-150"
              >
                Read more
              </button>
            )}
          </div>

          {/* Poll */}
          {post.poll && (
            <PollDisplay
              postId={post.id}
              options={post.poll.options}
              totalVotes={post.poll.totalVotes}
              userVotedOptionId={post.poll.userVotedOptionId}
            />
          )}

          {/* Images */}
          {images.length > 0 && (
            <div
              className={`mt-3 gap-2 ${
                images.length === 1
                  ? "grid grid-cols-1"
                  : images.length === 2
                    ? "grid grid-cols-2"
                    : "grid grid-cols-2"
              }`}
            >
              {images.map((img, i) => (
                <img
                  key={i}
                  src={img}
                  alt=""
                  loading="lazy"
                  className={`w-full rounded-lg object-cover ${
                    images.length === 3 && i === 0
                      ? "col-span-2 max-h-64"
                      : images.length === 1
                        ? "max-h-96"
                        : "max-h-48"
                  }`}
                />
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="mt-4 flex items-center gap-5 border-t border-border pt-3">
            <button
              onClick={handleLike}
              className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-sm transition-transform duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
                liked
                  ? "text-red-500"
                  : "text-muted-foreground hover:text-red-500"
              } ${animateLike ? "scale-110" : "active:scale-95"}`}
            >
              <Heart
                size={18}
                weight={liked ? "fill" : "duotone"}
              />
              <span>{likeCount}</span>
            </button>

            <button
              onClick={() => setShowComments(!showComments)}
              className="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-95 transition-transform duration-150"
            >
              <ChatCircle size={18} weight="duotone" />
              <span>{commentCount}</span>
            </button>
          </div>

          {/* Comments */}
          {showComments && (
            <CommentsSection
              postId={post.id}
              onCommentAdded={() => setCommentCount((c) => c + 1)}
            />
          )}
        </CardContent>
      </Card>

      {showReport && (
        <ReportDialog
          postId={post.id}
          open={showReport}
          onClose={() => setShowReport(false)}
        />
      )}

      {showEdit && (
        <EditPostDialog
          postId={post.id}
          initialContent={post.content}
          initialTag={post.tag}
          open={showEdit}
          onClose={() => setShowEdit(false)}
        />
      )}
    </>
  );
}
