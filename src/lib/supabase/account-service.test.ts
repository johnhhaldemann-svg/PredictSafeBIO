import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const dataModule = readFileSync(join(process.cwd(), "src", "lib", "supabase", "data.ts"), "utf8");
const accountService = readFileSync(join(process.cwd(), "src", "lib", "supabase", "account-service.ts"), "utf8");

describe("account service extraction", () => {
  it("keeps the public account surface available through the data module", () => {
    expect(dataModule).toContain('from "./account-service"');
    expect(dataModule).toContain("getAccountSummary");
    expect(dataModule).toContain("updateCompanyProfile");
    expect(dataModule).not.toContain("export async function getAccountSummary");
    expect(dataModule).not.toContain("export async function updateAccountProfile");
  });

  it("uses server-verified Supabase users without client-editable auth metadata", () => {
    expect(accountService).toContain("await supabase.auth.getUser()");
    expect(accountService).not.toContain("getSession");
    expect(accountService).not.toContain("user_metadata");
  });
});
