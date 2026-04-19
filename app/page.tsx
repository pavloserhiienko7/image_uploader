import { AdminApp } from "@/components/admin-app";
import { getSession, isAuthConfigured } from "@/lib/auth";
import { listImages } from "@/lib/blob";

export default async function HomePage() {
  const isConfigured = isAuthConfigured();
  const session = isConfigured ? await getSession() : null;
  const images = session ? await listImages() : [];

  return (
    <main className="page-shell">
      <section className="hero">
        <p className="eyebrow">Protected Vercel Blob manager</p>
        <h1>Upload images, copy direct links, and manage your library.</h1>
        <p className="hero-copy">
          This panel is protected with a single admin login. Your direct image
          links stay public, while upload and delete actions stay private.
        </p>
      </section>
      <AdminApp
        images={images}
        isAuthenticated={Boolean(session)}
        isConfigured={isConfigured}
      />
    </main>
  );
}
