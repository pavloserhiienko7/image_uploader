import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Image Uploader",
  description: "Upload images and get direct links for sharing anywhere."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

