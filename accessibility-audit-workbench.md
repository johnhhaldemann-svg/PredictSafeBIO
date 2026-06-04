# Accessibility Audit: PredictSafeBIO /workbench
**Standard:** WCAG 2.1 AA | **Date:** 2026-06-03 | **URL:** https://predictsafe-bio.vercel.app/workbench

---

### Summary
**Issues found: 13** | 🔴 Critical: 3 | 🟡 Major: 6 | 🟢 Minor: 4

---

## Perceivable

| # | Issue | WCAG | Severity | Recommendation |
|---|-------|------|----------|----------------|
| 1 | **H3 subheadings fail contrast** — `rgb(143, 168, 192)` on white yields **2.46:1** (need 4.5:1). Affects "Top drivers", "Source traceability", "Missing information", "Critical gaps" labels. | 1.4.3 | 🔴 Critical | Darken to at least `#5a7a9a` (~4.6:1) or use the dark text token `rgb(13, 27, 42)` already used on H1/H2. |
| 2 | **22 unlabelled form inputs** — 5 `<select>`, 4 `<input type="text">`, 1 `<input type="number">`, 8 checkboxes, and 1 `<textarea>` have no `<label>`, `aria-label`, or `aria-labelledby`. Screen readers announce them as "blank" or just the input type. | 1.3.1 / 3.3.2 | 🔴 Critical | Add a `<label for="...">` or `aria-label` to every form control. For checkbox groups, wrap in `<fieldset>` + `<legend>`. |
| 3 | **"?" help buttons not connected to their tooltips** — `aria-describedby` count is 0. The accessible name for each KPI help button is currently the full tooltip text baked into `textContent` (e.g. "Help: Composite risk score 0-100 from…"), which is read as a button label rather than contextual hint. | 1.3.1 | 🟢 Minor | Move tooltip text out of the button label into a hidden `<span id="help-kpi-1">` and set `aria-describedby="help-kpi-1"` on the button. Label the button `aria-label="Help"`. |

---

## Operable

| # | Issue | WCAG | Severity | Recommendation |
|---|-------|------|----------|----------------|
| 4 | **No skip-navigation link** — Keyboard users must tab through the full header + category nav bar on every page load before reaching main content. | 2.4.1 | 🟡 Major | Add `<a href="#main-content" class="sr-only focus:not-sr-only">Skip to main content</a>` as the first element in `<body>`, with visible styling on focus. |
| 5 | **"?" help buttons: 15 × 15 px touch target** — 24 help buttons sit at 15 × 15 px, far below the 44 × 44 px minimum. These are completely impractical on touch devices. | 2.5.5 | 🔴 Critical | Set `min-width: 44px; min-height: 44px` with `display: inline-flex; align-items: center; justify-content: center` so the hit area expands without changing visual size. |
| 6 | **Header nav links at 32 px height** — "Sign in" (66 × 32) and "Get started" (87 × 32) fall below the 44 px minimum height. | 2.5.5 | 🟡 Major | Increase header link padding so height reaches 44 px (e.g. `padding-block: 10px`). |
| 7 | **Category nav links at 42 px height** — Document Control, Risk Intelligence, Compliance, HSE Management, System Reliance are all 42 px tall (just 2 px under). | 2.5.5 | 🟢 Minor | Increase to `min-height: 44px`. |
| 8 | **"View all" links at 12 × 38 px** — Multiple "View all" and "View all risks" links measure 12 px tall, well below both width and height minimums. | 2.5.5 | 🟡 Major | Wrap in a larger click area or increase the link's padding: `padding: 12px 8px`. |
| 9 | **Focus styles exist but not verified on custom interactive elements** — The KPI metric tiles and alert cards are visually interactive but may not be keyboard-focusable if implemented as `<div>` instead of `<button>` or `<a>`. | 2.1.1 / 2.4.7 | 🟡 Major | Audit all clickable `<div>` and `<span>` elements; replace with `<button>` or add `tabindex="0"` + `role="button"` + keyboard event handlers. |

---

## Understandable

| # | Issue | WCAG | Severity | Recommendation |
|---|-------|------|----------|----------------|
| 10 | **Page title is "PredictSafeBIO" across all pages** — A generic title gives screen reader users and browser tab users no context about which page they are on. | 2.4.2 | 🟡 Major | Use dynamic titles: `"Workbench – PredictSafeBIO"`, `"Risk Intelligence – PredictSafeBIO"`, etc. In Next.js, set per-page `<title>` via `metadata` exports. |
| 11 | **Multiple H1s (3 found)** — Three `<h1>` elements appear on the page: the dashboard heading, a marketing tagline section, and "BioRisk Scoring Engine". Screen readers use H1 as the page title landmark; multiple H1s break navigation. | 1.3.1 | 🟡 Major | Each page should have exactly one `<h1>` (e.g. "Workbench"). Demote the others to `<h2>` or `<p>`. |
| 12 | **Heading hierarchy is out of order** — The first heading in DOM order is `<h4>` ("Top risk drivers"), which appears inside a KPI widget before any `<h1>` or `<h2>`. Heading levels should not skip (1 → 4 without 2/3). | 1.3.1 | 🟡 Major | Make widget subheadings `<h3>` (or `<h2>`) that are logical descendants of the dashboard `<h1>`. Audit full heading order before each release. |

