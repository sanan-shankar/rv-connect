"use client";

/* ------------------------------------------------------------------ *
 *  Specimens for the "When a box earns its border" room.
 *
 *  Every shipped mock is drawn at TRUE CSS pixel size with the real
 *  tokens, so a height printed next to it is the height you would get
 *  in the product. Geometry was taken off the running app at a 1440px
 *  viewport on 2026-07-25 with getBoundingClientRect, not estimated.
 * ------------------------------------------------------------------ */

import { useState, type ReactNode } from "react";
import { Feather } from "lucide-react";
import { BirdAvatar } from "@/components/common/bird-avatar";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ *
 *  Measured constants (see page.tsx for what each one proves)
 * ------------------------------------------------------------------ */

export const M = {
  /** 5 tiles at 91.25px on a 105.25px pitch, measured on /catchups */
  catchupColumn: 512.3,
  /** the left column at a 1440px viewport: 1112 - 318 rail - 30 gap */
  catchupColWidth: 764,
  /** catchups/page.tsx:254 and feed/page.tsx:44 both hard-code this */
  railWidth: 318,
} as const;

/* ------------------------------------------------------------------ *
 *  A vertical measure that self-sizes to whatever it sits beside.
 * ------------------------------------------------------------------ */

export function Measure({
  n,
  tone = "bad",
  slim = false,
}: {
  n?: string;
  tone?: "bad" | "good" | "plain";
  /** rule and ticks only, 12px wide, for specimens that need the horizontal room */
  slim?: boolean;
}) {
  const c =
    tone === "good" ? "text-leaf" : tone === "plain" ? "text-muted-foreground" : "text-cinnamon";
  const bg = tone === "good" ? "bg-leaf" : tone === "plain" ? "bg-muted-foreground" : "bg-cinnamon";
  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-end",
        slim ? "w-3 pr-1.5" : "w-[62px] pr-3",
      )}
    >
      <span className={cn("absolute right-0 top-0 bottom-0 w-px opacity-45", bg)} />
      <span className={cn("absolute right-0 top-0 h-px w-2.5", bg)} />
      <span className={cn("absolute right-0 bottom-0 h-px w-2.5", bg)} />
      {!slim && n && (
        <span
          className={cn(
            "relative z-10 bg-mist px-1 text-[11px] font-bold tabular-nums leading-none",
            c,
          )}
        >
          {n}
        </span>
      )}
    </div>
  );
}

