import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { CollectionClient } from "@/components/collection/collection-client";
import { loadPhotos, myPendingPhotos } from "./actions";

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
  // Whether the toolbar (search + filters) has anything to act on at all is
  // resolved here, server-side, so the client never has to guess before its
  // first photo fetch resolves -- see CollectionClient's `trulyEmpty`.
  /* The grid's FIRST page is fetched here, not from the client after mount.
     It used to be a server action fired from an effect, which meant a cold
     visit paid hydration and then a whole round trip before a single
     photograph appeared: measured on a production build at 778 ms after first
     paint locally, and 2.9 SECONDS on a throttled connection, all of it
     skeleton. The query is the same one the action runs for the default view
     (newest, no filters); the moment a filter, a sort or a search changes, the
     client takes over exactly as before. */
  const [pending, areaGroups, approvedCount, firstPage] = await Promise.all([
    myPendingPhotos(),
    prisma.photo.groupBy({
      by: ["area"],
      where: { approved: true, isHidden: false, area: { not: null } },
      _count: { area: true },
      orderBy: [{ _count: { area: "desc" } }, { area: "asc" }],
    }),
    prisma.photo.count({ where: { approved: true, isHidden: false } }),
    loadPhotos({ page: 0, sortBy: "newest" }),
  ]);

  return (
    <div>
      {/* No subtitle (owner, 2026-08-22): the grid says what the page is. */}
      <PageHeader title="The Valley Collection" />
      <CollectionClient
        pending={pending}
        areaOptions={areaGroups.map((g) => g.area!).filter(Boolean)}
        hasApprovedPhotos={approvedCount > 0}
        firstPage={firstPage}
      />
    </div>
  );
}
