"use client";

/* ------------------------------------------------------------------ *
 *  Three ways to enter a house history.
 *
 *  The shipped editor (src/components/common/house-picker.tsx +
 *  src/components/settings/settings-form.tsx) asks one modal question
 *  per academic year, each time offering the same flat grid of 22 pills.
 *  `advanceHouseYear` auto-opens the next unfilled year after a pick,
 *  which is genuinely good and is why the click count is already low:
 *  1 click to open, then 1 per year.
 *
 *  What it does not fix is that the QUESTION is wrong. A house history
 *  is a small number of runs, not a list of years, and most people have
 *  exactly one run. Asking five times costs five unaided scans of a
 *  22-target grid to state one fact.
 *
 *  Colours are the app's own `houseTint()` from
 *  src/components/onboarding/steps/houses-step.tsx, copied verbatim so
 *  these prototypes draw a person's journey in the same hues the
 *  product already uses.
 * ------------------------------------------------------------------ */

import { useMemo, useRef, useState } from "react";
import { Check, CornerDownLeft, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { HOUSES } from "@/lib/houses";

/* ---- colour, lifted from the shipped onboarding step ---- */
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
export function houseTint(name: string): string {
  if (HOUSE_TINT[name]) return HOUSE_TINT[name];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return TINT_POOL[h % TINT_POOL.length];
}

/* ---- the families the flat list throws away ----
   All 22 canonical houses, sorted into the four groups they obviously
   belong to. Nothing invented: six are literally colour names, nine are
   trees and flowers of the valley, six are mountains and rivers, one is
   an ancient city. Grouping turns one 22-target scan into a 4-group one. */
export const FAMILIES: { label: string; houses: string[] }[] = [
  { label: "Colours", houses: ["Golden", "Silver", "Green", "Red", "White", "Blue"] },
  {
    label: "Trees and flowers",
    houses: ["Neem", "Raavi", "Palm", "Malli", "Amaltash", "Gulmohar", "Jacaranda", "Alamanda", "Duranta"],
  },
  {
    label: "Mountains and rivers",
    houses: ["Meru", "Nilgiri", "Trishul", "Kailash", "Krishna", "Cauvery"],
  },
  { label: "Elsewhere", houses: ["Takshila"] },
];

/* every canonical house is accounted for, or the grouping is a lie */
const GROUPED = FAMILIES.flatMap((f) => f.houses);
if (process.env.NODE_ENV !== "production" && GROUPED.length !== HOUSES.length) {
  console.warn(`houses lab: grouped ${GROUPED.length} of ${HOUSES.length} canonical houses`);
}

/* ---- the demo person: joined 2014, left 2019, so five academic years ---- */
export const JOINED = 2014;
export const LEFT = 2019;
export const YEARS = Array.from({ length: LEFT - JOINED }, (_, i) => JOINED + i);
export const yearLabel = (y: number) => `${y}-${String((y + 1) % 100).padStart(2, "0")}`;

export const UNSURE = "__unsure__";

/** collapse a per-year array into runs, for the prose summary */
export function runs(v: (string | null)[]) {
  const out: { house: string | null; from: number; to: number }[] = [];
  v.forEach((h, i) => {
    const last = out[out.length - 1];
    if (last && last.house === h) last.to = YEARS[i];
    else out.push({ house: h, from: YEARS[i], to: YEARS[i] });
  });
  return out;
}

export function summary(v: (string | null)[]) {
  const r = runs(v).filter((x) => x.house);
  if (r.length === 0) return "Nothing yet.";
  const part = (x: (typeof r)[number]) => {
    const n = YEARS.indexOf(x.to) - YEARS.indexOf(x.from) + 1;
    const name = x.house === UNSURE ? "Somewhere you cannot remember" : x.house;
    return n === 1 ? `${name} for a year` : `${name} for ${n} years`;
  };
  if (r.length === 1) return `${part(r[0])}.`;
  return r.map((x, i) => (i === 0 ? part(x) : `then ${part(x)}`)).join(", ") + ".";
}

/* ------------------------------------------------------------------ *
 *  Shared bits
 * ------------------------------------------------------------------ */

function Counter({ clicks, best }: { clicks: number; best: string }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <span className="font-heading text-[22px] font-bold tabular-nums leading-none text-foreground">
        {clicks}
      </span>
      <span className="text-[12.5px] text-muted-foreground">
        {clicks === 1 ? "interaction" : "interactions"} so far · {best}
      </span>
    </div>
  );
}

