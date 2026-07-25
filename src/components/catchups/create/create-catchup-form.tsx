"use client";

/* ------------------------------------------------------------------ *
 *  <CreateCatchupForm> — the whole create flow: what it is called, who
 *  it is with, the rhythm, start. Nothing else.
 *
 *  Question-picking was removed here on the owner's instruction
 *  (2026-07-25): "why did I have to ask questions in the previous page
 *  when this page is the asking questions page?" Round 1 opens in
 *  `collecting` with no questions, which is the correct initial state for
 *  a screen whose whole job is collecting questions. The live preview card
 *  went with it. The form is short on purpose; do not pad it back out.
 *
 *  A Catch-up is also no longer started FROM a group. Groups are being
 *  retired as a user-facing feature, so you pick people here and the
 *  Group row that still backs membership is created silently server-side
 *  (see `createCatchupWithPeople`).
 *
 *  `cadenceLabels` is computed server-side (the page reads it from
 *  `@/lib/catchups`) and passed in as plain data: this file is "use
 *  client", and that module also pulls in the server-only Prisma `pg`
 *  driver, which cannot be bundled for the browser.
 * ------------------------------------------------------------------ */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CadenceControl } from "./cadence-control";
import { PeoplePicker, type PickedPerson } from "./people-picker";
import { createCatchupWithPeople } from "@/app/(main)/catchups/actions";
import type { Cadence } from "@/lib/catchups-types";

export function CreateCatchupForm({
  cadenceLabels,
  myBatchYear,
  suggestedName,
}: {
  cadenceLabels: Record<Cadence, string>;
  myBatchYear: number | null;
  /** e.g. "Batch of 2023", so the common case needs no typing. */
  suggestedName: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(suggestedName);
  const [people, setPeople] = useState<PickedPerson[]>([]);
  const [cadence, setCadence] = useState<Cadence>("monthly");
  const [submitting, setSubmitting] = useState(false);

  const trimmedName = name.trim();

  async function handleSubmit() {
    if (!trimmedName) {
      toast.error("Give this Catch-up a name.");
      return;
    }
    setSubmitting(true);
    const result = await createCatchupWithPeople({
      name: trimmedName,
      memberIds: people.map((p) => p.id),
      cadence,
    });

    if ("error" in result) {
      toast.error(result.error);
      setSubmitting(false);
      return;
    }

    toast.success("Your Catch-up is live");
    router.push(`/catchups/${result.catchupId}`);
  }

  return (
    <div className="card-elevated max-w-xl space-y-[var(--space-l)] rounded-[var(--radius)] border border-border bg-card p-[var(--space-m)] sm:p-[var(--space-l)]">
      <div>
        <label
          htmlFor="catchup-name"
          className="text-[11px] font-bold uppercase tracking-[0.13em] text-muted-foreground"
        >
          Name
        </label>
        <Input
          id="catchup-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          placeholder="Batch of 2023"
          className="mt-[var(--space-xs)]"
        />
      </div>

      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.13em] text-muted-foreground">With</p>
        <div className="mt-[var(--space-xs)]">
          <PeoplePicker value={people} onChange={setPeople} myBatchYear={myBatchYear} />
        </div>
      </div>

      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.13em] text-muted-foreground">Rhythm</p>
        <div className="mt-[var(--space-xs)]">
          <CadenceControl value={cadence} onChange={setCadence} labels={cadenceLabels} />
        </div>
      </div>

      <div className="flex items-center justify-end border-t border-border pt-[var(--space-m)]">
        <Button
          variant="primary"
          size="lg"
          onClick={handleSubmit}
          disabled={submitting || !trimmedName}
        >
          {submitting ? "Starting..." : "Start the first Round"}
        </Button>
      </div>
    </div>
  );
}
