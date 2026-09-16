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
import { cn, formatTimeAgo } from "@/lib/utils";
import { renderRichText } from "@/lib/rich-text";
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

/**
 * THE FIVE THINGS A THREAD CAN DO, handed in rather than imported.
 *
 * This file used to reach straight into the feed's actions, which was fine
 * while a comment could only hang off a post. Build phase 9 gave a Catch-up
 * answer its own thread (spec 3.7), and his ask was to reuse this surface
 * rather than draw a second one: "I feel like the comment section can be done
 * the same way that we do it in feed ... I think we can just copy that comment
 * section" (N1).
 *
 * Taking the five as a prop is the smallest change that makes it serve two
 * owners. Nothing about WHO MAY read or write moved out here: each bundle's
 * actions carry their own gate, so a caller cannot widen access by choosing a
 * different one. Letters already reused this file unchanged, which is what
 * proved the seam was in the right place.
 *
 * The two bundles are `FEED_COMMENT_ACTIONS` and `ENTRY_COMMENT_ACTIONS`; the
 * shapes differ only in the id they take first, which is why `targetId` below
 * is no longer called `postId`.
 */
export type CommentActions = {
  load: (
    targetId: string,
    opts?: { cursor?: string | null; take?: number }
  ) => Promise<
    | { comments: CommentData[]; nextCursor: string | null; hasMore: boolean }
    | { error: string }
  >;
  create: (
    targetId: string,
    content: string,
    parentId?: string | null
  ) => Promise<{ error?: string; success?: boolean; comment?: CommentData }>;
  remove: (commentId: string) => Promise<{ error?: string; success?: boolean }>;
  toggleLike: (commentId: string) => Promise<{ error?: string; liked?: boolean }>;
  adminRemove: (
    commentId: string,
    note?: string
  ) => Promise<{ error?: string; success?: boolean }>;
};

/* THE PANEL'S ONE TIMING, used by the open and the close alike, so there are
 * no second numbers to drift apart. The close is literally the open played
 * backwards.
 *
 * WHY IT DOES NOT EASE IN, since the owner asked and left the call here. This
 * panel answers a click that has already happened, and an ease-in spends its
 * first hundred milliseconds barely moving -- which reads as lag on a control
 * you just pressed, not as grace. The rule is already written down in
 * motion.tsx: EASE_OUT_SMOOTH exists because starting at full speed "is right
 * for a small panel answering a click", and EASE_IN_OUT_SCENE is explicitly
 * scoped to viewport-sized travel over ~0.9s, where the eye needs to be given
 * time to follow something away. A comment thread is the first case.
 *
 * `gentle` does start from rest, so it is not a hard cut; it ramps, carries and
 * settles with a long tail, which is what makes it read unhurried at ~300ms
 * where a 380ms ease-out read as brisk. That difference is the curve, not the
 * number -- an ease-out's quickest frames are its first.
 *
 * The history, because two of these numbers were the owner's corrections: 550ms
 * on a tween was "an abrupt snap" (it was, but because the close began with a
 * 9px layout jump on its first frame, not because of the duration -- fixed
 * 2026-09-16), and 380ms on EASE_OUT_SMOOTH was "too fast".
 */
