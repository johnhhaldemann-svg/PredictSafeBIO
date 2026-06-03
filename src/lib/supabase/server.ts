import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { assertSupabaseBrowserEnv } from "./env";

export async function createSupabaseServerClient() {
  const { url, publishableKey } = assertSupabaseBrowserEnv();
  const cookieStore = await cookies();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components cannot set cookies; Server Actions and Route Handlers can.
        }
      }
    }
  });
}

// Alias for callers using the shorter name
export { createSupabaseServerClient as createServerClient };
