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
import { useEmailGate } from "@/components/auth/verify-email-dialog";
import { createCatchupWithPeople } from "@/app/(main)/catchups/actions";
import type { Cadence } from "@/lib/catchups-types";

export function CreateCatchupForm({
  cadenceLabels,
  myBatchYear,
  suggestedName,
  initialPeople = [],
  me,
}: {
  cadenceLabels: Record<Cadence, string>;
  myBatchYear: number | null;
  /** The viewer, so the With list can show them in it (see PeoplePicker). */
  me: PickedPerson;
  /** e.g. "Batch of 2023", so the common case needs no typing. */
  suggestedName: string;
  /** Preloaded from `?group=<id>` (an existing group with no Catch-up yet
   *  clicking "Start one"): the page resolves the group's members server-side
   *  so the picker opens with them already chipped in instead of empty. */
  initialPeople?: PickedPerson[];
}) {
  const router = useRouter();
  const [name, setName] = useState(suggestedName);
  const [people, setPeople] = useState<PickedPerson[]>(initialPeople);
  const [cadence, setCadence] = useState<Cadence>("monthly");
  const [submitting, setSubmitting] = useState(false);
  // The unconfirmed-email refusal opens the one shared dialog, the same
  // card posting and commenting use, instead of a toast reciting the rule.
  const emailGate = useEmailGate();

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
      if (!emailGate.handled(result.error)) toast.error(result.error);
      setSubmitting(false);
      return;
    }

    toast.success("Your Catch-up is live");
    router.push(`/catchups/${result.catchupId}`);
  }

  return (
    // Width comes from the page's own centred max-w-xl wrapper (new/page.tsx),
    // not from this card, so the title above and the card share one edge.
    <div className="card-elevated space-y-[var(--space-l)] rounded-[var(--radius)] border border-border bg-card p-[var(--space-m)] sm:p-[var(--space-l)]">
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
          <PeoplePicker value={people} onChange={setPeople} myBatchYear={myBatchYear} me={me} />
        </div>
      </div>

      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.13em] text-muted-foreground">Rhythm</p>
        <div className="mt-[var(--space-xs)]">
          <CadenceControl value={cadence} onChange={setCadence} labels={cadenceLabels} />
        </div>
      </div>

      {/* Left-aligned like every other row in this form (owner review
          2026-07-25: "why is everything left aligned and then start the
          first round is right aligned"), and spacing instead of a rule above
          it -- the border was the odd stray line the owner flagged, not a
          real section break. */}
      <div className="flex items-center pt-[var(--space-l)]">
        <Button
          variant="primary"
          size="default"
          onClick={handleSubmit}
          disabled={submitting || !trimmedName}
        >
          {submitting ? "Starting..." : "Start the first Round"}
        </Button>
      </div>
      {emailGate.dialog}
    </div>
  );
}
