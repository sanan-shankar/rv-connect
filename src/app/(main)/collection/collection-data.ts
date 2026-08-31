import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BUCKET_VALUES, ERA_VALUES, PHOTO_YEAR_MIN } from "@/lib/collection";
import { classKey, photoScopeWhere, type PhotoScope } from "@/lib/photo-visibility-rule";
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
 *  written into the URL as it goes, so a bucket, a year or a search is
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
  const when = one("when");
  const order = one("order");
  const search = one("q")?.slice(0, 100).trim();
  /* Anything that is not the literal "class" is the Valley Collection. A
     scope arriving from a URL is input like any other, and the failure
     direction matters more here than for a bucket: an unreadable value must
     land on the PUBLIC half, which shows the reader something and tells them
     plainly where they are, rather than on a private half they may have no
     claim to and would meet as an unexplained empty page. */
  const scope: PhotoScope = one("scope") === "class" ? "class" : "valley";

  /* `?when=` is a YEAR now ("1956"), and was a decade until 2026-08-30. Both
     are still read: a decade link somebody kept or sent still opens the
     archive at the top of that decade (`bandSeekBoundary` handles it), it
     simply is not a shape the rail writes any more. Bounded either way,
     because an unbounded year seeks to a boundary no row can be under and
     answers an empty archive -- the failure a search param must never have.
     The ceiling is deliberately loose rather than "this year": the clock is
     the reader's, and a photograph contributed on the far side of a date
     line must not read as a bad link. */
  const year = when && /^\d{4}$/.test(when) ? Number(when) : null;
  const band =
    year !== null
      ? year >= PHOTO_YEAR_MIN && year <= 2100
        ? when
        : undefined
      : when && (ERA_VALUES as readonly string[]).includes(when)
        ? when
        : undefined;
  const asked = order && (ORDERS as string[]).includes(order) ? (order as RiverOrder) : undefined;

  return {
    scope,
    bucket: bucket && (BUCKET_VALUES as readonly string[]).includes(bucket) ? bucket : undefined,
    band,
    search: search || undefined,
    /* A `?when=` with no order named means Chronological, because that is the
       only order a year is a position in: `when` asks the river to START at
       1956, and starting somewhere is meaningless in a river sorted by
       upload date. Links this page writes always name both, so this is for
       the ones a person shortens, types or kept from an older build. */
    order: asked ?? (band ? "taken" : "newest"),
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
  const scope: PhotoScope = filters.scope ?? "valley";

  /* The two things the contribute pop-up has to be honest about BEFORE a file
     is chosen, because each changes what it promises: whether this member's
     photographs go straight in or wait for review, and how much room is left
     on their account (audit M17's quota). Fetched here rather than when the
     pop-up opens, so it never says one thing and then another. */
  const [pending, me, mine] = await Promise.all([
    myPendingPhotos(scope),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { photoTrusted: true, verifyState: true, batchYear: true },
    }),
    /* SCOPED to the half being looked at, because the quota is per half. The
       pop-up promises the room left before a file is chosen, and promising
       the valley's number over the Class Collection would be a lie the member
       only discovers two hundred photographs in. */
    prisma.photo.count({ where: { uploaderId: session.user.id, scope } }),
  ]);

  /* Whether this member may see the Class Collection AT ALL, answered from
     the same function the river and the permalink use rather than by
     re-deriving the two conditions here. A third copy of "verified and has a
     batch year" is a third place for them to drift apart. */
  const classWhere = photoScopeWhere("class", {
    id: session.user.id,
    role: session.user.role,
    verifyState: me?.verifyState,
    batchYear: me?.batchYear,
  });

  /* "Is this half of the Collection empty?" -- the question CollectionClient's
     `trulyEmpty` asks before it decides whether to draw controls at all. It
     has to be asked of the half being LOOKED AT: counting every approved
     photograph in the table would tell the Class Collection it was full on
     the strength of the valley's contents, and draw a bucket line and a
     search box over nothing. */
  const scopeWhere = scope === "class" ? classWhere : { scope: "valley" };
  const [approvedCount, firstPage] = await Promise.all([
    scopeWhere
      ? prisma.photo.count({ where: { ...scopeWhere, approved: true, isHidden: false } })
      : Promise.resolve(0),
    loadPhotos(filters),
  ]);

  return {
    pending,
    hasApprovedPhotos: approvedCount > 0,
    firstPage,
    filters,
    isAdmin: session.user.role === "admin",
    autoApproved: isPhotoAutoApproved({ role: session.user.role, ...me }),
    roomLeft: Math.max(0, MAX_PHOTOS_PER_ACCOUNT - mine),
    /* What the switch needs, and no more: whether to offer the Class
       Collection at all, and which class is empty when it is.

       Deliberately NOT "and if not, why not". A member with no class -- a
       teacher, or a profile still missing its batch year -- gets no switch
       rather than a switch that explains itself, because a control drawn only
       to say it does not work is one more element on a page whose whole brief
       was to stay quiet (spec sec. 2.5). Telling them the feature exists is a
       real thing worth doing and it belongs where the missing field is, not
       here. */
    canSeeClass: classWhere !== null,
    myClassYear: classKey(me?.batchYear),
  };
}
