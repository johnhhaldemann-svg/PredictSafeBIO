# GitHub Branch Protection

After the repository is created on GitHub, protect `main` with these settings:

- Require a pull request before merging.
- Require approvals before merging.
- Dismiss stale pull request approvals when new commits are pushed.
- Require status checks to pass before merging.
- Required check: `Install, lint, test, build`.
- Require branches to be up to date before merging.
- Restrict force pushes and deletions.

This cannot be fully enforced from this local workspace until a GitHub remote exists and the GitHub CLI or connector has repository admin access.
