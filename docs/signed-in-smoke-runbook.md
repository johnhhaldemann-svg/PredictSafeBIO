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
- Priority controls are visible.
- Assignment controls are visible.
- Due-date controls are visible.
- Status, note, source refresh, and closeout controls remain available.
- Bulk status update controls appear after selecting one or more visible tasks.
- Bulk activity note controls appear after selecting one or more visible tasks.
- Bulk closeout controls appear after selecting one or more visible tasks and require a closeout note.

## Assigned-Member Smoke

Sign in to production as the member account, then verify the same saved views:

- `/my-work?view=high_priority`
- `/my-work?view=overdue`
- `/my-work?view=blocked`
- `/my-work?view=ready`

Expected member behavior:

- The matching assigned smoke task appears in each saved view.
- Status and activity note controls are visible.
- Priority controls are hidden.
- Assignment controls are hidden.
- Due-date controls are hidden.
- Bulk status update controls can update selected assigned tasks only.
- Bulk activity note controls can add notes to selected assigned tasks only.
- Bulk closeout controls can complete selected assigned tasks only and require a closeout note.

## Verification Notes

On 2026-06-01, signed-in production smoke passed for the owner and member saved-view paths above after PR #31 was promoted. The run confirmed the active saved-view summary rendered for each saved view, the sort control exposed Priority, Due date, Status, and Source module options, owner assignment/due-date controls were visible, and member assignment/due-date controls stayed hidden while status and note controls remained available.

On 2026-06-01, signed-in production priority-control smoke passed after PR #33 was promoted. Owner priority controls were visible; member priority, assignment, and due-date controls stayed hidden while status and note controls remained available.

On 2026-06-01, signed-in production bulk-control smoke passed after PR #35 was promoted. Owner and member runs confirmed selected counts updated, bulk status controls rendered, and no bulk assignment, due-date, or priority controls were exposed.

On 2026-06-01, signed-in production bulk-note smoke passed after PR #37 was promoted. Owner and member runs confirmed bulk note controls rendered for selected tasks, selected counts synced, and no bulk assignment, due-date, or priority controls were exposed.

On 2026-06-01, signed-in production bulk-closeout smoke passed after PR #39 was promoted. Owner and member runs confirmed bulk closeout controls rendered, selected counts synced, the complete status was carried by a hidden field, a closeout note field was present, and no bulk assignment, due-date, or priority controls were exposed.
