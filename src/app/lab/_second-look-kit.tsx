"use client";

/* ------------------------------------------------------------------ *
 *  Second look — shared lab chrome.
 *
 *  Unlike /lab/_kit.tsx (which copies the /lab/v2 tokens
 *  into a namespaced block), this kit deliberately uses the REAL app
 *  tokens from globals.css. The whole point of this room is comparing a
 *  shipped surface against a proposal, so the shipped side has to be the
 *  genuine article down to the hex, not a lookalike.
 *
 *  Read-only relationship to the app: we import PeaksMark / BirdAvatar
 *  and quote classNames, but nothing here writes to core files.
 * ------------------------------------------------------------------ */

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ *
 *  Type scale.
 *
 *  Whole pixels, eight steps, no half-steps. The craft room in this very
 *  lab counts 252 fractional sizes across the product and calls them a
 *  habit nobody chose; the first draft of this kit then used 10.5, 11.5,
 *  12.5 and 13.5 itself. Everything below is a whole number, and every
 *  step is used for one job.
 *
 *   T.label  12  uppercase section rules, chips, eyebrow labels
 *   T.small  14  captions, mount notes, secondary asides
 *   T.data   15  ledger cells, dense tabular reading
 *   T.body   17  running prose. This is the page's reading size.
 *   T.lede   19  the masthead lede and the tell
 *   T.stat   30  the scoreboard numerals
 * ------------------------------------------------------------------ */
export const T = {
  label: "text-[12px]",
  small: "text-[14px]",
  data: "text-[15px]",
  body: "text-[17px]",
  lede: "text-[19px]",
} as const;

/** running prose: the single class string every paragraph in a room should use */
export const PROSE = "text-[17px] leading-[1.65]";
/** an inline code span sized to sit inside PROSE without shrinking the line */
export const CODE = "rounded bg-mist px-1.5 py-0.5 text-[15px] text-foreground";

/* ---- the room registry ---- */

export type Room = {
  slug: string;
  title: string;
  /** the one-line premise: what looked fine */
  looked: string;
  /** what is actually wrong */
  tell: string;
  status: "built" | "planned";
};

export const ROOMS: Room[] = [
  {
    slug: "craft",
    title: "Why the sidebar looks 1080p",
    looked: "The nav has been there since day one and nobody flagged it.",
    tell: "Idle nav text is a 70% alpha of white over green: 4.31:1. That turned out to be the smallest version of the problem. The colour used 568 times across the app fails AA too.",
    status: "built",
  },
  {
    slug: "spine",
    title: "Six different left edges",
    looked: "Every page header looks reasonable on its own.",
    tell: "Feed starts at 284px, Collection at 332, Groups at 396, Letters at 460, Messages at 508. You never see two at once, so a 224px drift stays invisible and constant.",
    status: "built",
  },
  {
    slug: "support",
    title: "The ask that argues against itself",
    looked: "Honest, well written, nothing broken enough to file.",
    tell: "A progress bar at 0% of ₹4,00,000, drawn at 1.09:1 against its own card, animated with a count-up that counts to zero, above a caption saying it does not matter if it never fills.",
    status: "built",
  },
  {
    slug: "everything",
    title: "Everything else",
    looked: "Nine surfaces, all of which pass a glance.",
    tell: "76 findings from one read-through: 21 actually broken, 47 working but never decided, 8 genuinely good and worth protecting. The whole map, filterable.",
    status: "built",
  },
  {
    slug: "tiles",
    title: "When a box earns its border",
    looked: "Tiles everywhere. Consistent, tidy, inoffensive.",
    tell: "A border is the heaviest grouping tool there is. Four gates decide whether one is earned; score eight real surfaces yourself and watch the feed post pass 4 of 4 while a Catch-up row passes 1.",
    status: "built",
  },
  {
    slug: "houses",
    title: "The houses picker, as a game",
    looked: "A working multi-year form with a genuinely clever auto-advance.",
    tell: "It asks the same question five times, each an unaided scan of 22 uncoloured pills, about a fact you only have once. Three live alternatives; the best is one interaction.",
    status: "built",
  },
  {
    slug: "type",
    title: "The font question",
    looked: "Libre Baskerville and Source Sans 3. Perfectly respectable.",
    tell: "No, you cannot legally use the Apple font, and it would be wrong anyway. But the type ships as six static files where four variable ones would carry more, and Libre Baskerville is a body face doing display work. Five pairings, measured off the binaries, live.",
    status: "built",
  },
];

