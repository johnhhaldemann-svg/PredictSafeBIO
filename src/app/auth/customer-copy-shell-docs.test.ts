import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const appShell = readFileSync(join(process.cwd(), "src/components/AppShell.tsx"), "utf8");
const documentsPage = readFileSync(join(process.cwd(), "src/app/documents/page.tsx"), "utf8");
const adminDemoPage = readFileSync(join(process.cwd(), "src/app/admin/demo/page.tsx"), "utf8");

describe("AppShell, documents form, and admin demo customer copy", () => {
  it("AppShell header shows Workspace connected not Supabase connected", () => {
    expect(appShell).toContain("Workspace connected");
    expect(appShell).not.toContain("Supabase connected");
  });

  it("AppShell demo banner uses customer language with no env var names", () => {
    expect(appShell).toContain("viewing sample data");
    expect(appShell).toContain("Sign up");
    // No internal env var or config file references
    expect(appShell).not.toContain("NEXT_PUBLIC_SUPABASE_URL");
    expect(appShell).not.toContain("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    expect(appShell).not.toContain(".env.local");
    expect(appShell).not.toContain("environment variables are not configured");
  });

  it("documents form uses placeholder hints instead of demo defaults", () => {
    // No hardcoded demo data as defaultValues
    expect(documentsPage).not.toContain('defaultValue="Sterility Assay Review SOP"');
    expect(documentsPage).not.toContain('defaultValue="QC Microbiology Lab"');
    expect(documentsPage).not.toContain('defaultValue="Sterility assay review"');
    expect(documentsPage).not.toContain('defaultValue="0.3"');
    expect(documentsPage).not.toContain('defaultValue={"QA assessment timing');
    // Placeholders are present instead
    expect(documentsPage).toContain('placeholder="e.g. Sterility Assay Review SOP"');
    expect(documentsPage).toContain('placeholder="e.g. QC Microbiology Lab"');
  });

  it("documents form dropdowns use human-readable labels", () => {
    expect(documentsPage).toContain(">SOP<");
    expect(documentsPage).toContain(">Batch Record<");
    expect(documentsPage).toContain(">In Review<");
    expect(documentsPage).toContain(">Responsible Scientist<");
    expect(documentsPage).toContain(">Principal Investigator<");
    expect(documentsPage).toContain(">Biosafety Officer<");
    expect(documentsPage).toContain(">Manufacturing Lead<");
    // No raw snake_case labels in dropdown text (values are fine, but label text should be human-readable)
    expect(documentsPage).not.toContain(">batch_record<");
    expect(documentsPage).not.toContain(">in_review<");
    expect(documentsPage).not.toContain(">responsible_scientist<");
  });

  it("admin demo page uses demonstration language not MVP language", () => {
    expect(adminDemoPage).toContain("demonstration purposes");
    expect(adminDemoPage).not.toContain("MVP demo walkthroughs");
  });
});
