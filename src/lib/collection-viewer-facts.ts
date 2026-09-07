/* ------------------------------------------------------------------ *
 *  Who is looking, as far as the Collection is concerned.
 *
 *  `collection-viewer-FACTS` and not `collection-viewer`, because the
 *  Collection has two "viewers" and they are not the same noun: the
 *  member doing the looking (this file, a SERVER module -- it imports
 *  Prisma) and the image viewer they look through
 *  (`collection-viewer-image.ts`, client-safe). Importing this one from
 *  a client component drags Prisma into the browser bundle, which `tsc`
 *  is perfectly happy about.
 * ------------------------------------------------------------------ */

import { cache } from "react";
import { prisma } from "@/lib/prisma";

/**
 * The three facts about the viewer every Collection surface decides on.
 *
 * Read off the ROW, never off the session: a JWT claim is minted at sign-in,
 * and a member who verified or corrected their batch year an hour ago must not
 * be answered from a stale one. That is why this lookup exists at all.
 *
 * `cache()`d because a single class permalink used to make four of them --
 * `generateMetadata`, `loadPhoto`, `collectionPageData` and `loadPhotos` each
 * asked the same primary key for the same columns in the same request. They
 * cannot pass the row to each other: `loadPhotos` is also called straight from
 * the client, so it must still be able to read for itself. React's
 * request-scoped cache is what lets all four keep asking and pay once.
 *
 * `photoTrusted` rides along for the callers that need it. It is one more
 * column on a primary-key read, and one shape is worth more than one column.
 */
export const viewerFacts = cache(async function viewerFacts(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { verifyState: true, batchYear: true, photoTrusted: true },
  });
});
