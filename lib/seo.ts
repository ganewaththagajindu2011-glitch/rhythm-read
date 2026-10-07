export function getSiteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, '');
  if (configured && /^https?:\/\//i.test(configured)) return configured;

  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim().replace(/\/$/, '');
  if (production) return production.startsWith('http') ? production : `https://${production}`;

  const deployment = process.env.VERCEL_URL?.trim().replace(/\/$/, '');
  if (deployment) return deployment.startsWith('http') ? deployment : `https://${deployment}`;

  return 'http://localhost:3000';
}
