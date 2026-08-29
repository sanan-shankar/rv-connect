"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { FIELD_FOCUS } from "@/components/ui/field-focus";
import { Reply, ArrowUp, X, ShieldAlert, Feather, MoreHorizontal, Trash2 } from "lucide-react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MENU_TRIGGER_HIT } from "@/components/ui/menu-material";
import { BirdAvatar } from "@/components/common/bird-avatar";
import { PersonName } from "@/components/common/person-name";
import { LoveButton } from "@/components/common/love-button";
import { ModerationDialog } from "@/components/admin/moderation-dialog";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import Link from "next/link";
import { formatTimeAgo } from "@/lib/utils";
import { renderRichText } from "@/lib/rich-text";
import {
  createComment,
  deleteComment,
  loadComments,
  toggleCommentLike,
  adminRemoveComment,
} from "@/app/(main)/feed/actions";
import { toast } from "sonner";
import { callAction } from "@/lib/call-action";
import { appendUnseen } from "@/lib/append-page";
import { useHeartToggle } from "./use-engagement";
import { useEmailGate } from "@/components/auth/verify-email-dialog";
import { m } from "motion/react";
import { SPRINGS, SpringPress } from "@/components/common/motion";

interface CommentAuthor {
  id: string;
  name: string;
  photoUrl: string | null;
  birdOverride?: string | null;
  accountType?: string | null;
  verifyState?: string | null;
  batchType: string | null;
  batchYear: number | null;
}

interface CommentData {
  id: string;
  content: string;
  parentId: string | null;
  createdAt: string;
  likeCount: number;
  liked: boolean;
  /** A deleted (or admin-hidden) comment kept only as the anchor for its replies. */
  deleted?: boolean;
  /** The viewer wrote this one, so they may delete it. */
  isOwn?: boolean;
  author: CommentAuthor | null;
}

/* The thread loads in pages of top-level comments: a short first page so the
   panel opens light, then bigger pages as the reader actually scrolls (the
   sentinel below the list triggers the next fetch just before they reach the
   end). Replies always arrive with their parent, so a page boundary can never
   split a thread. */
const FIRST_PAGE = 5;
const NEXT_PAGE = 10;

