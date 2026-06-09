# Super Admin Company Management — Implementation Plan
Tickets 1–5 · Author: Claude · Date: 2026-06-05

---

## Codebase Baseline

| File | What exists today |
|------|-------------------|
| `src/app/admin/org/[orgId]/page.tsx` | Org detail page with tabs: Overview, Users, Profile, Controls |
| `src/app/admin/org/[orgId]/actions.ts` | Server actions: updateOrgProfile, setOrgStatus, updateOrgControls, user CRUD |
| `audit_events` table | Exists. `auditLog()` helper already writes to it in every action |
| Controls tab | Has suspend/reinstate buttons + seat limit/plan tier/demo mode — NO module toggles |
| Profile tab | Status is editable as `<select>` (but with wrong options: pending/inactive) |
| Danger Zone | Placeholder text in Controls tab only — no actual Archive/Delete buttons |

---

## Execution Order

Build in this sequence — each ticket is independently deployable:

```
Ticket 3 → Ticket 1 → Ticket 2 → Ticket 5 → Ticket 4
(Audit Log) (Status) (Modules) (Delete/Archive) (Export)
```

**Why this order:**
- Ticket 3 is prerequisite for "paying customer go-live" and is nearly free (table exists)
- Ticket 1 is a small contained change with no DB work
- Ticket 2 needs one DB migration before UI work
- Ticket 5 needs DB + email wiring
- Ticket 4 is the most complex (file generation, large-file email path)

---

## Ticket 3 — Audit Log Tab
**Priority: Highest (blocks go-live)**

### What to build
A new tab on the org detail page that renders the full `audit_events` table for this org with search and date filtering.

### DB — no migration needed
`audit_events` already exists with: `organization_id`, `actor_id`, `event_type`, `summary`, `payload`, `created_at`.  
Need to join `profiles` to get actor name. Add a query that fetches `profiles.full_name` via a join on `actor_id`.

### Files to change

**`page.tsx`**
1. Add `"audit-log"` to the `Tab` type union.
2. Add the tab nav link:
   ```tsx
   <Link href={tabHref("audit-log")} className={activeTab === "audit-log" ? "button-primary compact" : "button-secondary compact"}>
     <Activity size={13} /> Audit Log
   </Link>
   ```
3. When `activeTab === "audit-log"`, fetch audit events with actor name join:
   ```ts
   const { data: auditEvents } = await admin
     .from("audit_events")
     .select("id, event_type, summary, created_at, actor_id, profiles(full_name)")
     .eq("organization_id", orgId)
     .order("created_at", { ascending: false })
     .limit(500);
   ```
   Pass to a new client component `<AuditLogTab>`.

**New file: `src/components/admin/AuditLogTab.tsx`** (client component)
- Props: `events[]`, `orgId`
- Local state: `search` string, `dateFrom`/`dateTo` inputs, `userFilter`
- Filters events client-side (500 rows max — sufficient for now)
- Table columns: **Date & Time** | **User** (name + actor_id truncated) | **Action** (event_type prettified) | **Detail** (summary)
- No delete button anywhere — read-only
- Export to CSV button (bonus — generates CSV from filtered rows, no server needed)

**`actions.ts`** — no changes needed (auditLog already works)

### Key constraint
The `profiles` join on `actor_id` — if the actor is the superadmin themselves, their profile is in the same table. Supabase select with a foreign key join works: `profiles!actor_id(full_name)`. If the actor was deleted, fall back to showing actor_id.

---

## Ticket 1 — Org Status Editable
**Priority: High**

### What to build
Replace the read-only Status row in the Overview tab's "Organization details" section with an inline dropdown + Save button. Also update the status options across the app to: **Active, Suspended, Trial, Archived**.

### DB — no migration needed
`organizations.status` already exists as `text`. Just changing the allowed values in the UI/actions.

### Files to change

**`page.tsx`**

1. **Update status options** in the Profile tab `<select>` (line 420–425):
   ```tsx
   <option value="active">Active</option>
   <option value="suspended">Suspended</option>
   <option value="trial">Trial</option>
   <option value="archived">Archived</option>
   ```

2. **Overview tab — make Status row interactive.** Replace the static `["Status", org.status ?? "active"]` row with a dedicated component `<InlineStatusSelect>` (client component) that renders:
   - A `<select>` with the 4 options pre-selected to current value
   - A "Save" button that submits `setOrgStatusAction` via `useTransition`
   - Before submitting `suspended` or `archived`: `window.confirm("Are you sure? This will [block logins / hide this org].")`

   Because the Overview tab is a server component, extract just this row into a small `"use client"` component. Pass `orgId` and `currentStatus` as props.

**New file: `src/components/admin/InlineStatusSelect.tsx`** (client component)
```tsx
"use client";
// Props: orgId, currentStatus
// Renders: <select> + Save button
// On submit for suspended/archived: window.confirm() gate
// Calls setOrgStatusAction via form action
```

