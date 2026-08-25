import Link from "next/link";
import { cn } from "@/lib/utils";
import type { MemberRow } from "@/lib/admin-analytics";

/* ------------------------------------------------------------------ *
 *  Compare: any measure, any way of grouping people.
 *
 *  Built on ONE per-member table, so every combination below is
 *  arithmetic rather than another query. That is what makes it worth
 *  having: it answers questions nobody has asked yet.
 * ------------------------------------------------------------------ */

type Measure = { key: string; label: string; note: string; pct?: boolean };

export const MEASURES = [
  { key: "completeness", label: "Profile filled in", pct: true, note: "Share of the nine profile fields completed" },
  { key: "likesGiven", label: "Hearts given", note: "Likes they gave to other people" },
  { key: "likesGot", label: "Hearts received", note: "Likes their own posts received" },
  { key: "comments", label: "Comments written", note: "Replies they left on posts" },
  { key: "posts", label: "Posts published", note: "Posts and letters they published" },
  { key: "catchupAnswers", label: "Catch-up answers", note: "Answers written to catch-up questions" },
  { key: "bookmarks", label: "Things bookmarked", note: "Posts they saved to read later" },
  { key: "photoHearts", label: "Photo hearts given", note: "Likes on Collection photos" },
  { key: "visits", label: "Visits", note: "Separate sittings on the site" },
  { key: "minutes", label: "Minutes on site", note: "Total time across all visits" },
  { key: "pageViews", label: "Pages viewed", note: "Pages loaded across all visits" },
  { key: "daysActive", label: "Days visited", note: "Separate days they came" },
  { key: "profileOpensGot", label: "Profile opened by others", note: "Times someone opened their profile" },
  { key: "profileOpensGave", label: "Profiles they opened", note: "Other people's profiles they looked at" },
  { key: "searches", label: "Searches made", note: "Times they used a search box" },
] as const satisfies readonly Measure[];

export type MeasureKey = (typeof MEASURES)[number]["key"];

export const GROUPINGS = [
  { key: "decade", label: "Decade they left", note: "1970s, 1990s, 2020s" },
  { key: "accountType", label: "Alumnus or teacher" },
  { key: "device", label: "Phone, tablet or computer" },
  { key: "country", label: "Country they live in" },
  { key: "verifyState", label: "Identity checked" },
  { key: "hasPhoto", label: "Has a profile photo" },
  { key: "joinedMonth", label: "Month they joined" },
] as const;

export type GroupKey = (typeof GROUPINGS)[number]["key"];

export function isMeasure(v?: string): v is MeasureKey {
  return !!v && MEASURES.some((m) => m.key === v);
}
export function isGroup(v?: string): v is GroupKey {
  return !!v && GROUPINGS.some((g) => g.key === v);
}

function groupValue(row: MemberRow, key: GroupKey): string {
  if (key === "hasPhoto") return row.hasPhoto ? "Has a photo" : "No photo";
  return String(row[key] ?? "unknown");
}

/** Chip row for picking a measure or a grouping. Real links, so every
 *  combination is a URL the owner can keep. */
export function PickerRow({
  options,
  active,
  param,
  other,
}: {
  options: readonly { key: string; label: string }[];
  active: string;
  param: "measure" | "by";
  other: string;
}) {
  return (
    <div className="-mx-1 flex flex-wrap gap-1 px-1">
      {options.map((o) => {
        const href =
          param === "measure"
            ? `/admin/analytics?view=compare&measure=${o.key}&by=${other}`
            : `/admin/analytics?view=compare&measure=${other}&by=${o.key}`;
        const on = o.key === active;
        return (
          <Link
            key={o.key}
            href={href}
            className={cn(
              "rounded-full px-2.5 py-1 text-[12px] transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              on
                ? "bg-canopy text-white"
                : "bg-secondary text-muted-foreground hover:bg-card hover:text-foreground",
            )}
          >
            {o.label}
          </Link>
        );
      })}
    </div>
  );
}

