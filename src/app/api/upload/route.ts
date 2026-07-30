import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import sharp from "sharp";
import { createId } from "@paralleldrive/cuid2";
import { putImage } from "@/lib/storage";
import { MAX_UPLOAD_BYTES, isUnsupportedHeic, describeProcessingError } from "@/lib/upload-shared";

const MAX_FILES = 3;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
      const id = createId();

      // Process with sharp: resize + convert to WebP
      const webpBuffer = await sharp(buffer)
        .rotate()
        .resize(1920, 1920, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 80 })
        .toBuffer();

      const url = await putImage(webpBuffer, "uploads", `${id}.webp`);
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
