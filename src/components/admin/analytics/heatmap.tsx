import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ *
 *  When this place is awake.
 *
 *  168 cells, one per hour of the week, in IST because almost everyone
 *  is in India and a UTC grid would put the evening rush at 2pm.
 *
 *  Worth having beyond the pleasure of looking at it: it is the answer
 *  to "when should a Catch-up email go out". Sending at the peak of this
 *  grid rather than at whatever hour the cron happened to be set to is a
 *  free improvement to how many people ever see it.
 * ------------------------------------------------------------------ */

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function Heatmap({
  grid,
  peak,
}: {
  grid: number[][];
  peak: { dow: number; hour: number; n: number };
}) {
  const max = Math.max(1, ...grid.flat());

  if (peak.n === 0) {
    return (
      <p className="px-0.5 py-1 text-[12.5px] text-muted-foreground">
        No visits recorded yet. This fills in as people use the site.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-col gap-[3px]">
        {grid.map((row, dow) => (
          <div key={dow} className="flex items-center gap-1.5">
            <span className="w-7 shrink-0 text-[10.5px] tabular-nums text-muted-foreground">
              {DAYS[dow]}
            </span>
            <div className="flex min-w-0 flex-1 gap-[2px]">
              {row.map((n, hour) => (
                <div
                  key={hour}
                  /* Title, not a tooltip component: 168 cells with individual
                     listeners would be absurd, and the browser's own is
                     instant and free. */
                  title={`${DAYS[dow]} ${String(hour).padStart(2, "0")}:00 — ${n} ${
                    n === 1 ? "visit" : "visits"
                  }`}
                  className={cn(
                    "h-3.5 min-w-0 flex-1 rounded-[2px]",
                    n === 0 ? "bg-secondary" : "bg-leaf",
                  )}
                  /* Opacity carries the intensity rather than a colour ramp:
                     one hue keeps it inside the palette, and a lightness ramp
                     across five greens would read as five categories. */
                  style={n > 0 ? { opacity: 0.18 + (n / max) * 0.82 } : undefined}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pl-[34px] text-[10.5px] tabular-nums text-muted-foreground">
        <span>12am</span>
        <span>6am</span>
        <span>noon</span>
        <span>6pm</span>
        <span>11pm</span>
      </div>

      <p className="text-[11.5px] leading-snug text-muted-foreground">
        Busiest: <span className="text-foreground">{DAYS[peak.dow]}</span> around{" "}
        <span className="text-foreground">
          {peak.hour === 0
            ? "midnight"
            : peak.hour < 12
              ? `${peak.hour}am`
              : peak.hour === 12
                ? "noon"
                : `${peak.hour - 12}pm`}
        </span>{" "}
        IST. Worth matching the Catch-up email to it.
      </p>
    </div>
  );
}
