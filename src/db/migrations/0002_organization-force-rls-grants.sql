-- drizzle-kit emits neither FORCE ROW LEVEL SECURITY nor grants (ADR 0004).
-- FORCE makes the policies bind the table owner too, but only a non-superuser owner without
-- BYPASSRLS. It does not bind the Docker superuser or the Neon owner (BYPASSRLS): those still see
-- everything, which is why the app must never connect as the owner (see src/db/role-guard.ts).
ALTER TABLE "organization" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
-- The app reads only its own organization; Better Auth (framed_auth) manages all of them.
GRANT SELECT ON "organization" TO framed_app;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "organization" TO framed_auth;
