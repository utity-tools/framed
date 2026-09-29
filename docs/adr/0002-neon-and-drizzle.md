# 0002. Neon Postgres and Drizzle for the data layer

- **Status:** accepted
- **Date:** 2026-09-29

## Context

Framed is multi-tenant: each gallery must only ever see its own artworks, leads and analytics.
Previews of each pull request should run against realistic but isolated data, and schema changes
must be reviewable in the pull request that introduces them. The previous project of the same
author used Supabase; this one deliberately assembles its platform from separate pieces to show
the trade-offs.

## Decision

- **Neon** serverless Postgres, provisioned through the Vercel Marketplace. Each pull request
  gets a database **branch** (copy-on-write) for its preview, created and deleted automatically.
- **Drizzle ORM**: the schema is TypeScript in `src/db/schema/`; migrations are generated SQL,
  committed and never edited once applied.
- **Row Level Security** in Postgres for tenant isolation, declared next to each table with
  Drizzle `pgPolicy` and tested. Application code also filters by organization; RLS is the
  last line of defence, not the only one.
- **Local and CI:** plain Postgres in Docker, so tests never depend on a network database.

## Alternatives considered

- **Supabase:** Postgres, auth, storage and realtime in one product, with RLS as a first-class
  feature. Faster to start, but repeats the previous project, and Framed needs no realtime.
- **Prisma:** mature, but its schema language sits outside TypeScript and RLS policies would
  live in hand-written SQL apart from the models.
- **A single shared database for all previews:** simpler, but previews would see each other's
  data and migrations of an open PR would affect every other preview.

## Consequences

- Auth, file storage and rate limiting are chosen separately (ADRs to come).
- Branch-per-preview needs the Neon integration configured in Vercel; CI keeps its own
  disposable Postgres.
- The application must set the tenant and user context on each connection for RLS policies to
  apply; this is designed with the auth ADR.
