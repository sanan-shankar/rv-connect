"use client";

import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import dynamic from "next/dynamic";
import Link from "@/components/common/link";
import { MoreHorizontal, Trash2, Flag, Pencil, ArrowRight, ShieldAlert, MapPin } from "lucide-react";
import { ChatCircle, Feather } from "@phosphor-icons/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MENU_TRIGGER_HIT } from "@/components/ui/menu-material";
import { callAction } from "@/lib/call-action";
import { useHeartToggle, useBookmarkToggle } from "./use-engagement";
import { IdentityRow } from "@/components/common/identity-row";
import {
  photoSrc,
  photoSrcSet,
  PHOTO_SIZES_WIDE_FULL,
  PHOTO_SIZES_CENTERED_FULL,
} from "@/lib/image-cdn";
import { PhotoFrame } from "@/components/common/photo-frame";
import { PhotoRows } from "@/components/common/photo-rows";
import { PhotoCarousel } from "@/components/common/photo-carousel";
import type { StoredPhoto } from "@/lib/photo-layout";
import { MetaDots } from "@/components/common/meta-dots";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import {
  LazyImageViewer,
  preloadImageViewer,
  useImageViewer,
} from "@/components/common/lazy-image-viewer";
import { PhotoOpener } from "@/components/common/photo-opener";
import { PersonName } from "@/components/common/person-name";
import { LoveButton } from "@/components/common/love-button";
import { BookmarkButton } from "@/components/common/bookmark-button";
import { ShareButton } from "@/components/common/share-button";
import { PollDisplay } from "./poll-display";
import { cn, formatTimeAgo, formatDisplayDate, parseJsonArray, batchLine, letterTitle, plainExcerpt, readMinutes } from "@/lib/utils";
import { renderRichText } from "@/lib/rich-text";
import { linkRanges, stripReplacedLinks, type LinkCardView } from "@/lib/link-preview-core";
import { LinkCard } from "@/components/common/link-card";
import { toggleLike, deletePost, toggleBookmark, adminRemovePost } from "@/app/(main)/feed/actions";
import { m, AnimatePresence, animate } from "motion/react";
import { SPRINGS, EASE_OUT_SMOOTH } from "@/components/common/motion";
import { chooseFold, lineCentres, FOLD_LINES, type Fold } from "@/lib/read-more-fold";

/* ------------------------------------------------------------------ *
 *  Four pieces of this card only exist after somebody asks for them,
 *  and until now every one of them shipped inside the feed's first load
 *  to render nothing: the comment thread (718 lines), the full-screen
 *  viewer (444), the edit dialog and the admin moderation dialog. Each
 *  already had its render gate; only the import changes. The viewer's
 *  `dynamic()`, its preload and its latch now live in
 *  common/lazy-image-viewer.tsx, which five surfaces share.
 *
 *  ReportDialog is the fifth, and it used to be excluded from this list on
 *  the grounds that it is mounted unconditionally -- so its own
 *  AnimatePresence can play the CLOSE animation -- and that deferring
 *  something rendered on every card would save nothing. True of the import;
 *  false of the restructuring, which turned out to be the two-line `mounted`
 *  latch already sitting twenty lines below for the viewer. Latched, it
 *  mounts on the first "Report", stays mounted after so the close still
 *  animates, and its Select and Textarea leave the feed's first load with it.
 *
 *  Both of the two that sit behind a visible control preload on hover
 *  and focus, so on any normal pointer the chunk is already in memory
 *  before the click lands and the deferral is invisible.
 * ------------------------------------------------------------------ */
import { FEED_COMMENT_ACTIONS } from "./feed-comment-actions";

const CommentsSection = dynamic(
  () => import("./comments-section").then((m) => m.CommentsSection),
  { ssr: false }
);
const ReportDialog = dynamic(() => import("./report-dialog").then((m) => m.ReportDialog), {
  ssr: false,
});
const EditPostDialog = dynamic(
  () => import("./edit-post-dialog").then((m) => m.EditPostDialog),
  { ssr: false }
);
const ModerationDialog = dynamic(
  () => import("@/components/admin/moderation-dialog").then((m) => m.ModerationDialog),
  { ssr: false }
);
const preloadComments = () => void import("./comments-section");

/* Before the browser has measured a post (the server render), one this long is
   assumed to fold, so the first paint is already close to the final one rather
   than printing every line and then snapping shut. Measuring replaces the guess
   within a frame of hydration; the fold itself is by lines (read-more-fold.ts). */
