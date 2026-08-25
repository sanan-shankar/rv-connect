/* ------------------------------------------------------------------ *
 *  Rare idle behaviours — mascot-moments board, card 14: "wherever the
 *  resident bird happens to be sitting", once in a great while it does a
 *  small bit of idle life instead of nothing — preens, catches a bug
 *  with a peck, or a two-step happy hop — before settling back down.
 *  Deliberately rare ("one idle in a hundred" per the board): delight,
 *  not distraction, and per the owner's guidance every outcome here is
 *  a joyful one, never a droop.
 *
 *  The only long-running resident in the app today is the sidebar's
 *  idle-rest bird (sidebar-hoopoe.tsx), so this hooks into the one
 *  natural pause in its lifecycle: the moment it has just glided in and
 *  is about to settle down for the night. Most of the time (99%) it
 *  goes straight to sleep exactly as before; the rare hit does one of
 *  these first. A light monsoon-season bias favours preening, as if
 *  drying off after the rain — the same season already referenced
 *  elsewhere in the app's content (e.g. the feed's "on this day"
 *  copy). No fixed "Founders Day" exists anywhere in the docs yet; this
 *  is where an owner-supplied date would slot in later.
 * ------------------------------------------------------------------ */

import type { HoopoeApi } from "../hoopoe-kit";

const RARE_IDLE_CHANCE = 0.01;

function inMonsoonWindow(now: Date = new Date()): boolean {
  const month = now.getMonth(); // 0-indexed
  return month >= 5 && month <= 8; // June - September
}

/** Rolls the dice and, on a hit, plays exactly one small idle behaviour to
 *  completion. Resolves `true` if something played (the caller should
 *  re-check whatever guard sent it here, since this held the stage for a
 *  beat), `false` immediately if the roll missed. */
export async function maybePlayRareIdleBehaviour(api: HoopoeApi): Promise<boolean> {
  if (Math.random() >= RARE_IDLE_CHANCE) return false;

  const roll = Math.random();
  if (inMonsoonWindow() && roll < 0.55) {
    await api.preen();
  } else if (roll < 0.4) {
    await api.preen();
  } else if (roll < 0.75) {
    await api.peck();
  } else {
    // "a happy hop": hop() alongside express("happy") — mascot.md notes this
    // composes from verbs that already exist rather than needing a new one.
    await Promise.all([api.hop(2), api.express("happy", { hold: 500 })]);
    await api.express("content");
  }
  return true;
}
