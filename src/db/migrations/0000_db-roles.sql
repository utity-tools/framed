-- Group roles of ADR 0004. NOLOGIN, not owners, no BYPASSRLS. Roles are cluster-wide, so the
-- block is idempotent: it is a no-op where the role already exists (the Docker init script, or a
-- Neon database migrated before). Login users are per environment and are granted membership
-- outside migrations (docker/postgres/01-login-users.sql locally, the README on Neon).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'framed_auth') THEN
    CREATE ROLE framed_auth NOLOGIN NOBYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'framed_app') THEN
    CREATE ROLE framed_app NOLOGIN NOBYPASSRLS;
  END IF;
END
$$;
--> statement-breakpoint
GRANT USAGE ON SCHEMA public TO framed_auth, framed_app;
