# 0001. Stack, environments and development workflow

- **Status:** accepted
- **Date:** 2026-09-29

## Context

Framed is a solo portfolio project built with heavy use of AI coding agents. It has three
audiences with different needs: operators who load and translate content, gallery staff who read
analytics and leads, and visitors who arrive from an NFC tap on a phone and must see the artwork
in about a second. The repository itself is part of the product: its history, tests and
decisions must be readable by a reviewer.

## Decision

- **One Next.js 16 app** (App Router, Server Actions, React 19, TypeScript strict), with route
  groups for the public pages, the gallery portal and the operator console. Types flow from the
  database schema and Zod schemas to the UI.
- **Environments:** Postgres in Docker for local development and CI, one isolated database
  branch per pull request behind its Vercel preview, and production deployed only after CI and
  its migrations. The data platform is decided in [ADR 0002](0002-neon-and-drizzle.md).
- **Trunk-based workflow:** short-lived branches from `main`, a pull request for every change,
  CI green before merging, humans merge.
- **Rebase merge, not squash.** Every commit of a PR lands on `main` in a linear history. In
  exchange, every commit must be atomic, follow Conventional Commits and leave the build green.
  commitlint checks each commit locally and in CI.
- **Tests first**, with the failing test in the same commit as the change or right before it,
  so every commit on `main` still passes.
- **Enforcement in layers:** agent instructions, Claude Code hooks and permissions, git hooks,
  CI and branch rules. Each layer catches what the previous one misses.

## Alternatives considered

- **Squash merge:** a tidy `main` with one commit per PR, but it discards the step-by-step
  history this project wants to show, and it hides whether each step was green.
- **Merge commits:** keeps the commits but adds a merge commit per PR and a non-linear history
  that is harder to read and bisect.
- **`develop` or `staging` branch:** more merges and drift for one developer; per-PR previews
  with their own database branch give the same safety.
- **Separate API service:** duplicated types and a second deploy surface without a real need.

## Consequences

- Commits must be curated before a PR is opened (reworded or split while the branch is still
  private). The `/ship` skill and the code reviewer check the history.
- `git bisect` on `main` works commit by commit.
- Every change, however small, needs a branch and a PR.
