import { sql } from "drizzle-orm";
import { check, pgPolicy, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { framedAppRole, framedAuthRole } from "./roles";

/**
 * A gallery. Columns follow Better Auth's organizations plugin. Managed by `framed_auth`; the
 * app role can only read the organization it acts for (`app.organization_id`, ADR 0004).
 * Force-RLS and the grants are in the migration that follows the generated one.
 */
export const organization = pgTable(
  "organization",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    logo: text("logo"),
    metadata: text("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Better Auth generates the ids; an empty one could never be told from "no context".
    check("organization_id_not_empty", sql`${table.id} <> ''`),
    pgPolicy("organization_app_select", {
      for: "select",
      to: framedAppRole,
      // NULLIF: an empty setting (what a finished transaction leaves behind) becomes NULL and
      // matches nothing. Template for every tenant table.
      using: sql`${table.id} = NULLIF(current_setting('app.organization_id', true), '')`,
    }),
    pgPolicy("organization_auth_all", {
      for: "all",
      to: framedAuthRole,
      using: sql`true`,
      withCheck: sql`true`,
    }),
  ],
);
