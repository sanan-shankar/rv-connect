"use client";

import { useEffect, useMemo, useState } from "react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { ArrowLeft, ArrowRight, ChevronRight, Loader2, Plus, X } from "lucide-react";
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
import { HOUSES, normalizeHouse, type HouseYearEntry } from "@/lib/houses";
import { getOnboardingHouses, saveOnboardingHouses } from "../actions";
import type { OnboardingUser } from "../onboarding-flow";

/* ------------------------------------------------------------------ *
 *  Step 3: Houses, as a journey. Most people were in one or two houses;
 *  some moved every year. Rather than a row per year, each row is a
 *  STINT — a house and the years it covers — and the chain of stints is
 *  drawn live below as coloured boxes joined by arrows (the Dossier
 *  element the owner loves). On save each stint expands to the stored
 *  one-row-per-year [{year, house}] shape so downstream readers are
 *  unchanged. The `houses` column is live, so this writes straight to it.
 * ------------------------------------------------------------------ */

const OTHER = "__other";

interface Stint {
  key: number;
  house: string; // a canonical house, or OTHER
  otherName: string; // free text when house === OTHER
  from: string;
  to: string;
}

let nextKey = 0;
function makeStint(house = "", otherName = "", from = "", to = ""): Stint {
  return { key: nextKey++, house, otherName, from, to };
}

// The resolved house label for a stint (the picked house, or the free-typed
// "Other" name), empty when nothing is chosen yet.
function stintHouse(s: Stint): string {
  if (s.house === OTHER) return normalizeHouse(s.otherName);
  return s.house;
}

// A warm colour per house. The literal-colour houses match their name; the
// rest hash deterministically into a warm field-journal palette so a person's
// journey always draws in the same hues.
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

function yearRangeLabel(from: string, to: string): string {
  if (from && to && from !== to) return `${from}–${to}`;
  return from || to || "";
}

