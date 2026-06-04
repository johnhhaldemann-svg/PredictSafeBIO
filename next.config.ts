import type { NextConfig } from "next";

/**
 * Security headers applied to every response.
 *
 * CSP notes:
 *  - 'unsafe-inline' on style-src is required by Next.js's inline style injection.
 *  - stripe.com is allowed for the Stripe.js checkout SDK.
 *  - 'unsafe-inline' on script-src is required until Next's inline bootstrap
 *    scripts are wired to a nonce-based CSP.
 *
 * HIPAA relevance:
 *  - X-Frame-Options + frame-ancestors prevent clickjacking attacks on auth/PHI pages.
 *  - Strict-Transport-Security enforces HTTPS for all future visits.
 *  - Permissions-Policy disables unused browser APIs that could exfiltrate data.
 */
const securityHeaders = [
  // Prevent the page from being embedded in an iframe (clickjacking protection)
  { key: "X-Frame-Options",        value: "DENY" },
  // Prevent MIME-type sniffing
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Don't send the full URL as Referer when navigating off-site
  { key: "Referrer-Policy",        value: "strict-origin-when-cross-origin" },
  // Force HTTPS for 2 years, include subdomains
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // Disable browser features that aren't needed
  {
    key: "Permissions-Policy",
    value: [
      "camera=()",
      "microphone=()",
      "geolocation=()",
      "interest-cohort=()",
      "payment=(self https://js.stripe.com)",
    ].join(", "),
  },
  // Content Security Policy
  {
    key: "Content-Security-Policy",
    value: [
      // Default: only same-origin
      "default-src 'self'",
      // Scripts: self + inline Next.js bootstrap + Stripe.js
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
      // Styles: self + inline (required by Next.js)
      "style-src 'self' 'unsafe-inline'",
      // Images: self + data URIs (for inline SVGs/base64)
      "img-src 'self' data: blob:",
      // Fonts: self
      "font-src 'self'",
      // Frames: only Stripe checkout iframe
      "frame-src https://js.stripe.com https://hooks.stripe.com",
      // Connections: self + Supabase + Stripe API
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com",
      // No object embeds
      "object-src 'none'",
      // Upgrade insecure requests in production
      ...(process.env.NODE_ENV === "production" ? ["upgrade-insecure-requests"] : []),
      // Prevent framing entirely
      "frame-ancestors 'none'",
      // Restrict form targets
      "form-action 'self'",
      // Base URI limited to self
      "base-uri 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,

  async redirects() {
    return [
      {
        source: "/assessments",
        destination: "/workbench?tab=risk-register",
        permanent: false,
      },
    ];
  },

  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },

  // Prevent sensitive env vars from being bundled into the client
  // (STRIPE_SECRET_KEY, SUPABASE_SERVICE_ROLE_KEY, etc. are already server-only
  //  because they don't have NEXT_PUBLIC_ prefix — this is belt-and-suspenders)
  serverExternalPackages: ["stripe"],
};

export default nextConfig;
