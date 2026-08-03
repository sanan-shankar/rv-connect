"use client";

/* ------------------------------------------------------------------ *
 *  Six treatments for the sidebar's active-row marker, side by side.
 *
 *  Not linked from anywhere (including _kit.tsx's ROOMS registry) on
 *  purpose. Visit directly at /lab/spine-marker.
 *
 *  The shipped nav (src/components/layout/sidebar.tsx) draws the active
 *  row as TWO separate elements: an inset rounded pill (bg-sidebar-active)
 *  and a 3px cinnamon bar sitting 8px to its LEFT, outside the pill. The
 *  owner's complaint, verbatim (2026-07-30): "now we have a pill shaped
 *  status thing that holds the icon and the text. And then this line
 *  beside it... it just feels like too unrelated elements. It doesn't
 *  feel like one unit... the pill has different gaps to the line because
 *  it curves."
 *
 *  Each version below fuses the cinnamon accent and the fill into ONE
 *  shape instead of two shapes that happen to sit near each other: a
 *  shared straight edge, a squared-off inner corner, or the cinnamon
 *  carrying the whole state alone.
 * ------------------------------------------------------------------ */

import { useState } from "react";
import Link from "next/link";
import {
  Newspaper,
  Notebook,
  Images,
  Feather,
  MessagesSquare,
  HeartHandshake,
  Info,
  type LucideIcon,
} from "lucide-react";
import { motion } from "motion/react";
import { NAV_MARKER_SPRING } from "@/components/common/motion";
import { Wordmark } from "@/components/layout/peaks-mark";
import { BirdAvatar } from "@/components/common/bird-avatar";
import { cn } from "@/lib/utils";

/* Same seven items the shipped sidebar renders (src/components/layout/sidebar.tsx). */
const NAV: { label: string; icon: LucideIcon }[] = [
  { label: "Feed", icon: Newspaper },
  { label: "Directory", icon: Notebook },
  { label: "Collection", icon: Images },
  { label: "Letters", icon: Feather },
  { label: "Catch-ups", icon: MessagesSquare },
  { label: "Support", icon: HeartHandshake },
  { label: "About", icon: Info },
];

const INITIAL_ACTIVE = "Directory";
/** Shown permanently in its hover look, since a static screenshot can't hover a cursor. */
const HOVER_DEMO = "Letters";

type Variant = "flush" | "inset" | "underline" | "notch" | "fill" | "curve";

type RowProps = {
  item: { label: string; icon: LucideIcon };
  isActive: boolean;
  isHoverDemo: boolean;
  onClick: () => void;
  ns: string;
};

const ROW_BASE =
  "relative flex w-full items-center gap-3 py-2.5 text-[14px] font-medium transition-colors active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring";

/* ---- A · Flush tab ---------------------------------------------------- */
function FlushRow({ item, isActive, isHoverDemo, onClick, ns }: RowProps) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        ROW_BASE,
        "rounded-r-full pl-4 pr-3",
        isActive
          ? "font-semibold text-sidebar-accent-foreground"
          : "text-sidebar-foreground-idle hover:bg-sidebar-hover hover:text-sidebar-foreground",
        isHoverDemo && "bg-sidebar-hover text-sidebar-foreground"
      )}
    >
      {isActive && (
        <motion.span
          layoutId={`${ns}-marker`}
          initial={false}
          className="absolute inset-0 z-0 rounded-r-full border-l-[3px] border-cinnamon bg-sidebar-active"
          transition={NAV_MARKER_SPRING}
        />
      )}
      <Icon className="relative z-[1] h-[18px] w-[18px] shrink-0" strokeWidth={2} />
      <span className="relative z-[1]">{item.label}</span>
    </button>
  );
}

