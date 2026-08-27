import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { CollectionClient } from "@/components/collection/collection-client";
import { collectionPageData } from "./collection-data";

export const metadata: Metadata = {
  title: "Collection",
};

export default async function CollectionPage() {
  const data = await collectionPageData();
  if (!data) return null;

  return (
    <div>
      {/* No subtitle (owner, 2026-08-22): the grid says what the page is. */}
      <PageHeader
        guide="collection" title="The Valley Collection" />
      <CollectionClient {...data} />
    </div>
  );
}