---

## Robust

| # | Issue | WCAG | Severity | Recommendation |
|---|-------|------|----------|----------------|
| 13 | **No `<footer>` / contentinfo landmark** — The page has `<header>`, `<main>`, `<nav>`, and `<aside>` but no `<footer>`. Users navigating by landmarks cannot jump to page-level footer context. | 1.3.6 | 🟢 Minor | Wrap any bottom-of-page content (disclaimers, build version, legal) in `<footer>`. If none exists yet, add a minimal `<footer>` for future use. |

---

## Color Contrast Summary

| Element | Foreground | Background | Ratio | Required | Pass? |
|---------|-----------|------------|-------|----------|-------|
| H1 text (28px/500) | `rgb(13, 27, 42)` | `#ffffff` | 17.39:1 | 3:1 | ✅ |
| H2 text (16px/500) | `rgb(13, 27, 42)` | `#ffffff` | 17.39:1 | 4.5:1 | ✅ |
| **H3 text (11px/600)** | **`rgb(143, 168, 192)`** | **`#ffffff`** | **2.46:1** | **4.5:1** | **❌** |
| Category nav links (12.5px) | `rgb(74, 96, 128)` | `#ffffff` | 6.41:1 | 4.5:1 | ✅ |
| "View all" links (11px) | `rgb(24, 95, 165)` | `#ffffff` | 6.52:1 | 4.5:1 | ✅ |
| Body text (16px/400) | `rgb(13, 27, 42)` | `#ffffff` | 17.39:1 | 4.5:1 | ✅ |

> ⚠️ The H3 color `rgb(143, 168, 192)` is the only color contrast failure. It is used as a section label style throughout the workbench panel. Fix: use `rgb(75, 100, 130)` (~4.7:1) or darker.

---

## Touch Target Summary

| Element | Size | Required | Pass? |
|---------|------|----------|-------|
| "?" help buttons | 15 × 15 px | 44 × 44 px | ❌ |
| "View all" links | 12 × 38 px | 44 × 44 px | ❌ |
| Header "Sign in" / "Get started" | 66–87 × 32 px | 44 × 44 px | ❌ |
| Category nav links | 134–170 × 42 px | 44 × 44 px | ❌ |
| Save assessment button | (full width) | 44 × 44 px | ✅ |

---

## Form Inputs Summary (unlabelled)

All 22 form controls on the page lack accessible labels. By input type:

| Type | Count | Locations (inferred) |
|------|-------|---------------------|
| `select` | 6 | Filter dropdowns (owner, status, type, risk level, etc.) |
| `text` | 4 | Search/filter text inputs |
| `number` | 1 | Numeric threshold input |
| `checkbox` | 8 | Multi-select filter checkboxes |
| `textarea` | 1 | Assessment description / signal input |

---

## Priority Fix List

1. 🔴 **Add `aria-label` to all 22 form controls** — blocks screen reader users from using any filter, search, or assessment input.
2. 🔴 **Increase "?" button touch targets to 44 × 44 px** — current 15 × 15 px makes them inaccessible on mobile and to users with motor impairments.
3. 🔴 **Fix H3 color contrast** — change `rgb(143, 168, 192)` to `rgb(75, 100, 130)` or darker throughout.
4. 🟡 **Add a skip-navigation link** — one-line fix with outsized benefit for keyboard users.
5. 🟡 **Consolidate to one `<h1>` per page** — and correct heading hierarchy (no H4 before H1).
6. 🟡 **Set descriptive page titles** via Next.js `metadata` exports.
7. 🟡 **Increase header CTA and "View all" link padding** to reach 44 px height.
8. 🟢 **Restructure help button ARIA** — separate label from tooltip text via `aria-describedby`.
9. 🟢 **Add `<footer>` landmark**.
10. 🟢 **Bump category nav link height** from 42 px to 44 px.

---

*Audit covers automated DOM inspection and accessibility tree analysis. Recommend follow-up with manual VoiceOver/NVDA testing, especially for the BioRisk scoring panel and assessment save workflow.*
