import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { CollectionClient } from "@/components/collection/collection-client";
import { myPendingPhotos } from "./actions";

export const metadata: Metadata = {
  title: "Collection",
};

export default async function CollectionPage() {
  const session = await auth();
  if (!session?.user) return null;

  // Part of school has no fixed vocabulary (upload's `area` field is free
  // text -- see src/lib/collection-facets.ts), so its filter options are the
  // live distinct values already on approved photos, same pattern as
  // Directory's City facet.
  const [pending, areaGroups] = await Promise.all([
    myPendingPhotos(),
    prisma.photo.groupBy({
      by: ["area"],
      where: { approved: true, isHidden: false, area: { not: null } },
      _count: { area: true },
      orderBy: [{ _count: { area: "desc" } }, { area: "asc" }],
    }),
  ]);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="The Valley Collection"
        subtitle="A shared picture of the place: the banyan, Rishi Konda, the birds, the light."
      />
      <CollectionClient
        pending={pending}
        areaOptions={areaGroups.map((g) => g.area!).filter(Boolean)}
      />
    </div>
  );
}
