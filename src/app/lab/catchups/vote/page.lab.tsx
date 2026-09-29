/* ------------------------------------------------------------------ *
 *  /lab/catchups/vote - who picked what.
 *
 *  Catch-ups rework, build phase 13 (spec 3.11). His answer 31 was (a):
 *  draw it in the lab, build everything that does not depend on the look,
 *  and stop for his pick. The plumbing is built (vote-question-rule.ts,
 *  CatchupPromptOption, CatchupEntry.pollOptionId); this is the look.
 *
 *  Nothing here reads the database and nothing here writes.
 *
 *  Admin only, through the lab layout.
 * ------------------------------------------------------------------ */

import { requireLabAdmin } from "@/app/lab/_gate";
import { VoteRoom } from "./_room";

export default async function VotePage() {
  await requireLabAdmin();
  return <VoteRoom />;
}
