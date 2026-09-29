# 0004. Better Auth and the tenant context for Row Level Security

- **Status:** accepted
- **Date:** 2026-09-29

## Context

Framed is multi-tenant: a gallery is an organization, its staff are members with a role
(`admin`, `staff`), and Framed operators work across galleries. [ADR 0002](0002-neon-and-drizzle.md)
made Postgres Row Level Security the last line of defence for tenant isolation and left open
how each connection learns which user and organization it acts for.

Two kinds of queries hit the database:

- **Auth queries** (sign-in, sessions, invitations, "which organizations am I in?") run before
  any tenant is known and must see auth tables across organizations.
- **Tenant queries** (artists, artworks, translations, leads) must only ever see one
  organization's rows.

## Decision

**Better Auth** with its organizations plugin handles identity, sessions, organizations,
members and invitations. Tenant isolation is enforced by Postgres, with two database roles and
a per-transaction context.

- **Roles.** Migrations create two `NOLOGIN` group roles; each environment creates its own
  login users and grants them one role. Neither role owns tables nor has `BYPASSRLS`.
  - `framed_auth`: used only by Better Auth, with privileges on the auth tables only.
  - `framed_app`: used by the rest of the app, with privileges on tenant tables and read access
    to what tenant queries need.
- **RLS.** Every tenant-owned table has RLS enabled **and forced**, with explicit policies per
  role. `framed_auth` has no privileges on tenant tables at all.
- **Tenant context.** Every tenant query runs inside `withTenant({ userId, organizationId }, fn)`,
  which opens a transaction and sets `app.user_id` and `app.organization_id` with
  `set_config(..., true)` (transaction-local, so a pooled connection never leaks it). Once set,
  a transaction-local setting reads as `''` (not NULL) after the transaction, so every policy
  uses the same template, `organization_id = NULLIF(current_setting('app.organization_id', true), '')`:
  without a context nothing matches, and ids are checked non-empty.
- **The organization table is the tenant root.** `framed_app` may only read its current
  organization; `framed_auth` has full access to it (Better Auth manages organizations) and
  no privileges on any other tenant table.
- **The app refuses to run with a bypassing role.** Before its first transaction, `withTenant` checks that the
  connected role is not a superuser, has no `BYPASSRLS` and is a member of `framed_app`.
  `FORCE ROW LEVEL SECURITY` only binds an owner without `BYPASSRLS`; the Docker superuser and
  the Neon owner bypass it, so they are for migrations only.
- **Where the context comes from.** Server Actions and route handlers read the session with
  Better Auth, take its active organization, check membership, and only then call
  `withTenant`. The organization id is never taken from client input.
- **Driver.** `pg` (node-postgres) through `drizzle-orm/node-postgres` everywhere: Docker
  locally and in CI, Neon's pooled endpoint in production (Fluid Compute keeps the pool warm).
  Interactive transactions are required for `set_config`, which rules out HTTP-only drivers.
- **Operators.** Cross-gallery work by Framed staff uses the same path with an explicit
  organization switch, so every operator action is still scoped and attributable.

## Alternatives considered

- **Clerk (Vercel Marketplace):** fastest to start, but organizations and users would live
  outside our database, RLS would need to trust synced copies, and the portfolio would show
  less of the design.
- **Auth.js:** no built-in organizations or roles; we would build them by hand.
- **One role with `BYPASSRLS` for auth:** simpler, but a bug in any code path using that
  connection would see every tenant.
- **Application filtering only (`where organization_id = ?`):** one missing filter leaks a
  gallery's data; RLS keeps that mistake from becoming an incident.
- **Session variables with `SET` instead of `set_config(..., true)`:** they outlive the
  transaction and leak between requests sharing a pooled connection.

## Consequences

- Tenant data can only be read inside `withTenant`, which costs a transaction per request and
  makes forgotten context fail closed (empty results) instead of open.
- Each environment needs two login users; local and CI create them in an init script, Neon in
  a documented one-off step.
- RLS tests connect as each role and prove who can and who cannot read every table.
- Anything that can run SQL as `framed_app` can also set the context, so raw SQL built from
  strings (`sql.raw`, concatenation) is a security issue, not a style issue.
- `withTenant` trusts its caller. Server code gets a helper that reads the session and checks
  membership before calling it, and only that helper is used outside `src/db`. Organization
  switches by operators are audit-logged.
- Rules for every new tenant table: RLS enabled and forced, policies from the template above,
  explicit `WITH CHECK` on insert and update policies (so a row cannot be moved to another
  organization), grants per role (sequences included), and a test per role and operation.
- Query errors can carry parameters (for example a lead's email), so they are logged by code
  and never returned to the client.
- Public reads (the visitor's artwork page, the tag resolver) need narrow views or security
  definer functions; they are designed with the public pages in v0.1. Views must use
  `security_invoker`; definer functions pin `search_path`, return whitelisted columns and have
  `EXECUTE` revoked from `PUBLIC` and granted to a dedicated role.
