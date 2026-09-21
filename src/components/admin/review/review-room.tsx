"use client";

/* ------------------------------------------------------------------ *
 *  ONE PHOTOGRAPH, BIG, WITH THE THREE QUESTIONS BESIDE IT.
 *
 *  What this replaces: the photo queue was a FILTER on the general
 *  content-moderation list, so reviewing a photograph meant reading a
 *  row that carried a search box, a Filters button, a match count, a
 *  filter chip, a "Clear all", a "Photo" pill, the contributor's name,
 *  a relative time and a "Waiting for you" chip -- the last four
 *  repeated identically down every row of a list that was, by
 *  definition, all photos by the same contributor waiting for the same
 *  person. And a 64px thumbnail. The owner, 2026-08-30: "i can barely
 *  see what i'm reviewing... there's a million pills so much useless
 *  functionality. no thought has been put into this design."
 *
 *  So the photograph is the room. Everything that was repeated is said
 *  once, in the header. What is left beside the picture is the only
 *  thing an admin can actually do something about: what it is of, when
 *  it was taken, and what it says.
 *
 *  THE QUESTIONS ARE THE CONTRIBUTE ROOM'S OWN, imported rather than
 *  rebuilt (../../collection/photo-questions). Three rooms now ask them
 *  -- contribute, edit, review -- and a seventh bucket or a change to
 *  what the date box understands has to reach all three. The only
 *  reliable way to make that true is for there to be one form.
 *
 *  TWO PILES, AND THEY ARE NOT THE SAME JOB.
 *    Waiting  -> Approve or Decline. A judgement about whether a
 *                photograph belongs in the Collection.
 *    Set aside -> the same decision, put off. "not approve not decline
 *                and I don't want it to show as pending. just keep it for
 *                later" (owner, 2026-09-15). Off every waiting count.
 *    Undated  -> Save. Clerical work on photographs that are already in
 *                it, because 18 of the first 21 have no date at all.
 *  The owner drew that line himself: "approval is not just for year,
 *  it's also for suitability of the photo and everything else." So
 *  nothing here ever makes a date a condition of approval. There is no
 *  nag, no confirm and no refusal on an empty year box.
 *
 *  DECLINE IS THE ONE IRREVERSIBLE THING IN THE ROOM. It erases the row
 *  and purges the bytes; there is no undo anywhere in the product. In
 *  the old list it was a single click, which was survivable at one
 *  decision a minute. In a room built for a queue of two hundred, with
 *  a thumb-swipe bound to it, it is not -- so it asks a second time, in
 *  place, on the button itself. No dialog: a modal per decline would
 *  cost the speed the room exists for, and a button that changes its
 *  own mind for four seconds is enough deliberation to stop a slip.
 *
 *  THE REASON RIDES ON THAT SECOND PRESS. Arming opens a box above the
 *  buttons for a note to the contributor; leave it empty and the second
 *  press declines exactly as before. The owner, 2026-09-21: "only if I
 *  want I don't want to click another button each time". So the box
 *  costs nothing when unused, and it is never focused for you -- "d"
 *  twice must still decline, not type a "d" into it.
 * ------------------------------------------------------------------ */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { m, AnimatePresence, useMotionValue, useTransform, type MotionValue } from "motion/react";
import { ArrowLeft, ArrowRight, Check, ImageOff, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MetaDots } from "@/components/common/meta-dots";
import { SegmentedPills } from "@/components/common/segmented-pills";
import { EASE_OUT_SMOOTH } from "@/components/common/motion";
import {
  answersFor,
  EMPTY_ANSWERS,
  PhotoQuestions,
  type PhotoAnswers,
} from "@/components/collection/photo-questions";
import { FileSays } from "@/components/collection/file-says";
import { callAction } from "@/lib/call-action";
import { tidyCaption } from "@/lib/caption-tidy";
import { DECLINE_REASON_MAX, photoDate, yearUnreadable } from "@/lib/collection";
import { cn, formatTimeAgo, valleyYear } from "@/lib/utils";
import type { ReviewCounts, ReviewMode, ReviewPhoto } from "@/lib/admin-review";
import { declineReview, saveReview } from "@/app/(main)/admin/review/actions";