**`actions.ts`**
- `setOrgStatusAction` already exists and already writes to audit_events — no logic changes needed.
- Optionally add a `reason` field capture (already handled: reason param is read but not surfaced in UI yet — can wire a reason textarea for suspended/archived later).

**`statusBadge()` helper in `page.tsx`**
Add `archived` → `status-critical` (or a new grey badge class).

### Key constraint
`window.confirm` works for the MVP but isn't ideal for mobile. If a modal is preferred later, extract to a `<ConfirmStatusModal>` component. Flag this as a follow-up.

---

## Ticket 2 — Module Toggles on Controls Tab
**Priority: High**

### What to build
Per-org on/off toggles for 10 platform modules, stored in DB, enforced when users access those modules.

### DB migration needed

**Option A (recommended): JSONB column on `organizations`**
```sql
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS enabled_modules jsonb NOT NULL DEFAULT '{
    "assessments": true,
    "documents": true,
    "capas": true,
    "biosafety": true,
    "chemical_sds": true,
    "capa_tracker": true,
    "inspection_audit": true,
    "ergonomics": true,
    "waste_management": true,
    "pesticide_control": true
  }'::jsonb;
```

Migration file: `supabase/migrations/20260606000100_org_module_settings.sql`

**Why JSONB over a separate table:** Simpler joins, no extra RLS policy needed, easy to add modules later. The tradeoff is no per-field history — but audit_events covers that.

### Files to change

**`page.tsx`**
- Pass `org.enabled_modules` to a new client component `<ModuleTogglesSection>` in the Controls tab.
- Remove the current "Organization status" suspend/reinstate section from Controls (it's now in Ticket 1's Overview tab and Profile tab — Controls can keep it or drop it to reduce duplication).

**New file: `src/components/admin/ModuleTogglesSection.tsx`** (client component)
```tsx
"use client";

const MODULES = [
  { key: "assessments",      label: "Assessments" },
  { key: "documents",        label: "Documents" },
  { key: "capas",            label: "CAPAs" },
  { key: "biosafety",        label: "Biosafety" },
  { key: "chemical_sds",     label: "Chemical SDS" },
  { key: "capa_tracker",     label: "CAPA Tracker" },
  { key: "inspection_audit", label: "Inspection & Audit" },
  { key: "ergonomics",       label: "Ergonomics" },
  { key: "waste_management", label: "Waste Management" },
  { key: "pesticide_control","label": "Pesticide Control" },
];

// Renders a toggle row per module
// On change: calls updateOrgModulesAction with full modules object
// Optimistic update: flip the local state immediately, roll back on error
```

**`actions.ts`** — add `updateOrgModulesAction`:
```ts
export async function updateOrgModulesAction(formData: FormData) {
  // Parse module keys from formData
  // Build enabled_modules JSONB object (all MODULES keys, true if present in formData)
  // UPDATE organizations SET enabled_modules = $1 WHERE id = $2
  // auditLog: "superadmin_org_modules_updated", list which changed
}
```

**Module enforcement** — where to add checks:
Each module's page/layout should check `enabled_modules` for that org:
```ts
const { data: org } = await supabase
  .from("organizations")
  .select("enabled_modules")
  .eq("id", orgId)
  .single();

if (!org?.enabled_modules?.assessments) redirect("/workbench?error=module_disabled");
```
Add this check to the layout or page server component for each of the 10 modules. This is a separate task but should be scoped here. Create a helper: `src/lib/modules.ts` → `isModuleEnabled(org, key)`.

### Default state for new orgs
The SQL DEFAULT `'{...all true...}'::jsonb` handles this — no app-level logic needed.

---

## Ticket 5 — Archive/Delete Org (Danger Zone in Profile Tab)
**Priority: Medium-High (Archive sooner)**

### What to build
"Danger Zone" section at the bottom of the Profile tab with Archive and Delete actions, each requiring the super admin to type the org name to confirm.

### DB migration needed

**`organizations` table already has `status` — Archive just sets status to `"archived"`.**

For Delete, two options:
- **Soft delete (recommended for now):** add `deleted_at timestamptz` column, set it on delete. Filter out deleted orgs everywhere with `WHERE deleted_at IS NULL`. Preserves data for auditing.
- **Hard delete:** cascade deletes all child rows. Irreversible. Add later once soft-delete is proven.

```sql
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
```

Migration: `supabase/migrations/20260606000200_org_soft_delete.sql`

Update the organizations list page (`/admin/organizations`) to filter `WHERE deleted_at IS NULL`.

### Email notification on delete
Need a server-side email send to the platform owner when an org is deleted. Check if Resend is already configured in the project (look for `RESEND_API_KEY` in env). If yes, use the existing email utility. If not, wire Resend: `npm install resend`, add env var, create `src/lib/email.ts`.

Send to: platform owner email (hardcode in env as `PLATFORM_OWNER_EMAIL` or pull from config table).

