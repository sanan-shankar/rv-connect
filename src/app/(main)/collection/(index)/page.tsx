import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CollectionClient } from "@/components/collection/collection-client";
import { collectionPageData, riverFiltersFrom } from "../collection-data";

/**
 * Longer than the default, because re-encoding a photograph is not a page
 * render (audit C-079, the same reasoning the cron routes carry).
 *
 * Nothing in this project declared a `maxDuration` outside the two nightly
 * jobs, so every upload ran on the platform default. Measured on 2026-09-02
 * against real photographs: a 24MP one re-encodes in about 1.5 seconds, which
 * was never the problem, and a 40MP one takes **16 seconds of CPU alone** at
 * the quality the Collection now stores at -- before the two R2 round trips
 * either side of it. Past the limit the invocation is killed outright, so the
 * member sees a contribution that simply failed and NOTHING is reported: the
 * process dies before any error handler runs, which is the same no-symptom gap
 * C-079 was about.
 *
 * 60 seconds is roughly three times the measured worst case and a fifth of the
 * Hobby plan's 300-second ceiling. It costs nothing on the ordinary upload,
 * which still returns in a second or two: this is a limit, not a delay.
 */
export const maxDuration = 60;

export const metadata: Metadata = {
  title: "Collection",
};

/* The title, the search and the Contribute button all live INSIDE the client
   component now, and that is not an accident of refactoring. The owner asked
   for the controls to move onto the title line -- "what if we moved them maybe
   up or something right in line with the valley collection maybe?" -- and a
   search box that filters the river has to be where the river's state is.
   <PageHeader> is still the one heading component; it is simply rendered from
   there. */
export default async function CollectionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  /* A bucket, a decade or a search is an address you can send somebody, so the
     first page is rendered on the server already filtered rather than painting
     the whole archive and then replacing it. */
  const filters = riverFiltersFrom(await searchParams);
  const data = await collectionPageData(filters);
  if (!data) return null;

  /* A Class Collection link is the same for everybody -- the class comes from
     whoever opens it -- so it gets sent to whole classes, and some of the
     people who open it have no class yet: a profile still waiting to be
     verified, or with no batch year. Rendered as asked, that was a page
     titled "The Class Collection" with nothing in it, no word of why, and no
     switch back. The Valley Collection instead, at its plain address so the
     bar does not still say "class". Here and not in collectionPageData,
     because the permalink shares that and an admin with no class must still
     open a class photograph from the moderation queue. */
  if (filters.scope === "class" && !data.canSeeClass) redirect("/collection");

  return <CollectionClient {...data} />;
}
