/* ------------------------------------------------------------------ *
 *  /lab/years/weave: everyone who was here, as thread.
 *
 *  Loads every member in directory standing (the directory's own rule:
 *  not blocked, not deleting) with the years they were at the school and
 *  the house they were in each year, and every teacher with their tenure.
 *  Names and years only; nothing a profile does not already show. Admin
 *  only through the lab layout; writes nothing.
 * ------------------------------------------------------------------ */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { HOUSES, normalizeHouse } from "@/lib/houses";
import { parseHouseYearEntries } from "@/lib/house-spans";
import { WeaveRoom } from "./_weave-room";
import type { Thread } from "./_weave";

export const dynamic = "force-dynamic";

/** The school opened in 1926; the cloth's left selvedge. */
const FIRST_YEAR = 1926;
const THIS_YEAR = new Date().getFullYear();

/** A house's stage from its place in the canonical list: the first nine are
 *  junior school, Meru to Malli the middle, Krishna onward senior. Anything
 *  else (a free-typed "Top Blocks", "Covid Year") is undyed. */
function stageOf(house: string): 1 | 2 | 3 | 5 {
  const i = (HOUSES as readonly string[]).indexOf(normalizeHouse(house));
  if (i < 0) return 5;
  if (i < 9) return 1;
  if (i < 14) return 2;
  return 3;
}

export default async function WeavePage() {
  const session = await auth();
  const rows = await prisma.user.findMany({
    where: { isBlocked: false, deletionRequestedAt: null },
    select: { id: true, name: true, batchYear: true, yearJoined: true, yearLeft: true, houses: true, accountType: true, taughtFrom: true, taughtUntil: true },
  });
  const threads: Thread[] = [];
  for (const r of rows) {
    const teacher = r.accountType !== "alumnus";
    const from = teacher ? r.taughtFrom : r.yearJoined;
    const to = teacher ? (r.taughtUntil ?? THIS_YEAR) : r.yearLeft;
    if (!from || !to || to < from || from < FIRST_YEAR) continue;
    /* an academic year is named by the calendar year it starts in, and the
       leaving year is the END of the last one, so 2014 to 2023 is the nine
       years 2014 through 2022 */
    const last = teacher ? to : to - 1;
    if (last < from) continue;
    const years: { year: number; stage: number; house: string | null }[] = [];
    const byYear = new Map<number, string>();
    for (const e of parseHouseYearEntries(r.houses)) if (!byYear.has(e.year)) byYear.set(e.year, e.house);
    for (let y = from; y <= last; y++) {
      const house = byYear.get(y) ?? null;
      years.push({ year: y, stage: teacher ? 4 : house ? stageOf(house) : 0, house });
    }
    threads.push({ id: r.id, name: r.name, batch: r.batchYear, teacher, from, to: last, years });
  }
  /* oldest first, then by batch, then by name, so the cloth reads down the
     years and two classmates sit together */
  threads.sort((a, b) => a.from - b.from || (a.batch ?? 0) - (b.batch ?? 0) || a.name.localeCompare(b.name));
  return <WeaveRoom threads={threads} firstYear={FIRST_YEAR} lastYear={THIS_YEAR} meId={session?.user?.id ?? null} />;
}
