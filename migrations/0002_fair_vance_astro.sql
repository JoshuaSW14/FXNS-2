CREATE TABLE "fxn_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fxn_id" uuid NOT NULL,
	"reporter_id" uuid,
	"reason" text NOT NULL,
	"details" text,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fxn_reports" ADD CONSTRAINT "fxn_reports_fxn_id_fxns_id_fk" FOREIGN KEY ("fxn_id") REFERENCES "public"."fxns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fxn_reports" ADD CONSTRAINT "fxn_reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;