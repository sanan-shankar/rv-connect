"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { callAction } from "@/lib/call-action";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { LocationPicker, type PlaceSelection } from "@/components/common/location-picker";
import { TagInput } from "@/components/common/tag-input";
import { titleCase } from "@/lib/normalize";
import { saveOnboardingRegister } from "../actions";
import type { OnboardingUser } from "../onboarding-flow";

/**
 * Rishi Valley itself, as the location picker's gazetteer knows it. The row is
 * the curated one seeded by prisma/migrations-manual/2026-08-18-rishi-valley-place.sql
 * (id 900000001, pinned far outside GeoNames' range precisely so it can be
 * named), which is why the fields can be spelled out
 * here instead of calling /api/places/search just to pre-fill a form.
 */
const RISHI_VALLEY: PlaceSelection = {
  placeId: 900000001,
  label: "Rishi Valley, Andhra Pradesh",
  city: "Rishi Valley",
  lat: 13.6299,
  lng: 78.4661,
};

/**
 * Step 2: "The register" — current city (or cities), admission number,
 * occupation and organisation. City sits first, then the admission number,
 * per the field order the owner asked for. Every field is optional; "Skip for
 * now" advances without writing anything. Text is title-cased server-side, so
 * the placeholders here only need to read clearly as examples ("e.g. ...").
 *
 * Teacher accounts never had an admission number, so that field simply does
 * not render for them.
 */
export function RegisterStep({
  user,
  onNext,
  onBack,
  onSkip,
}: {
  user: OnboardingUser;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}) {
  const isTeacher = user.accountType !== "alumnus";
  // A CURRENT teacher lives in the valley; a former one moved on years ago.
  // That split decides all three pre-filled fields below.
  const isCurrentTeacher = user.accountType === "teacher";
  const [saving, setSaving] = useState(false);
  // Rishi Valley is already on the chip list for a current teacher who has not
  // saved a city yet (owner, 2026-08-18) — it is a pill like any other, so it
  // can be removed, and the box below it still adds however many more they
  // want. Anyone with saved cities keeps exactly what they saved.
  const [places, setPlaces] = useState<PlaceSelection[]>(
    user.places?.length ? user.places : isCurrentTeacher ? [RISHI_VALLEY] : []
  );
  const [admissionNumber, setAdmissionNumber] = useState(
    user.admissionNumber?.toString() ?? ""
  );
  // Stored as one comma-list column; edited here as chips.
  const [subjects, setSubjects] = useState<string[]>(
    (user.subjects ?? "").split(",").map((s) => s.trim()).filter(Boolean)
  );
  // A CURRENT teacher's occupation and organisation are not really open
  // questions, so both arrive pre-filled (owner, 2026-08-18) and editable.
  // Former teachers work elsewhere now; they start blank like anyone else.
  const [jobTitle, setJobTitle] = useState(
    user.jobTitle ?? (isCurrentTeacher ? "Teacher" : "")
  );
  const [workplace, setWorkplace] = useState(
    user.workplace ?? (isCurrentTeacher ? "Rishi Valley School" : "")
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    try {
      const result = await callAction(() =>
        saveOnboardingRegister({
          admissionNumber:
            !isTeacher && admissionNumber.trim() ? Number(admissionNumber) : undefined,
          // Sent (possibly empty, meaning "clear it") only for teachers; alumni
          // never see the field, so their saves leave the column untouched.
          subjects: isTeacher ? subjects.join(", ") : undefined,
          jobTitle: jobTitle.trim() || undefined,
          workplace: workplace.trim() || undefined,
          places,
        })
      );
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Saved");
      onNext();
    } finally {
      // finally, not a trailing statement: a rejected save used to leave
      // the continue button disabled for the rest of onboarding (audit B-042).
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-[var(--space-l)]">
      <div className="space-y-[var(--space-xxs)] text-center">
        <h2 className="font-heading text-[24px] leading-tight tracking-[-0.02em] text-foreground">
          A few details for the register
        </h2>
        <p className="mx-auto max-w-[36ch] text-[15px] leading-relaxed text-muted-foreground">
          {isTeacher
            ? "These help old students place you. Skip anything you would rather leave."
            : "These help batchmates place you. Skip anything you would rather leave."}
        </p>
      </div>

      <div className="space-y-[var(--space-m)] rounded-2xl border border-border bg-card p-[var(--space-l)]">
        <div className="space-y-2">
          <Label htmlFor="currentCity">Where you live now</Label>
          {/* Always the chip-list picker: a picked city commits to a pill on
              tap, and tapping the box again adds the next one. The old
              single-then-"Add another city" toggle made the first pick sit as
              plain text in the box, which read as not-yet-saved. */}
          <LocationPicker
            id="currentCity"
            mode="multi"
            value={places}
            onChange={setPlaces}
            aria-label="Your cities"
          />
        </div>

        {isTeacher ? (
          <div className="space-y-2">
            <Label htmlFor="subjects">
              {user.accountType === "teacher" ? "Subjects you teach" : "Subjects you taught"}
            </Label>
            <TagInput
              id="subjects"
              value={subjects}
              // Title-cased the moment it becomes a pill, so "physics" is
              // born as "Physics" instead of waiting for the server to fix
              // it on save. Deliberate mixed case (IB Physics) is preserved.
              onChange={(tags) => setSubjects(tags.map(titleCase))}
              placeholder="e.g. Physics"
              aria-label="Subjects"
            />
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="admissionNumber">Admission number</Label>
            <Input
              id="admissionNumber"
              type="number"
              inputMode="numeric"
              value={admissionNumber}
              onChange={(e) => setAdmissionNumber(e.target.value)}
              placeholder="e.g. 3430"
              min={0}
              max={10000}
            />
            <p className="text-[12.5px] text-muted-foreground">
              Don&apos;t remember it? Leave it blank, you can add it later.
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="jobTitle">Occupation</Label>
            <Input
              id="jobTitle"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="e.g. Teacher"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="workplace">Organisation</Label>
            <Input
              id="workplace"
              value={workplace}
              onChange={(e) => setWorkplace(e.target.value)}
              placeholder="e.g. Apple"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onSkip} disabled={saving}>
            Skip for now
          </Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save &amp; continue
            {!saving && <ArrowRight className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </form>
  );
}
