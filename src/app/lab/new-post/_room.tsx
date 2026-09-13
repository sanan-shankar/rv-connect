"use client";

/* ------------------------------------------------------------------ *
 *  The bird in the button: two ways a composer can open when there is no
 *  pill on the page for it to grow out of.
 *
 *  What both faces share. The pill row above the feed is gone, so the
 *  first post starts right under the header. The owner's own bird stands
 *  beside the New post pill at 40px, the size it is on every post and in
 *  every rail. It was first tried INSIDE the pill, in a card-coloured disc
 *  where the plus was, and the owner turned that down (2026-09-13): "we
 *  have to inset the bird in a white box and now the bird is waay too
 *  small". The disc was a box the bird wears nowhere else, and it shrank
 *  the bird to 24px. Bird and pill are one button, so the bird never reads
 *  as an account menu. Opening the composer, the bird leaves (a shared
 *  `layoutId`) and lands in the composer's avatar slot, also 40px, so the
 *  flight is a plain move with no scaling in it.
 *
 *  Round three (owner, 2026-09-13): "now we have two buttons that have the
 *  same purpose". A 40px bird beside a 40px pill is two objects however it
 *  is wired. So the bench holds two ways to make them ONE shape without
 *  putting the bird back in a box:
 *    Chip     an ordinary pill whose round left end IS the bird, the way
 *             an account chip holds its avatar. Round at both ends, no
 *             cut, no box. While the bird is out a plus fades into its
 *             place, so the button still says add.
 *    Badge    no pill. The bird is the button and wears a small canopy
 *             plus at its corner, the "add to your story" shape. One object
 *             for certain, but it gives up the words.
 *
 *  Considered and not taken: Overlap, a round socket 3px wider than the
 *  bird masked out of the pill so the green wrapped a bird standing on the
 *  page colour. The owner (2026-09-13): "it's just standing out in the ui
 *  this crescent thing. plus the ends of the green bit are quite sharp".
 *  The sharp ends were geometry, not tuning: a 23px cut through a 20px
 *  half-height has to leave two points where it crosses the edges.
 *
 *  Only the bird travels. Morphing the whole card out of a 120px pill was
 *  considered and not taken: a card scaled up from a pill stretches every
 *  word inside it on the way, which is the "layout prop stretches" trap.
 *
 *    In place  the card opens at the top of the feed, under the header,
 *              and the posts slide down to make room. Posting dissolves
 *              the card into the first post, where you were writing.
 *    Sheet     the phone convention (Mail, Messages). A sheet rises; the
 *              bird follows once it has settled, because a target that is
 *              still sliding makes the flight wobble. On a laptop it is a
 *              panel dropping in under the top of the page.
 *
 *  Nothing posts for real. PostCard runs in `demo`, and the landed post
 *  lives in this component's state until "Start over".
 *
 *  Motion moves only transform and opacity. The posts make room by
 *  `layout="position"`, which is a translate, never a height animation.
 * ------------------------------------------------------------------ */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import Link from "next/link";
import { AnimatePresence, LayoutGroup, MotionConfig, m } from "motion/react";
import { Bell, ImagePlus, Plus, Search } from "lucide-react";
import { PeaksMark } from "@/components/layout/peaks-mark";
import { BirdAvatar, type AvatarUser } from "@/components/common/bird-avatar";
import { PostCard, type PostData } from "@/components/posts/post-card";
import { SPRINGS } from "@/components/common/motion";
import { FIELD_FOCUS } from "@/components/ui/field-focus";
import { cn } from "@/lib/utils";

type Face = "inplace" | "sheet";

const FACES: { id: Face; name: string; says: string }[] = [
  {
    id: "inplace",
    name: "In place",
    says: "Your bird leaves the button, the card opens at the top of the feed, and your post lands where you wrote it.",
  },
  {
    id: "sheet",
    name: "Sheet",
    says: "The phone way. A sheet rises, your bird follows it up, and your post is waiting at the top when it drops away.",
  },
];

// One id for the one bird. It exists in exactly one place at a time.
const BIRD = "lab-new-post-bird";

type Look = "chip" | "badge";
const LOOKS: { id: Look; name: string }[] = [
  { id: "chip", name: "Chip" },
  { id: "badge", name: "Badge" },
];


