import type { Pool } from "pg";

const checked = new WeakMap<Pool, Promise<void>>();

async function check(pool: Pool): Promise<void> {
  const { rows } = await pool.query<{ unsafe: boolean; is_member: boolean }>(
    `select (r.rolsuper or r.rolbypassrls) as unsafe,
            pg_has_role(current_user, 'framed_app', 'member') as is_member
       from pg_roles r where r.rolname = current_user`,
  );
  const role = rows[0];
  if (!role || role.unsafe) {
    throw new Error(
      "DATABASE_URL connects as a role that is superuser or bypasses Row Level Security. " +
        "Use the framed_app_login user; the owner belongs in MIGRATION_DATABASE_URL only.",
    );
  }
  if (!role.is_member) {
    throw new Error("DATABASE_URL must connect as a member of the framed_app role.");
  }
}

/**
 * Refuses to run the app as a role that RLS does not bind. One query per pool; a failed check is
 * not cached, so a transient connection error does not disable the app until restart.
 */
export function assertAppRole(pool: Pool): Promise<void> {
  let result = checked.get(pool);
  if (!result) {
    result = check(pool);
    checked.set(pool, result);
    result.catch(() => checked.delete(pool));
  }
  return result;
}
