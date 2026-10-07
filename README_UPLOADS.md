# Rhythm Read — Admin E-book Uploads

The admin Add Book flow now accepts a cover image and the original PDF directly from the device.

## Local development

```bash
npm install
npm run dev
```

Open `/admin` and click **Add book**.

The upload flow stores:
- Cover images in `public/uploads/covers/`
- Original PDFs in `storage/private/books/`
- Uploaded-book metadata in `storage/books.json`

There is intentionally **no hard-coded application MB limit** in the form or upload route. Actual maximum file size depends on the hosting platform, reverse proxy, filesystem/storage provider and request-body limits.

## Reader behavior

Free uploaded books can be streamed through `/api/books/[slug]/file` in this pre-payment phase.
Paid uploaded books remain private and return `402 Payment Required` until the payment/ownership layer is connected.

## Production architecture

For a hosted production deployment, replace local filesystem storage with private S3-compatible object storage and direct/resumable uploads. Keep the original PDF private and release only short-lived authorized access after a verified purchase. This avoids serverless filesystem persistence issues and allows large files without an app-level MB cap.

The next step is connecting the existing PayHere notify endpoint to the order creation and purchase-gated reader flow.
