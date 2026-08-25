import { cookies } from "next/headers";

/**
 * Theme plumbing (dark-mode groundwork, 2026-07-30).
 *
 * THE THEME IS PER DEVICE, and this cookie is what decides it. next-themes
 * persists only to localStorage, which the server can never read, so without
 * a cookie every SSR pass would paint light and a dark-theme member would see
 * a flash on each navigation.
 *
 * `User.theme` is written alongside it and is NOT a source of truth that
 * restores: nothing in the sign-in path copies it back into a cookie, so a
 * new device or a cleared cookie starts light and the member walks the
 * gauntlet again (audit C-138 -- this paragraph used to claim the opposite).
 * That is the shipped design rather than an omission: /dark-mode gates on the
 * COOKIE for exactly this reason (see the comment there, and the live case it
 * records), and dark mode here is something you EARN by beating the day's
 * Wordle. Restoring it silently on a new device would quietly delete the one
 * feature the gauntlet is. What `User.theme` is actually for: the admin
 * room's count of how many members chose dark, and the profile editor's
 * draft. **Owner: if the theme should follow a member across devices, the
 * change is to set this cookie from `User.theme` at sign-in -- and the
 * gauntlet stops being a gauntlet on the second device.**
 */
export const THEME_COOKIE = "rv-theme";

export type Theme = "light" | "dark";

/**
 * The theme recorded on this device, or null when the visitor has never set
 * one (callers treat null as light, the app default). Anything else in the
 * cookie (tampered, stale experiment values) is also null rather than a
 * garbage class on <html>.
 */
export async function getThemeCookie(): Promise<Theme | null> {
  const value = (await cookies()).get(THEME_COOKIE)?.value;
  return value === "light" || value === "dark" ? value : null;
}
