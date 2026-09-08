"use client";

/* ------------------------------------------------------------------ *
 *  <CreateCatchupForm> — the whole create flow: what it is called, who
 *  it is with, the rhythm, start. Nothing else.
 *
 *  Question-picking was removed here on the owner's instruction
 *  (2026-07-25): "why did I have to ask questions in the previous page
 *  when this page is the asking questions page?" The first Edition opens in
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

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { callAction } from "@/lib/call-action";
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
  me,
}: {
  cadenceLabels: Record<Cadence, string>;
  myBatchYear: number | null;
  /** The viewer, so the With list can show them in it (see PeoplePicker). */
  me: PickedPerson;
  /** Preloaded from `?group=<id>` (an existing group with no Catch-up yet
   *  clicking "Start one"): the page resolves the group's members server-side
   *  so the picker opens with them already chipped in instead of empty. */
}) {
  const router = useRouter();
  /* EMPTY, not "Batch of <your year>". The field used to arrive pre-filled
     with the viewer's own batch, on the reasoning that it saved the common
     case some typing. Owner, 2026-09-07: "I don't know why when I create a new
     catch-up, the default name is Batch of 2023. Like, why is that the default
     name?", then "just remove the default catch up name in the shipped app."

     He is right twice over. This form makes a Catch-up with people you CHOOSE,
     so a batch's name is the one name it is least likely to want; and a batch
     Catch-up is becoming automatic, so naming a hand-made one after a batch is
     how the two got confused in the first place (recon F17: two groups called
     "Batch of 2024", one real and one a snapshot somebody made here). */
  const [name, setName] = useState("");
  const [people, setPeople] = useState<PickedPerson[]>([]);
  const [cadence, setCadence] = useState<Cadence>("monthly");
  const [submitting, setSubmitting] = useState(false);
  /* A ref as well as the flag: `disabled` only takes effect on the next
     render, so two presses in one frame both reached the action and started
     two whole Catch-ups (audit Low 29). Set synchronously. */
  const submittingRef = useRef(false);
  // The unconfirmed-email refusal opens the one shared dialog, the same
  // card posting and commenting use, instead of a toast reciting the rule.
  const emailGate = useEmailGate();

  const trimmedName = name.trim();

  async function handleSubmit() {
    if (!trimmedName) {
      toast.error("Give this Catch-up a name.");
      return;
    }
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const result = await callAction(() =>
        createCatchupWithPeople({
          name: trimmedName,
          memberIds: people.map((p) => p.id),
          cadence,
        })
      );

      if ("error" in result) {
        if (!emailGate.handled(result.error)) toast.error(result.error);
        return;
      }

      toast.success("Your Catch-up is live");
      router.push(`/catchups/${result.catchupId}`);
    } finally {
      // finally, not a trailing statement: a rejected call used to leave
      // "Start the first Edition" disabled for the rest of the session (audit B-042).
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  return (
    // Width comes from the page's own centred column (new/page.tsx), not
    // from this card, so the title above and the card share one edge.
    //
    // Two columns from `sm` up, not one stretched the whole 768px: Name and
    // Rhythm are both a single short control that a wide column would only
    // pad with dead space, while With (search, the batch shortcut, the
    // picked chips) is the one field with real content to grow into. So the
    // compact pair stacks in a fixed left column and With takes the rest,
    // spanning both of their rows -- the extra room the wider page gave this
    // card goes INTO the layout rather than sitting empty beside it. DOM
    // order stays Name, With, Rhythm, Start (tab order and the mobile
    // single-column stack are both unaffected; the grid positions below are
    // sm-and-up only).
    <div className="card-elevated grid grid-cols-1 gap-[var(--space-l)] rounded-[var(--radius)] border border-border bg-card p-[var(--space-m)] sm:grid-cols-[340px_1fr] sm:p-[var(--space-l)]">
      <div className="sm:col-start-1 sm:row-start-1">
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
          /* No placeholder either. It read "Batch of 2023" -- the same string
             the field used to be pre-filled with, in grey -- so removing the
             default while leaving the ghost of it on screen would have fixed
             nothing he could see. The label above already says Name, and an
             example here can only ever suggest the one kind of Catch-up this
             form does not make. */
          className="mt-[var(--space-xs)]"
        />
      </div>

      <div className="sm:col-start-2 sm:row-start-1 sm:row-span-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.13em] text-muted-foreground">With</p>
        <div className="mt-[var(--space-xs)]">
          <PeoplePicker value={people} onChange={setPeople} myBatchYear={myBatchYear} me={me} />
        </div>
      </div>

      <div className="sm:col-start-1 sm:row-start-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.13em] text-muted-foreground">Rhythm</p>
        <div className="mt-[var(--space-xs)]">
          <CadenceControl value={cadence} onChange={setCadence} labels={cadenceLabels} />
        </div>
      </div>

      {/* Left-aligned like every other row in this form (owner review
          2026-07-25: "why is everything left aligned and then start the
          first round is right aligned"), and spacing instead of a rule above
          it -- the border was the odd stray line the owner flagged, not a
          real section break. Spans both columns: it is the one row that
          closes the whole form, not a third column entry. */}
      <div className="flex items-center pt-[var(--space-l)] sm:col-span-2 sm:row-start-3">
        <Button
          variant="primary"
          size="default"
          onClick={handleSubmit}
          disabled={submitting || !trimmedName}
        >
          {submitting ? "Starting..." : "Start the first Edition"}
        </Button>
      </div>
      {emailGate.dialog}
    </div>
  );
}
