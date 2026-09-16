/* ------------------------------------------------------------------ *
 *  /lab/years/wall: every photograph you can see, at once, by year.
 *
 *  Loads the same set the Collection would show this viewer -- the
 *  valley's half, plus their own class's half when they are verified and
 *  have a batch year -- through the same scope rule the river uses, so
 *  the wall can never show a class's photographs to the wrong person.
 *  Admin only through the lab layout; writes nothing.
 * ------------------------------------------------------------------ */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { viewerFacts } from "@/lib/collection-viewer-facts";
import { photoScopeWhere } from "@/lib/photo-visibility-rule";
import { bandKeyOf } from "@/lib/collection";
import { WallRoom } from "./_wall-room";
import type { WallPhoto } from "./_wall";

export const dynamic = "force-dynamic";

export default async function WallPage() {
  const session = await auth();
  const userId = session?.user?.id ?? "";
  const me = userId ? await viewerFacts(userId) : null;
  const viewer = { id: userId, role: session?.user?.role, verifyState: me?.verifyState, batchYear: me?.batchYear };
  const scopes = [photoScopeWhere("valley", viewer), photoScopeWhere("class", viewer)].filter(
    (s): s is NonNullable<typeof s> => s !== null
  );
  const rows = await prisma.photo.findMany({
    where: { approved: true, isHidden: false, OR: scopes },
    select: { id: true, thumbUrl: true, url: true, width: true, height: true, photoYear: true, era: true, caption: true },
    orderBy: [{ takenKey: "desc" }, { id: "desc" }],
  });
  const photos: WallPhoto[] = rows.map((r) => ({
    id: r.id,
    t: r.thumbUrl,
    u: r.url,
    w: r.width,
    h: r.height,
    y: bandKeyOf(r),
    c: r.caption,
  }));
  return <WallRoom photos={photos} />;
}
