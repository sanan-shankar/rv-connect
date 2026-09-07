import { cache } from "react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BUCKET_VALUES, defaultOrderFor, ERA_VALUES, PHOTO_YEAR_MIN } from "@/lib/collection";
import { classKey, photoScopeWhere, type PhotoScope } from "@/lib/photo-visibility-rule";
import { viewerFacts } from "@/lib/collection-viewer-facts";
import { isPhotoAutoApproved } from "@/lib/collection-photo";
import { MAX_PHOTOS_PER_ACCOUNT } from "@/lib/upload-shared";
import {
  loadPhotos,
  type RiverOrder,
  type RiverFilters,
} from "./actions";
import { decidePhotoVisibility } from "@/lib/photo-visibility-rule";
import { includeFor, shape, type PhotoData } from "@/lib/collection-shape";

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

/** The three per-half facts, for each half this member may read. See the
 *  block that builds it for why both are computed rather than the one being
 *  rendered. */
export type ScopeFacts = Partial<
  Record<PhotoScope, { pending: PhotoData[]; hasApprovedPhotos: boolean; roomLeft: number }>
> & { valley: { pending: PhotoData[]; hasApprovedPhotos: boolean; roomLeft: number } };


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
    order: asked ?? (band ? "taken" : defaultOrderFor(scope)),
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

  /* Whether this member's photographs go straight in or wait for review, and
     the two fields the class rule turns on. Everything per-half is below.
     One shared reader, `cache()`d, so the four surfaces that need these facts
     on one permalink render pay for one lookup between them. */
  const me = await viewerFacts(session.user.id);

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

  /* ---------------------------------------------------------------- *
   *  BOTH HALVES' FACTS, NOT JUST THE ONE BEING RENDERED.
   *
   *  Three things on this page are per-half: the member's own queue awaiting
   *  review, whether the half holds any approved photograph at all (which is
   *  what decides between the controls and the empty state), and how much
   *  room is left on their account here.
   *
   *  All three used to be computed for `filters.scope` alone -- the half the
   *  SERVER was asked for. Swapping halves happens entirely in the browser,
   *  by design, so after one press all three described the other collection:
   *  the Awaiting-review strip showed the valley's queue over the Class
   *  Collection, an empty class drew a bucket line and a search box over
   *  nothing instead of its own empty state, and the contribute room promised
   *  a quota belonging to the other half.
   *
   *  Answered for both halves here rather than fetched again on the swap,
   *  which buys a swap that needs no round trip and can never be caught
   *  halfway -- the owner's requirement, and the reason refactor audit 2's C11
   *  did NOT move these behind the swap. What it cost was three extra queries
   *  per load; asking each question once for both halves instead of once per
   *  half brings that to nothing. Only for halves this member may actually
   *  read: no class, no second set.
   * ---------------------------------------------------------------- */
  const readable: PhotoScope[] = classWhere ? ["valley", "class"] : ["valley"];
  /* Three questions for both halves in three queries, not six.
   *
   *  Each of these used to be asked once per half, so a class-eligible member
   *  paid six round trips for facts about two collections. They are the same
   *  question of the same table asked with a different scope, which is what
   *  `groupBy` is: the scope arms come from `photoScopeWhere` exactly as
   *  before, so the class half is still restricted to this member's own year
   *  by the rule rather than by a second copy of it here. */
  const scopeWheres = readable.map((half) => (half === "class" ? classWhere! : { scope: "valley" }));
  const [pendingRows, approvedByScope, mineByScope] = await Promise.all([
    myPendingPhotos(readable),
    /* "Is this half empty?" -- counting every approved photograph in the
       table would tell the Class Collection it was full on the strength
       of the valley's contents. */
    prisma.photo.groupBy({
      by: ["scope"],
      where: { OR: scopeWheres, approved: true, isHidden: false },
      _count: { _all: true },
    }),
    /* SCOPED, because the quota is per half. The pop-up promises the room
       left before a file is chosen, and promising the valley's number over
       the Class Collection would be a lie the member only discovers two
       hundred photographs in. */
    prisma.photo.groupBy({
      by: ["scope"],
      where: { uploaderId: session.user.id },
      _count: { _all: true },
    }),
  ]);
  const countIn = (rows: { scope: string; _count: { _all: number } }[], half: PhotoScope) =>
    rows.find((r) => r.scope === half)?._count._all ?? 0;

  const factPairs = readable.map((half) => {
    const mine = countIn(mineByScope, half);
    return [
      half,
      {
        pending: pendingRows.filter((p) => p.scope === half),
        hasApprovedPhotos: countIn(approvedByScope, half) > 0,
        /* An admin has no ceiling, matching `photoQuotaError`, which is the
           thing that would actually refuse the upload. The two have to agree
           or the drop room caps a batch the server would have accepted.
           `MAX_PHOTOS_PER_DROP` still applies to everybody: it bounds one
           go, not one account. */
        roomLeft:
          session.user.role === "admin"
            ? MAX_PHOTOS_PER_ACCOUNT
            : Math.max(0, MAX_PHOTOS_PER_ACCOUNT - mine),
      },
    ] as const;
  });
  const scopeFacts = Object.fromEntries(factPairs) as ScopeFacts;
  const here = scopeFacts[scope] ?? scopeFacts.valley;

  const firstPage = await loadPhotos(filters);

  return {
    scopeFacts,
    /* The half being rendered, spread out flat as well, because that is what
       every consumer already reads and the client only needs the map when the
       reader swaps. */
    pending: here.pending,
    hasApprovedPhotos: here.hasApprovedPhotos,
    roomLeft: here.roomLeft,
    firstPage,
    filters,
    isAdmin: session.user.role === "admin",
    autoApproved: isPhotoAutoApproved({ role: session.user.role, ...me }),
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

/* ------------------------------------------------------------------ *
 *  The two reads that are NOT server actions.
 *
 *  They were exports of collection/actions.ts until 2026-09-05, which made
 *  each of them a client-callable HTTP endpoint with its own action ID
 *  (every export of a `"use server"` file is), for functions whose only
 *  callers are server modules -- this file and /collection/[id]/page.tsx.
 *  Both authenticate correctly, so this was never a hole; it was surface,
 *  and that file's own comments say twice over that a server action is a
 *  public HTTP endpoint. Two fewer things to reason about.
 * ------------------------------------------------------------------ */

/** One photograph, for a link straight to it. Same visibility rules as the
 *  grid: a hidden photograph is nothing to anybody, and one still awaiting
 *  review is visible only to whoever uploaded it and to an admin. Returns the
 *  same shape the grid uses, because /collection/[id] is now that grid with
 *  the viewer already open (spec sec. 5).
 *
 *  `cache()`d, because the permalink's `generateMetadata` needs the caption
 *  and the visibility answer that this already works out, and Next runs it in
 *  the same request as the page. Keyed on the id alone rather than on the
 *  viewer: the session cannot change inside one request, and `auth()` hands
 *  back a fresh object per call, which would miss the cache every time. */
export const loadPhoto = cache(async function loadPhoto(id: string): Promise<PhotoData | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  const row = await prisma.photo.findUnique({
    where: { id },
    include: includeFor(session.user.id),
  });
  if (!row) return null;

  /* THE RULE ITSELF here, not a hand-written repeat of it. This is the path a
     shared link takes, and audits M30/M31 are both the same story: a list and
     a permalink disagreeing about who may see something, so a row absent from
     every river stayed reachable at its own URL. One function decides both.

     The viewer's verification and class are read off the row for the reason
     given in viewerFacts: a JWT claim can be an hour stale. */
  const me = await viewerFacts(session.user.id);
  const seen = decidePhotoVisibility(row, {
    id: session.user.id,
    role: session.user.role,
    verifyState: me?.verifyState,
    batchYear: me?.batchYear,
  });
  if (!seen.ok) return null;

  return shape(row, session.user.id);
});

/** The member's own queue, for the halves of the Collection they can read.
 *
 *  Every row carries its own `scope`, and the caller keeps them apart by it.
 *  That separation is the point, though none of this is a leak -- every row is
 *  the caller's own: a photograph awaiting review sits above the river it
 *  belongs to, and showing a pending valley contribution over the Class
 *  Collection would say it is going somewhere it is not. Class contributions
 *  auto-approve (spec sec. 7.3), so in practice the class half is empty -- but
 *  it must be empty because the query said so, not by luck.
 *
 *  Takes the whole readable set rather than one half at a time, because the
 *  page needs both: it draws the half being read and holds the other so the
 *  swap needs no round trip. */
export async function myPendingPhotos(
  scopes: PhotoScope[] = ["valley"]
): Promise<PhotoData[]> {
  const session = await auth();
  if (!session?.user?.id) return [];
  const rows = await prisma.photo.findMany({
    where: {
      scope: { in: scopes },
      uploaderId: session.user.id,
      approved: false,
      isHidden: false,
    },
    include: includeFor(session.user.id),
    orderBy: { createdAt: "desc" },
  });
  return rows.map((p) => shape(p, session.user.id));
}
