# PredictSafeBIO — Customer-Readiness Audit

**Date:** June 4, 2026
**Target:** Live production app — https://predictsafe-bio.vercel.app
**Deployment:** `dpl_ELTrfQvWL8AZqNDgfnkEXjdhTo9b` (READY, production)
**Method:** Browser walkthrough as an unauthenticated demo user, every reachable route and primary tool exercised.
**Lens:** Functional correctness + performance.

---

## Verdict

The app is structurally healthy — every route renders, nothing 500s, navigation and auth-gating work, and load times are fast (all under 1s). But it is **not yet customer-ready**. A single class of bug — interactive **filter, search, and tab controls that update the URL but never actually filter or switch the view** — is repeated across most of the product's list and dashboard pages. To a customer these are dead buttons on exactly the screens they'll use daily. Fix that one pattern and most of the audit clears.

---

## Severity summary

| # | Severity | Area | Issue |
|---|----------|------|-------|
| 1 | **High** | HSE list pages | Filter chips don't filter the list (systemic) |
| 2 | **High** | Workbench | Overview / Risk Register tab buttons do nothing |
| 3 | **High** | Provider Directory | Search + Filter return all records regardless of query |
| 4 | **Medium** | Ergonomics screening | Risk result never recalculates from answers |
| 5 | **Medium** | Ergonomics screening | "None" body-part not mutually exclusive |
| 6 | **Medium** | Whole app | Repeating `Connection closed` console exception every ~10–15s |
| 7 | **Low** | Most pages | Generic `<title>` ("PredictSafeBIO") instead of page-specific |
| 8 | **Low** | Provider Directory | Badge circles overlap "Accepting patients" text |

---

## High severity

### 1. Filter chips don't filter — systemic
On the HSE list pages, the filter chips above each register change the URL query string (e.g. `?filter=closed`) but the list below never narrows. Confirmed on four separate pages:

- **CAPA** (`/operations/capa`) — selecting "Closed" (count = 0) still shows all 3 records, including In-progress and Open cards.
- **Chemical & SDS** (`/chemical-inventory`) — "Missing SDS" (count = 1) still shows all 3 chemicals.
- **Waste Mgmt** (`/waste-management`) — "Ready for pickup" (count = 1) still shows all 3 containers.
- **Pesticide & Disinfectant** (`/pesticide`) — "Missing label" (count = 2) didn't change the URL or the list at all.

The Permits page (`/permits`) uses the identical chip pattern and should be assumed affected. The header count cards are correct, which makes the broken filter more jarring — the user sees "1 missing SDS" but clicking it shows everything.

**Likely cause:** server components read `searchParams`, but the chip click either (a) doesn't push the param, or (b) the list query ignores it. Worth checking one shared list/filter component.

### 2. Workbench tab buttons are inert
On `/workbench`, the in-page **Overview** / **Risk Register** toggle buttons do nothing — clicking "Risk Register" (verified against the actual button element) leaves Overview active and the URL unchanged. The Risk Register view only appears via a **full navigation** to `/workbench?tab=risk-register` (the sidebar link), and once there the "Overview" button is equally dead. The view is determined solely by the `?tab=` param at page load, so the headline tab control on the core workbench doesn't work.

### 3. Provider Directory search & filter non-functional
On `/providers`, typing "Marcus" and pressing **Filter** updates the URL to `?q=Marcus&specialty=` but still returns all 3 providers ("3 providers listed"). The search input and Specialty dropdown have no effect on results.

---

## Medium severity

### 4. Ergonomics screening result never updates
The `/ergonomics/self-assessment` tool is presented as a live screening that produces a risk level. Selecting **"Extremely tiring / Severe discomfort"** + a body part (Hands/Wrists) leaves the "Your Results" panel stuck on **Low Risk / 0**, with "Main risk drivers" still reading *"No discomfort, low frequency, and no body strain selected."* The result does not react to the inputs, which undermines the entire point of the tool.

### 5. "None" body part isn't mutually exclusive
In the same form, choosing a specific body part (e.g. Hands/Wrists) leaves **"None"** selected at the same time. "None" should clear when any body region is picked (and vice-versa).

### 6. Repeating `Connection closed` exception
A client exception — `Error: Connection closed.` from the Next.js chunk — fires roughly **every 10–15 seconds on every page** (~29 occurrences over a 9-minute session). It looks like a background subscription or RSC/stream that keeps reconnecting and failing (plausibly a Supabase realtime channel with no authenticated session in demo mode). It's invisible to the user but pollutes the console, wastes requests, and is the kind of thing a technical evaluator will spot immediately. Worth gating that connection behind auth or adding proper teardown/backoff.

---

## Low severity

### 7. Inconsistent page titles
Many pages render the generic browser-tab title **"PredictSafeBIO"** instead of a page-specific one: Risk Monitor, Inspections, CAPA, Training Matrix, Chemical & SDS, Waste Mgmt, Permits, Pesticide, Provider Directory, and the assessment detail page. Home, Document Control, Risk Intelligence, My Work, Compliance, and HSE Management *do* set proper titles — so the fix is just bringing the rest in line. Affects browser tabs, bookmarks, and SEO.

### 8. Provider card badge overlap
On provider cards, the credential/state badge circles overlap the green "Accepting patients" text, creating a visual collision. Cosmetic but on a customer-facing directory.

---

## What's working well

- **Stability:** every route rendered; no 500s or 404s encountered across ~20 routes.
- **Auth-gating is correct:** protected routes (`/account/company`, `/bios/new`) cleanly redirect to `/login`; write actions (e.g. "Save review" on an assessment) redirect with a clear message — *"Sign in and finish onboarding before updating review status."* — rather than erroring.
- **Signup validation is solid:** email field is `type=email` + required; password is required with `minLength=8` and `autocomplete=new-password`.
- **Links work:** sidebar nav, the home "Safety loop" CTAs, and table row "Open →" links all navigate correctly (the broken controls are specifically the client-side toggle/filter buttons).
- **Read-only demo framing is clear:** the persistent "viewing sample data" banner and "Read-only" notices set expectations well.

---

## Performance

All measured page loads were comfortably under one second:

| Route | Load (ms) | | Route | Load (ms) |
|---|---|---|---|---|
| /change-plan | 214 | | /providers | 432 |
| /training-matrix | 260 | | /chemical-inventory | 462 |
| /documents/version-control | 317 | | /my-work | 460 |
| /programs | 341 | | /permits | 475 |
| /waste-management | 373 | | /operations | 692 |
| /operations/capa | 404 | | /pesticide | 670 |
| /ergonomics/self-assessment | 428 | | /signup | 706 |
| /inspections | 464 | | /login | 853 |
| | | | /risk-command-center | 934 |

No slow pages or heavy bottlenecks. The one performance-adjacent concern is the repeating `Connection closed` reconnect loop (issue #6), which generates continuous background churn.

---

## Recommended fix order

1. **Issue #1 (filter chips)** — one shared component, biggest visible payoff, touches the most pages.
2. **Issue #2 (Workbench tabs)** and **#3 (Provider search)** — same root cause family (URL state not wired to the client control); likely fixable together.
3. **Issues #4–#5 (Ergonomics)** — make the screening reactive and the body-part selection exclusive.
4. **Issue #6 (Connection closed loop)** — gate/teardown the background connection.
5. **Issues #7–#8 (titles, card layout)** — quick polish before launch.

---

*Audit performed on the live deployment in read-only demo mode. Authenticated workflows (record creation, edits, workspace setup) were gated and not exercised; a follow-up pass with a test account is recommended to cover the post-sign-in surface.*
