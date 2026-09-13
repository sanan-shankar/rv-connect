"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MagnifyingGlassIcon, XIcon } from "@phosphor-icons/react";
import { AnimatePresence, m } from "motion/react";
import { EASE_OUT_SMOOTH } from "@/components/common/motion";
import { FIELD_FOCUS_WITHIN } from "@/components/ui/field-focus";
import { cn } from "@/lib/utils";

/**
 * SearchPill: the header search affordance. It rests as a magnifying glass in
 * a paper circle, the same circle as the bell beside it, and opens by
 * stretching that circle leftward into a pill you write in.
 *
 * By default it searches POSTS and submits to `/feed?q=`. A name typed there
 * matches posts by their AUTHOR (owner, 2026-08-04), which is still a search
 * for posts; searching for a PERSON is the directory's job.
 *
 * Pass `value`/`onChange` and it becomes a controlled, live box instead --
 * every keystroke goes to the caller and nothing navigates. That is what the
 * Collection's river and the directory use (Collection spec sec. 6: search is
 * an icon on the title line that opens into a field, not a bar eating a whole
 * row). There is exactly one expansion in the app; a second copy would be
 * springs nobody would remember to keep in step.
 *
 * THREE VERSIONS, AND WHY THIS ONE.
 * 1. A 40px circle grew into a 320px pill on a bouncing spring while the glass
 *    rode the moving left edge and the text faded in once it arrived. Owner,
 *    2026-08-30: "the speed and just the overall un-calm nature of it. It's
 *    not neat." Three things moving, on two different springs.
 * 2. A bare glass that drew a rule leftward, words settling onto it (picked
 *    from seven at /lab/search, `git show 6fbf46d`). Calm, but the only
 *    header control with no circle. Owner, 2026-09-14: "everything else is in
 *    a circle and this is just hanging. this is too different particularly
 *    sometimes on a textured [background]."
 * 3. This: version 1's SHAPE on version 2's MOTION. One thing moves -- the
 *    paper's width, on one decelerating curve, no spring -- and the glass
 *    never travels a pixel, so it is still under your finger when the pill
 *    finishes. The opaque fill is also what the textured backgrounds needed.
 */

/* Slowed three times at the owner's word: 2026-08-30 "ship D slower", then
   "make the expansion 20% slower" (0.42 -> 0.5), then on the pill, 2026-09-14,
   "make the expansion 20% slower and the compression the same as expansion"
   (0.5 -> 0.6, both ways). Pure deceleration, so the edge is still moving
   when the eye picks it up and then settles, rather than arriving and
   bouncing.

   Closing used to be quicker than opening (the account menu's rule). The pill
   dropped it on his instruction: a paper shape shrinking at twice the speed it
   grew read as a snap, where the old hairline retracting fast did not. */
const OPEN_SECONDS = 0.6;
const CLOSE_SECONDS = OPEN_SECONDS;

/* The words fade in behind the moving edge rather than with it, at a fixed
   share of the open (0.38 of the way in, over the next 0.58), so the two stay
   one gesture whenever the number above changes. By then the pill is most of
   the way out, so the words land in space that already exists instead of
   racing it. Out fast, so the pill never closes around live text. */
const INK_IN_DELAY = OPEN_SECONDS * 0.38;
const INK_IN_SECONDS = OPEN_SECONDS * 0.58;
const INK_OUT_SECONDS = 0.12;

/* How far the pill runs: 300px, or the whole width of the page's content
   column when that is less. The glass is inside it.

   Measured against the header it sits in, whose left edge IS the column's
   left edge -- the same line the page title and every row below it start on
   (owner, 2026-08-30: "Why not extend it to the left border of the UI"). On a
   phone the pill reaches it exactly; on a desktop 300 wins, because a field
   the width of a 1100px header is not a field.

   Measured rather than expressed in CSS because the text inside is laid out
   at this width too: a fixed inner width inside a vw-clamped outer one
   silently cuts the first word off the placeholder. */
