"use client";

/* ------------------------------------------------------------------ *
 *  Room-local controls.
 *
 *  Deliberately NOT importing src/components/common/filters/*. Two
 *  reasons: a concurrent session is editing that kit this session, and
 *  more importantly the room's argument is that the facet-pill language
 *  itself is what fails. Borrowing the pills to demonstrate a design
 *  that replaces them would beg the question.
 *
 *  Everything here obeys the shipped protocol: canopy is the only
 *  selection green, hover is `state-layer` and never moves a control,
 *  the press sink lives on :active, menus are the Float material at
 *  12px with 8.8px rows, and only transform/opacity animate.
 * ------------------------------------------------------------------ */

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/* --- popover ------------------------------------------------------- *
 *
 *  Hand-rolled rather than pulled from ui/popover. The app's primitive is
 *  Base UI and correct, but it is also one of the files in flight, and a
 *  lab room that has to render eight popovers on one page benefits from
 *  owning its own dismissal rules. Positioning is plain absolute against
 *  a relative wrapper: every popover in this room opens below and aligned
 *  to its trigger's leading edge, which is what the menu material
 *  mandates anyway, so the general case a positioning engine buys us is
 *  not needed here.
 * ------------------------------------------------------------------ */

export function Pop({
  open,
  onClose,
  align = "start",
  width,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  align?: "start" | "end";
  width?: number;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      // The trigger sits OUTSIDE this panel, so a click on it would both
      // close (here) and re-open (its own handler) in the same tick and the
      // menu would never shut. Walking up to the shared wrapper and ignoring
      // anything inside it is what keeps the trigger a real toggle.
      const wrap = ref.current?.closest("[data-pop-wrap]");
      if (wrap && !wrap.contains(e.target as Node)) onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      ref={ref}
      className={cn(
        // The menu material: Float surface, 12px panel, 4px inner pad,
        // hairline, layered ink shadow, 6px below the trigger.
        "absolute top-[calc(100%+6px)] z-50 rounded-[var(--radius-md)] border border-border bg-popover p-1 text-popover-foreground",
        "shadow-[0_18px_38px_-16px_rgb(var(--shadow-ink)/0.28)]",
        // One origin animation, ease-pop, ~140ms, enter only: the panel
        // unmounts instantly and nothing sits behind it to be revealed, so
        // an exit would only delay the click that dismissed it. The keyframe
        // is defined once in page.tsx rather than globals.css, which is owned
        // by another session this week.
        "origin-top lab-pop-in",
        align === "end" ? "right-0" : "left-0",
        className
      )}
      style={width ? { width } : undefined}
      role="dialog"
    >
      {children}
    </div>
  );
}

/** wrapper that anchors a Pop and scopes its click-outside */
export function PopWrap({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div data-pop-wrap className={cn("relative", className)}>
      {children}
    </div>
  );
}

/* --- menu row ------------------------------------------------------ *
 *  8.8px radius (concentric with the 12px panel through its 4px inset),
 *  natural height, state-layer highlight. Matches the shipped material.
 * ------------------------------------------------------------------ */

export function MenuRow({
  children,
  onClick,
  selected = false,
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  selected?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "state-layer flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-3 py-1.5 text-left text-[13.5px] outline-none transition-transform duration-100 active:scale-[0.99]",
        "focus-visible:[background-image:linear-gradient(var(--state-hover),var(--state-hover))]",
        selected ? "font-semibold text-canopy" : "text-foreground",
        className
      )}
    >
      {children}
    </button>
  );
}

/* --- the search field ---------------------------------------------- *
 *
 *  `flex-1 min-w-0`, never a hard width. The shipped box is
 *  `w-[320px] xl:w-[380px]`, which the owner called "of inexplicable
 *  length"; it is 380 of the 1112px column at 1440, i.e. 34%, and the
 *  number is not derived from anything. Letting it take the row's
 *  remainder means its width is an OUTCOME of the controls beside it
 *  rather than a constant somebody has to defend.
 * ------------------------------------------------------------------ */

export function SearchField({
  value,
  onChange,
  placeholder = "Search people, places, or work",
  className,
  onFocus,
  inputRef,
  onKeyDown,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  onFocus?: () => void;
  inputRef?: React.Ref<HTMLInputElement>;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className={cn("relative flex min-w-0 flex-1 items-center", className)}>
      <svg
        aria-hidden
        viewBox="0 0 16 16"
        className="pointer-events-none absolute left-3.5 size-[15px] text-muted-foreground"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.7}
      >
        <circle cx="7" cy="7" r="4.6" />
        <path d="M10.4 10.4 14 14" strokeLinecap="round" />
      </svg>
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        aria-label="Search people"
        className="h-11 w-full min-w-0 rounded-full border border-border bg-card pl-10 pr-3 text-[14px] text-foreground outline-none transition-[border-color] duration-150 placeholder:text-muted-foreground/80 focus:border-leaf focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      />
    </div>
  );
}

/* --- the Filters trigger -------------------------------------------- *
 *
 *  One control, one count. It carries a canopy tint only when something is
 *  applied, because canopy is the app's selection green and an idle filter
 *  button is not a selection. The count is a numeral in a pill rather than
 *  the shipped "More filters· 1" (which, incidentally, renders with no
 *  space before the dot: JSX drops the newline between the text and the
 *  expression, so `More filters` + `· 1` concatenates. Small, real, and
 *  visible in the DOM probe).
 * ------------------------------------------------------------------ */

