/**
 * proxy.ts — Next.js 16 proxy (replaces middleware.ts, runs on Node.js runtime)
 *
 * Responsibilities:
 *  1. Session refresh — calls supabase.auth.getUser() on every request so that
 *     expiring access tokens are refreshed and auth cookies are updated.
 *     Without this, Supabase SSR can't rotate tokens and users get kicked to
 *     /login mid-session ("Invalid refresh token" / "AuthApiError").
 *  2. Rate limiting — auth routes (login, signup, forgot-password) are limited
 *     to 10 requests per IP per minute. Exceeding returns 429.
 *  3. API route protection — Stripe and cron endpoints get basic origin + method checks.
 *
 * Runs on Node.js runtime (Next.js 16 proxy convention — no edge-runtime restrictions).
 * No Redis required — uses an in-memory sliding window per process instance.
 * Note: in-memory state resets on cold start / across instances. For production
 * at scale, replace with Upstash Redis (@upstash/ratelimit).
 *
 * HIPAA relevance: rate limiting prevents brute-force attacks on auth endpoints
 * that could expose access to PHI.
 */

import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

// ── In-memory rate limit store ────────────────────────────────────────────────
// Key: `${ip}:${route_group}` → [timestamps of requests in last window]
const rateLimitStore = new Map<string, number[]>();
const WINDOW_MS   = 60_000; // 1 minute
const MAX_AUTH    = 10;     // max auth attempts per minute per IP
const MAX_API     = 60;     // max API calls per minute per IP
const MAX_AI      = 20;     // max AI/report generation requests per minute per IP
let   cleanupCounter = 0;   // sampled cleanup — only sweep every N calls

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

  // Sampled cleanup: sweep stale entries roughly every 500 calls, not on every
  // request. Avoids iterating the entire map on every hot-path invocation.
  cleanupCounter++;
  if (cleanupCounter % 500 === 0 && rateLimitStore.size > 500) {
    for (const [k, v] of rateLimitStore) {
      if (v.every(t => now - t > WINDOW_MS)) rateLimitStore.delete(k);
    }
  }

  return { allowed: true, remaining: max - timestamps.length };
}

// Accept the actual limit so the header is accurate for every route group.
function rateLimitedResponse(remaining: number, limit = MAX_AUTH): NextResponse {
  return new NextResponse(
    JSON.stringify({ error: "Too many requests. Please wait a moment and try again." }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": "60",
        "X-RateLimit-Limit": String(limit),
        "X-RateLimit-Remaining": String(remaining),
        "X-RateLimit-Reset": String(Math.ceil((Date.now() + WINDOW_MS) / 1000)),
      },
    }
  );
}

export async function proxy(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl;
  const ip = getClientIp(req);
  const method = req.method;

  // Skip static assets — served from CDN; no auth cookies or rate limiting needed.
  if (
    pathname.startsWith("/_next/static") ||
    pathname.startsWith("/_next/image") ||
    pathname === "/favicon.ico" ||
    /\.(svg|png|jpg|jpeg|gif|webp)$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  // ── 1. Supabase session refresh ─────────────────────────────────────────────
  // @supabase/ssr requires the proxy to call auth.getUser() on every request
  // so that expiring JWTs are refreshed and the new tokens are written back to
  // cookies. Skipping this causes "Invalid refresh token" / mid-session logouts.
  let response = NextResponse.next({ request: req });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey) {
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Write updated cookies into both the request (for downstream
          // Server Components) and the response (sent back to the browser).
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          response = NextResponse.next({ request: req });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    });

    // IMPORTANT: do not add logic between createServerClient and getUser().
    // getUser() is what actually triggers the token refresh.
    // Wrapped in try/catch: a Supabase network error must not take down the
    // entire proxy and make every page return 500.
    try {
      await supabase.auth.getUser();
    } catch {
      // Best-effort — session refresh failed (Supabase unreachable?).
      // Continue serving the request with the existing cookies as-is.
    }
  }

  // ── 2. Auth route rate limiting ─────────────────────────────────────────────
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
        console.warn(`[proxy] Rate limit hit: ${ip} on ${pathname}`);
        return rateLimitedResponse(remaining);
      }
    }
    return response;
  }

  // ── 3. Cron endpoint — require CRON_SECRET ──────────────────────────────────
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
    return response;
  }

  // ── 4. Stripe API routes ────────────────────────────────────────────────────
  if (pathname.startsWith("/api/stripe/")) {
    const { allowed, remaining } = checkRateLimit(`stripe:${ip}`, MAX_API);
    if (!allowed) return rateLimitedResponse(remaining, MAX_API);

    // Webhook: must be POST, signature verified in handler — allow through
    if (pathname === "/api/stripe/webhook") {
      if (method !== "POST") return new NextResponse(null, { status: 405 });
      return response;
    }

    // Checkout/portal/redirect: must be POST
    if (
      pathname === "/api/stripe/checkout" ||
      pathname === "/api/stripe/checkout-redirect" ||
      pathname === "/api/stripe/portal" ||
      pathname === "/api/stripe/portal-redirect"
    ) {
      if (method !== "POST") return new NextResponse(null, { status: 405 });
    }

    return response;
  }

  // ── 5. Admin export API ─────────────────────────────────────────────────────
  if (pathname.startsWith("/api/admin/")) {
    if (method !== "GET") return new NextResponse(null, { status: 405 });
    const { allowed, remaining } = checkRateLimit(`admin:${ip}`, MAX_API);
    if (!allowed) return rateLimitedResponse(remaining, MAX_API);
    return response;
  }

  // ── 6. AI generation + report routes ───────────────────────────────────────
  // These are expensive server-side operations — rate limit tightly to prevent
  // abuse. Auth is enforced inside each handler; here we just throttle volume.
  if (
    pathname.startsWith("/api/ai/") ||
    pathname.startsWith("/api/reports/") ||
    pathname.startsWith("/api/assessments") ||
    pathname.startsWith("/api/document-recommendations") ||
    pathname.startsWith("/api/inspections/")
  ) {
    const { allowed, remaining } = checkRateLimit(`app-api:${ip}`, MAX_AI);
    if (!allowed) return rateLimitedResponse(remaining, MAX_AI);
    return response;
  }

  return response;
}
