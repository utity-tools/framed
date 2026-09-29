@AGENTS.md

## Claude Code specifics

### Roles

The main session is the **director**: it plans, writes briefs, delegates, reviews and integrates.
It does small tasks itself and delegates when a specialist is worth the cold start:

| Area                                                      | Agent               |
| --------------------------------------------------------- | ------------------- |
| Schema, migrations, RLS, seed                             | `db-engineer`       |
| Server Actions, routes, auth, validation, AI, imports     | `backend-engineer`  |
| Pages, components, i18n, accessibility                    | `frontend-engineer` |
| Failing tests first, unit tests                           | `qa-engineer`       |
| Playwright flows and axe                                  | `e2e-tester`        |
| Diff review before every PR (read-only)                   | `code-reviewer`     |
| Auth, RLS, secrets, headers, public endpoints (read-only) | `security-auditor`  |

A **brief** gives the agent: goal, files in scope, files out of scope, done criteria. A
**report** comes back short (paths, results, questions, no code dumps).

### Session protocol

- Start: read the session-start output (branch, pending work, latest handoff). State the
  session goal in one line. Start work with `/feature <name>`.
- One goal per session. Finish a change with `/ship` and the session with `/handoff`.
- Plan before coding: for anything beyond a trivial fix, propose a plan and wait for approval.

### Canaries

- Every reply to the user starts with **"Chef"**.
- Every subagent report ends with its role token (`[DB-ACK]`, `[BE-ACK]`, `[FE-ACK]`,
  `[QA-ACK]`, `[E2E-ACK]`, `[CR-ACK]`, `[SEC-ACK]`). A report without it is rejected and the
  agent is briefed again.
- Every handoff ends with `— end of handoff NNNN —`.

If you notice you broke a canary, say so, write the handoff and recommend a fresh session.

### Hooks

If a hook blocks a command, do not try to work around it: explain why it was blocked.
