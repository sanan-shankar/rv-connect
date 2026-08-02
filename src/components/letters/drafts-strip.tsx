import Link from "next/link";
import { PenLine } from "lucide-react";

export type DraftSummary = {
  id: string;
  title: string | null;
  updatedAt: string;
};

/**
 * A compact strip of the viewer's own in-progress letters, shown above the
 * published list on /letters (only when they have at least one). Still
 * subordinate to the main list -- these are unfinished, not content to browse
 * -- but subordinate now means SMALLER, not fainter.
 *
 * It used to be a mist inset (`bg-mist/40`), which composites to about #E7E4D8
 * on the #E4E1D5 page: +1.06 dL*, below the ~2 dL* just-noticeable difference,
 * so the tile effectively was not drawn (owner: "under your drafts in letters
 * that tile is way too less contrasted"). It is a real surface now: bg-card
 * #F5F2EA, +6.06 dL* off the page, the same paper every other tile in the app
 * sits on. The hierarchy against the published letter cards below is carried by
 * everything except the fill -- 12px radius against their 16px, p-4 against
 * their p-5, 13.5px rows against their 24px headings, and no card-elevated
 * shadow -- which is what a subordinate block should have been leaning on all
 * along.
 *
 * Each row is a plain LINK to the writing desk (/letters/[id]/edit): a draft
 * is a letter mid-write, and letters are written on a whole page, not in the
 * 384px quick-edit dialog this used to open (owner, 2026-07-30).
 */
export function DraftsStrip({ drafts }: { drafts: DraftSummary[] }) {
  if (drafts.length === 0) return null;

  return (
    <div className="rounded-[var(--radius-md)] border border-border/80 bg-card p-4">
      <p className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.13em] text-muted-foreground">
        Your drafts
      </p>
      <div className="space-y-0.5">
        {drafts.map((d) => (
          <Link
            key={d.id}
            href={`/letters/${d.id}/edit`}
            /* Radius --radius-sm (8.8px), not rounded-lg: that resolved to the
               theme's 16px and made every row ROUNDER than the 12px tile holding
               it. A nested box steps down (DESIGN-SYSTEM sec. 3).
               Hover is state-layer, the one neutral hover in the app. It used to
               be hover:bg-card, which is now the tile's own fill and would have
               left the rows with no hover at all. */
            className="state-layer flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-[0.99]"
          >
            <PenLine className="h-3.5 w-3.5 shrink-0 text-cinnamon" aria-hidden />
            <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-foreground">
              {d.title?.trim() || "Untitled letter"}
            </span>
            <span className="shrink-0 text-[11px] text-muted-foreground">
              Edited{" "}
              {new Date(d.updatedAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
              })}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
