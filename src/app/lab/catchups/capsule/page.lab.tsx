/* ------------------------------------------------------------------ *
 *  /lab/catchups/capsule - sealed for a year.
 *
 *  Catch-ups rework, build phase 14 (spec 3.12). His answer 31 was (a):
 *  draw it in the lab, build everything that does not depend on the look,
 *  and stop for his pick. The plumbing is built (the sealed status,
 *  capsuleOpensAt, setEditionTimeCapsule); this is the look.
 *
 *  Nothing here reads the database and nothing here writes.
 *
 *  Admin only, through the lab layout.
 * ------------------------------------------------------------------ */

import { requireLabAdmin } from "@/app/lab/_gate";
import { CapsuleRoom } from "./_room";

export default async function CapsulePage() {
  await requireLabAdmin();
  return <CapsuleRoom />;
}
