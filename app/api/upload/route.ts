import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const allowedTypes = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/avif"
]);

function sanitizeFilename(filename: string) {
  const sanitized = filename
    .toLowerCase()
    .replace(/[^a-z0-9. -]/g, "")
    .trim()
    .replace(/\s+/g, "-");

  return sanitized || "image";
}

export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("image");

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "Image file is required." }, { status: 400 });
    }

    if (!allowedTypes.has(file.type)) {
      return NextResponse.json(
        { error: "Only PNG, JPG, WEBP, GIF, and AVIF images are allowed." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Image exceeds the 10 MB limit." },
        { status: 400 }
      );
    }

    const blob = await put(`uploads/${Date.now()}-${sanitizeFilename(file.name)}`, file, {
      access: "public",
      addRandomSuffix: true
    });

    return NextResponse.json({
      downloadUrl: blob.url,
      url: blob.url,
      pathname: blob.pathname,
      size: file.size,
      uploadedAt: new Date().toISOString()
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected upload error.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