/** The stage's ground. The same warm ink the Collection's own viewer uses
 *  (components/common/image-viewer.tsx), and for the same reason: a
 *  photograph is judged against a neutral dark ground, and anything warm
 *  behind a contained picture reads as a stain on it. Two rooms looking at
 *  one photograph should be looking at it on one material. */
const STAGE = "rgba(24, 25, 20, 0.94)";

/** How far a thumb has to travel before a swipe is a decision.
 *
 *  Deliberately further than the contribute stage's 70px, which is the same
 *  gesture doing something else: there, a swipe moves to the next photograph
 *  and a mis-swipe costs one swipe back. Here it approves or declines, and one
 *  of those cannot be taken back. A decision should cost more travel than a
 *  page turn. */
const SWIPE_PX = 110;
const SWIPE_VELOCITY = 560;

/** How long Decline stays armed before it forgets it was asked. Long enough
 *  to move a thumb to the second press, short enough that walking away from
 *  the screen never leaves a loaded gun on it. */
const ARMED_MS = 4000;

export function ReviewRoom({
  mode,
  photos,
  counts,
  capped,
}: {
  mode: ReviewMode;
  photos: ReviewPhoto[];
  counts: ReviewCounts;
  /** True when the pile is longer than what was loaded, so the room can say so
   *  rather than looking finished when it is not. */
  capped: boolean;
}) {
  const router = useRouter();
  /** Waiting and Set aside both end in Approve or Decline; Undated only saves. */
  const deciding = mode !== "undated";

  /* The pile is LOCAL and shrinks as decisions are made. A router.refresh()
     per decision would refetch sixty rows and re-render the whole room between
     one photograph and the next, which is the thing that makes a queue feel
     like work. The server is told (the actions revalidate); this just does not
     wait to be told back. */
  const [pile, setPile] = useState(photos);
  const [at, setAt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [armed, setArmed] = useState(false);
  /* The optional note that goes with a decline, and whether the admin is in
     the box writing it -- the armed timer waits for a person who is typing. */
  const [reason, setReason] = useState("");
  const [writing, setWriting] = useState(false);

  /* Edits keyed by photograph, so walking back with the left arrow finds what
     you typed still there. Seeded lazily: a pile of sixty should not build
     sixty answer objects for the fifty-nine nobody will touch. */
  const [edits, setEdits] = useState<Record<string, PhotoAnswers>>({});

  const showing = pile[at] ?? null;
  const total = pile.length;

  /* The caption as the room will save it: tidied on the way in, so what is on
     screen IS what a press writes. Nothing is corrected behind anybody's back
     -- see the note at the top of lib/caption-tidy.ts. */
  const answers: PhotoAnswers = useMemo(() => {
    if (!showing) return EMPTY_ANSWERS;
    return (
      edits[showing.id] ?? {
        ...answersFor(showing),
        caption: tidyCaption(showing.caption),
      }
    );
  }, [showing, edits]);

  const answer = useCallback(
    (patch: Partial<PhotoAnswers>) => {
      if (!showing) return;
      setEdits((prev) => ({ ...prev, [showing.id]: { ...answers, ...patch } }));
    },
    [showing, answers]
  );

  /* Disarming forgets the reason too: it was written about THIS photograph. */
  const disarm = useCallback(() => {
    setArmed(false);
    setReason("");
  }, []);

  /* Any move at all disarms Decline. Arming is about THIS photograph; carrying
     it to the next one would be the exact accident it exists to prevent. */
  const go = useCallback(
    (next: number) => {
      disarm();
      setAt(() => Math.min(Math.max(next, 0), Math.max(0, total - 1)));
    },
    [total, disarm]
  );

  /** Take one out of the pile and land on whatever moved up into its place. */
  const drop = useCallback((id: string) => {
    disarm();
    setPile((prev) => {
      const next = prev.filter((p) => p.id !== id);
      setAt((i) => Math.min(i, Math.max(0, next.length - 1)));
      return next;
    });
  }, [disarm]);

  /* The next photograph's bytes, fetched while this one is being looked at.
     These are full-size images, so the difference between a warmed cache and a
     cold one is the difference between the room feeling instant and feeling
     like a slideshow on a bad connection. Only ONE ahead: sixty full-size
     preloads would be worse than the problem. */
  useEffect(() => {
    const next = pile[at + 1];
    if (!next) return;
    const img = new window.Image();
    img.src = next.url;
  }, [pile, at]);

  const decide = useCallback(
    async (kind: "approve" | "save" | "decline" | "aside" | "back") => {
      if (!showing || busy) return;
      setBusy(true);
      const id = showing.id;
      try {
        if (kind === "decline") {
          const res = await callAction(() => declineReview(id, reason.trim() || undefined));
          if ("error" in res && res.error) {
            toast.error(res.error);
            return;
          }
          drop(id);
          toast.success("Declined. The contributor has been told.");
          return;
        }

        /* The same refusal the contribute room makes, for the same reason: a
           year this cannot read must not be filed as "no year given". */
        if (yearUnreadable(answers, valleyYear())) {
          toast.error(`"${answers.year}" is not a year we can file. Four digits for a year, three for a decade.`);
          return;
        }

        const res = await callAction(() =>
          saveReview({
            id,
            action: kind,
            answers: {
              caption: answers.caption.trim(),
              buckets: answers.buckets,
              /* The one date rule, out of lib/collection.ts, exactly as the
                 contribute paths and the edit dialog encode it. */
              ...photoDate(answers, valleyYear()),
            },
          })
        );
        if ("error" in res && res.error) {
          toast.error(res.error);
          return;
        }
        drop(id);
        toast.success(TOAST[kind]);
      } finally {
        setBusy(false);
      }
    },
    [showing, answers, busy, drop, reason]
  );

  /* Decline asks twice. The first press arms it and the button says so; the
     second, within four seconds, does it. */
  const declinePressed = useCallback(() => {
    if (armed) {
      void decide("decline");
      return;
    }
    setArmed(true);
  }, [armed, decide]);

  /* The timer stands down while a reason is being written or has been: four
     seconds is time to reach a second press, not to compose a sentence. */
  useEffect(() => {
    if (!armed || writing || reason) return;
    const t = setTimeout(disarm, ARMED_MS);
    return () => clearTimeout(t);
  }, [armed, at, writing, reason, disarm]);

  /* THE KEYBOARD, which is half of what the owner asked for on a computer.
     Bound on the window rather than on a focused element, because the natural
     place for a cursor in this room is the description box and a shortcut that
     only works when nothing is focused works nowhere. Which is also why every
     binding stands down while a field HAS focus: "d" belongs to the caption
     the moment somebody is typing one. */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;

      /* Somebody is writing a caption. EVERY binding stands down, arrows
         included: left and right belong to the caret first, and a room that
         changed the photograph while you were fixing a word in its
         description would be unusable for the one job it exists for. */
      const typing =
        Boolean(el?.isContentEditable) ||
        el?.tagName === "INPUT" ||
        el?.tagName === "TEXTAREA" ||
        el?.closest("[role='dialog']") != null;

      /* Escape disarms from anywhere, because the armed Decline is the one
         state somebody might urgently want out of. */
      if (e.key === "Escape" && armed) {
        disarm();
        return;
      }
      if (typing) return;

      if (e.key === "ArrowRight") {
        e.preventDefault();
        go(at + 1);
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        go(at - 1);
        return;
      }

      /* Enter belongs to whatever is focused if that thing answers to Enter.
         Without this, tabbing to "Use it" and pressing Enter took the file's
         date AND approved the photograph in one keystroke -- two acts from
         one press, and the second one irreversible in the pile next door. */
      const onAControl = el?.closest("button, a, [role='checkbox'], select") != null;
      if (e.key === "Enter" && onAControl) return;

      if (e.key === "Enter" || e.key.toLowerCase() === "a") {
        e.preventDefault();
        void decide(deciding ? "approve" : "save");
      }
      if (e.key.toLowerCase() === "d" && deciding) {
        e.preventDefault();
        declinePressed();
      }
      if (e.key.toLowerCase() === "s" && mode === "waiting") {
        e.preventDefault();
        void decide("aside");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [at, go, decide, declinePressed, mode, deciding, armed, disarm]);

  /* The drag, and the two tints it drives. `x` is read by the overlays rather
     than by state, so leaning on a photograph costs no re-render of a panel
     holding a form. */
  const x = useMotionValue(0);
  const approveTint = useTransform(x, [0, SWIPE_PX], [0, 0.85]);
  const declineTint = useTransform(x, [-SWIPE_PX, 0], [0.85, 0]);

  const primaryLabel = deciding ? "Approve" : "Save";
  const dirty = Boolean(showing && edits[showing.id]);

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col gap-4">
      <Header
        mode={mode}
        counts={counts}
        at={at}
        total={total}
        capped={capped}
        onMode={(next) => router.push(`/admin/review?pile=${next}`)}
        onGo={go}
      />

      {!showing ? (
        <Done mode={mode} counts={counts} />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row lg:gap-6">
          {/* THE STAGE. `min-h-0` on both axes of the chain is what lets it
              actually shrink to the window instead of pushing the buttons off
              the bottom of a laptop screen -- a flex child's default
              `min-height: auto` refuses to go below its content, and the
              content here is a full-size photograph. */}
          <div
            className="relative min-h-[44svh] flex-1 overflow-hidden rounded-[var(--radius-lg)] lg:min-h-0"
            style={{ background: STAGE }}
          >
            <m.div
              /* A PLAIN BLOCK, not `grid place-items-center`, and that is the
                 whole of the portrait fix. As a grid item the picture sat in
                 an auto-sized track, so the track sized itself to the picture
                 and every percentage height the picture asked for resolved
                 against its own height -- no constraint. Here the box is
                 definite (absolute inset-0, minus the padding), the image
                 fills it outright, and `object-contain` centres and
                 letterboxes inside it with nothing left to resolve. */
              className="absolute inset-0 p-3 sm:p-5"
              style={{ x }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.5}
              dragDirectionLock
              dragTransition={{ bounceStiffness: 600, bounceDamping: 60 }}
              onDragEnd={(_, info) => {
                const right = info.offset.x > SWIPE_PX || info.velocity.x > SWIPE_VELOCITY;
                const left = info.offset.x < -SWIPE_PX || info.velocity.x < -SWIPE_VELOCITY;
                /* Right is the safe one and it acts. Left ARMS rather than
                   declines: a swipe that erased a photograph and its bytes
                   with no second thought is the one gesture this room must not
                   have. The button beside it is already asking. */
                if (right) void decide(deciding ? "approve" : "save");
                else if (left && deciding) setArmed(true);
              }}
            >
              <AnimatePresence mode="wait" initial={false}>
                <m.img
                  key={showing.id}
                  src={showing.url}
                  alt=""
                  draggable={false}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18, ease: EASE_OUT_SMOOTH }}
                  /* `h-full w-full`, NOT `max-h-full max-w-full`.
                     A percentage max-height only resolves against a parent
                     whose height is definite, and this one's is not: the image
                     is centred in an auto-sized track, so the track sizes
                     itself to the image and `max-h-full` becomes the image's
                     own height -- no constraint at all. Width was still capped,
                     so a LANDSCAPE photograph looked perfect and hid the bug;
                     a PORTRAIT one rendered at its natural height, overflowed,
                     and the stage's overflow-hidden cropped it (owner:
                     "portrait photos show halfway in the viewer").

                     Filling the box outright and letting `object-contain` do
                     the letterboxing needs no percentage to resolve at all. */
                  className="h-full w-full rounded-[var(--radius-sm)] object-contain"
                  /* No centring class anywhere: `object-contain` defaults to
                     object-position 50% 50%, so the picture is already centred
                     in the box it fills. */
                />
              </AnimatePresence>
            </m.div>

            {/* What the thumb is about to do, drawn while it is still
                deciding. Opacity only, driven straight off the drag. */}
            <Verdict side="right" opacity={approveTint} label="Approve" tone="canopy" />
            {deciding && (
              <Verdict side="left" opacity={declineTint} label="Decline" tone="heart" />
            )}
            <Resolution width={showing.width} height={showing.height} />
          </div>

          {/* THE PANEL. 380px, which is what the six bucket tiles were drawn
              for -- the contribute pop-up gives them 360 and the tiles land at
              115px each, comfortably past the 44px target. */}
          <div className="flex w-full shrink-0 flex-col lg:min-h-0 lg:w-[380px]">
            {/* NO `overflow-hidden` HERE, however much the rounded corners want
                it. An ancestor with overflow hidden or clip silently kills
                `position: sticky` in every browser -- the sticky element gets
                that box as its scrollport, and since the box does not scroll,
                it never sticks. That cost the phone its Approve button once
                already. The footer rounds its own two corners instead. */}
            <div className="flex min-h-0 flex-1 flex-col rounded-[var(--radius-lg)] border border-border bg-card">
              {/* Scrolls on a laptop, where the card is pinned to the stage's
                  height. On a phone it does not: an inner scroll area inside a
                  page that also scrolls is two scrollbars fighting over one
                  thumb. */}
              <div className="min-h-0 flex-1 p-4 lg:overflow-y-auto">
                <Provenance photo={showing} />
                <FileSays
                  date={showing.exifYear ? { year: showing.exifYear, month: showing.exifMonth } : null}
                  answers={answers}
                  onAnswer={answer}
                  className="mt-3"
                />
                <div className="mt-4">
                  <PhotoQuestions
                    idPrefix={`review-${showing.id}`}
                    value={answers}
                    onAnswer={answer}
                  />
                </div>
              </div>

              {/* THE ACTIONS ARE THE CARD'S FOOTER, and that is two fixes.
                  On a laptop the stage is ~680px tall and the questions are
                  ~390px, so floating the buttons under the card left 220px of
                  blank paper inside a bordered box with the two most-pressed
                  controls in the room orphaned below it. Pinned to the foot,
                  the card ends flush with the photograph and the actions are
                  always in the same place whatever the questions do.

                  `sticky` is the phone. There the column is not height-bounded
                  -- the page scrolls -- so the footer sat below the fold and
                  Approve could not be reached without scrolling past the
                  thing being approved. */}
              <div className="sticky bottom-0 mt-auto rounded-b-[calc(var(--radius-lg)-1px)] border-t border-border bg-card p-3">
                {/* Above the buttons, so opening it grows the footer upward and
                    Decline stays exactly where the first press found it. */}
                {armed && deciding && (
                  <m.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.16, ease: EASE_OUT_SMOOTH }}
                    className="mb-2.5"
                  >
                    <Input
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      onFocus={() => setWriting(true)}
                      onBlur={() => setWriting(false)}
                      onKeyDown={(e) => {
                        /* Enter from the box is the second press. */
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void decide("decline");
                        }
                      }}
                      maxLength={DECLINE_REASON_MAX}
                      placeholder="Reason for them, if you want to give one"
                      aria-label="Reason, sent to the contributor (optional)"
                      disabled={busy}
                    />
                  </m.div>
                )}
                <Decide
                  mode={mode}
                  busy={busy}
                  armed={armed}
                  dirty={dirty}
                  primaryLabel={primaryLabel}
                  onPrimary={() => decide(deciding ? "approve" : "save")}
                  onDecline={declinePressed}
                  onSkip={() => go(at + 1)}
                  onPark={() => decide(mode === "waiting" ? "aside" : "back")}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  Everything the old list repeated on every row, said once.
 * ------------------------------------------------------------------ */
