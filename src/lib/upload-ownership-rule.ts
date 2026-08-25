/**
 * The pure decision behind the C2 write-time ownership check, with NO relative
 * imports so `node` can run its unit test directly (the same constraint the
 * Phase 4 human-pass rule documents: a -rule file that imports a sibling .ts
 * cannot be executed by the test runner, which only strips types).
 *
 * The env-dependent facts — "did this app mint that URL" and "what object key
 * does it resolve to" — are computed by the caller (upload-ownership.ts, using
 * the one real key parser in storage.ts) and handed in here as plain data, so
 * this file never re-implements URL parsing and cannot drift from it. What it
 * owns is the actual verdict: the array cap, and that every key sits under the
 * caller's own upload prefix.
 */

export const MAX_IMAGES = 3;

/**
 * The longest an image URL may be.
 *
 * Ownership alone did not bound LENGTH, and nothing else on the path did
 * either: `postSchema.images` is a bare `z.string()`, `parseImageUrls` only
 * checks the JSON parses into strings, and the key parser is happy with any
 * number of characters after the prefix. So a URL of the form
 * `https://images.rishivalley.space/uploads/<own id>/<megabytes of junk>.webp`
 * passed every check and was stored verbatim in a column that every feed
 * reader downloads and re-parses per render (audit C-169). The sibling
 * `targetBatches` field was capped for the identical reason (M43), and
 * admin-message screenshots already carry a .max(500).
 *
 * 512, against a real minted URL of well under 120 characters -- generous
 * enough that nothing legitimate is near it, small enough that the junk
 * version is refused outright rather than metered.
 */
export const MAX_IMAGE_URL = 512;

/** The prefix a member's own post images live under: `uploads/<userId>/`. */
export function ownUploadsPrefix(userId: string): string {
  return `uploads/${userId}/`;
}

export type Candidate = {
  /** Whether the URL is one this app minted (origin check, audit M10). */
  minted: boolean;
  /** The object key it resolves to, or null if it is not ours at all. */
  key: string | null;
  /** How long the URL itself is, in characters (audit C-169). */
  length: number;
};

export type OwnershipVerdict =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Decide a whole candidate list for `userId`. The write is refused unless
 * every entry is app-minted AND owned by the caller, and there are at most
 * MAX_IMAGES of them.
 */
export function decideOwnedUploads(
  candidates: Candidate[],
  userId: string
): OwnershipVerdict {
  if (candidates.length > MAX_IMAGES) {
    return { ok: false, error: `Up to ${MAX_IMAGES} photos.` };
  }
  const prefix = ownUploadsPrefix(userId);
  for (const c of candidates) {
    /* Length first, because the checks below are prefix comparisons that a
       megabyte-long string satisfies just as cheaply as a real URL does.

       Written as `!(<= cap)` rather than `> cap`, so a candidate built without
       a length -- a caller that forgot the field, which TypeScript catches but
       a .mjs test does not -- is REFUSED rather than waved through by
       `undefined > 512` being false. A cap that silently stops applying is
       worse than no cap, because everything downstream still believes in it. */
    if (!(c.length <= MAX_IMAGE_URL)) {
      return { ok: false, error: "That photo's link is too long to be one of ours." };
    }
    if (!c.minted) return { ok: false, error: "That photo isn't one uploaded here." };
    if (!c.key || !c.key.startsWith(prefix)) {
      return { ok: false, error: "That photo isn't one you uploaded." };
    }
  }
  return { ok: true };
}
