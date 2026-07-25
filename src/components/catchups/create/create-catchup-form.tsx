"use client";

/* ------------------------------------------------------------------ *
 *  <CreateCatchupForm> — the whole create flow: who it is with, the
 *  rhythm, start. Nothing else.
 *
 *  Question-picking was removed here on the owner's instruction
 *  (2026-07-25): "why did I have to ask questions in the previous page
 *  when this page is the asking questions page?" Round 1 opens in
 *  `collecting` with no questions, which is the correct initial state for
 *  a screen whose whole job is collecting questions. The live preview card
 *  went with it. The form is short on purpose; do not pad it back out.
 *
 *  `cadenceLabels` is computed server-side (the page reads it from
 *  `@/lib/catchups`) and passed in as plain data: this file is "use
 *  client", and that module also pulls in the server-only Prisma `pg`
 *  driver, which cannot be bundled for the browser.
 * ------------------------------------------------------------------ */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { BirdAvatar } from "@/components/common/bird-avatar";
import { CadenceControl } from "./cadence-control";
import { createCatchup } from "@/app/(main)/catchups/actions";
import type { Cadence, CatchupPersonRef } from "@/lib/catchups-types";

export function CreateCatchupForm({
  group,
  cadenceLabels,
}: {
  group: { id: string; name: string; members: CatchupPersonRef[] };
  cadenceLabels: Record<Cadence, string>;
}) {
  const router = useRouter();
  const [cadence, setCadence] = useState<Cadence>("monthly");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    const result = await createCatchup({ groupId: group.id, cadence });

    if ("error" in result) {
      toast.error(result.error);
      // A race (someone else started one a beat earlier) still carries a
      // catchupId: hand off to it instead of leaving the form stranded.
      if ("catchupId" in result && result.catchupId) {
        router.push(`/catchups/${result.catchupId}`);
        return;
      }
      setSubmitting(false);
      return;
    }

    toast.success("Your Catch-up is live");
    router.push(`/catchups/${result.catchupId}`);
  }

  return (
    <div className="card-elevated max-w-xl space-y-[var(--space-l)] rounded-[var(--radius)] border border-border bg-card p-[var(--space-m)] sm:p-[var(--space-l)]">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.13em] text-muted-foreground">With</p>
        <div className="mt-[var(--space-xs)] inline-flex items-center gap-2.5 rounded-full border border-border bg-background/60 py-1.5 pl-1.5 pr-4">
          {group.members.length > 0 && (
            <div className="flex -space-x-2">
              {group.members.slice(0, 3).map((m) => (
                <BirdAvatar key={m.id} user={m} size="xs" ring />
              ))}
            </div>
          )}
          <span className="text-[14px] font-semibold text-foreground">{group.name}</span>
        </div>
      </div>

      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.13em] text-muted-foreground">Rhythm</p>
        <div className="mt-[var(--space-xs)]">
          <CadenceControl value={cadence} onChange={setCadence} labels={cadenceLabels} />
        </div>
      </div>

      <div className="flex items-center justify-end border-t border-border pt-[var(--space-m)]">
        <Button variant="primary" size="lg" onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Starting..." : "Start the first Round"}
        </Button>
      </div>
    </div>
  );
}