// Renders the comment thread for a post. Feed/group cards toggle it open as an accordion
// (one coordinated open/close timeline); Letters pass `alwaysOpen` to render it expanded.
export function CommentsSection({
  postId,
  onCommentAdded,
  onCommentRemoved,
  alwaysOpen = false,
  viewerIsAdmin = false,
  expectedCount,
}: {
  postId: string;
  onCommentAdded: () => void;
  /** Fired after a removal is confirmed, so the post's visible comment count drops too. */
  onCommentRemoved?: () => void;
  /** Letters render the thread permanently expanded, so they skip the open/close accordion. */
  alwaysOpen?: boolean;
  /** Site admin viewing this thread: shows the "Remove" moderation control on every comment. */
  viewerIsAdmin?: boolean;
  /**
   * The comment count the card already knows, BEFORE the thread loads. It sizes
   * the loading state: zero renders the empty line immediately (a two-row
   * skeleton springing open and then shrinking onto a one-line "No comments
   * yet" was the panel's overshoot bug), and one renders one skeleton row.
   */
  expectedCount?: number;
}) {
  const [comments, setComments] = useState<CommentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const loadingMoreRef = useRef(false);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(
    null
  );
  const [submitting, setSubmitting] = useState(false);
  /* A ref as well as the state, because `disabled` only takes effect on the
     next render: an Enter keydown plus a click in the same frame, or a key
     repeat racing React, both reached the action and wrote the comment twice
     with two notifications (audit M35). The ref is set synchronously, so the
     second call in a frame sees it. Same shape as loadingMoreRef below. */
  const submittingRef = useRef(false);
  // The comment currently targeted by the admin moderation dialog, if any.
  const [moderatingId, setModeratingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  // `createComment` refuses an unconfirmed address server-side; this turns that
  // into a dialog with the fix in it.
  const emailGate = useEmailGate();
  // Mandatory on a list that adds and removes rows: pages appending, a
  // deleted comment leaving, all close their gaps on the same animation.
  const [listRef] = useAutoAnimate();

  // The panel animates to (and then tracks) the real height of its content. A single
  // ResizeObserver is the ONE clock: the initial open, the comments arriving from the
  // network, and a freshly posted reply all grow the panel on the same height spring
  // instead of a second, jumpy re-open. (Letters skip this: they are always expanded.)
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(0);
  const sentinelRef = useRef<HTMLDivElement>(null);

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

  /** Merge a page into the thread, deduping against rows already present
   *  (the reader's own fresh comment may reappear in a later page). */
  const mergeComments = useCallback((incoming: CommentData[]) => {
    setComments((prev) => appendUnseen(prev, incoming));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // callAction: a rejected first page (deploy skew, dropped network,
      // expired session) used to leave `loading` true forever, so the panel
      // stayed on its skeleton rows with no way to recover (audit B-042).
      const data = await callAction(() => loadComments(postId, { take: FIRST_PAGE }));
      if (cancelled) return;
      if ("error" in data) {
        toast.error(data.error);
        setLoading(false);
        return;
      }
      setComments(data.comments);
      setNextCursor(data.nextCursor);
      setHasMore(data.hasMore);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [postId]);

  // Infinite scroll: the sentinel sits under the last loaded comment, and the
  // page (not the panel -- the panel clips but does not scroll) carries it
  // into view. rootMargin starts the fetch a couple of rows early, so in the
  // common case the next page is in place before the reader arrives and the
  // list just grows -- no spinner moment, no jump.
  useEffect(() => {
    if (!hasMore || loading) return;
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      async (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        if (loadingMoreRef.current) return;
        loadingMoreRef.current = true;
        try {
          const data = await callAction(() =>
            loadComments(postId, { cursor: nextCursor, take: NEXT_PAGE })
          );
          if ("error" in data) {
            toast.error(data.error);
            return;
          }
          mergeComments(data.comments);
          setNextCursor(data.nextCursor);
          setHasMore(data.hasMore);
        } finally {
          // finally, not a trailing statement: a rejected page used to leave
          // this ref stuck true, so the sentinel could never fire again and
          // the thread just stopped growing (audit B-042).
          loadingMoreRef.current = false;
        }
      },
      { rootMargin: "160px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, loading, nextCursor, postId, mergeComments]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim()) return;
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);

    const formData = new FormData();
    formData.set("content", newComment);
    formData.set("postId", postId);
    if (replyTo) formData.set("parentId", replyTo.id);

    try {
      const result = await callAction(() => createComment(formData));
      if (result.error) {
        // An unconfirmed address gets the dialog, which explains and offers to
        // send the link again; everything else is still a toast.
        if (!emailGate.handled(result.error)) toast.error(result.error);
      } else {
        // The action returns the finished comment, so it slots straight into
        // the loaded thread. No refetch: with the thread paginated, a refetch
        // would throw away every page the reader has scrolled in.
        if (result.comment) mergeComments([result.comment]);
        setNewComment("");
        setReplyTo(null);
        onCommentAdded();
      }
    } finally {
      // finally, not a trailing statement: a rejected call used to leave the
      // composer's submit button disabled for the rest of the session (audit B-042).
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  function handleLikeToggle(id: string, liked: boolean, count: number) {
    setComments((prev) =>
      prev.map((c) => (c.id === id ? { ...c, liked, likeCount: count } : c))
    );
  }

  /** Take a comment out of the visible thread the same way the server does:
   *  drop it outright, unless replies still hang off it, in which case it
   *  stays as a "[deleted]" stub so the replies keep their anchor. */
  function removeLocally(id: string) {
    setComments((prev) => {
      const hasReplies = prev.some((c) => c.parentId === id && !c.deleted);
      const next = hasReplies
        ? prev.map((c) =>
            c.id === id
              ? { ...c, deleted: true, content: "", author: null, isOwn: false, likeCount: 0, liked: false }
              : c
          )
        : prev.filter((c) => c.id !== id);
      // A stub exists only to anchor replies: if this removal took the last
      // reply out from under one, the stub goes with it (exactly what the
      // server would return on the next load).
      return next.filter(
        (c) =>
          !c.deleted ||
          next.some((r) => r.parentId === c.id && !r.deleted)
      );
    });
    onCommentRemoved?.();
  }

  async function handleDelete(id: string) {
    const result = await callAction(() => deleteComment(id));
    if (result.error) return result;
    removeLocally(id);
  }

  async function handleModerationConfirm(note: string) {
    if (!moderatingId) return { error: "Nothing selected" };
    const result = await callAction(() => adminRemoveComment(moderatingId, note || undefined));
    if (!result.error) {
      removeLocally(moderatingId);
    }
    return result;
  }

  // Organise: top-level comments first, replies grouped under their parent.
  // Sorted at render (oldest first, the load order), because a fresh own
  // comment is appended to state whenever it was written.
  const byAge = (a: CommentData, b: CommentData) =>
    a.createdAt === b.createdAt
      ? a.id.localeCompare(b.id)
      : a.createdAt.localeCompare(b.createdAt);
  const topLevel = comments.filter((c) => !c.parentId).sort(byAge);
  const repliesMap = new Map<string, CommentData[]>();
  for (const c of comments) {
    if (c.parentId) {
      const existing = repliesMap.get(c.parentId) || [];
      existing.push(c);
      repliesMap.set(c.parentId, existing);
    }
  }
  for (const list of repliesMap.values()) list.sort(byAge);

  // The loading rows mirror what is actually coming: none for a post the card
  // already knows has no comments, one for one, two for anything more.
  const skeletonRows = Math.min(expectedCount ?? 2, 2);

  // The measured content: divider, the thread, and the composer. List sits on top, the
  // input always sits on the bottom, so the reveal order is the same every single time.
  const body = (
    <>
    {/* Outside `contentRef` on purpose: that element's height is the accordion's
        one clock (see the ResizeObserver above), and nothing that is not the
        comment list belongs inside the thing being measured. The dialog renders
        nothing inline anyway, since it portals to the body when open. */}
    {emailGate.dialog}
    <div ref={contentRef} className="flex flex-col gap-4 px-0.5 pb-1 pt-3">
      <div className="border-t border-border/70" />

      {loading && skeletonRows > 0 ? (
        <div className="flex flex-col gap-4" aria-hidden>
          {Array.from({ length: skeletonRows }, (_, i) => (
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
        <m.ul
          ref={listRef}
          className="flex flex-col gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          {topLevel.map((comment) => {
            const replies = repliesMap.get(comment.id);
            return (
              <li key={comment.id}>
                {comment.deleted ? (
                  <DeletedComment />
                ) : (
                  <CommentItem
                    comment={comment}
                    onReply={() =>
                      setReplyTo({ id: comment.id, name: comment.author!.name })
                    }
                    onLikeToggle={handleLikeToggle}
                    viewerIsAdmin={viewerIsAdmin}
                    onModerate={() => setModeratingId(comment.id)}
                    onDelete={() => setDeletingId(comment.id)}
                  />
                )}
                {replies && replies.length > 0 && (
                  <ul className="mt-4 flex flex-col gap-4 border-l border-border/70 pl-4 [margin-left:13px]">
                    {replies.map((reply) => (
                      <li key={reply.id}>
                        <CommentItem
                          comment={reply}
                          onReply={() =>
                            setReplyTo({
                              /* The TAPPED reply, always. The server reparents
                                 to the root for storage, so the thread shape is
                                 the same either way -- but it also notifies
                                 whoever this id belongs to, and sending the
                                 root's id told the wrong person while the
                                 composer said "Replying to <them>" about this
                                 one (audit C-016). It also keeps working under
                                 a deleted parent, whose own id would be
                                 refused. */
                              id: reply.id,
                              name: reply.author!.name,
                            })
                          }
                          onLikeToggle={handleLikeToggle}
                          viewerIsAdmin={viewerIsAdmin}
                          onModerate={() => setModeratingId(reply.id)}
                          onDelete={() => setDeletingId(reply.id)}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </m.ul>
      )}

      {/* The infinite-scroll sentinel. Rendered only while there is more to
          load; when the last page lands it unmounts and the thread simply
          ends. Inside contentRef, so its removal shrinks the panel on the
          same height spring as everything else. */}
      {hasMore && !loading && (
        <div ref={sentinelRef} className="flex flex-col gap-4" aria-hidden>
          <div className="flex items-start gap-2.5">
            <div className="skeleton-warm size-7 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2 pt-1">
              <div className="skeleton-warm h-3 w-28 rounded-full" />
              <div className="skeleton-warm h-3 w-3/5 rounded-full" />
            </div>
          </div>
        </div>
      )}

      {/* Composer. Always mounted at the bottom, so it appears together with the thread. */}
      <form onSubmit={handleSubmit}>
        {replyTo && (
          <m.div
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
              /* state-layer, not the hand-rolled foreground/10 this used to
                 carry: same idea, one class, and it brings a press tint with it.
                 The size-4 target is small, so hover:text-foreground stays as the
                 louder half of the signal. */
              className="state-layer -mr-0.5 ml-0.5 inline-grid size-4 place-items-center rounded-full text-muted-foreground hover:text-foreground active:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <X className="h-3 w-3" />
            </button>
          </m.div>
        )}
        <div className="flex items-center gap-2">
          {/* Inset focus ring (inline, so the panel's overflow-hidden during the open/close
              animation can never clip it into a stray shape). */}
          <input
            type="text"
            className={`h-9 flex-1 rounded-full border border-border bg-card px-4 text-sm text-foreground outline-none placeholder:text-muted-foreground ${FIELD_FOCUS}`}
            placeholder={
              replyTo ? `Reply to ${replyTo.name}...` : "Write a comment..."
            }
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            maxLength={1000}
          />
          <SpringPress
            // Same 1.08 as CANOPY_FILL in ui/button.tsx. Hand-rolled rather than a
            // <Button>, and it had no hover at all before: SpringPress only
            // contributes a tap scale.
            className="inline-grid size-9 shrink-0 place-items-center rounded-full bg-canopy text-white shadow-[0_5px_13px_-12px_var(--color-canopy)] transition-[filter] duration-150 hover:brightness-[1.08] disabled:opacity-40 disabled:shadow-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-canopy"
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

      <ConfirmDialog
        open={deletingId !== null}
        onClose={() => setDeletingId(null)}
        title="Delete comment"
        description="This cannot be undone."
        actionLabel="Delete"
        onConfirm={() => handleDelete(deletingId!)}
      />
    </div>
    </>
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
    <m.div
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
    </m.div>
  );
}

/**
 * The stub a deleted comment leaves behind, kept only because replies still
 * hang off it. Everything personal is gone (the server never sends author or
 * content for one of these); what remains is quiet, unclickable structure: a
 * mist circle with a feather where the bird sat, and a plain statement of
 * what happened. No Reply, no heart, no menu.
 */
function DeletedComment() {
  return (
    <div className="flex items-start gap-2.5">
      <span
        className="grid size-[34px] shrink-0 place-items-center rounded-full bg-mist text-muted-foreground/60"
        aria-hidden
      >
        <Feather className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1 pt-1.5">
        <p className="text-[14px] leading-relaxed text-muted-foreground">
          <span className="mr-1.5 font-semibold">[deleted]</span>
          <span className="italic">This comment was deleted.</span>
        </p>
      </div>
    </div>
  );
}

function CommentItem({
  comment,
  onReply,
  onLikeToggle,
  viewerIsAdmin = false,
  onModerate,
  onDelete,
}: {
  comment: CommentData;
  onReply: () => void;
  onLikeToggle: (id: string, liked: boolean, count: number) => void;
  /** Site admin viewing this thread: shows the "Remove" moderation control. */
  viewerIsAdmin?: boolean;
  onModerate?: () => void;
  /** Own comments only: the author deleting their own words. */
  onDelete?: () => void;
}) {
  const author = comment.author!;

  const fireLike = useHeartToggle(() => toggleCommentLike(comment.id));

  function handleLike() {
    // The row belongs to the thread above, so the commit writes there rather
    // than to local state; the choreography is the feed card's, shared.
    void fireLike({ liked: comment.liked, count: comment.likeCount }, ({ liked, count }) =>
      onLikeToggle(comment.id, liked, count)
    );
  }

  return (
    <div className="group flex items-start gap-2.5">
      {/* No top margin: the avatar (34px) pairs visually with the name line right beside it,
          the same way it always has. Widening the meta line's gap below (see -mt-0.5 below)
          grew the two-line cluster to ~41px measured top-of-name to bottom-of-meta, a few px
          taller than the avatar, but a pixel probe on the rendered row showed the avatar
          sitting only ~3px above the cluster's dead centre, not visibly off; re-check with a
          screenshot if the meta line's gap changes again. */}
      <Link
        href={`/profile/${author.id}`}
        aria-label={author.name}
        className="shrink-0 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <BirdAvatar
          user={{
            id: author.id,
            name: author.name,
            photoUrl: author.photoUrl,
            birdOverride: author.birdOverride,
          }}
          size={34}
        />
      </Link>
      <div className="min-w-0 flex-1">
        {/* Clean inline comment (derived from the delight demo): the author's name sits bold and
            in line, the text flows straight after it. No boxy bubble; it wraps for long comments. */}
        <p className="text-[14px] leading-relaxed text-foreground [overflow-wrap:anywhere]">
          <PersonName user={author} className="mr-1.5 align-baseline" />
          {/* Same renderer as posts and letters (escape-then-emphasise), so
              **bold** typed in the comment box reads as bold here, not as
              asterisks. The input stays a plain single-line field; markdown
              is the phone-friendly way in. */}
          <span dangerouslySetInnerHTML={{ __html: renderRichText(comment.content) }} />
        </p>
        {/* Measured (not guessed) with a pixel probe on the rendered page: this cluster's own
            leading-relaxed bottom half-leading plus a raw Tailwind margin only ever gets you
            close in theory, so each of the last three tries was checked against the actual
            ink-to-ink whitespace, not the CSS box math. -mt-1.5 (rejected, "cramped") measured
            ~3.5px of true gap; the previous -mt-2.5 (rejected, "too close") measured ~0px, the
            two lines' ink never fully separating back to the background colour; the older mt-1
            (rejected, "too far") measured ~13.5px, reading as two unrelated rows. "New in the
            directory" (feed-rail.tsx's IDENTITY_STACK_GAP_PX) sits at ~5.5px of true gap between
            a plain name and a plain batch line. This meta line carries a click target (Reply,
            plus the like button), so it earns a little more room than that static rail line to
            keep the interactive row from feeling cramped against the name above it, without
            reopening the "two rows" complaint: -mt-0.5 measures ~7.5px, roughly the rail's gap
            plus a third again. h-5 still matches LoveButton's own resting height (see the
            [&>span] override below) so the row never needs to fight or clip its child. */}
        <div className="-mt-0.5 flex h-5 items-center gap-3 text-xs text-muted-foreground">
          <span>{formatTimeAgo(new Date(comment.createdAt))}</span>
          <button
            onClick={onReply}
            className="rounded-sm font-medium transition-opacity duration-150 hover:text-foreground active:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Reply
          </button>
          <LoveButton
            liked={comment.liked}
            count={comment.likeCount}
            onToggle={handleLike}
            showCount={comment.likeCount > 0}
            label="Like this comment"
            size="sm"
            /* Same trick as ever, retuned for the sm heart: LoveButton's count
               `<span>` is plain text and would inherit a 16px line box (text-xs)
               while the icon span sizes to the 14px glyph. Pinning both direct
               children to a 14px line box keeps the button the same height in
               both states, so a first like can never grow the row. */
            className="-ml-1 font-medium [&>span]:leading-[14px]"
          />
          {comment.isOwn && (
            <DropdownMenu>
              {/* The way every platform hides this: a quiet "..." at the row's
                  end, invisible until the pointer is over the comment (or the
                  trigger itself has focus / its menu is open), always present
                  on touch, where there is no hover to reveal it (owner,
                  2026-08-13: "would Instagram do it like that?"). Same menu
                  material and destructive item as the post card's own menu. */}
              {/* p-1.5, not the old p-1: 14px glyph + 8px padding was a 22px
                  target, under even WCAG's 24px fine-pointer floor. 28px now,
                  and MENU_TRIGGER_HIT carries it to 44px for thumbs. */}
              <DropdownMenuTrigger className={`${MENU_TRIGGER_HIT} state-layer ml-auto rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity duration-150 hover:text-foreground group-hover:opacity-100 focus-visible:opacity-100 data-popup-open:opacity-100 [@media(pointer:coarse)]:opacity-100 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring`}>
                <MoreHorizontal className="h-3.5 w-3.5" />
                <span className="sr-only">Comment options</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onDelete} variant="destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {viewerIsAdmin && !comment.isOwn && (
            <button
              onClick={onModerate}
              aria-label="Remove comment (admin)"
              title="Remove comment (admin)"
              className="ml-auto rounded-sm font-medium text-muted-foreground/70 transition-opacity duration-150 hover:text-destructive active:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <ShieldAlert className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
