/* ------------------------------------------------------------------ *
 *  one-hoopoe-guard.ts — the same free, dependency-free signal
 *  sidebar-hoopoe.tsx already uses for the sacred one-hoopoe rule: every
 *  <Hoopoe> render carries the `hoopoe-mascot` class baked into the rig
 *  itself, so checking for it in the DOM is enough to know whether
 *  another bird (the sidebar resident, an empty-state companion, the
 *  cross-page flight layer, an auth-page hoopoe) is already on screen —
 *  no shared bus module needed for this.
 * ------------------------------------------------------------------ */

export function anotherHoopoeOnScreen(): boolean {
  if (typeof document === "undefined") return false;
  return document.querySelectorAll(".hoopoe-mascot").length > 0;
}
