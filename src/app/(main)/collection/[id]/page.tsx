import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { IdentityRow } from "@/components/common/identity-row";
import { PhotoLoveButton } from "@/components/collection/photo-love-button";
import { subjectLabel, areaLabel, eraLabel } from "@/lib/collection";

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
      uploader: { select: { id: true, name: true, avatarColor: true, batchType: true, batchYear: true } },
      _count: { select: { loves: true } },
      loves: { where: { userId: session.user.id }, select: { id: true } },
    },
  });

  if (!photo || photo.isHidden) notFound();
  const isOwn = photo.uploaderId === session.user.id;
  const isAdmin = session.user.role === "admin";
  // Unapproved photos are visible only to their uploader and admins.
  if (!photo.approved && !isOwn && !isAdmin) notFound();

  const subjects = photo.subject ? photo.subject.split(",").filter(Boolean) : [];
  const freeTags = photo.freeTags
    ? photo.freeTags.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/collection"
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <ArrowLeft className="h-4 w-4" />
        The Collection
      </Link>

      <div className="card-elevated overflow-hidden rounded-[var(--radius)] border border-border bg-card">
        <div className="bg-paper">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo.url}
            alt={photo.caption ?? ""}
            width={photo.width}
            height={photo.height}
            className="mx-auto max-h-[78vh] w-auto"
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
              user={{ id: photo.uploader.id, name: photo.uploader.name }}
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
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
              metaClassName="leading-none"
            />
            <div className="ml-auto">
              <PhotoLoveButton
                photoId={photo.id}
                initialLoved={photo.loves.length > 0}
                initialCount={photo._count.loves}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
