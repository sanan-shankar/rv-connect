"use client";

/* ------------------------------------------------------------------ *
 *  <CompletionCard> — the end of the deck: "That is you in this Round. See
 *  you when it is out." No streaks, no badges, one settled hoopoe.
 *
 *  One-hoopoe rule: gated on `useSoloHoopoe()`. When another bird is
 *  already on screen, the hoopoe drops out and the heading simply leads
 *  the card instead of sitting on an empty gap above it.
 * ------------------------------------------------------------------ */

import Link from "next/link";
import { Hoopoe } from "@/components/mascot/hoopoe";
import { useSoloHoopoe } from "@/components/mascot/moments/moment-hoopoe";
import { Button } from "@/components/ui/button";
import { FadeRise } from "@/components/common/motion";
import { cn } from "@/lib/utils";

export function CompletionCard({
  catchupId,
  groupName,
  answeredCount,
}: {
  catchupId: string;
  groupName: string;
  answeredCount: number;
}) {
  const solo = useSoloHoopoe();

  return (
    <FadeRise className="card-elevated relative overflow-hidden rounded-[var(--radius)] border border-border bg-card p-[var(--space-m)] text-center sm:p-[var(--space-l)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 50% 0%, color-mix(in srgb, var(--color-leaf) 10%, transparent), transparent 60%)",
        }}
      />
      <div className="relative flex flex-col items-center">
        {solo && <Hoopoe size={104} />}
        <h2
          className={cn(
            "font-heading text-2xl font-bold tracking-[-0.02em] text-foreground",
            solo && "mt-[var(--space-m)]"
          )}
        >
          {answeredCount > 0 ? "That is you in this Round." : "Nothing from you yet."}
        </h2>
        <p className="mx-auto mt-[var(--space-xs)] max-w-sm text-[15px] leading-relaxed text-muted-foreground">
          {answeredCount > 0
            ? `See you when ${groupName}'s Catch-up is out.`
            : "You can come back any time before answers close."}
        </p>
        <Link href={`/catchups/${catchupId}`} className="mt-[var(--space-l)] inline-flex">
          <Button variant="primary">Back to the Catch-up</Button>
        </Link>
      </div>
    </FadeRise>
  );
}