const FULL_WIDTH = 300;
const GLASS_WIDTH = 40;

export function SearchPill({
  value: controlled,
  onChange,
  placeholder = "Search posts or a name",
  label = "Search posts, by their words or by who wrote them",
  restLabel = "Search posts",
}: {
  /** Controlled mode: the caller owns the text and gets every keystroke. */
  value?: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  /** The expanded input's accessible name. */
  label?: string;
  /** The resting glass's accessible name, before it is opened. */
  restLabel?: string;
} = {}) {
  const router = useRouter();
  const live = onChange !== undefined;
  /* Opens itself when the caller arrives already holding a query: a shared
     link to /collection?q=banyan must show what it searched for, not a closed
     glass with a filtered river under it. A lazy initial value rather than an
     effect, so it is open on the first paint and never flickers shut. */
  const [open, setOpen] = useState(() => live && Boolean(controlled));
  const [internal, setInternal] = useState("");
  const value = live ? (controlled ?? "") : internal;
  const setValue = live ? onChange : setInternal;
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  /* The pill's length, measured off the header. Starts at the full design
     width so the server and the first client render agree, then corrects
     after mount -- the field is closed at that point, so nothing is seen to
     change. All three callers put this inside <PageHeader>'s <header>; if one
     ever does not, it falls back to the design width rather than to nothing. */
  const [full, setFull] = useState(FULL_WIDTH);
  useEffect(() => {
    function measure() {
      const wrap = wrapRef.current;
      const column = wrap?.closest("header");
      if (!wrap || !column) return;
      const reach =
        wrap.getBoundingClientRect().right -
        column.getBoundingClientRect().left;
      setFull(Math.min(FULL_WIDTH, Math.round(reach)));
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus({ preventScroll: true });
  }, [open]);

  // Collapse when clicking away with no query.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (
        wrapRef.current &&
        !wrapRef.current.contains(e.target as Node) &&
        !value
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, value]);

  function submit() {
    // Live mode has already reported every keystroke; Enter has nothing left
    // to do and must not navigate away from the river it is filtering.
    if (live) return;
    const q = value.trim();
    if (!q) return;
    router.push(`/feed?q=${encodeURIComponent(q)}`);
  }

  return (
    /* data-search-open is read by PageHeader, which fades the page title out
       from under an open pill on a phone. See the note there. */
    <div
      ref={wrapRef}
      data-search-open={open || undefined}
      className="relative h-10 w-10"
    >
      {/* Right-anchored and absolutely placed, so opening never reflows the
          header row it sits in. It grows leftward into the gap between the
          page title and the actions. */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="absolute right-0 top-0 z-20 h-10"
      >
        {/* The paper. The bell's exact circle at rest (border, card fill, the
            same 1px shadow), and the only thing that animates: its width, on
            one curve. `rounded-full` holds a true semicircle at each end on
            every frame, so it is a circle becoming a pill, never a rounded
            box. It carries the shared focus edge because it is now a field
            with a border like every other: a click tints it, Tab gets the
            2px inset edge. The glass is its sibling, not its child, so
            focusing the glass does not light the field. */}
        <m.div
          initial={false}
          animate={{ width: open ? full : GLASS_WIDTH }}
          transition={{
            duration: open ? OPEN_SECONDS : CLOSE_SECONDS,
            ease: EASE_OUT_SMOOTH,
          }}
          className={cn(
            "absolute right-0 top-0 h-10 overflow-hidden rounded-full border border-border bg-card shadow-[0_1px_2px_rgba(30,28,22,0.04)] transition-[border-color,box-shadow] duration-150 ease-out",
            FIELD_FOCUS_WITHIN,
          )}
        >
          {/* Mounted only while open, and this is not a detail. Laid out at
              the final width from its first frame, it never reflows as the
              pill grows -- the paper uncovers it. But left mounted while
              CLOSED it is a 260px-wide box with nothing in it, invisible
              because the paper clips it, and still real to anything that reads
              geometry: the visual suite walks <main> marking every element
              that starts more than 50px down, and a phantom box in the header
              moved the mask by 260px on two routes (2026-08-30). */}
          <AnimatePresence initial={false}>
            {open && (
              <m.div
                key="field"
                initial={{ opacity: 0 }}
                animate={{
                  opacity: 1,
                  transition: {
                    duration: INK_IN_SECONDS,
                    ease: "easeOut",
                    delay: INK_IN_DELAY,
                  },
                }}
                exit={{
                  opacity: 0,
                  transition: { duration: INK_OUT_SECONDS, ease: "easeOut" },
                }}
                /* -2px for the two borders; the right padding keeps the
                   words and the × clear of the glass that sits over the
                   pill's right end. */
                className="absolute right-0 top-0 flex h-[38px] items-center gap-1.5 pl-4 pr-10"
                style={{ width: full - 2 }}
              >
                <input
                  ref={inputRef}
                  value={value}
                  onChange={(e) => setValue?.(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setValue?.("");
                      setOpen(false);
                    }
                  }}
                  placeholder={placeholder}
                  aria-label={label}
                  className="min-w-0 flex-1 bg-transparent text-[13.5px] text-foreground outline-none placeholder:text-muted-foreground/75"
                />

                {/* The way OUT, for a finger. Escape has always cleared and closed
                this, and on a keyboard that was enough; on a phone a field
                holding a query could only be emptied by selecting the text and
                deleting it, and until it was empty it would not collapse. The
                directory made that plain (2026-08-28): with a search live and
                no facet set, the count line has no "Clear all" to offer
                either, so this was the only escape and it did not exist. */}
                <AnimatePresence>
                  {value && (
                    <m.button
                      key="clear"
                      type="button"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.14, ease: "easeOut" }}
                      onClick={() => {
                        setValue?.("");
                        setOpen(false);
                        if (!live) inputRef.current?.focus();
                      }}
                      aria-label="Clear the search"
                      className="state-layer grid size-6 shrink-0 place-items-center rounded-full text-muted-foreground transition-transform hover:text-foreground active:scale-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      <XIcon weight="bold" size={12} />
                    </m.button>
                  )}
                </AnimatePresence>
              </m.div>
            )}
          </AnimatePresence>
        </m.div>

        {/* The glass. It never moves and it never changes size in either
            state, which is the whole point: the thing you pressed is still
            under your finger when the pill finishes. It sits over the
            paper's right end rather than inside it, so its focus ring is
            not clipped by the paper's overflow. The hover tint is the bell's
            `state-layer`, and only at rest: once open, the circle it would
            light is half of a pill, and a tinted disc inside a field reads
            as a second control. */}
        <button
          type="button"
          onClick={() => {
            /* Open, or close an empty one. A field holding a live query is
               never thrown away by the control that opened it -- the × and
               Escape are how a query goes -- so with text in it this just
               puts the caret back. */
            if (!open) setOpen(true);
            else if (!value) setOpen(false);
            else inputRef.current?.focus();
          }}
          aria-label={open ? label : restLabel}
          aria-expanded={open}
          className={cn(
            "relative grid size-10 shrink-0 place-items-center rounded-full transition-[color,transform] duration-150 ease-out",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
            open
              ? "text-primary"
              : "state-layer text-muted-foreground hover:text-foreground active:scale-95",
          )}
        >
          <MagnifyingGlassIcon
            weight="regular"
            size={17}
            stroke="currentColor"
            strokeWidth={6}
            /* The glyph's handle hangs bottom-right, so its bounding box sits
               a hair right of its optical centre. Three quarters of a pixel
               back is the correction, measured against the rendered pixels. */
            className="pointer-events-none block -translate-x-[0.75px]"
          />
        </button>
      </form>
    </div>
  );
}
