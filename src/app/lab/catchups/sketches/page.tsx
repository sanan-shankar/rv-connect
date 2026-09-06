/* ------------------------------------------------------------------ *
 *  /lab/catchups/sketches - one real Round, drawn once per direction.
 *
 *  The cull step of the Catch-ups rework (docs/planning/catchups-rework/
 *  handover.md, "S3: Directions"; the directions themselves are in
 *  directions.md and directions/). The owner flicks between them on his
 *  phone and says which three or four get a room. Static, on purpose:
 *  the rooms are where a navigator has to move.
 *
 *  Admin only, through the lab layout. Reads the live Round; writes
 *  nothing.
 * ------------------------------------------------------------------ */

import { auth } from "@/lib/auth";
import { loadSketchRound } from "./_data";
import { SketchHarness } from "./_harness";

export const dynamic = "force-dynamic";

export default async function SketchesPage() {
  const session = await auth();
  const round = session?.user?.id ? await loadSketchRound(session.user.id) : null;
  if (!round) {
    return (
      <div className="px-6 py-10 text-sm text-muted-foreground">
        No published Round on this database to draw. The sketches need one.
      </div>
    );
  }
  return <SketchHarness round={round} />;
}
