"use client";

/* ------------------------------------------------------------------ *
 *  Seven ways the search opens.
 *
 *  The shipped pill balloons from a 40px circle to a 320px bar on a
 *  bouncing spring. The owner's read (2026-08-30): "the speed and just
 *  the overall un-calm nature of it. It's not neat." And the reference he
 *  reached for: "something like how the profile menu expands."
 *
 *  That reference is the brief, and the account menu answers it outright
 *  (sidebar.tsx: ACCOUNT_LIST, ACCOUNT_ROW, ACCOUNT_INK):
 *
 *    - Nothing animates size. The rows appear into space that was
 *      already free. No height, no width, ever.
 *    - Content arrives on transform and opacity only, on a spring.
 *    - It unfurls out of the control it came from, staggered, the icon
 *      first and the label 50ms behind.
 *    - Leaving is quicker than arriving and has no stagger: 140ms
 *      ease-in, everything at once. A menu should get out of the way
 *      faster than it turns up.
 *
 *  Card B is that grammar transplanted onto search, and it is the one to
 *  beat. Card A is the real <SearchPill>, imported, not a copy. C to G are
 *  the other honest answers. Open them all at once, slow them down, pick
 *  one. Whatever wins becomes search-pill.tsx.
 *
 *  Lab rooms use `motion.` on purpose (see motion-namespace-rule.test.mjs).
 * ------------------------------------------------------------------ */

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { MagnifyingGlassIcon, XIcon } from "@phosphor-icons/react";
import { AnimatePresence } from "motion/react";
import { EASE_OUT_SMOOTH, SPRINGS } from "@/components/common/motion";
import { SearchPill } from "@/components/layout/search-pill";
import { cn } from "@/lib/utils";
import { DelightShell, motion } from "../_kit";

/* ------------------------------------------------------------------ *
 *  Shared harness
 * ------------------------------------------------------------------ */

/** Every specimen gets the same props so "open every one" can drive them all. */
type SpecProps = {
  open: boolean;
  setOpen: (v: boolean) => void;
  /** 1 = real time. Below that, everything slows by the same factor. */
  speed: number;
};

/** A base duration in SECONDS, through the room's speed dial. */
const t = (seconds: number, speed: number) => seconds / speed;

/**
 * The same dial, for a spring, which has no duration to divide.
 *
 * A spring's period goes as 1/sqrt(k), so slowing it by a factor s means
 * k' = k*s^2. Damping has to come with it (c' = c*s) or the damping ratio
 * changes and the slow version stops being the same motion: it would gain or
 * lose the overshoot that is the whole thing being judged.
 */
const slow = (spring: { stiffness: number; damping: number }, speed: number) =>
  ({
    type: "spring",
    stiffness: spring.stiffness * speed * speed,
    damping: spring.damping * speed,
  }) as const;

/**
 * The behaviour every specimen shares, so what differs between cards is the
 * motion and nothing else: focus on open, Escape clears and closes, a click
 * outside closes an empty box.
 */
function useBox(open: boolean, setOpen: (v: boolean) => void) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // preventScroll: a search box opening is not a reason to move the page,
    // and without it `?open=1` scrolls to whichever card focused last.
    if (open) inputRef.current?.focus({ preventScroll: true });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node) && !value) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, value, setOpen]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        setValue("");
        setOpen(false);
      }
    },
    [setOpen]
  );

  return { value, setValue, inputRef, wrapRef, onKeyDown };
}

/**
 * How wide a right-anchored pill may open: its own row, capped at the design
 * width. The inner content is laid out at this SAME number, and it has to be:
 * a fixed 320 inside a box clamped to 68vw quietly cuts the first word of the
 * placeholder off the left edge of a phone.
 */
function useOpenWidth(ref: React.RefObject<HTMLDivElement | null>, max: number) {
  const [width, setWidth] = useState(max);
  useEffect(() => {
    const row = ref.current?.parentElement;
    if (!row) return;
    const ro = new ResizeObserver(([entry]) =>
      setWidth(Math.min(max, Math.round(entry.contentRect.width)))
    );
    ro.observe(row);
    return () => ro.disconnect();
  }, [ref, max]);
  return width;
}

