import crypto from 'node:crypto';

// Defense-in-depth rate limiter. It intentionally fails closed only for the
// protected endpoint when the caller exceeds the local bucket. A distributed
// limiter (e.g. Vercel/Upstash) can be added later for multi-region abuse control.
type Bucket = { count: number; resetAt: number };

const globalStore = globalThis as typeof globalThis & {
  __rhythmReadRateLimits?: Map<string, Bucket>;
};

const store =
  globalStore.__rhythmReadRateLimits ??
  (globalStore.__rhythmReadRateLimits = new Map<string, Bucket>());

export const MAX_JSON_BODY_BYTES = 256 * 1024;
export const MAX_ANALYTICS_BODY_BYTES = 16 * 1024;
export const MAX_PAYMENT_BODY_BYTES = 16 * 1024;
export const MAX_PDF_BYTES = 300 * 1024 * 1024;
export const MAX_COVER_BYTES = 10 * 1024 * 1024;

function isValidHeaderValue(value: string) {
  return !/[\r\n]/.test(value);
}

export function clientIp(request: Request) {
  // On Vercel, x-vercel-forwarded-for is the platform-provided client address.
  const vercel = request.headers.get('x-vercel-forwarded-for');
  if (vercel) return vercel.split(',')[0].trim().slice(0, 64) || 'unknown';

  const real = request.headers.get('x-real-ip');
  if (real) return real.trim().slice(0, 64) || 'unknown';

  return 'unknown';
}

export function rateLimit(request: Request, namespace: string, limit: number, windowMs: number) {
  const now = Date.now();
  const key = `${namespace}:${clientIp(request)}`;
  const current = store.get(key);

  if (!current || now >= current.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: Math.ceil(windowMs / 1000) };
  }

  current.count += 1;
  if (current.count > limit) {
    return { ok: false, retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) };
  }

  if (store.size > 5000) {
    for (const [entryKey, entry] of store) {
      if (entry.resetAt <= now) store.delete(entryKey);
    }
  }

  return { ok: true, retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) };
}

export function rateLimitedResponse(retryAfter: number) {
  return new Response(JSON.stringify({ error: 'Too many requests. Please try again shortly.' }), {
    status: 429,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Retry-After': String(retryAfter),
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export function noStoreJson<T>(body: T, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json; charset=utf-8');
  headers.set('Cache-Control', 'no-store, max-age=0');
  headers.set('Pragma', 'no-cache');
  headers.set('X-Content-Type-Options', 'nosniff');
  return new Response(JSON.stringify(body), { ...init, headers });
}

export function ensureJsonRequest(request: Request, maxBytes = MAX_JSON_BODY_BYTES) {
  const contentType = request.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
  if (contentType !== 'application/json') {
    return { ok: false as const, response: noStoreJson({ error: 'application/json is required.' }, { status: 415 }) };
  }

  const rawLength = request.headers.get('content-length');
  if (rawLength) {
    const length = Number(rawLength);
    if (!Number.isFinite(length) || length < 0 || length > maxBytes) {
      return { ok: false as const, response: noStoreJson({ error: 'Request body is too large.' }, { status: 413 }) };
    }
  }

  return { ok: true as const };
}

export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!configuredSiteUrl || !origin) return false;

  try {
    const expected = new URL(configuredSiteUrl).origin;
    const actual = new URL(origin).origin;
    return actual === expected;
  } catch {
    return false;
  }
}

export function validSlug(value: string) {
  return /^[a-z0-9](?:[a-z0-9-]{0,158}[a-z0-9])?$/.test(value);
}

export function validUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function safeAuditToken(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex').slice(0, 16);
}

export function safeHeaderValue(value: string, max = 255) {
  return isValidHeaderValue(value) ? value.slice(0, max) : '';
}

export function safeTimingEqualHex(a: string, b: string) {
  const normalizedA = a.trim().toUpperCase();
  const normalizedB = b.trim().toUpperCase();
  if (!/^[A-F0-9]{32}$/.test(normalizedA) || !/^[A-F0-9]{32}$/.test(normalizedB)) return false;
  return crypto.timingSafeEqual(Buffer.from(normalizedA), Buffer.from(normalizedB));
}
