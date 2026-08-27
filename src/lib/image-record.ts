import { prisma } from "@/lib/prisma";
import type { ImageFacts } from "@/lib/image";

/**
 * The database half of "we know what this image looks like".
 *
 * `Image` is keyed by the URL its bytes serve from (schema comment, and
 * docs/planning/collection-rework/spec.md §2), so this module is the only place
 * that has to know the pairing exists: a store path records what
 * `describeImage` measured, a delete path forgets the URLs whose bytes it took,
 * and nothing else in the app changes shape.
 *
 * Deliberately no `sharp` here, only the TYPE from the module that owns it.
 * Measuring and remembering are separate jobs with separate costs: the account
 * purge and the nightly retention sweep forget rows and never measure anything,
 * and a static import of the image pipeline would put a native decoder in their
 * bundle for nothing.
 *
 * Nothing here throws. A missing row is a supported state everywhere -- the
 * renderer falls back to the behaviour it had before this table existed -- so a
 * bad minute at the database must never be the thing that fails an upload that
 * otherwise worked. Every failure is logged rather than swallowed: this guard
 * hides its own breakage by design, and the house rule about that is why the
 * console lines below are unconditional rather than dev-only.
 */

/**
 * Remember what an image looks like, against the URL it serves from.
 *
 * An upsert rather than a create, so re-running the backfill over a URL that
 * already has a row corrects it instead of throwing. Two uploads cannot collide
 * on one URL -- every stored object gets a fresh cuid filename -- so the
 * upsert's own race is not reachable from the upload path.
 */
export async function recordImage(url: string, facts: ImageFacts): Promise<boolean> {
  try {
    await prisma.image.upsert({
      where: { url },
      create: { url, ...facts },
      update: facts,
    });
    return true;
  } catch (err) {
    console.error(
      `[image-record] could not remember ${url}:`,
      err instanceof Error ? err.message : err
    );
    return false;
  }
}

/**
 * Forget every URL in the list.
 *
 * Called wherever image bytes are deleted, because a row here is not only
 * bookkeeping: `blurDataUrl` is a 16px picture of the photograph. Leaving it
 * behind after a member deletes a post -- or after an account purge -- would
 * leave a smear of their photograph in a table nothing points at, which is
 * exactly the kind of quiet residue the purge work was built to prevent.
 *
 * `deleteMany`, so a URL with no row (an external image, a row this table
 * predates) is a no-op rather than an error.
 */
export async function forgetImages(urls: (string | null | undefined)[]): Promise<void> {
  const present = urls.filter((u): u is string => !!u);
  if (present.length === 0) return;
  try {
    await prisma.image.deleteMany({ where: { url: { in: present } } });
  } catch (err) {
    console.error(
      `[image-record] could not forget ${present.length} image(s):`,
      err instanceof Error ? err.message : err
    );
  }
}
