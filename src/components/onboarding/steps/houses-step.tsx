"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HOUSES, type HouseYearEntry } from "@/lib/houses";
import {
  readPendingHouses,
  writePendingHouses,
  clearPendingHouses,
} from "@/lib/onboarding-local";
import { getOnboardingHouses, saveOnboardingHouses } from "../actions";
import type { OnboardingUser } from "../onboarding-flow";

interface Row {
  key: number;
  year: string;
  house: string; // "" = not chosen ("don't remember" for that year)
}

let nextKey = 0;
function makeRow(year: string = "", house: string = ""): Row {
  return { key: nextKey++, year, house };
}

/**
 * Step 3: Houses, year by year. Houses change across a school career, so
 * this is a small repeater, one row per year, rather than a single field.
 * Rows are pre-seeded from yearJoined..yearLeft when known; otherwise the
 * person adds rows by hand. See src/components/onboarding/actions.ts for the
 * probe-and-fall-back persistence (no `houses` column exists yet).
 */
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
  const seedYears = useMemo(() => {
    if (user.yearJoined == null || user.yearLeft == null || user.yearLeft < user.yearJoined) {
      return null;
    }
    const years: number[] = [];
    for (let y = user.yearJoined; y <= user.yearLeft; y++) years.push(y);
    return years;
  }, [user.yearJoined, user.yearLeft]);

  const [rows, setRows] = useState<Row[]>(() =>
    seedYears ? seedYears.map((y) => makeRow(String(y))) : [makeRow()]
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Prefill from whatever is already saved: try the real column first (once
  // the owner's migration lands it will start returning data), and fall back
  // to the localStorage parking spot from a previous "pending-migration" save.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await getOnboardingHouses();
      const existing: HouseYearEntry[] | null =
        result.houses ?? (result.stored === "pending-migration" ? readPendingHouses(user.id) : null);
      if (!cancelled && existing && existing.length > 0) {
        setRows(existing.map((h) => makeRow(String(h.year), h.house)));
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateRow(key: number, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }
  function addRow() {
    setRows((rs) => [...rs, makeRow()]);
  }
  function removeRow(key: number) {
    setRows((rs) => rs.filter((r) => r.key !== key));
  }

  async function handleSave() {
    const payload: HouseYearEntry[] = rows
      .filter((r) => r.year.trim() && r.house)
      .map((r) => ({ year: Number(r.year), house: r.house }));

    if (payload.length === 0) {
      onNext();
      return;
    }

    setSaving(true);
    const result = await saveOnboardingHouses(payload);
    setSaving(false);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    if (result.stored === "pending-migration") {
      writePendingHouses(user.id, payload);
      toast.success("Saved, this will finish syncing once we turn on house history.");
    } else {
      clearPendingHouses(user.id);
      toast.success("Saved");
    }
    onNext();
  }

  return (
    <div className="space-y-[var(--space-l)]">
      <div className="space-y-[var(--space-xxs)] text-center">
        <h2 className="font-heading text-[24px] leading-tight tracking-[-0.02em] text-foreground">
          Which house, which year?
        </h2>
        <p className="mx-auto max-w-[38ch] text-[14px] leading-relaxed text-muted-foreground">
          Houses change year to year for a lot of us. Leave a year blank if
          you don&apos;t remember it.
        </p>
      </div>

      <div className="space-y-3 rounded-2xl border border-border bg-card p-[var(--space-l)]">
        {loading ? (
          <div className="space-y-2">
            <div className="skeleton-warm h-10 w-full rounded-xl" />
            <div className="skeleton-warm h-10 w-full rounded-xl" />
          </div>
        ) : (
          <>
            {rows.map((row) => (
              <div key={row.key} className="flex items-center gap-2">
                <Input
                  aria-label="Year"
                  type="number"
                  inputMode="numeric"
                  placeholder="Year"
                  value={row.year}
                  onChange={(e) => updateRow(row.key, { year: e.target.value })}
                  min={1926}
                  max={new Date().getFullYear() + 1}
                  className="w-24 shrink-0"
                />
                <Select
                  value={row.house}
                  onValueChange={(v) => updateRow(row.key, { house: v ?? "" })}
                >
                  <SelectTrigger className="w-full flex-1" aria-label="House">
                    <SelectValue placeholder="Don't remember" />
                  </SelectTrigger>
                  <SelectContent>
                    {HOUSES.map((h) => (
                      <SelectItem key={h} value={h}>
                        {h}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Remove this year"
                  onClick={() => removeRow(row.key)}
                  disabled={rows.length === 1}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addRow}>
              <Plus className="h-4 w-4" />
              Add a year
            </Button>
          </>
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
