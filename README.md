# Image Uploader

Small Next.js app for uploading images to Vercel Blob and getting a direct public URL back.

## Stack

- Next.js
- Vercel Blob
- Vercel deployment

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy environment variables:

   ```bash
   cp .env.example .env.local
   ```

3. Add your `BLOB_READ_WRITE_TOKEN` from Vercel Blob.

4. Start the dev server:

   ```bash
   npm run dev
   ```

## Deploy to Vercel

1. Push this repository to GitHub.
2. Import the repository in Vercel.
3. Create a Blob store in Vercel Storage.
4. Add `BLOB_READ_WRITE_TOKEN` to the Vercel project environment variables.
5. Deploy.

## Notes

- Uploaded images are public and return a direct URL.
- File types are restricted to common image formats.
- File size is limited to 10 MB in this MVP.
