import { list } from "@vercel/blob";
import { defaultImageMetadata, getImageMetadata, readImageMetadataIndex } from "@/lib/image-metadata";

export type StoredImage = {
  url: string;
  downloadUrl: string;
  pathname: string;
  size: number;
  uploadedAt: string;
  hideDelete: boolean;
  usageComment: string;
};

export async function listImages() {
  const metadataIndex = await readImageMetadataIndex();
  const { blobs } = await list({
    prefix: "uploads/",
    limit: 1000
  });

  return blobs
    .map<StoredImage>((blob) => {
      const metadata = getImageMetadata(metadataIndex, blob.pathname);

      return {
        url: blob.url,
        downloadUrl: blob.downloadUrl,
        pathname: blob.pathname,
        size: blob.size,
        uploadedAt: blob.uploadedAt.toISOString(),
        hideDelete: metadata.hideDelete ?? defaultImageMetadata.hideDelete,
        usageComment: metadata.usageComment ?? defaultImageMetadata.usageComment
      };
    })
    .sort(
      (left, right) =>
        new Date(right.uploadedAt).getTime() - new Date(left.uploadedAt).getTime()
    );
}
