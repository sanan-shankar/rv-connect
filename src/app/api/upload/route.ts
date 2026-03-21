import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import sharp from "sharp";
import { createId } from "@paralleldrive/cuid2";
import { put } from "@vercel/blob";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    if (files.length > 3) {
      return NextResponse.json(
        { error: "Maximum 3 images allowed" },
        { status: 400 }
      );
    }

    const urls: string[] = [];

    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          { error: "Each file must be under 5MB" },
          { status: 400 }
        );
      }

      if (!file.type.startsWith("image/")) {
        return NextResponse.json(
          { error: "Only image files are allowed" },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const id = createId();
      const filename = `${id}.webp`;

      // Process with sharp: resize + convert to WebP
      const webpBuffer = await sharp(buffer)
        .resize(1920, 1920, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 80 })
        .toBuffer();

      if (useBlob) {
        // Production: use Vercel Blob
        const now = new Date();
        const blobPath = `uploads/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${filename}`;
        const { url } = await put(blobPath, webpBuffer, {
          access: "public",
          contentType: "image/webp",
        });
        urls.push(url);
      } else {
        // Local dev: write to filesystem
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const uploadDir = path.join(process.cwd(), "public", "uploads", String(year), month);
        await mkdir(uploadDir, { recursive: true });
        await writeFile(path.join(uploadDir, filename), webpBuffer);
        urls.push(`/uploads/${year}/${month}/${filename}`);
      }
    }

    return NextResponse.json({ urls });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload images" },
      { status: 500 }
    );
  }
}
