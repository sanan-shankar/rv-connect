"use client";

import { useState } from "react";
import Link from "next/link";
import { MoreHorizontal, Trash2, Flag, Pencil, ArrowRight } from "lucide-react";
import { Heart, ChatCircle, ShareFat, BookmarkSimple, Feather, Check } from "@phosphor-icons/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BirdAvatar } from "@/components/common/bird-avatar";
import { PersonName } from "@/components/common/person-name";
import { VerifiedMark } from "@/components/common/verified-mark";
import { CommentsSection } from "./comments-section";
import { ReportDialog } from "./report-dialog";
import { EditPostDialog } from "./edit-post-dialog";
import { PollDisplay } from "./poll-display";
import { formatTimeAgo, parseJsonArray, renderRichText, batchLine } from "@/lib/utils";
import { toggleLike, deletePost, toggleBookmark } from "@/app/(main)/feed/actions";
import { toast } from "sonner";
import { motion } from "motion/react";
import { SPRINGS, EASE_POP } from "@/components/common/motion";

export interface PostData {
  id: string;
  kind?: string;
  title?: string | null;
  content: string;
  tag: string | null;
  images: string | null;
  groupId?: string | null;
  createdAt: string;
  author: {
    id: string;
    name: string;
    photoUrl?: string | null;
    avatarColor: string | null;
    accountType?: string | null;
    verifyState?: string | null;
    batchType: string | null;
    batchYear: number | null;
  };
  commentCount: number;
  likeCount: number;
  liked: boolean;
  bookmarked?: boolean;
  isOwn: boolean;
  poll: {
    options: { id: string; text: string; voteCount: number }[];
    totalVotes: number;
    userVotedOptionId: string | null;
  } | null;
}

// Tiny flecks that drift up when a heart is liked, in the valley palette.
const LEAF_FLECKS = [
  { x: -13, y: -15, c: "#1F8A4C" },
  { x: 12, y: -17, c: "#C2622F" },
  { x: 1, y: -21, c: "#34C759" },
];

