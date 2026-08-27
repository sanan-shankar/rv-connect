import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { loadPhotos, myPendingPhotos } from "./actions";

/* ------------------------------------------------------------------ *
 *  What the Collection page needs before it can draw anything.
 *
 *  Two routes want exactly this: /collection, and /collection/[id],
 *  which since the viewer rebuild is the same page with the viewer
 *  already open on one photograph (spec sec. 5). One function, so the
 *  second route cannot quietly drift from the first -- which is what
 *  would happen the day the grid grows a facet and only one of them
 *  fetches it.
 * ------------------------------------------------------------------ */

export async function collectionPageData() {
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

  return {
    pending,
    areaOptions: areaGroups.map((g) => g.area!).filter(Boolean),
    hasApprovedPhotos: approvedCount > 0,
    firstPage,
    isAdmin: session.user.role === "admin",
  };
}
