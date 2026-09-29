/* ------------------------------------------------------------------ *
 *  /lab/catchups/settings - a Catch-up's settings, and everything it opens.
 *
 *  The gate on build phase 7 (spec 10.3), drawn in one session rather
 *  than five times inside five build phases -- which is how twelve
 *  horizontal rules and a pill inside a pill happened the first time.
 *
 *  The panel itself lives in `../_settings.tsx` and is the same component
 *  the sketches room's Settings door opens, so this room and the spine
 *  cannot drift apart. Nothing here is scaled.
 * ------------------------------------------------------------------ */

import { requireLabAdmin } from "@/app/lab/_gate";
import { auth } from "@/lib/auth";
import { loadSketchEdition } from "../sketches/_data";
import { buildShelf } from "../sketches/_shelf";
import { SettingsRoom } from "./_room";

export const dynamic = "force-dynamic";

export default async function SettingsRoomPage() {
  await requireLabAdmin();
  const session = await auth();
  const edition = session?.user?.id ? await loadSketchEdition(session.user.id) : null;
  if (!edition) {
    return (
      <div className="px-6 py-10 text-sm text-muted-foreground">
        No published Edition on this database to draw. The settings need a Catch-up.
      </div>
    );
  }
  return <SettingsRoom shelf={buildShelf(edition)} />;
}
