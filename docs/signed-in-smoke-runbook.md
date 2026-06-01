# Signed-In Smoke Runbook

Last updated: 2026-06-01

## Reusable Accounts

Credentials are stored outside the repository at:

`C:\Users\johnh\AppData\Local\PredictSafeBIO\smoke-accounts.json`

The file contains one owner account and one assigned-member account for the Supabase project `mygxjnvzdljmdriokvvx`. Do not commit the file or paste the passwords into project docs, issues, PRs, or chat transcripts.

## Seeded Smoke Organization

Reusable org: `Codex Reusable Smoke Org`

Seeded Foundation task coverage:

- High priority: `Smoke saved view: high priority owner review`
- Overdue: `Smoke saved view: overdue assigned member task`
- Blocked: `Smoke saved view: blocked evidence follow-up`
- Ready for closure: `Smoke saved view: ready for closure source`
- Normal open: `Smoke saved view: normal open task`

All smoke tasks are assigned to the reusable member so owner and assigned-member views can be compared against the same records.

## Owner Smoke

Sign in to production as the owner account, then verify:

- `/my-work?view=high_priority`
- `/my-work?view=overdue`
- `/my-work?view=blocked`
- `/my-work?view=ready`

Expected owner behavior:

- The matching smoke task appears in each saved view.
- Assignment controls are visible.
- Due-date controls are visible.
- Status, note, source refresh, and closeout controls remain available.

## Assigned-Member Smoke

Sign in to production as the member account, then verify the same saved views:

- `/my-work?view=high_priority`
- `/my-work?view=overdue`
- `/my-work?view=blocked`
- `/my-work?view=ready`

Expected member behavior:

- The matching assigned smoke task appears in each saved view.
- Status and activity note controls are visible.
- Assignment controls are hidden.
- Due-date controls are hidden.

## Verification Notes

On 2026-06-01, signed-in production smoke passed for the owner and member saved-view paths above. The member run confirmed assignment and due-date controls stayed hidden while status and note controls remained available.

The branch `codex/my-work-dashboard-polish` adds a clearer visible active saved-view state and task sorting controls. Re-run this runbook after that branch is promoted to production so screenshots show the active saved-view summary and sorting state.
