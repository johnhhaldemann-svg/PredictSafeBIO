export function getSupabaseBrowserEnv() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    // Support both the new publishable-key name and the legacy anon-key name so
    // Vercel projects configured before the rename continue to work without
    // requiring an env var update before redeployment.
    publishableKey:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
      ""
  };
}

export function isSupabaseConfigured() {
  const env = getSupabaseBrowserEnv();
  return Boolean(env.url && env.publishableKey);
}

export function assertSupabaseBrowserEnv() {
  const env = getSupabaseBrowserEnv();
  if (!env.url || !env.publishableKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
  }
  return env;
}

export function isSupabaseServiceConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function assertSupabaseServiceEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("Missing Supabase service environment variables.");
  }
  return { url, serviceRoleKey };
}
