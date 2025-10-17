CREATE TABLE "ai_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"feature" text NOT NULL,
	"tokens_used" integer NOT NULL,
	"cost" integer,
	"request_data" jsonb,
	"response_data" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_configurations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"base_url" text NOT NULL,
	"auth_method" text NOT NULL,
	"auth_config" jsonb,
	"default_headers" jsonb,
	"rate_limit" integer DEFAULT 100,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"config_id" uuid NOT NULL,
	"credential_type" text NOT NULL,
	"encrypted_value" text NOT NULL,
	"expires_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_usage_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"config_id" uuid NOT NULL,
	"tool_id" uuid,
	"method" text NOT NULL,
	"endpoint" text NOT NULL,
	"status_code" integer,
	"response_time" integer,
	"error_message" text,
	"request_size" integer,
	"response_size" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "automation_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"trigger_type" text NOT NULL,
	"trigger_config" jsonb NOT NULL,
	"action_type" text NOT NULL,
	"action_config" jsonb NOT NULL,
	"last_triggered" timestamp,
	"run_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"stripe_invoice_id" text,
	"stripe_charge_id" text,
	"type" text NOT NULL,
	"status" text NOT NULL,
	"amount" integer NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"description" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "creator_earnings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"total_earnings" integer DEFAULT 0 NOT NULL,
	"pending_earnings" integer DEFAULT 0 NOT NULL,
	"lifetime_sales" integer DEFAULT 0 NOT NULL,
	"stripe_account_id" text,
	"last_payout_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "creator_earnings_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "email_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"weekly_digest" boolean DEFAULT true NOT NULL,
	"new_reviews" boolean DEFAULT true NOT NULL,
	"tool_activity" boolean DEFAULT true NOT NULL,
	"moderation_alerts" boolean DEFAULT true NOT NULL,
	"subscription_updates" boolean DEFAULT true NOT NULL,
	"marketing_emails" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "email_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "encouragements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_user_id" uuid NOT NULL,
	"to_user_id" uuid NOT NULL,
	"post_id" uuid,
	"type" text DEFAULT 'like' NOT NULL,
	"message" text,
	"badge_type" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "featured_tools" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fxn_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "featured_workflows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workflow_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fxn_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fxn_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fxn_views" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fxn_id" uuid NOT NULL,
	"user_id" uuid,
	"viewed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"category" text,
	"target_value" integer,
	"current_value" integer DEFAULT 0 NOT NULL,
	"unit" text,
	"deadline" timestamp,
	"status" text DEFAULT 'active' NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"streak_count" integer DEFAULT 0 NOT NULL,
	"best_streak" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integration_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text,
	"account_label" text,
	"auth_type" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"expires_at" timestamp,
	"scopes" jsonb,
	"metadata" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"type" text DEFAULT 'note' NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"ai_summary" text,
	"ai_insights" jsonb DEFAULT '[]'::jsonb,
	"attachments" jsonb DEFAULT '[]'::jsonb,
	"linked_task_ids" jsonb DEFAULT '[]'::jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"status" text NOT NULL,
	"stripe_transfer_id" text,
	"stripe_account_id" text NOT NULL,
	"failure_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "progress_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"content" text NOT NULL,
	"type" text DEFAULT 'update' NOT NULL,
	"visibility" text DEFAULT 'public' NOT NULL,
	"linked_task_ids" jsonb DEFAULT '[]'::jsonb,
	"linked_goal_ids" jsonb DEFAULT '[]'::jsonb,
	"metrics" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ratings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fxn_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review_helpful" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"review_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fxn_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"rating_id" uuid NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"helpful_count" integer DEFAULT 0 NOT NULL,
	"moderation_status" text DEFAULT 'pending' NOT NULL,
	"moderated_by" uuid,
	"moderated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stripe_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stripe_event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"processed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"color" text,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tags_name_unique" UNIQUE("name"),
	CONSTRAINT "tags_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'todo' NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"category" text,
	"due_date" timestamp,
	"estimated_minutes" integer,
	"actual_minutes" integer,
	"ai_priority_score" integer,
	"habit_protected" boolean DEFAULT false NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tool_drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text DEFAULT 'custom' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"deleted_at" timestamp,
	"input_config" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"logic_config" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"output_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"generated_schema" jsonb,
	"test_results" jsonb DEFAULT '{}'::jsonb,
	"version" integer DEFAULT 1 NOT NULL,
	"template_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tool_pricing" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fxn_id" uuid NOT NULL,
	"pricing_model" text DEFAULT 'free' NOT NULL,
	"price" integer,
	"license_type" text DEFAULT 'personal',
	"stripe_price_id" text,
	"stripe_product_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tool_pricing_fxn_id_unique" UNIQUE("fxn_id")
);
--> statement-breakpoint
CREATE TABLE "tool_purchases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fxn_id" uuid NOT NULL,
	"buyer_id" uuid NOT NULL,
	"seller_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"platform_fee" integer NOT NULL,
	"creator_earnings" integer NOT NULL,
	"stripe_payment_intent_id" text,
	"license_type" text NOT NULL,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tool_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creator_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"input_config" jsonb NOT NULL,
	"logic_config" jsonb NOT NULL,
	"output_config" jsonb NOT NULL,
	"preview_image" text,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"rating" integer DEFAULT 0 NOT NULL,
	"rating_count" integer DEFAULT 0 NOT NULL,
	"is_premium" boolean DEFAULT false NOT NULL,
	"price" integer DEFAULT 0,
	"is_public" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tool_usage_stats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tool_id" uuid,
	"draft_id" uuid,
	"user_id" uuid,
	"run_count" integer DEFAULT 1 NOT NULL,
	"successful_runs" integer DEFAULT 0 NOT NULL,
	"average_run_time" integer DEFAULT 0,
	"last_used" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"webhook_id" uuid NOT NULL,
	"source_ip" text,
	"headers" jsonb,
	"payload" jsonb,
	"processing_status" text NOT NULL,
	"error_message" text,
	"processing_time" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_endpoints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"endpoint" text NOT NULL,
	"secret" text NOT NULL,
	"target_tool_id" uuid,
	"processing_config" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_triggered" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "webhook_endpoints_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
