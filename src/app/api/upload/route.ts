import { NextResponse } from "next/server";
import { createId } from "@paralleldrive/cuid2";
import { putImage, ownerPrefix } from "@/lib/storage";
import { countImageFrames, describeImage, toDisplayWebp, type ImageFacts } from "@/lib/image";
import { recordImage } from "@/lib/image-record";
import { purgeImageUrls } from "@/lib/image-purge";
import {
  MAX_UPLOAD_BYTES,
  heicRefusal,
  isUnsupportedHeic,
  describeProcessingError,
  sniffImageType,
  isImageFile,
  stillPictureNotice,
} from "@/lib/upload-shared";
import { vetUploadRequest } from "@/lib/api-gate";
// The one argued-for "three photos per post" cap, from the pure rule module
// the ownership check already uses. Each upload door used to retype it.
import { MAX_IMAGES } from "@/lib/upload-ownership-rule";

/** The proxied upload path: up to MAX_IMAGES images, each decoded and
 *  re-encoded through sharp. Same reason as the Collection page's, which
 *  carries the measurements (audit C-079). */
export const maxDuration = 60;

export async function POST(request: Request) {
  // This one takes a multipart body from any signed-in session, so the gates
  // belong at the ROUTE and not only in the actions that call it.
  const vet = await vetUploadRequest(request);
  if (!vet.ok) return vet.response;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    // Thrown when the body arrives truncated, whether from a dropped
    // connection or from exceeding a platform/proxy body-size cap -- both
    // look identical here, so name both possibilities rather than guess.
    return NextResponse.json(
      {
        error:
          "The upload didn't make it through. The photo may be too large, or the connection dropped. Try a smaller photo or check your connection.",
      },
      { status: 400 }
    );
  }

  const files = formData.getAll("files") as File[];

  if (files.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  if (files.length > MAX_IMAGES) {
    return NextResponse.json(
      { error: `Maximum ${MAX_IMAGES} images allowed` },
      { status: 400 }
    );
  }

  const urls: string[] = [];
  /** What each stored image turned out to look like -- shape, focal point, a
   *  smear to hold its place. Recorded server-side against the URL either way;
   *  handed back as well so a composer can reserve the right space for a photo
   *  it is about to show, without a second round trip to read it again. */
  const images: (ImageFacts & { url: string })[] = [];
  /** Things the member should know about what we did to their file. See the
   *  animated-GIF branch below; the response omits this key entirely when
   *  there is nothing to say. */
  const notices: string[] = [];

  /* Three photos are uploaded in one request, one at a time, and a refusal
     partway through returns an error the client shows instead of a post. The
     files ALREADY stored by then were nobody's: their URLs go out in no
     response, no row ever names them, and nothing in this system can list the
     bucket to find them again (audit C-064). So every exit from this loop
     takes back what the loop has stored. */
  const abort = async (body: { error: string }, status: number) => {
    await purgeImageUrls(urls, "abandoned");
    return NextResponse.json(body, { status });
  };

  for (const file of files) {
    if (!isImageFile(file)) {
      return abort({ error: `"${file.name}" isn't an image file` }, 400);
    }

    if (isUnsupportedHeic(file)) {
      return abort({ error: heicRefusal(file.name) }, 400);
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return abort(
        { error: `"${file.name}" is over the 20MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB)` },
        400
      );
    }

    try {
      const buffer = Buffer.from(await file.arrayBuffer());

      // The client's MIME string got the file this far; the bytes themselves
      // decide whether it is really an image, before libvips parses it (M13).
      if (!sniffImageType(buffer)) {
        return abort(
          { error: `"${file.name}" doesn't look like a JPG, PNG, GIF or WebP image.` },
          400
        );
      }

      /* An animated GIF becomes a still here, and used to do so in silence
         (audit M15). sharp reads a GIF as a single page unless told otherwise,
         so every frame after the first was dropped with nothing said, and a
         member who posted a reaction GIF got back a motionless first frame
         with no idea why. Re-encoding to animated WebP is not the fix taken:
         the frame count multiplies the decode budget, and an upload path is
         not where to find out that a hundred-frame GIF exhausts a serverless
         function's memory. So it is still a still, and the response now SAYS
         so, which is the part that was actually wrong. */
      const frames = await countImageFrames(buffer);
      if (frames > 1) {
        notices.push(stillPictureNotice(file.name));
      }

      const id = createId();

      // Process with sharp: resize + convert to WebP. The object key is scoped
      // to the uploader (`uploads/<their id>/...`) so ownership is provable at
      // the point a post later references this URL (audit C2).
      const webpBuffer = await toDisplayWebp(buffer);

      const url = await putImage(webpBuffer, ownerPrefix("uploads", vet.userId), `${id}.webp`);
      urls.push(url);
      const facts = await describeImage(webpBuffer);
      if (facts) {
        images.push({ url, ...facts });
        await recordImage(url, facts);
      }
    } catch (error) {
      console.error("Upload processing error:", error);
      return abort({ error: describeProcessingError(error) }, 422);
    }
  }

  return NextResponse.json(notices.length > 0 ? { urls, images, notices } : { urls, images });
}
