import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { IS_DEMO } from "@/lib/demo";
import { STALE_SESSION_PATH, withNext } from "@/lib/stale-session";

/**
 * The one way a page sends somebody it has found signed out.
 *
 * Through /api/auth/stale rather than straight to /login, so a cookie that
 * outlived its session is deleted on the way (src/lib/stale-session.ts says
 * why that matters), and with the destination in tow so a followed link
 * survives the detour (audit C-117/C-200).
 *
 * The demo has no cookies to clear and closes /api/auth at the proxy, so it
 * keeps going straight to /login, where the demo landing explains itself.
 */
export async function redirectToSignIn(): Promise<never> {
  redirect(withNext(IS_DEMO ? "/login" : STALE_SESSION_PATH, await currentTarget()));
}

/* The page WITH its query string, which is what a sign-in detour has to carry
   back: /directory?batch=2011 is a different destination from /directory.
   Both headers come from src/proxy.ts. */
async function currentTarget(): Promise<string | undefined> {
  const h = await headers();
  const path = h.get("x-pathname");
  if (!path) return undefined;
  return path + (h.get("x-search") ?? "");
}
