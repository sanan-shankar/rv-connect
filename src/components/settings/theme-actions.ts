"use server";

import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { THEME_COOKIE, type Theme } from "@/lib/theme";

/**
 * Records a member's theme choice (dark-mode groundwork, 2026-07-30).
 *
 * Writes both homes of the preference in one call: `User.theme` (the durable,
 * cross-device truth) and the rv-theme cookie (this device's SSR mirror, read
 * by the root layout). Deliberately revalidates nothing: theme is cosmetic,
 * no server-rendered data depends on it, and the client flips the class
 * instantly via next-themes' own setTheme.
 */
export async function setTheme(theme: Theme) {
  // Server actions are network-callable endpoints, so the union type alone is
  // no guard; reject anything that is not exactly one of the two values
  // before it can reach the database or the cookie.
  if (theme !== "light" && theme !== "dark") {
    return { error: "Unknown theme" };
  }

  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  await prisma.user.update({
    where: { id: session.user.id },
    data: { theme },
  });

  (await cookies()).set(THEME_COOKIE, theme, {
    // httpOnly false on purpose: the cookie holds nothing sensitive (the
    // word "light" or "dark") and client code (next-themes sync, the settings
    // flow) must be able to read it; locking it to the server would buy no
    // security and cost the client its only SSR-consistent source.
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    // One year: a theme choice should outlive a session but a forgotten
    // device should eventually drift back to the DB truth on next sign-in.
    maxAge: 60 * 60 * 24 * 365,
  });

  return { ok: true };
}

/**
 * The same action under the name the settings components import. They call
 * next-themes' client `setTheme` (the instant class flip) in the same scope
 * as this server write, so the qualified name avoids a shadowing collision.
 * One implementation, two names; collapse to one when the flow ships.
 */
export async function setThemePreference(theme: Theme) {
  return setTheme(theme);
}
