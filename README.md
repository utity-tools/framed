# Framed

[![CI](https://github.com/utity-tools/framed/actions/workflows/ci.yml/badge.svg)](https://github.com/utity-tools/framed/actions/workflows/ci.yml)
[![Security](https://github.com/utity-tools/framed/actions/workflows/security.yml/badge.svg)](https://github.com/utity-tools/framed/actions/workflows/security.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

NFC wall labels for art galleries. A visitor taps the card next to an artwork with their phone
and reads about it in their own language: its story, the artist and, when the gallery allows
it, the price. They can share it, save it for later and tell the gallery they are interested.

Framed is a white-glove service: the gallery sends its list of artworks, and Framed translates
the content, encodes the cards and hands them over ready to hang.

> **Status:** v0.0, foundations. Tooling, CI, security scanning and the development protocol
> are in place; the product starts with v0.1. See the [plan](docs/plan.md).

## How it works

```
 NFC card ──tap──▶ framed/t/<tagId> ──▶ artwork page in the visitor's language
 (QR fallback)          │                   save · share · "I'm interested"
                        ▼
                 scan counted (no personal data) ──▶ gallery analytics and leads
```

| Zone             | For              | What it does                                                        |
| ---------------- | ---------------- | ------------------------------------------------------------------- |
| Public pages     | Visitors         | Artwork in ES, EN, FR or DE, accessible, fast on a phone            |
| Gallery portal   | Gallery staff    | Artworks, availability and prices, analytics, leads                 |
| Operator console | Framed operators | Import artworks, review AI translations, encode cards, print labels |

## Stack

| Area     | Tools                                                                                  |
| -------- | -------------------------------------------------------------------------------------- |
| App      | Next.js 16 (App Router, Server Actions, React Compiler) · React 19 · TypeScript strict |
| UI       | Tailwind CSS v4 · shadcn/ui · next-intl                                                |
| Data     | Neon Postgres · Drizzle ORM · Row Level Security                                       |
| Auth     | Better Auth (organizations, passkeys, magic links)                                     |
| Platform | Vercel · Vercel Blob · Upstash Redis · AI Gateway                                      |
| Quality  | Vitest · Playwright · axe · ESLint · Prettier · Husky · commitlint · GitHub Actions    |
| Security | CodeQL · gitleaks · OSV-Scanner · Dependabot · actions pinned by SHA                   |

## Roadmap

- [x] **v0.0** Foundations: tooling, CI, security scanning, agents and protocol, first ADRs
- [ ] **v0.1** Multi-tenant auth, operator console, public artwork page, tag resolver, QR
- [ ] **v0.2** CSV import, four languages, AI translation with review, WCAG 2.2 AA
- [ ] **v0.3** Card encoding station (Web NFC), printable labels, public demo gallery
- [ ] **v0.4** Save, share and leads; gallery portal
- [ ] **v0.5** Analytics for galleries
- [ ] **v0.6** Signed card URLs (NTAG 424 DNA), offline mode, exhibitions

## Getting started

Requirements: Node 24 and pnpm.

```bash
pnpm install              # also installs the git hooks
cp .env.example .env.local
pnpm dev                  # http://localhost:3000
```

| Task                         | Command                                           |
| ---------------------------- | ------------------------------------------------- |
| Lint / format / format check | `pnpm lint` / `pnpm format` / `pnpm format:check` |
| Type check                   | `pnpm typecheck`                                  |
| Unit tests (coverage)        | `pnpm test` (`pnpm test:coverage`)                |
| E2E and accessibility tests  | `pnpm test:e2e`                                   |

## How this project is built

Development is AI-assisted, with guardrails ([ADR 0003](docs/adr/0003-ai-assisted-development-protocol.md)):

- **Context for agents:** [`AGENTS.md`](AGENTS.md) holds the stack, commands and conventions;
  [`CLAUDE.md`](CLAUDE.md) adds roles, the session protocol and drift canaries.
- **Specialised subagents** in [`.claude/agents`](.claude/agents): database, backend, frontend,
  QA, E2E, and two read-only reviewers for code and security.
- **Enforced workflow:** feature branches, tests first, atomic Conventional Commits and PRs
  **rebase-merged** into `main`, so every step of the history is visible and green
  ([ADR 0001](docs/adr/0001-stack-environments-and-workflow.md)). Enforced by Claude Code hooks,
  git hooks, CI and branch rules, not just by convention.
- **Decisions** are recorded as [ADRs](docs/adr); sessions leave a handoff in
  [`docs/sessions`](docs/sessions).

## License

[MIT](LICENSE)
