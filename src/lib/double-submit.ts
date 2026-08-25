/**
 * How long two identical writes count as one double submission.
 *
 * Several things a member creates are free text, so no unique index can dedupe
 * them, and the only other protection is a client's in-flight guard -- which
 * cannot see a second tab, a retried request, or a hand-made call (audit M35,
 * Low 29). Where that matters, the write looks for its own twin inside this
 * window and hands back the first one rather than making a second.
 *
 * Ten seconds is longer than any double tap or slow-connection retry, and far
 * shorter than a person deciding to say or start the same thing again on
 * purpose. One number, in one place, so the feed and Catch-ups cannot come to
 * different views of what "twice at once" means.
 *
 * No imports, so `node --test` can load anything that uses it.
 */
export const DOUBLE_SUBMIT_MS = 10_000;

/**
 * Whether a candidate row inside the window is the SAME post as the one being
 * created, rather than merely one carrying the same words.
 *
 * The window query can only match columns, and it matched author + text +
 * kind + status alone. That is not a post: two photographs shared seconds
 * apart under the caption "Reunion!" are two posts, and the second was
 * swallowed while the composer said "Post shared!" (audit C-009). The
 * attachments, the letter's title and the poll are as much the post as the
 * body is, so a twin has to agree about all of them.
 *
 * `images` is compared as the stored string because both sides are built the
 * same way -- normalised and de-duplicated by ownedUploadUrls, then
 * JSON.stringify'd -- so equal lists give equal text, and a different ORDER is
 * a different post to whoever reads it.
 *
 * Pure and importless so `node --test` can load it.
 */
export function isPostTwin(
  candidate: {
    title: string | null;
    images: string | null;
    pollOptions: { text: string; position: number }[];
  },
  incoming: { title: string | null; images: string | null; pollOptions: string[] }
): boolean {
  if ((candidate.title ?? "") !== (incoming.title ?? "")) return false;
  if ((candidate.images ?? "") !== (incoming.images ?? "")) return false;
  const stored = [...candidate.pollOptions]
    .sort((a, b) => a.position - b.position)
    .map((o) => o.text);
  if (stored.length !== incoming.pollOptions.length) return false;
  return stored.every((text, i) => text === incoming.pollOptions[i]);
}
