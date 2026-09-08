/* ------------------------------------------------------------------ *
 *  /lab/catchups/sketches - Catch-ups as one thing you can walk through.
 *
 *  The list, a Catch-up's home in every state, and the reader, joined up,
 *  drawn by one hand from the settled architecture
 *  (docs/planning/catchups-rework/architecture.md). What each decision is
 *  and whose sentence it answers to is in the docblock of the file that
 *  draws it.
 *
 *  TWO SOURCES, ONE LOADER. By default the room reads the live "in the
 *  loop" Round from the database, read-only, which the owner approved
 *  (handover, owner question 5). With `?data=pressure` it reads the
 *  invented corpus in `_fixtures/pressure.ts` instead: a forty-answer
 *  question, a twenty-four photograph wall, an answer over the 6,000
 *  character cap, a hundred people, links nobody has a resolver for. His
 *  instruction, brief para 51: "make sure it surves the most varying
 *  input. incredibly robust can be produced with only pressure testing."
 *  Both arrive as the same `SketchRound`, so nothing in the room can be
 *  true of one and false of the other.
 *
 *  Admin only, through the lab layout. Writes nothing.
 * ------------------------------------------------------------------ */

import { auth } from "@/lib/auth";
import { loadSketchRound } from "./_data";
import { loadPressureRound } from "./_pressure";
import { SketchHarness } from "./_harness";

export const dynamic = "force-dynamic";

export default async function SketchesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const pressure = params.data === "pressure";
  const session = await auth();
  const round = pressure
    ? await loadPressureRound()
    : session?.user?.id
      ? await loadSketchRound(session.user.id)
      : null;
  if (!round) {
    return (
      <div className="px-6 py-10 text-sm text-muted-foreground">
        No published Round on this database to draw. The sketches need one.
      </div>
    );
  }
  return <SketchHarness round={round} pressure={pressure} />;
}
