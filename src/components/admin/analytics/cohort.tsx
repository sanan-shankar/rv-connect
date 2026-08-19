import { cn } from "@/lib/utils";
import type { JourneyRow } from "@/lib/admin-analytics";

/* ------------------------------------------------------------------ *
 *  The cohort matrix.
 *
 *  Generations down the side, the steps of joining across the top, each
 *  cell the share of that generation still with us by that step. The
 *  shape analytics products use for exactly this question, and the right
 *  one here: you read ACROSS a row and see where a generation falls off,
 *  and DOWN a column to see whether a step is hard for everyone or only
 *  for some.
 *
 *  That comparison is the whole point. "60% added a photo" says nothing;
 *  "95% of the 2020s and 10% of the 1970s added a photo" is a finding
 *  about who the site is failing.
 * ------------------------------------------------------------------ */

export function CohortMatrix({ rows }: { rows: JourneyRow[] }) {
  const real = rows.filter((r) => r.joined > 0);
  if (real.length === 0) {
    return <p className="px-0.5 py-1 text-[12.5px] text-muted-foreground">No members yet.</p>;
  }

  const steps = real[0].steps.map((s) => s.label);

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-separate border-spacing-[3px] text-[11.5px]">
          <thead>
            <tr>
              <th className="w-24 text-left font-normal text-muted-foreground">Left in</th>
              <th className="w-14 text-right font-normal text-muted-foreground">Members</th>
              {steps.map((s) => (
                <th key={s} className="px-1 text-center font-normal text-muted-foreground">
                  {s}
                </th>
              ))}
              <th className="w-24 text-right font-normal text-muted-foreground">
                Time to confirm
              </th>
            </tr>
          </thead>
          <tbody>
            {real.map((r) => (
              <tr key={r.decade}>
                <td className="text-[12.5px] text-foreground">{r.decade}</td>
                <td className="text-right tabular-nums text-muted-foreground">{r.joined}</td>
                {r.steps.map((s) => {
                  const share = r.joined > 0 ? s.n / r.joined : 0;
                  return (
                    <td
                      key={s.label}
                      title={`${r.decade}: ${s.n} of ${r.joined} ${s.label.toLowerCase()}`}
                      className={cn(
                        "h-9 rounded-[3px] text-center tabular-nums",
                        share === 0 ? "bg-secondary text-muted-foreground" : "bg-leaf text-foreground",
                      )}
                      /* Opacity, one hue. A five-colour ramp would read as
                         five categories rather than as more and less. */
                      style={share > 0 ? { opacity: 0.15 + share * 0.85 } : undefined}
                    >
                      {Math.round(share * 100)}%
                    </td>
                  );
                })}
                <td className="text-right tabular-nums text-muted-foreground">
                  {r.medianVerifyHours === null
                    ? "—"
                    : r.medianVerifyHours < 1
                      ? `${Math.round(r.medianVerifyHours * 60)} min`
                      : r.medianVerifyHours < 48
                        ? `${r.medianVerifyHours.toFixed(1)} hrs`
                        : `${Math.round(r.medianVerifyHours / 24)} days`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11.5px] leading-relaxed text-muted-foreground">
        Each cell is the share of that generation who got that far. Read across a row to see
        where a generation drops off; read down a column to see whether a step is hard for
        everyone or only for some. &quot;Time to confirm&quot; is the middle value for how long
        people took to tap the link in their confirmation email.
      </p>
    </div>
  );
}
