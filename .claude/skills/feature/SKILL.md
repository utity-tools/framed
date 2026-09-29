---
name: feature
description: Start a new piece of work - sync main, create a branch and propose a plan with briefs before writing code.
argument-hint: <short-description>
disable-model-invocation: true
---

Start new work for: $ARGUMENTS

1. Run `git status`. If there are uncommitted changes, stop and ask what to do with them.
2. Update main: `git switch main && git pull --ff-only`.
3. Pick the branch type from the description (`feat`, `fix`, `chore`, `docs`, `test`,
   `refactor`, `ci`, `build`, `perf`) and create `git switch -c <type>/<kebab-case-name>`.
4. Explore only the code the change touches, then write a short plan:
   - goal and acceptance criteria,
   - the commits it will be split into (each atomic and green: PRs are rebase-merged),
   - the failing tests that come first,
   - one brief per subagent: goal, files in scope, files out of scope, done criteria,
   - whether it needs a migration, an ADR or the security auditor.
5. Stop and wait for approval of the plan before writing any code.
