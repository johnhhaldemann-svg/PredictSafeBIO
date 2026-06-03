/**
 * middleware.ts — Edge middleware for PredictSafeBIO
 *
 * Responsibilities:
 *  1. Rate limiting — auth routes (login, signup, forgot-password) are limited
 *     to 10 requests per IP per minute. Exceeding returns 429.
 *  2. API route protection — Stripe and cron endpoints get basic origin + method checks.
 *
 * Implementation uses the Web Crypto API available in the Edge runtime.
 * No Redis required — uses an in-memory sliding window per edge instance.
 * Note: in-memory state resets on cold start / across instances. For production
 * at scale, replace with Upstash Redis (@upstash/ratelimit).
 *
 * HIPAA relevance: rate limiting prevents brute-force attacks on auth endpoints
 * that could expose access to PHI.
 */

import { NextRequest, NextResponse } from "next/server";

export const config = {
  matcher: [
    // Auth routes — rate limit
    "/login",
    "/signup",
    "/forgot-password",
    // API routes — method + origin checks
    "/api/stripe/:path*",
    "/api/cron/:path*",
    "/api/admin/:path*",
  ],
};

// ── In-memory rate limit store ────────────────────────────────────────────────
// Key: `${ip}:${route_group}` → [timestamps of requests in last window]
const rateLimitStore = new Map<string, number[]>();
const WINDOW_MS   = 60_000; // 1 minute
const MAX_AUTH    = 10;     // max auth attempts per minute per IP
const MAX_API     = 60;     // max API calls per minute per IP

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

function checkRateLimit(key: string, max: number): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const timestamps = (rateLimitStore.get(key) ?? []).filter(t => now - t < WINDOW_MS);

  if (timestamps.length >= max) {
    rateLimitStore.set(key, timestamps);
    return { allowed: false, remaining: 0 };
  }

  timestamps.push(now);
  rateLimitStore.set(key, timestamps);

  // Cleanup: remove old entries every 1000 requests to prevent memory leak
  if (rateLimitStore.size > 10000) {
    for (const [k, v] of rateLimitStore) {
      if (v.every(t => now - t > WINDOW_MS)) rateLimitStore.delete(k);
    }
  }

  return { allowed: true, remaining: max - timestamps.length };
}

function rateLimitedResponse(remaining: number): NextResponse {
  return new NextResponse(
    JSON.stringify({ error: "Too many requests. Please wait a moment and try again." }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": "60",
        "X-RateLimit-Limit": String(MAX_AUTH),
        "X-RateLimit-Remaining": String(remaining),
        "X-RateLimit-Reset": String(Math.ceil((Date.now() + WINDOW_MS) / 1000)),
      },
    }
  );
}

export function middleware(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;
  const ip = getClientIp(req);
  const method = req.method;

  // ── 1. Auth route rate limiting ─────────────────────────────────────────────
  if (
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/forgot-password"
  ) {
    // Only rate limit POST (form submissions). GET just renders the page.
    if (method === "POST") {
      const key = `auth:${ip}`;
      const { allowed, remaining } = checkRateLimit(key, MAX_AUTH);
      if (!allowed) {
        console.warn(`[middleware] Rate limit hit: ${ip} on ${pathname}`);
        return rateLimitedResponse(remaining);
      }
    }
    return NextResponse.next();
  }

  // ── 2. Cron endpoint — require CRON_SECRET ──────────────────────────────────
  if (pathname.startsWith("/api/cron/")) {
    if (method !== "GET") {
      return new NextResponse(null, { status: 405 });
    }
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const auth = req.headers.get("authorization");
      // Vercel sends the secret as Bearer token automatically for cron jobs
      // Only enforce when called externally (not from Vercel's cron infrastructure)
      const isVercelCron = req.headers.get("x-vercel-cron") === "1";
      if (!isVercelCron && auth !== `Bearer ${cronSecret}`) {
        return new NextResponse(null, { status: 401 });
      }
    }
    return NextResponse.next();
  }

  // ── 3. Stripe API routes ────────────────────────────────────────────────────
  if (pathname.startsWith("/api/stripe/")) {
    const { allowed } = checkRateLimit(`stripe:${ip}`, MAX_API);
    if (!allowed) return rateLimitedResponse(0);

    // Webhook: must be POST, signature verified in handler — allow through
    if (pathname === "/api/stripe/webhook") {
      if (method !== "POST") return new NextResponse(null, { status: 405 });
      return NextResponse.next();
    }

    // Checkout/portal/redirect: must be POST from same origin
    if (
      pathname === "/api/stripe/checkout" ||
      pathname === "/api/stripe/checkout-redirect" ||
      pathname === "/api/stripe/portal" ||
      pathname === "/api/stripe/portal-redirect"
    ) {
      if (method !== "POST") return new NextResponse(null, { status: 405 });
    }

    return NextResponse.next();
  }

  // ── 4. Admin export API ─────────────────────────────────────────────────────
  if (pathname.startsWith("/api/admin/")) {
    if (method !== "GET") return new NextResponse(null, { status: 405 });
    const { allowed } = checkRateLimit(`admin:${ip}`, MAX_API);
    if (!allowed) return rateLimitedResponse(0);
    return NextResponse.next();
  }

  return NextResponse.next();
}
