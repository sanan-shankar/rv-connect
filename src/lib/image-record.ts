import { prisma } from "@/lib/prisma";
import type { ImageFacts } from "@/lib/image";
import type { StoredPhoto } from "@/lib/photo-layout";
import { parseJsonArray } from "@/lib/utils";

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

/**
 * What we know about a set of urls, as a map. One query however many photos
 * are on the page, and a url with no row is simply absent -- the caller draws
 * it the way it drew everything before this table existed.
 *
 * `greyscale` is deliberately not selected. It is a filter for the Collection
 * (spec §7.4), not something a card needs in order to lay a photograph out,
 * and every byte here rides in the server component's payload.
 */
export async function photoFactsFor(
  urls: (string | null | undefined)[]
): Promise<Map<string, StoredPhoto>> {
  const wanted = [...new Set(urls.filter((u): u is string => !!u))];
  if (wanted.length === 0) return new Map();
  try {
    const rows = await prisma.image.findMany({
      where: { url: { in: wanted } },
      select: {
        url: true,
        width: true,
        height: true,
        focalX: true,
        focalY: true,
        // Without this every hand-aimed crop reads as a guess and gets braked
        // back into the band the uploader dragged out of.
        focalSet: true,
        blurDataUrl: true,
      },
    });
    return new Map(rows.map(({ url, ...facts }) => [url, facts]));
  } catch (err) {
    console.error(
      "[image-record] could not read image facts:",
      err instanceof Error ? err.message : err
    );
    return new Map();
  }
}

/**
 * Attach each row's photographs to it, in the order its `images` column lists
 * them, so a card can reach `post.photos[i]` beside `images[i]` without
 * knowing this table exists.
 *
 * Per row rather than one shared map, because a feed page's posts are held in
 * component state and appended to as more pages arrive: carrying the facts on
 * the post means every existing feed keeps working untouched, where a map
 * would have to be threaded through three components and merged across pages.
 * A url on two posts is fetched once and stored twice, which is a few dozen
 * bytes.
 */
export async function withPhotoFacts<T extends { images: string | null }>(
  rows: T[]
): Promise<(T & { photos: (StoredPhoto | null)[] })[]> {
  const facts = await photoFactsFor(rows.flatMap((r) => parseJsonArray(r.images)));
  return rows.map((row) => ({
    ...row,
    photos: parseJsonArray(row.images).map((url) => facts.get(url) ?? null),
  }));
}
