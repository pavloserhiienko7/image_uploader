import { UploaderCard } from "@/components/uploader-card";

export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="hero">
        <p className="eyebrow">Vercel Blob powered</p>
        <h1>Upload an image. Copy the direct link. Use it anywhere.</h1>
        <p className="hero-copy">
          A small personal image host built for quick sharing in websites, inboxes,
          docs, and chats.
        </p>
      </section>
      <UploaderCard />
    </main>
  );
}

