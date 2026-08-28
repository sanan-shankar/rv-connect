"use server";

/* ------------------------------------------------------------------ *
 *  The uploader moves the crop.
 *
 *  Spec §9 calls this NOT OPTIONAL, and the argument is not about
 *  convenience. §1 aims every crop automatically from sharp's `attention`,
 *  and the only thing that makes an automatic aim defensible is that the
 *  person who took the photograph can overrule it. X shipped a saliency
 *  crop, measured real racial and gender bias in it, withdrew it, and
 *  replaced it with exactly this -- "how to crop an image is a decision
 *  best made by people" (prior-art.md).
 *
 *  Not in a route's `actions.ts` because it belongs to no route: the
 *  images it aims live under `uploads/<userId>/` and are shared by the
 *  feed composer, the letters desk and a Catch-up answer. A file that is
 *  not `page`, `layout` or `route` is not a route, so this sits in the
 *  group beside them (the same shape as `directory/select.ts`).
 * ------------------------------------------------------------------ */

import { auth } from "@/lib/auth";
import { IS_DEMO } from "@/lib/demo";
import { prisma } from "@/lib/prisma";
import { photoFactsFor } from "@/lib/image-record";
import { ownedUploadUrls } from "@/lib/upload-ownership";
import type { PhotoFacts } from "@/lib/photo-layout";

/**
 * Remember where this member put the window on their own photograph.
 *
 * `focalY` alone, because after D19 the vertical is the only axis anything is
 * ever cut along: a photograph square or wider loses its top and bottom to the
 * height ceiling, and a tall one is brought to 3:4 by losing its top and
 * bottom too. There is no horizontal trim left to aim.
 *
 * `focalSet` is what the write is really for. It tells `framePhoto` that this
 * number came from a person, so the 15%..50% band that brakes a bad guess is
 * not applied to it -- see the column's own comment in schema.prisma.
 */
export async function aimImage(url: string, focalY: number) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };
  if (IS_DEMO) return { error: "The demo does not change photographs." };

  if (typeof focalY !== "number" || !Number.isFinite(focalY)) {
    return { error: "That is not a position." };
  }
  // 0..1 is the whole of the frame. Held here as well as in the browser
  // because an object-position outside the frame is not a position, and this
  // number is written by a client that can send anything.
  const aimed = Math.min(1, Math.max(0, focalY));

  /* The same C2 ownership check every path that lets a member name an image
     URL runs: app-minted, under this caller's OWN `uploads/<their id>/`
     prefix, and no longer than MAX_IMAGE_URL. Without it, aiming is a write
     onto any image in the bucket by URL -- including a heritage Collection
     photograph -- from a member who never uploaded it. */
  const owned = ownedUploadUrls([url], session.user.id);
  if (!owned.ok) return { error: owned.error };

  try {
    /* `update`, not `upsert`. A row only exists for an image this app measured
       at upload, so a URL with no row is one we have never seen the bytes of,
       and inventing a row for it would put a width and height into the table
       that nothing measured. Prisma's P2025 is that case; it is not an error
       worth showing anybody, because the crop it would have aimed is one the
       renderer is not making either. */
    await prisma.image.update({
      where: { url: owned.urls[0] },
      data: { focalY: aimed, focalSet: true },
    });
  } catch {
    return { error: "That photograph could not be re-aimed just now." };
  }

  /* No revalidate. The photograph is still in a composer that has not been
     posted; there is no page showing it yet. The card reads `focalY` when the
     post is rendered, which is after this. */
  return { success: true };
}

/**
 * What the server measured about photographs this member already uploaded.
 *
 * The composer normally keeps these from the upload response, but a RESUMED
 * DRAFT holds nothing but urls -- and without the facts the crop handle opens
 * at dead centre while the card is drawing the machine's aim, which is the
 * one thing this dialog must never do. The letters desk resumes drafts as a
 * matter of course, so that is not an edge.
 *
 * Read-only, and filtered through the same ownership check the write uses:
 * these facts are dull, but a lookup that answers for any url in the bucket
 * is an enumeration tool, and the caller has no business asking about a
 * photograph that is not theirs.
 */
export async function myImageFacts(urls: string[]): Promise<Record<string, PhotoFacts>> {
  const session = await auth();
  if (!session?.user?.id) return {};
  const owned = ownedUploadUrls(urls, session.user.id);
  if (!owned.ok) return {};
  const facts = await photoFactsFor(owned.urls);
  return Object.fromEntries(
    [...facts].map(([url, f]) => [
      url,
      { width: f.width, height: f.height, focalX: f.focalX, focalY: f.focalY, focalSet: f.focalSet },
    ])
  );
}
