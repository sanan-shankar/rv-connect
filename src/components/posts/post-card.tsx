"use client";

import { useState } from "react";
import Link from "next/link";
import { MoreHorizontal, Trash2, Flag, Pencil, ArrowRight, ShieldAlert, MapPin } from "lucide-react";
import { ChatCircle, Feather } from "@phosphor-icons/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IdentityRow } from "@/components/common/identity-row";
import { PersonName } from "@/components/common/person-name";
import { VerifiedMark } from "@/components/common/verified-mark";
import { LoveButton } from "@/components/common/love-button";
import { BookmarkButton } from "@/components/common/bookmark-button";
import { ShareButton } from "@/components/common/share-button";
import { CommentsSection } from "./comments-section";
import { ReportDialog } from "./report-dialog";
import { EditPostDialog } from "./edit-post-dialog";
import { PollDisplay } from "./poll-display";
import { ModerationDialog } from "@/components/admin/moderation-dialog";
import { formatTimeAgo, parseJsonArray, renderRichText, batchLine, letterTitle } from "@/lib/utils";
import { toggleLike, deletePost, toggleBookmark, adminRemovePost } from "@/app/(main)/feed/actions";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { SPRINGS } from "@/components/common/motion";

export interface PostData {
  id: string;
  kind?: string;
  title?: string | null;
  content: string;
  tag: string | null;
  images: string | null;
  groupId?: string | null;
  /** Null = everyone; otherwise the city short-name this post is limited to. */
  cityScope?: string | null;
  createdAt: string;
  author: {
    id: string;
    name: string;
    photoUrl?: string | null;
    birdOverride?: string | null;
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
  /** True when the signed-in viewer is an admin (site moderation, not group role). */
  viewerIsAdmin?: boolean;
  poll: {
    options: { id: string; text: string; voteCount: number }[];
    totalVotes: number;
    userVotedOptionId: string | null;
  } | null;
}

export function PostCard({
  post,
  variant = "card",
  onBookmarkChange,
}: {
  post: PostData;
  variant?: "card" | "sheet";
  /** Fired after a confirmed bookmark toggle. The Saved view uses this to drop a card once un-saved. */
  onBookmarkChange?: (bookmarked: boolean) => void;
}) {
  const [liked, setLiked] = useState(post.liked);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [bookmarked, setBookmarked] = useState(post.bookmarked ?? false);
  const [showComments, setShowComments] = useState(false);
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [expanded, setExpanded] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showModeration, setShowModeration] = useState(false);
  const [removed, setRemoved] = useState(false);

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

  async function handleModerationConfirm(note: string) {
    const result = await adminRemovePost(post.id, note || undefined);
    if (!result.error) setRemoved(true);
    return result;
  }

  async function handleBookmark() {
    const next = !bookmarked;
    setBookmarked(next);
    const result = await toggleBookmark(post.id);
    if (result.error) {
      setBookmarked(!next);
      toast.error(result.error);
      return;
    }
    onBookmarkChange?.(next);
  }

  const shareHref = `${post.groupId ? `/groups/${post.groupId}` : "/feed"}#${post.id}`;

  const wrapClass =
    variant === "sheet"
      ? "px-5 py-4 border-b border-border last:border-0"
      : "card-elevated rounded-[var(--radius)] border border-border bg-card p-4";

  // Removed optimistically the moment an admin confirms the moderation dialog,
  // rather than waiting on the revalidatePath round trip.
  if (removed) return null;

  return (
    <>
      <article id={post.id} className={wrapClass}>
        {/* Header */}
        <header className="flex items-start justify-between">
          <IdentityRow
            user={post.author}
            avatarHref={`/profile/${post.author.id}`}
            avatarLabel={post.author.name}
            name={
              <>
                <PersonName user={post.author} className="text-sm leading-none" />
                <VerifiedMark user={post.author} />
              </>
            }
            nameClassName="flex items-center gap-1"
            meta={
              <>
                <span>{batchLine(post.author)}</span>
                <span className="dotsep">·</span>
                <span>{formatTimeAgo(new Date(post.createdAt))}</span>
              </>
            }
            metaClassName="flex items-center gap-1.5 leading-none"
          />

          <DropdownMenu>
            {/* -mr-2 pulls the trigger's own padding plus the glyph's internal inset
                (MoreHorizontal's dots don't reach its viewBox edges) outward, so the DOTS
                ink lands flush on the card's right line (photo edge / share glyph) instead
                of sitting ~9px inside it. Hit area is unchanged, just shifted into the gutter. */}
            <DropdownMenuTrigger className="-mr-2 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-95">
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
                <>
                  <DropdownMenuItem onClick={() => setShowReport(true)}>
                    <Flag className="mr-2 h-4 w-4" />
                    Report
                  </DropdownMenuItem>
                  {post.viewerIsAdmin && (
                    <DropdownMenuItem onClick={() => setShowModeration(true)} variant="destructive">
                      <ShieldAlert className="mr-2 h-4 w-4" />
                      Remove (admin)
                    </DropdownMenuItem>
                  )}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {post.cityScope && (
          <span className="mt-2 inline-flex w-fit items-center gap-1 rounded-full bg-sky/10 px-2.5 py-0.5 text-[11px] font-semibold text-sky">
            <MapPin className="h-3 w-3" />
            {post.cityScope} only
          </span>
        )}

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
              {letterTitle(post.title, post.content)}
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

        {/* Actions. The negative margin pulls the buttons' padding outward so the heart GLYPH's
            left edge sits flush with the content's left line (avatar/text/photo) and the share
            GLYPH's right edge sits flush with the content's right line (photo edge / the dots
            menu). Touch targets stay full-size; only the padding overhangs into the card gutter. */}
        <div className="mt-2 -mx-2.5 flex items-center gap-1 text-muted-foreground">
          <LoveButton liked={liked} count={likeCount} onToggle={handleLike} />

          <motion.button
            onClick={() => setShowComments(!showComments)}
            aria-expanded={showComments}
            aria-controls={`comments-${post.id}`}
            aria-label={showComments ? "Hide comments" : "Show comments"}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.93 }}
            transition={SPRINGS.snappy}
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <ChatCircle size={18} weight="regular" />
            <span>{commentCount}</span>
          </motion.button>

          <BookmarkButton
            saved={bookmarked}
            onToggle={handleBookmark}
            id={post.id}
            className="ml-auto"
            label={bookmarked ? "Remove bookmark" : "Save post"}
          />

          <ShareButton href={shareHref} label="Copy link to post" />
        </div>

        {/* Comments: AnimatePresence so the section animates its collapse on close too,
            not just its open (it snapped shut before). */}
        <AnimatePresence initial={false}>
          {showComments && (
            <CommentsSection
              key="comments"
              postId={post.id}
              onCommentAdded={() => setCommentCount((c) => c + 1)}
              onCommentRemoved={() => setCommentCount((c) => Math.max(0, c - 1))}
              viewerIsAdmin={post.viewerIsAdmin}
            />
          )}
        </AnimatePresence>
      </article>

      {/* Always mounted (not gated on showReport) so ReportDialog's own
          AnimatePresence can play the close animation instead of the whole
          tree being yanked out from under it. */}
      <ReportDialog
        postId={post.id}
        open={showReport}
        onClose={() => setShowReport(false)}
      />

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

      {post.viewerIsAdmin && (
        <ModerationDialog
          open={showModeration}
          onClose={() => setShowModeration(false)}
          itemLabel={isLetter ? "letter" : "post"}
          onConfirm={handleModerationConfirm}
        />
      )}
    </>
  );
}
