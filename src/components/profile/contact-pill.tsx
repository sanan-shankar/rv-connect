import { cn } from "@/lib/utils";

/**
 * Shared pill style for the profile's contact/social links (mailto, tel,
 * Instagram/LinkedIn...). One source so header card and rail can't drift, and
 * so the animated properties stay transform/opacity-only (colour changes on
 * hover/active are instant, never transitioned) per the project's hard rule.
 */
export function contactPillClass(className?: string) {
  return cn(
    "inline-flex items-center gap-2 rounded-full border border-border bg-mist/60 px-3.5 py-2 text-[13px] font-semibold text-foreground transition-transform duration-150 hover:-translate-y-0.5 hover:bg-mist focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:translate-y-0 active:scale-[0.98]",
    className
  );
}