/* ------------------------------------------------------------------ *
 *  Shell
 * ------------------------------------------------------------------ */

/** height of the two sticky strips, used for scroll-margin on section anchors */
const STICKY_H = 108;

export function LabShell({
  title,
  lede,
  children,
}: {
  title: string;
  lede?: string;
  children: ReactNode;
}) {
  const [sections, setSections] = useState<{ id: string; label: string }[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const mainRef = useRef<HTMLElement>(null);

  /* The section index is built from the DOM rather than from a prop, so a room
     never has to keep a hand-written list in sync with its own <Rule>s. Rooms
     here run to 11,000px with a dozen sections; without this you can only
     navigate by scrolling and hoping. */
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const nodes = [...el.querySelectorAll<HTMLElement>("[data-rule]")];
    setSections(nodes.map((n) => ({ id: n.id, label: n.dataset.rule ?? "" })));
    if (!nodes.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        const onscreen = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (onscreen[0]) setActive(onscreen[0].target.id);
      },
      { rootMargin: `-${STICKY_H + 8}px 0px -62% 0px` },
    );
    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [children]);

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background">
        <div className="mx-auto flex max-w-[1240px] items-baseline gap-4 px-6 py-3.5 sm:px-9">
          <Link
            href="/lab"
            className="state-layer shrink-0 rounded-full border border-border bg-card px-3 py-1 text-[13px] font-semibold text-muted-foreground transition-colors hover:text-foreground active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
          >
            Lab
          </Link>
          <span className="min-w-0 truncate font-heading text-[16px] font-bold tracking-tight">
            {title}
          </span>
        </div>
      </header>

      {sections.length > 1 && (
        <nav
          aria-label="Sections"
          className="sticky top-[53px] z-30 border-b border-border bg-background"
        >
          <div className="relative mx-auto max-w-[1240px] overflow-x-auto px-6 sm:px-9 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex w-max gap-1 py-2">
              {sections.map((s, i) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className={cn(
                    // state-layer on the base, not on the idle branch: it tints
                    // whatever is under it, so the canopy chip gets the same
                    // hover weight as the bare one. Selection stays canopy.
                    "state-layer shrink-0 rounded-full px-3 py-1 text-[13px] font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf",
                    active === s.id
                      ? "bg-[#235C49] text-white"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span className="mr-1.5 tabular-nums opacity-55">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {s.label}
                </a>
              ))}
            </div>
          </div>
        </nav>
      )}

      <main ref={mainRef} className="mx-auto max-w-[1240px] px-6 pb-32 pt-12 sm:px-9">
        {/* Masthead runs across the full measure rather than stacking in the
            left third, so the page does not open with a void on the right. */}
        <div className="grid items-end gap-x-12 gap-y-4 border-b border-border pb-9 lg:grid-cols-[minmax(0,42%)_minmax(0,1fr)]">
          <h1 className="font-heading text-[clamp(2rem,4.2vw,2.8rem)] font-bold leading-[1.05] tracking-[-0.03em]">
            {title}
          </h1>
          {lede && (
            <p className="max-w-[56ch] text-[19px] leading-[1.55] text-muted-foreground lg:pb-1">
              {lede}
            </p>
          )}
        </div>
        <div className="mt-12">{children}</div>
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  Sticky control bar. The reason for this: on the craft page you flip
 *  a switch and the specimen it changes is 400px below, so you flip,
 *  scroll, look, scroll back. Wrapping the controls in this keeps them
 *  pinned under the section index while you look at what they change.
 * ------------------------------------------------------------------ */

export function Controls({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "card-elevated sticky top-[100px] z-20 -mx-3 mb-6 rounded-2xl border border-border bg-card px-4 py-3",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  Section rule — a hairline with a label sitting on it. No box.
 * ------------------------------------------------------------------ */

/** turn a heading into a stable anchor id */
function slug(node: ReactNode): string {
  const text = typeof node === "string" ? node : String(node ?? "");
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "section"
  );
}

export function Rule({
  children,
  className,
  /** shorter label for the sticky index; defaults to the full heading */
  nav,
}: {
  children: ReactNode;
  className?: string;
  nav?: string;
}) {
  const text = typeof children === "string" ? children : String(children ?? "");
  const id = slug(text);
  return (
    // The label must be allowed to wrap. `shrink-0` here pushed long section
    // titles past a 390px viewport on five of six rooms.
    // scroll-mt clears the two sticky strips when you jump to this anchor.
    <div
      id={id}
      data-rule={nav ?? text}
      className={cn("flex items-center gap-4 scroll-mt-[112px] pb-5 pt-16", className)}
    >
      <h2 className="min-w-0 text-[13px] font-bold uppercase leading-[1.45] tracking-[0.14em] text-foreground/70">
        {children}
      </h2>
      <span className="h-px min-w-6 flex-1 bg-border" />
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  The tell — the diagnosis. A cinnamon spine, not a card, because the
 *  point of this whole lab is that a border is not free.
 * ------------------------------------------------------------------ */

export function Tell({
  children,
  label = "The tell",
  tone = "cinnamon",
  stats,
}: {
  children: ReactNode;
  label?: string;
  tone?: "cinnamon" | "leaf" | "sky";
  /** the scoreboard that sits opposite the diagnosis, so the page does not
      open with a column of prose against 700px of nothing */
  stats?: { n: string; of: string; tone?: "bad" | "good" | "plain" }[];
}) {
  const spine = { cinnamon: "bg-cinnamon", leaf: "bg-leaf", sky: "bg-sky" }[tone];
  const ink = { cinnamon: "text-cinnamon", leaf: "text-leaf", sky: "text-sky" }[tone];
  return (
    <div
      className={cn(
        "grid gap-x-12 gap-y-8",
        stats && "lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)]",
      )}
    >
      <div className="relative self-start pl-5">
        <span className={cn("absolute left-0 top-1 bottom-1 w-[3px] rounded-full", spine)} />
        <div className={cn("text-[13px] font-bold uppercase tracking-[0.14em]", ink)}>{label}</div>
        <div className="mt-3 max-w-[64ch] space-y-3.5 text-[17px] leading-[1.65] text-foreground [&_b]:font-semibold">
          {children}
        </div>
      </div>

      {stats && (
        <dl className="divide-y divide-border border-y border-border">
          {stats.map((s) => (
            <div key={s.of} className="flex items-baseline gap-4 py-3.5">
              <dt
                className={cn(
                  "w-[112px] shrink-0 text-right font-heading text-[30px] font-bold leading-none tabular-nums tracking-[-0.03em]",
                  s.tone === "good"
                    ? "text-leaf"
                    : s.tone === "plain"
                      ? "text-foreground"
                      : "text-heart",
                )}
              >
                {s.n}
              </dt>
              <dd className="text-[15px] leading-[1.4] text-muted-foreground">{s.of}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  Measured facts. A ledger, not a card: the numbers ARE the argument,
 *  so they get tabular figures and nothing else competing.
 * ------------------------------------------------------------------ */

export type LedgerRow = {
  k: string;
  v: (string | ReactNode)[];
  /** column indices (into v) to mark as the problem */
  bad?: number[];
  /** column indices (into v) to mark as the fix */
  good?: number[];
  /** legacy shorthand: bad = first cell, good = last cell */
  flag?: "bad" | "good";
};

export function Ledger({
  rows,
  cols,
  firstCol = "38%",
}: {
  cols: string[];
  rows: LedgerRow[];
  firstCol?: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse text-left">
        <thead>
          <tr>
            {cols.map((c, i) => (
              <th
                key={i}
                style={i === 0 ? { width: firstCol } : undefined}
                className="border-b border-border pb-2.5 pr-5 text-[12px] font-bold uppercase tracking-[0.12em] text-muted-foreground"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={`${r.k}-${ri}`} className="border-b border-border/60 last:border-0">
              <td className="py-3 pr-5 align-top text-[15px] font-semibold text-foreground">
                {r.k}
              </td>
              {r.v.map((cell, i) => {
                const bad = r.bad?.includes(i) || (r.flag === "bad" && i === 0);
                const good = r.good?.includes(i) || (r.flag === "good" && i === r.v.length - 1);
                return (
                  <td
                    key={i}
                    className={cn(
                      "py-3 pr-5 align-top text-[15px] leading-[1.45] tabular-nums",
                      bad && "font-semibold text-heart",
                      good && "font-semibold text-leaf",
                      !bad && !good && "text-muted-foreground",
                    )}
                  >
                    {cell}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  Specimen mount. A recessed well with a label tab, so a sample reads
 *  as "a thing on a bench" rather than "a card in a product".
 * ------------------------------------------------------------------ */

export type MountTone = "shipped" | "option" | "pick";

const TONE: Record<MountTone, { chip: string; ring: string; word: string }> = {
  shipped: {
    chip: "bg-mist text-muted-foreground",
    ring: "border-border",
    word: "Shipped",
  },
  option: {
    chip: "bg-sky/12 text-sky",
    ring: "border-border",
    word: "Option",
  },
  pick: {
    chip: "bg-leaf/14 text-leaf",
    ring: "border-leaf/35",
    word: "Recommended",
  },
};

export function Mount({
  tone = "option",
  label,
  note,
  children,
  flush = false,
  dark = false,
  className,
}: {
  tone?: MountTone;
  /** overrides the tone word */
  label?: string;
  note?: string;
  children: ReactNode;
  /** no padding around the specimen (for full-bleed mocks) */
  flush?: boolean;
  /** dark well, for specimens that are themselves dark */
  dark?: boolean;
  className?: string;
}) {
  const t = TONE[tone];
  return (
    <figure className={cn("min-w-0", className)}>
      <figcaption className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span
          className={cn(
            "rounded-full px-3 py-1 text-[12px] font-bold uppercase tracking-[0.1em]",
            t.chip,
          )}
        >
          {label ?? t.word}
        </span>
        {note && (
          <span className="text-[14px] leading-snug text-muted-foreground">{note}</span>
        )}
      </figcaption>
      <div
        className={cn(
          "overflow-hidden rounded-2xl border",
          t.ring,
          dark ? "bg-[#23241E]" : "bg-mist",
          !flush && "p-5",
        )}
      >
        {children}
      </div>
    </figure>
  );
}

/** side-by-side bench; collapses to a stack under 900px */
export function Bench({
  children,
  cols = 2,
  className,
}: {
  children: ReactNode;
  cols?: 2 | 3;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid gap-6",
        cols === 2 ? "lg:grid-cols-2" : "md:grid-cols-2 xl:grid-cols-3",
        className,
      )}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  Verdict — the call. Deliberately the only filled surface on a page,
 *  so it reads as the conclusion.
 * ------------------------------------------------------------------ */

export function Verdict({ children, title = "The call" }: { children: ReactNode; title?: string }) {
  return (
    <div className="card-elevated mt-16 rounded-2xl border border-border bg-card p-8">
      <div className="text-[13px] font-bold uppercase tracking-[0.14em] text-leaf">{title}</div>
      <div className="mt-3.5 max-w-[70ch] space-y-4 text-[17px] leading-[1.65] [&_b]:font-semibold [&_code]:rounded [&_code]:bg-mist [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[15px]">
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  Controls
 * ------------------------------------------------------------------ */

export function Switches<K extends string>({
  items,
  value,
  onChange,
}: {
  items: { k: K; label: string; hint?: string }[];
  value: Record<K, boolean>;
  onChange: (k: K) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((it) => {
        const on = value[it.k];
        return (
          <button
            key={it.k}
            type="button"
            onClick={() => onChange(it.k)}
            aria-pressed={on}
            title={it.hint}
            className={cn(
              // The pressed leaf wash is the state, state-layer is the hover on
              // top of it: a toggle needs both readable at once.
              "state-layer rounded-full border px-4 py-2 text-[14px] font-semibold transition-[border-color,color,transform] duration-150 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf",
              on
                ? "border-leaf/40 bg-leaf/14 text-leaf"
                : "border-border bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

/** one-of-N picker */
export function Pick<K extends string>({
  items,
  value,
  onChange,
}: {
  items: { k: K; label: string }[];
  value: K;
  onChange: (k: K) => void;
}) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-full border border-border bg-mist p-1">
      {items.map((it) => (
        <button
          key={it.k}
          type="button"
          onClick={() => onChange(it.k)}
          className={cn(
            "rounded-full px-4 py-2 text-[14px] font-semibold transition-[background-color,color,transform] duration-150 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf",
            value === it.k
              ? "bg-[#235C49] text-white"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

export function useToggles<K extends string>(initial: Record<K, boolean>) {
  const [state, setState] = useState(initial);
  const toggle = (k: K) => setState((s) => ({ ...s, [k]: !s[k] }));
  const setAll = (v: boolean) =>
    setState((s) => Object.fromEntries(Object.keys(s).map((k) => [k, v])) as Record<K, boolean>);
  return { state, toggle, setAll };
}
