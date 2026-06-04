# PredictSafeBIO — Platform Test Report
**Date:** June 4, 2026  
**Tester:** Claude (automated walkthrough, unauthenticated session)  
**URL:** https://predictsafe-bio.vercel.app  
**Branch:** visual-polish (production)

---

## Summary

All 20+ pages load without crashes. Navigation, auth flows, and module pages are functional. Sample data renders correctly across most modules. Four issues require attention before customer demos — one is a security concern.

---

## 🔴 Critical

### 1. Platform Admin page leaks internal security architecture
**URL:** `/admin/platform`  
**What happens:** The page is publicly accessible without login and displays:
> *"Platform operator access requires the `PLATFORM_ADMIN_KEY` environment variable to be set and the matching key to be passed as a URL query parameter. Example: `/admin/platform?key=your-secret-key`"*

This tells any visitor exactly how to brute-force or probe the admin backdoor. Should be replaced with a plain "Access denied" message (no implementation details), or redirected to `/login`.

---

## 🟠 Medium

### 2. Dashboard BioRisk score and Audit Readiness are inconsistent across pages
**What happens:**  
- Homepage (root `/`) shows **BioRisk Score: 83** and **Audit Readiness: 72% – steady**  
- Risk Intelligence → Command Center (`/workbench`) shows **BioRisk Score: 81** and **Audit Readiness: 20% – not enough data**

Both show the "Command Center" label but pull different numbers. Customers will notice. Likely a caching or data-fetch issue — one page may be using stale/demo-seeded values while the other pulls live.

### 3. "New assessment" button silently navigates to Workbench for unauthenticated users
**URL:** `/assessments` → click "New assessment"  
**What happens:** Instead of prompting sign-in, the button navigates to `/workbench`. No error, no sign-in gate, no explanation. Users won't know they need to log in to create a record.  
**Expected:** Redirect to `/login?next=/assessments/new` with a message.

---

## 🟡 Low / UX

### 4. Sign-in form clears the email field after a failed attempt
**URL:** `/login`  
**What happens:** After submitting wrong credentials, the error message "Invalid login credentials" appears but both email and password fields are cleared. Users must re-type their email.  
**Expected:** Keep the email field populated; clear only the password.

### 5. Provider Directory has no sample data
**URL:** `/providers`  
**What happens:** Shows "No providers found. Be the first to add your profile." — empty state. Every other module (risk, compliance, HSE) shows rich sample records for demo purposes.  
**Impact:** Weak first impression during demos. Consider seeding 2–3 sample provider profiles.

### 6. "Add Patient Bio" label in Risk Intelligence nav feels off-brand
**Nav item:** Risk Intelligence → Add Patient Bio  
**Issue:** "Patient Bio" implies healthcare/clinical context. PredictSafeBIO targets biotech EHS/compliance teams. Consider renaming to "Add Personnel Record," "Add Worker Bio," or similar.  
**Note:** The `ergochic1` user also showed a **"PATIENT"** role badge in the top nav — verify this display label is intentional for the member role.

---

## ✅ Everything That Passed

| Area | Status |
|---|---|
| Dashboard / Command Center loads | ✅ |
| Document Control — All Documents | ✅ |
| Document Control — Version Control | ✅ |
| Risk Intelligence — Risk Register (filters work) | ✅ |
| Risk Intelligence — Provider Directory | ✅ (empty but loads) |
| Compliance — Compliance Map | ✅ |
| Compliance — Programs Library (27 programs) | ✅ |
| Program detail + Schedule/Log button | ✅ |
| HSE — AI Risk Command Center | ✅ |
| HSE — Operations / CAPA | ✅ |
| HSE — Training Matrix | ✅ |
| HSE — Ergonomics (interactive screener) | ✅ |
| HSE — Chemical & SDS | ✅ |
| HSE — Waste Management | ✅ |
| HSE — Work Permits | ✅ |
| HSE — Pest & Disinfectant Control | ✅ |
| System Reliance — Reports & Audit | ✅ |
| System Reliance — AI Knowledge (owner-gated) | ✅ |
| Billing → redirects to login | ✅ |
| Platform Config → redirects to login | ✅ |
| Sign in — invalid credentials error | ✅ |
| Sign up page | ✅ |
| Forgot password / reset flow | ✅ |
| Protected pages (Add Patient Bio, Billing) → login redirect | ✅ |
| Sample data banner (unauthenticated) | ✅ |

---

## Prioritized Fix Order

1. **Fix Platform Admin info leak** — 30 min, high impact
2. **Investigate BioRisk score/Audit Readiness discrepancy** — likely a data fetch bug
3. **Add login gate to "New assessment" button** — small redirect change
4. **Persist email on failed login** — 5 min UX fix
5. **Seed Provider Directory sample data** — before next demo
6. **Rename "Add Patient Bio"** — copy change only
