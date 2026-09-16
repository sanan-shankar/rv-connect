/* ------------------------------------------------------------------ *
 *  /lab/years/then: the same place, years apart, as dust.
 *
 *  The pairs are picked by hand from the valley's captioned photographs
 *  (the only half of the Collection that names a place), by id so a
 *  recaption cannot swap a picture under the room. Valley-scoped rows
 *  only: every member may see these. Admin only through the lab layout;
 *  writes nothing.
 * ------------------------------------------------------------------ */

import { prisma } from "@/lib/prisma";
import { ThenRoom } from "./_then-room";
import type { ThenPair, ThenPhoto } from "./_then";

export const dynamic = "force-dynamic";

/** Each pair: the earlier photograph first. */
const PAIRS: { key: string; title: string; a: string; b: string }[] = [
  { key: "sbt", title: "The benches under the SBT", a: "cmtvkuown000404k0te7aqwf4", b: "cmtx86is1000604l9chgex5r7" },
  { key: "field", title: "The games field", a: "cmtehxfse000104l5vyaj644v", b: "cmtx869z5000404l9v9w1782c" },
  { key: "banyan", title: "The Big Banyan Tree", a: "cmu1dy4ci000d04jotum66dly", b: "cmtkbpjjd000304jj9elbzmto" },
];

export default async function ThenPage() {
  const ids = PAIRS.flatMap((p) => [p.a, p.b]);
  const rows = await prisma.photo.findMany({
    where: { id: { in: ids }, approved: true, isHidden: false, scope: "valley" },
    select: { id: true, url: true, thumbUrl: true, width: true, height: true, photoYear: true, caption: true },
  });
  const byId = new Map(rows.map((r) => [r.id, r]));
  const toPhoto = (id: string): ThenPhoto | null => {
    const r = byId.get(id);
    return r ? { id: r.id, url: r.url, thumb: r.thumbUrl, w: r.width, h: r.height, year: r.photoYear ?? 0, caption: r.caption } : null;
  };
  const pairs: ThenPair[] = [];
  for (const p of PAIRS) {
    const a = toPhoto(p.a), b = toPhoto(p.b);
    if (a && b) pairs.push({ key: p.key, title: p.title, a, b });
  }
  return <ThenRoom pairs={pairs} />;
}
