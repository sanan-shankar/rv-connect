import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { getViewerCities } from "@/lib/city-scope";
import { LetterDesk } from "@/components/letters/letter-desk";

export const metadata: Metadata = {
  title: "Write a letter",
};

/* A whole page for writing (owner, 2026-07-30): no index header, no drafts
 * strip, no archive sharing the scroll - just the desk. Stays under (main)
 * so the auth guard, the sidebar and the page transition all keep working. */
export default async function NewLetterPage() {
  const session = await auth();
  if (!session?.user) return null;

  // The writer's own cities feed the "Show to" audience control.
  const cities = await getViewerCities(session.user.id);

  return <LetterDesk writerId={session.user.id} userPlaces={cities} />;
}
