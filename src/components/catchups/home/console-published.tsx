"use client";

/* ------------------------------------------------------------------ *
 *  <ConsolePublished> - the left console once the latest Round is out
 *  (spec 3.3): a "Round N is out" banner with the "Read the Round" CTA.
 * ------------------------------------------------------------------ */

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FadeRise } from "@/components/common/motion";
import { MemberStrip } from "./member-strip";
import type { CatchupHomeData, HomeEditionView } from "./types";

export function ConsolePublished({
  data,
  edition,
}: {
  data: CatchupHomeData;
  edition: HomeEditionView;
}) {
  return (
    <FadeRise>
      <div className="card-elevated relative overflow-hidden rounded-[var(--radius)] border border-border bg-card p-8 sm:p-10">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(90% 80% at 0% 0%, color-mix(in srgb, var(--color-leaf) 10%, transparent), transparent 60%), radial-gradient(90% 80% at 100% 100%, color-mix(in srgb, var(--color-cinnamon) 9%, transparent), transparent 55%)",
          }}
        />
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-leaf">
              {data.groupName} Catch-ups
            </p>
            <h2 className="mt-2 font-heading text-2xl font-bold tracking-[-0.02em] text-foreground">
              Round {edition.number} is out.
            </h2>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
              {edition.answeredCount} of {data.memberCount} wrote in. Read the whole issue together.
            </p>
            <MemberStrip members={data.members} className="mt-4" max={10} />
          </div>
          <Link href={`/catchups/round/${edition.id}`}>
            <Button variant="primary" size="lg">
              Read the Round
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </FadeRise>
  );
}
