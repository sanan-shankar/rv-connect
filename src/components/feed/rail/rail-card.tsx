import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * RailCard: the shared shell for every module in the feed's right rail, one
 * card treatment and one microhead style so a new module reads like it
 * belongs the moment it ships. Matches the kit proven in
 * /lab/feed-canvas, productionized.
 */
export function RailCard({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "card-elevated rounded-[var(--radius)] border border-border bg-card p-4",
        className
      )}
    >
      <h3 className="mb-1.5 text-[10.5px] font-bold uppercase tracking-[0.13em] text-muted-foreground">
        {label}
      </h3>
      {children}
    </section>
  );
}
