"use client";

/* ------------------------------------------------------------------ *
 *  The houses chain, with the pen in it.
 *
 *  Owner, 2026-08-07:
 *
 *  > I just want a pill. Maybe it's a grey, for when it's not selected.
 *  > You click on it, it automatically picks the first year you were
 *  > there, and you say which house you were in. Once you do that it
 *  > automatically moves on to the next pill, because it knows how long
 *  > you were there. The pill will be grey until you pick a house, and
 *  > then it'll take its colour, and we move on to the next one.
 *
 *  So one pill is one year. Answer it and the next year's pill appears
 *  behind it. Answer the same house twice running and the two pills
 *  become one that reads Palm 2016-18, because the chain already does
 *  that on the profile and this IS that chain: <HouseTrail> with two
 *  optional props, so every pill can be a button and one empty pill can
 *  join the line. The empty pill goes through the same measuring pass
 *  and the same row packing as a house, so the serpentine turns land on
 *  it with no special case.
 *
 *  THE PANEL IS THE SHIPPED ONE. <HouseOptions> is the same body the
 *  year-row picker has always used, in the same 300px popover on desktop
 *  and the same bottom sheet on a phone (owner, 2026-08-07: "the house
 *  picker it shows is really big, I wanted something more compact like
 *  the currently shipped house picker"). Two columns, 44px rows, the
 *  shared state layer for hover, the canopy check for selection, and the
 *  "Not listed?" escape. Nothing about the question is new here; the
 *  only new thing is that the answer is a pill in a chain.
 * ------------------------------------------------------------------ */

import { useEffect, useMemo, useState } from "react";
import { HouseTrail } from "@/components/profile/houses-chain";
import { HouseOptions } from "@/components/common/house-picker";
import {
  Popover,
  PopoverContent,
  PopoverPortal,
  PopoverPositioner,
} from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { academicSpanLabel, parseHouseSpans } from "@/lib/house-spans";
import { HOUSES, normalizeHouse, type HouseYearEntry } from "@/lib/houses";

/* Same test, and the same reasoning, as the shipped HousePicker: the shell is
   chosen from the viewport rather than left to collision flipping, because at
   390px a side panel has nowhere to flip to that is not also off-screen. */
