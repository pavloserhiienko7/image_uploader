import { del } from "@vercel/blob";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { listImages } from "@/lib/blob";

async function requireSession() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  return null;
}

export async function GET() {
  const unauthorizedResponse = await requireSession();

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  try {
    const images = await listImages();
    return NextResponse.json(images);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load images.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const unauthorizedResponse = await requireSession();

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  try {
    const { searchParams } = new URL(request.url);
    const target = searchParams.get("url") ?? searchParams.get("pathname");

    if (!target) {
      return NextResponse.json(
        { error: "Image url or pathname is required." },
        { status: 400 }
      );
    }

    await del(target);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete image.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

