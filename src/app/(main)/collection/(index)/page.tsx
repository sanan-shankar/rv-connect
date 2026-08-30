import type { Metadata } from "next";
import { CollectionClient } from "@/components/collection/collection-client";
import { collectionPageData, riverFiltersFrom } from "../collection-data";

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
