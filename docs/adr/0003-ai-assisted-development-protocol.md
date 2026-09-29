# 0003. AI-assisted development protocol

- **Status:** accepted
- **Date:** 2026-09-29

## Context

Most code in this repository is written by AI coding agents under human supervision. Three
risks come with that: agents skip conventions when their context fills up, long sessions drift
from their instructions without anyone noticing, and every new session spends tokens rebuilding
context it already had. In the previous project, a session ended with ten commits that were
never pushed or opened as a pull request.

## Decision

- **Director and specialists.** The main session plans, delegates and integrates. Seven
  subagents in `.claude/agents/` own one area each and run on a smaller model; two of them
  (`code-reviewer`, `security-auditor`) are read-only.
- **Briefs and reports.** A brief states goal, files in scope and out of scope, and done
  criteria. A report is short: paths, results, questions, never code dumps.
- **Sessions.** A `SessionStart` hook prints the branch, uncommitted changes, unpushed commits
  and the latest handoff. `/handoff` closes a session with a short note in `docs/sessions/`.
- **Drift canaries.** The director starts every reply with an agreed word, each subagent ends
  its report with a role token, and each handoff ends with a seal. A missing canary means the
  instructions were lost: the session is closed with a handoff and a fresh one starts.
- **Rules are enforced by tools, not memory:** hooks block commits and pushes on `main`,
  skipped git hooks, force pushes and agent merges; permissions deny reading `.env` files and
  deploying to production.

## Alternatives considered

- **A single agent for everything:** simpler, but one context holds every concern and fills up
  fastest; no read-only reviewer.
- **One subagent per task by default:** each starts cold, so small tasks cost more tokens than
  doing them directly.
- **Instructions only:** they are the first thing a long session forgets.

## Consequences

- Canaries detect forgotten instructions; they do not prove the code is right. Tests, CI and
  human review still do that.
- Hooks can block legitimate commands (for example, a command that merely mentions a blocked
  flag). When that happens the agent explains the block instead of working around it.
