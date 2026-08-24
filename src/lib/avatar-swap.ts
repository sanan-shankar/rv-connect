import { prisma } from "@/lib/prisma";

/**
 * Point the row at a new avatar (or at none) and report which URL that
 * REPLACED -- the one this call actually superseded, not whichever URL
 * happened to be there when it started reading.
 *
 * The two were the same read and the same write before, and a member with the
 * settings page open in two tabs could have both uploads store their object,
 * both read the same previous URL, both delete it, and leave whichever upload
 * lost the last write referenced by nothing: bytes in a bucket nothing can
 * list, for ever (audit C-050/C-131). The compare-and-swap makes them one
 * decision. If the row moved under us we do not guess -- we read again and
 * swap again, so the two tabs delete one object each and neither deletes the
 * other's.
 *
 * `ok: false` means the row is gone or four attempts all lost, which the
 * caller answers by taking its own upload back rather than by pretending.
 */
export async function swapPhotoUrl(
  userId: string,
  next: string | null
): Promise<{ ok: true; previous: string | null } | { ok: false }> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const row = await prisma.user.findUnique({
      where: { id: userId },
      select: { photoUrl: true },
    });
    if (!row) return { ok: false };
    // `photoUrl: null` in a Prisma where means IS NULL, which is exactly the
    // precondition wanted when the account had no photo.
    const swapped = await prisma.user.updateMany({
      where: { id: userId, photoUrl: row.photoUrl },
      data: { photoUrl: next },
    });
    if (swapped.count > 0) return { ok: true, previous: row.photoUrl };
  }
  return { ok: false };
}