/* ---- B · Inset card ----------------------------------------------------- */
function InsetRow({ item, isActive, isHoverDemo, onClick, ns }: RowProps) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        ROW_BASE,
        "rounded-xl px-3",
        isActive
          ? "font-semibold text-sidebar-accent-foreground"
          : "text-sidebar-foreground-idle hover:bg-sidebar-hover hover:text-sidebar-foreground",
        isHoverDemo && "bg-sidebar-hover text-sidebar-foreground"
      )}
    >
      {isActive && (
        <motion.span
          layoutId={`${ns}-marker`}
          initial={false}
          className="absolute inset-0 z-0 overflow-hidden rounded-l-md rounded-r-xl bg-sidebar-active"
          transition={NAV_MARKER_SPRING}
        >
          <span className="absolute inset-y-0 left-0 w-[3px] bg-cinnamon" />
        </motion.span>
      )}
      <Icon className="relative z-[1] h-[18px] w-[18px] shrink-0" strokeWidth={2} />
      <span className="relative z-[1]">{item.label}</span>
    </button>
  );
}

/* ---- C · Underline -------------------------------------------------------- */
function UnderlineRow({ item, isActive, isHoverDemo, onClick, ns }: RowProps) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        ROW_BASE,
        "rounded-lg px-3",
        isActive
          ? "font-semibold text-sidebar-foreground"
          : "text-sidebar-foreground-idle hover:bg-sidebar-hover hover:text-sidebar-foreground",
        isHoverDemo && "bg-sidebar-hover text-sidebar-foreground"
      )}
    >
      {/* inline-flex hugs exactly the icon+gap+label content, so the rule
          below (inset-x-0 of THIS span) spans icon's left edge to text end */}
      <span className="relative inline-flex items-center gap-3">
        <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
        <span>{item.label}</span>
        {isActive && (
          <motion.span
            layoutId={`${ns}-marker`}
            initial={false}
            className="absolute inset-x-0 -bottom-1.5 h-[2px] rounded-full bg-cinnamon"
            transition={NAV_MARKER_SPRING}
          />
        )}
      </span>
    </button>
  );
}

/* ---- D · Notch ------------------------------------------------------------ */
function NotchRow({ item, isActive, isHoverDemo, onClick, ns }: RowProps) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        ROW_BASE,
        "rounded-full px-4",
        isActive
          ? "font-semibold text-sidebar-accent-foreground"
          : "text-sidebar-foreground-idle hover:bg-sidebar-hover hover:text-sidebar-foreground",
        isHoverDemo && "bg-sidebar-hover text-sidebar-foreground"
      )}
    >
      {isActive && (
        <motion.span
          layoutId={`${ns}-pill`}
          initial={false}
          className="absolute inset-0 z-0 rounded-full bg-sidebar-active"
          transition={NAV_MARKER_SPRING}
        />
      )}
      <Icon className="relative z-[1] h-[18px] w-[18px] shrink-0" strokeWidth={2} />
      <span className="relative z-[1] flex-1 text-left">{item.label}</span>
      {isActive && (
        <motion.span
          layoutId={`${ns}-dot`}
          initial={false}
          className="relative z-[1] h-[7px] w-[7px] shrink-0 rounded-full bg-cinnamon"
          transition={NAV_MARKER_SPRING}
        />
      )}
    </button>
  );
}

/* ---- E · Cinnamon fill ----------------------------------------------------- */
function FillRow({ item, isActive, isHoverDemo, onClick, ns }: RowProps) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        ROW_BASE,
        "rounded-r-full pl-4 pr-3",
        isActive
          ? "font-semibold text-cinnamon"
          : "text-sidebar-foreground-idle hover:bg-sidebar-hover hover:text-sidebar-foreground",
        isHoverDemo && "bg-sidebar-hover text-sidebar-foreground"
      )}
    >
      {isActive && (
        <>
          <motion.span
            layoutId={`${ns}-wash`}
            initial={false}
            className="absolute inset-0 z-0 rounded-r-full bg-cinnamon/14"
            transition={NAV_MARKER_SPRING}
          />
          <motion.span
            layoutId={`${ns}-rail`}
            initial={false}
            className="absolute inset-y-0 left-0 z-[1] w-[3px] bg-cinnamon"
            transition={NAV_MARKER_SPRING}
          />
        </>
      )}
      <Icon className="relative z-[2] h-[18px] w-[18px] shrink-0" strokeWidth={2} />
      <span className="relative z-[2]">{item.label}</span>
    </button>
  );
}