function useWideViewport(): boolean {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setWide(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return wide;
}

/**
 * Which pill the panel is answering.
 *
 * A span is identified by the YEARS it covers, never by its index. Indices go
 * stale the instant the chain changes shape, and adding a second house to a
 * year is exactly that: 2014-15 stops being one span and becomes two, so an
 * index captured before the tap points somewhere else, or past the end, and
 * `spans[target.index]` is undefined. That was the "undefined is not an object
 * evaluating item.kind" crash on removing a second house. A year range is
 * stable however the houses on it are rearranged.
 */
type Target =
  | { kind: "next"; anchor: HTMLElement }
  | { kind: "span"; from: number; to: number; anchor: HTMLElement };

export function HouseChainEditor({
  entries,
  onChange,
  yearJoined,
  yearLeft,
  editing = true,
}: {
  entries: HouseYearEntry[];
  onChange: (next: HouseYearEntry[]) => void;
  /** The career bounds, end-exclusive, as they stand in the form RIGHT NOW.
   *  Correcting a year above re-lays-out the chain immediately. */
  yearJoined: number | null;
  yearLeft: number | null;
  /** Off, this is exactly the read-only chain: no handlers, no grey pill.
   *  The profile mounts this component in BOTH states rather than swapping
   *  between two components, so entering edit mode cannot remount the chain
   *  and cannot make it re-measure or re-animate. */
  editing?: boolean;
}) {
  const [target, setTarget] = useState<Target | null>(null);
  const [other, setOther] = useState("");
  const wide = useWideViewport();

  /* Round-tripping through JSON to reach parseHouseSpans looks odd and is
     deliberate: that function is what the profile's read-only chain calls, so
     reaching for anything else here would be the first step towards the two
     disagreeing about what a span is. */
  const spans = useMemo(() => parseHouseSpans(JSON.stringify(entries)), [entries]);

  /* Leaving in 2023 means the last academic year here was 2022-23, the same
     end-exclusive convention seedHouseYearRows uses. */
  const career =
    yearJoined != null && yearLeft != null && yearLeft - 1 >= yearJoined
      ? { from: yearJoined, to: yearLeft - 1 }
      : null;

  const nextYear = useMemo(
    () => (career ? firstGap(entries, career.from, career.to) : null),
    // The object is rebuilt every render; its two numbers are the real dep.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entries, career?.from, career?.to]
  );

  if (!career) {
    if (!editing) return spans.length > 0 ? <HouseTrail spans={spans} /> : null;
    return (
      <p className="text-[13.5px] leading-relaxed text-muted-foreground">
        Fill in the years you were here and your houses appear as a chain.
      </p>
    );
  }

  /** The years the open panel is answering for. */
  const scope =
    target?.kind === "span"
      ? { from: target.from, to: target.to }
      : nextYear != null
        ? { from: nextYear, to: nextYear }
        : null;
  const scopeLabel = scope ? academicSpanLabel(scope.from, scope.to) : "";
  const chosen =
    scope && target?.kind === "span"
      ? housesInSpan(entries, { fromYear: scope.from, toYear: scope.to })
      : [];
  /* The ring goes on every pill the open panel covers. With two houses on one
     year that is two pills, which is the truth: both are being edited. */
  const openIndices =
    scope && target?.kind === "span"
      ? spans.flatMap((sp, i) =>
          sp.fromYear <= scope.to && sp.toYear >= scope.from ? [i] : []
        )
      : [];

  function toggle(house: string) {
    if (!scope || !target) return;

    if (target.kind === "span") {
      /* On an answered pill this is a toggle, which is where the two-houses-
         in-one-year case lives. Tapping the house already there takes it off;
         tapping a different one records both for those years. The panel stays
         open, because a correction is not a finished answer. */
      const already = entries.some(
        (e) => e.house === house && e.year >= scope.from && e.year <= scope.to
      );
      const next = already
        ? entries.filter(
            (e) => !(e.house === house && e.year >= scope.from && e.year <= scope.to)
          )
        : sorted([...entries, ...yearsIn(scope).map((year) => ({ year, house }))]);
      onChange(next);
      // Taking the LAST house off these years leaves a gap, so the pill being
      // edited no longer exists and there is nothing to stay open on.
      if (housesInSpan(next, { fromYear: scope.from, toYear: scope.to }).length === 0) {
        setTarget(null);
      }
      return;
    }

    /* The grey pill. Claim this one year, then hand the panel straight to the
       next unanswered one without closing: the list stays where the pointer
       already is and the chain grows above it. */
    const next = sorted([...entries, { year: scope.from, house }]);
    onChange(next);
    setOther("");
    if (firstGap(next, career!.from, career!.to) == null) setTarget(null);
  }

  function addOther() {
    const name = normalizeHouse(other);
    if (name) toggle(name);
    setOther("");
  }

  const canonical: ReadonlySet<string> = new Set(HOUSES);
  const panel = (
    <HouseOptions
      value={chosen}
      onToggle={toggle}
      otherText={other}
      setOtherText={setOther}
      onAddOther={addOther}
      customEntries={chosen.filter((h) => !canonical.has(h))}
      onRemoveCustom={toggle}
      heading={
        wide ? (
          <p className="text-[13px] font-semibold text-foreground">
            Which house in <span className="tabular-nums text-canopy">{scopeLabel}</span>?
          </p>
        ) : undefined
      }
    />
  );

  return (
    <div>
      <HouseTrail
        spans={spans}
        onSpanClick={
          editing
            ? (index, anchor) => {
                setOther("");
                const sp = spans[index];
                if (!sp) return;
                setTarget({ kind: "span", from: sp.fromYear, to: sp.toYear, anchor });
              }
            : undefined
        }
        pending={
          !editing || nextYear == null
            ? undefined
            : {
                label: academicSpanLabel(nextYear, nextYear),
                open: target?.kind === "next",
                // Chronological place, not the end of the line: clearing a
                // year in the middle of a finished chain has to put the grey
                // pill back where that year belongs.
                at: indexOfYear(spans, nextYear),
                onClick: (anchor) => {
                  setOther("");
                  setTarget({ kind: "next", anchor });
                },
              }
        }
        openIndices={openIndices}
      />

      {/* One panel, anchored to whichever pill asked for it. The anchor is the
          pill's own element rather than a wrapper, because the chain packs its
          rows itself and only it knows where a given pill ended up. */}
      {wide ? (
        <Popover open={Boolean(target)} onOpenChange={(o) => !o && setTarget(null)}>
          <PopoverPortal>
            <PopoverPositioner
              anchor={target?.anchor ?? null}
              sideOffset={8}
              align="start"
              side="bottom"
            >
              <PopoverContent className="w-[300px]">{panel}</PopoverContent>
            </PopoverPositioner>
          </PopoverPortal>
        </Popover>
      ) : (
        <Sheet open={Boolean(target)} onOpenChange={(o) => !o && setTarget(null)}>
          <SheetContent side="bottom" className="max-h-[64vh] rounded-t-[var(--radius)] p-0">
            <SheetHeader className="border-b border-border pb-3">
              <SheetTitle className="font-heading text-[15px] font-semibold tracking-tight">
                Which house in{" "}
                <span className="tabular-nums text-canopy">{scopeLabel}</span>?
              </SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-4 pb-4">{panel}</div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}

/* ---- small pure helpers ---- */

const sorted = (e: HouseYearEntry[]) => [...e].sort((a, b) => a.year - b.year);

const yearsIn = ({ from, to }: { from: number; to: number }) =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i);

/** Every house recorded across a span's years, so a two-house year opens with
 *  both ticked. */
function housesInSpan(
  entries: HouseYearEntry[],
  span: { fromYear: number; toYear: number }
): string[] {
  const out: string[] = [];
  for (const e of entries) {
    if (e.year < span.fromYear || e.year > span.toYear) continue;
    if (!out.includes(e.house)) out.push(e.house);
  }
  return out;
}

/** Where a pill for `year` belongs: before the first span that starts later. */
function indexOfYear(spans: { fromYear: number }[], year: number): number {
  const i = spans.findIndex((s) => s.fromYear > year);
  return i === -1 ? spans.length : i;
}

function firstGap(entries: HouseYearEntry[], from: number, to: number): number | null {
  const covered = new Set(entries.map((e) => e.year));
  for (let y = from; y <= to; y++) if (!covered.has(y)) return y;
  return null;
}
