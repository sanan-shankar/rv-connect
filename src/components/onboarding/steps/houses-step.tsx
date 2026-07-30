"use client";

import { useEffect, useMemo, useState } from "react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { ArrowLeft, ArrowRight, ChevronRight, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { HousePicker } from "@/components/common/house-picker";
import type { HouseYearEntry } from "@/lib/houses";
import {
  academicSpanLabel,
  missingYears,
  parseHouseSpans,
  restoreAllYearRows,
  seedHouseYearRows,
  type HouseYearRow,
} from "@/lib/house-spans";
import { getOnboardingHouses, saveOnboardingHouses } from "../actions";
import type { OnboardingUser } from "../onboarding-flow";

/* ------------------------------------------------------------------ *
 *  Step 3: Houses, smart-prefilled. When we already know yearJoined and
 *  yearLeft, every academic-year row (2014-15, 2015-16, ...) is generated up
 *  front, so the person only has to pick a house per row -- no typing years
 *  in the common case. Rows can still be trimmed (remove) or extended
 *  (add an earlier/later year), and each row accepts more than one house
 *  (owner: two houses in the same year is allowed -- covers mid-year moves
 *  and uncertain memories). On save each row's houses expand back to the
 *  stored one-entry-per-{year, house} shape, so downstream readers are
 *  unchanged. The `houses` column is live, so this writes straight to it.
 * ------------------------------------------------------------------ */

const MIN_YEAR = 1926;

// A warm colour per house. The literal-colour houses match their name; the
// rest hash deterministically into a warm field-journal palette so a
// person's journey always draws in the same hues.
const HOUSE_TINT: Record<string, string> = {
  Golden: "#C79318",
  Silver: "#8C93A0",
  Red: "#E14B3C",
  Green: "#2E9E54",
  Blue: "#3F7CA6",
  White: "#A8906A",
};
const TINT_POOL = [
  "#2E9E54", "#3F7CA6", "#1F9C8E", "#C2622F", "#8A5BB0",
  "#5566C4", "#C7508A", "#4F7E5C", "#C79318", "#B24A7A",
];
function houseTint(name: string): string {
  if (HOUSE_TINT[name]) return HOUSE_TINT[name];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return TINT_POOL[h % TINT_POOL.length];
}

// Rows -> flat one-entry-per-house-per-year list, for the live chain preview
// and for saving. A later row never overwrites an earlier one for the same
// year since each row already owns its own year.
function rowsToEntries(rows: HouseYearRow[]): HouseYearEntry[] {
  return rows
    .filter((r) => r.year >= MIN_YEAR)
    .flatMap((r) => r.houses.map((house) => ({ year: r.year, house })));
}