const PROBABLY_FOLDS_AT = 300;

/**
 * The paragraph's clip, and how its last line looks.
 *
 * A fold at a paragraph's end just stops: the full stop already says so. A fold
 * inside a paragraph lets its last line trail off, fading over the right 40% to
 * nothing, the way iOS ends a clipped description, instead of the "..." this
 * used to print. It is a MASK rather than a card-coloured gradient laid over the
 * text, because the card also renders in a sheet with a different surface. The
 * second layer keeps every other line solid, including the ones below the fold
 * that "Read more" grows into, while `--fold-fade` lifts the trail (0 -> 1).
 */
function foldStyle(fold: Fold | null | "unmeasured", folded: boolean): CSSProperties | undefined {
  if (fold === "unmeasured") {
    return folded ? { maxHeight: `${FOLD_LINES}lh`, overflow: "hidden" } : undefined;
  }
  if (!fold) return undefined;
  const clip = folded ? { maxHeight: fold.clip, overflow: "hidden", "--fold-fade": 0 } : {};
  if (!fold.trailsOff) return folded ? clip : undefined;
  const lastLine = fold.clip - fold.lineHeight;
  return {
    ...clip,
    maskImage:
      `linear-gradient(to right, #000 60%, rgb(0 0 0 / var(--fold-fade, 1))), ` +
      `linear-gradient(#000 ${lastLine}px, transparent ${lastLine}px ${fold.clip}px, #000 ${fold.clip}px)`,
    maskSize: `100% ${fold.lineHeight}px, 100% 100%`,
    maskPosition: `0 ${lastLine}px, 0 0`,
    maskRepeat: "no-repeat",
  } as CSSProperties;
}

