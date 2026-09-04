import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CollectionClient } from "@/components/collection/collection-client";
import { recordView } from "@/lib/content-view";
import { decidePhotoVisibility } from "@/lib/photo-visibility-rule";
import { collectionPageData } from "../collection-data";
import { loadPhoto } from "../collection-data";

/** The permalink renders the same <CollectionClient>, so it hosts the same
 *  contribute action and needs the same room. The reasoning is written out
 *  once, on the index page beside it. */
export const maxDuration = 60;

/* ------------------------------------------------------------------ *
 *  A link to one photograph.
 *
 *  This used to be a page of its own -- the photograph in a card, its
 *  tags, its uploader, its heart -- and the owner, arriving on it from
 *  the viewer: "I don't know if we even need that page. Do we need that
 *  page? Can't we just have the heart and the tags over here? Like,
 *  those are the only things that aren't here that are in this whole
 *  other page. I think we could just totally eliminate the need for
 *  that. Another page isn't even pretty."
 *
 *  So the ROUTE stays, because a photograph should have an address you
 *  can send somebody, and the page goes: this is the Collection with the
 *  viewer already open on that photograph. The heart, the buckets, the
 *  Where line and the uploader's own delete are all in the viewer now
 *  (spec sec. 5), so nothing was lost with the page.
 * ------------------------------------------------------------------ */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return { title: "Collection" };

  /* THE RULE, not a second hand-written copy of it. This used to restate the
     hidden/unapproved checks inline, which was correct for as long as those
     were the only two -- and stopped being correct the moment a photograph
     could be private to one class, because a caption is content and this
     function puts it in the page title. A caption reading "Ravi's leaving
     do, 2004" is exactly the kind of thing the Class Collection exists to
     keep in one class. */
  const [photo, me] = await Promise.all([
    prisma.photo.findUnique({
      where: { id },
      select: {
        id: true, caption: true, isHidden: true, approved: true,
        uploaderId: true, scope: true, classYears: true,
      },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { verifyState: true, batchYear: true },
    }),
  ]);
  if (!photo) return { title: "Collection" };

  const seen = decidePhotoVisibility(photo, {
    id: session.user.id,
    role: session.user.role,
    verifyState: me?.verifyState,
    batchYear: me?.batchYear,
  });
  if (!seen.ok) return { title: "Collection" };

  const caption = photo.caption?.trim();
  if (!caption) return { title: "Collection" };
  return { title: caption.length > 70 ? caption.slice(0, 70).trimEnd() + "..." : caption };
}

export default async function PhotoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return null;

  // `loadPhoto` carries the visibility rules (hidden, and unapproved for
  // anyone but its uploader and an admin), so they live in one place rather
  // than being restated here.
  /* The photograph first, because WHICH RIVER goes behind it depends on which
     half it belongs to: a class photograph opened from a link should have its
     own class's river underneath, not the valley's. Sequential rather than
     parallel for that reason, and it costs one round trip on a route that is
     already a link somebody followed rather than a page anybody idles on. */
  const photo = await loadPhoto(id);
  if (!photo) notFound();

  const data = await collectionPageData({
    scope: photo.scope,
    order: "newest",
  });
  if (!data) return null;

  /* after(), not the old `void`: this page still renders at the same speed
     either way, but a bare `void` write raced the response back to the
     browser, and Vercel can freeze or tear down the function the moment that
     response streams -- which silently dropped the row before it ever wrote
     (bug audit Lows 25/35/44/72/77/82/87, the undercounting behind
     /admin/analytics). after() keeps this invocation alive until the write
     actually lands.

     BELOW the visibility check, not above it, for the same reason the letter
     page's call moved (audit Low 87): a view recorded for somebody who is
     then shown a 404 is not a view of anything. */
  after(() => recordView(session.user.id, "photo", id));

  return <CollectionClient {...data} openPhoto={photo} />;
}
