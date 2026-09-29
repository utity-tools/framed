-- Local login users, one per group role (ADR 0004). The group roles themselves are created by
-- the first migration; roles are cluster-wide, so we create them here too (idempotently) to be
-- able to grant membership before migrations run.
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

CREATE ROLE framed_auth_login LOGIN PASSWORD 'framed_auth_login' IN ROLE framed_auth;
CREATE ROLE framed_app_login LOGIN PASSWORD 'framed_app_login' IN ROLE framed_app;
