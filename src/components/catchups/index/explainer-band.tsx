/* ------------------------------------------------------------------ *
 *  <ExplainerBand> — the newcomer explainer atop the index (spec
 *  section 1 + 3.1).
 *
 *  Two sizes, picked by the caller from real data (page.tsx), not a
 *  client toggle: a viewer with no Catch-up anywhere yet sees the full
 *  teaching card (two-sentence concept + the Ask -> Answer -> Read
 *  beats). Once the viewer belongs to at least one Catch-up, they
 *  already know what this is — the full card would just push "The Old
 *  Quadrangle / Answering now" further below the fold, so it collapses
 *  to a single-line strip that keeps the same three beats as quiet
 *  inline text.
 * ------------------------------------------------------------------ */

import { HelpCircle, PenLine, BookOpen, ArrowRight } from "lucide-react";

const BEATS = [
  { icon: HelpCircle, label: "Ask" },
  { icon: PenLine, label: "Answer" },
  { icon: BookOpen, label: "Read" },
] as const;

export function ExplainerBand({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 rounded-full border border-border/70 bg-card/70 px-4 py-2.5">
        <span className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-leaf">
          Catch-ups
        </span>
        <span className="hidden h-3 w-px bg-border sm:block" aria-hidden />
        <span className="flex items-center gap-1 text-[12px] font-semibold text-muted-foreground">
          {BEATS.map((beat, i) => (
            <span key={beat.label} className="flex items-center gap-1">
              {beat.label}
              {i < BEATS.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground/50" aria-hidden />}
            </span>
          ))}
        </span>
        <span className="hidden text-[12.5px] text-muted-foreground sm:inline">
          &middot; a gentle group newsletter on a rhythm.
        </span>
      </div>
    );
  }

  return (
    <section className="card-elevated relative overflow-hidden rounded-[var(--radius)] border border-border bg-card p-6 sm:p-8">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 0% 0%, color-mix(in srgb, var(--color-leaf) 9%, transparent), transparent 60%), radial-gradient(110% 90% at 100% 100%, color-mix(in srgb, var(--color-cinnamon) 8%, transparent), transparent 55%)",
        }}
      />

      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-leaf">
            Catch-ups
          </p>
          <p className="mt-2 text-[15px] leading-relaxed text-foreground">
            A Catch-up is a gentle group newsletter on a rhythm. Everyone in the group answers the
            same few questions during an open window, and once it closes their replies are
            gathered into one warm issue the whole group reads together.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {BEATS.map((beat, i) => (
            <div key={beat.label} className="flex items-center gap-2 sm:gap-3">
              <div className="flex flex-col items-center gap-1.5 text-center">
                <div className="grid h-10 w-10 place-items-center rounded-full border border-border/70 bg-background/60 text-cinnamon">
                  <beat.icon className="h-4 w-4" aria-hidden />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-foreground">
                  {beat.label}
                </span>
              </div>
              {i < BEATS.length - 1 && (
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" aria-hidden />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
