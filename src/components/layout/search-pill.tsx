"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MagnifyingGlassIcon, XIcon } from "@phosphor-icons/react";
import { AnimatePresence, m } from "motion/react";
import { EASE_OUT_SMOOTH } from "@/components/common/motion";
import { cn } from "@/lib/utils";

/**
 * SearchPill: the header search affordance. It rests as a bare magnifying
 * glass and opens into a line you write on. No box grows, because there is
 * no box.
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
 * WHY IT IS A LINE (owner, 2026-08-30). The version before this grew a 40px
 * circle into a 320px pill on a bouncing spring while the magnifying glass
 * rode the moving left edge the whole way and the text faded in once it
 * arrived: "the speed and just the overall un-calm nature of it. It's not
 * neat." Three things moving, one of them the size of the box, on two
 * different springs. The reference he reached for was the account menu in the
 * sidebar, which never animates a size at all -- its rows appear into space
 * that was already free.
 *
 * Seven answers were built side by side in a real header row and this one
 * won. They lived at /lab/search, deleted the same day on his instruction
 * once the pick was made; `git show 6fbf46d` is the whole room if the
 * question ever reopens. What this one borrows from the account menu: one
 * thing moves, not three; the glass never travels a pixel; and leaving is
 * much quicker than arriving.
 * What it does instead of appearing-in-place, because a header has no free
 * space to appear into, is draw. A rule extends out from under the glass and
 * the words settle onto it, which is a gesture rather than a mechanic, and it
 * is the only one of the seven that never looked like a widget.
 */

/* Drawing is slower than growing was, on purpose. The old open was 0.32s of
   spring; the owner asked for it slower twice (2026-08-30, "ship D slower",
   then "make the expansion 20% slower"), which is 0.42 x 1.2. Half a second
   of pure deceleration, so the line is still moving when the eye picks it up
   and then settles, rather than arriving and bouncing.

   Only the OPENING is slow. Closing stays at 0.26s, which is the account
   menu's rule and the reason the slow open never feels like a wait: a thing
   should get out of the way faster than it turns up. */
const OPEN_SECONDS = 0.5;
const CLOSE_SECONDS = 0.26;

/* The words fade in behind the drawing line rather than with it, and they
   ride the open at a fixed share of it (0.38 of the way in, over the next
   0.58) so the two stay one gesture whenever the number above changes. By
   then the rule is most of the way out, so the words land on a line that
   already exists instead of racing it. Out fast, so the line never retracts
   around live text. */
const INK_IN_DELAY = OPEN_SECONDS * 0.38;
const INK_IN_SECONDS = OPEN_SECONDS * 0.58;
const INK_OUT_SECONDS = 0.12;

/* The rule under the glass has no width to draw, so it fades instead, across
   the whole opening rather than a slice of it: a hairline appearing under the
   glyph in a quarter of the time reads as a separate event from the line
   leaving it. */
const GLASS_RULE_IN = OPEN_SECONDS * 0.72;
const GLASS_RULE_OUT = 0.16;

/* How far the line runs: 300px, or the whole width of the page's content
   column when that is less. The glass is inside it.

   It used to be 68% of the viewport, which is what the old pill clamped to,
   and on a phone that put the far end of the line at no particular place
   (owner, 2026-08-30: "it doesn't align on the left to anything, you just
   take a random amount. Why not extend it to the left border of the UI"). So
   it is measured against the header it sits in, whose left edge IS the
   column's left edge -- the same line the page title and every row below it
   start on. On a phone the line now reaches it exactly; on a desktop 300
   still wins, because a line the width of a 1100px header is not a field.

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

  /* The rule's length, measured off the header. Starts at the full design
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
  const ruleWidth = full - GLASS_WIDTH;

  /* The keyboard's focus indicator, and the reason it is state rather than a
     class: this field has no border to light, so it is on the borderless list
     in focus-recipe.test.mjs alongside the profile pen, and the rule IS the
     edge. Tab in and it doubles to the 2px WCAG 2.4.13 asks for; click in and
     it stays a hairline, which is the recipe's own split (a pointer user
     never sees the loud edge). `data-modality` is set by <FocusModality> in
     the root layout. */
  const [keyboardFocus, setKeyboardFocus] = useState(false);
  const ruleHeight = keyboardFocus ? "h-0.5" : "h-px";

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
       from under an open line on a phone. See the note there. */
    <div
      ref={wrapRef}
      data-search-open={open || undefined}
      className="relative h-10 w-10"
    >
      {/* Right-anchored and absolutely placed, so opening never reflows the
          header row it sits in. It draws leftward into the gap between the
          page title and the actions. */}
      <m.form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="absolute right-0 top-0 z-20 flex h-10 items-center justify-end"
      >
        {/* The well. Only this animates, and only its width: one property,
            one curve, no spring. Everything inside is laid out at the final
            width from the first frame, so the line uncovers the field rather
            than reflowing it every frame. */}
        <m.div
          animate={{ width: open ? ruleWidth : 0 }}
          transition={{
            duration: open ? OPEN_SECONDS : CLOSE_SECONDS,
            ease: EASE_OUT_SMOOTH,
          }}
          className="relative h-10 overflow-hidden"
        >
          {/* Mounted only while open, and this is not a detail. Laid out at
              the final width from its first frame, it never reflows as the
              line draws -- the well uncovers it. But left mounted while
              CLOSED it is a 260px-wide box with nothing in it, invisible
              because the well clips it, and still real to anything that reads
              geometry: the visual suite walks <main> marking every element
              that starts more than 50px down, and a phantom box in the header
              moved the mask by 260px on two routes (2026-08-30). The old pill
              mounted its input the same way, for none of these reasons. */}
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
                className="absolute right-0 top-0 flex h-10 items-center gap-2"
                style={{ width: ruleWidth }}
              >
                <input
                  ref={inputRef}
                  value={value}
                  onChange={(e) => setValue?.(e.target.value)}
                  onFocus={() =>
                    setKeyboardFocus(
                      document.documentElement.dataset.modality === "keyboard",
                    )
                  }
                  onBlur={() => setKeyboardFocus(false)}
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

          {/* The ink. On the text's baseline, not under the box, because the
              box is not a thing anybody should be able to see. */}
          <span
            aria-hidden
            className={cn(
              "absolute bottom-[7px] left-0 right-0 bg-primary transition-[height] duration-150 ease-out",
              ruleHeight,
            )}
          />
        </m.div>

        {/* The glass. It never moves and it never changes size in either
            state, which is the whole point: the thing you pressed is still
            under your finger when the line finishes. */}
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
            "relative grid size-10 shrink-0 place-items-center rounded-full transition-colors duration-150 ease-out",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
            open
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground active:scale-95",
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
          {/* The rule carries on under the glass, so the line does not stop
              short and leave the glyph floating beside it. `right-1` ends it
              just inside the touch target rather than at its edge. */}
          <m.span
            aria-hidden
            animate={{ opacity: open ? 1 : 0 }}
            transition={{
              duration: open ? GLASS_RULE_IN : GLASS_RULE_OUT,
              ease: "easeOut",
            }}
            className={cn(
              "absolute bottom-[7px] left-0 right-1 bg-primary transition-[height] duration-150 ease-out",
              ruleHeight,
            )}
          />
        </button>
      </m.form>
    </div>
  );
}
