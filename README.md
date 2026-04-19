# Image Uploader

Small Next.js app for uploading images to Vercel Blob and getting a direct public URL back.

## Stack

- Next.js
- Vercel Blob
- Vercel deployment
- Simple admin auth with signed cookie sessions

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy environment variables:

   ```bash
   cp .env.example .env.local
   ```

3. Add the required environment variables:

   ```bash
   BLOB_READ_WRITE_TOKEN=
   ADMIN_USERNAME=
   ADMIN_PASSWORD=
   SESSION_SECRET=
   ```

4. Start the dev server:

   ```bash
   npm run dev
   ```

## Deploy to Vercel

1. Push this repository to GitHub.
2. Import the repository in Vercel.
3. Create a Blob store in Vercel Storage.
4. Add all env variables from `.env.example` to the Vercel project.
5. Deploy.

## Notes

- The dashboard is protected by a single admin login and password.
- Uploaded images are public and return a direct URL.
- The site UI is private, but direct Blob links remain public by design.
- File types are restricted to common image formats.
- File size is limited to 10 MB in this MVP.
