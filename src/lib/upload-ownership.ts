import { isUploadedImageUrl } from "@/lib/upload-shared";
import { keyForUrl } from "@/lib/storage";
import { decideOwnedUploads, MAX_IMAGES } from "@/lib/upload-ownership-rule";

export { MAX_IMAGES };

/**
 * The write-time half of the C2 fix (the read-time key scheme is in
 * storage.ts). Every path that lets a member attach image URLs of their own
 * choosing to a row — a post, a letter draft, a Catch-up answer — runs the
 * list through here first, against the SESSION user's id.
 *
 * URL parsing is delegated to the one real parser in storage.ts; the verdict
 * (cap + owner-prefix) is the pure rule in upload-ownership-rule.ts. See the
 * rule file for why the two are split.
 *
 *   1. `isUploadedImageUrl` — a URL this app minted, not an arbitrary external
 *      one, which would be a tracking pixel served to every reader (M10) and,
 *      for the Collection/avatar roots, the lever that made C2 catastrophic.
 *   2. The object key sits under the caller's OWN `uploads/<their id>/` prefix.
 *      The server wrote that id into the key at upload time and no request can
 *      forge it, so member A cannot reference member B's image (or a heritage
 *      Collection photo) and then delete the carrying row to destroy it.
 *
 * Returns the cleaned list on success.
 */
export type OwnershipResult =
  | { ok: true; urls: string[] }
  | { ok: false; error: string };

export function ownedUploadUrls(urls: unknown, userId: string): OwnershipResult {
  if (!Array.isArray(urls)) return { ok: false, error: "Photos are in an unexpected shape." };
  const candidates = urls.map((url) => ({
    minted: typeof url === "string" && isUploadedImageUrl(url),
    key: typeof url === "string" ? keyForUrl(url) : null,
  }));
  const verdict = decideOwnedUploads(candidates, userId);
  if (!verdict.ok) return verdict;
  return { ok: true, urls: urls as string[] };
}
