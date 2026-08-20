import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createId } from "@paralleldrive/cuid2";
import { putImage, ownerPrefix } from "@/lib/storage";
import { sharpImage } from "@/lib/image";
import {
  MAX_UPLOAD_BYTES,
  isUnsupportedHeic,
  describeProcessingError,
  sniffImageType,
} from "@/lib/upload-shared";
import { requireVerifiedMember } from "@/lib/member-gate";
import { rateLimit } from "@/lib/rate-limit";

const MAX_FILES = 3;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Storage costs money and a bucket full of somebody else's images is not
  // undoable, so writing bytes waits for a confirmed address. Checked at the
  // ROUTE, not only in the actions that call it: this endpoint accepts a
  // multipart body from any signed-in session and would otherwise be reachable
  // straight from a console regardless of what the composer allows.
  const gate = await requireVerifiedMember();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: 403 });
  }

  // One hourly uploads allowance per account, shared across every route
  // bytes can travel through (audit M2).
  const limited = await rateLimit("uploads", session.user.id);
  if (!limited.ok) {
    return NextResponse.json({ error: limited.error }, { status: 429 });
  }

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

  if (files.length > MAX_FILES) {
    return NextResponse.json(
      { error: `Maximum ${MAX_FILES} images allowed` },
      { status: 400 }
    );
  }

  const urls: string[] = [];

  for (const file of files) {
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: `"${file.name}" isn't an image file` },
        { status: 400 }
      );
    }

    if (isUnsupportedHeic(file)) {
      return NextResponse.json(
        {
          error: `"${file.name}" is a HEIC/HEIF photo, which isn't supported yet. Export it as JPG or PNG (or turn off "High Efficiency" in your camera settings) and try again.`,
        },
        { status: 400 }
      );
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: `"${file.name}" is over the 20MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB)` },
        { status: 400 }
      );
    }

    try {
      const buffer = Buffer.from(await file.arrayBuffer());

      // The client's MIME string got the file this far; the bytes themselves
      // decide whether it is really an image, before libvips parses it (M13).
      if (!sniffImageType(buffer)) {
        return NextResponse.json(
          { error: `"${file.name}" doesn't look like a JPG, PNG, GIF or WebP image.` },
          { status: 400 }
        );
      }

      const id = createId();

      // Process with sharp: resize + convert to WebP. The object key is scoped
      // to the uploader (`uploads/<their id>/...`) so ownership is provable at
      // the point a post later references this URL (audit C2).
      const webpBuffer = await sharpImage(buffer)
        .rotate()
        .resize(1920, 1920, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 80 })
        .toBuffer();

      const url = await putImage(webpBuffer, ownerPrefix("uploads", session.user.id), `${id}.webp`);
      urls.push(url);
    } catch (error) {
      console.error("Upload processing error:", error);
      return NextResponse.json(
        { error: describeProcessingError(error) },
        { status: 422 }
      );
    }
  }

  return NextResponse.json({ urls });
}
