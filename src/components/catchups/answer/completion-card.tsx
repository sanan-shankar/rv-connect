"use client";

/* ------------------------------------------------------------------ *
 *  <CompletionCard> — the soft completion moment (spec 3.4): "That is you
 *  in this Round. See you when it is out." No streaks, no badges, just a
 *  settled hoopoe and a warm sign-off.
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
    <FadeRise className="card-elevated relative overflow-hidden rounded-[var(--radius)] border border-border bg-card p-8 text-center sm:p-12">
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
          That is you in this Round.
        </h2>
        <p className="mx-auto mt-[var(--space-xs)] max-w-sm text-[15px] leading-relaxed text-muted-foreground">
          {answeredCount > 0
            ? `See you when ${groupName}'s Catch-up is out.`
            : "Come back any time before answers close. Even one line is plenty."}
        </p>
        <Link href={`/catchups/${catchupId}`} className="mt-[var(--space-l)] inline-flex">
          <Button variant="primary">Back to the Catch-up</Button>
        </Link>
      </div>
    </FadeRise>
  );
}
