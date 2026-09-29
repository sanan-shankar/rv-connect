"use client";

/* ------------------------------------------------------------------ *
 *  "Tap" on a phone, "click" with a mouse.
 *
 *  The guide tells people what to press, and the right verb depends on
 *  what they are holding. The owner, on the one instruction where it
 *  matters most: "it's double tap on mobile, but it's also single tap on
 *  desktop, which is a bit clunky to say" (2026-09-27). Saying the one
 *  that applies, rather than both, is how it stops being clunky.
 *
 *  Read from `(pointer: coarse)`, the PRIMARY pointer: a laptop with a
 *  touchscreen reports fine, which is right, because its owner is almost
 *  always on the trackpad. The door itself reads the event instead
 *  (guide-door.tsx), since it has one to read; a sentence does not.
 *
 *  The server says "tap": the guide sheet renders only on the client, so
 *  this only ever reaches the server through a standalone /guide page,
 *  and a phone is the likelier reader there (about 60% of members).
 * ------------------------------------------------------------------ */

import { useSyncExternalStore } from "react";

const QUERY = "(pointer: coarse)";

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

export function useTouch(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => true
  );
}

/** "tap" or "click"; `cap` for the start of a sentence. */
export function Tap({ cap = false }: { cap?: boolean }) {
  const word = useTouch() ? "tap" : "click";
  return <>{cap ? word[0].toUpperCase() + word.slice(1) : word}</>;
}

/** How to get a page's guide back, as a whole sentence ending "to {purpose}.":
 *  two taps on a phone, one click with a mouse. It names a real title
 *  because "the title" alone did not land. The owner, 2026-09-29, on "To
 *  come back to it later, click the title at the top of any page": "what's
 *  it, what's title. my 24 year old sister was confused." */
export function DoorHint({ purpose }: { purpose: string }) {
  const how = useTouch() ? "Tap twice on" : "Click";
  return (
    <>
      {how} the title at the top of any page, like&nbsp;Feed, to {purpose}.
    </>
  );
}
