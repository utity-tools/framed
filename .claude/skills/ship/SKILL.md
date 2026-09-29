---
name: ship
description: Validate the current branch, review it, push and open a PR.
disable-model-invocation: true
---

Ship the current branch.

1. `git branch --show-current`. If it is `main`, stop: work must be on a branch.
2. Run `pnpm format:check`, `pnpm lint`, `pnpm typecheck` and `pnpm test`. If the change touches
   user flows, `pnpm test:e2e` too. Fix failures; never skip checks or use `--no-verify`.
3. Launch `code-reviewer` on the diff. If the diff touches auth, database policies, secrets,
   headers or public endpoints, launch `security-auditor` too. Check each report ends with its
   token. Fix every blocker (critical/high for security); list the rest for the PR.
4. Check the history with `git log main..HEAD --oneline`: PRs are rebase-merged, so every commit
   must be atomic and Conventional. Fix it before pushing if it is not.
5. Push: `git push -u origin HEAD`.
6. Open the PR with `gh pr create`, filling `.github/pull_request_template.md`: a Conventional
   title, what and why, how it was tested, screenshots if the UI changed, non-blocking notes.
7. Return the PR link. Do not merge: the human merges after CI and the preview look good.
