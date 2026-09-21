import { PageHeader } from "@/components/layout/page-header";
import { ButtonSkeleton } from "@/components/common/skeleton";

/* Mirrors the real page (new/page.tsx + create-catchup-form.tsx): the real
   title through the real PageHeader, then ONE card at the centered column's
   full 768px, laid out as the form's own `340px 1fr` grid -- Name and Rhythm
   stacked on the left, With spanning both rows on the right, and the
   left-aligned pill closing the form across both columns.

   A form is nearly all words that never change, so those are drawn: the three
   labels, in the elements the form uses for them. That matters more than it
   looks. Name's label is an inline <label>, so it sits in the div's 24px line
   box, where With's and Rhythm's are <p>s on their own 16.5px one -- so the
   Name field starts 7.5px lower than the search beside it, and a skeleton
   that drew three identical label bars put one of them wrong.

   What you type into or press is a placeholder at its own size: the 40px
   fields at the input radius, "Everyone from ..." and "Start the first
   Edition" as the real Buttons' boxes, your own chip, and the rhythm track as
   its own box with its words invisible. */
export default function NewCatchupLoading() {
  return (
    <div>
      <PageHeader title="Start a Catch-up" />

      <div className="card-elevated grid grid-cols-1 gap-[var(--space-l)] rounded-[var(--radius)] border border-border bg-card p-[var(--space-m)] sm:grid-cols-[340px_1fr] sm:p-[var(--space-l)]">
        <div className="sm:col-start-1 sm:row-start-1">
          <span className={LABEL}>Name</span>
          <div className="skeleton-warm mt-[var(--space-xs)] h-10 rounded-[var(--radius-input)]" />
        </div>

        {/* With: the search field, the batch shortcut, then you. */}
        <div className="sm:col-start-2 sm:row-start-1 sm:row-span-2">
          <p className={LABEL}>With</p>
          <div className="mt-[var(--space-xs)] space-y-[var(--space-s)]">
            <div className="skeleton-warm h-10 rounded-[var(--radius-input)]" />
            <ButtonSkeleton size="sm" icon label="Everyone from 2000" />
            {/* Your own chip, in the picker's own list: an inline chip in a
                list item sits in that item's line box, which is 2px taller
                than the chip, and a bare block here left everything under it
                2px high on a phone. */}
            <ul className="flex flex-wrap gap-1.5 pt-1">
              <li>
                <span className="skeleton-warm inline-flex items-center gap-1.5 rounded-full border border-transparent py-1 pl-1.5 pr-3.5 text-[13px] font-medium">
                  <span className="size-7" />
                  <span className="invisible">Member Name</span>
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Rhythm: the cadence track (cadence-control.tsx). */}
        <div className="sm:col-start-1 sm:row-start-2">
          <p className={LABEL}>Rhythm</p>
          <div className="mt-[var(--space-xs)]">
            <div className="skeleton-warm inline-flex gap-1 rounded-full border border-transparent p-1">
              {["Biweekly", "Monthly", "Quarterly"].map((label) => (
                <span key={label} className="invisible px-4 py-1.5 text-[13px] font-semibold">
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center pt-[var(--space-l)] sm:col-span-2 sm:row-start-3">
          <ButtonSkeleton label="Start the first Edition" />
        </div>
      </div>
    </div>
  );
}

const LABEL = "text-[11px] font-bold uppercase tracking-[0.13em] text-muted-foreground";