CREATE TABLE "workflow_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workflow_id" uuid NOT NULL,
	"source_step_id" uuid NOT NULL,
	"target_step_id" uuid NOT NULL,
	"source_handle" text,
	"target_handle" text,
	"label" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_creator_earnings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"total_earnings" integer DEFAULT 0 NOT NULL,
	"pending_earnings" integer DEFAULT 0 NOT NULL,
	"lifetime_sales" integer DEFAULT 0 NOT NULL,
	"last_payout_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "workflow_creator_earnings_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "workflow_execution_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"execution_id" uuid NOT NULL,
	"step_id" uuid NOT NULL,
	"status" text NOT NULL,
	"input_data" jsonb,
	"output_data" jsonb,
	"error_message" text,
	"started_at" timestamp,
	"completed_at" timestamp,
	"duration_ms" integer,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_executions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workflow_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"status" text NOT NULL,
	"trigger_data" jsonb,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"duration_ms" integer,
	"error_message" text,
	"error_step" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_pricing" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workflow_id" uuid NOT NULL,
	"pricing_model" text DEFAULT 'free' NOT NULL,
	"price" integer,
	"license_type" text DEFAULT 'personal',
	"stripe_price_id" text,
	"stripe_product_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "workflow_pricing_workflow_id_unique" UNIQUE("workflow_id")
);
--> statement-breakpoint
CREATE TABLE "workflow_purchases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workflow_id" uuid NOT NULL,
	"buyer_id" uuid NOT NULL,
	"seller_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"platform_fee" integer NOT NULL,
	"creator_earnings" integer NOT NULL,
	"stripe_payment_intent_id" text,
	"license_type" text NOT NULL,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workflow_id" uuid NOT NULL,
	"step_type" text NOT NULL,
	"step_subtype" text,
	"label" text NOT NULL,
	"position" jsonb NOT NULL,
	"config" jsonb NOT NULL,
	"integration_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"is_template" boolean DEFAULT false NOT NULL,
	"shareable_id" text,
	"trigger_type" text NOT NULL,
	"trigger_config" jsonb NOT NULL,
	"canvas_data" jsonb,
	"execution_count" integer DEFAULT 0 NOT NULL,
	"last_executed_at" timestamp,
	"view_count" integer DEFAULT 0 NOT NULL,
	"clone_count" integer DEFAULT 0 NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "workflows_shareable_id_unique" UNIQUE("shareable_id")
);
--> statement-breakpoint
ALTER TABLE "fxns" ADD COLUMN "builder_config" jsonb;--> statement-breakpoint
ALTER TABLE "fxns" ADD COLUMN "access_tier" text DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE "fxns" ADD COLUMN "moderation_status" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "fxns" ADD COLUMN "moderated_by" uuid;--> statement-breakpoint
ALTER TABLE "fxns" ADD COLUMN "moderated_at" timestamp;--> statement-breakpoint
ALTER TABLE "fxns" ADD COLUMN "moderation_notes" text;--> statement-breakpoint
ALTER TABLE "fxns" ADD COLUMN "flagged_reasons" jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "suspended" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "suspended_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "stripe_customer_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "stripe_subscription_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "subscription_status" text DEFAULT 'free';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "subscription_current_period_end" timestamp;--> statement-breakpoint
ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_configurations" ADD CONSTRAINT "api_configurations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_credentials" ADD CONSTRAINT "api_credentials_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_credentials" ADD CONSTRAINT "api_credentials_config_id_api_configurations_id_fk" FOREIGN KEY ("config_id") REFERENCES "public"."api_configurations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_usage_logs" ADD CONSTRAINT "api_usage_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_usage_logs" ADD CONSTRAINT "api_usage_logs_config_id_api_configurations_id_fk" FOREIGN KEY ("config_id") REFERENCES "public"."api_configurations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_usage_logs" ADD CONSTRAINT "api_usage_logs_tool_id_fxns_id_fk" FOREIGN KEY ("tool_id") REFERENCES "public"."fxns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_rules" ADD CONSTRAINT "automation_rules_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_history" ADD CONSTRAINT "billing_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_earnings" ADD CONSTRAINT "creator_earnings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_preferences" ADD CONSTRAINT "email_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encouragements" ADD CONSTRAINT "encouragements_from_user_id_users_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encouragements" ADD CONSTRAINT "encouragements_to_user_id_users_id_fk" FOREIGN KEY ("to_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encouragements" ADD CONSTRAINT "encouragements_post_id_progress_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."progress_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "featured_tools" ADD CONSTRAINT "featured_tools_fxn_id_fxns_id_fk" FOREIGN KEY ("fxn_id") REFERENCES "public"."fxns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "featured_workflows" ADD CONSTRAINT "featured_workflows_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fxn_tags" ADD CONSTRAINT "fxn_tags_fxn_id_fxns_id_fk" FOREIGN KEY ("fxn_id") REFERENCES "public"."fxns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fxn_tags" ADD CONSTRAINT "fxn_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fxn_views" ADD CONSTRAINT "fxn_views_fxn_id_fxns_id_fk" FOREIGN KEY ("fxn_id") REFERENCES "public"."fxns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fxn_views" ADD CONSTRAINT "fxn_views_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_connections" ADD CONSTRAINT "integration_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progress_posts" ADD CONSTRAINT "progress_posts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_fxn_id_fxns_id_fk" FOREIGN KEY ("fxn_id") REFERENCES "public"."fxns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_helpful" ADD CONSTRAINT "review_helpful_review_id_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_helpful" ADD CONSTRAINT "review_helpful_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_fxn_id_fxns_id_fk" FOREIGN KEY ("fxn_id") REFERENCES "public"."fxns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_rating_id_ratings_id_fk" FOREIGN KEY ("rating_id") REFERENCES "public"."ratings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_moderated_by_users_id_fk" FOREIGN KEY ("moderated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tool_drafts" ADD CONSTRAINT "tool_drafts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tool_drafts" ADD CONSTRAINT "tool_drafts_template_id_tool_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."tool_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tool_pricing" ADD CONSTRAINT "tool_pricing_fxn_id_fxns_id_fk" FOREIGN KEY ("fxn_id") REFERENCES "public"."fxns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tool_purchases" ADD CONSTRAINT "tool_purchases_fxn_id_fxns_id_fk" FOREIGN KEY ("fxn_id") REFERENCES "public"."fxns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tool_purchases" ADD CONSTRAINT "tool_purchases_buyer_id_users_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tool_purchases" ADD CONSTRAINT "tool_purchases_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tool_templates" ADD CONSTRAINT "tool_templates_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tool_usage_stats" ADD CONSTRAINT "tool_usage_stats_tool_id_fxns_id_fk" FOREIGN KEY ("tool_id") REFERENCES "public"."fxns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tool_usage_stats" ADD CONSTRAINT "tool_usage_stats_draft_id_tool_drafts_id_fk" FOREIGN KEY ("draft_id") REFERENCES "public"."tool_drafts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tool_usage_stats" ADD CONSTRAINT "tool_usage_stats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_webhook_id_webhook_endpoints_id_fk" FOREIGN KEY ("webhook_id") REFERENCES "public"."webhook_endpoints"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_endpoints" ADD CONSTRAINT "webhook_endpoints_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_endpoints" ADD CONSTRAINT "webhook_endpoints_target_tool_id_fxns_id_fk" FOREIGN KEY ("target_tool_id") REFERENCES "public"."fxns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_connections" ADD CONSTRAINT "workflow_connections_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_connections" ADD CONSTRAINT "workflow_connections_source_step_id_workflow_steps_id_fk" FOREIGN KEY ("source_step_id") REFERENCES "public"."workflow_steps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_connections" ADD CONSTRAINT "workflow_connections_target_step_id_workflow_steps_id_fk" FOREIGN KEY ("target_step_id") REFERENCES "public"."workflow_steps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_creator_earnings" ADD CONSTRAINT "workflow_creator_earnings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_execution_steps" ADD CONSTRAINT "workflow_execution_steps_execution_id_workflow_executions_id_fk" FOREIGN KEY ("execution_id") REFERENCES "public"."workflow_executions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_execution_steps" ADD CONSTRAINT "workflow_execution_steps_step_id_workflow_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."workflow_steps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_executions" ADD CONSTRAINT "workflow_executions_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_executions" ADD CONSTRAINT "workflow_executions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_pricing" ADD CONSTRAINT "workflow_pricing_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_purchases" ADD CONSTRAINT "workflow_purchases_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_purchases" ADD CONSTRAINT "workflow_purchases_buyer_id_users_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_purchases" ADD CONSTRAINT "workflow_purchases_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_steps" ADD CONSTRAINT "workflow_steps_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_steps" ADD CONSTRAINT "workflow_steps_integration_id_integration_connections_id_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."integration_connections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflows" ADD CONSTRAINT "workflows_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "featured_tools_position_idx" ON "featured_tools" USING btree ("position");--> statement-breakpoint
CREATE INDEX "featured_workflows_position_idx" ON "featured_workflows" USING btree ("position");--> statement-breakpoint
CREATE UNIQUE INDEX "fxn_tags_unique" ON "fxn_tags" USING btree ("fxn_id","tag_id");--> statement-breakpoint
CREATE INDEX "fxn_tags_tag_id_idx" ON "fxn_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "fxn_tags_fxn_id_idx" ON "fxn_tags" USING btree ("fxn_id");--> statement-breakpoint
CREATE INDEX "fxn_views_fxn_id_viewed_at_idx" ON "fxn_views" USING btree ("fxn_id","viewed_at");--> statement-breakpoint
CREATE INDEX "fxn_views_user_id_idx" ON "fxn_views" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "integration_connections_user_provider_idx" ON "integration_connections" USING btree ("user_id","provider");--> statement-breakpoint
CREATE INDEX "integration_connections_provider_account_idx" ON "integration_connections" USING btree ("provider","provider_account_id");--> statement-breakpoint
CREATE INDEX "payouts_user_idx" ON "payouts" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "payouts_status_idx" ON "payouts" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "ratings_user_fxn_unique" ON "ratings" USING btree ("user_id","fxn_id");--> statement-breakpoint
CREATE INDEX "ratings_fxn_id_idx" ON "ratings" USING btree ("fxn_id");--> statement-breakpoint
CREATE INDEX "ratings_user_id_idx" ON "ratings" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "review_helpful_unique" ON "review_helpful" USING btree ("user_id","review_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reviews_user_fxn_unique" ON "reviews" USING btree ("user_id","fxn_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reviews_rating_id_unique" ON "reviews" USING btree ("rating_id");--> statement-breakpoint
CREATE INDEX "reviews_fxn_id_idx" ON "reviews" USING btree ("fxn_id");--> statement-breakpoint
CREATE INDEX "reviews_moderation_status_idx" ON "reviews" USING btree ("moderation_status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "stripe_events_stripe_event_id_unique" ON "stripe_events" USING btree ("stripe_event_id");--> statement-breakpoint
CREATE INDEX "tool_purchases_buyer_fxn_idx" ON "tool_purchases" USING btree ("buyer_id","fxn_id");--> statement-breakpoint
CREATE INDEX "tool_purchases_buyer_history_idx" ON "tool_purchases" USING btree ("buyer_id","created_at");--> statement-breakpoint
CREATE INDEX "tool_purchases_seller_idx" ON "tool_purchases" USING btree ("seller_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "tool_purchases_stripe_payment_intent_id_unique" ON "tool_purchases" USING btree ("stripe_payment_intent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tool_usage_stats_user_tool_unique" ON "tool_usage_stats" USING btree ("user_id","tool_id");--> statement-breakpoint
CREATE INDEX "workflow_connections_workflow_id_idx" ON "workflow_connections" USING btree ("workflow_id");--> statement-breakpoint
CREATE INDEX "workflow_connections_source_idx" ON "workflow_connections" USING btree ("source_step_id");--> statement-breakpoint
CREATE INDEX "workflow_connections_target_idx" ON "workflow_connections" USING btree ("target_step_id");--> statement-breakpoint
CREATE INDEX "workflow_execution_steps_execution_id_idx" ON "workflow_execution_steps" USING btree ("execution_id");--> statement-breakpoint
CREATE INDEX "workflow_execution_steps_step_id_idx" ON "workflow_execution_steps" USING btree ("step_id");--> statement-breakpoint
CREATE INDEX "workflow_executions_workflow_id_idx" ON "workflow_executions" USING btree ("workflow_id","created_at");--> statement-breakpoint
CREATE INDEX "workflow_executions_user_id_idx" ON "workflow_executions" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "workflow_executions_status_idx" ON "workflow_executions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "workflow_purchases_buyer_workflow_idx" ON "workflow_purchases" USING btree ("buyer_id","workflow_id");--> statement-breakpoint
CREATE INDEX "workflow_purchases_buyer_history_idx" ON "workflow_purchases" USING btree ("buyer_id","created_at");--> statement-breakpoint
CREATE INDEX "workflow_purchases_seller_idx" ON "workflow_purchases" USING btree ("seller_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "workflow_purchases_stripe_payment_intent_id_unique" ON "workflow_purchases" USING btree ("stripe_payment_intent_id");--> statement-breakpoint
CREATE INDEX "workflow_steps_workflow_id_idx" ON "workflow_steps" USING btree ("workflow_id");--> statement-breakpoint
CREATE INDEX "workflows_user_id_idx" ON "workflows" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "workflows_public_idx" ON "workflows" USING btree ("is_public","category","created_at");--> statement-breakpoint
CREATE INDEX "workflows_shareable_id_idx" ON "workflows" USING btree ("shareable_id");--> statement-breakpoint
ALTER TABLE "fxns" ADD CONSTRAINT "fxns_moderated_by_users_id_fk" FOREIGN KEY ("moderated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "fxn_reports_fxn_id_idx" ON "fxn_reports" USING btree ("fxn_id");--> statement-breakpoint
CREATE INDEX "fxn_reports_status_idx" ON "fxn_reports" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "fxns_created_by_idx" ON "fxns" USING btree ("created_by","created_at");--> statement-breakpoint
CREATE INDEX "fxns_moderation_status_idx" ON "fxns" USING btree ("moderation_status","created_at");--> statement-breakpoint
CREATE INDEX "fxns_access_tier_idx" ON "fxns" USING btree ("access_tier");--> statement-breakpoint
CREATE INDEX "fxns_discovery_idx" ON "fxns" USING btree ("is_public","category","created_at");--> statement-breakpoint
CREATE INDEX "fxns_public_time_idx" ON "fxns" USING btree ("is_public","created_at");--> statement-breakpoint
CREATE INDEX "runs_fxn_id_idx" ON "runs" USING btree ("fxn_id","created_at");--> statement-breakpoint
CREATE INDEX "runs_user_id_idx" ON "runs" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "subscriptions_user_id_idx" ON "subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "subscriptions_status_idx" ON "subscriptions" USING btree ("status");