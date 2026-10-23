import { cn } from "@/lib/utils";
import type { GateReport } from "@/lib/trivia-report";
import { Grow } from "./grow";
import { count, pct, seconds, Sheet } from "./parts";

/* ------------------------------------------------------------------ *
 *  The door: how far people get, in four steps.
 *
 *  Not a funnel graphic. Four figures, each with the share of the step
 *  before it, and under each a bar measured against everyone who came, so
 *  the narrowing is visible without a trapezoid pretending to be data.
 *  Then what those numbers MEAN, said in sentences: the reason the owner
 *  opens the room is to be told, not to work it out.
 * ------------------------------------------------------------------ */

const STEPS = [
  { key: "arrived", label: "Came to the question", of: "" },
  { key: "tried", label: "Had a go", of: "of those who came" },
  { key: "through", label: "Got through", of: "of those who tried" },
  { key: "joined", label: "Made an account", of: "of those through" },
] as const;

function findings(r: GateReport): { text: string; tone?: "warn" }[] {
  const d = r.door;
  const out: { text: string; tone?: "warn" }[] = [];
  if (d.through > 0) {
    out.push({
      text:
        d.firstGo === d.through
          ? `Everyone who got through did it on their very first answer.`
          : `${count(d.firstGo)} of the ${count(d.through)} who got through did it on their very first answer.`,
    });
  }
  const t = seconds(d.medianSecondsToThrough);
  if (t) out.push({ text: `Half of them were through in under ${t}.` });
  if (r.stuck.length > 0) {
    out.push({
      text: `${count(r.stuck.length)} tried and never got in. They are listed below.`,
      tone: "warn",
    });
  }
  const phone = r.byDevice.find((x) => x.device === "phone");
  const desk = r.byDevice.find((x) => x.device === "desktop");
  if (phone && desk && phone.arrived >= 5 && desk.arrived >= 5) {
    out.push({
      text: `On phones ${pct(phone.through, phone.arrived)} got through. On computers, ${pct(desk.through, desk.arrived)}.`,
    });
  }
  if (r.matching.typo > 0) {
    out.push({
      text: `The one-letter allowance let in ${count(r.matching.typo)} ${r.matching.typo === 1 ? "answer" : "answers"} that a spelling test would have refused.`,
    });
  }
  if (r.matching.added > 0) {
    out.push({
      text: `${count(r.matching.added)} got in on answers you accepted here.`,
    });
  }
  return out;
}

export function Door({ report }: { report: GateReport }) {
  const d = report.door;
  const values = { arrived: d.arrived, tried: d.tried, through: d.through, joined: d.joined };
  const said = findings(report);

  return (
    <Sheet className="overflow-hidden">
      <ol className="grid grid-cols-2 sm:grid-cols-4">
        {STEPS.map((s, i) => {
          const v = values[s.key];
          const prev = i === 0 ? null : values[STEPS[i - 1].key];
          return (
            <li
              key={s.key}
              className={cn(
                "flex min-w-0 flex-col gap-1 px-4 pb-4 pt-3.5",
                /* Hairlines between steps, as a grouped list draws them: inside
                   the one container, never around each step. */
                i % 2 === 1 && "border-l border-border",
                i >= 2 && "border-t border-border sm:border-t-0",
                i === 2 && "sm:border-l",
              )}
            >
              <span className="text-[30px] font-semibold leading-none tracking-[-0.02em] text-foreground">
                {count(v)}
              </span>
              <span className="text-[13px] font-medium text-foreground">{s.label}</span>
              <span className="h-[18px] text-[12px] tabular-nums text-muted-foreground">
                {prev !== null && prev > 0 ? `${pct(v, prev)} ${s.of}` : ""}
              </span>
              <span className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted" aria-hidden>
                <Grow index={i} className="h-full">
                  <span
                    className="block h-full rounded-full bg-leaf"
                    style={{ width: d.arrived ? `${Math.max((v / d.arrived) * 100, v ? 2 : 0)}%` : "0%" }}
                  />
                </Grow>
              </span>
            </li>
          );
        })}
      </ol>
      {said.length > 0 && (
        <ul className="flex flex-col gap-1.5 border-t border-border bg-muted/40 px-4 py-3">
          {said.map((f) => (
            <li key={f.text} className="flex items-baseline gap-2 text-[13px] leading-snug text-foreground">
              <span
                className={cn(
                  "size-1.5 shrink-0 -translate-y-px rounded-full",
                  f.tone === "warn" ? "bg-cinnamon" : "bg-leaf",
                )}
                aria-hidden
              />
              {f.text}
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}
