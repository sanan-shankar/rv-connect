import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { CollectionClient } from "@/components/collection/collection-client";
import { recordView } from "@/lib/content-view";
import { collectionPageData } from "../collection-data";
import { loadPhoto } from "../actions";

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

  const photo = await prisma.photo.findUnique({
    where: { id },
    select: { caption: true, isHidden: true, approved: true, uploaderId: true },
  });
  if (!photo || photo.isHidden) return { title: "Collection" };

  const isOwn = photo.uploaderId === session.user.id;
  const isAdmin = session.user.role === "admin";
  if (!photo.approved && !isOwn && !isAdmin) return { title: "Collection" };

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
  const [photo, data] = await Promise.all([loadPhoto(id), collectionPageData()]);
  if (!data) return null;
  if (!photo) notFound();

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

  return (
    <div>
      <PageHeader guide="collection" title="The Valley Collection" />
      <CollectionClient {...data} openPhoto={photo} />
    </div>
  );
}