export function PostCard({
  post,
  variant = "card",
}: {
  post: PostData;
  variant?: "card" | "sheet";
}) {
  const [liked, setLiked] = useState(post.liked);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [bookmarked, setBookmarked] = useState(post.bookmarked ?? false);
  const [showComments, setShowComments] = useState(false);
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [expanded, setExpanded] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [animateLike, setAnimateLike] = useState(false);
  const [animateBookmark, setAnimateBookmark] = useState(false);
  const [shared, setShared] = useState(false);

  const images = parseJsonArray(post.images);
  const isLetter = post.kind === "letter";
  const isLongText = post.content.length > 300;
  const displayText =
    isLongText && !expanded ? post.content.slice(0, 300) + "..." : post.content;

  // Letter preview: plain-text excerpt + estimated read time.
  const letterPlain = post.content
    .replace(/[*_#>`~]|\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  const letterExcerpt =
    letterPlain.length > 200 ? letterPlain.slice(0, 200).trimEnd() + "..." : letterPlain;
  const readMinutes = Math.max(
    1,
    Math.round(post.content.trim().split(/\s+/).filter(Boolean).length / 200)
  );

  async function handleLike() {
    const next = !liked;
    setLiked(next);
    setLikeCount(next ? likeCount + 1 : likeCount - 1);
    if (next) {
      setAnimateLike(true);
      setTimeout(() => setAnimateLike(false), 540);
    }
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

  async function handleBookmark() {
    const next = !bookmarked;
    setBookmarked(next);
    if (next) {
      setAnimateBookmark(true);
      setTimeout(() => setAnimateBookmark(false), 480);
    }
    const result = await toggleBookmark(post.id);
    if (result.error) {
      setBookmarked(!next);
      toast.error(result.error);
    }
  }

  async function handleShare() {
    const path = post.groupId ? `/groups/${post.groupId}` : "/feed";
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}${path}#${post.id}`
      );
      setShared(true);
      setTimeout(() => setShared(false), 1400);
      toast.success("Link copied");
    } catch {
      toast.error("Could not copy the link");
    }
  }

  const wrapClass =
    variant === "sheet"
      ? "px-5 py-4 border-b border-border last:border-0"
      : "card-elevated rounded-[var(--radius)] border border-border bg-card p-4";

  return (
    <>
      <article id={post.id} className={wrapClass}>
        {/* Header */}
        <header className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/profile/${post.author.id}`} aria-label={post.author.name}>
              <BirdAvatar
                user={{
                  id: post.author.id,
                  name: post.author.name,
                  photoUrl: post.author.photoUrl,
                  avatarColor: post.author.avatarColor,
                }}
                size="sm"
              />
            </Link>
            <div className="leading-tight">
              <div className="flex items-center gap-1">
                <PersonName user={post.author} className="text-sm" />
                <VerifiedMark user={post.author} />
              </div>
              <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="text-[10.5px] font-semibold uppercase tracking-[0.07em]">
                  {batchLine(post.author)}
                </span>
                <span className="dotsep">·</span>
                <span>{formatTimeAgo(new Date(post.createdAt))}</span>
              </div>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-95">
              <MoreHorizontal className="h-4 w-4" />
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
        </header>

        {isLetter ? (
          /* Compact letter card: title + excerpt + read time, opens the reading view */
          <Link
            href={`/letters/${post.id}`}
            className="mt-3 block rounded-xl border border-border bg-paper/60 p-4 transition-colors hover:border-leaf/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.13em] text-cinnamon">
              <Feather size={13} weight="fill" />
              Letter
              <span className="text-muted-foreground/70">· {readMinutes} min read</span>
            </div>
            <h3 className="mt-2 font-heading text-xl font-bold leading-snug tracking-[-0.01em] text-foreground">
              {post.title || "Untitled letter"}
            </h3>
            {letterExcerpt && (
              <p className="mt-1.5 line-clamp-2 text-[14px] leading-relaxed text-muted-foreground">
                {letterExcerpt}
              </p>
            )}
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-leaf">
              Read this letter
              <ArrowRight size={15} />
            </span>
          </Link>
        ) : (
          <>
            {/* Content */}
            <div className="mt-2.5">
              <p
                className="whitespace-pre-wrap text-[15px] leading-[1.7] text-foreground"
                dangerouslySetInnerHTML={{ __html: renderRichText(displayText) }}
              />
              {isLongText && !expanded && (
                <button
                  onClick={() => setExpanded(true)}
                  className="mt-1 rounded-sm text-sm font-medium text-leaf hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
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
                  images.length === 1 ? "grid grid-cols-1" : "grid grid-cols-2"
                }`}
              >
                {images.map((img, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={i}
                    src={img}
                    alt=""
                    loading="lazy"
                    className={`w-full rounded-xl border border-border object-cover ${
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
          </>
        )}

        {/* Actions */}
        <div className="mt-2 -ml-3.5 flex items-center gap-1 text-muted-foreground">
          <button
            onClick={handleLike}
            aria-pressed={liked}
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-95 ${
              liked ? "text-heart" : "hover:text-foreground"
            }`}
          >
            <span className="relative inline-flex">
              {/* Heart is ALWAYS red, painted on the first frame. transition:none stops it
                  tweening through the dark inherited colour, so it can never flash black.
                  Only transform animates: a smooth multi-keyframe pop (tween, never a spring). */}
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
                  size={18}
                  weight={liked ? "fill" : "duotone"}
                  color="#E03A33"
                  style={{ opacity: liked ? 1 : 0.45, transition: "none" }}
                />
              </motion.span>
              {animateLike && (
                <span aria-hidden className="pointer-events-none absolute left-1/2 top-1/2">
                  {LEAF_FLECKS.map((f, i) => (
                    <motion.span
                      key={i}
                      className="absolute block rounded-full"
                      style={{ width: 4, height: 4, marginLeft: -2, marginTop: -2, background: f.c }}
                      initial={{ opacity: 0, x: 0, y: 0, scale: 0.4 }}
                      animate={{ opacity: [0, 1, 0], x: f.x, y: f.y, scale: 1 }}
                      transition={{ duration: 0.52, ease: EASE_POP }}
                    />
                  ))}
                </span>
              )}
            </span>
            <span>{likeCount}</span>
          </button>

          <button
            onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <ChatCircle size={18} weight="regular" />
            <span>{commentCount}</span>
          </button>

          <button
            onClick={handleBookmark}
            aria-pressed={bookmarked}
            aria-label={bookmarked ? "Remove bookmark" : "Save post"}
            className={`ml-auto flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
              bookmarked ? "text-cinnamon" : "hover:text-foreground"
            }`}
          >
            <motion.span
              className="relative inline-flex will-change-transform"
              animate={animateBookmark ? { scale: [1, 0.82, 1.22, 1] } : { scale: 1 }}
              transition={
                animateBookmark
                  ? { duration: 0.46, ease: EASE_POP, times: [0, 0.22, 0.55, 1] }
                  : { duration: 0 }
              }
            >
              {/* Resting mark: even outline, cinnamon once saved (inherits the button colour). */}
              <BookmarkSimple size={18} weight={bookmarked ? "fill" : "regular"} />
              {/* Save sweep: a clipped cinnamon fill floods up from the foot the moment you save. */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 inline-flex origin-bottom overflow-hidden"
                style={{
                  transform: animateBookmark ? "scaleY(1)" : "scaleY(0)",
                  transition: "transform 380ms cubic-bezier(.22,.61,.36,1)",
                }}
              >
                <BookmarkSimple size={18} weight="fill" color="#C2622F" />
              </span>
            </motion.span>
          </button>

          <button
            onClick={handleShare}
            aria-label="Copy link to post"
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <span className="relative inline-flex h-[18px] w-[18px] items-center justify-center">
              <motion.span
                className="absolute inline-flex"
                animate={{ opacity: shared ? 0 : 1, scale: shared ? 0.6 : 1 }}
                transition={SPRINGS.snappy}
              >
                <ShareFat size={18} weight="regular" />
              </motion.span>
              <motion.span
                className="absolute inline-flex text-leaf"
                animate={{ opacity: shared ? 1 : 0, scale: shared ? 1 : 0.6 }}
                transition={SPRINGS.snappy}
              >
                <Check size={18} weight="bold" />
              </motion.span>
            </span>
          </button>
        </div>

        {/* Comments */}
        {showComments && (
          <CommentsSection
            postId={post.id}
            onCommentAdded={() => setCommentCount((c) => c + 1)}
          />
        )}
      </article>

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
          kind={post.kind}
          initialContent={post.content}
          initialTitle={post.title}
          initialTag={post.tag}
          open={showEdit}
          onClose={() => setShowEdit(false)}
        />
      )}
    </>
  );
}
