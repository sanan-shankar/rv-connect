"use client";

/* ------------------------------------------------------------------ *
 *  Groups-rethink preview kit.
 *
 *  Self-contained chrome for the "what should Groups become" concepts.
 *  Nothing here touches core app files. It renders a faithful mock of
 *  the flush-green app shell so each concept can SHOW where its
 *  groups-successor lives in the nav (the owner's hard constraint:
 *  never top-3). Brand tokens come from globals.css; the real
 *  PeaksMark + BirdAvatar are reused for authenticity.
 * ------------------------------------------------------------------ */

import Link from "next/link";
import type { ReactNode } from "react";
import {
  Newspaper,
  Compass,
  Users,
  Images,
  Feather,
  MessagesSquare,
  CalendarDays,
  Info,
  MapPin,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { PeaksMark } from "@/components/layout/peaks-mark";
import { BirdAvatar } from "@/components/common/bird-avatar";

export { BirdAvatar };

/* ---- concept registry (drives the switcher + index) ---- */
export const CONCEPTS = [
  {
    slug: "circles",
    n: "A",
    title: "Circles for Catch-ups",
    pitch: "Groups vanish as a noun. A Circle is just the invisible plumbing a Catch-up runs on. You never browse groups; you land on your Catch-ups.",
  },
  {
    slug: "batches-interest",
    n: "B",
    title: "Batches + Special Interest",
    pitch: "Two space types, neither user-created: your Batch (auto from your year) and a short, admin-curated shelf of interest spaces like Burdens of RV.",
  },
  {
    slug: "dissolve",
    n: "C",
    title: "Groups dissolve away",
    pitch: "No groups surface at all. The jobs scatter: batches and places into the Directory, cohorts into a Feed filter, Catch-ups onto the batch itself.",
  },
  {
    slug: "gatherings",
    n: "D",
    title: "Gatherings (synthesis)",
    pitch: "Batch rooms (auto, Catch-up-led) + a curated shelf of Gatherings + threshold Places that live in the Directory. One demoted nav entry. Recommended.",
  },
] as const;

export type ConceptSlug = (typeof CONCEPTS)[number]["slug"];

/* ---- nav model: each concept declares its own sidebar so placement is visible ---- */
export type NavItem = {
  label: string;
  icon: LucideIcon;
  active?: boolean;
  /** dim + smaller: an annotation, not a real destination */
  ghost?: boolean;
  /** a small trailing note, e.g. "was Groups" */
  note?: string;
};

export const ICONS = {
  Newspaper,
  Compass,
  Users,
  Images,
  Feather,
  MessagesSquare,
  CalendarDays,
  Info,
  MapPin,
  Sparkles,
};

function Sidebar({ nav }: { nav: NavItem[] }) {
  return (
    <aside
      className="sticky top-0 hidden h-dvh w-[240px] shrink-0 flex-col justify-between bg-[#235C49] px-3 py-5 text-[#EBF3EE] lg:flex"
      aria-label="Preview navigation"
    >
      <div>
        <div className="mb-6 flex items-center gap-2.5 px-2">
          <PeaksMark size={22} variant="light" />
          <span className="font-heading text-[18px] font-bold tracking-tight text-[#F3F7F1]">
            Rishi Valley
          </span>
        </div>
        <nav className="flex flex-col gap-0.5">
          {nav.map((item, i) => {
            const Icon = item.icon;
            if (item.ghost) {
              return (
                <div
                  key={i}
                  className="flex items-center gap-2 px-3 py-1 text-[12px] italic text-[#EBF3EE]/45"
                >
                  <Icon className="h-3.5 w-3.5 opacity-60" strokeWidth={2} />
                  <span className="line-through decoration-[#EBF3EE]/40">{item.label}</span>
                  {item.note && <span className="not-italic no-underline">· {item.note}</span>}
                </div>
              );
            }
            return (
              <div
                key={i}
                className={[
                  "relative flex items-center gap-2.5 rounded-xl px-3 py-2 text-[14px] transition-colors",
                  item.active
                    ? "bg-[#2E6A55] font-semibold text-white"
                    : "text-[#D6E3DA] hover:bg-[#2A6250]",
                ].join(" ")}
              >
                {item.active && (
                  <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-[#34C759]" />
                )}
                <Icon className="h-[18px] w-[18px]" strokeWidth={item.active ? 2.4 : 2} />
                <span className="flex-1">{item.label}</span>
                {item.note && (
                  <span className="rounded-full bg-[#34C759]/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#BFE9CC]">
                    {item.note}
                  </span>
                )}
              </div>
            );
          })}
        </nav>
      </div>
      <div className="flex items-center gap-2.5 rounded-2xl bg-[#1F5140] px-2.5 py-2">
        <BirdAvatar user={{ id: "sanan-preview", name: "Sanan Shankar" }} size={36} />
        <div className="min-w-0 leading-tight">
          <div className="truncate text-[13px] font-semibold text-[#F3F7F1]">Sanan Shankar</div>
          <div className="truncate text-[11px] text-[#B9CFC2]">Batch of 2004</div>
        </div>
      </div>
    </aside>
  );
}

function Switcher({ current }: { current: ConceptSlug | "index" }) {
  return (
    <div className="glass sticky top-0 z-30 border-b border-border/70">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 px-5 py-2.5">
        <Link
          href="/preview/groups-rethink"
          className={[
            "rounded-full px-3 py-1 text-[12px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf/50",
            current === "index"
              ? "bg-[#235C49] text-white"
              : "text-muted-foreground hover:bg-mist hover:text-foreground",
          ].join(" ")}
        >
          Overview
        </Link>
        <span className="text-border">|</span>
        {CONCEPTS.map((c) => (
          <Link
            key={c.slug}
            href={`/preview/groups-rethink/${c.slug}`}
            className={[
              "rounded-full px-3 py-1 text-[12px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf/50",
              current === c.slug
                ? "bg-[#235C49] text-white"
                : "text-muted-foreground hover:bg-mist hover:text-foreground",
            ].join(" ")}
          >
            <span className="font-bold">{c.n}</span>
            <span className="mx-1.5 hidden sm:inline">·</span>
            <span className="hidden sm:inline">{c.title}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function PreviewShell({
  current,
  nav,
  children,
}: {
  current: ConceptSlug | "index";
  nav?: NavItem[];
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="flex">
        {nav && <Sidebar nav={nav} />}
        <div className="min-w-0 flex-1">
          <Switcher current={current} />
          <main className="mx-auto max-w-[1080px] px-5 py-8 sm:px-8 sm:py-10">{children}</main>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Shared atoms                                                       */
/* ------------------------------------------------------------------ */

const EYEBROW_TONE: Record<string, string> = {
  leaf: "text-leaf",
  sky: "text-sky",
  cinnamon: "text-cinnamon",
  ink: "text-muted-foreground",
};

export function Eyebrow({
  children,
  tone = "ink",
  className = "",
}: {
  children: ReactNode;
  tone?: "leaf" | "sky" | "cinnamon" | "ink";
  className?: string;
}) {
  return (
    <div
      className={`text-[11px] font-bold uppercase tracking-[0.15em] ${EYEBROW_TONE[tone]} ${className}`}
    >
      {children}
    </div>
  );
}

export function Card({
  children,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article";
}) {
  return (
    <Tag
      className={`card-elevated rounded-2xl border border-border bg-card ${className}`}
    >
      {children}
    </Tag>
  );
}

export function CTA({
  children,
  variant = "primary",
  className = "",
}: {
  children: ReactNode;
  variant?: "primary" | "outline" | "ghost";
  className?: string;
}) {
  const styles: Record<string, string> = {
    primary:
      "bg-[#235C49] text-white hover:bg-[#1E5040] active:scale-[0.98] shadow-[0_1px_2px_rgba(30,28,22,0.12)]",
    outline:
      "border border-border bg-card text-foreground hover:bg-mist active:scale-[0.98]",
    ghost: "text-[#235C49] hover:bg-mist active:scale-[0.98]",
  };
  return (
    <span
      className={`inline-flex cursor-pointer select-none items-center justify-center gap-1.5 rounded-full px-4 py-2 text-[13.5px] font-semibold transition-[background-color,transform] duration-150 ${styles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

export function Chip({
  children,
  tone = "neutral",
  className = "",
}: {
  children: ReactNode;
  tone?: "neutral" | "leaf" | "sky" | "cinnamon" | "heart" | "canopy";
  className?: string;
}) {
  const tones: Record<string, string> = {
    neutral: "bg-mist text-muted-foreground",
    leaf: "bg-leaf/12 text-leaf",
    sky: "bg-sky/12 text-sky",
    cinnamon: "bg-cinnamon/12 text-cinnamon",
    heart: "bg-heart/12 text-heart",
    canopy: "bg-[#235C49]/12 text-[#235C49]",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

/** A cluster of overlapping bird avatars for "who is in here". */
export function AvatarStack({
  people,
  size = 30,
  max = 6,
  extra,
}: {
  people: { id: string; name: string }[];
  size?: number;
  max?: number;
  extra?: number;
}) {
  const shown = people.slice(0, max);
  const overflow = (extra ?? people.length) - shown.length;
  return (
    <div className="flex items-center">
      <div className="flex -space-x-2">
        {shown.map((p) => (
          <span
            key={p.id}
            className="rounded-full ring-2 ring-card"
            style={{ width: size, height: size }}
          >
            <BirdAvatar user={{ id: p.id, name: p.name }} size={size} />
          </span>
        ))}
      </div>
      {overflow > 0 && (
        <span className="ml-2 text-[12px] font-medium text-muted-foreground">
          +{overflow}
        </span>
      )}
    </div>
  );
}

/** A compact Catch-up status strip (the recurring group-letter cycle). */
export function CatchupStatus({
  round,
  state,
  detail,
}: {
  round: number;
  state: "collecting" | "answering" | "preparing" | "published";
  detail: string;
}) {
  const label: Record<string, string> = {
    collecting: "Questions open",
    answering: "Answering now",
    preparing: "Preparing",
    published: `Round ${round} published`,
  };
  const tone: Record<string, "sky" | "leaf" | "cinnamon" | "canopy"> = {
    collecting: "sky",
    answering: "leaf",
    preparing: "cinnamon",
    published: "canopy",
  };
  return (
    <div className="flex items-center gap-2">
      <Chip tone={tone[state]}>
        <MessagesSquare className="h-3 w-3" />
        {label[state]}
      </Chip>
      <span className="text-[12.5px] text-muted-foreground">{detail}</span>
    </div>
  );
}

/** The self-documenting decisions strip at the foot of each concept. */
export function DecisionCard({
  rows,
}: {
  rows: { q: string; a: ReactNode }[];
}) {
  return (
    <Card className="mt-9 p-6">
      <Eyebrow tone="cinnamon">How this concept answers the brief</Eyebrow>
      <dl className="mt-4 grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
        {rows.map((r, i) => (
          <div key={i}>
            <dt className="font-heading text-[15px] font-semibold tracking-tight text-foreground">
              {r.q}
            </dt>
            <dd className="mt-1 text-[13.5px] leading-relaxed text-muted-foreground">
              {r.a}
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

export function ConceptHeading({
  n,
  title,
  lede,
}: {
  n: string;
  title: string;
  lede: string;
}) {
  return (
    <header className="mb-8">
      <Eyebrow tone="leaf">Concept {n}</Eyebrow>
      <h1 className="mt-2 font-heading text-[2rem] font-bold leading-tight tracking-[-0.025em] text-foreground">
        {title}
      </h1>
      <p className="mt-2 max-w-[64ch] text-[15px] leading-relaxed text-muted-foreground">
        {lede}
      </p>
    </header>
  );
}
