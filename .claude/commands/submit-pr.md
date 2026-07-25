---
description: Submit the current branch as a PR
---

Prepare and submit the current branch as a pull request against `main`.

1. **Run this repo's checks** — `npx tsc --noEmit -p tsconfig.json` for the Next.js app, and if any files under `smart-savor-mcp/` changed, its pytest suite too (`source smart-savor-mcp/.venv/bin/activate && pytest smart-savor-mcp/test_agents.py smart-savor-mcp/test_intake_agent.py`). If any of this surfaces issues, warnings, or errors, **stop here — do not submit the PR.** Report exactly what failed and give clear, specific instructions for how to fix it.
2. If this branch makes a major change to the application's architecture, structure, or conventions, update `CLAUDE.md` to reflect it (create it if it doesn't exist and the project warrants one).
3. Make sure any design documents this change affects (e.g. under `docs/`) are up to date with what was actually built.
4. Commit any pending/uncommitted changes on the current branch.
5. Fetch the latest remote state: `git fetch --prune`.
6. Rebase this branch's changes onto `origin/main`. If conflicts come up, stop and ask the user how to resolve them rather than guessing at a resolution.
7. Delete any intermediate documents produced while doing this work (refactoring plans, remediation plans, scratch notes) that shouldn't ship in the PR.
8. Create the PR with the GitHub CLI (`gh pr create`) — a clear title, and a body with a summary and a test plan.
9. If there's an issue number associated with this work, reference it in the PR description (e.g. `Closes #123`) so it auto-closes when the PR merges.

Report the PR URL when done.
