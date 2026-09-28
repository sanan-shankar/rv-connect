"use client";

import { useState } from "react";
import { toast } from "sonner";
import { callAction } from "@/lib/call-action";
import { Button } from "@/components/ui/button";
import { HouseChainEditor } from "@/components/profile/house-chain-editor";
import type { HouseYearEntry } from "@/lib/houses";
import { saveOnboardingHouses } from "../actions";
import type { OnboardingUser } from "../types";
import { StepActions, StepHead, StepNext } from "../step-kit";

/* ------------------------------------------------------------------ *
 *  Step 3: Houses.
 *
 *  The same chain editor the profile uses, and for the same reason
 *  (owner, 2026-08-07: "make sure this house selecting whole UI is used
 *  while signing up as well"). Tap the grey pill, pick a house, it takes
 *  its colour and the next year appears; the same house twice running
 *  collapses into one pill.
 *
 *  This step used to be a column of year rows with a one-year house
 *  picker on each (deleted 2026-09-07, it outlived its last caller) and a
 *  read-only HouseTrail floating above them as a preview. Two
 *  drawings of one fact, which is one too many: the chain editor IS the
 *  preview, so the preview and the thing you are editing can no longer
 *  disagree. It also means somebody meets this interaction once, on the
 *  day they sign up, and finds it unchanged on their profile forever
 *  after.
 *
 *  The years still come entirely from the yearJoined/yearLeft collected
 *  at SIGN-UP (owner, 2026-07-30: "let it just show all the years I was
 *  there") - nobody builds a year list by hand.
 *
 *  So a member whose years are unknown never reaches this step: the flow
 *  leaves it out of their order, as it does for teachers. It used to show
 *  them an empty state saying so twice (once under the title, once in
 *  the editor) and a Save button with nothing to save.
 * ------------------------------------------------------------------ */

export function HousesStep({
  user,
  onSaved,
  onNext,
  onSkip,
}: {
  user: OnboardingUser;
  onSaved: (patch: Partial<OnboardingUser>) => void;
  onNext: () => void;
  onSkip: () => void;
}) {
  /* Seeded from the page, not fetched. This step used to read `houses` from a
     mount effect, through a server action, behind a two-bar skeleton -- a
     second round trip to the row `/welcome` had already loaded, and a flash of
     skeleton on a step whose whole point is that the years are already known.
     The page re-runs after every server action invoked from it, so what lands
     here after a save is the saved thing. (The profile does the same:
     `parseHouseYearEntries(user.houses)` in its page.) */
  const [entries, setEntries] = useState<HouseYearEntry[]>(user.houses);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (entries.length === 0) {
      onNext();
      return;
    }
    setSaving(true);
    try {
      const sorted = [...entries].sort((a, b) => a.year - b.year);
      const result = await callAction(() => saveOnboardingHouses(sorted));
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      // No toast, as on the register step: the next step is the confirmation.
      onSaved({ houses: sorted });
      onNext();
    } finally {
      // finally, not a trailing statement: a rejected save used to leave
      // "Continue" disabled for the rest of onboarding (audit B-042).
      setSaving(false);
    }
  }

  return (
    <>
      <StepHead
        title="Which houses were you in?"
        line="Tap the grey pill and pick a house. The next year appears after each pick."
      />
      {/* Straight on the sheet: the chain is both the editor and the preview,
          so it needs no box of its own. */}
      <div className="mt-[var(--space-l)]">
        <HouseChainEditor
          entries={entries}
          onChange={setEntries}
          yearJoined={user.yearJoined ?? null}
          yearLeft={user.yearLeft ?? null}
        />
      </div>
      <StepActions
        secondary={
          <Button type="button" variant="ghost" size="lg" onClick={onSkip} disabled={saving}>
            Skip
          </Button>
        }
      >
        <StepNext type="button" busy={saving} onClick={handleSave}>
          Continue
        </StepNext>
      </StepActions>
    </>
  );
}
