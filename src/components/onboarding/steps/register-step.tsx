"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { saveOnboardingRegister } from "../actions";
import type { OnboardingUser } from "../onboarding-flow";

/**
 * Step 2: "The register" — admission number, current city, profession and
 * organisation. Plain numeric admission number, never shown with a "#"
 * prefix anywhere in the UI. Every field is optional; "Skip for now"
 * advances without writing anything.
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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const formData = new FormData(e.currentTarget);
    const result = await saveOnboardingRegister(formData);
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
        <p className="mx-auto max-w-[38ch] text-[14px] leading-relaxed text-muted-foreground">
          This helps us match you to the school&apos;s records and helps
          batchmates place you.
        </p>
      </div>

      <div className="space-y-[var(--space-m)] rounded-2xl border border-border bg-card p-[var(--space-l)]">
        <div className="space-y-2">
          <Label htmlFor="admissionNumber">Admission number</Label>
          <Input
            id="admissionNumber"
            name="admissionNumber"
            type="number"
            inputMode="numeric"
            defaultValue={user.admissionNumber ?? ""}
            placeholder="e.g. 1234"
            min={0}
            max={10000}
          />
          <p className="text-[12.5px] text-muted-foreground">
            Don&apos;t remember it? Leave this blank, you can add it later.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="currentCity">Current city</Label>
          <Input
            id="currentCity"
            name="currentCity"
            defaultValue={user.currentCity ?? ""}
            placeholder="e.g. Bengaluru"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="jobTitle">Profession</Label>
            <Input
              id="jobTitle"
              name="jobTitle"
              defaultValue={user.jobTitle ?? ""}
              placeholder="e.g. Teacher"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="workplace">Organisation</Label>
            <Input
              id="workplace"
              name="workplace"
              defaultValue={user.workplace ?? ""}
              placeholder="e.g. Rishi Valley School"
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
