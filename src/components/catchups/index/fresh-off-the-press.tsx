/* ------------------------------------------------------------------ *
 *  <FreshOffThePress> — the index's right rail: the most recently
 *  published Rounds across the viewer's groups (spec section 3.1).
 *  Mirrors the compact rail-card shape used by FeedRail so the app's
 *  right-rail language stays consistent.
 * ------------------------------------------------------------------ */

import Link from "next/link";
import { roundLabel } from "@/lib/catchups";

export type FreshRoundItem = {
  editionId: string;
  number: number;
  groupName: string;
  publishedAt: Date | string | null;
  contributorCount: number;
  teaser: string | null;
};

function formatDate(d: Date | string | null): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function FreshOffThePress({ items }: { items: FreshRoundItem[] }) {
  return (
    <section className="card-elevated rounded-[var(--radius)] border border-border bg-card p-4">
      <h3 className="mb-1 text-[10.5px] font-bold uppercase tracking-[0.13em] text-muted-foreground">
        Fresh off the press
      </h3>
      {items.length === 0 ? (
        <p className="py-2 text-[13px] leading-relaxed text-muted-foreground">
          Published Rounds from your groups will show up here once the first one is out.
        </p>
      ) : (
        <div className="[&>a+a]:border-t [&>a+a]:border-border">
          {items.map((item) => (
            <Link
              key={item.editionId}
              href={`/catchups/round/${item.editionId}`}
              className="block py-3 transition-opacity duration-150 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:opacity-70"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-[13px] font-semibold text-foreground">
                  {roundLabel(item.number)} &middot; {item.groupName}
                </span>
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {formatDate(item.publishedAt)}
                </span>
              </div>
              {item.teaser && (
                <p className="mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-muted-foreground">
                  &ldquo;{item.teaser}&rdquo;
                </p>
              )}
              <p className="mt-1 text-[11px] font-semibold text-leaf">
                {item.contributorCount} wrote in
              </p>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
