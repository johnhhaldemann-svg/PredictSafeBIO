import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { assertSupabaseServiceEnv } from "./env";

// Untyped (no generated Database type in this repo), so default through `any`
// to avoid `.from(...).update/insert/select` inferring `never` row types.
let adminClient: SupabaseClient | null = null;

export function getSupabaseAdminClient() {
  if (!adminClient) {
    const { url, serviceRoleKey } = assertSupabaseServiceEnv();
    adminClient = createClient(url, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
  }

  return adminClient;
}