/* The canopy pill, spelled out rather than buttonVariants so the New post
   button can put its fill on an inner span (the bird beside it is part of
   the same button, outside the green). `filter` stays out of the transition
   list for the reason button.tsx gives: the curve overshoots and the colour
   changes twice. */
const PILL_FILL =
  "inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full bg-canopy text-sm font-medium whitespace-nowrap text-white shadow-[0_5px_13px_-12px_var(--color-canopy)] transition-[transform] duration-150 ease-pop";
const PILL = `${PILL_FILL} outline-none select-none hover:brightness-[1.08] active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring`;

const ICON_BTN =
  "state-layer inline-grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:text-foreground active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

// Fixed dates, not Date.now(): the server and the browser must print the
// same "3d ago" or the room hydrates with a warning.
const SEED: PostData[] = [
  mockPost("seed-1", "Meera Iyer", 1998, "2026-09-11T08:30:00Z", "Walked past the old dining hall this morning. The banyan is still there, bigger than I remember.", 14, 3),
  mockPost("seed-2", "Arjun Menon", 1985, "2026-09-09T16:10:00Z", "Anyone from the '85 batch in Bengaluru next month? Thinking of a small get-together.", 9, 6),
  mockPost("seed-3", "Kavya Rao", 2012, "2026-09-04T11:00:00Z", "Found my Class 8 nature journal. Forty pages of hoopoes.", 22, 2),
];

function mockPost(
  id: string,
  name: string,
  batchYear: number,
  createdAt: string,
  content: string,
  likeCount: number,
  commentCount: number
): PostData {
  return {
    id,
    content,
    images: null,
    createdAt,
    author: { id: `lab-${id}`, name, photoUrl: null, birdOverride: null, accountType: "alumnus", verifyState: "verified", batchType: "batch", batchYear },
    commentCount,
    likeCount,
    liked: false,
    bookmarked: false,
    isOwn: false,
    poll: null,
  };
}

function useIsPhone() {
  return useSyncExternalStore(
    (cb) => {
      const q = window.matchMedia("(max-width: 639px)");
      q.addEventListener("change", cb);
      return () => q.removeEventListener("change", cb);
    },
    () => window.matchMedia("(max-width: 639px)").matches,
    () => false
  );
}

