import { prisma } from "./prisma";
import { delImage } from "./storage";

/**
 * The one place that knows how to erase a member COMPLETELY (audit H9).
 *
 * `prisma.user.delete` cascades the rows, but rows are only half of a person's
 * data: their avatar, every image on their posts and Catch-up answers, and
 * every photograph they contributed to the Collection are bytes in R2 that no
 * cascade can reach. Before this existed, deletion left all of them publicly
 * fetchable at their pub-*.r2.dev URLs forever, with no row left pointing at
 * them, so nobody could ever find and remove them again. That is what made
 * GDPR Art. 17 unachievable for images.
 *
 * Used by both deletion routes: `adminDeleteUser` (immediate, an admin's
 * deliberate hand) and the retention sweep (a member's own request, after the
 * 60-day grace window has passed — audit M35).
 */

/**
 * How long a deletion request sits before the purge makes it final. The
 * owner's retention decision (2026-08-19): "deleted accounts purged after a
 * 60-day grace period". Signing in at any point inside the window cancels
 * the request — see authorize() in src/lib/auth.ts.
 */
export const DELETION_GRACE_DAYS = 60;

/**
 * Every stored-image URL the member's rows point at, collected BEFORE the
 * delete cascades those rows away. `delImage` ignores URLs that are not ours
 * (an external song artwork, a legacy host), so collecting generously is safe.
 *
 * `coverPhoto` is deliberately absent: it is a Collection photo REUSED as a
 * profile cover, so its bytes belong to whoever contributed it — if that was
 * this member, it is already collected from their Photo rows.
 */
async function collectImageUrls(userId: string): Promise<string[]> {
  const [user, posts, photos, entries] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { photoUrl: true } }),
    prisma.post.findMany({ where: { authorId: userId }, select: { images: true } }),
    prisma.photo.findMany({
      where: { uploaderId: userId },
      select: { thumbUrl: true, url: true, originalUrl: true },
    }),
    prisma.catchupEntry.findMany({ where: { authorId: userId }, select: { images: true } }),
  ]);

  const urls: string[] = [];
  if (user?.photoUrl) urls.push(user.photoUrl);
  for (const p of photos) {
    urls.push(p.thumbUrl, p.url);
    if (p.originalUrl) urls.push(p.originalUrl);
  }
  // Post and Catch-up images are JSON-encoded string arrays; a malformed
  // column is skipped rather than failing the whole purge.
  for (const row of [...posts, ...entries]) {
    if (!row.images) continue;
    try {
      const arr = JSON.parse(row.images);
      if (Array.isArray(arr)) {
        for (const u of arr) if (typeof u === "string") urls.push(u);
      }
    } catch {
      // unparseable images column; nothing to collect from it
    }
  }
  return [...new Set(urls)];
}

export type PurgeResult =
  | { ok: true; imagesDeleted: number }
  | { ok: false; error: string };

/**
 * Delete the account row (cascading the member's content) and then the R2
 * objects those rows pointed at. Order matters twice over:
 *
 *  - URLs are collected FIRST, because the cascade takes the pointing rows
 *    with it and afterwards nothing can enumerate the objects;
 *  - bytes are deleted only AFTER the row delete succeeds, because if the
 *    delete throws and rolls back, the member still exists and their images
 *    must keep rendering.
 *
 * `delImage` is best-effort and never throws, so a flaky R2 call cannot turn
 * a completed deletion into an error page; the audit entry the CALLER writes
 * records how many objects were actually removed.
 */
export async function purgeUserAccount(userId: string): Promise<PurgeResult> {
  const urls = await collectImageUrls(userId);

  try {
    // Report.reporterId is RESTRICT, not cascade: a member who has EVER filed
    // a report cannot be deleted until those rows are cleared, or the delete
    // throws and rolls back (audit H8). Reports filed AGAINST them cascade.
    await prisma.report.deleteMany({ where: { reporterId: userId } });
    await prisma.user.delete({ where: { id: userId } });
  } catch (err) {
    console.error("purgeUserAccount failed:", err);
    return { ok: false, error: "Could not delete the account." };
  }

  let deleted = 0;
  for (const url of urls) {
    await delImage(url);
    deleted += 1;
  }
  return { ok: true, imagesDeleted: deleted };
}
