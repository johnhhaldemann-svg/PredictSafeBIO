#!/usr/bin/env node
/**
 * Pre-deployment health check.
 * Run before `vercel --prod` or any deploy to confirm the live site and
 * local environment are in a good state.
 *
 * Usage:
 *   node --env-file=.env.local scripts/pre-deploy-check.mjs
 *   node --env-file=.env.local scripts/pre-deploy-check.mjs --url https://predictsafe-bio.vercel.app
 *
 * Exits 0 if all checks pass, 1 if any fail.
 */

const REQUIRED_ENV_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "ANTHROPIC_API_KEY",
];

// Not always set locally (Vercel-only) — warn rather than fail
const VERCEL_ONLY_VARS = ["CRON_SECRET"];

// Accepts either key name
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const TARGET_URL =
  process.argv.find((a) => a.startsWith("--url="))?.split("=")[1] ??
  (process.argv.indexOf("--url") !== -1
    ? process.argv[process.argv.indexOf("--url") + 1]
    : null) ??
  process.env.NEXT_PUBLIC_APP_URL ??
  process.env.NEXT_PUBLIC_SITE_URL ??
  "https://predictsafe-bio.vercel.app";

const PASS = "\x1b[32m✓\x1b[0m";
const FAIL = "\x1b[31m✗\x1b[0m";
const WARN = "\x1b[33m⚠\x1b[0m";

let exitCode = 0;

function pass(label) {
  console.log(`  ${PASS} ${label}`);
}
function fail(label, detail) {
  console.log(`  ${FAIL} ${label}${detail ? ` — ${detail}` : ""}`);
  exitCode = 1;
}
function warn(label, detail) {
  console.log(`  ${WARN} ${label}${detail ? ` — ${detail}` : ""}`);
}

console.log("\n── Pre-deploy check ───────────────────────────────────────");
console.log(`   Target: ${TARGET_URL}\n`);

// ── 1. Env vars ──────────────────────────────────────────────────────────
console.log("1. Environment variables");
const missing = REQUIRED_ENV_VARS.filter((v) => !process.env[v]);
if (!supabaseAnonKey) missing.push("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");

if (missing.length === 0) {
  pass("All required env vars present");
} else {
  fail("Missing env vars", missing.join(", "));
}

// Vercel-only vars: warn if absent locally but don't fail
for (const v of VERCEL_ONLY_VARS) {
  if (!process.env[v]) warn(`${v} not set locally (expected — set in Vercel dashboard)`);
}

// AI key format check
if (process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_API_KEY.startsWith("sk-ant-")) {
  warn("ANTHROPIC_API_KEY present but does not start with sk-ant-");
}

// ── 2. Health endpoint ───────────────────────────────────────────────────
console.log("\n2. Health endpoint");
try {
  const adminKey = process.env.PLATFORM_ADMIN_KEY;
  const url = adminKey
    ? `${TARGET_URL}/api/health?secret=${encodeURIComponent(adminKey)}`
    : `${TARGET_URL}/api/health`;

  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = null; }

  if (!body) {
    // Endpoint not yet deployed or returning HTML error page
    warn(`/api/health → ${res.status} (non-JSON — endpoint may not be deployed yet)`);
  } else if (res.ok) {
    pass(`/api/health → ${res.status} (${body.elapsed_ms ?? "?"}ms)`);
    if (body.checks) {
      for (const [key, val] of Object.entries(body.checks)) {
        if (val.ok) pass(`  ${key}`);
        else fail(`  ${key}`, val.detail);
      }
    }
  } else {
    fail(`/api/health → ${res.status}`, JSON.stringify(body));
  }
} catch (e) {
  fail("Health endpoint unreachable", e.message);
}

// ── 3. DB connection via Supabase REST ───────────────────────────────────
console.log("\n3. DB connection (Supabase REST)");
try {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl || !supabaseAnonKey) {
    fail("Supabase env vars not set — skipping live DB check");
  } else {
    const res = await fetch(`${supabaseUrl}/rest/v1/organizations?select=id&limit=1`, {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      signal: AbortSignal.timeout(8_000),
    });
    if (res.ok) {
      pass(`Supabase REST → ${res.status}`);
    } else {
      fail(`Supabase REST → ${res.status}`, await res.text());
    }
  }
} catch (e) {
  fail("Supabase REST unreachable", e.message);
}

// ── 4. AI API key reachability ───────────────────────────────────────────
console.log("\n4. AI API connection");
try {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    fail("ANTHROPIC_API_KEY not set");
  } else {
    const res = await fetch("https://api.anthropic.com/v1/models", {
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      signal: AbortSignal.timeout(8_000),
    });
    if (res.ok) {
      pass(`Anthropic API reachable → ${res.status}`);
    } else if (res.status === 401) {
      fail("Anthropic API key invalid → 401");
    } else {
      warn(`Anthropic API → ${res.status} (may still be usable)`);
    }
  }
} catch (e) {
  fail("Anthropic API unreachable", e.message);
}

// ── Summary ──────────────────────────────────────────────────────────────
console.log("\n───────────────────────────────────────────────────────────");
if (exitCode === 0) {
  console.log("\x1b[32m  All checks passed — safe to deploy.\x1b[0m\n");
} else {
  console.log("\x1b[31m  One or more checks failed — resolve before deploying.\x1b[0m\n");
}

process.exit(exitCode);
