import { list } from "@vercel/blob";

export type StoredImage = {
  url: string;
  downloadUrl: string;
  pathname: string;
  size: number;
  uploadedAt: string;
};

export async function listImages() {
  const { blobs } = await list({
    prefix: "uploads/",
    limit: 1000
  });

  return blobs
    .map<StoredImage>((blob) => ({
      url: blob.url,
      downloadUrl: blob.downloadUrl,
      pathname: blob.pathname,
      size: blob.size,
      uploadedAt: blob.uploadedAt.toISOString()
    }))
    .sort(
      (left, right) =>
        new Date(right.uploadedAt).getTime() - new Date(left.uploadedAt).getTime()
    );
}

