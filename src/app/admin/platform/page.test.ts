import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const platformPage = readFileSync(join(process.cwd(), "src/app/admin/platform/page.tsx"), "utf8");
const platformService = readFileSync(join(process.cwd(), "src/lib/supabase/platform-service.ts"), "utf8");
const envExample = readFileSync(join(process.cwd(), ".env.example"), "utf8");

describe("platform ops page", () => {
  it("is gated by PLATFORM_ADMIN_KEY and shows access restricted without it", () => {
    expect(platformPage).toContain("PLATFORM_ADMIN_KEY");
    expect(platformPage).toContain("Access restricted");
    expect(platformPage).toContain("params.key !== adminKey");
  });

  it("is not linked from the AppShell nav", () => {
    const appShell = readFileSync(join(process.cwd(), "src/components/AppShell.tsx"), "utf8");
    expect(appShell).not.toContain("/admin/platform");
  });

  it("shows readiness checklist covering all critical platform checks", () => {
    expect(platformPage).toContain("Platform readiness");
    expect(platformPage).toContain("Configuration");
    expect(platformPage).toContain("security checklist");
    expect(platformPage).toContain("Row-level security");
    expect(platformPage).toContain("Recent cross-org activity");
  });

  it("platform service builds a checklist covering all required items", () => {
    expect(platformService).toContain("supabase_connected");
    expect(platformService).toContain("service_role");
    expect(platformService).toContain("rls_health");
    expect(platformService).toContain("smtp");
    expect(platformService).toContain("leaked_password");
    expect(platformService).toContain("orgs_active");
  });

  it("platform service uses service role client not org-scoped client", () => {
    expect(platformService).toContain("getSupabaseAdminClient");
    // Must NOT use the user-scoped server client
    expect(platformService).not.toContain("createSupabaseServerClient");
  });

  it("PLATFORM_ADMIN_KEY is documented in .env.example", () => {
    expect(envExample).toContain("PLATFORM_ADMIN_KEY");
    expect(envExample).toContain("platform operations page");
  });
});
