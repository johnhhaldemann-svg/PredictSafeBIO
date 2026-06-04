export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { createServerClient } from "@/lib/supabase/server";

/**
 * Developer → Logs
 * Recent audit_events across all orgs. Developer role only.
 * This page is for internal technical use — not for client-facing work.
 */
export default async function DeveloperLogsPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!["owner", "developer"].includes(profile?.role ?? "")) redirect("/");

  const { data: events } = await supabase
    .from("audit_events")
    .select("id, event_type, summary, actor_id, environment, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-2">Audit Log</h1>
        <p className="text-sm text-gray-500 mb-6">
          Last 100 platform events. Developer / owner access only.
        </p>

        {!events?.length ? (
          <p className="text-sm text-gray-400">No events logged yet.</p>
        ) : (
          <table className="w-full text-sm border rounded-lg overflow-hidden">
            <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
              <tr>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Summary</th>
                <th className="px-4 py-3">Env</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-mono text-xs">
              {events.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-400 whitespace-nowrap">
                    {new Date(e.created_at).toISOString()}
                  </td>
                  <td className="px-4 py-2">{e.event_type}</td>
                  <td className="px-4 py-2">{e.summary}</td>
                  <td className="px-4 py-2 capitalize">{e.environment ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AppShell>
  );
}
