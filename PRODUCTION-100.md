# Rhythm Read — Production 100% Launch Checklist

## Product
- [ ] Final brand name/logo/domain chosen.
- [ ] Final legal business/contact details entered.
- [ ] Real book catalog and licensed/owned content uploaded.
- [ ] Final pricing and currency rules confirmed.
- [ ] Refund/cancellation policy published.
- [ ] Terms, Privacy, Cookie/Ad disclosure and Copyright policy published.

## Database & storage
- [ ] PostgreSQL database created.
- [ ] `schema.sql` executed.
- [ ] Real CRUD APIs replace demo arrays.
- [ ] Private object storage configured for original book files.
- [ ] Signed reader access implemented.
- [ ] Backups + restore test completed.

## Authentication
- [ ] Google Cloud OAuth client created.
- [ ] Production callback URLs configured.
- [ ] `AUTH_SECRET` generated and stored as a secret.
- [ ] Admin email/role configured.
- [ ] Admin 2FA enabled.
- [ ] First-login welcome email provider configured and tested.
- [ ] Account deletion/export flow tested.

## Payments
- [ ] PayHere merchant account and production domain verified.
- [ ] Merchant secret stored only as an environment secret.
- [ ] Checkout order creation implemented.
- [ ] `notify_url` exposed on HTTPS public domain.
- [ ] Server verifies PayHere `md5sig` before marking an order paid.
- [ ] Duplicate webhook/idempotency handling implemented.
- [ ] Success/failure/cancel/chargeback states tested.
- [ ] Refund workflow tested.

## Reader & anti-abuse
- [ ] Free-reader content served without public PDF/EPUB URLs.
- [ ] Paid-reader ownership checked server-side on every protected request.
- [ ] Short-lived access tokens/signatures enabled.
- [ ] Rate limiting enabled.
- [ ] Download endpoints absent or authorization-protected.
- [ ] Dynamic watermarking enabled for premium content where appropriate.
- [ ] Copy/select/print friction added only as a deterrent, not as a false guarantee of DRM.

## Security
- [ ] HTTPS everywhere.
- [ ] Secure + HttpOnly + SameSite cookies.
- [ ] Content Security Policy reviewed for real CDN/payment/provider origins.
- [ ] HSTS enabled after confirming HTTPS readiness.
- [ ] CSRF/auth protections reviewed.
- [ ] Input validation + output escaping on all admin/user fields.
- [ ] Upload MIME/type/size validation + malware scanning.
- [ ] Admin audit log stored in DB.
- [ ] Dependency/security patch process defined.
- [ ] Error messages do not expose secrets, SQL, stack traces or internal IDs.

## Ads & SEO
- [ ] Google AdSense account approved.
- [ ] Ad placement reviewed for reader experience and policy compliance.
- [ ] `ads.txt` configured when required.
- [ ] Sitemap generated and submitted.
- [ ] Robots rules reviewed.
- [ ] Book/author/category metadata and canonical URLs added.
- [ ] Open Graph/Twitter metadata and social preview images created.
- [ ] Search Console configured.
- [ ] Analytics + purchase/read conversion events configured.

## Admin
- [ ] Books CRUD fully connected to DB.
- [ ] Categories CRUD fully connected to DB.
- [ ] Orders/refunds connected to DB/payment provider.
- [ ] User moderation and role management connected.
- [ ] Author publishing workflow connected.
- [ ] Review moderation connected.
- [ ] Analytics cards/charts use real data.
- [ ] Site settings stored in DB.
- [ ] Audit log visible to authorized admins.

## Quality
- [ ] Mobile, tablet and desktop tested.
- [ ] Keyboard navigation tested.
- [ ] Screen-reader labels checked.
- [ ] Slow-network testing completed.
- [ ] 404/500/error states tested.
- [ ] Empty states tested.
- [ ] Duplicate payment/webhook testing completed.
- [ ] Backup restore rehearsal completed.
- [ ] Production smoke test performed on the live domain.
