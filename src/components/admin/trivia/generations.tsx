import type { GateReport } from "@/lib/trivia-report";

/* ------------------------------------------------------------------ *
 *  Who knows what: each question against each generation.
 *
 *  A cell is the share of that generation's showings of that question
 *  that ended in a right answer. One hue, deeper for a higher share, the
 *  sequential rule; the number is printed in every cell so the colour is
 *  never the only way to read it. A share of two people is not a share,
 *  so below three the cell prints the plain fraction instead.
 *
 *  Only members fill it: a stranger has no batch. That is why it starts
 *  empty and grows as the Centenary's arrivals join.
 * ------------------------------------------------------------------ */

const SHARE_FROM = 3;

function Cell({ answered, right }: { answered: number; right: number }) {
  if (answered === 0) {
    return <span className="text-muted-foreground/60" aria-label="nobody yet">·</span>;
  }
  const share = right / answered;
  const enough = answered >= SHARE_FROM;
  return (
    <span
      title={`${right} of ${answered} got it right`}
      className="flex h-full w-full items-center justify-center rounded-[var(--radius-sm)] tabular-nums text-foreground"
      /* Leaf mixed into nothing, so the cell sits on whatever the card is in
         either theme. Capped at 55% so ink on the deepest cell still reads. */
      style={{
        background: enough
          ? `color-mix(in oklab, var(--leaf) ${Math.round(8 + share * 47)}%, transparent)`
          : undefined,
      }}
    >
      {enough ? (
        <>
          {Math.round(share * 100)}
          {/* The header says it is a share; a phone has no room to repeat it
              in every cell, and eight cells across is the whole width. */}
          <span className="max-sm:hidden">%</span>
        </>
      ) : (
        `${right}/${answered}`
      )}
    </span>
  );
}

export function Generations({ data }: { data: GateReport["generations"] }) {
  return (
    /* Sized to fit eight generations across a 390px phone without scrolling
       sideways (admin spec: no horizontal scroll at 390): "1980s" becomes
       "80s" and a share drops its % below sm. Past eight it may still
       scroll, inside its own card, never the page. */
    <div className="overflow-x-auto px-2.5 pb-3 pt-3 sm:px-3.5">
      <table className="w-full table-fixed border-separate border-spacing-[3px] text-[12px]">
        <thead>
          <tr>
            <th className="w-[92px] text-left font-normal text-muted-foreground sm:w-[34%]" />
            {data.cohorts.map((c) => (
              <th key={c} scope="col" className="pb-1 text-center font-medium text-muted-foreground">
                <span className="sm:hidden">{c === "Teachers" ? "Tchr" : c.slice(2)}</span>
                <span className="max-sm:hidden">{c}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((r) => (
            <tr key={r.questionId}>
              <th scope="row" className="truncate pr-1 text-left text-[12px] font-normal text-foreground sm:pr-2 sm:text-[12.5px]" title={r.label}>
                {r.label}
              </th>
              {r.cells.map((c) => (
                <td key={c.cohort} className="h-8 p-0 text-center">
                  <Cell answered={c.answered} right={c.right} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
