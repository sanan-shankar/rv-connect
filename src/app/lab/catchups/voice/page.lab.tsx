/* ------------------------------------------------------------------ *
 *  /lab/catchups/voice - an answer you can hear.
 *
 *  Catch-ups rework, build phase 12 (spec 3.10). His answer 31 was (a):
 *  draw the recorder and the player in the lab, build everything that
 *  does not depend on the look, and stop for his pick. The plumbing is
 *  built (voice-answer-rule.ts, /api/upload/audio); this is the look.
 *
 *  Nothing here reads the database and nothing here writes. The
 *  recorder is real and keeps what it records in this tab.
 *
 *  Admin only, through the lab layout.
 * ------------------------------------------------------------------ */

import { requireLabAdmin } from "@/app/lab/_gate";
import { VoiceRoom } from "./_room";

export default async function VoicePage() {
  await requireLabAdmin();
  return <VoiceRoom />;
}
