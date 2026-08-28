"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MagnifyingGlassIcon, XIcon } from "@phosphor-icons/react";
import { AnimatePresence, m } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * SearchPill: the header search affordance that replaces the old always-on
 * search + filter row. It rests as a compact 40px icon and expands into a live
 * input on click (as an absolute overlay, so it never reflows the header).
 *
 * By default it searches POSTS and submits to `/feed?q=`. A name typed there
 * matches posts by their AUTHOR (owner, 2026-08-04), which is still a search
 * for posts; searching for a PERSON is the directory's job.
 *
 * Pass `value`/`onChange` and it becomes a controlled, live box instead --
 * every keystroke goes to the caller and nothing navigates. That is what the
 * Collection's river uses (spec sec. 6: search is an icon on the title line
 * that opens into a field, not a bar eating a whole row). The whole of this
 * component is the tuned EXPANSION, and there is exactly one of those in the
 * app: a second copy would be 200 lines of springs nobody would remember to
 * keep in step.
 *
 * The expansion animates real `width`/`padding` values directly (never
 * Motion's `layout` FLIP animation). `layout` interpolates by scaling the box
 * with a transform and un-scaling its children back to size every frame; on
 * an 8x width change like 40px -> 320px that scale/counter-scale is exactly
 * what read as "stretching". Animating the actual CSS values instead means
 * the browser reflows the pill each frame like a normal transition, so nested
 * content (the icon) just glides with it instead of getting warped.
 *
 * Motion feel (per owner): opening is one clean expansion with only a slight,
 * well-damped bounce. Closing has zero overshoot: a critically damped spring
 * that eases to rest with no stretch or wobble. The two directions
 * intentionally use different springs (see constants below). The icon itself
 * is a plain, non-animated element -- it only moves because the parent's
 * padding moves under it (plus its own static right margin when expanded),
 * so it can't be scaled or skewed independently and stays visually centered
 * throughout.
 */

// Opening: `bounce` is Motion's 0-1 "how springy" dial (0 = no overshoot,
// 1 = extremely springy). 0.15 gives a small, controlled settle-past-target
// -- a bounce you can feel but that never reads as jumpy.
const OPEN_SPRING = { type: "spring", bounce: 0.15, duration: 0.32 } as const;
// Closing: bounce 0 is a critically damped spring -- mathematically
// guaranteed to approach its target without ever overshooting it, so the bar
// tucks away with zero stretch.
const CLOSE_SPRING = { type: "spring", bounce: 0, duration: 0.22 } as const;

const CLOSED_WIDTH = 40; // px, matches the resting h-10 w-10 circle
const OPEN_WIDTH = 320; // px cap (20rem); `maxWidth: 68vw` below clamps on narrow screens

// Expanded-state optical correction (owner feedback): the icon should tuck
// slightly into the pill's curved left cap rather than sitting flush after
// the straight wall starts, and the typed text needs more breathing room off
// the icon. Both are LiftKit "half-step" nudges (x/sqrt(phi) ~= x/1.272) off
// the original 16/10 pair -- a small, deliberate move in each direction, not
// a full golden-ratio step (that would overshoot and read as obviously
// off-center). Note: the gap is applied as a static `marginRight` on the
// icon (below), not as flex `gap` on the m.form -- Motion does not
// animate the CSS `gap`/`column-gap` properties (confirmed: they freeze at
// their initial value no matter the target), so a real gap has to live on
// the icon itself.
const OPEN_PADDING_LEFT = 13; // px, was 16 (16 / 1.272 = half-step down)
const ICON_TEXT_GAP = 13; // px, was a non-functional `gap: 10` (10 x 1.272 = half-step up)

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
  /** The resting circle's accessible name, before it is opened. */
  restLabel?: string;
} = {}) {
  const router = useRouter();
  const live = onChange !== undefined;
  /* Opens itself when the caller arrives already holding a query: a shared
     link to /collection?q=banyan must show what it searched for, not a closed
     circle with a filtered river under it. A lazy initial value rather than an
     effect, so it is open on the first paint and never flickers shut. */
  const [open, setOpen] = useState(() => live && Boolean(controlled));
  const [internal, setInternal] = useState("");
  const value = live ? controlled ?? "" : internal;
  const setValue = live ? onChange : setInternal;
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Collapse when clicking away with no query.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node) && !value) {
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
    <div ref={wrapRef} className="relative h-10 w-10">
      {/* One persistent element morphs between the resting icon and the full
          bar. Width and padding are driven as plain numeric style values
          under one spring per direction, so the pill reflows smoothly
          instead of scaling. */}
      <m.form
        animate={{
          width: open ? OPEN_WIDTH : CLOSED_WIDTH,
          paddingLeft: open ? OPEN_PADDING_LEFT : 0,
          paddingRight: open ? 8 : 0,
        }}
        transition={open ? OPEN_SPRING : CLOSE_SPRING}
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        style={{ maxWidth: "68vw" }}
        className={cn(
          "group absolute right-0 top-0 z-20 flex h-10 items-center overflow-hidden rounded-full bg-card",
          open
            ? "border border-primary shadow-[0_4px_14px_rgba(30,28,22,0.12)]"
            : "border border-border shadow-[0_1px_2px_rgba(30,28,22,0.04)]"
        )}
      >
        {/* Soft focus ring blooms in (opacity only) when expanded, and snaps out
            quickly on collapse so it never trails the contracting bar. */}
        <AnimatePresence>
          {open && (
            <m.span
              key="ring"
              aria-hidden
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-ring/30"
            />
          )}
        </AnimatePresence>

        {/* The magnifying glass is a plain, non-motion element that stays a
            constant size in both states. It never scales or resizes -- its
            only motion comes from the parent's padding shifting under it (and,
            expanded, its own static right margin below), so it stays visually
            stable and centered throughout. Closed, it gets a tiny left optical
            correction so it reads centered in the 40px pill. */}
        <span
          aria-hidden
          className={cn(
            "grid shrink-0 place-items-center leading-none text-muted-foreground transition-transform duration-150 ease-out",
            open
              ? "h-auto w-auto"
              : "h-10 w-10 group-hover:text-foreground group-active:scale-95"
          )}
          style={open ? { marginRight: ICON_TEXT_GAP } : undefined}
        >
          <MagnifyingGlassIcon
            weight="regular"
            size={17}
            stroke="currentColor"
            strokeWidth={6}
            className={cn(
              "pointer-events-none block",
              !open && "-translate-x-[0.75px]"
            )}
          />
        </span>

        {/* Input and placeholder fade in just after the bar starts growing, and
            fade out fast on collapse so the bar contracts behind faded content
            and never reads as a stretch closing around live text. */}
        <AnimatePresence initial={false}>
          {open && (
            <m.input
              key="input"
              ref={inputRef}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { duration: 0.2, ease: "easeOut", delay: 0.06 } }}
              exit={{ opacity: 0, transition: { duration: 0.12, ease: "easeOut" } }}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setValue("");
                  setOpen(false);
                }
              }}
              placeholder={placeholder}
              aria-label={label}
              className="min-w-0 flex-1 bg-transparent text-[13.5px] text-foreground outline-none placeholder:text-muted-foreground/75"
            />
          )}
        </AnimatePresence>

        {/* Resting affordance: a real focusable button overlaying the closed
            pill so the control stays keyboard-operable (Tab + Enter / Space)
            and announces its expanded state. It fades away as the bar opens so
            it never sits over the live input or steals its clicks.
            It also carries the hover: `state-layer` here rather than on the
            form, because the form is the same element in both states and an
            open search box must not tint when the pointer crosses it. The
            button is transparent, so the tint composites over the pill's own
            bg-card underneath and clips to the shared rounded-full. */}
        <AnimatePresence>
          {!open && (
            <m.button
              key="open"
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
              onClick={() => setOpen(true)}
              aria-label={restLabel}
              aria-expanded={open}
              className="state-layer absolute inset-0 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            />
          )}
        </AnimatePresence>

        {/* The way OUT, for a finger. Escape has always cleared and closed
            this, and on a keyboard that was enough; on a phone a pill holding
            a query could only be emptied by selecting the text and deleting
            it, and until it was empty it would not collapse. The directory
            made that plain (2026-08-28): with a search live and no facet set,
            the count line has no "Clear all" to offer either, so this was the
            only escape and it did not exist.
            Inside the pill rather than beside it, so the row's geometry never
            changes -- it appears in padding the form already carries. */}
        <AnimatePresence>
          {open && value && (
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
      </m.form>
    </div>
  );
}
