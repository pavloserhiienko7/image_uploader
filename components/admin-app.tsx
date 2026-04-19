"use client";

import Image from "next/image";
import {
  ChangeEvent,
  DragEvent,
  FormEvent,
  useEffect,
  useRef,
  useState
} from "react";
import { useRouter } from "next/navigation";
import type { StoredImage } from "@/lib/blob";

type AdminAppProps = {
  images: StoredImage[];
  isAuthenticated: boolean;
  isConfigured: boolean;
};

type LastUploadState = StoredImage | null;
type CommentDrafts = Record<string, string>;
type SavingState = Record<string, { hideDelete?: boolean; usageComment?: boolean }>;
type MetadataErrors = Record<string, string | undefined>;
type SaveQueue = Record<string, Promise<unknown>>;

function getGalleryCountLabel(images: StoredImage[]) {
  if (images.length === 1) {
    return "1 stored image";
  }

  return `${images.length} stored images`;
}

function buildCommentDrafts(images: StoredImage[]) {
  return Object.fromEntries(
    images.map((image) => [image.pathname, image.usageComment])
  ) satisfies CommentDrafts;
}

function formatFileSize(size: number) {
  const kilobytes = size / 1024;

  if (kilobytes < 1024) {
    return `${Math.max(1, Math.round(kilobytes))} KB`;
  }

  return `${(kilobytes / 1024).toFixed(1)} MB`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function AdminApp({
  images: initialImages,
  isAuthenticated,
  isConfigured
}: AdminAppProps) {
  const router = useRouter();
  const [images, setImages] = useState(initialImages);
  const [lastUpload, setLastUpload] = useState<LastUploadState>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [panelError, setPanelError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingPathname, setDeletingPathname] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [commentDrafts, setCommentDrafts] = useState<CommentDrafts>(
    buildCommentDrafts(initialImages)
  );
  const [savingState, setSavingState] = useState<SavingState>({});
  const [metadataErrors, setMetadataErrors] = useState<MetadataErrors>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const saveQueueRef = useRef<SaveQueue>({});

  const galleryCountLabel = getGalleryCountLabel(images);

  function syncImages(nextImages: StoredImage[]) {
    setImages(nextImages);
    setCommentDrafts(buildCommentDrafts(nextImages));
  }

  function updateImageInState(
    pathname: string,
    patch: Partial<StoredImage>,
    options?: { syncDraft?: boolean }
  ) {
    setImages((current) =>
      current.map((image) =>
        image.pathname === pathname ? { ...image, ...patch } : image
      )
    );

    if (options?.syncDraft && typeof patch.usageComment === "string") {
      setCommentDrafts((current) => ({
        ...current,
        [pathname]: patch.usageComment as string
      }));
    }
  }

  useEffect(() => {
    async function loadImages() {
      if (!isAuthenticated) {
        return;
      }

      setGalleryLoading(true);

      try {
        const response = await fetch("/api/images", {
          method: "GET",
          cache: "no-store"
        });

        const payload = (await response.json()) as StoredImage[] | { error?: string };

        if (!response.ok || !Array.isArray(payload)) {
          const errorMessage =
            !Array.isArray(payload) && "error" in payload ? payload.error : undefined;
          throw new Error(errorMessage ?? "Failed to load images.");
        }

        syncImages(payload);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to load images.";
        setPanelError(message);
      } finally {
        setGalleryLoading(false);
      }
    }

    void loadImages();
  }, [isAuthenticated]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthError(null);
    setAuthLoading(true);

    const formData = new FormData(event.currentTarget);
    const username = formData.get("username");
    const password = formData.get("password");

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ username, password })
      });

      const payload = (await response.json()) as { success?: boolean; error?: string };

      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? "Login failed.");
      }

      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Login failed.";
      setAuthError(message);
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/logout", {
      method: "POST"
    });

    router.refresh();
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPanelError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const file = formData.get("image");

    if (!(file instanceof File) || file.size === 0) {
      setPanelError("Choose an image before uploading.");
      return;
    }

    setUploading(true);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData
      });

      const payload = (await response.json()) as
        | (StoredImage & { error?: never })
        | { error?: string };

      if (!response.ok || !("downloadUrl" in payload)) {
        const errorMessage = "error" in payload ? payload.error : undefined;
        throw new Error(errorMessage ?? "Upload failed.");
      }

      setLastUpload(payload);
      setImages((current) => [payload, ...current]);
      setCommentDrafts((current) => ({
        [payload.pathname]: payload.usageComment,
        ...current
      }));
      setSelectedFileName(null);
      form.reset();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed.";
      setPanelError(message);
    } finally {
      setUploading(false);
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0];
    setSelectedFileName(nextFile?.name ?? null);
  }

  function handleDragOver(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDraggingFile(true);
  }

  function handleDragLeave(event: DragEvent<HTMLLabelElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setIsDraggingFile(false);
    }
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDraggingFile(false);

    const droppedFile = event.dataTransfer.files?.[0];

    if (!droppedFile) {
      return;
    }

    const input = fileInputRef.current;

    if (input) {
      const transfer = new DataTransfer();
      transfer.items.add(droppedFile);
      input.files = transfer.files;
    }

    setSelectedFileName(droppedFile.name);
    setPanelError(null);
  }

  async function handleDelete(image: StoredImage) {
    setPanelError(null);
    setDeletingPathname(image.pathname);

    try {
      const response = await fetch(
        `/api/images?url=${encodeURIComponent(image.url)}`,
        {
          method: "DELETE"
        }
      );

      const payload = (await response.json()) as { success?: boolean; error?: string };

      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? "Delete failed.");
      }

      setImages((current) => current.filter((item) => item.pathname !== image.pathname));
      setCommentDrafts((current) => {
        const nextState = { ...current };
        delete nextState[image.pathname];
        return nextState;
      });
      setSavingState((current) => {
        const nextState = { ...current };
        delete nextState[image.pathname];
        return nextState;
      });
      setMetadataErrors((current) => {
        const nextState = { ...current };
        delete nextState[image.pathname];
        return nextState;
      });
      setLastUpload((current) =>
        current?.pathname === image.pathname ? null : current
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Delete failed.";
      setPanelError(message);
    } finally {
      setDeletingPathname(null);
    }
  }

  async function copyLink(url: string) {
    await navigator.clipboard.writeText(url);
  }

  async function saveImageMetadata(
    pathname: string,
    patch: { hideDelete?: boolean; usageComment?: string }
  ) {
    const queuedSave = async () => {
      const nextSavingState = {
        hideDelete: typeof patch.hideDelete === "boolean" ? true : undefined,
        usageComment: typeof patch.usageComment === "string" ? true : undefined
      };

      setMetadataErrors((current) => ({
        ...current,
        [pathname]: undefined
      }));
      setSavingState((current) => ({
        ...current,
        [pathname]: {
          ...current[pathname],
          ...nextSavingState
        }
      }));

      try {
        const response = await fetch("/api/images", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            pathname,
            ...patch
          })
        });

        const payload = (await response.json()) as
          | { success?: boolean; image?: StoredImage; error?: string }
          | { error?: string };

        if (
          !response.ok ||
          !("image" in payload) ||
          !payload.image ||
          !payload.success
        ) {
          const errorMessage = "error" in payload ? payload.error : undefined;
          throw new Error(errorMessage ?? "Failed to save image details.");
        }

        updateImageInState(payload.image.pathname, payload.image, {
          syncDraft: true
        });
        return payload.image;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to save image details.";
        setMetadataErrors((current) => ({
          ...current,
          [pathname]: message
        }));
        throw error;
      } finally {
        setSavingState((current) => ({
          ...current,
          [pathname]: {
            ...current[pathname],
            hideDelete:
              typeof patch.hideDelete === "boolean"
                ? false
                : current[pathname]?.hideDelete,
            usageComment:
              typeof patch.usageComment === "string"
                ? false
                : current[pathname]?.usageComment
          }
        }));
      }
    };

    const previousSave = saveQueueRef.current[pathname] ?? Promise.resolve();
    const nextSave = previousSave.catch(() => undefined).then(queuedSave);
    saveQueueRef.current[pathname] = nextSave;

    try {
      return await nextSave;
    } finally {
      if (saveQueueRef.current[pathname] === nextSave) {
        delete saveQueueRef.current[pathname];
      }
    }
  }

  async function handleHideDeleteToggle(pathname: string, checked: boolean) {
    const currentImage = images.find((image) => image.pathname === pathname);

    if (!currentImage) {
      return;
    }

    const previousValue = currentImage.hideDelete;

    updateImageInState(pathname, {
      hideDelete: checked
    });

    try {
      await saveImageMetadata(pathname, {
        hideDelete: checked
      });
    } catch {
      updateImageInState(pathname, {
        hideDelete: previousValue
      });
    }
  }

  function handleUsageCommentChange(pathname: string, value: string) {
    setCommentDrafts((current) => ({
      ...current,
      [pathname]: value
    }));
    setMetadataErrors((current) => ({
      ...current,
      [pathname]: undefined
    }));
  }

  async function handleUsageCommentBlur(pathname: string, value: string) {
    const currentImage = images.find((image) => image.pathname === pathname);

    if (!currentImage) {
      return;
    }

    const nextComment = value;

    if (nextComment === currentImage.usageComment) {
      return;
    }

    updateImageInState(pathname, {
      usageComment: nextComment
    });

    try {
      await saveImageMetadata(pathname, {
        usageComment: nextComment
      });
    } catch {
      updateImageInState(
        pathname,
        {
          usageComment: currentImage.usageComment
        },
        { syncDraft: true }
      );
    }
  }

  if (!isConfigured) {
    return (
      <section className="card auth-card">
        <p className="eyebrow">Configuration required</p>
        <h2>Set admin credentials before using the panel.</h2>
        <p className="hero-copy">
          Add <code>ADMIN_USERNAME</code>, <code>ADMIN_PASSWORD</code>,{" "}
          <code>SESSION_SECRET</code>, and <code>BLOB_READ_WRITE_TOKEN</code> to
          your environment variables, then redeploy.
        </p>
      </section>
    );
  }

  if (!isAuthenticated) {
    return (
      <section className="card auth-card">
        <p className="eyebrow">Admin access</p>
        <h2>Sign in to manage uploads.</h2>
        <p className="hero-copy">
          The dashboard, gallery, and delete actions are only available after
          login.
        </p>
        <form className="auth-form" onSubmit={handleLogin}>
          <label className="field">
            <span>Login</span>
            <input name="username" type="text" autoComplete="username" required />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </label>
          <button className="primary-button" type="submit" disabled={authLoading}>
            {authLoading ? "Signing in..." : "Sign in"}
          </button>
        </form>
        {authError ? <p className="message error">{authError}</p> : null}
      </section>
    );
  }

  return (
    <section className="dashboard-stack">
      <section className="card">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Protected dashboard</p>
            <h2>Upload and manage your image library.</h2>
          </div>
          <button className="secondary-button" type="button" onClick={handleLogout}>
            Log out
          </button>
        </div>

        <form className="upload-form" onSubmit={handleUpload}>
          <label
            className={`dropzone${isDraggingFile ? " is-dragging" : ""}`}
            htmlFor="image"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <span>Select image</span>
            <input
              id="image"
              name="image"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
              ref={fileInputRef}
              onChange={handleFileChange}
            />
            <small>
              {selectedFileName
                ? `Selected: ${selectedFileName}`
                : "PNG, JPG, WEBP, GIF, AVIF up to 10 MB or drag it here"}
            </small>
          </label>

          <button className="primary-button" type="submit" disabled={uploading}>
            {uploading ? "Uploading..." : "Upload image"}
          </button>
        </form>

        {panelError ? <p className="message error">{panelError}</p> : null}

        {lastUpload ? (
          <div className="result-panel">
            <p className="message success">Last upload is ready to use.</p>
            <div className="result-row">
              <input
                readOnly
                value={lastUpload.url}
                aria-label="Direct image URL"
              />
              <button
                className="secondary-button"
                type="button"
                onClick={() => copyLink(lastUpload.url)}
              >
                Copy link
              </button>
            </div>
            <p className="meta">
              Path: <code>{lastUpload.pathname}</code> | Size:{" "}
              {formatFileSize(lastUpload.size)}
            </p>
            <div className="preview-frame">
              <Image
                src={lastUpload.downloadUrl}
                alt="Last uploaded preview"
                width={1200}
                height={900}
                unoptimized
              />
            </div>
          </div>
        ) : null}
      </section>

      <section className="card">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Image library</p>
            <h2>{galleryCountLabel}</h2>
          </div>
        </div>

        {images.length === 0 ? (
          <p className="empty-state">
            {galleryLoading
              ? "Loading your image library..."
              : "No images uploaded yet. Add the first image and it will appear here."}
          </p>
        ) : (
          <div className="gallery-grid">
            {images.map((image) => (
              <article className="gallery-card" key={image.pathname}>
                <div className="gallery-preview">
                  <Image
                    src={image.downloadUrl}
                    alt={image.pathname}
                    width={800}
                    height={600}
                    unoptimized
                  />
                </div>
                <div className="gallery-body">
                  <p className="gallery-path">{image.pathname}</p>
                  <p className="meta">
                    Uploaded: {formatDate(image.uploadedAt)} | Size:{" "}
                    {formatFileSize(image.size)}
                  </p>
                  <label className="toggle-row">
                    <input
                      type="checkbox"
                      checked={image.hideDelete}
                      disabled={Boolean(savingState[image.pathname]?.hideDelete)}
                      onChange={(event) =>
                        handleHideDeleteToggle(image.pathname, event.target.checked)
                      }
                    />
                    <span>Hide delete button</span>
                  </label>
                  <label className="comment-field">
                    <span>Project comment</span>
                    <input
                      type="text"
                      value={commentDrafts[image.pathname] ?? ""}
                      disabled={Boolean(savingState[image.pathname]?.usageComment)}
                      placeholder="Example: Used in client landing page redesign"
                      onChange={(event) =>
                        handleUsageCommentChange(image.pathname, event.target.value)
                      }
                      onBlur={(event) =>
                        handleUsageCommentBlur(image.pathname, event.target.value)
                      }
                    />
                  </label>
                  {savingState[image.pathname]?.hideDelete ||
                  savingState[image.pathname]?.usageComment ? (
                    <p className="meta status-note">Saving changes...</p>
                  ) : null}
                  {metadataErrors[image.pathname] ? (
                    <p className="message error inline-message">
                      {metadataErrors[image.pathname]}
                    </p>
                  ) : null}
                  <div className="gallery-actions">
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => copyLink(image.url)}
                    >
                      Copy link
                    </button>
                    {image.hideDelete ? null : (
                      <button
                        className="danger-button"
                        type="button"
                        disabled={deletingPathname === image.pathname}
                        onClick={() => handleDelete(image)}
                      >
                        {deletingPathname === image.pathname
                          ? "Deleting..."
                          : "Delete"}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
