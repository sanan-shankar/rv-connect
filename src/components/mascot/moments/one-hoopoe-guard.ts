"use client";

/* ------------------------------------------------------------------ *
 *  one-hoopoe-guard.ts — the same free, dependency-free signal
 *  sidebar-hoopoe.tsx already uses for the sacred one-hoopoe rule: every
 *  <Hoopoe> render carries the `hoopoe-mascot` class baked into the rig
 *  itself, so checking for it in the DOM is enough to know whether
 *  another bird (the sidebar resident, an empty-state companion, the
 *  cross-page flight layer, an auth-page hoopoe) is already on screen —
 *  no shared bus module needed for this.
 * ------------------------------------------------------------------ */

import { useEffect, useState } from "react";

export function anotherHoopoeOnScreen(): boolean {
  if (typeof document === "undefined") return false;
  return document.querySelectorAll(".hoopoe-mascot").length > 0;
}

/**
 * True once mounted if no other hoopoe is already on screen.
 *
 * Lives HERE, next to the guard it wraps, rather than in moment-hoopoe.tsx
 * where it used to sit. That file statically imports <Hoopoe>, so importing
 * this seven-line hook dragged the 32 KB puppet in behind it -- which is how
 * the root not-found boundary put a bird into the client graph of /privacy,
 * /terms and /guidelines, three pages that never draw one. The hook needs
 * only the DOM query above; nothing about it wanted the rig.
 */
export function useSoloHoopoe(): boolean {
  const [show, setShow] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Asks the DOM whether another hoopoe is already on screen. Only answerable after mount.
    setShow(!anotherHoopoeOnScreen());
  }, []);
  return show;
}
