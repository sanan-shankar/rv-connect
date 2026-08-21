"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { callAction } from "@/lib/call-action";
import { Button } from "@/components/ui/button";
import { HouseChainEditor } from "@/components/profile/house-chain-editor";
import type { HouseYearEntry } from "@/lib/houses";
import { parseHouseYearEntries } from "@/lib/house-spans";
import { getOnboardingHouses, saveOnboardingHouses } from "../actions";
import type { OnboardingUser } from "../onboarding-flow";

/* ------------------------------------------------------------------ *
 *  Step 3: Houses.
 *
 *  The same chain editor the profile uses, and for the same reason
 *  (owner, 2026-08-07: "make sure this house selecting whole UI is used
 *  while signing up as well"). Tap the grey pill, pick a house, it takes
 *  its colour and the next year appears; the same house twice running
 *  collapses into one pill.
 *
 *  This step used to be a column of year rows with a HousePicker on each
 *  and a read-only HouseTrail floating above them as a preview. Two
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
 *  Which is why the empty state does not say "the previous step": the
 *  previous step is Register, and it has no year fields on it, so anyone
 *  sent back there found nothing to fill in and no way forward (audit
 *  Low 113). The profile is where those years are edited afterwards, so
 *  that is where the copy points.
 * ------------------------------------------------------------------ */

export function HousesStep({
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
  const [entries, setEntries] = useState<HouseYearEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const knowsYears =
    user.yearJoined != null && user.yearLeft != null && user.yearLeft - 1 >= user.yearJoined;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // callAction: a rejected fetch (deploy skew, dropped network) used to
      // leave `loading` true forever, so this step stuck on its skeleton
      // with no way out (audit B-042).
      const result = await callAction(() => getOnboardingHouses());
      if (cancelled) return;
      if ("error" in result) {
        toast.error(result.error);
        setLoading(false);
        return;
      }
      setEntries(parseHouseYearEntries(result.houses ? JSON.stringify(result.houses) : null));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSave() {
    if (entries.length === 0) {
      onNext();
      return;
    }
    setSaving(true);
    try {
      const result = await callAction(() =>
        saveOnboardingHouses([...entries].sort((a, b) => a.year - b.year))
      );
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("Saved your houses");
      onNext();
    } finally {
      // finally, not a trailing statement: a rejected save used to leave
      // "Save & continue" disabled for the rest of onboarding (audit B-042).
      setSaving(false);
    }
  }

  return (
    <div className="space-y-[var(--space-l)]">
      <div className="space-y-[var(--space-xxs)] text-center">
        <h2 className="font-heading text-[24px] leading-tight tracking-[-0.02em] text-foreground">
          Which houses were you in?
        </h2>
        <p className="mx-auto max-w-[38ch] text-[15px] leading-relaxed text-muted-foreground">
          {knowsYears
            ? "Tap the grey pill, pick a house, and the next year appears. Stayed put? Pick the same one again and the two join up."
            : "We do not have the years you were here yet. Skip this for now, add them on your profile, and your years will lay themselves out."}
        </p>
      </div>

      {/* One 16px container, and the chain inside it. No year rows and no
          separate preview: this is both. */}
      <div className="rounded-[var(--radius)] border border-border bg-card p-[var(--space-m)]">
        {loading ? (
          <div className="space-y-2.5">
            <div className="skeleton-warm h-8 w-2/3 rounded-full" />
            <div className="skeleton-warm h-8 w-1/2 rounded-full" />
          </div>
        ) : (
          <HouseChainEditor
            entries={entries}
            onChange={setEntries}
            yearJoined={user.yearJoined ?? null}
            yearLeft={user.yearLeft ?? null}
          />
        )}
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
          <Button type="button" variant="primary" onClick={handleSave} disabled={saving || loading}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save &amp; continue
            {!saving && <ArrowRight className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