function Ribbon({
  value,
  aim,
  onAim,
}: {
  value: (string | null)[];
  aim?: number | null;
  onAim?: (i: number) => void;
}) {
  return (
    <div className="flex gap-1">
      {YEARS.map((y, i) => {
        const h = value[i];
        const tint = h && h !== UNSURE ? houseTint(h) : null;
        const isAim = aim === i;
        const Tag = onAim ? "button" : "div";
        return (
          <Tag
            key={y}
            {...(onAim
              ? {
                  type: "button" as const,
                  onClick: () => onAim(i),
                  "aria-label": `Set the house from ${yearLabel(y)} onward`,
                }
              : {})}
            className={cn(
              "relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 overflow-hidden rounded-xl border px-1 py-3 transition-[background-color,border-color,transform] duration-200",
              onAim &&
                "cursor-pointer active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf/50",
              isAim ? "border-cinnamon" : "border-border",
              !h && "bg-mist",
            )}
            style={tint ? { background: `${tint}22`, borderColor: `${tint}80` } : undefined}
          >
            {h === UNSURE && (
              <span
                className="absolute inset-0"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(45deg, #E0D8C8 0 5px, transparent 5px 10px)",
                }}
              />
            )}
            <span className="relative truncate text-[10.5px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
              {yearLabel(y)}
            </span>
            <span
              className="relative truncate text-[13px] font-semibold"
              style={{ color: tint ?? "var(--muted-foreground)" }}
            >
              {h === UNSURE ? "not sure" : (h ?? "·")}
            </span>
            {isAim && (
              <span className="absolute inset-x-0 bottom-0 h-[3px] rounded-t-full bg-cinnamon" />
            )}
          </Tag>
        );
      })}
    </div>
  );
}

