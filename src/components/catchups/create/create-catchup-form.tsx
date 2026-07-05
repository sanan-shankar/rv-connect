"use client";

/* ------------------------------------------------------------------ *
 *  <CreateCatchupForm> — the create flow's two-column setup sheet
 *  (spec 3.2): left = the progressive steps (confirm group, rhythm,
 *  seed questions, start), right = the live Round 1 preview. Calls
 *  `createCatchup` (WP2) and redirects into the new Catch-up home on
 *  success. A "this group already has one" race is handled the same
 *  smooth way as the page-level guard: hand off to the existing one
 *  rather than dead-ending on an error.
 *
 *  `cadenceLabels`, `promptSets`, and `initialSeedPrompts` are computed
 *  server-side (the page reads them from `@/lib/catchups`) and passed
 *  in as plain data: this file is "use client", and that module also
 *  pulls in the server-only Prisma `pg` driver, which cannot be
 *  bundled for the browser.
 * ------------------------------------------------------------------ */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { BirdAvatar } from "@/components/common/bird-avatar";
import { CadenceControl } from "./cadence-control";
import { SeedQuestionsPicker, type SeedPrompt } from "./seed-questions-picker";
import { RoundPreviewCard } from "./round-preview-card";
import { createCatchup } from "@/app/(main)/catchups/actions";
import type { CatchupPromptSet } from "@/lib/catchups";
import type { Cadence, CatchupPersonRef } from "@/lib/catchups-types";

export function CreateCatchupForm({
  group,
  cadenceLabels,
  promptSets,
  initialSeedPrompts,
}: {
  group: { id: string; name: string; memberCount: number; members: CatchupPersonRef[] };
  cadenceLabels: Record<Cadence, string>;
  promptSets: CatchupPromptSet[];
  initialSeedPrompts: SeedPrompt[];
}) {
  const router = useRouter();
  const [cadence, setCadence] = useState<Cadence>("monthly");
  const [prompts, setPrompts] = useState<SeedPrompt[]>(initialSeedPrompts);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    const result = await createCatchup({ groupId: group.id, cadence, seedPrompts: prompts });

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
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
      <div className="card-elevated space-y-7 rounded-[var(--radius)] border border-border bg-card p-6 sm:p-7">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.13em] text-muted-foreground">
            Group
          </p>
          <div className="mt-2 inline-flex items-center gap-2.5 rounded-full border border-border bg-background/60 py-1.5 pl-1.5 pr-4">
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
          <p className="text-[11px] font-bold uppercase tracking-[0.13em] text-muted-foreground">
            Rhythm
          </p>
          <div className="mt-2">
            <CadenceControl value={cadence} onChange={setCadence} labels={cadenceLabels} />
          </div>
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.13em] text-muted-foreground">
            First questions
          </p>
          <div className="mt-2">
            <SeedQuestionsPicker prompts={prompts} onChange={setPrompts} promptSets={promptSets} />
          </div>
        </div>

        <div className="flex items-center justify-end border-t border-border pt-5">
          <Button variant="primary" size="lg" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Starting..." : "Start the first Round"}
          </Button>
        </div>
      </div>

      <RoundPreviewCard groupName={group.name} cadenceLabel={cadenceLabels[cadence]} seedPrompts={prompts} />
    </div>
  );
}
