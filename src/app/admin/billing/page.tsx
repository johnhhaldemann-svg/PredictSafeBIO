export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { createServerClient } from "@/lib/supabase/server";
import { isAdminRole } from "@/lib/role-permissions";

/**
 * Admin → Billing
 * Placeholder for platform billing management.
 * Accessible only to platform owners.
 *
 * TODO: Wire up Stripe / billing provider when billing module is built.
 */
export default async function AdminBillingPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!isAdminRole(profile?.role)) redirect("/");

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-2">Billing</h1>
        <p className="text-sm text-gray-500 mb-6">
          Platform billing and subscription management. Coming soon.
        </p>
        <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center text-gray-400 text-sm">
          Billing module not yet implemented.
        </div>
      </div>
    </AppShell>
  );
}
