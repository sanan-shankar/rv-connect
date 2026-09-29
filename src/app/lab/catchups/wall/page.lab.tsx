/* ------------------------------------------------------------------ *
 *  /lab/catchups/wall - a wall of photographs, read three ways.
 *
 *  `photo-wall` has been a question kind since Catch-ups was built
 *  (`PROMPT_CATEGORIES` in `src/lib/catchups-types.ts`) and has never
 *  been drawn. It is his, brief 16, and it is a locked decision (D10).
 *  It is drawn now rather than inside build phase 8 because the reader is
 *  drawn in phase 8 and a wall changes a page already drawn.
 *
 *  Nothing here reads the database and nothing here writes. The corpus is
 *  invented and deterministic (`_corpus.ts`), because the four walls that
 *  decide this (one photograph, three, two hundred, and all portrait) are
 *  not in the pressure fixture, which carries only the twenty-four.
 *
 *  Admin only, through the lab layout.
 * ------------------------------------------------------------------ */

import { requireLabAdmin } from "@/app/lab/_gate";
import { WallRoom } from "./_room";

export default async function WallPage() {
  await requireLabAdmin();
  return <WallRoom />;
}