/* ---- F · Cinnamon C -------------------------------------------------------
 *
 *  The owner's own version (2026-08-03): "the cinnamon marker is in the same
 *  position except it's as tall as the marker pill. Then have it reach till
 *  the pill and have it flush with the pill and then fill it in. So the
 *  cinnamon would be this C shaped kinda thing with a curved right side and a
 *  flat left side. The top and bottom would also be flat."
 *
 *  Against the shipped marker (a 3px bar inset 6px top and bottom, floating
 *  8px clear of the pill) this is: full row height, no inset, no gap, solid.
 *
 *  HOW THE CURVE IS DRAWN, which is the only interesting part: it is not
 *  drawn. The cinnamon is a plain rectangle running from 8px left of the row
 *  to `CAP` px INSIDE it, and the pill is painted on top. The pill's own
 *  rounded left cap is what eats the rectangle's right edge, leaving cinnamon
 *  visible in the two corner notches and nowhere else. That reads as one
 *  shape with a flat left, a flat top, a flat bottom and a concave right: the
 *  C. Doing it this way means the curve is BY CONSTRUCTION the pill's curve,
 *  so the two can never disagree by a pixel or drift if the radius changes,
 *  and it costs no SVG and no measurement.
 *
 *  CAP is the row's corner radius (rounded-xl == --radius-xl == 20.8px). At a
 *  ~42px row that is nearly a half circle, so the C reads as a deep crescent
 *  rather than a nick. */
const CAP = 21;
function CurveRow({ item, isActive, isHoverDemo, onClick, ns }: RowProps) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        ROW_BASE,
        "rounded-xl px-3",
        isActive
          ? "font-semibold text-sidebar-accent-foreground"
          : "text-sidebar-foreground-idle hover:bg-sidebar-hover hover:text-sidebar-foreground",
        isHoverDemo && "bg-sidebar-hover text-sidebar-foreground"
      )}
    >
      {isActive && (
        <motion.span
          layoutId={`${ns}-marker`}
          initial={false}
          className="absolute inset-0 z-0"
          transition={NAV_MARKER_SPRING}
        >
          {/* The slab. Square corners on its own left, top and bottom. */}
          <span
            className="absolute inset-y-0 bg-cinnamon"
            style={{ left: -8, width: 8 + CAP }}
          />
          {/* The pill, painted over it. Its cap carves the concave right. */}
          <span className="absolute inset-0 rounded-xl bg-sidebar-active" />
        </motion.span>
      )}
      <Icon className="relative z-[1] h-[18px] w-[18px] shrink-0" strokeWidth={2} />
      <span className="relative z-[1]">{item.label}</span>
    </button>
  );
}

const ROW_COMPONENT: Record<Variant, (props: RowProps) => React.JSX.Element> = {
  flush: FlushRow,
  inset: InsetRow,
  underline: UnderlineRow,
  notch: NotchRow,
  fill: FillRow,
  curve: CurveRow,
};

/* Flush + fill both run the row to the sidebar's true left edge, so their
   <nav> loses the left half of the usual gutter (kept only on the right). */
const FLUSH_LAYOUT: Variant[] = ["flush", "fill"];

