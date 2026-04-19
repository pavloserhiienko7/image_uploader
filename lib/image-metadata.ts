import { del, list, put } from "@vercel/blob";

const METADATA_PREFIX = "system/image-library-metadata/";

function getMetadataPath() {
  return `${METADATA_PREFIX}${Date.now()}.json`;
}

export type ImageMetadata = {
  hideDelete: boolean;
  usageComment: string;
};

type ImageMetadataIndex = Record<string, ImageMetadata>;

export const defaultImageMetadata: ImageMetadata = {
  hideDelete: false,
  usageComment: ""
};

function normalizeMetadata(value: unknown): ImageMetadata {
  if (!value || typeof value !== "object") {
    return { ...defaultImageMetadata };
  }

  const candidate = value as Partial<ImageMetadata>;

  return {
    hideDelete:
      typeof candidate.hideDelete === "boolean"
        ? candidate.hideDelete
        : defaultImageMetadata.hideDelete,
    usageComment:
      typeof candidate.usageComment === "string"
        ? candidate.usageComment
        : defaultImageMetadata.usageComment
  };
}

export async function readImageMetadataIndex() {
  const { blobs } = await list({
    prefix: METADATA_PREFIX,
    limit: 1000
  });

  const metadataBlob = blobs
    .sort((left, right) => right.uploadedAt.getTime() - left.uploadedAt.getTime())[0];

  if (!metadataBlob) {
    return {} satisfies ImageMetadataIndex;
  }

  try {
    const response = await fetch(metadataBlob.url, {
      cache: "no-store"
    });

    if (!response.ok) {
      return {} satisfies ImageMetadataIndex;
    }

    const payload = (await response.json()) as unknown;

    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return {} satisfies ImageMetadataIndex;
    }

    return Object.fromEntries(
      Object.entries(payload).map(([pathname, value]) => [
        pathname,
        normalizeMetadata(value)
      ])
    ) satisfies ImageMetadataIndex;
  } catch {
    return {} satisfies ImageMetadataIndex;
  }
}

export async function writeImageMetadataIndex(index: ImageMetadataIndex) {
  const { blobs } = await list({
    prefix: METADATA_PREFIX,
    limit: 1000
  });

  const nextMetadataPath = getMetadataPath();
  const nextBlob = await put(nextMetadataPath, JSON.stringify(index, null, 2), {
    access: "public",
    addRandomSuffix: false,
    contentType: "application/json",
    cacheControlMaxAge: 1
  });

  const staleMetadataUrls = blobs
    .filter((blob) => blob.pathname !== nextBlob.pathname)
    .map((blob) => blob.url);

  if (staleMetadataUrls.length > 0) {
    await del(staleMetadataUrls);
  }
}

export function getImageMetadata(
  index: ImageMetadataIndex,
  pathname: string
): ImageMetadata {
  return normalizeMetadata(index[pathname]);
}

export async function updateImageMetadata(
  pathname: string,
  patch: Partial<ImageMetadata>
) {
  const index = await readImageMetadataIndex();
  const nextMetadata = {
    ...getImageMetadata(index, pathname),
    ...patch
  };

  if (!nextMetadata.hideDelete && nextMetadata.usageComment === "") {
    delete index[pathname];
  } else {
    index[pathname] = nextMetadata;
  }

  await writeImageMetadataIndex(index);

  return getImageMetadata(index, pathname);
}