function Palette({
  onPick,
  disabled,
  compact = false,
}: {
  onPick: (h: string) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <div className={cn("grid gap-3", compact ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-4")}>
      {FAMILIES.map((f) => (
        <div key={f.label}>
          <div className="mb-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            {f.label}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {f.houses.map((h) => {
              const tint = houseTint(h);
              return (
                <button
                  key={h}
                  type="button"
                  disabled={disabled}
                  onClick={() => onPick(h)}
                  className="group flex items-center gap-1.5 rounded-full border border-border bg-card py-1 pl-1.5 pr-2.5 text-[12.5px] font-semibold transition-[background-color,border-color,transform] duration-150 hover:border-foreground/25 hover:bg-mist active:scale-[0.96] disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf/50"
                >
                  <span
                    className="h-3.5 w-3.5 shrink-0 rounded-full"
                    style={{ background: tint }}
                    aria-hidden
                  />
                  {h}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function Summary({ value }: { value: (string | null)[] }) {
  return (
    <p className="text-[15px] leading-[1.6]">
      <span className="mr-2 text-[10.5px] font-bold uppercase tracking-[0.14em] text-leaf">
        Your run
      </span>{" "}
      {summary(value)}
    </p>
  );
}

function Reset({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-[12px] font-semibold text-muted-foreground transition-[background-color,color,transform] duration-150 hover:bg-mist hover:text-foreground active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf/50"
    >
      <RotateCcw className="h-3.5 w-3.5" />
      Start over
    </button>
  );
}

const empty = () => YEARS.map(() => null as string | null);

/* ------------------------------------------------------------------ *
 *  A. THE RUN
 *  A house history is runs, not years. First pick paints the whole
 *  career. Click the year you moved, pick again, and it splits there.
 * ------------------------------------------------------------------ */

export function DirectionRun() {
  const [value, setValue] = useState<(string | null)[]>(empty);
  const [aim, setAim] = useState<number | null>(null);
  const [clicks, setClicks] = useState(0);
  const untouched = value.every((v) => v === null);

  function pick(h: string) {
    setClicks((c) => c + 1);
    const from = aim ?? 0;
    setValue((v) => v.map((old, i) => (i >= from ? h : old)));
    setAim(null);
  }

  return (
    <div className="space-y-4">
      <Counter
        clicks={clicks}
        best="one house the whole time is 1. Two houses is 3."
      />
      <Ribbon
        value={value}
        aim={aim}
        onAim={(i) => {
          setClicks((c) => c + 1);
          setAim((a) => (a === i ? null : i));
        }}
      />
      <p className="text-[13px] leading-[1.55] text-muted-foreground">
        {untouched
          ? "Pick a house. It fills your whole time at school, because that is what usually happened."
          : aim === null
            ? "Moved house at some point? Click the year you moved, then pick the new one."
            : `Now pick the house you moved into. It will run from ${yearLabel(YEARS[aim])} to the end.`}
      </p>
      <Palette onPick={pick} />
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3.5">
        <Summary value={value} />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setClicks((c) => c + 1);
              const from = aim ?? 0;
              setValue((v) => v.map((old, i) => (i >= from ? UNSURE : old)));
              setAim(null);
            }}
            className="rounded-full border border-dashed border-border bg-card px-3 py-1 text-[12px] font-semibold text-muted-foreground transition-[background-color,color,transform] duration-150 hover:bg-mist hover:text-foreground active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf/50"
          >
            I cannot remember
          </button>
          <Reset
            onClick={() => {
              setValue(empty());
              setAim(null);
              setClicks(0);
            }}
          />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  B. ROLL CALL
 *  Year by year, kept, but after the first pick the common answer is
 *  one big target instead of a 22-pill scan. Slower than A on purpose:
 *  it confirms each year out loud, which some people will want.
 * ------------------------------------------------------------------ */

export function DirectionRollCall() {
  const [value, setValue] = useState<(string | null)[]>(empty);
  const [clicks, setClicks] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const cursor = value.findIndex((v) => v === null);
  const done = cursor === -1;
  const prev = cursor > 0 ? value[cursor - 1] : null;

  function set(i: number, h: string) {
    setClicks((c) => c + 1);
    setValue((v) => v.map((old, n) => (n === i ? h : old)));
    setShowAll(false);
  }

  return (
    <div className="space-y-4">
      <Counter clicks={clicks} best="one house throughout is 5, with only the first needing a scan." />
      <Ribbon value={value} />

      {done ? (
        <div className="flex items-center gap-2.5 rounded-xl bg-leaf/10 px-4 py-3">
          <Check className="h-4 w-4 shrink-0 text-leaf" />
          <span className="text-[14px] font-semibold text-leaf">That is your whole run.</span>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-[13px] font-semibold">
            Which house in{" "}
            <span className="tabular-nums text-cinnamon">{yearLabel(YEARS[cursor])}</span>?
          </div>

          {prev && !showAll ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => set(cursor, prev)}
                className="inline-flex items-center gap-2 rounded-full bg-[#235C49] px-4 py-2 text-[14px] font-semibold text-white transition-[background-color,transform] duration-150 hover:bg-[#1E5040] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf/50"
              >
                <span
                  className="h-3.5 w-3.5 rounded-full ring-2 ring-white/50"
                  style={{ background: houseTint(prev) }}
                  aria-hidden
                />
                {prev} again
              </button>
              <button
                type="button"
                onClick={() => {
                  setClicks((c) => c + 1);
                  setShowAll(true);
                }}
                className="rounded-full border border-border bg-card px-4 py-2 text-[13.5px] font-semibold text-muted-foreground transition-[background-color,color,transform] duration-150 hover:bg-mist hover:text-foreground active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf/50"
              >
                I moved
              </button>
              <button
                type="button"
                onClick={() => set(cursor, UNSURE)}
                className="rounded-full border border-dashed border-border bg-card px-4 py-2 text-[13.5px] font-semibold text-muted-foreground transition-[background-color,color,transform] duration-150 hover:bg-mist hover:text-foreground active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf/50"
              >
                Cannot remember
              </button>
            </div>
          ) : (
            <div className="mt-3">
              <Palette onPick={(h) => set(cursor, h)} compact />
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3.5">
        <Summary value={value} />
        <Reset
          onClick={() => {
            setValue(empty());
            setClicks(0);
            setShowAll(false);
          }}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  C. THE QUIET ONE
 *  For the person filling in a form at 11pm who does not want a game.
 *  Type two letters, Enter. Every later year is pre-filled with the
 *  previous one, so Enter alone accepts it. No mouse at any point.
 * ------------------------------------------------------------------ */

export function DirectionQuiet() {
  const [value, setValue] = useState<(string | null)[]>(empty);
  const [i, setI] = useState(0);
  const [q, setQ] = useState("");
  const [keys, setKeys] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestion = useMemo(() => {
    if (!q.trim()) return i > 0 ? value[i - 1] : null;
    const needle = q.trim().toLowerCase();
    return (
      HOUSES.find((h) => h.toLowerCase().startsWith(needle)) ??
      HOUSES.find((h) => h.toLowerCase().includes(needle)) ??
      null
    );
  }, [q, i, value]);

  const done = i >= YEARS.length;

  function commit() {
    if (!suggestion || done) return;
    setValue((v) => v.map((old, n) => (n === i ? suggestion : old)));
    setI((n) => n + 1);
    setQ("");
  }

  return (
    <div className="space-y-4">
      <Counter clicks={keys} best="one house throughout is 2 letters plus 5 Enters, and no mouse." />
      <Ribbon value={value} />

      {done ? (
        <div className="flex items-center gap-2.5 rounded-xl bg-leaf/10 px-4 py-3">
          <Check className="h-4 w-4 shrink-0 text-leaf" />
          <span className="text-[14px] font-semibold text-leaf">Done, without touching the mouse.</span>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card p-4">
          <label
            htmlFor="quiet-house"
            className="text-[13px] font-semibold"
          >
            <span className="tabular-nums text-cinnamon">{yearLabel(YEARS[i])}</span>
            {i > 0 && value[i - 1] ? " · Enter to keep the same house" : " · start typing"}
          </label>
          <div className="mt-2.5 flex items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <input
                id="quiet-house"
                ref={inputRef}
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setKeys((k) => k + 1);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    setKeys((k) => k + 1);
                    commit();
                  }
                }}
                placeholder={
                  i > 0 && value[i - 1] ? `${value[i - 1]} (press Enter)` : "Type a house name"
                }
                className="h-11 w-full rounded-xl border border-border bg-background px-3.5 text-[14.5px] outline-none transition-colors focus-visible:border-leaf focus-visible:ring-2 focus-visible:ring-leaf/40"
              />
              {suggestion && (
                <span className="pointer-events-none absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1.5 text-[13px] font-semibold">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ background: houseTint(suggestion) }}
                    aria-hidden
                  />
                  <span style={{ color: houseTint(suggestion) }}>{suggestion}</span>
                  <CornerDownLeft className="h-3.5 w-3.5 text-muted-foreground" />
                </span>
              )}
            </div>
          </div>
          <p className="mt-2 text-[12.5px] text-muted-foreground">
            Two letters uniquely identifies all 22 houses, with no collisions anywhere on the list.
            One letter is not enough (g, n, r, m, t, k and a all clash), two always is. Enter commits
            and moves you on.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3.5">
        <Summary value={value} />
        <Reset
          onClick={() => {
            setValue(empty());
            setI(0);
            setQ("");
            setKeys(0);
            inputRef.current?.focus();
          }}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  What ships, reproduced, so the comparison is not from memory.
 * ------------------------------------------------------------------ */

export function ShippedEditor() {
  const [value, setValue] = useState<(string | null)[]>(empty);
  const [openYear, setOpenYear] = useState<number | null>(null);
  const [clicks, setClicks] = useState(0);

  function pick(h: string) {
    if (openYear === null) return;
    setClicks((c) => c + 1);
    const next = value.map((old, n) => (n === openYear ? h : old));
    setValue(next);
    // advanceHouseYear: jump to the next year that still needs a house
    const nextEmpty = next.findIndex((v) => v === null);
    setOpenYear(nextEmpty === -1 ? null : nextEmpty);
  }

  return (
    <div className="space-y-3">
      <Counter clicks={clicks} best="one house throughout is 6, each after the first an identical 22-pill scan." />
      {YEARS.map((y, i) => (
        <div key={y} className="flex items-center gap-3">
          <span className="w-[62px] shrink-0 text-[12.5px] font-semibold tabular-nums text-muted-foreground">
            {yearLabel(y)}
          </span>
          <button
            type="button"
            onClick={() => {
              setClicks((c) => c + 1);
              setOpenYear(openYear === i ? null : i);
            }}
            className="flex min-h-10 flex-1 items-center gap-1.5 rounded-xl border border-border bg-transparent px-3 py-1.5 text-left text-[13px] transition-colors hover:border-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf/50"
          >
            {value[i] ? (
              <span className="rounded-full bg-[#235C49]/10 px-2.5 py-1 text-[12.5px] font-semibold text-[#235C49]">
                {value[i]}
              </span>
            ) : (
              <span className="text-muted-foreground">Pick a house</span>
            )}
          </button>
        </div>
      ))}

      {openYear !== null && (
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="mb-2 text-[13px] font-semibold">
            Which house in{" "}
            <span className="tabular-nums text-[#235C49]">{yearLabel(YEARS[openYear])}</span>?
          </p>
          {/* the shipped grid: flat, 2 columns, owner order, no colour, no grouping */}
          <div className="grid grid-cols-2 gap-1.5">
            {HOUSES.map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => pick(h)}
                className="flex min-h-10 items-center justify-center rounded-full border border-border bg-mist/50 px-2.5 py-2 text-center text-[13px] font-semibold leading-tight transition-colors duration-150 hover:border-[#235C49]/40 hover:bg-[#235C49]/10 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf/50"
              >
                {h}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3.5">
        <Summary value={value} />
        <Reset
          onClick={() => {
            setValue(empty());
            setOpenYear(null);
            setClicks(0);
          }}
        />
      </div>
    </div>
  );
}
