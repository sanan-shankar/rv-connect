import { NextResponse } from "next/server";
import { Readable } from "node:stream";
import { vetPhotoDownload } from "@/lib/api-gate";
import { getImageBuffer, keyForUrl } from "@/lib/storage";
import { sharpImage } from "@/lib/image";

/* ------------------------------------------------------------------ *
 *  Saving a photograph as something a person can open.
 *
 *  Every image this app stores is WebP, because WebP is what should travel
 *  over the wire. It is not what should land in somebody's Downloads folder:
 *  the owner, 2026-09-08 -- "when I download images from places it comes as
 *  webp. people can't really use that." Older Photoshop, Preview's print
 *  dialog, most photo printers and half the print shops in India still refuse
 *  a .webp, and an alumnus who wanted a print of 1978 is not going to go and
 *  find a converter.
 *
 *  So the viewer's Download button comes here and gets a JPEG back.
 *
 *  WHY JPEG AND NOT PNG, which the owner asked for first. Measured on three
 *  real archive photographs, 2026-09-08: a 6000x4000 scan is 3.9 MB as JPEG
 *  q92 and 43.5 MB as PNG; 3456x4608 is 2.7 MB against 20.4 MB. Eight to
 *  eleven times the traffic, per press, for no picture: PNG is lossless, but
 *  what it would be losslessly preserving is a WebP that was already lossy,
 *  so it can only store this file's existing compression artefacts perfectly.
 *  PNG is the right answer for a logo or a screenshot and the wrong one for a
 *  photograph.
 *
 *  THE RESPONSE IS STREAMED, and that is not an optimisation. A Vercel
 *  function's response body caps at 4.5 MB and answers 413 past it
 *  (FUNCTION_PAYLOAD_TOO_LARGE); the largest photograph in this Collection is
 *  40 megapixels, which is well over that as a JPEG. Streamed responses are
 *  exempt -- Vercel's own documented way round the cap -- so this pipes sharp
 *  straight to the client and never holds the encoded file. Anything here that
 *  buffers (a `.toBuffer()`, a `NextResponse.json` of the bytes) puts the
 *  biggest photographs in the archive back over the line.
 * ------------------------------------------------------------------ */

/** One decode plus one encode. Measured: ~3.8s for the 40-megapixel worst
 *  case in this Collection, so 60 leaves room for a cold start above it while
 *  still being a budget rather than an open tap (audit C-079). */
export const maxDuration = 60;

/**
 * High enough that nobody can see the second encode, low enough that the file
 * stays a sane size to mail to a classmate. At q92 the 6000x4000 case is
 * 3.9 MB, about half the WebP it came from.
 */
const JPEG_QUALITY = 92;

export async function GET(request: Request) {
  const gate = await vetPhotoDownload();
  if (!gate.ok) return gate.response;

  /* `keyForUrl` is the whole input check. It resolves only URLs on this
     app's own image host, refuses a traversal segment, and refuses anything
     outside the four roots this app writes to (audit C2) -- so a caller
     cannot aim the converter at an arbitrary URL and make this an open
     proxy. It is the same function the delete path trusts. */
  const key = keyForUrl(new URL(request.url).searchParams.get("url"));
  if (!key) {
    return NextResponse.json(
      { error: "That isn't a photograph from this archive." },
      { status: 400 }
    );
  }

  let original: Buffer;
  try {
    original = await getImageBuffer(key);
  } catch {
    return NextResponse.json({ error: "That photograph is no longer there." }, { status: 404 });
  }

  /* `keepExif` rather than a fresh tag: the stored file's EXIF has already
     been reduced to a single DateTimeOriginal at upload, with the GPS a phone
     writes deliberately dropped (audit M12), so keeping what is there keeps
     exactly the date and nothing else. That date is why this route exists in
     the first form the owner asked for on 2026-09-01: the file a classmate
     saves should file itself under 1978 in their photo app, not under today.
     No `.rotate()` -- the stored copy was uprighted at upload and carries no
     orientation tag, so rotating again would tip it over. */
  const encoded = sharpImage(original).keepExif().jpeg({ quality: JPEG_QUALITY, mozjpeg: true });

  return new Response(Readable.toWeb(encoded) as ReadableStream<Uint8Array>, {
    headers: {
      "Content-Type": "image/jpeg",
      /* The client names the file itself, through the anchor's `download`
         attribute, so this carries no filename: a caption put into a header
         is a header-injection question nobody needs to have. `attachment`
         still says what this is for anyone who reaches the URL directly. */
      "Content-Disposition": "attachment",
      /* Private: the bytes are one member's request, and the archive object
         behind them never changes, so a browser may reuse it for an hour. No
         shared cache should hold it -- it is metered per account. */
      "Cache-Control": "private, max-age=3600",
    },
  });
}
