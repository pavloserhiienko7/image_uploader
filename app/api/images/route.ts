import { del } from "@vercel/blob";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { listImages } from "@/lib/blob";
import { updateImageMetadata } from "@/lib/image-metadata";

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

export async function PATCH(request: Request) {
  const unauthorizedResponse = await requireSession();

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  try {
    const payload = (await request.json()) as {
      pathname?: unknown;
      hideDelete?: unknown;
      usageComment?: unknown;
    };

    if (typeof payload.pathname !== "string" || payload.pathname.trim() === "") {
      return NextResponse.json(
        { error: "Image pathname is required." },
        { status: 400 }
      );
    }

    const patch: {
      hideDelete?: boolean;
      usageComment?: string;
    } = {};

    if ("hideDelete" in payload) {
      if (typeof payload.hideDelete !== "boolean") {
        return NextResponse.json(
          { error: "hideDelete must be a boolean." },
          { status: 400 }
        );
      }

      patch.hideDelete = payload.hideDelete;
    }

    if ("usageComment" in payload) {
      if (typeof payload.usageComment !== "string") {
        return NextResponse.json(
          { error: "usageComment must be a string." },
          { status: 400 }
        );
      }

      patch.usageComment = payload.usageComment.trim();
    }

    if (!("hideDelete" in patch) && !("usageComment" in patch)) {
      return NextResponse.json(
        { error: "At least one metadata field must be provided." },
        { status: 400 }
      );
    }

    const images = await listImages();
    const image = images.find((item) => item.pathname === payload.pathname);

    if (!image) {
      return NextResponse.json({ error: "Image not found." }, { status: 404 });
    }

    const metadata = await updateImageMetadata(payload.pathname, patch);

    return NextResponse.json({
      success: true,
      image: {
        ...image,
        ...metadata
      }
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update image metadata.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
