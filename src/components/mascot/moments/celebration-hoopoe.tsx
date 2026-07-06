"use client";

/* ------------------------------------------------------------------ *
 *  CelebrationHoopoe — plays exactly one of the app's "earned" one-shot
 *  moments from the mascot-moments board, then calls back and unmounts.
 *  `celebration-detector.tsx` is the only caller: it decides WHICH
 *  celebration is due, waits for a clear one-hoopoe stage before ever
 *  rendering this, and owns the queue if more than one becomes due in
 *  the same visit — this component only knows how to play one, starting
 *  the instant its rig reports ready.
 *
 *  (The one-hoopoe check itself lives in the parent, not here: by the
 *  time this component's `onReady` could fire, its own bird would
 *  already be in the DOM, so a self-check at that point would always
 *  see itself and never proceed.)
 *
 *  Owner's emotional guidance: bias joyful. Every branch below ends on
 *  `express("content")`, never lingers on a downbeat pose.
 * ------------------------------------------------------------------ */

import { useRef } from "react";
import { Hoopoe } from "@/components/mascot/hoopoe";
import type { HoopoeApi } from "@/components/mascot/hoopoe-kit";

export type CelebrationKind = "postSignupWelcome" | "firstLetter" | "proudMoment";

const RIG_SIZE = 64;

async function playCelebration(api: HoopoeApi, kind: CelebrationKind): Promise<void> {
  switch (kind) {
    case "postSignupWelcome":
      // A warm arrival: swoops onto its own resting spot, a happy hello, gone.
      await api.flyIn("top");
      await api.express("happy", { hold: 350 });
      await api.wave(2);
      await api.celebrate(1);
      await api.express("content");
      return;
    case "firstLetter":
      // The board's own definition of this moment: react("success") is
      // already a celebrate(2) with the particle burst and a fanned crest.
      await api.react("success");
      return;
    case "proudMoment":
      // The board's "proud moment": brief and warm, then back to quiet.
      await api.express("proud");
      await api.wave(1);
      await api.crest(true);
      await api.nod(1);
      await api.express("content");
      return;
  }
}

export function CelebrationHoopoe({
  kind,
  onDone,
}: {
  kind: CelebrationKind;
  onDone: () => void;
}) {
  // A ref so onReady (which only ever fires once, per hoopoe.tsx's
  // once-per-mount guard) always calls the latest onDone.
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  function handleReady(api: HoopoeApi) {
    void playCelebration(api, kind).then(() => onDoneRef.current());
  }

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed bottom-3 right-3 z-30 sm:bottom-5 sm:right-5"
    >
      <Hoopoe size={RIG_SIZE} onReady={handleReady} />
    </div>
  );
}
