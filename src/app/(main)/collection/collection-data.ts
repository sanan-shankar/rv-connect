import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BUCKET_VALUES, ERA_VALUES } from "@/lib/collection";
import { isPhotoAutoApproved } from "@/lib/collection-photo";
import { MAX_PHOTOS_PER_ACCOUNT } from "@/lib/upload-shared";
import { loadPhotos, myPendingPhotos, type RiverOrder, type RiverFilters } from "./actions";

/* ------------------------------------------------------------------ *
 *  What the Collection page needs before it can draw anything.
 *
 *  Two routes want exactly this: /collection, and /collection/[id],
 *  which since the viewer rebuild is the same page with the viewer
 *  already open on one photograph (spec sec. 5). One function, so the
 *  second route cannot quietly drift from the first -- which is what
 *  would happen the day the river grows a facet and only one of them
 *  fetches it.
 * ------------------------------------------------------------------ */

const ORDERS: RiverOrder[] = ["newest", "oldest", "taken", "loved"];

/* ------------------------------------------------------------------ *
 *  A view of the archive has an address.
 *
 *  Filtering happens IN PLACE -- press a bucket and the river cross-fades
 *  rather than navigating (spec sec. 6) -- but the state it lands in is
 *  written into the URL as it goes, so a bucket, a decade or a search is
 *  something you can send somebody. This reads the other end of that: a
 *  link arriving cold renders its own first page on the server, at the
 *  filters it names, instead of painting the whole archive and then
 *  replacing it.
 *
 *  Every value is checked against the vocabulary rather than trusted. A
 *  search param is input, and an unknown bucket must read as "no bucket"
 *  and not as a filter that matches nothing.
 * ------------------------------------------------------------------ */
export function riverFiltersFrom(
  params: Record<string, string | string[] | undefined> | undefined
): RiverFilters {
  const one = (k: string) => {
    const v = params?.[k];
    return typeof v === "string" ? v : Array.isArray(v) ? v[0] : undefined;
  };
  const bucket = one("bucket");
  const era = one("when");
  const order = one("order");
  const search = one("q")?.slice(0, 100).trim();

  return {
    bucket: bucket && (BUCKET_VALUES as readonly string[]).includes(bucket) ? bucket : undefined,
    era: era && (ERA_VALUES as readonly string[]).includes(era) ? era : undefined,
    search: search || undefined,
    order: order && (ORDERS as string[]).includes(order) ? (order as RiverOrder) : "newest",
  };
}

export async function collectionPageData(filters: RiverFilters = { order: "newest" }) {
  const session = await auth();
  if (!session?.user) return null;

  /* Whether the river's controls have anything to act on at all is resolved
     here, server-side, so the client never has to guess before its first
     fetch resolves -- see CollectionClient's `trulyEmpty`.

     The FIRST page is fetched here too, not from the client after mount. It
     used to be a server action fired from an effect, which meant a cold visit
     paid hydration and then a whole round trip before a single photograph
     appeared: measured on a production build at 778 ms after first paint
     locally, and 2.9 SECONDS on a throttled connection, all of it skeleton.
     The moment a filter, an order or a search changes, the client takes over
     exactly as before. */
  /* The two things the contribute pop-up has to be honest about BEFORE a file
     is chosen, because each changes what it promises: whether this member's
     photographs go straight in or wait for review, and how much room is left
     on their account (audit M17's quota). Fetched here rather than when the
     pop-up opens, so it never says one thing and then another. */
  const [pending, approvedCount, firstPage, me, mine] = await Promise.all([
    myPendingPhotos(),
    prisma.photo.count({ where: { approved: true, isHidden: false } }),
    loadPhotos(filters),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { photoTrusted: true },
    }),
    prisma.photo.count({ where: { uploaderId: session.user.id } }),
  ]);

  return {
    pending,
    hasApprovedPhotos: approvedCount > 0,
    firstPage,
    filters,
    isAdmin: session.user.role === "admin",
    autoApproved: isPhotoAutoApproved({ role: session.user.role, ...me }),
    roomLeft: Math.max(0, MAX_PHOTOS_PER_ACCOUNT - mine),
  };
}
