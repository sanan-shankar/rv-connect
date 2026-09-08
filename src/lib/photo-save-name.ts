/* ------------------------------------------------------------------ *
 *  What a saved photograph is called on somebody's computer.
 *
 *  The viewer's Download button used to hand back the object key: a member
 *  who saved four photographs from a 1978 album got four files named
 *  `dw8j9tcpcln8puf1mjrqj3rt.webp`. The extension was the loud half of that
 *  problem and /api/photo/download fixes it; the name is the quiet half, and
 *  it is the half that decides whether the file is findable again a year
 *  later. Both are settled here so the two never disagree.
 *
 *  Client-safe on purpose -- the viewer is a client component, and the name
 *  is set by the anchor's `download` attribute rather than by a response
 *  header, precisely so no caption ever reaches a header.
 * ------------------------------------------------------------------ */

/** Everything the archive hands back is now a JPEG. See the route. */
const EXTENSION = ".jpg";

/**
 * Long enough for a real caption, short enough that no filesystem or mail
 * client truncates it into nonsense. 72 characters plus the extension sits
 * comfortably under every limit worth naming (Windows' 255, and the ~143 an
 * encrypted Linux home directory allows).
 */
const MAX_STEM = 72;

/** The characters Windows refuses in a filename. */
const RESERVED = new Set(["\\", "/", ":", "*", "?", '"', "<", ">", "|"]);

/**
 * Is this character one no filename may carry?
 *
 * The reserved set above, widened by the control characters -- a caption is
 * member-written text and may hold any of them, and a stray newline in a
 * `download` attribute is not something to find out about later. Tested by
 * code point rather than by a regex class, because the escapes for that class
 * are exactly the kind of thing a later edit silently corrupts.
 */
function unusable(ch: string): boolean {
  const code = ch.codePointAt(0) ?? 0;
  return RESERVED.has(ch) || code < 0x20 || code === 0x7f;
}

/**
 * Reduce any text to something safe to save under.
 *
 * A leading dot goes as well as the reserved characters: a file starting
 * with one is hidden on macOS and Linux, which is not what a member expects
 * of a photograph they just saved.
 */
function tidy(text: string): string {
  return Array.from(text)
    .map((ch) => (unusable(ch) ? " " : ch))
    .join("")
    .replace(/\s+/g, " ")
    /* A run of dots collapses to one. Nothing here is resolved as a path, so
       this is not the guard against traversal -- `keyForUrl` is, server-side.
       It is so a caption never produces a file called "Rishi Valley 1978 ..
       .. etc passwd", which reads as an attempt whether or not it is one. */
    .replace(/\.{2,}/g, ".")
    .replace(/^[.\s]+/, "")
    .replace(/[.\s]+$/, "")
    .slice(0, MAX_STEM)
    .trim();
}

/**
 * The name for a Collection photograph: where it is from, when it was taken,
 * and what it is of, in the order somebody scanning a folder reads.
 *
 * "Rishi Valley 1978 Sports day". The date is whatever precision the
 * contributor gave and is simply absent when they gave none -- never
 * invented, and never the day it was scanned, the same rule the caption line
 * in the viewer follows.
 */
export function collectionSaveName(
  caption?: string | null,
  takenLabel?: string | null
): string {
  const stem = tidy(["Rishi Valley", takenLabel ?? "", caption ?? ""].join(" "));
  return stem || "Rishi Valley photograph";
}

/**
 * The name the browser saves under: the caller's if it gave one, otherwise
 * the URL's own basename, always ending in the extension we actually send.
 *
 * Replacing the extension rather than appending one is the point. Without it
 * a file arrives as `photo.webp.jpg`, which every operating system will show
 * as a WebP that will not open -- the exact confusion this whole change is
 * about, wearing the right suffix.
 */
export function photoSaveName(preferred: string | undefined, src: string): string {
  const fromUrl = () => {
    const clean = src.split("?")[0];
    return clean.slice(clean.lastIndexOf("/") + 1);
  };
  const stem = tidy(preferred || fromUrl()).replace(/\.[A-Za-z0-9]{1,5}$/, "");
  return (stem || "photograph") + EXTENSION;
}