export function FilterButton({
  count,
  open,
  onClick,
  label = "Filters",
  compact = false,
}: {
  count: number;
  open: boolean;
  onClick: () => void;
  label?: string;
  compact?: boolean;
}) {
  const set = count > 0;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      aria-label={compact ? `${label}${set ? `, ${count} applied` : ""}` : undefined}
      className={cn(
        "state-layer inline-flex h-11 shrink-0 items-center gap-2 rounded-full border text-[13.5px] font-medium outline-none transition-transform duration-150 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-canopy",
        compact ? "w-11 justify-center" : "px-4",
        set ? "border-canopy/35 bg-canopy/[0.08] text-canopy" : "border-border bg-card text-foreground"
      )}
    >
      {/* Three sliders. Drawn here rather than pulled from lucide so the
          stroke weight matches the search glass beside it (1.7), which the
          lucide default 2 did not. */}
      <svg viewBox="0 0 16 16" className="size-[15px]" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round">
        <path d="M2 4.5h9M13.5 4.5H14M2 11.5h2M6.5 11.5H14" />
        <circle cx="12" cy="4.5" r="1.6" />
        <circle cx="5" cy="11.5" r="1.6" />
      </svg>
      {!compact && label}
      {set && (
        <span className="grid h-5 min-w-5 place-items-center rounded-full bg-canopy px-1.5 text-[11px] font-bold tabular-nums text-white">
          {count}
        </span>
      )}
    </button>
  );
}

/* --- the mode toggle ------------------------------------------------ *
 *
 *  Three segments, ALWAYS three, never reordered and never conditionally
 *  mounted. The shipped control adds a "People" segment the moment a
 *  filter exists and puts it FIRST, so the control the pointer is aimed at
 *  moves under it; that is half of what the owner described as janky.
 *  These are three views of one result set, so the set of segments cannot
 *  depend on the state of the set.
 * ------------------------------------------------------------------ */

export function ModeToggle<K extends string>({
  items,
  value,
  onChange,
  full = false,
}: {
  items: { k: K; label: string }[];
  value: K;
  onChange: (k: K) => void;
  full?: boolean;
}) {
  return (
    <div
      className={cn(
        "inline-flex shrink-0 rounded-full border border-border bg-card p-0.5",
        full && "flex w-full"
      )}
      role="tablist"
    >
      {items.map((it) => {
        const on = value === it.k;
        return (
          <button
            key={it.k}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(it.k)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-[13px] font-semibold outline-none transition-[color,background-color] duration-150 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-canopy",
              full && "flex-1",
              on
                ? "bg-canopy text-white"
                : "state-layer text-muted-foreground hover:text-foreground"
            )}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

/* --- a removable token ---------------------------------------------- *
 *
 *  The value alone, no "Category: " prefix. "Profession: Technology" is 22
 *  characters to say what "Technology" says in 10, and the category is
 *  recoverable from the value in every real case (nobody wonders which
 *  facet "Bengaluru" came from). Dropping the prefix is what lets three
 *  tokens fit on one line at 390px.
 * ------------------------------------------------------------------ */

export function Token({
  label,
  onClear,
  tone = "canopy",
}: {
  label: string;
  onClear: () => void;
  tone?: "canopy" | "plain";
}) {
  return (
    <span
      className={cn(
        "inline-flex h-7 max-w-[15rem] shrink-0 items-center gap-1 rounded-full border pl-2.5 pr-1 text-[12.5px] font-medium",
        tone === "canopy"
          ? "border-canopy/30 bg-canopy/[0.08] text-canopy"
          : "border-border bg-secondary text-foreground"
      )}
    >
      <span className="truncate">{label}</span>
      <button
        type="button"
        onClick={onClear}
        aria-label={`Remove ${label}`}
        className="grid size-5 shrink-0 place-items-center rounded-full text-current opacity-70 outline-none transition-transform duration-150 hover:bg-canopy/15 hover:opacity-100 active:scale-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-canopy"
      >
        <svg viewBox="0 0 12 12" className="size-2.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
          <path d="M3 3l6 6M9 3l-6 6" />
        </svg>
      </button>
    </span>
  );
}

/* --- a plain hairline row used inside the filter panel --------------- */

export function PanelSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-b border-border/70 px-1 py-3 last:border-0">
      <div className="mb-2 px-2 text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
        {title}
      </div>
      {children}
    </div>
  );
}

/** A choice chip inside the filter panel. Selection is canopy fill, which is
 *  the app's one green state; idle is the card surface with a hairline. */
export function Choice({
  label,
  on,
  onClick,
  count,
}: {
  label: string;
  on: boolean;
  onClick: () => void;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-medium outline-none transition-transform duration-150 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-canopy",
        on
          ? "border-canopy bg-canopy text-white"
          : "state-layer border-border bg-card text-foreground"
      )}
    >
      {label}
      {count != null && (
        <span className={cn("tabular-nums", on ? "text-white/70" : "text-muted-foreground")}>{count}</span>
      )}
    </button>
  );
}
