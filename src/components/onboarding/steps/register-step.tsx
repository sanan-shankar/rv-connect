"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { LocationPicker, type PlaceSelection } from "@/components/common/location-picker";
import { saveOnboardingRegister } from "../actions";
import type { OnboardingUser } from "../onboarding-flow";

/**
 * Step 2: "The register" — current city (or cities), admission number,
 * occupation and organisation. City sits first, then the admission number,
 * per the field order the owner asked for. Every field is optional; "Skip for
 * now" advances without writing anything. Text is title-cased server-side, so
 * the placeholders here only need to read clearly as examples ("e.g. ...").
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
  const [saving, setSaving] = useState(false);
  const [places, setPlaces] = useState<PlaceSelection[]>(user.places ?? []);
  // A single city to start; "Add another city" opens the multi list. Someone
  // who already has more than one saved city lands straight in the list.
  const [multi, setMulti] = useState((user.places?.length ?? 0) > 1);
  const [admissionNumber, setAdmissionNumber] = useState(
    user.admissionNumber?.toString() ?? ""
  );
  const [jobTitle, setJobTitle] = useState(user.jobTitle ?? "");
  const [workplace, setWorkplace] = useState(user.workplace ?? "");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const result = await saveOnboardingRegister({
      admissionNumber: admissionNumber.trim() ? Number(admissionNumber) : undefined,
      jobTitle: jobTitle.trim() || undefined,
      workplace: workplace.trim() || undefined,
      places,
    });
    setSaving(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Saved");
    onNext();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-[var(--space-l)]">
      <div className="space-y-[var(--space-xxs)] text-center">
        <h2 className="font-heading text-[24px] leading-tight tracking-[-0.02em] text-foreground">
          A few details for the register
        </h2>
        <p className="mx-auto max-w-[36ch] text-[15px] leading-relaxed text-muted-foreground">
          These help batchmates place you. Skip anything you would rather leave.
        </p>
      </div>

      <div className="space-y-[var(--space-m)] rounded-2xl border border-border bg-card p-[var(--space-l)]">
        <div className="space-y-2">
          <Label htmlFor="currentCity">Where you live now</Label>
          {multi ? (
            <LocationPicker
              id="currentCity"
              mode="multi"
              value={places}
              onChange={setPlaces}
              aria-label="Your cities"
            />
          ) : (
            <>
              <LocationPicker
                id="currentCity"
                mode="single"
                value={places[0] ?? null}
                onChange={(sel) => setPlaces(sel ? [sel] : [])}
              />
              <button
                type="button"
                onClick={() => setMulti(true)}
                // Bare text link: ink-only hover, plus the press it was missing.
                className="inline-flex items-center gap-1 rounded-sm text-[13px] font-medium text-canopy transition-[colors,opacity] duration-150 hover:text-canopy/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:opacity-70"
              >
                <Plus className="h-3.5 w-3.5" />
                Add another city
              </button>
            </>
          )}
        </div>

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
