"use client";

/* ------------------------------------------------------------------ *
 *  /catchups with nothing on it.
 *
 *  It replaces <GroupFirstGuidance>, which was a bordered card holding a
 *  heading and two buttons. Two things were wrong with it and both are
 *  rules now: a bordered card means "this opens something" and that one
 *  opened nothing (architecture.md section 3), and one of its two
 *  buttons was a second "Start a Catch-up" a few inches under the
 *  header's own -- "I have 3 different calls to action, okay? It's
 *  overpowering" (brief 23).
 *
 *  So it is set on the page's own paper, there is no second call to
 *  action, and the header's pill is the way out of the state. The
 *  hoopoe stays, under the one-hoopoe rule like every other mascot
 *  moment: when another bird is already on screen this simply drops out
 *  of the column.
 *
 *  Reachable by fewer people than it used to be. Since build phase 4 the
 *  sidebar hides Catch-ups from anyone with none, so this is what a
 *  member sees who typed the address, followed an old link, or has just
 *  left the last Catch-up they were in.
 * ------------------------------------------------------------------ */

import { ResidentHoopoe } from "@/components/mascot/resident-hoopoe";
import { useSoloHoopoe } from "@/components/mascot/moments/one-hoopoe-guard";

export function NothingHere() {
  const solo = useSoloHoopoe();
  return (
    <div className="flex flex-col items-center gap-[var(--space-m)] py-[var(--space-l)] text-center">
      {solo && <ResidentHoopoe size={96} />}
      <p className="font-heading text-xl tracking-tight text-foreground">
        You are not in a Catch-up yet
      </p>
    </div>
  );
}
