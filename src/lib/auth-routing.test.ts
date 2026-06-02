import { describe, expect, it } from "vitest";
import { authMessage, friendlyAuthError, passwordMeetsMinimum, safeAuthNext } from "./auth-routing";

describe("auth routing helpers", () => {
  it("allows only app-relative next paths", () => {
    expect(safeAuthNext("/workbench")).toBe("/workbench");
    expect(safeAuthNext("//evil.example")).toBe("/workbench");
    expect(safeAuthNext("https://evil.example")).toBe("/workbench");
    expect(safeAuthNext(null, "/onboarding")).toBe("/onboarding");
  });

  it("preserves existing query params when appending auth messages", () => {
    expect(authMessage("/login?next=%2Faccount%2Fpassword", "Reset sent")).toBe(
      "/login?next=%2Faccount%2Fpassword&message=Reset+sent"
    );
  });

  it("normalizes common Supabase auth errors", () => {
    expect(friendlyAuthError("Email rate limit exceeded")).toContain("custom SMTP");
    expect(friendlyAuthError("Email not confirmed")).toContain("not confirmed");
    expect(friendlyAuthError("User already registered")).toContain("already exists");
    expect(friendlyAuthError("Weak password")).toContain("stronger password");
  });

  it("enforces the MVP password minimum", () => {
    expect(passwordMeetsMinimum("short")).toBe(false);
    expect(passwordMeetsMinimum("longenough")).toBe(true);
  });
});