/** Draws a dashed line where the shipped version would still be going. */
export function Ghost({
  at,
  label,
  right,
  children,
}: {
  at: number;
  label: string;
  /** the saving, printed at the far end of the same line */
  right?: string;
  children: ReactNode;
}) {
  return (
    <div className="relative" style={{ minHeight: at + 30 }}>
      {children}
      <div
        className="pointer-events-none absolute left-0 right-0 border-t border-dashed border-cinnamon/70"
        style={{ top: at }}
      >
        <span className="absolute left-0 top-1.5 text-[11px] font-bold text-cinnamon">{label}</span>
        {right && (
          <span className="absolute right-0 top-1.5 text-[11px] font-bold text-leaf">{right}</span>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  Fake people, so BirdAvatar draws its real deterministic birds.
 * ------------------------------------------------------------------ */

const P = (id: string, name: string) => ({ id, name, photoUrl: null, birdOverride: null });
const PEOPLE = [
  P("a1", "Ananya Honnur"),
  P("b2", "Vedant Srihari"),
  P("c3", "Krish Chhugani"),
  P("d4", "Priya Menon"),
  P("e5", "Tarun Gopal"),
  P("f6", "Sanan Shankar"),
];

/* ================================================================== *
 *  (a) CATCH-UPS INDEX
 * ================================================================== */

/** `members` is the group's real size; the card takes 6 and shows 5 plus a
    "+N" chip, so anything over 5 draws the same six shapes. */
type Row = { group: string; status: string; tone: string; cta: string; members: number };

/* Both live rows are `published`, which is the state the live page was in when
   it measured 5 x 91.25px. The one branch that changes the height is
   `editionStatus === "answering"`, which adds a second avatar row and an
   "N of M shared" line (your-catchups-card.tsx:74). No group was answering. */
const CATCHUP_ROWS: Row[] = [
  { group: "Kalpavriksha 1998", status: "Round 3 published", tone: "text-canopy", cta: "Read the Round", members: 12 },
  { group: "Batch of 2023", status: "Round 2 published", tone: "text-canopy", cta: "Read the Round", members: 6 },
  { group: "Rishi Valley Bengaluru", status: "No Catch-up here yet", tone: "text-muted-foreground", cta: "Start one", members: 4 },
  { group: "Old Students Cricket", status: "No Catch-up here yet", tone: "text-muted-foreground", cta: "Start one", members: 3 },
  { group: "Kitchen Garden Crew", status: "No Catch-up here yet", tone: "text-muted-foreground", cta: "Start one", members: 2 },
];

function CatchupTile({ row }: { row: Row }) {
  const shown = Math.min(row.members, 5);
  const overflow = Math.min(row.members, 6) - shown;
  return (
    <div
      className="card-elevated flex items-center justify-between gap-4 rounded-[16px] border border-border bg-card p-4"
      style={{ width: M.catchupColWidth }}
    >
      <div className="min-w-0">
        <h3 className="truncate font-heading text-[17px] font-semibold leading-tight tracking-tight text-foreground">
          {row.group}
        </h3>
        <div className="mt-2 flex items-center gap-2.5">
          <div className="flex -space-x-2">
            {PEOPLE.slice(0, shown).map((p) => (
              <BirdAvatar key={p.id} user={p} size="xs" ring />
            ))}
            {overflow > 0 && (
              <span
                className="grid h-7 w-7 place-items-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground"
                style={{ boxShadow: "0 0 0 4px var(--card)" }}
              >
                +{overflow}
              </span>
            )}
          </div>
          <p className={cn("text-[13px] font-medium", row.tone)}>{row.status}</p>
        </div>
      </div>
      <span className="inline-flex shrink-0 items-center justify-center rounded-full bg-[#235C49] px-4 py-2 text-[13px] font-semibold text-white">
        {row.cta}
      </span>
    </div>
  );
}

function RailRow({
  round,
  group,
  date,
  quote,
  n,
  last,
}: {
  round: string;
  group: string;
  date: string;
  quote: string;
  n: number;
  last?: boolean;
}) {
  return (
    <div className={cn("py-3", last ? "pb-0" : "border-b border-border")}>
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[13px] font-semibold text-foreground">
          {round} &middot; {group}
        </span>
        <span className="shrink-0 text-[11px] text-muted-foreground">{date}</span>
      </div>
      <p className="mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-muted-foreground">
        &ldquo;{quote}&rdquo;
      </p>
      <p className="mt-1 text-[11px] font-semibold text-leaf">{n} people wrote in</p>
    </div>
  );
}

export function CatchupsShipped() {
  return (
    <div className="flex" style={{ gap: 30 }}>
      <div className="space-y-3.5">
        {CATCHUP_ROWS.map((r) => (
          <CatchupTile key={r.group} row={r} />
        ))}
      </div>
      <div style={{ width: M.railWidth }}>
        <section className="card-elevated rounded-[16px] border border-border bg-card p-4">
          <h3 className="mb-1 text-[10.5px] font-bold uppercase tracking-[0.13em] text-muted-foreground">
            Fresh off the press
          </h3>
          <div>
            <RailRow
              round="Round 3"
              group="Kalpavriksha 1998"
              date="Jul 25"
              quote="The old mango tree is fruiting again."
              n={7}
            />
            <RailRow
              round="Round 2"
              group="Batch of 2023"
              date="Jul 22"
              quote="We drove up to Madanapalle for the first time in nine years and nothing had moved."
              n={6}
              last
            />
          </div>
        </section>
      </div>
    </div>
  );
}

/* ---- the alternative: one container, hairline rows ---- */

function InsetLiveRow({
  round,
  group,
  state,
  stateTone,
  quote,
  meta,
  cta,
  person,
  last,
}: {
  round: string;
  group: string;
  state: string;
  stateTone: string;
  quote: string;
  meta: string;
  cta: string;
  person: number;
  last?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3.5 px-4 py-3.5 transition-colors duration-150 hover:bg-mist/70",
        !last && "border-b border-border",
      )}
    >
      <BirdAvatar user={PEOPLE[person]} size="xs" />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <span className="truncate text-[14.5px] font-semibold leading-tight text-foreground">
            {round} <span className="text-muted-foreground">&middot;</span> {group}
          </span>
          <span className={cn("shrink-0 text-[12px] font-bold", stateTone)}>{state}</span>
        </div>
        <p className="mt-1 truncate text-[13px] leading-tight text-muted-foreground">
          &ldquo;{quote}&rdquo;
        </p>
        <p className="mt-1 text-[11.5px] font-semibold leading-tight text-leaf">{meta}</p>
      </div>
      <button
        type="button"
        className="shrink-0 rounded-full bg-[#235C49] px-3.5 py-1.5 text-[12.5px] font-semibold text-white transition-[background-color,transform] duration-150 hover:bg-[#1E5040] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf/50"
      >
        {cta}
      </button>
    </div>
  );
}

export function CatchupsInset() {
  return (
    <div style={{ width: M.catchupColWidth }}>
      <h3 className="mb-2 px-1 text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        Your Catch-ups
      </h3>
      <div className="card-elevated overflow-hidden rounded-[16px] border border-border bg-card">
        <InsetLiveRow
          round="Round 3"
          group="Kalpavriksha 1998"
          state="Published Jul 25"
          stateTone="text-canopy"
          quote="The old mango tree is fruiting again."
          meta="7 people wrote in"
          cta="Read it"
          person={0}
        />
        <InsetLiveRow
          round="Round 2"
          group="Batch of 2023"
          state="Published Jul 22"
          stateTone="text-canopy"
          quote="We drove up to Madanapalle for the first time in nine years and nothing had moved."
          meta="6 people wrote in"
          cta="Read it"
          person={1}
          last
        />
        <div className="flex flex-wrap items-center gap-2 border-t border-border bg-mist/50 px-4 py-3">
          <span className="mr-1 text-[12px] font-semibold text-muted-foreground">
            No Catch-up yet in
          </span>
          {["Rishi Valley Bengaluru", "Old Students Cricket", "Kitchen Garden Crew"].map((g) => (
            <button
              key={g}
              type="button"
              className="rounded-full border border-border bg-card px-3 py-1 text-[12px] font-semibold text-foreground transition-[background-color,border-color,transform] duration-150 hover:border-canopy/50 hover:bg-mist active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf/50"
            >
              {g}
            </button>
          ))}
          <span className="text-[12px] text-muted-foreground">&middot; start one</span>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== *
 *  (b) LETTERS INDEX
 * ================================================================== */

type L = { title: string; deck: string; who: string; batch: string; date: string; mins: number; kicker?: string };

export const LETTERS: L[] = [
  {
    title: "That Beautiful Walk in the Darkness",
    deck: "We left the dorm at four in the morning because someone said you could hear the nightjars from the top of Rishikonda, and nobody thought to bring a torch.",
    who: "Ananya Honnur",
    batch: "Batch of '11",
    date: "18 Jul 2026",
    mins: 3,
  },
  {
    title: "My Own Self-Created Mt Kailash",
    deck: "Thirty years after leaving, a long walk in Uttarakhand kept turning back into a walk down the avenue of tamarinds, and I gave up pretending the two were separate trips.",
    who: "Vedant Srihari",
    batch: "Batch of '94",
    date: "9 Jul 2026",
    mins: 7,
  },
  {
    title: "The Banyan Tree",
    deck: "One paragraph, written the morning after the storm.",
    who: "Krish Chhugani",
    batch: "Batch of '23",
    date: "2 Jul 2026",
    mins: 1,
  },
  {
    title: "A story about RV. And Nicobar.",
    deck: "Two islands, one teacher, and a letter that took eleven years to arrive.",
    who: "Priya Menon",
    batch: "Batch of '06",
    date: "24 Jun 2026",
    mins: 1,
    kicker: "Bengaluru only",
  },
  {
    title: "What a Small World",
    deck: "I sat down next to a stranger on a flight to Frankfurt and we had the same house tie.",
    who: "Tarun Gopal",
    batch: "Batch of '88",
    date: "12 Jun 2026",
    mins: 4,
  },
  {
    title: "Gerry Balcombe",
    deck: "A tribute, from the people he taught to look at birds properly.",
    who: "Sanan Shankar",
    batch: "Batch of '23",
    date: "29 May 2026",
    mins: 2,
    kicker: "Tribute",
  },
];

export function LettersShipped({ n = 2 }: { n?: number }) {
  return (
    <div className="space-y-4" style={{ width: 768 }}>
      {LETTERS.slice(0, n).map((l, i) => (
        <div
          key={l.title}
          className="card-elevated block rounded-[16px] border border-border bg-card p-5"
        >
          <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.13em] text-cinnamon">
            <Feather className="h-3.5 w-3.5" />
            Letter
            <span className="text-muted-foreground/70">&middot; {l.mins} min read</span>
          </div>
          <h2 className="mt-2 font-heading text-2xl font-bold leading-snug tracking-[-0.01em] text-foreground">
            {l.title}
          </h2>
          <p className="mt-2 line-clamp-2 text-[14.5px] leading-relaxed text-muted-foreground">
            {l.deck}
          </p>
          <div className="mt-4 flex items-center gap-2.5 border-t border-border pt-3.5">
            <BirdAvatar user={PEOPLE[i % PEOPLE.length]} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold leading-none text-foreground">
                {l.who}
              </p>
              <p className="mt-1 truncate text-[12px] leading-none text-muted-foreground">
                {l.batch} &middot; {l.date}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function LettersRuled() {
  const [lead, ...rest] = LETTERS;
  return (
    <div style={{ width: 768 }}>
      <div className="border-b border-border pb-4">
        {lead.kicker && (
          <div className="mb-1.5 text-[10.5px] font-bold uppercase tracking-[0.14em] text-cinnamon">
            {lead.kicker}
          </div>
        )}
        <h2 className="max-w-[42ch] font-heading text-[27px] font-bold leading-[1.14] tracking-[-0.02em] text-foreground">
          <a
            href="#lead"
            onClick={(e) => e.preventDefault()}
            className="rounded-sm transition-colors duration-150 hover:text-leaf focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf/50"
          >
            {lead.title}
          </a>
        </h2>
        <p className="mt-1.5 max-w-[78ch] text-[14.5px] leading-[1.5] text-muted-foreground">
          {lead.deck}
        </p>
        <p className="mt-2 text-[12px] leading-none text-muted-foreground">
          <span className="font-semibold text-foreground">{lead.who}</span> &middot; {lead.batch}{" "}
          &middot; {lead.date} &middot; {lead.mins} min
        </p>
      </div>

      {rest.map((l, i) => (
        <div
          key={l.title}
          className={cn("py-3", i < rest.length - 1 && "border-b border-border")}
        >
          {l.kicker && (
            <span className="mr-2 align-[1px] text-[10px] font-bold uppercase tracking-[0.12em] text-cinnamon">
              {l.kicker}
            </span>
          )}
          <a
            href="#entry"
            onClick={(e) => e.preventDefault()}
            className={cn(
              "rounded-sm font-heading font-bold leading-[1.22] tracking-[-0.015em] text-foreground transition-colors duration-150 hover:text-leaf focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf/50",
              i === 0 ? "text-[19px]" : "text-[17px]",
            )}
          >
            {l.title}
          </a>
          <p className="mt-1 text-[12px] leading-none text-muted-foreground">
            <span className="font-semibold text-foreground">{l.who}</span> &middot; {l.batch}{" "}
            &middot; {l.date} &middot; {l.mins} min
          </p>
        </div>
      ))}
    </div>
  );
}

/* ================================================================== *
 *  (c) SETTINGS
 * ================================================================== */

function ShippedCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div
      className="card-elevated flex flex-col gap-4 overflow-hidden rounded-[20.8px] border border-border bg-card pt-4 pb-5"
      style={{ width: 768 }}
    >
      <div className="px-5">
        <div className="font-heading text-base font-medium leading-snug tracking-tight">{title}</div>
      </div>
      <div className="px-5">{children}</div>
    </div>
  );
}

const INPUT =
  "h-10 w-full rounded-[12px] border border-border bg-background px-3 text-[14px] text-foreground outline-none transition-colors duration-150 focus:border-leaf/60 focus-visible:ring-2 focus-visible:ring-leaf/40";

export function SettingsShipped() {
  return (
    <div className="space-y-6">
      <ShippedCard title="You">
        <div className="space-y-5">
          <div className="space-y-2">
            <label className="text-[13px] font-medium text-foreground">Your name</label>
            <input className={INPUT} defaultValue="Sanan Shankar" />
          </div>
          <div className="space-y-2">
            <label className="text-[13px] font-medium text-foreground">Profile photo</label>
            {/* bg-paper/50 over --card: both #F6F2E8, so this resolves to the
                card colour exactly. The only separation is the 1px hairline. */}
            <div className="flex items-center gap-4 rounded-[16px] border border-border bg-[#F6F2E8] p-4">
              <BirdAvatar user={PEOPLE[5]} size="lg" />
              <div className="space-y-1.5">
                <p className="text-[14px] text-muted-foreground">
                  Upload a photo, or keep your valley bird.
                </p>
                <button
                  type="button"
                  className="rounded-full border border-border bg-card px-3.5 py-1.5 text-[13px] font-semibold text-foreground transition-[background-color,transform] duration-150 hover:bg-mist active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf/50"
                >
                  Upload photo
                </button>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[13px] font-medium text-foreground">Header picture</label>
            <div className="space-y-3 rounded-[16px] border border-border bg-[#F6F2E8] p-4">
              {/* rounded-xl = 20.8px, inside a 16px container. */}
              <div className="relative h-28 overflow-hidden rounded-[20.8px] border border-border bg-mist">
                <div className="absolute inset-0 bg-gradient-to-b from-[#4E6B54]/40 to-[#23241E]/45" />
                <span className="absolute bottom-2 right-2.5 rounded-full bg-heart/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-white">
                  20.8px inside 16px
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <p className="text-[14px] text-muted-foreground">
                  A valley photo shows until you add your own.
                </p>
                <button
                  type="button"
                  className="shrink-0 rounded-full border border-border bg-card px-3.5 py-1.5 text-[13px] font-semibold text-foreground transition-[background-color,transform] duration-150 hover:bg-mist active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf/50"
                >
                  Upload header
                </button>
              </div>
            </div>
          </div>
        </div>
      </ShippedCard>

      <ShippedCard title="Your batch">
        <div className="grid grid-cols-3 gap-4">
          {[
            ["Batch year", "2023"],
            ["Year joined", "2016"],
            ["Year left", "2023"],
          ].map(([l, v]) => (
            <div key={l} className="space-y-2">
              <label className="text-[13px] font-medium text-foreground">{l}</label>
              <input className={INPUT} defaultValue={v} />
            </div>
          ))}
        </div>
      </ShippedCard>
    </div>
  );
}

/* ---- the alternative ---- */

function InsetGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="mb-1.5 px-1 text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </h3>
      <div
        className="card-elevated overflow-hidden rounded-[16px] border border-border bg-card"
        style={{ width: 768 }}
      >
        {children}
      </div>
    </div>
  );
}

function InsetField({
  label,
  hint,
  children,
  last,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  last?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-6 px-4 py-2.5",
        !last && "border-b border-border",
      )}
    >
      <div className="w-[168px] shrink-0">
        <div className="text-[13.5px] font-medium leading-tight text-foreground">{label}</div>
        {hint && <div className="mt-0.5 text-[11.5px] leading-tight text-muted-foreground">{hint}</div>}
      </div>
      <div className="flex min-w-0 flex-1 items-center justify-end gap-3">{children}</div>
    </div>
  );
}

export function SettingsInset() {
  return (
    <div className="space-y-5">
      <InsetGroup label="You">
        <InsetField label="Your name">
          <input className={cn(INPUT, "max-w-[360px]")} defaultValue="Sanan Shankar" />
        </InsetField>
        <InsetField label="Profile photo" hint="Shows everywhere you appear">
          <BirdAvatar user={PEOPLE[5]} size="sm" />
          <button
            type="button"
            className="rounded-full border border-border bg-card px-3.5 py-1.5 text-[12.5px] font-semibold text-foreground transition-[background-color,transform] duration-150 hover:bg-mist active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf/50"
          >
            Upload
          </button>
        </InsetField>
        <InsetField label="Header picture" hint="Across the top of your profile" last>
          <div className="h-10 w-[72px] overflow-hidden rounded-[8px] border border-border bg-mist">
            <div className="h-full w-full bg-gradient-to-b from-[#4E6B54]/40 to-[#23241E]/45" />
          </div>
          <button
            type="button"
            className="rounded-full border border-border bg-card px-3.5 py-1.5 text-[12.5px] font-semibold text-foreground transition-[background-color,transform] duration-150 hover:bg-mist active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf/50"
          >
            Upload
          </button>
        </InsetField>
      </InsetGroup>

      <InsetGroup label="Your batch">
        <InsetField label="Batch year" hint="The year your class finished 12th">
          <input className={cn(INPUT, "w-[120px]")} defaultValue="2023" />
        </InsetField>
        <InsetField label="Year joined">
          <input className={cn(INPUT, "w-[120px]")} defaultValue="2016" />
        </InsetField>
        <InsetField label="Year left" last>
          <input className={cn(INPUT, "w-[120px]")} defaultValue="2023" />
        </InsetField>
      </InsetGroup>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  The nesting ladder: three radii, drawn to scale.
 * ------------------------------------------------------------------ */

export function NestingLadder({
  radii,
  labels,
  ok,
}: {
  radii: [number, number, number];
  labels: [string, string, string];
  ok: boolean;
}) {
  const ring = ok ? "border-leaf/60" : "border-heart/60";
  return (
    <div className="flex items-center gap-5">
      <div
        className="grid place-items-center border-2 border-border bg-card"
        style={{ width: 168, height: 132, borderRadius: radii[0] }}
      >
        <div
          className="grid place-items-center border-2 border-border bg-card"
          style={{ width: 124, height: 92, borderRadius: radii[1] }}
        >
          <div
            className={cn("border-2 bg-mist", ring)}
            style={{ width: 80, height: 52, borderRadius: radii[2] }}
          />
        </div>
      </div>
      <ol className="space-y-1.5 text-[12.5px] tabular-nums">
        {labels.map((l, i) => (
          <li key={l} className="flex items-baseline gap-2">
            <span
              className={cn(
                "w-[52px] shrink-0 text-right font-bold",
                i === 2 ? (ok ? "text-leaf" : "text-heart") : "text-foreground",
              )}
            >
              {radii[i]}px
            </span>
            <span className="text-muted-foreground">{l}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  The N-scaling demo. Same N items, boxed vs ruled, live.
 * ------------------------------------------------------------------ */

const NAMES = [
  "Kalpavriksha 1998",
  "Batch of 2023",
  "Rishi Valley Bengaluru",
  "Old Students Cricket",
  "Kitchen Garden Crew",
  "Batch of 1994",
  "Hyderabad chapter",
  "Birders of the valley",
  "Batch of 2011",
  "Teachers, past and present",
  "Batch of 1979",
  "Madanapalle run club",
];
const name = (i: number) => NAMES[i % NAMES.length];

export function NScaling() {
  const [n, setN] = useState(12);
  const options = [1, 3, 12, 40];
  const rowH = 44;
  const boxedH = n * rowH + (n - 1) * 8;
  const ruledH = n * rowH + 2;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-4">
        <div className="inline-flex gap-1 rounded-full border border-border bg-mist p-1">
          {options.map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => setN(o)}
              className={cn(
                "rounded-full px-4 py-1.5 text-[12.5px] font-semibold tabular-nums transition-[background-color,color,transform] duration-150 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf/50",
                n === o ? "bg-[#235C49] text-white" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {o} {o === 1 ? "item" : "items"}
            </button>
          ))}
        </div>
        <p className="text-[13px] text-muted-foreground">
          Identical items, identical content. Only the count changes.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <figure>
          <figcaption className="mb-2 flex items-baseline justify-between gap-3">
            <span className="text-[12px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              One box each
            </span>
            <span className="text-[12px] font-bold tabular-nums text-heart">
              {n} borders &middot; {n * 4} corners &middot; {boxedH}px
            </span>
          </figcaption>
          <div className="h-[268px] overflow-y-auto rounded-[12px] bg-background p-3">
            <div className="space-y-2">
              {Array.from({ length: n }, (_, i) => (
                <div
                  key={i}
                  className="card-elevated flex h-11 items-center justify-between rounded-[16px] border border-border bg-card px-3.5"
                >
                  <span className="truncate text-[13px] font-semibold">{name(i)}</span>
                  <span className="text-[11.5px] text-muted-foreground">12 members</span>
                </div>
              ))}
            </div>
          </div>
        </figure>

        <figure>
          <figcaption className="mb-2 flex items-baseline justify-between gap-3">
            <span className="text-[12px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              One box, hairline rows
            </span>
            <span className="text-[12px] font-bold tabular-nums text-leaf">
              1 border &middot; 4 corners &middot; {ruledH}px
            </span>
          </figcaption>
          <div className="h-[268px] overflow-y-auto rounded-[12px] bg-background p-3">
            <div className="card-elevated overflow-hidden rounded-[16px] border border-border bg-card">
              {Array.from({ length: n }, (_, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex h-11 items-center justify-between px-3.5",
                    i < n - 1 && "border-b border-border",
                  )}
                >
                  <span className="truncate text-[13px] font-semibold">{name(i)}</span>
                  <span className="text-[11.5px] text-muted-foreground">12 members</span>
                </div>
              ))}
            </div>
          </div>
        </figure>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  The scorer.
 * ------------------------------------------------------------------ */

export type GateKey = "atomic" | "ragged" | "hetero" | "portable";

export const GATES: { k: GateKey; n: string; name: string; ask: string }[] = [
  {
    k: "atomic",
    n: "01",
    name: "Atomicity",
    ask: "Is it one object you act on as a unit: open, drag, dismiss, reorder?",
  },
  {
    k: "ragged",
    n: "02",
    name: "Raggedness",
    ask: "Does the content refuse to align, or is whitespace alone unable to group it?",
  },
  {
    k: "hetero",
    n: "03",
    name: "Heterogeneity",
    ask: "Does it sit next to an item of a different kind?",
  },
  {
    k: "portable",
    n: "04",
    name: "Portability",
    ask: "Does this exact unit re-render somewhere else in the product?",
  },
];

export type SurfaceScore = {
  k: string;
  label: string;
  where: string;
  gates: Record<GateKey, { pass: boolean; why: string }>;
  note: string;
};

export const SURFACES: SurfaceScore[] = [
  {
    k: "post",
    label: "A feed post",
    where: "/feed",
    gates: {
      atomic: {
        pass: true,
        why: "One authored object with a lifecycle. You love it, save it, comment on it, report it, delete it.",
      },
      ragged: {
        pass: true,
        why: "Measured on the live feed: 13 posts, from 225.5px to 846.5px tall. Five distinct heights, a 3.75x spread, and no way to predict the next one.",
      },
      hetero: {
        pass: true,
        why: "The same column carries plain posts, Letters with a cinnamon kicker, polls and photo posts. Three of the 13 measured were Letters.",
      },
      portable: {
        pass: true,
        why: "PostCard renders in three places: the feed, a profile's author feed, and the Saved tab, with two variants (card and sheet).",
      },
    },
    note: "This is what a card is for. Nothing else in the product scores like this.",
  },
  {
    k: "rail",
    label: "A right-rail module",
    where: "/feed rail",
    gates: {
      atomic: {
        pass: false,
        why: "A module is not one target. It contains links; you do not act on the module itself.",
      },
      ragged: {
        pass: true,
        why: "NN/g's first trigger exactly: several different types of UI element. Measured, From the Collection is 205.8px built around a photo, New in the directory is 227.8px built from three avatar rows.",
      },
      hetero: {
        pass: true,
        why: "Every module's neighbour is a different kind of module. This is the textbook common-region case.",
      },
      portable: {
        pass: true,
        why: "RailCard is one shell used by four modules, and mirrored by Fresh off the press on Catch-ups.",
      },
    },
    note: "3 of 4. The rail is the best-argued set of boxes in the product.",
  },
  {
    k: "photo",
    label: "A Collection photo",
    where: "/collection",
    gates: {
      atomic: { pass: true, why: "One photo, one link to /collection/[id], one caption." },
      ragged: {
        pass: true,
        why: "Masonry: every tile is the photo's own aspect ratio, so no two are the same height and a uniform gap cannot express the grouping.",
      },
      hetero: { pass: false, why: "Its neighbours are all photos." },
      portable: { pass: false, why: "One consumer, collection-client.tsx." },
    },
    note: "2 of 4. And the border is only 12px and 1px wide, which is the right weight for a frame.",
  },
  {
    k: "person",
    label: "A directory person",
    where: "/directory, People",
    gates: {
      atomic: { pass: true, why: "One person, one link to one profile." },
      ragged: {
        pass: true,
        why: "On the second clause, not the first. A 3-up grid at 330.7px with one 16px gap in both axes means you cannot make the space inside an item smaller than the space between items, so whitespace cannot do the grouping.",
      },
      hetero: { pass: false, why: "Nine people next to nine people." },
      portable: { pass: false, why: "ProfileCard has one consumer, directory-client.tsx." },
    },
    note: "2 of 4, and the arithmetic agrees: the grid spends 66.6px of column per person, a ruled list would spend about 61px. An 8% saving is not worth losing a 64px portrait.",
  },
  {
    k: "catchup",
    label: "A Catch-up index row",
    where: "/catchups",
    gates: {
      atomic: { pass: true, why: "The whole card is a single link with one focus target. The source says so." },
      ragged: {
        pass: false,
        why: "All five rows measured 91.3px exactly. The group name is truncated to one line, the status is one line, the button is one size. One branch varies: an answering Round adds an avatar row and an N-of-M line, worth 38px. None of the five was answering.",
      },
      hetero: { pass: false, why: "Five rows, all the same kind of thing: one group's Catch-up state." },
      portable: { pass: false, why: "YourCatchupsCard has one consumer, the Catch-ups index." },
    },
    note: "1 of 4. Ruled list, and the correct version is already on the same screen in the rail.",
  },
  {
    k: "letter",
    label: "A letter in the index",
    where: "/letters",
    gates: {
      atomic: { pass: true, why: "One Link to /letters/[id]." },
      ragged: {
        pass: false,
        why: "All six measured 224.9px exactly. The title is cut at 80 characters and the preview is line-clamp-2. The design removes the raggedness by force, then keeps the box that raggedness would have justified.",
      },
      hetero: { pass: false, why: "Six letters next to six letters." },
      portable: { pass: false, why: "Inline JSX in letters/page.tsx. It is not even a component." },
    },
    note: "1 of 4, and NIHR's warning bites: cards deemphasise the ranking of content, which is the whole job of an index.",
  },
  {
    k: "fresh",
    label: "A Fresh off the press row",
    where: "/catchups rail",
    gates: {
      atomic: { pass: true, why: "One link to one Round." },
      ragged: { pass: false, why: "Measured 88.3px and 97.6px. The teaser is truncated at 110 characters." },
      hetero: { pass: false, why: "Published Rounds, all the way down." },
      portable: { pass: false, why: "One consumer." },
    },
    note: "1 of 4, and it is already built as a ruled list inside one container. The app got this right once.",
  },
  {
    k: "settings",
    label: "A settings field group",
    where: "/settings",
    gates: {
      atomic: {
        pass: false,
        why: "You cannot open, move, dismiss or save one group. There is one sticky save bar for the whole form. VA.gov: a Card is not a Fieldset.",
      },
      ragged: { pass: false, why: "Label, then input. Seven times. Nothing about it is unpredictable." },
      hetero: {
        pass: false,
        why: "Seven of the eight cards hold the same kind of thing: facts about you. The eighth is Danger zone, which is genuinely different, sits outside the form, and is the one box on this page that is earned.",
      },
      portable: { pass: false, why: "One page, one form." },
    },
    note: "0 of 4. The lowest score in the product, drawn with the heaviest treatment available.",
  },
];

export function verdictFor(passed: number) {
  if (passed >= 2) return { word: "Tile", tone: "leaf" as const, sub: "Two gates or more. Draw the box." };
  if (passed === 1)
    return { word: "Ruled list", tone: "sky" as const, sub: "One gate. One container, hairline rows inside." };
  return { word: "Whitespace", tone: "cinnamon" as const, sub: "No gates. A label and some air." };
}

export function Scorer() {
  const [k, setK] = useState(SURFACES[0].k);
  // Any gate can be overturned. The answers below are mine; the verdict is
  // whatever the four gates add up to, so disagreeing with one costs a click
  // and the rule still does the arithmetic.
  const [flips, setFlips] = useState<Record<string, boolean>>({});
  const s = SURFACES.find((x) => x.k === k)!;
  const flipped = (g: GateKey) => flips[`${k}:${g}`] === true;
  const passes = (g: GateKey) => s.gates[g].pass !== flipped(g);
  const passed = GATES.filter((g) => passes(g.k)).length;
  const changed = GATES.some((g) => flipped(g.k));
  const toggle = (g: GateKey) =>
    setFlips((f) => ({ ...f, [`${k}:${g}`]: !f[`${k}:${g}`] }));
  const v = verdictFor(passed);
  const vTone =
    v.tone === "leaf"
      ? "text-leaf border-leaf/35 bg-leaf/[0.07]"
      : v.tone === "sky"
        ? "text-sky border-sky/35 bg-sky/[0.07]"
        : "text-cinnamon border-cinnamon/35 bg-cinnamon/[0.07]";

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-1.5">
        {SURFACES.map((x) => (
          <button
            key={x.k}
            type="button"
            onClick={() => setK(x.k)}
            aria-pressed={k === x.k}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf/50",
              k === x.k
                ? "border-transparent bg-[#235C49] text-white"
                : "border-border bg-card text-muted-foreground hover:bg-mist hover:text-foreground",
            )}
          >
            {x.label}
          </button>
        ))}
      </div>

      <div className="grid gap-x-9 gap-y-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,300px)]">
        <div>
          <div className="divide-y divide-border border-y border-border">
            {GATES.map((g) => {
              const pass = passes(g.k);
              const mine = flipped(g.k);
              return (
                <button
                  key={g.k}
                  type="button"
                  onClick={() => toggle(g.k)}
                  aria-pressed={pass}
                  className="flex w-full gap-4 rounded-lg px-2 py-4 text-left transition-[background-color,transform] duration-150 hover:bg-mist/70 active:scale-[0.995] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf/50"
                >
                  <span
                    className={cn(
                      "mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-[12px] font-bold transition-colors duration-200",
                      pass ? "bg-leaf text-white" : "bg-mist text-muted-foreground",
                    )}
                    aria-hidden
                  >
                    {pass ? "✓" : "×"}
                  </span>
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-baseline gap-x-2.5">
                      <span className="sr-only">{pass ? "Passes:" : "Fails:"}</span>
                      <span
                        className={cn(
                          "font-heading text-[15px] font-bold tracking-tight transition-colors duration-200",
                          pass ? "text-foreground" : "text-muted-foreground",
                        )}
                      >
                        {g.n}. {g.name}
                      </span>
                      <span className="text-[12.5px] text-muted-foreground">{g.ask}</span>
                      {mine && (
                        <span className="rounded-full bg-sky/12 px-2 py-px text-[10px] font-bold uppercase tracking-[0.1em] text-sky">
                          Your call
                        </span>
                      )}
                    </span>
                    <span
                      className={cn(
                        "mt-1.5 block max-w-[64ch] text-[14px] leading-[1.6]",
                        !mine && pass ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {s.gates[g.k].why}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-[12.5px] leading-[1.55] text-muted-foreground">
            Disagree with a gate? Click the row. The verdict on the right is arithmetic, so it
            follows your answer rather than mine.
          </p>
        </div>

        <div>
          <div className={cn("rounded-[16px] border p-5", vTone)}>
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] opacity-80">
              {s.label} &middot; {s.where}
            </div>
            <div className="mt-3 flex items-center gap-1.5">
              {GATES.map((g) => (
                <span
                  key={g.k}
                  className={cn(
                    "h-1.5 flex-1 rounded-full transition-colors duration-200",
                    passes(g.k) ? "bg-current" : "bg-current/20",
                  )}
                />
              ))}
            </div>
            <div className="mt-3 font-heading text-[30px] font-bold leading-none tracking-[-0.03em]">
              {v.word}
            </div>
            <p className="mt-2 text-[13px] font-semibold leading-snug">
              {passed} of 4 gates. {v.sub}
            </p>
            {changed && (
              <button
                type="button"
                onClick={() => setFlips({})}
                className="mt-3.5 rounded-full border border-current/30 px-3 py-1 text-[11.5px] font-bold uppercase tracking-[0.1em] transition-[background-color,transform] duration-150 hover:bg-current/10 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf/50"
              >
                Back to my score
              </button>
            )}
          </div>
          <p className="mt-3.5 text-[13.5px] leading-[1.6] text-muted-foreground">
            {changed && <span className="font-semibold text-foreground">My reading: </span>}
            {s.note}
          </p>
        </div>
      </div>
    </div>
  );
}