/** The resting glyph, identical in every card so only the motion differs. */
function Glass({ className }: { className?: string }) {
  return (
    <MagnifyingGlassIcon
      weight="regular"
      size={17}
      stroke="currentColor"
      strokeWidth={6}
      className={cn("pointer-events-none block", className)}
    />
  );
}

/** The small × that empties a live box. Same in every card but A. */
function Clear({
  onClick,
  speed,
}: {
  onClick: () => void;
  speed: number;
}) {
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: t(0.14, speed), ease: "easeOut" }}
      onClick={onClick}
      aria-label="Clear the search"
      className="state-layer grid size-6 shrink-0 place-items-center rounded-full text-muted-foreground transition-transform hover:text-foreground active:scale-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <XIcon weight="bold" size={12} />
    </motion.button>
  );
}

const PLACEHOLDER = "Search posts or a name";
const INPUT_CLASS =
  "min-w-0 flex-1 bg-transparent text-[13.5px] text-foreground outline-none placeholder:text-muted-foreground/75";
const REST_CIRCLE =
  "grid size-10 place-items-center rounded-full border border-border bg-card text-muted-foreground shadow-[0_1px_2px_rgba(30,28,22,0.04)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

/* ------------------------------------------------------------------ *
 *  A. What ships today
 * ------------------------------------------------------------------ */

/**
 * The real component, driven by a synthetic click so the "open every one"
 * button reaches it too. It owns its own open state, which is exactly why a
 * copy would have been easier and would also have stopped being the truth
 * the first time someone tuned the original.
 */
