import Link from "next/link";
import { PenLine } from "lucide-react";

export type DraftSummary = {
  id: string;
  title: string | null;
  updatedAt: string;
};

/**
 * A compact, visually recessed strip of the viewer's own in-progress letters,
 * shown above the published list on /letters (only when they have at least
 * one). Deliberately subordinate to the main list -- a hairline mist inset,
 * never a full card -- since these are unfinished, not content to browse.
 * Each row is a plain LINK to the writing desk (/letters/[id]/edit): a draft
 * is a letter mid-write, and letters are written on a whole page, not in the
 * 384px quick-edit dialog this used to open (owner, 2026-07-30).
 */
export function DraftsStrip({ drafts }: { drafts: DraftSummary[] }) {
  if (drafts.length === 0) return null;

  return (
    <div className="rounded-[var(--radius-md)] border border-border/80 bg-mist/40 p-4">
      <p className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.13em] text-muted-foreground">
        Your drafts
      </p>
      <div className="space-y-0.5">
        {drafts.map((d) => (
          <Link
            key={d.id}
            href={`/letters/${d.id}/edit`}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-[0.99]"
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
