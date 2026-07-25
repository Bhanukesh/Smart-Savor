---
description: Merge a PR and clean up the branch
---

Merge the pull request for the current branch (or the PR/branch given in `$ARGUMENTS`, if provided) and clean up afterward.

1. Identify the pull request: `gh pr view $ARGUMENTS` (or with no arguments, for the current branch). Confirm it exists and is mergeable — if it isn't (merge conflicts, failing checks, still a draft), stop and tell the user what's blocking it.
2. Squash merge it: `gh pr merge --squash $ARGUMENTS`.
3. Checkout `main`.
4. Pull the latest changes: `git pull origin main`.
5. Delete the feature branch, local and remote, if it still exists (GitHub may have already deleted the remote branch on merge — check before trying, don't error on a branch that's already gone).

Report which PR was merged and confirm `main` is up to date and the feature branch is gone.
