import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { IdentityRow } from "@/components/common/identity-row";
import { PhotoLoveButton } from "@/components/collection/photo-love-button";
import { PhotoModerationControl } from "@/components/collection/photo-moderation-control";
import { subjectLabel, areaLabel, eraLabel } from "@/lib/collection";
import { recordView } from "@/lib/content-view";
import { VALLEY_TIME_ZONE } from "@/lib/utils";
import { IDENTITY_SELECT } from "@/lib/people-select";

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

  const photo = await prisma.photo.findUnique({
    where: { id },
    include: {
      uploader: {
        select: { ...IDENTITY_SELECT, avatarColor: true, batchType: true, batchYear: true },
      },
      _count: { select: { loves: true } },
      loves: { where: { userId: session.user.id }, select: { id: true } },
    },
  });

  if (!photo || photo.isHidden) notFound();

  const isOwn = photo.uploaderId === session.user.id;
  const isAdmin = session.user.role === "admin";
  // Unapproved photos are visible only to their uploader and admins.
  if (!photo.approved && !isOwn && !isAdmin) notFound();

  /* after(), not the old `void`: this page still renders at the same speed
     either way, but a bare `void` write raced the response back to the
     browser, and Vercel can freeze or tear down the function the moment that
     response streams -- which silently dropped the row before it ever wrote
     (bug audit Lows 25/35/44/72/77/82/87, the undercounting behind
     /admin/analytics). after() keeps this invocation alive until the write
     actually lands. See src/app/(main)/layout.tsx for the same shape used on
     the mail queue's drain.

     BELOW the approval gate, not above it, for the same reason the letter
     page's call moved (audit Low 87): a view recorded for somebody who is
     then shown a 404 is not a view of anything. */
  after(() => recordView(session?.user?.id, "photo", photo.id));

  const subjects = photo.subject ? photo.subject.split(",").filter(Boolean) : [];
  const freeTags = photo.freeTags
    ? photo.freeTags.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  return (
    <div>
      <Link
        href="/collection"
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <ArrowLeft className="h-4 w-4" />
        The Collection
      </Link>

      <div className="card-elevated overflow-hidden rounded-[var(--radius)] border border-border bg-card">
        <div className="overflow-hidden rounded-t-[var(--radius)] bg-paper">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo.url}
            alt={photo.caption ?? ""}
            width={photo.width}
            height={photo.height}
            className="mx-auto max-h-[78vh] w-auto rounded-t-[var(--radius)]"
          />
        </div>

        <div className="p-5 sm:p-6">
          {!photo.approved && (
            <span className="mb-3 inline-block rounded-full bg-cinnamon/12 px-2.5 py-0.5 text-[11px] font-semibold text-cinnamon">
              Pending review
            </span>
          )}

          {photo.caption && (
            <p className="text-[16px] leading-relaxed text-foreground">{photo.caption}</p>
          )}

          <div className="mt-4 flex flex-wrap gap-1.5">
            {subjects.map((s) => (
              <span key={s} className="rounded-full bg-leaf/10 px-2.5 py-0.5 text-[11.5px] font-semibold text-leaf">
                {subjectLabel(s)}
              </span>
            ))}
            {photo.area && (
              <span className="rounded-full bg-sky/10 px-2.5 py-0.5 text-[11.5px] font-semibold text-sky">
                {areaLabel(photo.area)}
              </span>
            )}
            {photo.era && photo.era !== "unknown" && (
              <span className="rounded-full bg-cinnamon/10 px-2.5 py-0.5 text-[11.5px] font-semibold text-cinnamon">
                {eraLabel(photo.era)}
              </span>
            )}
            {freeTags.map((t) => (
              <span key={t} className="rounded-full bg-muted px-2.5 py-0.5 text-[11.5px] font-medium text-muted-foreground">
                {t}
              </span>
            ))}
          </div>

          <div className="mt-5 flex items-center gap-3 border-t border-border pt-4">
            <IdentityRow
              user={{
                id: photo.uploader.id,
                name: photo.uploader.name,
                photoUrl: photo.uploader.photoUrl,
                birdOverride: photo.uploader.birdOverride,
              }}
              avatarHref={`/profile/${photo.uploader.id}`}
              avatarLabel={photo.uploader.name}
              className="min-w-0 flex-1"
              textClassName="flex-1"
              name={
                <Link
                  href={`/profile/${photo.uploader.id}`}
                  className="text-[13.5px] font-semibold leading-none text-foreground hover:underline"
                >
                  {photo.uploader.name}
                </Link>
              }
              meta={new Date(photo.createdAt).toLocaleDateString("en-GB", {
                timeZone: VALLEY_TIME_ZONE,
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
              metaClassName="leading-none"
            />
            <div className="ml-auto flex items-center gap-2">
              <PhotoLoveButton
                photoId={photo.id}
                initialLoved={photo.loves.length > 0}
                initialCount={photo._count.loves}
              />
              {isAdmin && <PhotoModerationControl photoId={photo.id} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