### Files to change

**`page.tsx`** — Profile tab: add Danger Zone section after the Org ID display:

```tsx
<DangerZoneSection orgId={orgId} orgName={org.name} />
```

**New file: `src/components/admin/DangerZoneSection.tsx`** (client component)
- Two sections: Archive and Delete
- Each has: description text, `<input type="text" placeholder="Type org name to confirm" />`, action button (disabled until input matches orgName)
- Archive button: red/orange border, calls `archiveOrgAction`
- Delete button: solid red, calls `deleteOrgAction`
- Both disabled until name matches exactly

**`actions.ts`** — add two new actions:

```ts
export async function archiveOrgAction(formData: FormData) {
  // Verify orgName confirmation matches actual org name
  // UPDATE organizations SET status = 'archived', updated_at = now() WHERE id = orgId
  // auditLog: "superadmin_org_archived"
  // redirect to /admin/organizations with success banner
}

export async function deleteOrgAction(formData: FormData) {
  // Verify orgName confirmation
  // UPDATE organizations SET deleted_at = now() WHERE id = orgId
  // auditLog: "superadmin_org_deleted"
  // Send email to PLATFORM_OWNER_EMAIL
  // redirect to /admin/organizations
}
```

**Remove** the Danger Zone placeholder from the Controls tab (it's moving to Profile).

---

## Ticket 4 — Org Data Export
**Priority: Medium**

### What to build
Export button on Overview tab → modal → select data types + format → download or email.

### No DB migration needed

### Architecture
Two paths:
1. **Small export (<5MB estimated):** Generate file server-side, return as a streaming response download.
2. **Large export:** Queue a background job, send email with download link. For now, implement path 1 only and add a size estimate check. Flag path 2 as a follow-up.

For CSV: use a simple CSV serializer (no library needed).
For PDF: use `@react-pdf/renderer` or generate HTML and print-to-PDF via the browser. Simplest approach for now: CSV only in v1, PDF as follow-up.

### Files to change

**`page.tsx`** — Overview tab: add Export button that opens the modal:
```tsx
<ExportModal orgId={orgId} orgName={org.name} />
```

**New file: `src/components/admin/ExportModal.tsx`** (client component)
- State: `open`, `selected` (Set of data types), `format` ("csv" | "pdf")
- Checkboxes: Assessments ✓, Documents ✓, CAPAs ✓ (all default-checked)
- Format radio: CSV | PDF
- Export button → calls `POST /api/admin/export?orgId=...` or a server action that returns a blob

**New file: `src/app/api/admin/export/route.ts`** (API route, not a server action — needed to return a file response)
```ts
// POST with { orgId, types: string[], format: "csv" }
// Auth: verify superadmin
// Fetch selected data from DB
// Serialize to CSV
// Return Response with Content-Disposition: attachment
// auditLog: "superadmin_org_exported"
```

**Why an API route instead of server action:** Server actions can't return file download responses. The API route pattern lets us stream back a CSV directly.

---

## Summary Table

| Ticket | DB Migration | New Files | Changed Files | Estimated Complexity |
|--------|-------------|-----------|--------------|---------------------|
| T3 Audit Log | None | `AuditLogTab.tsx` | `page.tsx` | Low |
| T1 Status | None | `InlineStatusSelect.tsx` | `page.tsx`, `actions.ts` | Low |
| T2 Modules | `org_module_settings` (JSONB) | `ModuleTogglesSection.tsx`, `src/lib/modules.ts` | `page.tsx`, `actions.ts`, 10 module pages | Medium |
| T5 Archive/Delete | `org_soft_delete` (deleted_at) | `DangerZoneSection.tsx` | `page.tsx`, `actions.ts`, orgs list page | Medium |
| T4 Export | None | `ExportModal.tsx`, `api/admin/export/route.ts` | `page.tsx` | Medium-High |

---

## Open Questions Before Building

1. **Module enforcement scope:** Should a disabled module redirect users to `/workbench` with an error, or silently hide the nav link? (Recommend: hide nav link + redirect if accessed directly.)

2. **Ticket 4 — PDF format:** Is a simple HTML-rendered PDF acceptable for v1, or does it need formatting? If basic is fine, skip `@react-pdf/renderer` and use browser print CSS.

3. **Ticket 4 — Large file email:** Is Resend already configured? Check for `RESEND_API_KEY` in `.env.local`. If not, scope this as a follow-up and ship CSV-only for now.

4. **Ticket 5 — Hard delete:** Confirm whether "Delete Org" should be a true hard delete (cascades everything) or soft delete (sets `deleted_at`). Soft delete is strongly recommended for compliance — a biosafety platform should not permanently destroy records without a data retention policy review.

5. **Status options:** The Profile tab currently has `pending` and `inactive` as options. Ticket 1 wants `Trial` and `Archived`. Confirm: replace pending→trial, inactive→archived? Or keep all 4 + add 2 (6 total)?
