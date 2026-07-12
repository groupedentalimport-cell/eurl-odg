import { NextResponse } from "next/server";

/**
 * In-memory rate limiter.
 *
 * WHY: zero rate-limiting on /api/admin/login, /api/client/login,
 * /api/client-portal/login, /api/contact, /api/quotes, /api/newsletter,
 * /api/chat, /api/chat-live — see audit §2.3. A 10 000-code phone-last-4
 * space with no lockout was brute-forceable in minutes.
 *
 * This is a single-process in-memory limiter — sufficient for a
 * single-instance Vercel deployment. For multi-instance, replace the
 * store with `@upstash/ratelimit` + Vercel KV. The API surface is
 * intentionally compatible with that swap.
 */

interface Bucket {
  count: number;
  windowStart: number;
}

interface LimitConfig {
  /** Max requests per window. */
  limit: number;
  /** Window size in seconds. */
  windowSec: number;
}

const DEFAULT_CONFIG: LimitConfig = { limit: 10, windowSec: 60 };

const store = new Map<string, Bucket>();

// Garbage-collect old buckets every 5 minutes to bound memory.
const GC_INTERVAL_MS = 5 * 60 * 1000;
let lastGc = Date.now();

function gc(now: number): void {
  if (now - lastGc < GC_INTERVAL_MS) return;
  for (const [key, bucket] of store) {
    if (now - bucket.windowStart > 60 * 60 * 1000) store.delete(key);
  }
  lastGc = now;
}

export interface RateLimitResult {
  allowed: boolean;
  /** Remaining requests in the current window. */
  remaining: number;
  /** Seconds until the window resets. */
  resetInSec: number;
}

/**
 * Check the rate limit for `key`. Mutates the bucket.
 *
 *   const r = rateLimit(`login:${ip}`, { limit: 5, windowSec: 60 });
 *   if (!r.allowed) return NextResponse.json(
 *     { error: "Trop de tentatives. Réessayez dans " + r.resetInSec + "s." },
 *     { status: 429, headers: { "Retry-After": String(r.resetInSec) } }
 *   );
 */
export function rateLimit(
  key: string,
  config: LimitConfig = DEFAULT_CONFIG
): RateLimitResult {
  const now = Date.now();
  gc(now);
  const windowMs = config.windowSec * 1000;
  const existing = store.get(key);
  if (!existing || now - existing.windowStart > windowMs) {
    store.set(key, { count: 1, windowStart: now });
    return {
      allowed: true,
      remaining: config.limit - 1,
      resetInSec: config.windowSec,
    };
  }
  existing.count += 1;
  if (existing.count > config.limit) {
    return {
      allowed: false,
      remaining: 0,
      resetInSec: Math.ceil((existing.windowStart + windowMs - now) / 1000),
    };
  }
  return {
    allowed: true,
    remaining: config.limit - existing.count,
    resetInSec: Math.ceil((existing.windowStart + windowMs - now) / 1000),
  };
}

/**
 * Extract a rate-limit key from the request. Prefers `x-forwarded-for`
 * (set by Vercel edge), falls back to a fingerprint of `x-vercel-ip`
 * headers. Returns "anon" if nothing is available (e.g. localhost).
 */
export function clientKey(req: Request, prefix: string): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return `${prefix}:${xff.split(",")[0]!.trim()}`;
  const vcel = req.headers.get("x-vercel-ip-forwarded-for");
  if (vcel) return `${prefix}:${vcel}`;
  return `${prefix}:anon`;
}

/**
 * Convenience: enforce the limit and return a 429 NextResponse on
 * failure. Returns null on success (caller proceeds normally).
 *
 *   const limited = enforceLimit(req, "login", { limit: 5, windowSec: 60 });
 *   if (limited) return limited;
 */
export function enforceLimit(
  req: Request,
  prefix: string,
  config: LimitConfig
): NextResponse | null {
  const r = rateLimit(clientKey(req, prefix), config);
  if (r.allowed) return null;
  return NextResponse.json(
    {
      error: `Trop de requêtes. Réessayez dans ${r.resetInSec}s.`,
      retryAfter: r.resetInSec,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(r.resetInSec),
        "X-RateLimit-Remaining": "0",
      },
    }
  );
}
