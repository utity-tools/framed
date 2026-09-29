<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Framed

NFC wall labels for art galleries. A visitor taps a card with their phone and reads the artwork
in their language. Framed is a white-glove service: operators import each gallery's artworks,
review AI-proposed translations and encode the cards. Portfolio project: code quality, tests and
a clean history matter as much as features. The plan is in [`docs/plan.md`](docs/plan.md).

## Stack

- Next.js 16 (App Router, Server Actions) · React 19 · TypeScript (strict) · pnpm
- Tailwind CSS v4 · shadcn/ui · next-intl (ES, EN, FR, DE)
- Neon Postgres · Drizzle ORM · Row Level Security · Better Auth (organizations)
- Vercel Blob · Upstash Redis (rate limits) · AI SDK v6 via AI Gateway
- Vitest (unit) · Playwright + axe (E2E, accessibility)

## Commands

| Task                         | Command                                           |
| ---------------------------- | ------------------------------------------------- |
| Dev server                   | `pnpm dev`                                        |
| Lint / format / format check | `pnpm lint` / `pnpm format` / `pnpm format:check` |
| Type check                   | `pnpm typecheck`                                  |
| Unit tests (watch, coverage) | `pnpm test` (`test:watch`, `test:coverage`)       |
| E2E tests                    | `pnpm test:e2e`                                   |

## Workflow (mandatory)

1. **Never work on `main`.** Every change lives on a branch: `<type>/<kebab-case>` with type
   `feat`, `fix`, `chore`, `docs`, `test`, `refactor`, `ci`, `build` or `perf`.
2. **Atomic Conventional Commits.** PRs are **rebase-merged**, so every commit lands on `main`:
   each one does one thing, has a clear message and leaves lint, types and tests green.
3. **Tests first.** New behaviour starts with a failing test.
4. **Green before commit:** git hooks run lint, format and related tests. Never skip them.
5. **Everything reaches `main` through a PR** with CI green. Humans merge.
6. Significant decisions get an ADR in `docs/adr/` (copy `0000-template.md`).

## Project structure

```
src/app/          Routes, layouts, Server Actions (route groups per zone: public, portal, console)
src/components/   UI
src/lib/<domain>/ Business logic: small, pure, unit tested
src/db/           Drizzle schema, migrations, RLS policies, seed
tests/e2e/        Playwright specs and support helpers
docs/             Plan, ADRs, sessions, security, incidents
```

## Conventions

### Code

- Server Components by default; `"use client"` only for interactivity.
- Mutations go through Server Actions; validate every input with Zod.
- No `any`. Prefer types inferred from Zod schemas and the Drizzle schema.
- Business logic lives in `src/lib`, not in components, routes or actions.
- Every user-facing string goes through next-intl.

### Data

- Multi-tenant: every tenant-owned table carries `organization_id` and has RLS with explicit
  policies in the same migration, each with a test.
- Never edit an applied migration; add a new one.
- No personal data in analytics.

### AI

- AI output is always a proposal: an operator approves it before it is saved or published.
- Every model output is validated against a Zod schema. Artwork text in prompts is untrusted.
- Tests never call a real model.

### Security

- Never commit secrets. Only `.env.example` is versioned. Never read or print `.env` files.
- Public endpoints are rate limited and return generic errors.
