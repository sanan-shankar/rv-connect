import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { IdentityRowSkeleton } from "@/components/common/identity-row";
import { FilterButtonSkeleton } from "@/components/common/skeleton";
import { ADMIN_MEASURE } from "@/components/admin/admin-chrome";
import { cn } from "@/lib/utils";

/**
 * The admin wing's loading screens, built from the furniture its pages are
 * built from (admin-chrome.tsx), so a screen waits in the shape it arrives
 * in.
 *
 * It used to be one component for every section -- a title bar over a list
 * of avatar cards, at full width -- and every section arrives as something
 * else: a stat strip, a queue of thread cards two up, a people grid three up,
 * a reading room. Each page now composes its own skeleton from these pieces.
 * The words that never change are drawn as they are: the title, through the
 * real PageHeader; a section's label; a stat's icon and label. What is fetched or
 * pressed is a placeholder at its own size. The single-column pages keep the
 * 1024px reading measure (ADMIN_MEASURE) the pages keep.
 *
 * Warm shimmer (`skeleton-warm`), never the grey pulse.
 */

/** A page: the real title, then whatever the page holds, 24px apart. */
export function AdminPageSkeleton({
  title,
  measure = true,
  className,
  children,
}: {
  title: string;
  /** The 1024px reading measure the single-column pages sit in. */
  measure?: boolean;
  /** The page's own gap, where it is not the usual 24px. */
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-6", measure && ADMIN_MEASURE, className)}>
      <PageHeader title={title} />
      {children}
    </div>
  );
}

/** AdminSection's own frame, its label drawn as the heading it is. */
export function AdminSectionSkeleton({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("flex flex-col gap-2.5", className)}>
      <div className="flex items-center gap-2 px-0.5">
        <h2 className="text-[13px] font-semibold text-foreground">{label}</h2>
      </div>
      {children}
    </section>
  );
}

/** StatStrip, each tile's icon and label drawn as they are and its figure
 *  pending. */
export function StatStripSkeleton({ tiles }: { tiles: { label: string; icon: LucideIcon }[] }) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius)] border border-border bg-border",
        tiles.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-4"
      )}
    >
      {tiles.map(({ label, icon: Icon }) => (
        <div key={label} className="bg-card px-3.5 py-3">
          <div className="flex h-5 items-center gap-1.5">
            <Icon className="size-3.5 shrink-0 text-leaf" strokeWidth={2} aria-hidden />
            <div className="skeleton-warm h-3.5 w-10 rounded-md" />
          </div>
          <p className="mt-1.5 truncate text-[12px] font-medium text-muted-foreground">{label}</p>
        </div>
      ))}
    </div>
  );
}

/** AdminFilterBar: the search field, the Filters pill, and the count under
 *  them in SentenceLine's 36px line. */
export function AdminFilterBarSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="skeleton-warm h-10 min-w-0 flex-1 rounded-[var(--radius-input)] sm:max-w-xs" />
        <FilterButtonSkeleton />
      </div>
      <div className="flex min-h-[36px] items-center">
        <div className="skeleton-warm h-2.5 w-20 rounded-md" />
      </div>
    </div>
  );
}

/** AdminPersonRow: the bird, the name's 13.5px line over the email's 12.5px
 *  one, in the row's own card at its 14px padding. */
export function AdminPersonRowSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-[var(--radius)] border border-border bg-card p-3.5", className)}>
      <IdentityRowSkeleton nameSize={13.5} metaSize={12.5} nameWidth="w-28" metaWidth="w-40" />
    </div>
  );
}

/** Chip (admin-chip.tsx): its own pill with the word invisible, so it is as
 *  wide as the chip it stands for. */
export function ChipSkeleton({ label }: { label: string }) {
  return (
    <span className="skeleton-warm inline-flex shrink-0 items-center rounded-full border border-transparent px-2 py-0.5 text-[11.5px] font-medium">
      <span className="invisible">{label}</span>
    </span>
  );
}
