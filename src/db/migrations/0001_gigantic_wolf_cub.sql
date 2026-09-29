CREATE TABLE "organization" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"logo" text,
	"metadata" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organization_slug_unique" UNIQUE("slug"),
	CONSTRAINT "organization_id_not_empty" CHECK ("organization"."id" <> '')
);
--> statement-breakpoint
ALTER TABLE "organization" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "organization_app_select" ON "organization" AS PERMISSIVE FOR SELECT TO "framed_app" USING ("organization"."id" = NULLIF(current_setting('app.organization_id', true), ''));--> statement-breakpoint
CREATE POLICY "organization_auth_all" ON "organization" AS PERMISSIVE FOR ALL TO "framed_auth" USING (true) WITH CHECK (true);