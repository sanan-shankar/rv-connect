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

/** The prefix a member's own post images live under: `uploads/<userId>/`. */
export function ownUploadsPrefix(userId: string): string {
  return `uploads/${userId}/`;
}

export type Candidate = {
  /** Whether the URL is one this app minted (origin check, audit M10). */
  minted: boolean;
  /** The object key it resolves to, or null if it is not ours at all. */
  key: string | null;
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
    if (!c.minted) return { ok: false, error: "That photo isn't one uploaded here." };
    if (!c.key || !c.key.startsWith(prefix)) {
      return { ok: false, error: "That photo isn't one you uploaded." };
    }
  }
  return { ok: true };
}