// Always at least one row to start from, even with nothing known yet.
function seedRows(
  raw: string | null | undefined,
  yearJoined: number | null,
  yearLeft: number | null
): HouseYearRow[] {
  const rows = seedHouseYearRows(raw, yearJoined, yearLeft);
  if (rows.length > 0) return rows;
  const year = yearJoined ?? yearLeft ?? new Date().getFullYear() - 1;
  return [{ year, houses: [] }];
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
  const [rows, setRows] = useState<HouseYearRow[]>(() => seedRows(null, user.yearJoined, user.yearLeft));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rowsRef] = useAutoAnimate<HTMLDivElement>();
  const [chainRef] = useAutoAnimate<HTMLDivElement>();
  // Which year's house panel is open. Held here (not inside HousePicker) so
  // committing one year can hand the run to the next.
  const [openYear, setOpenYear] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { houses } = await getOnboardingHouses();
      if (!cancelled) {
        setRows(seedRows(houses ? JSON.stringify(houses) : null, user.yearJoined, user.yearLeft));
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateRowHouses(year: number, houses: string[]) {
    setRows((rs) => rs.map((r) => (r.year === year ? { ...r, houses } : r)));
  }
  function removeRow(year: number) {
    setRows((rs) => rs.filter((r) => r.year !== year));
  }
  // Picking a house opens the next year still needing one, so the whole career
  // is one click per year. Skips already-filled years and stops at the end.
  function advanceYear(fromYear: number) {
    const next = [...rows]
      .sort((a, b) => a.year - b.year)
      .find((r) => r.year > fromYear && r.houses.length === 0);
    setOpenYear(next ? next.year : null);
  }
  function restoreYears() {
    setRows((rs) => restoreAllYearRows(rs, user.yearJoined, user.yearLeft));
  }
  // With no rows left, both buttons re-seed from the same anchor (whatever
  // we know about when this person was here, or last year as a fallback) so
  // there is still never anything to type.
  function anchorYear(): number {
    return user.yearJoined ?? user.yearLeft ?? new Date().getFullYear() - 1;
  }
  function addEarlierYear() {
    setRows((rs) => {
      const year = (rs.length ? Math.min(...rs.map((r) => r.year)) : anchorYear() + 1) - 1;
      if (year < MIN_YEAR) return rs;
      return [{ year, houses: [] }, ...rs];
    });
  }
  function addLaterYear() {
    setRows((rs) => {
      const cap = new Date().getFullYear() + 1;
      const year = (rs.length ? Math.max(...rs.map((r) => r.year)) : anchorYear() - 1) + 1;
      if (year > cap) return rs;
      return [...rs, { year, houses: [] }];
    });
  }

  // Sorted for display; the live journey chain collapses same-house runs.
  const sortedRows = useMemo(() => [...rows].sort((a, b) => a.year - b.year), [rows]);
  const journey = useMemo(() => parseHouseSpans(JSON.stringify(rowsToEntries(rows))), [rows]);

  async function handleSave() {
    const payload = rowsToEntries(rows).sort((a, b) => a.year - b.year);

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

  const missingRowYears = missingYears(rows, user.yearJoined, user.yearLeft);
  const currentYear = new Date().getFullYear();
  const canAddEarlier = (rows.length ? Math.min(...rows.map((r) => r.year)) : anchorYear() + 1) - 1 >= MIN_YEAR;
  const canAddLater = (rows.length ? Math.max(...rows.map((r) => r.year)) : anchorYear() - 1) + 1 <= currentYear + 1;

  return (
    <div className="space-y-[var(--space-l)]">
      <div className="space-y-[var(--space-xxs)] text-center">
        <h2 className="font-heading text-[24px] leading-tight tracking-[-0.02em] text-foreground">
          Which houses were you in?
        </h2>
        <p className="mx-auto max-w-[36ch] text-[15px] leading-relaxed text-muted-foreground">
          {user.yearJoined != null && user.yearLeft != null
            ? "We've laid out your years. Just pick a house for each -- add or remove years if we got the range wrong."
            : "Add each academic year and the house you were in. Moved around? Two houses in one year is fine too."}
        </p>
      </div>

      {/* Live journey chain */}
      {journey.length > 0 && (
        <div
          ref={chainRef}
          className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-2 rounded-2xl border border-border bg-mist/60 p-[var(--space-m)]"
        >
          {journey.map((span, i) => {
            const tint = houseTint(span.house);
            return (
              <div key={`${span.house}-${span.fromYear}-${i}`} className="flex items-center gap-1.5">
                <div
                  className="flex flex-col items-center rounded-xl px-3 py-1.5 text-center leading-tight text-white shadow-sm"
                  style={{ backgroundColor: tint }}
                >
                  <span className="text-[13px] font-semibold">{span.house}</span>
                  <span className="text-[11px] text-white/85">{academicSpanLabel(span.fromYear, span.toYear)}</span>
                </div>
                {i < journey.length - 1 && (
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" aria-hidden />
                )}
              </div>
            );
          })}
        </div>
      )}

      <div ref={rowsRef} className="space-y-2.5 rounded-2xl border border-border bg-card p-[var(--space-l)]">
        {loading ? (
          <div className="space-y-2.5">
            <div className="skeleton-warm h-11 w-full rounded-xl" />
            <div className="skeleton-warm h-11 w-full rounded-xl" />
          </div>
        ) : (
          <>
            {sortedRows.map((row) => (
              <div key={row.year} className="flex items-center gap-2 rounded-xl bg-mist/40 p-2.5">
                <div className="flex h-10 w-[68px] shrink-0 items-center justify-center rounded-lg bg-canopy/10 px-1 text-center">
                  <span className="text-[13px] font-bold tabular-nums leading-tight text-canopy">
                    {academicSpanLabel(row.year, row.year)}
                  </span>
                </div>
                <HousePicker
                  value={row.houses}
                  onChange={(next) => updateRowHouses(row.year, next)}
                  ariaLabel={`House(s) for ${academicSpanLabel(row.year, row.year)}`}
                  yearLabel={academicSpanLabel(row.year, row.year)}
                  open={openYear === row.year}
                  onOpenChange={(o) => setOpenYear(o ? row.year : null)}
                  onPicked={() => advanceYear(row.year)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove ${academicSpanLabel(row.year, row.year)}`}
                  onClick={() => removeRow(row.year)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={addEarlierYear} disabled={!canAddEarlier}>
                <Plus className="h-4 w-4" />
                Earlier year
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={addLaterYear} disabled={!canAddLater}>
                <Plus className="h-4 w-4" />
                Later year
              </Button>
              {missingRowYears.length > 0 && (
                <Button type="button" variant="outline" size="sm" onClick={restoreYears}>
                  <Plus className="h-4 w-4" />
                  Add all my years ({missingRowYears.length})
                </Button>
              )}
            </div>
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