export function NewPostRoom({ you: me }: { you: AvatarUser & { id: string; name: string } }) {
  const [face, setFace] = useState<Face>("inplace");
  const [look, setLook] = useState<Look>("chip");
  /* The worst case for a bird sitting on canopy is a green bird. Kavya Rao's
     seed id hashes to one, so this borrows it rather than naming a species
     slug that could be renamed. The name stays the owner's. */
  const [greenBird, setGreenBird] = useState(false);
  const you = useMemo(
    () => (greenBird ? { ...me, id: "lab-seed-3", photoUrl: null, birdOverride: null } : me),
    [greenBird, me]
  );
  const [open, setOpen] = useState(false);
  /* Where the bird is, apart from whether the composer is open. In place
     they are the same thing. In the sheet the bird waits for the sheet to
     settle before it flies, and comes home the moment you close. */
  const [birdAway, setBirdAway] = useState(false);
  const [landed, setLanded] = useState(false);
  const [draft, setDraft] = useState("");
  const [posts, setPosts] = useState<PostData[]>(SEED);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const openComposer = useCallback(() => {
    setLanded(false);
    setOpen(true);
    if (face === "inplace") setBirdAway(true);
  }, [face]);

  const close = useCallback((opts?: { refocus?: boolean }) => {
    setOpen(false);
    setBirdAway(false);
    if (opts?.refocus) buttonRef.current?.focus({ preventScroll: true });
  }, []);

  const post = useCallback(() => {
    const words = draft.trim();
    if (!words) return;
    setPosts((p) => [
      {
        ...mockPost(`you-${Date.now()}`, you.name, 0, new Date().toISOString(), words, 0, 0),
        author: { id: you.id, name: you.name, photoUrl: you.photoUrl, birdOverride: you.birdOverride, accountType: "alumnus", verifyState: null, batchType: null, batchYear: null },
        isOwn: true,
      },
      ...p,
    ]);
    setLanded(true);
    setDraft("");
    close();
  }, [draft, you, close]);

  function switchFace(f: Face) {
    close();
    setFace(f);
  }

  const composerProps = {
    you,
    draft,
    setDraft,
    onPost: post,
    onClose: close,
    birdAway,
    buttonRef,
  };

  return (
    /* reducedMotion="user": with the OS setting on, the flights and slides
       become cuts and only the fades remain. */
    <MotionConfig reducedMotion="user">
      <LayoutGroup>
        <div className="min-h-screen bg-background pb-40">
          <RoomStrip face={face} />

          <div className="mx-auto w-full max-w-[762px] px-5 pt-6 sm:px-10 sm:pt-10">
            {/* The feed's own header, reproduced from PageHeader: the title
                and the right-hand cluster top-aligned, search hidden on a
                phone, the bell a 40px disc on the card colour. */}
            <header className="mb-6 flex flex-nowrap items-start justify-between gap-4">
              <h1 className="font-heading text-[30px] leading-[1.2] tracking-[-0.02em] text-foreground">
                Feed
              </h1>
              <div className="mt-px flex shrink-0 flex-nowrap items-center justify-end gap-2.5">
                <button type="button" aria-label="Search (not wired in this room)" className={cn(ICON_BTN, "hidden h-10 w-10 sm:inline-grid")}>
                  <Search className="h-[18px] w-[18px]" />
                </button>
                <button type="button" aria-label="Notifications (not wired in this room)" className={cn(ICON_BTN, "h-10 w-10 bg-card text-foreground")}>
                  <Bell className="h-[18px] w-[18px]" />
                </button>
                <NewPostButton
                  ref={buttonRef}
                  look={look}
                  you={you}
                  birdAway={birdAway}
                  expanded={open}
                  onPress={() => {
                    if (!open) openComposer();
                    else document.querySelector<HTMLTextAreaElement>("[data-lab-draft]")?.focus({ preventScroll: true });
                  }}
                />
              </div>
            </header>

            <div className="flex flex-col gap-5">
              <AnimatePresence initial={false} mode="popLayout" custom={landed}>
                {open && face === "inplace" && (
                  <InPlaceComposer key="composer" {...composerProps} />
                )}
                {posts.map((p) => (
                  <m.div
                    key={p.id}
                    layout="position"
                    transition={SPRINGS.gentle}
                    /* A landed post arrives under the card that is dissolving
                       into it, so it only needs the last few percent of scale
                       to read as settling, not as appearing. */
                    initial={{ opacity: 0, scale: 0.985 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <PostCard demo variant="card" post={p} />
                  </m.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          <AnimatePresence>
            {open && face === "sheet" && (
              <SheetComposer
                key="sheet"
                {...composerProps}
                onSettled={() => setBirdAway(true)}
              />
            )}
          </AnimatePresence>

          <Bench
            face={face}
            onFace={switchFace}
            look={look}
            onLook={setLook}
            greenBird={greenBird}
            onGreenBird={setGreenBird}
            onReset={() => {
              close();
              setDraft("");
              setPosts(SEED);
            }}
          />
        </div>
      </LayoutGroup>
    </MotionConfig>
  );
}

function RoomStrip({ face }: { face: Face }) {
  return (
    <div className="border-b border-border px-5 py-4 sm:px-10">
      <Link
        href="/lab"
        className="mb-3 inline-flex items-center gap-2 rounded-sm text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <PeaksMark size={18} /> Lab
      </Link>
      <p className="font-heading text-[20px] leading-tight text-foreground">The bird in the button</p>
      {/* Fixed height for two lines, so swapping faces never moves the feed. */}
      <p className="mt-1 min-h-[42px] max-w-[60ch] text-[13px] leading-relaxed text-muted-foreground">
        {FACES.find((f) => f.id === face)?.says}
      </p>
    </div>
  );
}

function NewPostButton({
  ref,
  look,
  you,
  birdAway,
  expanded,
  onPress,
}: {
  ref: React.Ref<HTMLButtonElement>;
  look: Look;
  you: AvatarUser;
  birdAway: boolean;
  expanded: boolean;
  onPress: () => void;
}) {
  const bird = !birdAway && (
    <m.span layoutId={BIRD} transition={SPRINGS.gentle} className="grid place-items-center">
      <BirdAvatar user={you} size="sm" />
    </m.span>
  );
  const shell =
    "group/np relative inline-flex shrink-0 items-center rounded-full outline-none select-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
  const common = {
    ref,
    type: "button" as const,
    onClick: onPress,
    "aria-expanded": expanded,
    "aria-label": "New post",
    /* Kept off the outside-click test, so pressing it while open focuses
       the editor instead of closing and reopening it. */
    "data-lab-keep-open": true,
  };

  if (look === "badge") {
    return (
      <button {...common} className={shell}>
        {/* The slot keeps its 40px while the bird is out, so the plus stays
            where the thumb left it. */}
        <span className="grid size-10 place-items-center">{bird}</span>
        {/* The page-coloured 2px halo is what lets a green plus sit on any
            bird, including the green ones, without a box round the bird. */}
        <span
          aria-hidden
          className="absolute -right-1 -bottom-1 grid size-[20px] place-items-center rounded-full bg-canopy text-white shadow-[0_0_0_2px_var(--background)] transition-[transform] duration-150 ease-pop group-hover/np:brightness-[1.08] group-active/np:scale-90"
        >
          <Plus className="size-3" strokeWidth={3} />
        </span>
      </button>
    );
  }

  /* Chip. The press sinks the whole button, bird included, so the bird never
     slides against the green under a thumb; hover lights only the green,
     because a brightness filter on the bird would change its colours. */
  return (
    <button {...common} className={cn(shell, "transition-[transform] duration-150 ease-pop active:scale-[0.97]")}>
      {/* pl-12: the 40px bird plus 8px before the words. */}
      <span aria-hidden className={cn(PILL_FILL, "pr-4 pl-12 group-hover/np:brightness-[1.08]")}>
        New post
      </span>
      <span className="absolute top-0 left-0 grid size-10 place-items-center">
        <AnimatePresence>
          {/* 20px in, not centred in the bird's 40px: centred left a 19px hole
              before the words, where the ordinary pill keeps 8. */}
          {birdAway && (
            <m.span
              key="plus"
              aria-hidden
              className="absolute inset-y-0 left-5 grid place-items-center text-white"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Plus className="h-[17px] w-[17px]" />
            </m.span>
          )}
        </AnimatePresence>
        {bird}
      </span>
    </button>
  );
}

type ComposerProps = {
  you: AvatarUser;
  draft: string;
  setDraft: (s: string) => void;
  onPost: () => void;
  onClose: (opts?: { refocus?: boolean }) => void;
  birdAway: boolean;
  buttonRef: React.RefObject<HTMLButtonElement | null>;
};

/** The bird's landing spot: a 40px slot that holds the bird once it's here. */
function BirdSlot({ you, birdAway }: { you: AvatarUser; birdAway: boolean }) {
  return (
    <span className="grid size-10 shrink-0 place-items-center">
      {birdAway && (
        <m.span layoutId={BIRD} transition={SPRINGS.gentle} className="grid place-items-center">
          <BirdAvatar user={you} size="sm" />
        </m.span>
      )}
    </span>
  );
}

function Field({ draft, setDraft, onPost, onClose, minH }: Pick<ComposerProps, "draft" | "setDraft" | "onPost" | "onClose"> & { minH: number }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    // preventScroll: opening must never move the page out from under you.
    const t = setTimeout(() => ref.current?.focus({ preventScroll: true }), 60);
    return () => clearTimeout(t);
  }, []);
  return (
    <textarea
      ref={ref}
      data-lab-draft
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) onPost();
        if (e.key === "Escape" && !draft.trim()) onClose({ refocus: true });
      }}
      placeholder="Share a memory or a note with the community..."
      aria-label="Write your post"
      style={{ minHeight: minH }}
      className={cn(
        "block w-full resize-none rounded-[var(--radius-input)] border border-border bg-card px-3.5 py-3 text-base leading-[1.7] text-foreground placeholder:text-muted-foreground",
        FIELD_FOCUS
      )}
    />
  );
}