function Header({
  mode,
  counts,
  at,
  total,
  capped,
  onMode,
  onGo,
}: {
  mode: ReviewMode;
  counts: ReviewCounts;
  at: number;
  total: number;
  capped: boolean;
  onMode: (mode: ReviewMode) => void;
  onGo: (next: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-3 lg:gap-x-4">
      <SegmentedPills
        segments={[
          { key: "waiting", label: "Waiting", count: counts.waiting },
          { key: "aside", label: "Set aside", count: counts.aside },
          { key: "undated", label: "Undated", count: counts.undated },
        ]}
        value={mode}
        onChange={onMode}
        ariaLabel="Which pile to work through"
        layoutId="review-pile"
        className="bg-card"
      />

      {total > 0 && (
        <div className="flex items-center gap-1">
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="The one before"
            disabled={at === 0}
            onClick={() => onGo(at - 1)}
          >
            <ArrowLeft className="size-4" strokeWidth={2} />
          </Button>
          <span className="min-w-[3.25rem] text-center text-[12.5px] tabular-nums text-muted-foreground">
            {at + 1} of {total}
            {capped ? "+" : ""}
          </span>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="The next one"
            disabled={at >= total - 1}
            onClick={() => onGo(at + 1)}
          >
            <ArrowRight className="size-4" strokeWidth={2} />
          </Button>
        </div>
      )}

      {/* The shortcuts, said where they are used and only where a keyboard
          exists to use them. */}
      {/* `gap-1.5`, because `.dotsep` carries no horizontal margin of its own --
          it is a 0.23em circle that relies on its flex parent for the air
          either side of it. Without the gap the hint read "to move·A approve".
          See the dot's note in globals.css. */}
      <p className="ml-auto hidden items-center gap-1.5 text-[12px] text-muted-foreground lg:flex">
        <MetaDots
          parts={[
            <>
              <Key>←</Key> <Key>→</Key> to move
            </>,
            <>
              <Key>A</Key> {mode === "undated" ? "save" : "approve"}
            </>,
            mode !== "undated" && (
              <>
                <Key>D</Key> decline
              </>
            ),
            mode === "waiting" && (
              <>
                <Key>S</Key> set aside
              </>
            ),
          ]}
        />
      </p>
    </div>
  );
}

const Key = ({ children }: { children: React.ReactNode }) => (
  <kbd className="rounded-[4px] border border-border bg-card px-1 py-px font-sans text-[11px] text-foreground">
    {children}
  </kbd>
);

/** Who sent it and when they sent it. One line, and the only place in the room
 *  either fact appears -- it was on every row of the list it replaces. */
function Provenance({ photo }: { photo: ReviewPhoto }) {
  return (
    <p className="flex flex-wrap items-baseline gap-x-2 text-[13px]">
      <Link
        href={`/admin/people/${photo.uploaderId}`}
        className="rounded-sm font-medium text-foreground underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        {photo.uploaderName}
      </Link>
      <span className="text-muted-foreground">{formatTimeAgo(new Date(photo.createdAt))}</span>
      {photo.scope === "class" && (
        <span className="text-[12px] text-muted-foreground">
          · the {photo.classYears} class only
        </span>
      )}
    </p>
  );
}

/** The photograph's pixel size, on the stage rather than in the panel: it is a
 *  fact about the picture, read while looking at the picture. Still while the
 *  photograph is dragged, and never in the way of the drag. Rows from before
 *  dimensions were recorded carry 0 and say nothing. */
function Resolution({ width, height }: { width: number; height: number }) {
  if (!width || !height) return null;
  const mp = (width * height) / 1_000_000;
  return (
    <span className="pointer-events-none absolute top-3 left-3 rounded-full bg-[rgba(24,25,20,0.72)] px-2.5 py-1 text-[11.5px] font-medium tabular-nums text-[rgba(250,248,242,0.88)] sm:top-5 sm:left-5">
      {width} × {height}
      <span className="text-[rgba(250,248,242,0.6)]"> · {mp < 10 ? mp.toFixed(1) : Math.round(mp)} MP</span>
    </span>
  );
}

/** The tint that rises under a thumb mid-swipe. */
function Verdict({
  side,
  opacity,
  label,
  tone,
}: {
  side: "left" | "right";
  opacity: MotionValue<number>;
  label: string;
  tone: "canopy" | "heart";
}) {
  return (
    <m.div
      aria-hidden
      style={{ opacity }}
      className={cn(
        /* Not `lg:hidden`. The drag works with a mouse as well as a thumb, and
           an approval with no feedback on the way to it is worse on the big
           screen, not better -- there is more room for the pointer to wander. */
        "pointer-events-none absolute inset-y-0 grid w-1/2 place-items-center",
        side === "right" ? "right-0" : "left-0"
      )}
    >
      <span
        className={cn(
          "rounded-full px-4 py-2 text-sm font-semibold text-white shadow-[0_2px_10px_rgba(30,28,22,0.4)]",
          tone === "canopy" ? "bg-canopy" : "bg-heart"
        )}
      >
        {label}
      </span>
    </m.div>
  );
}

/* ------------------------------------------------------------------ *
 *  The two big targets, which is the other half of what was asked for.
 *
 *  A ROW on a phone and a row on a laptop: they are two answers to one
 *  question and stacking them makes the second look like an afterthought
 *  of the first. `h-12` rather than the default `h-10` -- these are the
 *  only controls in the room a person presses hundreds of times, and the
 *  owner asked for "big touch targets" in as many words.
 * ------------------------------------------------------------------ */
function Decide({
  mode,
  busy,
  armed,
  dirty,
  primaryLabel,
  onPrimary,
  onDecline,
  onSkip,
  onPark,
}: {
  mode: ReviewMode;
  busy: boolean;
  armed: boolean;
  dirty: boolean;
  primaryLabel: string;
  onPrimary: () => void;
  onDecline: () => void;
  onSkip: () => void;
  onPark: () => void;
}) {
  return (
    <div className="flex shrink-0 flex-col gap-1.5">
      <div className="flex items-center gap-2.5">
        <Button
          variant="primary"
          disabled={busy || (mode === "undated" && !dirty)}
          onClick={onPrimary}
          className="h-12 flex-1 text-[15px]"
        >
          <Check className="size-4" strokeWidth={2.5} />
          {primaryLabel}
        </Button>

        {mode !== "undated" ? (
          <Button
            variant={armed ? "destructive" : "outline"}
            disabled={busy}
            onClick={onDecline}
            /* The armed state is announced, not only drawn: a screen reader
               hears the button change its mind the same way the eye does. */
            aria-label={armed ? "Press again to decline for good" : "Decline"}
            className={cn("h-12 flex-1 text-[15px]", armed && "font-semibold")}
          >
            {armed ? (
              "Really decline?"
            ) : (
              <>
                <X className="size-4" strokeWidth={2.5} />
                Decline
              </>
            )}
          </Button>
        ) : (
          <Button variant="outline" disabled={busy} onClick={onSkip} className="h-12 flex-1 text-[15px]">
            Skip
          </Button>
        )}
      </div>
      {/* PUTTING IT OFF IS QUIETER THAN DECIDING. A ghost, full width, under
          the two answers: it is pressed a handful of times a month, not
          hundreds, and a third h-12 target in a 380px row would crowd the two
          that are. */}
      {mode !== "undated" && (
        <Button variant="ghost" disabled={busy} onClick={onPark} className="h-10 w-full text-[13.5px]">
          {mode === "waiting" ? "Set aside for later" : "Put back in Waiting"}
        </Button>
      )}
    </div>
  );
}

const TOAST = {
  approve: "In the Collection.",
  save: "Saved.",
  aside: "Set aside. It is off the Waiting pile.",
  back: "Back in Waiting.",
} as const;

/** The pile is empty. Says so, and points at the next pile if it is not.
 *
 *  No celebration and no mascot: this is a room somebody works in, and the
 *  fifth time you clear a queue a party is an obstacle between you and the
 *  next thing. Set aside and Undated both point at Waiting; Waiting points at
 *  Undated, the backlog that is always there. */
function Done({ mode, counts }: { mode: ReviewMode; counts: ReviewCounts }) {
  const next: ReviewMode = mode === "waiting" ? "undated" : "waiting";
  const other = counts[next];
  return (
    <div className="grid flex-1 place-items-center rounded-[var(--radius-lg)] border border-border bg-card p-10">
      <div className="flex max-w-sm flex-col items-center gap-3 text-center">
        <ImageOff className="size-6 text-muted-foreground" strokeWidth={1.5} aria-hidden />
        <p className="text-[15px] font-medium text-foreground">{DONE[mode]}</p>
        {other > 0 && (
          <Button variant="outline" render={<Link href={`/admin/review?pile=${next}`} />}>
            {next === "undated"
              ? `${other} in the Collection have no date`
              : `${other} waiting to be reviewed`}
          </Button>
        )}
      </div>
    </div>
  );
}

const DONE: Record<ReviewMode, string> = {
  waiting: "Nothing is waiting.",
  aside: "Nothing is set aside.",
  undated: "Everything in the Collection has a date.",
};
