import { cn } from "@/lib/utils";
import { Chip, type ChipTone } from "@/components/admin/admin-chip";
import type { Outcome, Verdict } from "@/lib/trivia-report";

/* ------------------------------------------------------------------ *
 *  The trivia gate room's small parts: the ribbon every question is drawn
 *  as, its legend, and the words the room uses for what happened.
 *
 *  THE RIBBON'S COLOURS were run through the dataviz palette validator
 *  against the paper surface in both themes, not picked by eye. The two
 *  checks that decide whether a reader can tell segments apart (colour-
 *  blind separation and normal-vision separation, adjacent pairs) pass in
 *  light and dark. What it flags is deliberate: "after a miss" is a pale
 *  step of the same green, because it IS the same answer, just on a second
 *  try; and sky is the app's own token, lower in chroma than the validator
 *  likes. Both are relieved the way it asks, by a legend that is always
 *  shown and a count beside every bar.
 *
 *  Each segment is its own element with a 2px gap showing the CARD between
 *  them, so neighbours separate by the surface rather than by a stroke, and
 *  "left without answering" is the plain track at the end rather than a
 *  fifth colour: nothing happened, so nothing is painted.
 * ------------------------------------------------------------------ */

export const SEGMENT: Record<Outcome, { label: string; short: string; swatch: string }> = {
  firstGo: { label: "Got it first go", short: "first go", swatch: "bg-leaf" },
  afterMiss: { label: "Got it after a miss", short: "after a miss", swatch: "bg-leaf/45" },
  movedOn: { label: "Moved on without trying", short: "moved on", swatch: "bg-sky" },
  missed: { label: "Missed it", short: "missed", swatch: "bg-cinnamon" },
  /* The track. On the card it reads as the bar's own unpainted end; in a
     legend on the page it needs an edge, or it is a swatch of nothing. */
  left: { label: "Left without answering", short: "left", swatch: "bg-muted ring-1 ring-inset ring-border" },
};
const ORDER: Outcome[] = ["firstGo", "afterMiss", "movedOn", "missed", "left"];

const nf = new Intl.NumberFormat("en-IN");
export const count = (n: number) => nf.format(n);

/** A share as a whole percent, or "<1%" rather than a "0%" that is not zero. */
export function pct(n: number, of: number): string {
  if (of <= 0) return "0%";
  const p = (n / of) * 100;
  if (p > 0 && p < 1) return "<1%";
  return `${Math.round(p)}%`;
}

/** 12s, 1m 20s. Never "0s": a measured instant still took a moment. */
export function seconds(s: number | null): string | null {
  if (s === null) return null;
  if (s < 60) return `${Math.max(1, Math.round(s))}s`;
  const m = Math.floor(s / 60);
  const r = Math.round(s % 60);
  return r ? `${m}m ${r}s` : `${m}m`;
}

export function Ribbon({
  outcomes,
  className,
  size = "md",
}: {
  outcomes: Record<Outcome, number>;
  className?: string;
  size?: "md" | "lg";
}) {
  const total = ORDER.reduce((n, k) => n + outcomes[k], 0);
  const said = ORDER.filter((k) => outcomes[k] > 0)
    .map((k) => `${outcomes[k]} ${SEGMENT[k].short}`)
    .join(", ");
  return (
    <div
      role="img"
      aria-label={total ? `Of ${total} showings: ${said}` : "Not shown yet"}
      className={cn(
        "flex w-full gap-[2px] overflow-hidden rounded-full",
        size === "lg" ? "h-3.5" : "h-2.5",
        total === 0 && "bg-muted",
        className,
      )}
    >
      {ORDER.map((k) =>
        outcomes[k] > 0 ? (
          <span
            key={k}
            title={`${outcomes[k]} ${SEGMENT[k].label.toLowerCase()} (${pct(outcomes[k], total)})`}
            /* flex-grow carries the share, so the 2px gaps come out of the
               segments rather than overflowing the row. The 3px floor keeps a
               single showing out of two hundred visible. */
            className={cn("h-full min-w-[3px] basis-0", k === "left" ? "bg-muted" : SEGMENT[k].swatch)}
            style={{ flexGrow: outcomes[k] }}
          />
        ) : null,
      )}
    </div>
  );
}

export function RibbonLegend({ className }: { className?: string }) {
  return (
    <ul className={cn("flex flex-wrap items-center gap-x-3.5 gap-y-1.5", className)}>
      {ORDER.map((k) => (
        <li key={k} className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
          <span className={cn("h-2.5 w-3.5 shrink-0 rounded-full", SEGMENT[k].swatch)} aria-hidden />
          {SEGMENT[k].label}
        </li>
      ))}
    </ul>
  );
}

/* The verdict's chip wears the colour of the segment that earned it, so the
   word and the ribbon beside it agree without a key: sky for a question
   people move past, cinnamon for one they get wrong, leaf for one that
   works. */
export const VERDICT: Record<Verdict, { label: string; tone: ChipTone }> = {
  works: { label: "Works well", tone: "good" },
  skipped: { label: "Often skipped", tone: "info" },
  missed: { label: "Often missed", tone: "warn" },
  mixed: { label: "Mixed", tone: "idle" },
  early: { label: "Too early to tell", tone: "idle" },
};

export function VerdictChip({ verdict }: { verdict: Verdict }) {
  return <Chip label={VERDICT[verdict].label} tone={VERDICT[verdict].tone} />;
}

/** What a typed row's kind is called in this room. */
export const KIND: Record<string, { label: string; tone: ChipTone }> = {
  right: { label: "Got in", tone: "good" },
  wrong: { label: "Turned away", tone: "warn" },
  dontknow: { label: "Didn't know", tone: "info" },
  skipped: { label: "Skipped", tone: "info" },
  limited: { label: "Too many tries", tone: "bad" },
};

/** Which rule let a right answer in, when it was not the plain answer. */
export const HOW: Record<string, string> = {
  typo: "one letter off",
  mention: "mentioned it",
  added: "accepted by you",
};

/**
 * Something somebody typed, as they typed it. Curly quotes and the body face:
 * these are specimens, and the quote marks are what say "verbatim" without a
 * label. Long ones are clipped by the row, never by this.
 */
export function Typed({ children, className }: { children: string; className?: string }) {
  return (
    <span className={cn("text-foreground", className)}>
      {"“"}
      {children}
      {"”"}
    </span>
  );
}

/** Section title + one line, the way every block in this room opens. */
export function Heading({
  title,
  note,
  action,
}: {
  title: string;
  note?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-end gap-3 px-0.5">
      <div className="min-w-0 flex-1">
        <h2 className="font-heading text-[17px] leading-tight text-foreground">{title}</h2>
        {note && <p className="mt-1 text-[12.5px] leading-snug text-muted-foreground">{note}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/** The paper card every block sits on. */
export function Sheet({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-[var(--radius)] border border-border bg-card", className)}>
      {children}
    </div>
  );
}