function PostPill({ draft, onPost }: { draft: string; onPost: () => void }) {
  const has = draft.trim().length > 0;
  return (
    <m.button
      type="button"
      onClick={onPost}
      disabled={!has}
      className={cn(PILL, "px-6")}
      animate={{ scale: has ? 1 : 0.97, opacity: has ? 1 : 0.55 }}
      transition={SPRINGS.snappy}
    >
      Post
    </m.button>
  );
}

function Tools({ children }: { children?: ReactNode }) {
  return (
    <div className="mt-2 flex items-center gap-2">
      <div className="-ml-[9px] flex items-center gap-1">
        <button type="button" aria-label="Add a photo (not wired in this room)" className={ICON_BTN}>
          <ImagePlus className="h-[18px] w-[18px]" />
        </button>
        <button type="button" aria-label="Add to your post (not wired in this room)" className={ICON_BTN}>
          <Plus className="h-[18px] w-[18px]" />
        </button>
      </div>
      <div className="ml-auto">{children}</div>
    </div>
  );
}

/** Clicking anywhere else closes an EMPTY composer. Typed words are never
 *  thrown away by a stray click, the same rule the real composer keeps. */
function useOutsideClose(rootRef: React.RefObject<HTMLElement | null>, draft: string, onClose: () => void) {
  useEffect(() => {
    function onDown(e: MouseEvent) {
      const t = e.target as Element;
      if (rootRef.current?.contains(t)) return;
      if (t.closest?.("[data-lab-keep-open], [data-lab-bench]")) return;
      if (!draft.trim()) onClose();
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [rootRef, draft, onClose]);
}

const inPlaceVariants = {
  hidden: { opacity: 0, y: -10, scale: 0.98 },
  shown: { opacity: 1, y: 0, scale: 1, transition: SPRINGS.gentle },
  /* `custom` is whether the post landed. Posted: the card dissolves quickly
     into the post appearing beneath it. Closed empty: it folds back up
     toward the button it came from. */
  exit: (landed: boolean) =>
    landed
      ? { opacity: 0, transition: { duration: 0.16, ease: "easeOut" as const } }
      : { opacity: 0, y: -10, scale: 0.98, transition: SPRINGS.snappy },
};

/* `ref` is AnimatePresence's, not ours: popLayout measures the node it is
   given to lift an exiting card out of flow, so the posts under it can slide
   back up. Dropping it makes the close a jump. */
function InPlaceComposer({ ref, ...p }: ComposerProps & { ref?: React.Ref<HTMLDivElement> }) {
  const rootRef = useRef<HTMLDivElement>(null);
  useOutsideClose(rootRef, p.draft, p.onClose);
  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      rootRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [ref]
  );
  return (
    <m.div
      ref={setRefs}
      layout="position"
      variants={inPlaceVariants}
      initial="hidden"
      animate="shown"
      exit="exit"
      /* Grows from its top right, the corner nearest the button. */
      style={{ transformOrigin: "top right" }}
      className="card-elevated rounded-[var(--radius)] border border-border bg-card p-4"
    >
      <div className="flex items-start gap-3">
        <BirdSlot you={p.you} birdAway={p.birdAway} />
        <div className="min-w-0 flex-1">
          <Field {...p} minH={96} />
          <m.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0, transition: { ...SPRINGS.gentle, delay: 0.12 } }}
          >
            <Tools>
              <PostPill draft={p.draft} onPost={p.onPost} />
            </Tools>
          </m.div>
        </div>
      </div>
    </m.div>
  );
}

