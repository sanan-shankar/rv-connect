"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * SearchPill: the header search affordance that replaces the old always-on
 * search + filter row. It rests as a compact 40px icon and expands into a live
 * input on click (as an absolute overlay, so it never reflows the header).
 * Submitting routes to the directory search; the feed can later subscribe to
 * the same query.
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
// icon (below), not as flex `gap` on the motion.form -- Motion does not
// animate the CSS `gap`/`column-gap` properties (confirmed: they freeze at
// their initial value no matter the target), so a real gap has to live on
// the icon itself.
const OPEN_PADDING_LEFT = 13; // px, was 16 (16 / 1.272 = half-step down)
const ICON_TEXT_GAP = 13; // px, was a non-functional `gap: 10` (10 x 1.272 = half-step up)

export function SearchPill() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
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
    const q = value.trim();
    if (!q) return;
    router.push(`/directory?q=${encodeURIComponent(q)}`);
  }

  return (
    <div ref={wrapRef} className="relative h-10 w-10">
      {/* One persistent element morphs between the resting icon and the full
          bar. Width and padding are driven as plain numeric style values
          under one spring per direction, so the pill reflows smoothly
          instead of scaling. */}
      <motion.form
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
            <motion.span
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
            <motion.input
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
              placeholder="Search the valley..."
              aria-label="Search the valley"
              className="min-w-0 flex-1 bg-transparent text-[13.5px] text-foreground outline-none placeholder:text-muted-foreground/75"
            />
          )}
        </AnimatePresence>

        {/* Resting affordance: a real focusable button overlaying the closed
            pill so the control stays keyboard-operable (Tab + Enter / Space)
            and announces its expanded state. It fades away as the bar opens so
            it never sits over the live input or steals its clicks. */}
        <AnimatePresence>
          {!open && (
            <motion.button
              key="open"
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
              onClick={() => setOpen(true)}
              aria-label="Search the valley"
              aria-expanded={open}
              className="absolute inset-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            />
          )}
        </AnimatePresence>
      </motion.form>
    </div>
  );
}