export interface PostData {
  id: string;
  kind?: string;
  title?: string | null;
  content: string;
  /** Pasted links in `content` that resolved into a card (same shape a
   *  Catch-up answer's `links` carries), in no particular order -- see
   *  `displayLinks` below for why the order is re-derived on render rather
   *  than trusted from here. */
  links?: LinkCardView[];
  images: string | null;
  /** What each of those images looks like -- shape, focal point, a smear to
   *  hold its place -- in the same order, from the `Image` table. Absent, or a
   *  null entry, means we have never measured that one: the card then draws it
   *  the way it did before the table existed. */
  photos?: (StoredPhoto | null)[];
  /** Null = everyone; otherwise the city short-name this post is limited to. */
  cityScope?: string | null;
  createdAt: string;
  author: {
    id: string;
    name: string;
    photoUrl: string | null;
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
  column = "wide",
  demo = false,
  onBookmarkChange,
}: {
  post: PostData;
  variant?: "card" | "sheet";
  /**
   * Which of `ContentColumn`'s two modes the card is standing in. It changes
   * nothing visual -- it is the `sizes` promise, and the two columns are 484px
   * apart at the top end, so a card that guesses wrong downloads a file two
   * rungs too big. The feed is wide; a profile is centered.
   */
  column?: "wide" | "centered";
  /**
   * Concept/lab pages (src/app/lab/**) render this card against a mock
   * payload whose ids exist in no table. `demo` keeps every action local: the
   * optimistic UI still runs, but nothing calls a server action that would fail
   * on a foreign key, and the letter opens nowhere. It exists so a preview can
   * show the REAL card instead of a look-alike copy of it.
   */
  demo?: boolean;
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
  /* Same latch as the viewer's below, for the same reason: ReportDialog must
     STAY mounted after it closes so its AnimatePresence has something to play
     out of, but mounting it up front would have every card on the page fetch
     the chunk. True once, then true forever. */
  const [reportMounted, setReportMounted] = useState(false);
  const openReport = () => {
    setReportMounted(true);
    setShowReport(true);
  };
  const [showEdit, setShowEdit] = useState(false);
  const [showModeration, setShowModeration] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [removed, setRemoved] = useState(false);
  const viewer = useImageViewer();
  // What the member last saved from the edit dialog, when they have.
  //
  // Every surface that renders a PostCard -- the feed, a group feed, the
  // profile tabs, Saved -- holds its posts in client state populated by a
  // server action, so revalidatePath re-renders the server tree and the card
  // on screen never moves. Deleting left the card sitting there (clicking
  // delete again answered "Post not found") and editing kept showing the old
  // words until the member navigated away and back (bug audit B-041). The
  // moderation path already got this right with `removed`; this is the same
  // shape for the member's own two actions.
  const [edited, setEdited] = useState<{ content: string; title: string | null } | null>(null);
  const content = edited?.content ?? post.content;
  const title = edited ? edited.title : post.title;

  /* THE CUT HAPPENS HERE, ON THE CLIENT, unlike a Catch-up answer's -- whose
     loader (catchups-edition-view.ts) cuts a resolved link out of `body`
     before the reader ever sees it. `content` above also serves as
     EditPostDialog's initial value (below), so cutting it on the server would
     hand the edit dialog a body with the link already missing, and saving
     that would overwrite the stored post with the link gone for good.
     `stripReplacedLinks` is the exact function the Catch-up reader calls
     server-side; it is pure (no network, no database -- link-preview-core.ts)
     so running it here instead costs nothing and stays safe to edit from.
     `carded` follows `post.links`, which can be one save behind a link the
     member just typed -- harmless: that link simply has no card yet and
     prints as ordinary clickable text via `linkRanges` below, exactly like a
     Catch-up answer's does before its own resolve lands. */
  const carded = useMemo(() => new Set((post.links ?? []).map((l) => l.url)), [post.links]);
  const stripped = useMemo(() => stripReplacedLinks(content, carded), [content, carded]);
  const displayBody = stripped.cards.length ? stripped.body : content;
  const linksByUrl = useMemo(
    () => new Map((post.links ?? []).map((l) => [l.url, l] as const)),
    [post.links]
  );
  /* `stripped.cards` carries the urls in the order they were pasted (the same
     order `findLinks` walks the text); the LinkCards below draw in that
     order rather than in whatever order the server happened to list them. */
  const displayLinks = stripped.cards
    .map((url) => linksByUrl.get(url))
    .filter((l): l is LinkCardView => Boolean(l));

  /* Parsed once per post payload: `viewerImages` and the row layout below
     both read it, and a fresh array every render would defeat their memos. */
  const images = useMemo(() => parseJsonArray(post.images), [post.images]);
  const columnSizes = column === "wide" ? PHOTO_SIZES_WIDE_FULL : PHOTO_SIZES_CENTERED_FULL;
  /* Justified rows need every shape up front, so a post whose photographs have
     not all been measured keeps the old stack rather than half a layout. Null
     is a supported state here exactly as it is in <PhotoFrame>: an image that
     predates the `Image` table, or one whose measurement failed. */
  const rowPhotos =
    images.length > 1 && post.photos?.length === images.length && post.photos.every(Boolean)
      ? (post.photos as StoredPhoto[])
      : null;
  // Built once per post payload, not on every like/comment re-render.
  const viewerImages = useMemo(
    () =>
      images.map((src) => ({
        src,
        author: post.author,
        date: formatDisplayDate(post.createdAt),
        caption: post.kind === "letter" ? null : content,
      })),
    [images, post.author, post.createdAt, post.kind, content]
  );
  const isLetter = post.kind === "letter";

  /* The fold. The whole post is always rendered, in one piece, and a long one
     is clipped to the lines `chooseFold` picks; "unmeasured" is the server
     render and the frame before the browser has counted lines. Nothing is ever
     split, so a mention or a bold run can no longer straddle a cut (audit
     C-011, which the old character cut needed a helper to dodge). Measured
     again when the width changes (the text rewraps) and once the web font has
     landed (it wraps differently from the fallback). */
  const bodyRef = useRef<HTMLParagraphElement>(null);
  const [fold, setFold] = useState<Fold | null | "unmeasured">("unmeasured");
  // `displayBody`, not `content`: it is what actually renders below, and a
  // link-only post whose one link became a card folds nothing at all.
  const folds = fold === "unmeasured" ? displayBody.length > PROBABLY_FOLDS_AT : fold !== null;
  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (!el || expanded) return;
    let live = true;
    const measure = () => {
      if (!live) return;
      const lineHeight = parseFloat(getComputedStyle(el).lineHeight);
      const next = chooseFold(lineCentres(el, lineHeight), lineHeight);
      setFold((prev) =>
        prev !== "unmeasured" &&
        prev?.clip === next?.clip &&
        prev?.trailsOff === next?.trailsOff
          ? prev
          : next
      );
    };
    measure();
    const widths = new ResizeObserver(measure);
    widths.observe(el);
    void document.fonts.ready.then(measure);
    return () => {
      live = false;
      widths.disconnect();
    };
  }, [displayBody, expanded]);

  /* "Read more" eases the paragraph from its folded height to its full one:
     the height it had BEFORE the click is read in the handler, and the grow is
     played from it before the first paint of the open text. A fold that
     trailed off lifts its fade over the same beat. At rest the height is auto
     again, so a resize reflows. */
  const openFromRef = useRef<number | null>(null);
  const readMore = () => {
    openFromRef.current = bodyRef.current?.offsetHeight ?? null;
    setExpanded(true);
  };
  useLayoutEffect(() => {
    const el = bodyRef.current;
    const from = openFromRef.current;
    openFromRef.current = null;
    if (!expanded || !el || from === null) return;
    const to = el.offsetHeight;
    el.style.overflow = "hidden";
    el.style.height = `${from}px`;
    el.style.setProperty("--fold-fade", "0");
    const grow = animate(el, { height: [from, to] }, { duration: 0.26, ease: EASE_OUT_SMOOTH });
    const lift = animate(el, { "--fold-fade": [0, 1] }, { duration: 0.22, ease: "easeOut" });
    const settle = () => {
      el.style.height = "";
      el.style.overflow = "";
    };
    grow.then(settle);
    return () => {
      grow.stop();
      lift.stop();
      settle();
    };
  }, [expanded]);

  // Letter preview: plain-text excerpt + estimated read time.
  const letterExcerpt = plainExcerpt(content, 200);
  const minutes = readMinutes(content);

  /* One like in flight at a time.
   *
   * The server is idempotent now (feed/actions.ts), so a double-tap can no
   * longer throw -- but two calls still race to decide the final state, and the
   * heart would settle wherever the slower one landed. A ref rather than state:
   * this guards the handler, and re-rendering the card to record that a request
   * is in the air would be a render nobody asked for.
   */
  const fireLike = useHeartToggle(() => toggleLike(post.id));
  const fireBookmark = useBookmarkToggle(() => toggleBookmark(post.id));

  function handleLike() {
    // The demo flips the heart and writes nothing: a heart that refuses to
    // move reads as broken rather than as a demo.
    void fireLike(
      { liked, count: likeCount },
      ({ liked: next, count }) => {
        setLiked(next);
        setLikeCount(count);
      },
      { skipAction: demo }
    );
  }

  async function handleDelete() {
    const result = await callAction(() => deletePost(post.id));
    if (result.error) return result;
    // The card goes now, not on the next full load. Same move the moderation
    // path already made (B-041).
    setRemoved(true);
  }

  async function handleModerationConfirm(note: string) {
    const result = await callAction(() => adminRemovePost(post.id, note || undefined));
    if (!result.error) setRemoved(true);
    return result;
  }

  function handleBookmark() {
    // The neighbour is told what STUCK, not what was guessed: the Saved tab
    // drops a card when its bookmark goes, and dropping it on the optimistic
    // flip would take it off screen before the write was known to have
    // happened. In the demo nothing is written, so the flip is what stuck.
    void fireBookmark(bookmarked, setBookmarked, { skipAction: demo }).then((settled) => {
      if (settled !== undefined) onBookmarkChange?.(settled);
    });
  }

  // The Groups feature was removed and no route renders a group post, so the
  // old `/groups/<id>#<id>` branch could only ever have produced a 404 link.
  const shareHref = `/feed#${post.id}`;

  const wrapClass =
    variant === "sheet"
      ? "px-5 py-4 border-b border-border last:border-0"
      : "card-elevated overflow-hidden rounded-[var(--radius)] border border-border bg-card p-4";

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
            /* No verified leaf on a post (owner, 2026-09-15: "ditch the
               verification leaves on feed"). The directory and profiles keep it. */
            name={<PersonName user={post.author} className="text-sm leading-none" />}
            nameClassName="flex items-center gap-1"
            meta={
              /* MetaDots drops the dot when a segment is empty (the Anonymous
                 profile's batch line is ""), so an archive post reads as just
                 its date rather than "· 3w ago". Owner rule: a middle dot only
                 ever sits BETWEEN elements. */
              <MetaDots
                parts={[
                  batchLine(post.author),
                  formatTimeAgo(new Date(post.createdAt)),
                ]}
              />
            }
            metaClassName="flex items-center gap-1.5 leading-none"
          />

          <DropdownMenu>
            {/* -mr-2 pulls the trigger's own padding plus the glyph's internal inset
                (MoreHorizontal's dots don't reach its viewBox edges) outward, so the DOTS
                ink lands flush on the card's right line (photo edge / share glyph) instead
                of sitting ~9px inside it. Hit area is unchanged, just shifted into the gutter.
                state-layer, not hover:bg-accent: on this bg-card header the accent fill
                measured +2.06 dL*, at the ~2 just-noticeable threshold. It also keeps the
                trigger lit while its own menu is open, since Base UI marks an open trigger
                data-popup-open and the state-layer selector already covers that. */}
            <DropdownMenuTrigger className={`${MENU_TRIGGER_HIT} state-layer -mr-2 rounded-md p-1.5 text-muted-foreground hover:text-foreground active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring`}>
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {post.isOwn ? (
                <>
                  <DropdownMenuItem onClick={() => setShowEdit(true)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  {/* Apple, Carbon and Radix all put a divider above the
                      destructive group: the gap is the warning. */}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => !demo && setShowDelete(true)}
                    variant="destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem onClick={openReport}>
                    <Flag className="mr-2 h-4 w-4" />
                    Report
                  </DropdownMenuItem>
                  {post.viewerIsAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setShowModeration(true)} variant="destructive">
                        <ShieldAlert className="mr-2 h-4 w-4" />
                        {isLetter ? "Remove letter" : "Remove post"}
                      </DropdownMenuItem>
                    </>
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
            href={demo ? `#${post.id}` : `/letters/${post.id}`}
            className="mt-3 block rounded-[var(--radius-md)] border border-border bg-paper/60 p-4 transition-colors hover:border-leaf/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.13em] text-cinnamon">
              <Feather size={13} weight="fill" />
              Letter
              <span className="text-muted-foreground/70">· {minutes} min read</span>
            </div>
            <h3 className="mt-2 font-heading text-xl font-bold leading-snug tracking-[-0.01em] text-foreground">
              {letterTitle(title, content)}
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
            {/* Content: one paragraph, the whole post, clipped at the fold
                (see `fold` above and foldStyle below). Skipped entirely when
                a post's whole body was one link that just became a card
                (displayBody === ""), the same fail-soft rule a Catch-up
                answer's tile follows: the card is the post then, not a
                paragraph with nothing in it above one. */}
            {displayBody && (
              <div className="mt-2.5">
                <p
                  ref={bodyRef}
                  className="whitespace-pre-wrap break-words text-[15px] leading-[1.7] text-foreground"
                  style={foldStyle(fold, folds && !expanded)}
                  /* `linkRanges`: a link still in the text is one that did not
                     become a card, and it prints as an ordinary link rather
                     than dead text -- opt-in on `renderRichText`, and now a
                     post opts in the same way a Catch-up answer does
                     (reader-parts.tsx). */
                  dangerouslySetInnerHTML={{ __html: renderRichText(displayBody, { linkRanges }) }}
                />
                {folds && !expanded && (
                  <button
                    onClick={readMore}
                    /* Bare text, so its states are ink-only: no state-layer (a tint
                       behind a 2-word label reads as a stray chip). active:opacity-70
                       is the press it was missing.

                       mt-2 rather than mt-1: at 4px it sat inside the paragraph's
                       own leading and read as one more line of the post rather
                       than the control that opens it. The ::after box is the same
                       device as MENU_TRIGGER_HIT -- 44px of touch on a coarse
                       pointer, across the label's own width, visible to nobody. */
                    className="relative mt-2 rounded-sm text-sm font-medium text-leaf transition-opacity duration-150 after:absolute after:inset-x-0 after:top-1/2 after:h-11 after:-translate-y-1/2 after:content-[''] hover:opacity-80 active:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [@media(hover:hover)_and_(pointer:fine)]:after:hidden"
                  >
                    Read more
                  </button>
                )}
              </div>
            )}

            {/* Poll */}
            {post.poll && (
              <PollDisplay
                postId={post.id}
                options={post.poll.options}
                totalVotes={post.poll.totalVotes}
                userVotedOptionId={post.poll.userVotedOptionId}
              />
            )}

            {/* Images. Each opens the shared full-screen viewer at itself
                (owner, 2026-07-30: "when something is posted, people do like
                to click on it and zoom in"). */}
            {images.length > 0 && (
              /* Edge to edge, owner 2026-09-07: "I think we should also make
                 that edge-to-edge picture thing, make that change even in the
                 feed. Let's just see how that works." The negative margin
                 cancels the card's own padding; the card clips the corners.
                 Everything else about the feed's photographs is untouched:
                 three or more is still a carousel, two is still a justified
                 row, one is still the shared frame, and every one of them
                 still opens the viewer at itself. */
              <div className={variant === "sheet" ? "-mx-5 mt-3" : "-mx-4 mt-3"}>
                {/* One photograph gets the shared rule: true shape if it is
                    square or wider, 3:4 on a bed of itself if it is taller,
                    capped at 900px however wide the card grows, and its space
                    reserved before it loads. See photo-layout.ts.

                    Served at display size, not stored size: a 728px card was
                    downloading a 1920px file. See src/lib/image-cdn.ts for the
                    measurement and for why this is a URL rather than <Image>. */}
                {images.length > 2 ? (
                  /* More than two: a carousel, one photograph at a time, each
                     drawn exactly as it would be if it were the only one.
                     Owner, 2026-08-28: "if there's more than two images we use
                     a carousel." Three side by side in a 316px phone card is a
                     contact sheet, and three stacked is 760px of scrolling. */
                  <PhotoCarousel
                    photos={images.map((img, i) => ({
                      src: photoSrc(img),
                      srcSet: photoSrcSet(img),
                      photo: post.photos?.[i] ?? null,
                    }))}
                    sizes={columnSizes}
                    onOpen={viewer.open}
                    onPreload={preloadImageViewer}
                    bleed
                    /* 21px, measured rather than guessed. With the dots out
                       of the flow the actions row starts 8px under the
                       photograph (its own mt-2) and is 32px tall, so its
                       centre is 24px down and a 6px dot starts at 21. The
                       dots then sit between the heart on the left and the
                       bookmark on the right, in the row that was already
                       going to be there. */
                    dotsFloatTop={21}
                  />
                ) : images.length === 1 || !rowPhotos ? (
                  images.map((img, i) => (
                    <PhotoOpener
                      key={i}
                      index={i}
                      count={images.length}
                      onOpen={viewer.open}
                      className={cn(
                        "rounded-none border-x-0",
                        !rowPhotos && images.length > 1 && "mb-2 last:mb-0"
                      )}
                    >
                      <PhotoFrame
                        src={photoSrc(img)}
                        srcSet={photoSrcSet(img)}
                        photo={post.photos?.[i] ?? null}
                        sizes={columnSizes}
                        fallbackClassName="max-h-96"
                      />
                    </PhotoOpener>
                  ))
                ) : (
                  /* Exactly two: justified rows, so they sit side by side at
                     one height on a laptop and stack on a phone. They used to
                     be tiled into half-width `max-h-48` cells, which was the
                     app's second source of the chopped-faces complaint after
                     the Catch-up letterbox. */
                  <PhotoRows photos={rowPhotos} columnSizes={columnSizes}>
                    {(_photo, i, cell) => (
                      <PhotoOpener
                        index={i}
                        count={images.length}
                        onOpen={viewer.open}
                        className="h-full rounded-none border-x-0"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photoSrc(images[i])}
                          srcSet={photoSrcSet(images[i])}
                          sizes={cell.sizes}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover"
                          style={{
                            aspectRatio: cell.aspectRatio,
                            objectPosition: cell.objectPosition,
                            maxHeight: cell.maxHeight,
                          }}
                        />
                      </PhotoOpener>
                    )}
                  </PhotoRows>
                )}
              </div>
            )}

            {/* Links: one card per pasted link that resolved, under the body
                and any photographs, 8px apart -- exactly the Catch-up
                answer's stack (edition/reader.tsx's Tile). */}
            {displayLinks.length > 0 && (
              <div className="mt-3 space-y-2">
                {displayLinks.map((link) => (
                  <LinkCard key={link.url} link={link} />
                ))}
              </div>
            )}
          </>
        )}

        {/* Actions. The negative margins pull the buttons' padding outward so the heart GLYPH's
            left edge sits flush with the content's left line (avatar/text/photo) and the share
            GLYPH's right edge sits flush with the content's right line (photo edge / the dots
            menu). Touch targets stay full-size; only the padding overhangs into the card gutter.
            The vertical cancel is -7px, not the -6px a bare py-1.5 suggests: LoveButton's text-sm
            count span sets a 20px line box around the 18px glyph, so its box is 32px and the
            glyph's optical inset is (32-18)/2 = 7.
            Only when the row is the card's last child: with comments open, CommentsSection
            takes over the bottom edge and the pull would just crowd the divider.

            A TENTH TIGHTER, top and bottom, 2026-09-07, and it is the owner's arithmetic: he
            found the same band on a Catch-up answer "a bit loose" and asked for "10% on both
            the top and the bottom", then told this file to follow "if feed uses the same width,
            the same number of pixels". It does, measured on both: 8px above the row's box and
            9px below it, either side of a 32px button whose glyph is inset 7. So the ink sat
            21px under the words and 23px above the border, and a tenth of each is 2px.
            mt-2 -> mt-1.5, and the bottom pull -7 -> -9.

            WHAT THAT COSTS, said out loud because it reverses an earlier instruction of his:
            the -7 was chosen so the ink landed 17px above the border to match the card's 16px
            sides ("bottom padding must match the sides", 2026-08). At -9 it lands at 15, so it
            is now a pixel INSIDE the side inset rather than a pixel outside. The later word
            wins; if the older one is the one he meant, this is the line to change back. */}
        {/* The -9px is UNCONDITIONAL, and that is the fix for the close jerk (2026-09-16).
            It used to be `!showComments && "-mb-[9px]"`, so React removed 9px of negative
            margin on the same render that started the panel's exit: measured frame by frame,
            the panel's top went 231 -> 222 in ONE frame and only then collapsed smoothly over
            580ms. That single frame is the jump the owner saw ("it jerks up and then closes
            gradually"), and it fired even on a post with no comments.
            Nothing about the open state moves: CommentsSection pays the 9px back as extra top
            padding on its own content (see `pt-[21px]` there), so the divider and everything
            under it land on exactly the pixel they did before. The point is that no class
            toggles across the transition at all, which is the only way a frame-one jump
            cannot come back. */}
        <div className="mt-1.5 -mx-2.5 -mb-[9px] flex items-center gap-1 text-muted-foreground">
          <LoveButton liked={liked} count={likeCount} onToggle={handleLike} label="Like this post" />

          <m.button
            onClick={() => setShowComments(!showComments)}
            onPointerEnter={preloadComments}
            onFocus={preloadComments}
            aria-expanded={showComments}
            aria-controls={`comments-${post.id}`}
            aria-label={showComments ? "Hide comments" : "Show comments"}
            whileTap={{ scale: 0.93 }}
            transition={SPRINGS.snappy}
            className="state-layer flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <ChatCircle size={18} weight="regular" />
            <span>{commentCount}</span>
          </m.button>

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
              targetId={post.id}
              actions={FEED_COMMENT_ACTIONS}
              onCommentAdded={() => setCommentCount((c) => c + 1)}
              onCommentRemoved={() => setCommentCount((c) => Math.max(0, c - 1))}
              viewerIsAdmin={post.viewerIsAdmin}
              expectedCount={commentCount}
            />
          )}
        </AnimatePresence>
      </article>

      {images.length > 0 && viewer.mounted && (
        <LazyImageViewer
          images={viewerImages}
          initialIndex={viewer.at ?? 0}
          open={viewer.at !== null}
          onClose={viewer.close}
        />
      )}

      {/* Latched, not gated on `showReport`: it has to stay mounted once it
          has been opened so its own AnimatePresence can play the close
          animation instead of the tree being yanked out from under it. */}
      {reportMounted && (
        <ReportDialog
          postId={post.id}
          itemLabel={isLetter ? "letter" : "post"}
          open={showReport}
          onClose={() => setShowReport(false)}
        />
      )}

      {showEdit && (
        <EditPostDialog
          postId={post.id}
          kind={post.kind}
          initialContent={content}
          initialTitle={title}
          open={showEdit}
          onClose={() => setShowEdit(false)}
          onSaved={(next) => setEdited(next)}
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

      <ConfirmDialog
        open={showDelete}
        onClose={() => setShowDelete(false)}
        title={isLetter ? "Delete letter" : "Delete post"}
        description="This cannot be undone."
        actionLabel="Delete"
        onConfirm={handleDelete}
      />
    </>
  );
}
