import { prisma } from "@/lib/prisma";
import { forgetImages } from "@/lib/image-record";
import { delImage, delImageByKey, publicUrlForKey } from "@/lib/storage";

/**
 * Deleting image bytes without losing them when storage says no.
 *
 * `delImage`/`delImageByKey` never throw: they answer false and log. Most call
 * sites discarded that boolean, which meant a single bad minute at R2 left the
 * bytes at their permanent public URL with nothing left able to enumerate them
 * -- the exact hole audit M11 closed for deletions that go through a
 * transaction, reopened for every deletion that does not (audit C-069/C-152).
 *
 * These two helpers close it the same way `deletePost` does, minus the
 * transaction: try the delete, and on refusal write the URL into
 * `PendingImagePurge`, the worklist the nightly retention sweep drains
 * (`drainPendingImagePurges`). Best-effort stays best-effort for the caller --
 * neither throws, and neither makes the member wait on a retry -- but a
 * failure now leaves a row somebody can act on instead of a console line
 * nobody reads.
 *
 * `reason` lands in the column of the same name so a backlog can be read
 * without archaeology; use the word for WHY the bytes are going, not for which
 * function is calling.
 */
async function queue(urls: string[], reason: string): Promise<void> {
  if (urls.length === 0) return;
  try {
    await prisma.pendingImagePurge.createMany({
      data: urls.map((url) => ({
        url,
        reason,
        attempts: 1,
        lastError: "delete refused by storage",
      })),
    });
  } catch (err) {
    // The queue write is the backstop; if IT fails there is nothing further to
    // fall back to, so say so loudly rather than swallow it. The caller's own
    // work has already succeeded and must not be undone over this.
    console.error(
      `[image-purge] could not queue ${urls.length} image(s) for retry:`,
      err instanceof Error ? err.message : err
    );
  }
}

/**
 * Delete images by their public URLs; anything storage refuses is queued for
 * the nightly retry. Nulls and URLs that are not ours are skipped by
 * `delImage` itself.
 */
export async function purgeImageUrls(
  urls: (string | null | undefined)[],
  reason: string
): Promise<void> {
  const present = urls.filter((u): u is string => !!u);
  const results = await Promise.all(present.map((url) => delImage(url)));
  await queue(
    present.filter((_, i) => !results[i]),
    reason
  );
  /* What we knew about those images goes with them, including the 16px smear
     of each one that `Image.blurDataUrl` holds. For every url, not only the
     ones storage let go of: the intent here is that these bytes are leaving,
     and anything storage refused is already queued for a retry that will not
     need the row. */
  await forgetImages(present);
}

/**
 * Delete an object by its raw key -- the staged direct-upload original, which
 * has no row and no public URL of its own yet. Queued on refusal under the URL
 * that key serves from, which `keyForUrl` turns back into the same key when
 * the drain gets to it.
 */
export async function purgeImageKey(key: string, reason: string): Promise<void> {
  if (await delImageByKey(key)) return;
  await queue([publicUrlForKey(key)], reason);
}

/**
 * Await several in-flight `putImage` calls as a unit: if any of them fails,
 * whatever DID land is deleted before the failure is rethrown.
 *
 * `Promise.all` rejects on the first failure and drops the other results on
 * the floor, so a display image that stored fine while its thumbnail threw
 * became an object with no row, no URL in anyone's hands, and no way to find
 * it again (audit C-064). The caller sees exactly what it saw before -- the
 * same rejection -- minus the orphan.
 */
export async function putAllOrNone(
  puts: Promise<string>[],
  reason: string
): Promise<string[]> {
  const settled = await Promise.allSettled(puts);
  const failure = settled.find((r) => r.status === "rejected");
  if (!failure) return settled.map((r) => (r as PromiseFulfilledResult<string>).value);
  await purgeImageUrls(
    settled.map((r) => (r.status === "fulfilled" ? r.value : null)),
    reason
  );
  throw (failure as PromiseRejectedResult).reason;
}