/** Groups x one measure: members, average, total, and the best in each group. */
export function GroupTable({
  rows,
  measure,
  by,
}: {
  rows: MemberRow[];
  measure: MeasureKey;
  by: GroupKey;
}) {
  const spec: Measure = MEASURES.find((m) => m.key === measure)!;

  const groups = new Map<string, MemberRow[]>();
  for (const r of rows) {
    const k = groupValue(r, by);
    groups.set(k, [...(groups.get(k) ?? []), r]);
  }

  const summary = [...groups.entries()]
    .map(([label, members]) => {
      const values = members.map((m) => Number(m[measure]));
      const total = values.reduce((a, b) => a + b, 0);
      const best = members.reduce((a, b) => (Number(b[measure]) > Number(a[measure]) ? b : a));
      return {
        label,
        count: members.length,
        avg: total / members.length,
        total,
        /* The share who have done this at ALL. An average of 0.4 hides the
           difference between everyone doing it a little and one person doing
           it a lot, and that difference is usually the finding. */
        anyRate: values.filter((v) => v > 0).length / members.length,
        best: Number(best[measure]) > 0 ? best.name : null,
        bestValue: Number(best[measure]),
      };
    })
    .sort((a, b) => b.avg - a.avg);

  const maxAvg = Math.max(...summary.map((s) => s.avg), 0.0001);
  const fmt = (v: number) => (spec.pct ? `${Math.round(v * 100)}%` : v.toFixed(v < 10 ? 1 : 0));

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2 px-2 pb-1 text-[10.5px] uppercase tracking-[0.05em] text-muted-foreground">
        <span className="min-w-0 flex-1">Group</span>
        <span className="w-14 text-right">Members</span>
        <span className="w-20 text-right">Average</span>
        <span className="w-16 text-right">Any at all</span>
        <span className="hidden w-40 text-right sm:block">Highest</span>
      </div>
      {summary.map((s) => (
        <div key={s.label} className="relative flex items-center gap-2 rounded-[var(--radius-sm)]">
          <div
            className="absolute inset-y-0 left-0 rounded-[var(--radius-sm)] bg-leaf/[0.13]"
            style={{ width: `${Math.max((s.avg / maxAvg) * 100, 2)}%` }}
            aria-hidden
          />
          <span className="relative z-10 min-w-0 flex-1 truncate py-1.5 pl-2 text-[12.5px] text-foreground">
            {s.label}
          </span>
          <span className="relative z-10 w-14 text-right text-[12.5px] tabular-nums text-muted-foreground">
            {s.count}
          </span>
          <span className="relative z-10 w-20 text-right text-[12.5px] font-medium tabular-nums text-foreground">
            {fmt(s.avg)}
          </span>
          <span className="relative z-10 w-16 text-right text-[12.5px] tabular-nums text-muted-foreground">
            {Math.round(s.anyRate * 100)}%
          </span>
          <span className="relative z-10 hidden w-40 truncate pr-2 text-right text-[12px] text-muted-foreground sm:block">
            {s.best ? `${s.best} (${fmt(s.bestValue)})` : "nobody"}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- *
 *  Correlations
 * ---------------------------------------------------------------- */

/** Pearson r. Returns null when a column is flat, because a correlation with
 *  something that never varies is undefined rather than zero. */
function correlate(a: number[], b: number[]): number | null {
  const n = a.length;
  if (n < 3) return null;
  const ma = a.reduce((x, y) => x + y, 0) / n;
  const mb = b.reduce((x, y) => x + y, 0) / n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) {
    const x = a[i] - ma, y = b[i] - mb;
    num += x * y; da += x * x; db += y * y;
  }
  if (da === 0 || db === 0) return null;
  return num / Math.sqrt(da * db);
}

export function CorrelationGrid({ rows }: { rows: MemberRow[] }) {
  /* A subset, not all fifteen. A 15x15 grid is 225 cells of which half are a
     mirror image and fifteen are 1.0 by definition -- unreadable, and mostly
     not telling you anything. These eight are the ones where a relationship
     would actually mean something. */
  const keys: MeasureKey[] = [
    "completeness", "likesGiven", "likesGot", "comments",
    "posts", "visits", "minutes", "profileOpensGot",
  ];
  const cols = keys.map((k) => ({
    key: k,
    label: MEASURES.find((m) => m.key === k)!.label,
    values: rows.map((r) => Number(r[k])),
  }));

  if (rows.length < 3) {
    return (
      <p className="px-0.5 py-1 text-[12.5px] text-muted-foreground">
        Needs at least three members before a correlation means anything.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-[2px] text-[11px]">
          <thead>
            <tr>
              <th className="w-32" />
              {cols.map((c) => (
                <th
                  key={c.key}
                  className="h-16 w-9 align-bottom text-left font-normal text-muted-foreground"
                >
                  {/* Rotated so eight labels fit without a horizontal scroll
                      that would hide the grid the labels describe. */}
                  <span className="block origin-bottom-left translate-y-1 -rotate-45 whitespace-nowrap">
                    {c.label}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cols.map((rowc) => (
              <tr key={rowc.key}>
                <td className="truncate pr-2 text-right text-muted-foreground">{rowc.label}</td>
                {cols.map((colc) => {
                  const r = rowc.key === colc.key ? 1 : correlate(rowc.values, colc.values);
                  return (
                    <td
                      key={colc.key}
                      title={
                        r === null
                          ? "Not enough variation to say"
                          : `${rowc.label} vs ${colc.label}: r = ${r.toFixed(2)}`
                      }
                      className={cn(
                        "h-8 w-9 rounded-[3px] text-center tabular-nums",
                        r === null && "bg-secondary text-muted-foreground",
                        r !== null && r >= 0 && "bg-leaf text-foreground",
                        r !== null && r < 0 && "bg-cinnamon text-foreground",
                      )}
                      style={
                        r === null ? undefined : { opacity: 0.16 + Math.abs(r) * 0.84 }
                      }
                    >
                      {r === null ? "" : r.toFixed(1)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11.5px] leading-relaxed text-muted-foreground">
        Green means the two rise together, orange means one rises as the other falls, and darker
        means a stronger link. 1.0 is a perfect match, 0 is no relationship at all. This shows
        that two things move together, never that one causes the other.
      </p>
    </div>
  );
}