function SheetComposer({ onSettled, ...p }: ComposerProps & { onSettled: () => void }) {
  const phone = useIsPhone();
  const rootRef = useRef<HTMLDivElement>(null);
  useOutsideClose(rootRef, p.draft, p.onClose);

  // The page underneath holds still while the sheet is up.
  useEffect(() => {
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    return () => {
      html.style.overflow = prev;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-start sm:pt-[12vh]">
      <m.div
        aria-hidden
        className="absolute inset-0 bg-foreground/20"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      />
      <m.div
        ref={rootRef}
        role="dialog"
        aria-label="New post"
        /* `firm`, not `gentle`: a surface this big overshooting by even 2% is
           tens of pixels of wobble (motion.tsx). A phone sheet travels its
           own height; a laptop panel only drops the last 16px. */
        initial={phone ? { y: "100%" } : { opacity: 0, y: 16 }}
        animate={phone ? { y: 0 } : { opacity: 1, y: 0 }}
        exit={phone ? { y: "100%" } : { opacity: 0, y: 16 }}
        transition={SPRINGS.firm}
        onAnimationComplete={(def) => {
          // Only the arrival sends the bird; the exit must not call it back out.
          if (def && typeof def === "object" && "y" in def && def.y === 0) onSettled();
        }}
        className="card-elevated relative w-full rounded-t-[var(--radius)] border border-border bg-card p-4 pb-[max(16px,env(safe-area-inset-bottom))] sm:w-[560px] sm:rounded-[var(--radius)]"
      >
        {/* Apple's compose layout: Cancel leading, the title centred, the
            action trailing. */}
        <div className="mb-3 grid grid-cols-[1fr_auto_1fr] items-center">
          <button
            type="button"
            onClick={() => p.onClose({ refocus: true })}
            className="state-layer -ml-2 justify-self-start rounded-full px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Cancel
          </button>
          <p className="font-heading text-[17px] text-foreground">New post</p>
          <div className="justify-self-end">
            <PostPill draft={p.draft} onPost={p.onPost} />
          </div>
        </div>
        <div className="flex items-start gap-3">
          <BirdSlot you={p.you} birdAway={p.birdAway} />
          <div className="min-w-0 flex-1">
            <Field {...p} minH={phone ? 160 : 120} />
            <Tools />
          </div>
        </div>
      </m.div>
    </div>
  );
}

/** Bottom left, out of the way of both the header button and the sheet's
 *  Post pill. */
function Bench({
  face,
  onFace,
  look,
  onLook,
  greenBird,
  onGreenBird,
  onReset,
}: {
  face: Face;
  onFace: (f: Face) => void;
  look: Look;
  onLook: (l: Look) => void;
  greenBird: boolean;
  onGreenBird: (v: boolean) => void;
  onReset: () => void;
}) {
  return (
    <div
      data-lab-bench
      className="fixed bottom-0 left-0 z-40 p-3"
      style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
    >
      <div className="w-[168px] rounded-xl border border-border bg-accent/95 p-2 shadow-sm backdrop-blur-sm">
        <div role="radiogroup" aria-label="Which way it opens" className="grid grid-cols-2 gap-1">
          {FACES.map((f) => (
            <button
              key={f.id}
              type="button"
              role="radio"
              aria-checked={face === f.id}
              onClick={() => onFace(f.id)}
              className={cn(
                "state-layer rounded-lg px-2 py-1.5 text-[12px] font-medium transition-colors active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                face === f.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {f.name}
            </button>
          ))}
        </div>
        <div role="radiogroup" aria-label="Which button" className="mt-2 grid grid-cols-2 gap-1 border-t border-border pt-2">
          {LOOKS.map((l) => (
            <button
              key={l.id}
              type="button"
              role="radio"
              aria-checked={look === l.id}
              onClick={() => onLook(l.id)}
              className={cn(
                "state-layer rounded-lg px-2 py-1.5 text-[12px] font-medium transition-colors active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                look === l.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {l.name}
            </button>
          ))}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={greenBird}
          onClick={() => onGreenBird(!greenBird)}
          className="state-layer mt-2 flex w-full items-center justify-between rounded-md border-t border-border px-1 py-[5px] text-[12px] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          Green bird
          <span className={cn("block h-[14px] w-[24px] rounded-full p-[2px] transition-colors", greenBird ? "bg-primary" : "bg-border")}>
            <span className={cn("block size-[10px] rounded-full bg-background transition-transform", greenBird && "translate-x-[10px]")} />
          </span>
        </button>
        <button
          type="button"
          onClick={onReset}
          className="state-layer mt-2 w-full rounded-md border-t border-border px-1 py-[5px] text-[12px] text-muted-foreground transition-colors hover:text-foreground active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          Start over
        </button>
      </div>
    </div>
  );
}
