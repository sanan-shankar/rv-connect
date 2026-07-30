"use client";

import { useEffect, useMemo, useState } from "react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { HousePicker } from "@/components/common/house-picker";
import { HouseTrail } from "@/components/profile/houses-chain";
import type { HouseYearEntry } from "@/lib/houses";
import { academicSpanLabel, parseHouseSpans, seedHouseYearRows } from "@/lib/house-spans";
import { getOnboardingHouses, saveOnboardingHouses } from "../actions";
import type { OnboardingUser } from "../onboarding-flow";

/* ------------------------------------------------------------------ *
 *  Step 3: Houses. One row per academic year, derived entirely from the
 *  yearJoined/yearLeft collected a step earlier (owner, 2026-07-30:
 *  "Remove the earlier year and later year. Let it just show all the
 *  years I was there.") - the person only ever picks houses, never
 *  builds the year list. Each row accepts more than one house (mid-year
 *  moves). The live preview above the rows is the SAME HouseTrail the
 *  profile ships - not the old solid-tinted journey tiles, which
 *  colour-coded houses (rejected twice: "no per-house colours") in
 *  ochres like #C79318 and #A8906A that the palette has since purged.
 *  On save each row's houses expand back to the stored
 *  one-entry-per-{year, house} shape, so downstream readers are
 *  unchanged.
 * ------------------------------------------------------------------ */

const MIN_YEAR = 1926;
/* Refuse to lay out an implausible span (a typo like 1826 or 9021 in the
   previous step must not render a thousand rows here). */
const MAX_SPAN = 25;

function rowsToEntries(picks: Record<number, string[]>, years: number[]): HouseYearEntry[] {
  return years.flatMap((year) => (picks[year] ?? []).map((house) => ({ year, house })));
}

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
  const [picks, setPicks] = useState<Record<number, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rowsRef] = useAutoAnimate<HTMLDivElement>();
  // Which year's house panel is open. Held here (not inside HousePicker) so
  // committing one year can hand the run to the next.
  const [openYear, setOpenYear] = useState<number | null>(null);

  /* The years laid out, end-exclusive (joining 2014 / leaving 2021 = academic
     years 2014-15 through 2020-21). When the range is absent or nonsensical,
     fall back to whatever years already have saved picks. */
  const years = useMemo<number[]>(() => {
    const j = user.yearJoined;
    const l = user.yearLeft;
    if (j != null && l != null && j >= MIN_YEAR && l > j && l - j <= MAX_SPAN) {
      return Array.from({ length: l - j }, (_, i) => j + i);
    }
    return Object.keys(picks)
      .map(Number)
      .sort((a, b) => a - b);
  }, [user.yearJoined, user.yearLeft, picks]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { houses } = await getOnboardingHouses();
      if (!cancelled) {
        const seeded: Record<number, string[]> = {};
        for (const row of seedHouseYearRows(houses ? JSON.stringify(houses) : null, null, null)) {
          if (row.houses.length > 0) seeded[row.year] = row.houses;
        }
        setPicks(seeded);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updatePicks(year: number, houses: string[]) {
    setPicks((p) => ({ ...p, [year]: houses }));
  }
  // Picking a house opens the next year still needing one, so the whole career
  // is one click per year. Skips already-filled years and stops at the end.
  function advanceYear(fromYear: number) {
    const next = years.find((y) => y > fromYear && (picks[y] ?? []).length === 0);
    setOpenYear(next ?? null);
  }

  const journey = useMemo(
    () => parseHouseSpans(JSON.stringify(rowsToEntries(picks, years))),
    [picks, years]
  );

  async function handleSave() {
    const payload = rowsToEntries(picks, years).sort((a, b) => a.year - b.year);

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
    toast.success("Saved your houses");
    onNext();
  }

  return (
    <div className="space-y-[var(--space-l)]">
      <div className="space-y-[var(--space-xxs)] text-center">
        <h2 className="font-heading text-[24px] leading-tight tracking-[-0.02em] text-foreground">
          Which houses were you in?
        </h2>
        <p className="mx-auto max-w-[36ch] text-[15px] leading-relaxed text-muted-foreground">
          {years.length > 0
            ? "We've laid out your years. Just pick a house for each. Moved around? Two houses in one year is fine too."
            : "Tell us the years you joined and left in the previous step, and your years will be laid out here."}
        </p>
      </div>

      {/* Live preview: the same trail the profile draws, so what you build
          here is exactly what everyone sees there. */}
      {journey.length > 0 && (
        <div className="flex justify-center">
          <HouseTrail spans={journey} />
        </div>
      )}

      {/* One 16px container; inside it the rows are bare lines (plain quiet
          year text + the 12px picker), no inner boxes, no hairlines, no
          per-row chrome. The old version nested FIVE radii here. */}
      <div className="rounded-[var(--radius)] border border-border bg-card p-[var(--space-m)]">
        {loading ? (
          <div className="space-y-2.5">
            <div className="skeleton-warm h-11 w-full rounded-[var(--radius-input)]" />
            <div className="skeleton-warm h-11 w-full rounded-[var(--radius-input)]" />
          </div>
        ) : years.length === 0 ? (
          <p className="py-2 text-center text-[13.5px] text-muted-foreground">
            No years to lay out yet. You can skip this and come back from Settings any time.
          </p>
        ) : (
          <div ref={rowsRef} className="space-y-2">
            {years.map((year) => (
              <div key={year} className="flex items-center gap-3">
                <span className="w-16 shrink-0 text-[13px] font-semibold tabular-nums leading-tight text-muted-foreground">
                  {academicSpanLabel(year, year)}
                </span>
                <HousePicker
                  value={picks[year] ?? []}
                  onChange={(next) => updatePicks(year, next)}
                  ariaLabel={`House(s) for ${academicSpanLabel(year, year)}`}
                  yearLabel={academicSpanLabel(year, year)}
                  open={openYear === year}
                  onOpenChange={(o) => setOpenYear(o ? year : null)}
                  onPicked={() => advanceYear(year)}
                />
              </div>
            ))}
          </div>
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