function DemoSidebar({
  variant,
  ns,
  title,
  blurb,
}: {
  variant: Variant;
  ns: string;
  title: string;
  blurb: string;
}) {
  const [active, setActive] = useState(INITIAL_ACTIVE);
  const RowComponent = ROW_COMPONENT[variant];
  const flushLayout = FLUSH_LAYOUT.includes(variant);

  return (
    <div className="flex w-[248px] shrink-0 flex-col gap-3">
      <div
        className="flex h-[560px] w-[248px] shrink-0 flex-col gap-3 overflow-hidden bg-sidebar pb-4 pt-5"
        style={{ fontFamily: "var(--font-body)" }}
      >
        <div className="flex justify-center px-4">
          <Wordmark
            variant="two-plane"
            className="min-w-0"
            markClassName="shrink-0 text-sidebar-foreground"
            textClassName="min-w-0 truncate text-sidebar-foreground"
          />
        </div>

        <nav className={cn("flex flex-col gap-0.5", flushLayout ? "pr-4" : "px-4")}>
          {NAV.map((item) => (
            <RowComponent
              key={item.label}
              item={item}
              isActive={item.label === active}
              isHoverDemo={item.label !== active && item.label === HOVER_DEMO}
              onClick={() => setActive(item.label)}
              ns={ns}
            />
          ))}
        </nav>

        {/* decorative footer chip, so the rail reads as a real full sidebar
            rather than nav-then-void; also shows the batch-meta fix in situ */}
        <div className="mt-auto flex items-center gap-2.5 rounded-2xl bg-white/[0.07] px-2.5 py-2 mx-4">
          <BirdAvatar user={{ id: `${ns}-demo-user`, name: "Sanan Shankar" }} size={34} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-semibold leading-none text-sidebar-foreground">
              Sanan Shankar
            </div>
            <div className="mt-1 truncate text-[11px] leading-none text-sidebar-foreground-muted">
              ISC 2023
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[248px]">
        <div className="text-[13px] font-bold uppercase tracking-[0.08em] text-foreground">
          {title}
        </div>
        <p className="mt-1 text-[13px] leading-[1.5] text-muted-foreground">{blurb}</p>
      </div>
    </div>
  );
}

export default function SpineMarkerRoom() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-border bg-background">
        <div className="mx-auto max-w-[1400px] px-6 py-5 sm:px-9">
          <Link
            href="/lab"
            className="state-layer inline-flex shrink-0 rounded-full border border-border bg-card px-3 py-1 text-[13px] font-semibold text-muted-foreground transition-colors hover:text-foreground active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
          >
            Lab
          </Link>
          <h1 className="mt-3 font-heading text-[clamp(1.8rem,3.4vw,2.4rem)] font-bold leading-[1.1] tracking-[-0.03em]">
            One unit, six ways
          </h1>
          <p className="mt-3 max-w-[70ch] text-[16px] leading-[1.6] text-muted-foreground">
            The shipped active row is two shapes that happen to sit next to each other: a rounded
            pill, and a straight cinnamon bar 8px outside it, so the gap between them changes as
            the pill curves away. Each sidebar below fuses the cinnamon accent into the fill
            itself, so there is exactly one edge, not two. Click any item to see the marker glide;
            each sidebar keeps its own state.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-6 py-10 sm:px-9">
        <div className="flex flex-col gap-10 lg:flex-row lg:flex-wrap lg:items-start lg:gap-4">
          <DemoSidebar
            variant="flush"
            ns="flush"
            title="A · Flush tab"
            blurb="The active row runs flush to the sidebar's own left edge and only rounds on the trailing side; the cinnamon rail is that edge, not a bar beside it."
          />
          <DemoSidebar
            variant="inset"
            ns="inset"
            title="B · Inset card"
            blurb="Same rounded pill as today, but the rail lives inside it against a squared-off inner corner, so a straight edge never has to meet a curve."
          />
          <DemoSidebar
            variant="underline"
            ns="underline"
            title="C · Underline"
            blurb="No fill at all. A cinnamon rule sits under the icon and label only, exactly as wide as the content above it, and the label brightens."
          />
          <DemoSidebar
            variant="notch"
            ns="notch"
            title="D · Notch"
            blurb="The familiar full pill, with the cinnamon reduced to a single dot trailing the label instead of a bar leading it."
          />
          <DemoSidebar
            variant="fill"
            ns="fill"
            title="E · Cinnamon fill"
            blurb="No green on the active row at all: a faint cinnamon wash, an opaque cinnamon rail flush to the edge, and cinnamon-tinted text carry the whole state."
          />
          <DemoSidebar
            variant="curve"
            ns="curve"
            title="F · Cinnamon C"
            blurb="The owner's own: the bar grows to the pill's full height, closes the 8px gap, and fills solid. Its right edge is the pill's own cap carving into it, so the two are one shape by construction."
          />
        </div>
      </main>
    </div>
  );
}
