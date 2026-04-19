"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";

type UploadState = {
  downloadUrl: string;
  pathname: string;
  size: number;
};

export function UploaderCard() {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadState | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const file = formData.get("image");

    if (!(file instanceof File) || file.size === 0) {
      setError("Choose an image before uploading.");
      return;
    }

    setIsUploading(true);
    setResult(null);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData
      });

      const payload = (await response.json()) as UploadState | { error?: string };

      if (!response.ok || !("downloadUrl" in payload)) {
        const errorMessage = "error" in payload ? payload.error : undefined;
        throw new Error(errorMessage ?? "Upload failed.");
      }

      setResult(payload);
      form.reset();
    } catch (uploadError) {
      const message =
        uploadError instanceof Error ? uploadError.message : "Upload failed.";
      setError(message);
    } finally {
      setIsUploading(false);
    }
  }

  async function copyLink() {
    if (!result) {
      return;
    }

    await navigator.clipboard.writeText(result.downloadUrl);
  }

  return (
    <section className="card">
      <form className="upload-form" onSubmit={handleSubmit}>
        <label className="dropzone" htmlFor="image">
          <span>Select image</span>
          <input
            id="image"
            name="image"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
          />
          <small>PNG, JPG, WEBP, GIF, AVIF up to 10 MB</small>
        </label>

        <button className="primary-button" type="submit" disabled={isUploading}>
          {isUploading ? "Uploading..." : "Upload image"}
        </button>
      </form>

      {error ? <p className="message error">{error}</p> : null}

      {result ? (
        <div className="result-panel">
          <p className="message success">Image uploaded successfully.</p>
          <div className="result-row">
            <input readOnly value={result.downloadUrl} aria-label="Direct image URL" />
            <button className="secondary-button" type="button" onClick={copyLink}>
              Copy link
            </button>
          </div>
          <p className="meta">
            Path: <code>{result.pathname}</code> | Size:{" "}
            {Math.round(result.size / 1024)} KB
          </p>
          <div className="preview-frame">
            <Image
              src={result.downloadUrl}
              alt="Uploaded preview"
              width={1200}
              height={900}
              unoptimized
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}
