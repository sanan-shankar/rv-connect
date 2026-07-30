import { cookies } from "next/headers";

/**
 * Theme plumbing (dark-mode groundwork, 2026-07-30).
 *
 * The source of truth for a signed-in member is `User.theme` in the database;
 * this cookie is its per-device mirror so the SERVER can know the theme at
 * render time. next-themes persists only to localStorage, which the server
 * can never read, so without the cookie every SSR pass would paint light and
 * a dark-theme user would see a flash on each navigation.
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
