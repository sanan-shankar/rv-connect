import type { Metadata } from "next";
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
  const data = await collectionPageData(riverFiltersFrom(await searchParams));
  if (!data) return null;

  return <CollectionClient {...data} />;
}
