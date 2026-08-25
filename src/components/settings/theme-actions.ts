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
 * by the root layout). The client has already flipped the class instantly via
 * next-themes' own setTheme, so nothing here is what the member is waiting on.
 *
 * It calls no `revalidatePath` -- but it does NOT follow that nothing
 * re-renders, which is what this comment used to claim (audit Low 53).
 * Setting a cookie in a Server Action makes Next re-render the current page
 * and its layouts on the server, by design, so the UI reflects the new value
 * (see next/docs 01-app/01-getting-started/07-mutating-data.md, "Cookies").
 * That is a real server round trip on a cosmetic toggle.
 *
 * Left as it is, deliberately: the only two callers are `LightsOn` and the
 * dark gauntlet, both of which are their own dedicated page and both of which
 * NAVIGATE the moment this resolves, so the re-render is absorbed by a
 * navigation that was happening anyway. If a theme switch ever appears inline
 * on a content page, move the cookie write to the client (it is
 * `httpOnly: false` precisely so client code can read it, and can therefore
 * write it) and leave only the database write here.
 */
async function setTheme(theme: Theme) {
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
    /* One year, because this cookie IS the theme on this device -- there is
       no drift back to a database truth on the next sign-in, whatever this
       comment used to say (audit C-138). Nothing reads `User.theme` back into
       a cookie anywhere, so when this expires the device starts light again
       and the gauntlet is walked afresh. See src/lib/theme.ts for why that is
       the design and not an oversight. */
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
