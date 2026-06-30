"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import { SPRINGS, EASE_POP } from "@/components/common/motion";
import { cn } from "@/lib/utils";

/**
 * SearchPill: the header search affordance that replaces the old always-on
 * search + filter row. It rests as a compact 40px icon and expands into a live
 * input on click (as an absolute overlay, so it never reflows the header).
 * Submitting routes to the directory search; the feed can later subscribe to
 * the same query.
 *
 * The expansion is a motion layout animation: one shared element grows from the
 * resting pill into the full bar on a calm spring (it animates its own size, as
 * an absolute overlay anchored right and growing left, so the header never
 * reflows and nothing to its right is overlapped). The magnifying glass stays
 * mounted across both states and settles into place rather than snapping, the
 * input and placeholder fade in, and a soft focus ring blooms. Collapsing
 * reverses the same way.
 */
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
      {/* One shared element morphs between the resting icon and the full bar.
          `layout` springs its width / padding / radius. While closed the whole
          surface is the open button; while open it hosts the search form. */}
      <motion.form
        layout
        transition={SPRINGS.gentle}
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className={cn(
          "group absolute right-0 top-0 z-20 flex h-10 items-center overflow-hidden rounded-full bg-card",
          open
            ? "w-[min(20rem,68vw)] gap-2.5 border border-primary pl-4 pr-2 shadow-[0_4px_14px_rgba(30,28,22,0.12)]"
            : "w-10 gap-0 border border-border pl-0 pr-0 shadow-[0_1px_2px_rgba(30,28,22,0.04)]"
        )}
      >
        {/* Soft focus ring blooms in (opacity only) when expanded. */}
        <AnimatePresence>
          {open && (
            <motion.span
              key="ring"
              aria-hidden
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.28, ease: EASE_POP }}
              className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-ring/30"
            />
          )}
        </AnimatePresence>

        {/* The magnifying glass stays mounted across both states and settles
            into place. Closed, it is centered in the 40px pill; open, it sits
            at the bar's leading edge. */}
        <motion.span
          layout
          transition={SPRINGS.snappy}
          aria-hidden
          className={cn(
            "grid shrink-0 place-items-center text-muted-foreground transition-transform duration-150 ease-out",
            open
              ? "h-auto w-auto"
              : "h-10 w-10 group-hover:text-foreground group-active:scale-95"
          )}
        >
          <MagnifyingGlass
            weight="regular"
            size={open ? 16 : 18}
            className="pointer-events-none"
          />
        </motion.span>

        {/* Input and placeholder fade in just after the bar starts growing, and
            fade out on collapse so the bar never snaps shut around live text. */}
        <AnimatePresence initial={false}>
          {open && (
            <motion.input
              key="input"
              ref={inputRef}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.24, ease: EASE_POP, delay: 0.05 }}
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
              transition={{ duration: 0.18, ease: EASE_POP }}
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
