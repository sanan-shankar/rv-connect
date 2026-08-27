/* ------------------------------------------------------------------ *
 *  The pieces every guide chapter is built from.
 *
 *  A chapter is not a document. The policy pages are plain because a
 *  legal document should be; nobody is obliged to read a guide, so it
 *  has to earn the read (owner, 2026-08-26). What it earns it with is
 *  the product's own material, not ornament.
 *
 *  The voice, though, IS the policy pages': declarative, concrete,
 *  willing to just say the rule (owner, 2026-08-27, on a draft that
 *  reached for charm instead: "I do like the straightforward tone of
 *  the T&C instead of your try hard cringe cute tone"). Everything
 *  written with these must pass docs/content/AI-WRITING-TELLS.md.
 *
 *  THE RULE FOR GRAPHICS, because two of the first four did not earn
 *  their place: a graphic belongs here when the fact is a SHAPE
 *  (<Scale>) or a COMPARISON (<Compare>). Anything that only shows a
 *  card the reader can already see on the real page is decoration.
 *  See docs/spec/guide.md section 5.
 * ------------------------------------------------------------------ */

import Link from "next/link";
import { cn } from "@/lib/utils";

/* ---------------------------------------------------------------- *
 *  Structure
 * ---------------------------------------------------------------- */

export function Chapter({
  title,
  lede,
  children,
}: {
  title: string;
  lede: string;
  children: React.ReactNode;
}) {
  return (
    <article>
      <h1 className="font-heading text-[2rem] font-bold leading-[1.1] tracking-[-0.028em] text-foreground">
        {title}
      </h1>
      <p className="mt-4 text-[17px] leading-[1.55] text-foreground/90">{lede}</p>
      {children}
    </article>
  );
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-9">
      <h2 className="font-heading text-[1.25rem] font-bold leading-snug tracking-[-0.02em] text-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 text-[15px] leading-[1.65] text-foreground/88">{children}</p>;
}

/** The way back into the product. A chapter that only stops is a dead end. */
export function Doorway({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <footer className="mt-10 border-t border-border pt-6">
      <Link
        href={href}
        className="state-layer inline-flex items-center rounded-full bg-canopy px-5 py-2.5 text-[13.5px] font-semibold text-white outline-none transition-transform duration-150 ease-out hover:-translate-y-px active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-canopy"
      >
        {children}
      </Link>
    </footer>
  );
}

/* ---------------------------------------------------------------- *
 *  Graphic one: a shape
 * ---------------------------------------------------------------- */

export interface ScaleStep {
  key: string;
  /** Relative weight. This is what makes the bar honest. */
  weight: number;
  label: string;
  amount?: string;
  note: string;
  tone: "soft" | "strong" | "warn" | "end";
}

const BAR: Record<ScaleStep["tone"], string> = {
  soft: "bg-canopy/25",
  strong: "bg-canopy",
  warn: "bg-cinnamon/15 shadow-[inset_0_0_0_1px_var(--color-cinnamon)]/30",
  end: "bg-cinnamon",
};

const DOT: Record<ScaleStep["tone"], string> = {
  soft: "bg-canopy/35",
  strong: "bg-canopy",
  warn: "bg-cinnamon/30",
  end: "bg-cinnamon",
};

/**
 * Lengths drawn to scale, because the proportions are the fact. Nothing is
 * written on the bars: at a phone's width the shortest step is about twenty
 * pixels wide and any label inside it clips. The bar carries the shape and
 * the list underneath carries the words.
 */
export function Scale({ steps }: { steps: ScaleStep[] }) {
  return (
    <figure className="mt-5">
      <div className="flex h-9 gap-1" aria-hidden="true">
        {steps.map((s) => (
          <div
            key={s.key}
            className={cn("min-w-[6px] rounded-lg", BAR[s.tone])}
            style={s.tone === "end" ? undefined : { flexGrow: s.weight }}
          />
        ))}
      </div>
      <figcaption className="mt-3.5 grid gap-x-5 gap-y-3 [grid-template-columns:repeat(auto-fit,minmax(126px,1fr))]">
        {steps.map((s) => (
          <span key={s.key} className="grid grid-cols-[9px_1fr] items-baseline gap-x-2.5 gap-y-0.5">
            <i className={cn("row-span-2 mt-[5px] size-[9px] self-start rounded-full", DOT[s.tone])} />
            <b className="text-[13px] font-bold text-foreground">
              {s.label}{" "}
              {s.amount && <em className="not-italic font-medium text-muted-foreground">{s.amount}</em>}
            </b>
            <span className="text-[12px] leading-snug text-muted-foreground">{s.note}</span>
          </span>
        ))}
      </figcaption>
    </figure>
  );
}

/* ---------------------------------------------------------------- *
 *  Graphic two: a comparison
 * ---------------------------------------------------------------- */

export interface CompareRow {
  key: string;
  /** Anything visual: an avatar, an icon, a swatch. Kept small on purpose. */
  mark: React.ReactNode;
  label: string;
  note: string;
}

/**
 * Two or three rows that differ in one respect. For the rules people get
 * wrong, which are almost always comparisons wearing a paragraph.
 */
export function Compare({ rows }: { rows: CompareRow[] }) {
  return (
    <figure className="mt-5 grid gap-px overflow-hidden rounded-2xl border border-border bg-border">
      {rows.map((r) => (
        <div key={r.key} className="flex items-center gap-3.5 bg-card px-4 py-3.5">
          <span className="flex size-[34px] shrink-0 items-center justify-center">{r.mark}</span>
          <span className="grid min-w-0 gap-0.5">
            <b className="text-[13.5px] font-bold text-foreground">{r.label}</b>
            <span className="text-[12.5px] leading-snug text-muted-foreground">{r.note}</span>
          </span>
        </div>
      ))}
    </figure>
  );
}

/** A placeholder mark for the "nobody" half of a comparison. */
export function BlankMark() {
  return <span className="size-[34px] rounded-full bg-muted shadow-[inset_0_0_0_1px_var(--color-border)]" />;
}