function SpecNow({ open }: SpecProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState("");

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const rest = host.querySelector<HTMLButtonElement>('button[aria-expanded="false"]');
    if (open && rest) {
      rest.click();
      return;
    }
    if (!open && !rest) {
      /* Escape, not a click outside: the outside-click path only closes an
         EMPTY box, so it would leave this card open whenever something had
         been typed into it. Escape clears and closes either way. */
      host
        .querySelector("input")
        ?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    }
  }, [open]);

  return (
    <div ref={hostRef}>
      <SearchPill value={value} onChange={setValue} placeholder={PLACEHOLDER} />
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  B. The account menu's grammar
 * ------------------------------------------------------------------ */

const B_WIDTH = 320;

/* The field arrives out of the circle it came from, 10px to its right.
   `firm` and not `snappy`: the account menu's rows are 100px of ink, and
   snappy's 0.73 damping ratio gives ink a lively settle. This is a 320px
   surface, and the owner's own ruling on those (2026-08-29, the attach
   wells) is that snappy reads as wobble at that size. firm is the same
   spring at a 0.93 ratio. It still snaps, it just does not bounce past. */
const B_FIELD = {
  open: (speed: number) => ({
    opacity: 1,
    x: 0,
    transition: { ...slow(SPRINGS.firm, speed), staggerChildren: t(0.05, speed) },
  }),
  closed: (speed: number) => ({
    opacity: 0,
    x: 10,
    transition: { duration: t(0.14, speed), ease: "easeIn" as const, staggerChildren: 0 },
  }),
};

/* Ink inside the field: the glass, then the words 50ms behind it, which is
   the account row's "the icons come there and then the text comes there".
   Small elements, so this one does get `snappy`. */
const B_INK = {
  open: (speed: number) => ({ opacity: 1, x: 0, transition: slow(SPRINGS.snappy, speed) }),
  closed: (speed: number) => ({
    opacity: 0,
    x: 6,
    transition: { duration: t(0.14, speed), ease: "easeIn" as const },
  }),
};

/**
 * Nothing changes size. The circle leaves, the field turns up in space that
 * was already free, drifting 10px out of the circle it came from and settling
 * on a spring. Inside it the glass lands first and the words follow 50ms
 * later. Closing is 140ms, no stagger, everything at once.
 *
 * This is the account menu's own motion with the words swapped, so search
 * would stop being the one control in the app with a mechanic of its own.
 */
function SpecGrammar({ open, setOpen, speed }: SpecProps) {
  const { value, setValue, inputRef, wrapRef, onKeyDown } = useBox(open, setOpen);
  const width = useOpenWidth(wrapRef, B_WIDTH);

  return (
    <div ref={wrapRef} className="relative h-10 w-10">
      <AnimatePresence initial={false}>
        {!open ? (
          <motion.button
            key="rest"
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: t(0.16, speed), ease: "easeOut" } }}
            exit={{ opacity: 0, transition: { duration: t(0.1, speed), ease: "easeIn" } }}
            onClick={() => setOpen(true)}
            aria-label="Search posts"
            className={cn("state-layer absolute right-0 top-0", REST_CIRCLE)}
          >
            <Glass />
          </motion.button>
        ) : (
          <motion.form
            key="field"
            custom={speed}
            variants={B_FIELD}
            initial="closed"
            animate="open"
            exit="closed"
            onSubmit={(e) => e.preventDefault()}
            style={{ width }}
            className="absolute right-0 top-0 flex h-10 items-center gap-2.5 rounded-full border border-primary bg-card pl-4 pr-[11px] shadow-[0_4px_14px_rgba(30,28,22,0.10)]"
          >
            <motion.span
              custom={speed}
              variants={B_INK}
              aria-hidden
              className="grid size-[18px] shrink-0 place-items-center text-muted-foreground"
            >
              <Glass />
            </motion.span>
            <motion.input
              custom={speed}
              variants={B_INK}
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={PLACEHOLDER}
              aria-label="Search posts"
              className={INPUT_CLASS}
            />
            <AnimatePresence>
              {value && <Clear speed={speed} onClick={() => setValue("")} />}
            </AnimatePresence>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  C. The glass stays where you tapped
 * ------------------------------------------------------------------ */

const C_WIDTH = 320;

/**
 * If the box has to grow, this is how to grow it. Two changes to what ships.
 *
 * One: the glass sits on the trailing edge, so the thing you tapped is still
 * under your finger when the field arrives. Today it rides the growing left
 * edge 280px across the header, and that travel is the motion the eye
 * follows.
 *
 * Two: the inside is laid out at its FINAL width from the first frame and
 * pinned to the right, so the box uncovers the field rather than reflowing
 * it every frame. Nothing inside moves. Only the left edge travels, on one
 * decelerating curve with no overshoot in either direction.
 */
function SpecAnchored({ open, setOpen, speed }: SpecProps) {
  const { value, setValue, inputRef, wrapRef, onKeyDown } = useBox(open, setOpen);
  const openWidth = useOpenWidth(wrapRef, C_WIDTH);

  return (
    <div ref={wrapRef} className="relative h-10 w-10">
      <motion.div
        animate={{ width: open ? openWidth : 40 }}
        transition={{ duration: t(open ? 0.34 : 0.22, speed), ease: EASE_OUT_SMOOTH }}
        className={cn(
          "absolute right-0 top-0 z-20 h-10 overflow-hidden rounded-full bg-card",
          open
            ? "border border-primary shadow-[0_4px_14px_rgba(30,28,22,0.10)]"
            : "border border-border shadow-[0_1px_2px_rgba(30,28,22,0.04)]"
        )}
      >
        {/* Final layout from frame one, pinned right. pr-[11px] + a 18px glyph
            puts the glass centre 20px off the right edge, which is dead centre
            of the resting 40px circle. It therefore never moves. */}
        <div
          className="absolute right-0 top-0 flex h-10 items-center gap-2.5 pl-4 pr-[11px]"
          style={{ width: openWidth }}
        >
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={PLACEHOLDER}
            aria-label="Search posts"
            tabIndex={open ? 0 : -1}
            className={INPUT_CLASS}
            style={{
              opacity: open ? 1 : 0,
              transition: `opacity ${t(0.18, speed)}s ease-out ${open ? t(0.12, speed) : 0}s`,
            }}
          />
          <AnimatePresence>
            {open && value && <Clear speed={speed} onClick={() => setValue("")} />}
          </AnimatePresence>
          <span
            aria-hidden
            className="grid size-[18px] shrink-0 place-items-center text-muted-foreground"
          >
            <Glass />
          </span>
        </div>

        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Search posts"
            className="state-layer absolute inset-0 z-10 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          />
        )}
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  C. The row steps aside
 * ------------------------------------------------------------------ */

/**
 * Nothing expands over anything. The heading gives up the row and takes it
 * back, which is what a Mac window does when you search it: the toolbar's
 * contents leave and the field is the row for as long as you are in it.
 *
 * The field still travels, but now the travel means something. It is a mode
 * you entered, not a control that got bigger, and the page is honest about
 * being in it.
 */
function SpecRow({ open, setOpen, speed }: SpecProps) {
  const { value, setValue, inputRef, wrapRef, onKeyDown } = useBox(open, setOpen);
  const rowRef = useRef<HTMLDivElement>(null);
  const [rowWidth, setRowWidth] = useState(0);

  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const ro = new ResizeObserver(([entry]) => setRowWidth(entry.contentRect.width));
    ro.observe(row);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={rowRef} className="relative flex h-10 items-center">
      <motion.span
        animate={{ opacity: open ? 0 : 1, x: open ? -8 : 0 }}
        transition={{ duration: t(open ? 0.16 : 0.22, speed), ease: "easeOut" }}
        className="font-heading text-[22px] leading-none tracking-[-0.02em] text-foreground"
      >
        Feed
      </motion.span>

      <div ref={wrapRef} className="absolute right-0 top-0 h-10">
        <motion.div
          animate={{ width: open ? rowWidth || 320 : 40 }}
          transition={{ duration: t(open ? 0.34 : 0.24, speed), ease: EASE_OUT_SMOOTH }}
          className={cn(
            "absolute right-0 top-0 h-10 overflow-hidden rounded-full bg-card",
            open
              ? "border border-primary"
              : "border border-border shadow-[0_1px_2px_rgba(30,28,22,0.04)]"
          )}
        >
          {/* Trailing glass, for B's reason: it is the only placement that
              survives the closed state, because a leading one sits at the far
              left of a row-wide box and is clipped out of the 40px circle. */}
          <div
            className="absolute right-0 top-0 flex h-10 items-center gap-2.5 pl-4 pr-[11px]"
            style={{ width: rowWidth || 320 }}
          >
            <input
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Search the feed"
              aria-label="Search the feed"
              tabIndex={open ? 0 : -1}
              className={INPUT_CLASS}
              style={{
                opacity: open ? 1 : 0,
                transition: `opacity ${t(0.18, speed)}s ease-out ${open ? t(0.14, speed) : 0}s`,
              }}
            />
            <AnimatePresence>
              {open && value && <Clear speed={speed} onClick={() => setValue("")} />}
            </AnimatePresence>
            <span aria-hidden className="grid size-[18px] shrink-0 place-items-center text-muted-foreground">
              <Glass />
            </span>
          </div>

          {!open && (
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Search the feed"
              className="state-layer absolute inset-0 z-10 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            />
          )}
        </motion.div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  D. A line, not a box
 * ------------------------------------------------------------------ */

/* The whole affordance, glass included, so the rule itself gets 260. */
const D_WIDTH = 300;

/**
 * There is no pill at rest and no pill when it opens. A rule draws itself
 * out from under the glass and you write on the line, the way you would
 * write on paper. The glass never moves.
 *
 * This is the quietest option by a distance, and the one that looks least
 * like a widget. The cost is honest: a bare underline is a weaker target
 * than a bordered box, and it needs the focus recipe's 2px edge on Tab to
 * stay visible to a keyboard.
 */
function SpecLine({ open, setOpen, speed }: SpecProps) {
  const { value, setValue, inputRef, wrapRef, onKeyDown } = useBox(open, setOpen);
  const openWidth = useOpenWidth(wrapRef, D_WIDTH);

  return (
    <div ref={wrapRef} className="relative h-10 w-10">
      <div className="absolute right-0 top-0 flex h-10 items-center justify-end">
        <motion.div
          animate={{ width: open ? openWidth - 40 : 0 }}
          transition={{ duration: t(open ? 0.32 : 0.2, speed), ease: EASE_OUT_SMOOTH }}
          className="relative h-10 overflow-hidden"
        >
          <div
            className="absolute right-0 top-0 flex h-10 items-center gap-2"
            style={{ width: openWidth - 40 }}
          >
            <input
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={PLACEHOLDER}
              aria-label="Search posts"
              tabIndex={open ? 0 : -1}
              className={INPUT_CLASS}
              style={{
                opacity: open ? 1 : 0,
                transition: `opacity ${t(0.18, speed)}s ease-out ${open ? t(0.12, speed) : 0}s`,
              }}
            />
            <AnimatePresence>
              {open && value && <Clear speed={speed} onClick={() => setValue("")} />}
            </AnimatePresence>
          </div>
          {/* The ink. Sits under the text and under the glass's own baseline,
              so the rule and the glyph read as one stroke. */}
          <span className="absolute bottom-[7px] left-0 right-0 h-px bg-primary" />
        </motion.div>

        <button
          type="button"
          onClick={() => !open && setOpen(true)}
          aria-label="Search posts"
          className={cn(
            "relative grid size-10 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors duration-150",
            open ? "text-primary" : "hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          )}
        >
          <Glass />
          {/* The rule carries on under the glass, so the line does not stop
              short and leave the glyph floating beside it. */}
          <motion.span
            aria-hidden
            animate={{ opacity: open ? 1 : 0 }}
            transition={{ duration: t(open ? 0.24 : 0.14, speed), ease: "easeOut" }}
            className="absolute bottom-[7px] left-0 right-1 h-px bg-primary"
          />
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  E. It gets its own line
 * ------------------------------------------------------------------ */

/**
 * The header does not move at all. The glass just lights up, and a search
 * row unrolls underneath it, full width, the way a phone mail app does it.
 *
 * The one option with somewhere to grow: recent searches, "3 letters, 12
 * posts", a people row. Every other card here can only ever hold a string.
 * The cost is a layout shift on the page below, which is real, and which
 * the drawer pays for by never covering anything.
 */
function SpecDrawer({ open, setOpen, speed }: SpecProps) {
  const { value, setValue, inputRef, wrapRef, onKeyDown } = useBox(open, setOpen);
  const id = useId();

  return (
    <div ref={wrapRef}>
      <div className="flex h-10 items-center justify-between">
        <span className="font-heading text-[22px] leading-none tracking-[-0.02em] text-foreground">
          Feed
        </span>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-controls={id}
          aria-label="Search posts"
          className={cn(
            "state-layer grid size-10 place-items-center rounded-full border transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
            open
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-card text-muted-foreground shadow-[0_1px_2px_rgba(30,28,22,0.04)]"
          )}
        >
          <Glass />
        </button>
      </div>

      <motion.div
        id={id}
        animate={{ height: open ? 52 : 0 }}
        transition={{ duration: t(open ? 0.3 : 0.2, speed), ease: EASE_OUT_SMOOTH }}
        className="overflow-hidden"
      >
        <motion.div
          animate={{ opacity: open ? 1 : 0, y: open ? 0 : -6 }}
          transition={{
            duration: t(open ? 0.22 : 0.12, speed),
            ease: "easeOut",
            delay: open ? t(0.08, speed) : 0,
          }}
          className="mt-3 flex h-10 items-center gap-2.5 rounded-full border border-primary bg-card pl-4 pr-[11px]"
        >
          <span aria-hidden className="grid size-[18px] shrink-0 place-items-center text-muted-foreground">
            <Glass />
          </span>
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={PLACEHOLDER}
            aria-label="Search posts"
            tabIndex={open ? 0 : -1}
            className={INPUT_CLASS}
          />
          <AnimatePresence>
            {open && value && <Clear speed={speed} onClick={() => setValue("")} />}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  F. The whole valley, one box
 * ------------------------------------------------------------------ */

/**
 * The glass stops being a field and becomes a door. It opens a panel over a
 * dimmed page, big enough to say what it searches and to show what it found.
 *
 * This is the one that answers the question the pill cannot: search means a
 * different thing on every page it sits on, and today the header pill and
 * the Collection's river pill are the same component doing two unrelated
 * jobs. It is also the biggest change on this page, and needs a real product
 * decision behind it rather than a motion tweak.
 *
 * Scoped to its own card here. The real one would cover the page.
 */
function SpecSpotlight({ open, setOpen, speed }: SpecProps) {
  const { value, setValue, inputRef, wrapRef, onKeyDown } = useBox(open, setOpen);

  return (
    <div ref={wrapRef} className="relative h-full">
      <div className="flex h-10 items-center justify-between">
        <span className="font-heading text-[22px] leading-none tracking-[-0.02em] text-foreground">
          Feed
        </span>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Search"
          className={cn("state-layer", REST_CIRCLE)}
        >
          <Glass />
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="scrim"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { duration: t(0.2, speed), ease: "easeOut" } }}
              exit={{ opacity: 0, transition: { duration: t(0.14, speed), ease: "easeIn" } }}
              onClick={() => {
                setValue("");
                setOpen(false);
              }}
              className="absolute inset-0 z-10 rounded-[14px] bg-foreground/25"
            />
            <motion.div
              key="panel"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0, transition: slow(SPRINGS.firm, speed) }}
              exit={{ opacity: 0, y: -6, transition: { duration: t(0.14, speed), ease: "easeIn" } }}
              className="absolute inset-x-4 top-[52px] z-20 overflow-hidden rounded-[14px] border border-border bg-card shadow-[0_18px_40px_rgba(30,28,22,0.18)]"
            >
              <div className="flex h-[52px] items-center gap-3 px-4">
                <span aria-hidden className="grid size-[18px] shrink-0 place-items-center text-muted-foreground">
                  <Glass />
                </span>
                <input
                  ref={inputRef}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="Search posts, letters, people"
                  aria-label="Search posts, letters and people"
                  className="min-w-0 flex-1 bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground/75"
                />
                <kbd className="rounded-[6px] border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground">
                  esc
                </kbd>
              </div>
              <div className="border-t border-border/70 px-4 py-2.5 text-[12.5px] text-muted-foreground">
                {value ? `Looking for "${value}"` : "Posts, letters, people, photographs"}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  The room
 * ------------------------------------------------------------------ */

const SPECS: {
  key: string;
  name: string;
  idea: string;
  Body: (p: SpecProps) => React.ReactElement;
  /** this specimen draws its own heading, because it moves or replaces it */
  ownsRow?: boolean;
  /** taller stage for the ones that need room below the header line */
  tall?: boolean;
  /** the full width of the grid, for the one that is a whole panel */
  wide?: boolean;
}[] = [
  {
    key: "now",
    name: "What ships today",
    idea: "A 40px circle springs out to 320px with a bounce, the glass rides the moving left edge the whole way, and the words fade in once it gets there. Three things moving, on two different springs.",
    Body: SpecNow,
  },
  {
    key: "grammar",
    name: "The account menu's grammar",
    idea: "Nothing changes size. The circle leaves, the field turns up in space that was already free, drifting 10px out of the circle it came from. The glass lands, the words follow 50ms later. Closing takes 140ms with no stagger.",
    Body: SpecGrammar,
  },
  {
    key: "anchored",
    name: "The glass stays where you tapped",
    idea: "If it has to grow, grow it like this. The glass sits on the trailing edge so it never travels, and the field is laid out full width from the first frame so the box uncovers it instead of stretching it. One curve, no bounce.",
    Body: SpecAnchored,
  },
  {
    key: "line",
    name: "A line, not a box",
    idea: "No pill. A rule draws out from under the glass and you write on it. The quietest of the seven, and the one that looks least like a widget.",
    Body: SpecLine,
  },
  {
    key: "row",
    name: "The row steps aside",
    idea: "The heading leaves and search takes the whole row, then gives it back. Nothing is covered up, and being in search is a state you can see.",
    Body: SpecRow,
    ownsRow: true,
  },
  {
    key: "drawer",
    name: "It gets its own line",
    idea: "The header holds still and a row unrolls underneath, with somewhere to put recent searches and result counts later. The only card that has to animate a height.",
    Body: SpecDrawer,
    ownsRow: true,
    tall: true,
  },
  {
    key: "spotlight",
    name: "The whole valley, one box",
    idea: "The glass opens a panel over the page. It arrives rather than grows, on the same spring as B. The only one that could search posts, letters, people and photographs at once, and the only one that is a product decision rather than a motion decision.",
    Body: SpecSpotlight,
    ownsRow: true,
    tall: true,
    wide: true,
  },
];

const SPEEDS = [
  { v: 1, label: "Real time" },
  { v: 0.4, label: "Slower" },
  { v: 0.15, label: "Slowest" },
];

export default function SearchRoom() {
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});
  const [speed, setSpeed] = useState(1);
  const anyOpen = SPECS.some((s) => openMap[s.key]);

  /* `?open=1` lands with all seven already open, the way `?theme=dark` works on
     the shell. It is how this room gets photographed without a hand on it. */
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("open") !== "1") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads the URL after mount, like DelightShell's own theme and reduced-motion flags
    setOpenMap(Object.fromEntries(SPECS.map((s) => [s.key, true])));
  }, []);

  const setOne = useCallback(
    (key: string) => (v: boolean) => setOpenMap((m) => ({ ...m, [key]: v })),
    []
  );

  function toggleAll() {
    const next = !anyOpen;
    setOpenMap(Object.fromEntries(SPECS.map((s) => [s.key, next])));
  }

  return (
    <DelightShell
      title="Seven ways the search opens"
      lede="Click each glass, slow them all down, then say which one belongs here. B is the account menu's motion."
    >
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={toggleAll}
          className="rounded-full border border-primary bg-primary px-4 py-2 text-[13px] font-medium text-primary-foreground transition-colors duration-150 hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {anyOpen ? "Close every one" : "Open every one"}
        </button>
        {SPEEDS.map((s) => (
          <button
            key={s.v}
            type="button"
            onClick={() => setSpeed(s.v)}
            className={cn(
              "rounded-full border px-4 py-2 text-[13px] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              speed === s.v
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            )}
          >
            {s.label}
          </button>
        ))}
        <p className="text-[12.5px] text-muted-foreground">
          Card A is the shipped component, imported, so it keeps its own speed. The rest follow the dial.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {SPECS.map((s, i) => (
          <section
            key={s.key}
            className={cn(
              "flex flex-col overflow-hidden rounded-[14px] border border-border bg-card/60",
              s.wide && "lg:col-span-2"
            )}
          >
            <div className="flex items-baseline gap-2.5 px-4 pt-3.5">
              <span className="font-heading text-[13px] uppercase tracking-[0.12em] text-muted-foreground">
                {String.fromCharCode(65 + i)}
              </span>
              <h3 className="font-heading text-[16px] tracking-[-0.01em] text-foreground">{s.name}</h3>
            </div>
            <p className="max-w-[62ch] px-4 pb-3.5 pt-1.5 text-[13px] leading-snug text-muted-foreground">
              {s.idea}
            </p>
            {/* The stage is a real header row on the real page background, so a
                pill that reads fine on white and wrong on paper shows it here. */}
            <div
              className={cn(
                "relative flex-1 border-t border-border bg-background px-4 py-4",
                s.tall ? "min-h-[172px]" : "min-h-[104px]"
              )}
            >
              {s.ownsRow ? (
                <s.Body open={!!openMap[s.key]} setOpen={setOne(s.key)} speed={speed} />
              ) : (
                <div className="flex h-10 items-center justify-between gap-4">
                  <span className="font-heading text-[22px] leading-none tracking-[-0.02em] text-foreground">
                    Feed
                  </span>
                  <s.Body open={!!openMap[s.key]} setOpen={setOne(s.key)} speed={speed} />
                </div>
              )}
            </div>
          </section>
        ))}
      </div>
    </DelightShell>
  );
}
