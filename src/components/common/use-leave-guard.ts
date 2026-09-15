"use client";

import { useEffect } from "react";

/* ------------------------------------------------------------------ *
 *  ASK BEFORE THE TAB GOES, WHILE SOMETHING IS STILL CLIMBING.
 *
 *  An upload lives in this tab's memory and nowhere else until it lands.
 *  Close the tab, reload, or type another address and a hundred
 *  photographs are gone with no word said. The owner, 2026-09-15: "don't
 *  know if it's working or it's hung ... so I know not to close."
 *
 *  The browser draws this prompt itself and ignores any text it is given,
 *  so the room says the words ("Keep this tab open") and this only makes
 *  the tab ask. Armed only while `active`: a prompt on a tab with nothing
 *  to lose is a prompt people learn to click through.
 * ------------------------------------------------------------------ */
export function useLeaveGuard(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const ask = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Older Chromium and Safari still need the legacy return value set.
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", ask);
    return () => window.removeEventListener("beforeunload", ask);
  }, [active]);
}
