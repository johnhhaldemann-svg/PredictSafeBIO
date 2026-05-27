import { createBrowserClient } from "@supabase/ssr";
import { assertSupabaseBrowserEnv } from "./env";

export function createSupabaseBrowserClient() {
  const { url, publishableKey } = assertSupabaseBrowserEnv();
  return createBrowserClient(url, publishableKey);
}
