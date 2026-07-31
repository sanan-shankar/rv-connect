import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { getThemeCookie } from "@/lib/theme";
import { getWordleAnswer } from "@/lib/wordle";
import { DarkGauntlet } from "@/components/settings/dark-gauntlet";
import { LightsOn } from "@/components/settings/lights-on";

export const metadata: Metadata = {
  title: "Dark mode",
};

/* The gauntlet lives at its own route because it is "a series of pages"
 * (owner), not a dialog. Turning dark OFF is deliberately the opposite
 * register: if the viewer is already dark, this page is one calm button.
 *
 * The gate keys on the COOKIE, not User.theme: the cookie is what this
 * device actually renders, and gating on the DB while rendering on the
 * cookie can strand a light-looking app behind a "you live in the dark"
 * page (seen live when a test wrote only the DB). setThemePreference
 * always writes both, so any divergence heals at the next toggle. */
export default async function DarkModePage() {
  const session = await auth();
  if (!session?.user) return null;

  if ((await getThemeCookie()) === "dark") {
    return <LightsOn />;
  }

  return <DarkGauntlet word={await getWordleAnswer()} />;
}