// Collapse the stored one-row-per-year entries back into stints for editing:
// runs of consecutive years in the same house become a single from–to stint.
function entriesToStints(entries: HouseYearEntry[]): Stint[] {
  const sorted = [...entries]
    .filter((e) => e.house && Number.isFinite(e.year))
    .sort((a, b) => a.year - b.year);
  const stints: Stint[] = [];
  for (const e of sorted) {
    const last = stints[stints.length - 1];
    const canonical = HOUSES.includes(e.house as (typeof HOUSES)[number]);
    if (last && stintHouse(last) === e.house && Number(last.to) === e.year - 1) {
      last.to = String(e.year);
    } else {
      stints.push(
        canonical
          ? makeStint(e.house, "", String(e.year), String(e.year))
          : makeStint(OTHER, e.house, String(e.year), String(e.year))
      );
    }
  }
  return stints;
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
  // Seed a single blank stint, pre-filled with the joined–left range when we
  // know it, so the common one-house case is a single house pick away.
  const [stints, setStints] = useState<Stint[]>(() => {
    const from = user.yearJoined != null ? String(user.yearJoined) : "";
    const to = user.yearLeft != null ? String(user.yearLeft) : "";
    return [makeStint("", "", from, to)];
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rowsRef] = useAutoAnimate<HTMLDivElement>();
  const [chainRef] = useAutoAnimate<HTMLDivElement>();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { houses } = await getOnboardingHouses();
      if (!cancelled && houses && houses.length > 0) {
        setStints(entriesToStints(houses));
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateStint(key: number, patch: Partial<Stint>) {
    setStints((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }
  function addStint() {
    setStints((rs) => [...rs, makeStint()]);
  }
  function removeStint(key: number) {
    setStints((rs) => rs.filter((r) => r.key !== key));
  }

  // The live journey: every stint that has a resolved house drawn as a box.
  const journey = useMemo(
    () => stints.filter((s) => stintHouse(s).length > 0),
    [stints]
  );

  async function handleSave() {
    // Expand each resolved stint to one entry per year; a later stint wins if
    // two overlap on a year, so the map keeps the last write per year.
    const byYear = new Map<number, string>();
    for (const s of stints) {
      const house = stintHouse(s);
      if (!house) continue;
      const from = Number(s.from);
      const to = Number(s.to) || from;
      if (!Number.isFinite(from) || from < 1926) continue;
      const lo = Math.min(from, to);
      const hi = Math.max(from, to);
      for (let y = lo; y <= hi; y++) byYear.set(y, house);
    }
    const payload: HouseYearEntry[] = [...byYear.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([year, house]) => ({ year, house }));

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

  const currentYear = new Date().getFullYear();

  return (
    <div className="space-y-[var(--space-l)]">
      <div className="space-y-[var(--space-xxs)] text-center">
        <h2 className="font-heading text-[24px] leading-tight tracking-[-0.02em] text-foreground">
          Which houses were you in?
        </h2>
        <p className="mx-auto max-w-[36ch] text-[15px] leading-relaxed text-muted-foreground">
          Add each house and the years you were in it. Moved around? Add as many
          as you like.
        </p>
      </div>

      {/* Live journey chain */}
      {journey.length > 0 && (
        <div
          ref={chainRef}
          className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-2 rounded-2xl border border-border bg-mist/60 p-[var(--space-m)]"
        >
          {journey.map((s, i) => {
            const label = stintHouse(s);
            const tint = houseTint(label);
            const years = yearRangeLabel(s.from, s.to);
            return (
              <div key={s.key} className="flex items-center gap-1.5">
                <div
                  className="flex flex-col items-center rounded-xl px-3 py-1.5 text-center leading-tight text-white shadow-sm"
                  style={{ backgroundColor: tint }}
                >
                  <span className="text-[13px] font-semibold">{label}</span>
                  {years && <span className="text-[11px] text-white/85">{years}</span>}
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
            {stints.map((s) => {
              const isOther = s.house === OTHER;
              return (
                <div key={s.key} className="space-y-2 rounded-xl bg-mist/40 p-2.5">
                  <div className="flex items-center gap-2">
                    <Select
                      value={s.house}
                      onValueChange={(v) => updateStint(s.key, { house: v ?? "" })}
                    >
                      <SelectTrigger className="w-full flex-1" aria-label="House">
                        <SelectValue placeholder="Pick a house" />
                      </SelectTrigger>
                      <SelectContent>
                        {HOUSES.map((h) => (
                          <SelectItem key={h} value={h}>
                            {h}
                          </SelectItem>
                        ))}
                        <SelectItem value={OTHER}>Other…</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Remove this house"
                      onClick={() => removeStint(s.key)}
                      disabled={stints.length === 1}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {isOther && (
                    <Input
                      aria-label="House name"
                      placeholder="Type the house name"
                      value={s.otherName}
                      onChange={(e) => updateStint(s.key, { otherName: e.target.value })}
                    />
                  )}

                  <div className="flex items-center gap-2">
                    <Input
                      aria-label="From year"
                      type="number"
                      inputMode="numeric"
                      placeholder="From"
                      value={s.from}
                      onChange={(e) => updateStint(s.key, { from: e.target.value })}
                      min={1926}
                      max={currentYear + 1}
                      className="flex-1"
                    />
                    <span className="text-[13px] text-muted-foreground">to</span>
                    <Input
                      aria-label="To year"
                      type="number"
                      inputMode="numeric"
                      placeholder="Same year"
                      value={s.to}
                      onChange={(e) => updateStint(s.key, { to: e.target.value })}
                      min={1926}
                      max={currentYear + 1}
                      className="flex-1"
                    />
                  </div>
                </div>
              );
            })}
            <Button type="button" variant="outline" size="sm" onClick={addStint}>
              <Plus className="h-4 w-4" />
              Add a house
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