const PANEL_MOTION = {
  height: SPRINGS.gentle,
  /* Shorter than the height on purpose: content should be legible before the
     panel has finished making room for it, and gone before the gap shuts. */
  opacity: { duration: 0.22, ease: "easeOut" },
} as const;

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
  targetId,
  actions,
  onCommentAdded,
  onCommentRemoved,
  alwaysOpen = false,
  viewerIsAdmin = false,
  expectedCount,
}: {
  /** The post, or the Catch-up answer, this thread hangs off. */
  targetId: string;
  /** Which of the two owners this is; see CommentActions above. */
  actions: CommentActions;
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

  /* The comment you just wrote, for about as long as it takes to notice it.
     Posting used to be silent: your words were merged into the thread and
     that was that, indistinguishable from a row that had been there for a
     year. This is the one moment in the surface that is unambiguously YOURS,
     and it was the only one with nothing on it. */
  const [justPosted, setJustPosted] = useState<string | null>(null);
  /* A counter, not a boolean: two comments in a row have to replay the arrow,
     and a boolean that is already true cannot. It is only ever the `key` on
     the glyph, so incrementing it remounts one 16px icon. */
  const [sent, setSent] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /* The grow. Height is reset to auto before it is read, because scrollHeight
     of an element that is already tall reports the tall value and the box can
     then only ever get bigger -- deleting a line would leave the hole behind.
     Run as a layout effect so the browser never paints the intermediate
     height. */
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [newComment]);

  /**
   * Pressing Reply used to do one thing: set `replyTo`, which drew a chip
   * above the composer. Measured on a real thread, that chip was 337px BELOW
   * the Reply the reader had just pressed, off the bottom of a 900px window,
   * and nothing focused or scrolled. So the control looked dead: you pressed
   * it, the page did not move, no cursor appeared, and the only feedback was
   * somewhere you could not see. On a phone it is worse, because the thread is
   * taller than the screen by more.
   *
   * Now the box comes to you: it renders under the comment you pressed Reply
   * on, and takes focus. Nothing scrolls, because nothing needs to.
   */
  const wantsComposer = useRef(false);

  function startReply(target: { id: string; name: string }) {
    wantsComposer.current = true;
    setReplyTo(target);
  }

  /* The move itself runs in an effect rather than in the handler, and that is
     not tidiness. Setting `replyTo` renders the "Replying to ..." chip ABOVE
     the composer, so a scroll measured in the handler is measured against a
     box that is about to be pushed down by the chip's 36px. Measured: it
     landed the field at 937px in a 900px window, which is to say just off the
     bottom of the screen, having scrolled 3829px to get there. By the effect,
     the chip is committed and the number is true.

     The scroll is skipped when the composer is already in view, so replying to
     the last comment in a short thread does not lurch the page for nothing. */
  /* The glow is a moment, not a state: it recedes on its own and the row goes
     back to being an ordinary comment. 1.8s is long enough to find it if you
     were looking at the button rather than the thread, short enough that it
     is gone before it becomes decoration. */
  useEffect(() => {
    if (!justPosted) return;
    const t = setTimeout(() => setJustPosted(null), 1800);
    return () => clearTimeout(t);
  }, [justPosted]);

  /* Focus after the commit, never in the handler: setting `replyTo` is what
     MOVES the composer, so a handler holding the old element would focus a
     node React is about to throw away.

     There is no scroll here, and that is the finding rather than an omission.
     The obvious fix for a dead-looking Reply is to scroll the page down to the
     composer, and it cannot be made to work: the scroll drags the
     infinite-scroll sentinel through the viewport, which fetches the next
     page, which grows the thread under the box you were heading for. Traced
     frame by frame on a real thread -- the field was down to 570px and still
     closing, then the panel went 472px to 943px in three frames and it was
     flung back to 937 in a 900px window. Chasing it does not help either,
     because every page that lands moves the target again. It is a treadmill,
     not a race. So the box comes to the reader instead; see `composer`. */
  useEffect(() => {
    if (!wantsComposer.current || !replyTo) return;
    wantsComposer.current = false;
    textareaRef.current?.focus({ preventScroll: true });
  }, [replyTo]);

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
      const data = await callAction(() => actions.load(targetId, { take: FIRST_PAGE }));
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
  }, [targetId, actions]);

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
            actions.load(targetId, { cursor: nextCursor, take: NEXT_PAGE })
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
  }, [hasMore, loading, nextCursor, targetId, actions, mergeComments]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim()) return;
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);

    try {
      const result = await callAction(() =>
        actions.create(targetId, newComment, replyTo?.id ?? null)
      );
      if (result.error) {
        // An unconfirmed address gets the dialog, which explains and offers to
        // send the link again; everything else is still a toast.
        if (!emailGate.handled(result.error)) toast.error(result.error);
      } else {
        // The action returns the finished comment, so it slots straight into
        // the loaded thread. No refetch: with the thread paginated, a refetch
        // would throw away every page the reader has scrolled in.
        if (result.comment) {
          mergeComments([result.comment]);
          setJustPosted(result.comment.id);
        }
        setNewComment("");
        setReplyTo(null);
        onCommentAdded();
        /* The arrow leaves the send button. Cleared on a timer rather than on
           the animation ending, because the button may well have unmounted by
           then (posting a reply moves the composer back to the foot). */
        setSent((n) => n + 1);
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
    const result = await callAction(() => actions.remove(id));
    if (result.error) return result;
    removeLocally(id);
  }

  async function handleModerationConfirm(note: string) {
    if (!moderatingId) return { error: "Nothing selected" };
    const result = await callAction(() => actions.adminRemove(moderatingId, note || undefined));
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

  /* The comment the box should sit under, or null for "leave it at the foot".
     Null whenever the target is not on screen anyway
     (a reply to something that has since been deleted, or that lives on a page
     the reader has not scrolled to), because a composer that vanishes is worse
     than one that did not move. */
  const inlineReplyId =
    replyTo && comments.some((c) => c.id === replyTo.id) ? replyTo.id : null;

  // The loading rows mirror what is actually coming: none for a post the card
  // already knows has no comments, one for one, two for anything more.
  const skeletonRows = Math.min(expectedCount ?? 2, 2);

  // The measured content: divider, the thread, and the composer. List sits on top, the
  // input always sits on the bottom, so the reveal order is the same every single time.
  /**
   * THE BOX YOU TYPE IN, lifted out of the tree so it can be rendered in two
   * places. At rest it sits at the foot of the thread, where it always has.
   * While a reply is pending it is rendered UNDER THE COMMENT BEING REPLIED
   * TO instead, and nothing scrolls.
   *
   * That is not a flourish, it is the only version of this that works. The
   * obvious fix -- scroll the page down to the composer -- drags the
   * infinite-scroll sentinel through the viewport on the way, which fetches
   * the next page, which grows the thread under the box you were heading for.
   * Traced on a real thread: the panel went 472px to 943px mid-scroll and the
   * field was flung from 570px back to 937 in a 900px window. Chasing it does
   * not help, because every page that lands moves the target again; it is a
   * treadmill, not a race. Moving the box to the reader has no such problem,
   * and it also answers the original complaint better: you can see which
   * comment you are replying to, because the box is under it.
   */
  const composer = (
    <form onSubmit={handleSubmit}>
      {/* "Replying to <name>" exists to tell you which comment the box at the
          foot of the thread belongs to. With the box sitting under that very
          comment there is nothing left for it to say. Escape backs out. */}
      {replyTo && !inlineReplyId && (
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
      {/* items-end, not items-center: the send button stays level with the LAST
          line of a box that has grown, rather than drifting to the middle of it. */}
      <div className="flex items-end gap-2">
        {/* Inset focus ring (inline, so the panel's overflow-hidden during the open/close
            animation can never clip it into a stray shape). */}
        {
          /* A BOX THAT GROWS WITH WHAT YOU TYPE.
             The field accepts 1000 characters and showed about 60 of them: a
             36px single line, no wrap, the beginning of your own sentence
             scrolling away to the left as you write. On a site where people
             are writing down what they remember, that is the wrong shape --
             look at any real thread here and half the comments run to two or
             three lines.
             It starts at exactly the old height, so a one-line comment looks
             identical to what shipped, and it stops growing at five lines and
             scrolls after that, so one long comment cannot push the composer
             off the screen. The radius is 18px rather than `rounded-full`:
             at 36px tall those are the same shape to the pixel, and only the
             fixed one stays sane once the box is 90px tall. */
          <textarea
            ref={textareaRef}
            rows={1}
            className={`max-h-[7.5rem] min-h-9 flex-1 resize-none rounded-[18px] border border-border bg-card px-4 py-[0.4375rem] text-sm leading-[1.375] text-foreground outline-none placeholder:text-muted-foreground ${FIELD_FOCUS}`}
            placeholder={
              replyTo ? `Reply to ${replyTo.name}...` : "Write a comment..."
            }
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => {
              /* Enter sends, Shift+Enter breaks the line. That is the order
                 every messaging surface uses, and it keeps the one-line case
                 behaving exactly as the input did. IME composition is left
                 alone: `isComposing` is true while a Japanese or Chinese
                 keyboard is still choosing a character, and Enter there is
                 picking the word, not sending the comment. */
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
              /* Escape backs out of a reply rather than out of the thread.
                 Only while one is pending, so it never swallows the key from
                 whatever is listening above it. */
              if (e.key === "Escape" && replyTo) {
                e.preventDefault();
                setReplyTo(null);
              }
            }}
            maxLength={1000}
          />
        }
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
          {/* THE ARROW LEAVES. On a successful post the glyph flies up out of the
              button and a fresh one rises into its place, which is the smallest
              possible way of saying the thing went somewhere. The button itself
              never moves, so the row cannot shift under a thumb still resting
              on it. Keyed on `sent` so React remounts the span and the enter
              replays; without the key the second comment in a row would post in
              silence. The 16px window clips it, so nothing escapes the circle. */}
          {/* Keyed on `sent` so React remounts the span and the CSS animation
              replays; without the key the second comment in a row would post in
              silence. The 16px window clips the flight, so nothing escapes the
              circle, and the button itself never moves. */}
          <span className="relative block h-4 w-4 overflow-hidden">
            <span
              key={sent}
              className={cn(
                "absolute inset-0 grid place-items-center",
                sent > 0 && "comment-sent-arrow"
              )}
            >
              <ArrowUp className="h-4 w-4" strokeWidth={2.6} />
            </span>
          </span>
        </SpringPress>
      </div>
    </form>
  );

  const body = (
    <>
    {/* Outside `contentRef` on purpose: that element's height is the accordion's
        one clock (see the ResizeObserver above), and nothing that is not the
        comment list belongs inside the thing being measured. The dialog renders
        nothing inline anyway, since it portals to the body when open. */}
    {emailGate.dialog}
    {/* pt-[21px] on the accordion, pt-3 on a letter, and the 9px between them is not a
        design choice -- it is the other half of the close-jerk fix in post-card.tsx. That
        card's action row now carries its -9px pull at ALL times instead of only when the
        thread is shut, so the panel starts 9px higher than it used to; 12 + 9 = 21 puts the
        content back where it was. A letter has no such row (alwaysOpen, no accordion), so it
        keeps the plain 12. Change one of these two numbers and you must change the other. */}
    <div
      ref={contentRef}
      className={cn(
        "px-0.5 pb-1",
        /* The gap that separates the thread from the post it hangs off, and the
           number is the owner's correction: the first cut opened it to 42px
           (--space-xl) on the theory that removing a line means widening the
           gap, and he read it as "weirdly big". He was right, and the reason is
           what the line was doing. With a rule drawn, no single gap on the card
           is larger than about 19px -- the rule breaks 36px into two halves, so
           the eye never sees one big void. Take the rule away and the whole 42
           becomes one gap, more than twice anything else on the card.
           --space-l, 26px at the card's 16px body, is the step that works: half
           again the 16px between two comments, so the thread still reads as its
           own section, and nothing like a hole. The +2 is the close-jerk
           compensation explained above; every number here carries it. */
        alwaysOpen ? "pt-3" : "pt-[28px]"
      )}
    >
      <div className="flex flex-col gap-4">

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
        /* Nothing at all. The box under this already reads "Write a comment..."
           and the button that opened the thread says 0, so the "No comments yet.
           Be the first." that used to sit here was a third way of saying the
           same thing, and 30px of panel to say it. */
        null
      ) : (
        /* THE THREAD UNROLLS. It used to be one flat opacity fade of the whole
           list, which is a strange thing to spend on the single most-pressed
           control in the product: you open a conversation and it simply
           materialises. Now each comment rises 8px into place a beat after the
           one above it, so the thread lays itself down from the top while the
           panel is still opening. The two read as one gesture because they are
           on the same clock -- the panel's height spring is `gentle` and so is
           each row.
           `staggerChildren` rather than a delay computed per index, so a row
           added later (a page landing, or your own comment) inherits `visible`
           and arrives on the same rise with no delay at all, instead of
           waiting behind a queue of rows that are already on screen. */
        <m.ul
          ref={listRef}
          className="flex flex-col gap-4"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: {
              transition: {
                /* 45ms is the beat where the eye reads a sequence rather than
                   a ripple; below ~30 they arrive together, above ~70 the
                   last row feels late. Capped by delayChildren staying 0 and
                   the first page being five rows, so the whole thread is laid
                   down inside 225ms and a long one never crawls. */
                staggerChildren: 0.045,
              },
            },
          }}
        >
          {topLevel.map((comment) => {
            const replies = repliesMap.get(comment.id);
            return (
              <m.li
                key={comment.id}
                variants={{
                  hidden: { opacity: 0, y: 8 },
                  visible: { opacity: 1, y: 0, transition: SPRINGS.gentle },
                }}
              >
                {comment.deleted ? (
                  <DeletedComment />
                ) : (
                  <CommentItem
                    comment={comment}
                    toggleLike={actions.toggleLike}
                    onReply={() =>
                      startReply({ id: comment.id, name: comment.author!.name })
                    }
                    onLikeToggle={handleLikeToggle}
                    viewerIsAdmin={viewerIsAdmin}
                    onModerate={() => setModeratingId(comment.id)}
                    onDelete={() => setDeletingId(comment.id)}
                    landed={justPosted === comment.id}
                  />
                )}
                {inlineReplyId === comment.id && (
                  <div className="mt-4 [margin-left:13px] pl-4">{composer}</div>
                )}
                {replies && replies.length > 0 && (
                  <ul className="mt-4 flex flex-col gap-4 border-l border-border/70 pl-4 [margin-left:13px]">
                    {replies.map((reply) => (
                      /* A reply carries the same variants as its parent row, so
                         it rises with the comment it hangs off rather than
                         being the one thing in the thread that simply appears.
                         Motion propagates `visible` down through the plain <ul>
                         between them, so no second stagger is declared here:
                         a comment and its replies arrive as one group, which is
                         what they are. */
                      <m.li
                        key={reply.id}
                        variants={{
                          hidden: { opacity: 0, y: 8 },
                          visible: { opacity: 1, y: 0, transition: SPRINGS.gentle },
                        }}
                      >
                        <CommentItem
                          comment={reply}
                          toggleLike={actions.toggleLike}
                          onReply={() =>
                            startReply({
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
                          landed={justPosted === reply.id}
                          nested
                        />
                        {inlineReplyId === reply.id && (
                          <div className="mt-4">{composer}</div>
                        )}
                      </m.li>
                    ))}
                  </ul>
                )}
              </m.li>
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

      {/* At the foot of the thread, unless a pending reply has moved it up
          beside the comment it answers. */}
      {!inlineReplyId && composer}

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
    </div>
    </>
  );

  // Letters: permanently expanded, no accordion (avoids a stray open animation on page load).
  if (alwaysOpen) {
    return (
      <div id={`comments-${targetId}`} className="mt-3">
        {body}
      </div>
    );
  }

  // Feed / groups: one coordinated timeline. Open springs height 0 -> measured and fades in
  // as a single unit; close collapses everything (rows, divider, input) on one clean tween,
  // with no second step and no divider left behind.
  return (
    <m.div
      id={`comments-${targetId}`}
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: contentHeight, opacity: 1 }}
      exit={{
        height: 0,
        opacity: 0,
        transition: PANEL_MOTION,
      }}
      transition={PANEL_MOTION}
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
  toggleLike,
  onReply,
  onLikeToggle,
  viewerIsAdmin = false,
  onModerate,
  onDelete,
  landed = false,
  nested = false,
}: {
  comment: CommentData;
  /** `actions.toggleLike`, handed down so this row does not import an owner. */
  toggleLike: CommentActions["toggleLike"];
  onReply: () => void;
  onLikeToggle: (id: string, liked: boolean, count: number) => void;
  /** Site admin viewing this thread: shows the "Remove" moderation control. */
  viewerIsAdmin?: boolean;
  onModerate?: () => void;
  /** Own comments only: the author deleting their own words. */
  onDelete?: () => void;
  /** You wrote this one, seconds ago. True for about 1.8s, then never again. */
  landed?: boolean;
  /**
   * A reply, rather than a comment on the post. Its bird is drawn a rung
   * smaller (28 against 34) so the shape of a conversation is legible without
   * reading a word of it: today a reply and a top-level comment are identical
   * except for an indent and a hairline, which is a lot of work for a 1px line
   * to do. The line and the indent stay; this just stops them carrying it
   * alone. 28 is where an RV bird is still plainly a bird -- it is the same
   * glyph set the directory draws at 24.
   */
  nested?: boolean;
}) {
  const author = comment.author!;

  const fireLike = useHeartToggle(() => toggleLike(comment.id));

  function handleLike() {
    // The row belongs to the thread above, so the commit writes there rather
    // than to local state; the choreography is the feed card's, shared.
    void fireLike({ liked: comment.liked, count: comment.likeCount }, ({ liked, count }) =>
      onLikeToggle(comment.id, liked, count)
    );
  }

  return (
    /* THE ONE THAT IS YOURS. A wash of the app's own warm hover ink, bled past
       the row's edges so it reads as light falling on the paper rather than as
       a box drawn round the comment, receding over the beat after it lands.
       Drawn by a class rather than inline, because a comment row lives inside
       the thread's Motion variant tree and anything animated from in here gets
       captured by it -- see the note on @keyframes comment-landed. */
    <div className={cn("group comment-row flex items-start gap-2.5", landed && "comment-landed")}>
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
        {/* On a comment you just wrote, the bird arrives rather than appears:
            one press of the app's own `snappy` spring, the same one every pill
            and avatar in the product uses. It is the best thing this site owns
            and it had never once been given a moment of its own. */}
        <span className={cn("block", landed && "comment-bird-land")}>
          <BirdAvatar
            user={{
              id: author.id,
              name: author.name,
              photoUrl: author.photoUrl,
              birdOverride: author.birdOverride,
            }}
            size={nested ? 28 : 34}
          />
        </span>
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
          {/* The padding is negative-margined back out, so this grows the TARGET
              without moving the word or reflowing the meta row: measured 29x16
              before, which is under WCAG 2.2's 24px floor for a fine pointer
              and nowhere near Apple's 44 for a thumb. MENU_TRIGGER_HIT (the
              same ::after the "..." trigger below uses) carries it to 44 on
              touch. The row keeps its h-5, so nothing about the layout moved. */}
          <button
            onClick={onReply}
            className={`${MENU_TRIGGER_HIT} -my-2 -mx-1.5 rounded-sm px-1.5 py-2 font-medium transition-opacity duration-150 hover:text-foreground active:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring`}
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
            /* MENU_TRIGGER_HIT and the vertical padding are hit area, not size:
               the glyph and the row's h-5 are untouched, the padding is pulled
               back out by the matching negative margin, and the ::after only
               exists on a coarse pointer. Measured 26x18 before, which is under
               WCAG 2.2's 24px floor on both axes. The heart's SIZE still lives
               in love-button.tsx as a named variant, per the standing rule
               there that a caller never sizes it from a className. */
            className={`${MENU_TRIGGER_HIT} -my-2 -ml-1 py-2 font-medium [&>span]:leading-[14px]`}
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
            /* HIDDEN UNTIL THE POINTER IS ON THE ROW, exactly like the "..."
               above it, and for the same reason. This is the one control on a
               comment that was always painted: measured on a real thread, five
               comments meant five shield glyphs down the right edge, at full
               opacity, permanently. The owner is an admin on every thread in
               the product, so the moderation tool was decorating every
               conversation he has ever looked at. Nobody else ever saw it,
               which is exactly why it survived this long.
               Same opacity contract as the menu trigger: hover, focus, and
               always-on for touch, where there is no hover to reveal it. */
            <button
              onClick={onModerate}
              aria-label="Remove comment (admin)"
              title="Remove comment (admin)"
              className={`${MENU_TRIGGER_HIT} state-layer ml-auto rounded-md p-1.5 font-medium text-muted-foreground/70 opacity-0 transition-opacity duration-150 hover:text-destructive group-hover:opacity-100 focus-visible:opacity-100 active:opacity-70 [@media(pointer:coarse)]:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring`}
            >
              <ShieldAlert className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
