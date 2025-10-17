import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, boolean, integer, timestamp, jsonb, uuid, primaryKey, uniqueIndex, index } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name"),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    avatarUrl: text("avatar_url"),
    role: text("role").notNull().default("user"),
    twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
    emailVerified: timestamp("email_verified"),
    lastLoginAt: timestamp("last_login_at"),
    suspended: boolean("suspended").notNull().default(false),
    suspendedAt: timestamp("suspended_at"),
    // Stripe integration fields
    stripeCustomerId: text("stripe_customer_id"),
    stripeSubscriptionId: text("stripe_subscription_id"),
    subscriptionStatus: text("subscription_status").default("free"), // free, active, canceled, past_due, incomplete
    subscriptionCurrentPeriodEnd: timestamp("subscription_current_period_end"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Fxns (micro-tools) table
export const fxns = pgTable("fxns", {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    category: text("category").notNull(),
    inputSchema: jsonb("input_schema").notNull(), // Zod schema as JSON
    outputSchema: jsonb("output_schema").notNull(), // Zod schema as JSON
    codeKind: text("code_kind").notNull(), // 'builtin' | 'config'
    codeRef: text("code_ref").notNull(), // reference to resolver function
    builderConfig: jsonb("builder_config"), // For config-based tools: stores inputConfig, logicConfig, outputConfig
    isPublic: boolean("is_public").notNull().default(true),
    createdBy: uuid("created_by").references(() => users.id),
    // Access control fields
    accessTier: text("access_tier").notNull().default("free"), // 'free' | 'pro' - mutually exclusive with paid pricing
    // Content moderation fields
    moderationStatus: text("moderation_status").notNull().default("pending"), // pending, approved, rejected, flagged
    moderatedBy: uuid("moderated_by").references(() => users.id),
    moderatedAt: timestamp("moderated_at"),
    moderationNotes: text("moderation_notes"),
    flaggedReasons: jsonb("flagged_reasons"), // Array of flagging reasons
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
    createdByIdx: index("fxns_created_by_idx").on(table.createdBy, table.createdAt),
    moderationStatusIdx: index("fxns_moderation_status_idx").on(table.moderationStatus, table.createdAt),
    accessTierIdx: index("fxns_access_tier_idx").on(table.accessTier),
    discoveryIdx: index("fxns_discovery_idx").on(table.isPublic, table.category, table.createdAt),
    publicTimeIdx: index("fxns_public_time_idx").on(table.isPublic, table.createdAt),
}));

// Runs table to track fxn executions
export const runs = pgTable("runs", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }), // nullable for anonymous runs
    fxnId: uuid("fxn_id").notNull().references(() => fxns.id, { onDelete: "cascade" }),
    inputs: jsonb("inputs").notNull(),
    outputs: jsonb("outputs").notNull(),
    durationMs: integer("duration_ms").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
    fxnIdIdx: index("runs_fxn_id_idx").on(table.fxnId, table.createdAt),
    userIdIdx: index("runs_user_id_idx").on(table.userId, table.createdAt),
}));

// Sessions table (for logout-all, device management)
export const sessions = pgTable("sessions", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    sessionToken: text("session_token").notNull().unique(),
    userAgent: text("user_agent"),
    ip: text("ip"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    expiresAt: timestamp("expires_at").notNull(),
    revokedAt: timestamp("revoked_at"),
});

// One-time tokens for password reset
export const passwordResetTokens = pgTable("password_reset_tokens", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    expiresAt: timestamp("expires_at").notNull(),
    usedAt: timestamp("used_at"),
});

// One-time tokens for email verification
export const emailVerificationTokens = pgTable("email_verification_tokens", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    expiresAt: timestamp("expires_at").notNull(),
    usedAt: timestamp("used_at"),
});

// Favorites table
export const favorites = pgTable("favorites", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    fxnId: uuid("fxn_id").notNull().references(() => fxns.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
    userFxnUnique: uniqueIndex("favorites_user_fxn_unique").on(table.userId, table.fxnId),
}));

// Plans table
export const plans = pgTable("plans", {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull().unique(), // 'free' | 'pro'
    name: text("name").notNull(),
    features: jsonb("features").notNull(),
    price: integer("price"), // in cents
    createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Subscriptions table
export const subscriptions = pgTable("subscriptions", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    planId: uuid("plan_id").notNull().references(() => plans.id),
    provider: text("provider").notNull().default("stripe"), // placeholder for future stripe integration
    status: text("status").notNull(), // 'active' | 'canceled' | 'past_due'
    currentPeriodEnd: timestamp("current_period_end"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
    userIdIdx: index("subscriptions_user_id_idx").on(table.userId),
    statusIdx: index("subscriptions_status_idx").on(table.status),
}));

// Email preferences table
export const emailPreferences = pgTable("email_preferences", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
    weeklyDigest: boolean("weekly_digest").notNull().default(true),
    newReviews: boolean("new_reviews").notNull().default(true),
    toolActivity: boolean("tool_activity").notNull().default(true),
    moderationAlerts: boolean("moderation_alerts").notNull().default(true),
    subscriptionUpdates: boolean("subscription_updates").notNull().default(true),
    marketingEmails: boolean("marketing_emails").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Tool pricing configuration
export const toolPricing = pgTable("tool_pricing", {
    id: uuid("id").primaryKey().defaultRandom(),
    fxnId: uuid("fxn_id").notNull().references(() => fxns.id, { onDelete: "cascade" }).unique(),
    pricingModel: text("pricing_model").notNull().default("free"), // 'free' | 'one_time' | 'subscription'
    price: integer("price"), // in cents
    licenseType: text("license_type").default("personal"), // 'personal' | 'team' | 'enterprise'
    stripePriceId: text("stripe_price_id"),
    stripeProductId: text("stripe_product_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Tool purchases table
export const toolPurchases = pgTable("tool_purchases", {
    id: uuid("id").primaryKey().defaultRandom(),
    fxnId: uuid("fxn_id").notNull().references(() => fxns.id, { onDelete: "cascade" }),
    buyerId: uuid("buyer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    sellerId: uuid("seller_id").notNull().references(() => users.id, { onDelete: "set null" }),
    amount: integer("amount").notNull(), // in cents
    platformFee: integer("platform_fee").notNull(), // in cents (30%)
    creatorEarnings: integer("creator_earnings").notNull(), // in cents (70%)
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    licenseType: text("license_type").notNull(),
    expiresAt: timestamp("expires_at"), // for subscription-based tools
    createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
    buyerFxnIdx: index("tool_purchases_buyer_fxn_idx").on(table.buyerId, table.fxnId),
    buyerHistoryIdx: index("tool_purchases_buyer_history_idx").on(table.buyerId, table.createdAt),
    sellerIdx: index("tool_purchases_seller_idx").on(table.sellerId, table.createdAt),
    stripePaymentIntentIdUnique: uniqueIndex("tool_purchases_stripe_payment_intent_id_unique").on(table.stripePaymentIntentId),
}));

// Creator earnings summary
export const creatorEarnings = pgTable("creator_earnings", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
    totalEarnings: integer("total_earnings").notNull().default(0), // in cents
    pendingEarnings: integer("pending_earnings").notNull().default(0), // in cents
    lifetimeSales: integer("lifetime_sales").notNull().default(0),
    stripeAccountId: text("stripe_account_id"),
    lastPayoutAt: timestamp("last_payout_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Featured tools for premium placement
export const featuredTools = pgTable("featured_tools", {
    id: uuid("id").primaryKey().defaultRandom(),
    fxnId: uuid("fxn_id").notNull().references(() => fxns.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
    positionIdx: index("featured_tools_position_idx").on(table.position),
}));

// Payout history table
export const payouts = pgTable("payouts", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    amount: integer("amount").notNull(), // in cents
    status: text("status").notNull(), // pending, completed, failed
    stripeTransferId: text("stripe_transfer_id"),
    stripeAccountId: text("stripe_account_id").notNull(),
    failureReason: text("failure_reason"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    completedAt: timestamp("completed_at"),
}, (table) => ({
    userIdx: index("payouts_user_idx").on(table.userId, table.createdAt),
    statusIdx: index("payouts_status_idx").on(table.status),
}));

export const sessionStore = pgTable("session", {
    sid: text("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
    createdFxns: many(fxns),
    runs: many(runs),
    favorites: many(favorites),
    subscription: one(subscriptions),
    sessions: many(sessions),
    resetTokens: many(passwordResetTokens),
    verificationTokens: many(emailVerificationTokens),
    tasks: many(tasks),
    notes: many(notes),
    automationRules: many(automationRules),
    progressPosts: many(progressPosts),
    sentEncouragements: many(encouragements, { relationName: "sentEncouragements" }),
    receivedEncouragements: many(encouragements, { relationName: "receivedEncouragements" }),
    goals: many(goals),
    aiUsage: many(aiUsage),
    toolDrafts: many(toolDrafts),
    createdTemplates: many(toolTemplates),
    ratings: many(ratings),
    reviews: many(reviews),
    reviewHelpful: many(reviewHelpful),
    fxnViews: many(fxnViews),
    fxnReports: many(fxnReports),
    payouts: many(payouts),
    workflows: many(workflows),
    workflowExecutions: many(workflowExecutions),
    integrationConnections: many(integrationConnections),
}));

// --- Reports ---------------------------------------------------------------

export const REPORT_REASONS = [
  "spam",
  "malware",
  "copyright",
  "offensive",
  "misleading",
  "other",
] as const;

export const REPORT_STATUSES = ["open", "reviewing", "resolved", "dismissed"] as const;

export const fxnReports = pgTable("fxn_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  fxnId: uuid("fxn_id")
    .notNull()
    .references(() => fxns.id, { onDelete: "cascade" }),
  reporterId: uuid("reporter_id").references(() => users.id, {
    onDelete: "set null",
  }),
  reason: text("reason").notNull(), // one of REPORT_REASONS
  details: text("details"),
  status: text("status").notNull().default("open"), // one of REPORT_STATUSES
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  fxnIdIdx: index("fxn_reports_fxn_id_idx").on(table.fxnId),
  statusIdx: index("fxn_reports_status_idx").on(table.status, table.createdAt),
}));

export const insertFxnReportSchema = createInsertSchema(fxnReports, {
  reason: z.enum(REPORT_REASONS),
  status: z.enum(REPORT_STATUSES).default("open"),
  details: z.string().max(2000).optional(),
});

// --- Discovery & Engagement Tables ----------------------------------------

// Tags table for flexible tool categorization
export const tags = pgTable("tags", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  color: text("color"), // Hex color for UI display
  usageCount: integer("usage_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Tool-Tag linking table (many-to-many)
export const fxnTags = pgTable("fxn_tags", {
  id: uuid("id").primaryKey().defaultRandom(),
  fxnId: uuid("fxn_id").notNull().references(() => fxns.id, { onDelete: "cascade" }),
  tagId: uuid("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  fxnTagUnique: uniqueIndex("fxn_tags_unique").on(table.fxnId, table.tagId),
  tagIdIdx: index("fxn_tags_tag_id_idx").on(table.tagId),
  fxnIdIdx: index("fxn_tags_fxn_id_idx").on(table.fxnId),
}));

// Ratings table for tool ratings
export const ratings = pgTable("ratings", {
  id: uuid("id").primaryKey().defaultRandom(),
  fxnId: uuid("fxn_id").notNull().references(() => fxns.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(), // 1-5 stars
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  userFxnUnique: uniqueIndex("ratings_user_fxn_unique").on(table.userId, table.fxnId),
  fxnIdIdx: index("ratings_fxn_id_idx").on(table.fxnId),
  userIdIdx: index("ratings_user_id_idx").on(table.userId),
}));

// Reviews table for tool reviews
export const reviews = pgTable("reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  fxnId: uuid("fxn_id").notNull().references(() => fxns.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  ratingId: uuid("rating_id").notNull().references(() => ratings.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  helpfulCount: integer("helpful_count").notNull().default(0),
  moderationStatus: text("moderation_status").notNull().default("pending"), // pending, approved, rejected, flagged
  moderatedBy: uuid("moderated_by").references(() => users.id),
  moderatedAt: timestamp("moderated_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  userFxnUnique: uniqueIndex("reviews_user_fxn_unique").on(table.userId, table.fxnId),
  ratingIdUnique: uniqueIndex("reviews_rating_id_unique").on(table.ratingId),
  fxnIdIdx: index("reviews_fxn_id_idx").on(table.fxnId),
  moderationStatusIdx: index("reviews_moderation_status_idx").on(table.moderationStatus, table.createdAt),
}));

// Review helpful votes table
export const reviewHelpful = pgTable("review_helpful", {
  id: uuid("id").primaryKey().defaultRandom(),
  reviewId: uuid("review_id").notNull().references(() => reviews.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  userReviewUnique: uniqueIndex("review_helpful_unique").on(table.userId, table.reviewId),
}));

// Tool views tracking table
export const fxnViews = pgTable("fxn_views", {
  id: uuid("id").primaryKey().defaultRandom(),
  fxnId: uuid("fxn_id").notNull().references(() => fxns.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }), // nullable for anonymous views
  viewedAt: timestamp("viewed_at").notNull().defaultNow(),
}, (table) => ({
  fxnIdViewedAtIdx: index("fxn_views_fxn_id_viewed_at_idx").on(table.fxnId, table.viewedAt),
  userIdIdx: index("fxn_views_user_id_idx").on(table.userId),
}));

export const insertRatingSchema = createInsertSchema(ratings, {
  rating: z.number().int().min(1).max(5),
});

export const insertReviewSchema = createInsertSchema(reviews, {
  title: z.string().min(3).max(100),
  content: z.string().min(10).max(2000),
});

// --- Smart Productivity Suite Tables ---------------------------------------

// Tasks table for task management and AI scheduling
export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("todo"), // 'todo' | 'in_progress' | 'completed' | 'cancelled'
  priority: text("priority").notNull().default("medium"), // 'low' | 'medium' | 'high' | 'urgent'
  category: text("category"),
  dueDate: timestamp("due_date"),
  estimatedMinutes: integer("estimated_minutes"),
  actualMinutes: integer("actual_minutes"),
  aiPriorityScore: integer("ai_priority_score"), // 0-100 AI calculated priority
  habitProtected: boolean("habit_protected").notNull().default(false), // AI won't schedule over habits
  tags: jsonb("tags").default([]), // array of strings
  metadata: jsonb("metadata").default({}), // flexible AI analysis data
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Notes table for workspace integration
export const notes = pgTable("notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  type: text("type").notNull().default("note"), // 'note' | 'meeting_transcript' | 'insight'
  tags: jsonb("tags").default([]),
  aiSummary: text("ai_summary"), // AI generated summary
  aiInsights: jsonb("ai_insights").default([]), // AI extracted insights
  attachments: jsonb("attachments").default([]), // file references
  linkedTaskIds: jsonb("linked_task_ids").default([]), // related tasks
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Automation rules table
export const automationRules = pgTable("automation_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  triggerType: text("trigger_type").notNull(), // 'schedule' | 'task_completion' | 'note_created' | 'external_event'
  triggerConfig: jsonb("trigger_config").notNull(), // specific trigger parameters
  actionType: text("action_type").notNull(), // 'create_task' | 'send_notification' | 'update_status' | 'ai_analysis'
  actionConfig: jsonb("action_config").notNull(), // specific action parameters
  lastTriggered: timestamp("last_triggered"),
  runCount: integer("run_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Social features - progress posts
export const progressPosts = pgTable("progress_posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  type: text("type").notNull().default("update"), // 'update' | 'achievement' | 'milestone' | 'help_request'
  visibility: text("visibility").notNull().default("public"), // 'public' | 'friends' | 'private'
  linkedTaskIds: jsonb("linked_task_ids").default([]),
  linkedGoalIds: jsonb("linked_goal_ids").default([]),
  metrics: jsonb("metrics").default({}), // completion stats, streak data, etc.
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Social features - encouragement system
export const encouragements = pgTable("encouragements", {
  id: uuid("id").primaryKey().defaultRandom(),
  fromUserId: uuid("from_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  toUserId: uuid("to_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  postId: uuid("post_id").references(() => progressPosts.id, { onDelete: "cascade" }),
  type: text("type").notNull().default("like"), // 'like' | 'cheer' | 'comment' | 'badge'
  message: text("message"),
  badgeType: text("badge_type"), // for badge encouragements
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Goal tracking for community features
export const goals = pgTable("goals", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category"),
  targetValue: integer("target_value"), // numeric goal target
  currentValue: integer("current_value").notNull().default(0),
  unit: text("unit"), // 'hours', 'tasks', 'days', etc.
  deadline: timestamp("deadline"),
  status: text("status").notNull().default("active"), // 'active' | 'completed' | 'paused' | 'cancelled'
  isPublic: boolean("is_public").notNull().default(false),
  streakCount: integer("streak_count").notNull().default(0),
  bestStreak: integer("best_streak").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// AI usage tracking for Pro features
export const aiUsage = pgTable("ai_usage", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  feature: text("feature").notNull(), // 'task_prioritization' | 'transcript_analysis' | 'note_insights' | 'smart_scheduling'
  tokensUsed: integer("tokens_used").notNull(),
  cost: integer("cost"), // in cents
  requestData: jsonb("request_data"),
  responseData: jsonb("response_data"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// --- Tool Builder System ---

// Tool Template Marketplace (referenced first for foreign keys)
export const toolTemplates = pgTable("tool_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  creatorId: uuid("creator_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  tags: jsonb("tags").notNull().default([]),
  inputConfig: jsonb("input_config").notNull(),
  logicConfig: jsonb("logic_config").notNull(),
  outputConfig: jsonb("output_config").notNull(),
  previewImage: text("preview_image"), // Screenshot or demo
  usageCount: integer("usage_count").notNull().default(0),
  rating: integer("rating").notNull().default(0), // 1-5 stars
  ratingCount: integer("rating_count").notNull().default(0),
  isPremium: boolean("is_premium").notNull().default(false),
  price: integer("price").default(0), // in cents
  isPublic: boolean("is_public").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Tool Builder - Draft workspace for creating tools
export const toolDrafts = pgTable("tool_drafts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull().default("custom"),
  status: text("status").notNull().default("draft"), // 'draft' | 'testing' | 'published' | 'deleted'
  deletedAt: timestamp("deleted_at"), // Soft delete timestamp
  inputConfig: jsonb("input_config").notNull().default([]), // Visual form configuration
  logicConfig: jsonb("logic_config").notNull().default([]), // Visual logic flow  
  outputConfig: jsonb("output_config").notNull().default({}), // Output formatting
  generatedSchema: jsonb("generated_schema"), // Compiled JSON schema
  testResults: jsonb("test_results").default({}), // Testing history
  version: integer("version").notNull().default(1),
  templateId: uuid("template_id").references(() => toolTemplates.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Tool Usage Analytics
export const toolUsageStats = pgTable("tool_usage_stats", {
  id: uuid("id").primaryKey().defaultRandom(),
  toolId: uuid("tool_id").references(() => fxns.id, { onDelete: "cascade" }),
  draftId: uuid("draft_id").references(() => toolDrafts.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  runCount: integer("run_count").notNull().default(1),
  successfulRuns: integer("successful_runs").notNull().default(0),
  averageRunTime: integer("average_run_time").default(0), // milliseconds
  lastUsed: timestamp("last_used").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  // Unique index to prevent duplicate rows for same user-tool combination
  userToolUnique: uniqueIndex("tool_usage_stats_user_tool_unique").on(table.userId, table.toolId),
}));

// Stripe webhook events table for idempotency
export const stripeEvents = pgTable("stripe_events", {
    id: uuid("id").primaryKey().defaultRandom(),
    stripeEventId: text("stripe_event_id").notNull(),
    eventType: text("event_type").notNull(),
    processed: boolean("processed").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
    stripeEventIdUnique: uniqueIndex("stripe_events_stripe_event_id_unique").on(table.stripeEventId),
}));

// Billing history table for invoices and payment tracking
export const billingHistory = pgTable("billing_history", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    stripeInvoiceId: text("stripe_invoice_id"),
    stripeChargeId: text("stripe_charge_id"),
    type: text("type").notNull(), // 'invoice' | 'charge' | 'refund'
    status: text("status").notNull(), // 'paid' | 'pending' | 'failed' | 'refunded'
    amount: integer("amount").notNull(), // in cents
    currency: text("currency").notNull().default("usd"),
    description: text("description"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const sessionsRelations = relations(sessions, ({ one }) => ({
    user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const passwordResetTokensRelations = relations(passwordResetTokens, ({ one }) => ({
    user: one(users, { fields: [passwordResetTokens.userId], references: [users.id] }),
}));

export const emailVerificationTokensRelations = relations(emailVerificationTokens, ({ one }) => ({
    user: one(users, { fields: [emailVerificationTokens.userId], references: [users.id] }),
}));

export const fxnsRelations = relations(fxns, ({ one, many }) => ({
    creator: one(users, {
        fields: [fxns.createdBy],
        references: [users.id],
    }),
    runs: many(runs),
    favorites: many(favorites),
    fxnTags: many(fxnTags),
    ratings: many(ratings),
    reviews: many(reviews),
    views: many(fxnViews),
    reports: many(fxnReports),
}));

export const runsRelations = relations(runs, ({ one }) => ({
    user: one(users, {
        fields: [runs.userId],
        references: [users.id],
    }),
    fxn: one(fxns, {
        fields: [runs.fxnId],
        references: [fxns.id],
    }),
}));

export const favoritesRelations = relations(favorites, ({ one }) => ({
    user: one(users, {
        fields: [favorites.userId],
        references: [users.id],
    }),
    fxn: one(fxns, {
        fields: [favorites.fxnId],
        references: [fxns.id],
    }),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
    user: one(users, {
        fields: [subscriptions.userId],
        references: [users.id],
    }),
    plan: one(plans, {
        fields: [subscriptions.planId],
        references: [plans.id],
    }),
}));

export const plansRelations = relations(plans, ({ many }) => ({
    subscriptions: many(subscriptions),
}));

// Relations for Discovery & Engagement tables
export const tagsRelations = relations(tags, ({ many }) => ({
    fxnTags: many(fxnTags),
}));

export const fxnTagsRelations = relations(fxnTags, ({ one }) => ({
    fxn: one(fxns, { fields: [fxnTags.fxnId], references: [fxns.id] }),
    tag: one(tags, { fields: [fxnTags.tagId], references: [tags.id] }),
}));

export const ratingsRelations = relations(ratings, ({ one }) => ({
    fxn: one(fxns, { fields: [ratings.fxnId], references: [fxns.id] }),
    user: one(users, { fields: [ratings.userId], references: [users.id] }),
    review: one(reviews, { fields: [ratings.id], references: [reviews.ratingId] }),
}));

export const reviewsRelations = relations(reviews, ({ one, many }) => ({
    fxn: one(fxns, { fields: [reviews.fxnId], references: [fxns.id] }),
    user: one(users, { fields: [reviews.userId], references: [users.id] }),
    rating: one(ratings, { fields: [reviews.ratingId], references: [ratings.id] }),
    helpfulVotes: many(reviewHelpful),
}));

export const reviewHelpfulRelations = relations(reviewHelpful, ({ one }) => ({
    review: one(reviews, { fields: [reviewHelpful.reviewId], references: [reviews.id] }),
    user: one(users, { fields: [reviewHelpful.userId], references: [users.id] }),
}));

export const fxnViewsRelations = relations(fxnViews, ({ one }) => ({
    fxn: one(fxns, { fields: [fxnViews.fxnId], references: [fxns.id] }),
    user: one(users, { fields: [fxnViews.userId], references: [users.id] }),
}));

export const fxnReportsRelations = relations(fxnReports, ({ one }) => ({
    fxn: one(fxns, { fields: [fxnReports.fxnId], references: [fxns.id] }),
    reporter: one(users, { fields: [fxnReports.reporterId], references: [users.id] }),
}));

// Relations for Smart Productivity Suite tables
export const tasksRelations = relations(tasks, ({ one }) => ({
    user: one(users, { fields: [tasks.userId], references: [users.id] }),
}));

export const notesRelations = relations(notes, ({ one }) => ({
    user: one(users, { fields: [notes.userId], references: [users.id] }),
}));

export const automationRulesRelations = relations(automationRules, ({ one }) => ({
    user: one(users, { fields: [automationRules.userId], references: [users.id] }),
}));

export const progressPostsRelations = relations(progressPosts, ({ one, many }) => ({
    user: one(users, { fields: [progressPosts.userId], references: [users.id] }),
    encouragements: many(encouragements),
}));

export const encouragementsRelations = relations(encouragements, ({ one }) => ({
    fromUser: one(users, { fields: [encouragements.fromUserId], references: [users.id] }),
    toUser: one(users, { fields: [encouragements.toUserId], references: [users.id] }),
    post: one(progressPosts, { fields: [encouragements.postId], references: [progressPosts.id] }),
}));

export const goalsRelations = relations(goals, ({ one }) => ({
    user: one(users, { fields: [goals.userId], references: [users.id] }),
}));

export const aiUsageRelations = relations(aiUsage, ({ one }) => ({
    user: one(users, { fields: [aiUsage.userId], references: [users.id] }),
}));

// API Integration Tables
export const apiConfigurations = pgTable("api_configurations", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    baseUrl: text("base_url").notNull(),
    authMethod: text("auth_method").notNull(), // 'none', 'api_key', 'bearer', 'basic', 'oauth'
    authConfig: jsonb("auth_config"), // Stores auth-specific configuration
    defaultHeaders: jsonb("default_headers"),
    rateLimit: integer("rate_limit").default(100), // requests per minute
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const apiCredentials = pgTable("api_credentials", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    configId: uuid("config_id").notNull().references(() => apiConfigurations.id, { onDelete: "cascade" }),
    credentialType: text("credential_type").notNull(), // 'api_key', 'oauth_token', 'username_password'
    encryptedValue: text("encrypted_value").notNull(), // Encrypted credential data
    expiresAt: timestamp("expires_at"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const webhookEndpoints = pgTable("webhook_endpoints", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    endpoint: text("endpoint").notNull().unique(), // Generated endpoint path
    secret: text("secret").notNull(), // For webhook signature verification
    targetToolId: uuid("target_tool_id").references(() => fxns.id, { onDelete: "set null" }),
    processingConfig: jsonb("processing_config"), // How to process incoming data
    isActive: boolean("is_active").notNull().default(true),
    lastTriggered: timestamp("last_triggered"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const apiUsageLogs = pgTable("api_usage_logs", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    configId: uuid("config_id").notNull().references(() => apiConfigurations.id, { onDelete: "cascade" }),
    toolId: uuid("tool_id").references(() => fxns.id, { onDelete: "set null" }),
    method: text("method").notNull(),
    endpoint: text("endpoint").notNull(),
    statusCode: integer("status_code"),
    responseTime: integer("response_time"), // in milliseconds
    errorMessage: text("error_message"),
    requestSize: integer("request_size"), // in bytes
    responseSize: integer("response_size"), // in bytes
    createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const webhookDeliveries = pgTable("webhook_deliveries", {
    id: uuid("id").primaryKey().defaultRandom(),
    webhookId: uuid("webhook_id").notNull().references(() => webhookEndpoints.id, { onDelete: "cascade" }),
    sourceIp: text("source_ip"),
    headers: jsonb("headers"),
    payload: jsonb("payload"),
    processingStatus: text("processing_status").notNull(), // 'success', 'failed', 'processing'
    errorMessage: text("error_message"),
    processingTime: integer("processing_time"), // in milliseconds
    createdAt: timestamp("created_at").notNull().defaultNow(),
});

// --- Visual Workflow System (Zapier/Make competitor) ---

// Main workflows table
export const workflows = pgTable("workflows", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    category: text("category"), // 'lifestyle', 'productivity', 'health', 'finance', etc.
    isActive: boolean("is_active").notNull().default(true),
    isPublic: boolean("is_public").notNull().default(false),
    isTemplate: boolean("is_template").notNull().default(false),
    shareableId: text("shareable_id").unique(), // For public sharing
    triggerType: text("trigger_type").notNull(), // 'manual', 'schedule', 'webhook', 'event'
    triggerConfig: jsonb("trigger_config").notNull(), // Trigger settings (cron, webhook URL, etc)
    canvasData: jsonb("canvas_data"), // React Flow viewport state
    executionCount: integer("execution_count").notNull().default(0),
    lastExecutedAt: timestamp("last_executed_at"),
    viewCount: integer("view_count").notNull().default(0),
    cloneCount: integer("clone_count").notNull().default(0),
    tags: jsonb("tags").default([]),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
    userIdIdx: index("workflows_user_id_idx").on(table.userId, table.createdAt),
    publicIdx: index("workflows_public_idx").on(table.isPublic, table.category, table.createdAt),
    shareableIdIdx: index("workflows_shareable_id_idx").on(table.shareableId),
}));

// Individual steps/nodes in a workflow
export const workflowSteps = pgTable("workflow_steps", {
    id: uuid("id").primaryKey().defaultRandom(),
    workflowId: uuid("workflow_id").notNull().references(() => workflows.id, { onDelete: "cascade" }),
    stepType: text("step_type").notNull(), // 'trigger', 'action', 'condition', 'loop', 'transform', 'api', 'ai', etc.
    stepSubtype: text("step_subtype"), // Specific type like 'gmail_read', 'slack_send', 'if_then', etc.
    label: text("label").notNull(),
    position: jsonb("position").notNull(), // {x, y} for React Flow
    config: jsonb("config").notNull(), // Step-specific configuration
    integrationId: uuid("integration_id").references(() => integrationConnections.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
    workflowIdIdx: index("workflow_steps_workflow_id_idx").on(table.workflowId),
}));

// Connections between workflow steps (edges in React Flow)
export const workflowConnections = pgTable("workflow_connections", {
    id: uuid("id").primaryKey().defaultRandom(),
    workflowId: uuid("workflow_id").notNull().references(() => workflows.id, { onDelete: "cascade" }),
    sourceStepId: uuid("source_step_id").notNull().references(() => workflowSteps.id, { onDelete: "cascade" }),
    targetStepId: uuid("target_step_id").notNull().references(() => workflowSteps.id, { onDelete: "cascade" }),
    sourceHandle: text("source_handle"), // For multiple outputs (e.g., 'then', 'else')
    targetHandle: text("target_handle"), // For multiple inputs
    label: text("label"), // Optional edge label
    createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
    workflowIdIdx: index("workflow_connections_workflow_id_idx").on(table.workflowId),
    sourceIdx: index("workflow_connections_source_idx").on(table.sourceStepId),
    targetIdx: index("workflow_connections_target_idx").on(table.targetStepId),
}));

// Workflow execution history
export const workflowExecutions = pgTable("workflow_executions", {
    id: uuid("id").primaryKey().defaultRandom(),
    workflowId: uuid("workflow_id").notNull().references(() => workflows.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    status: text("status").notNull(), // 'running', 'completed', 'failed', 'cancelled'
    triggerData: jsonb("trigger_data"), // Initial trigger payload
    startedAt: timestamp("started_at").notNull().defaultNow(),
    completedAt: timestamp("completed_at"),
    durationMs: integer("duration_ms"),
    errorMessage: text("error_message"),
    errorStep: uuid("error_step"), // Step ID where error occurred
    createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
    workflowIdIdx: index("workflow_executions_workflow_id_idx").on(table.workflowId, table.createdAt),
    userIdIdx: index("workflow_executions_user_id_idx").on(table.userId, table.createdAt),
    statusIdx: index("workflow_executions_status_idx").on(table.status),
}));

// Detailed logs for each step in an execution
export const workflowExecutionSteps = pgTable("workflow_execution_steps", {
    id: uuid("id").primaryKey().defaultRandom(),
    executionId: uuid("execution_id").notNull().references(() => workflowExecutions.id, { onDelete: "cascade" }),
    stepId: uuid("step_id").notNull().references(() => workflowSteps.id, { onDelete: "cascade" }),
    status: text("status").notNull(), // 'pending', 'running', 'completed', 'failed', 'skipped'
    inputData: jsonb("input_data"),
    outputData: jsonb("output_data"),
    errorMessage: text("error_message"),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    durationMs: integer("duration_ms"),
    retryCount: integer("retry_count").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
    executionIdIdx: index("workflow_execution_steps_execution_id_idx").on(table.executionId),
    stepIdIdx: index("workflow_execution_steps_step_id_idx").on(table.stepId),
}));

// Integration connections (OAuth, API keys for external services)
export const integrationConnections = pgTable("integration_connections", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(), // 'gmail', 'google_calendar', 'spotify', 'twilio', 'weather', etc.
    providerAccountId: text("provider_account_id"), // User's ID in the external service
    accountLabel: text("account_label"), // User-friendly name like "Work Gmail"
    authType: text("auth_type").notNull(), // 'oauth2', 'api_key', 'basic'
    accessToken: text("access_token"), // Encrypted
    refreshToken: text("refresh_token"), // Encrypted
    expiresAt: timestamp("expires_at"),
    scopes: jsonb("scopes"), // OAuth scopes
    metadata: jsonb("metadata"), // Provider-specific data
    isActive: boolean("is_active").notNull().default(true),
    lastUsedAt: timestamp("last_used_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
    userProviderIdx: index("integration_connections_user_provider_idx").on(table.userId, table.provider),
    providerAccountIdx: index("integration_connections_provider_account_idx").on(table.provider, table.providerAccountId),
}));

// --- Workflow Marketplace Tables ---

// Workflow pricing configuration
export const workflowPricing = pgTable("workflow_pricing", {
    id: uuid("id").primaryKey().defaultRandom(),
    workflowId: uuid("workflow_id").notNull().references(() => workflows.id, { onDelete: "cascade" }).unique(),
    pricingModel: text("pricing_model").notNull().default("free"), // 'free' | 'one_time' | 'subscription'
    price: integer("price"), // in cents
    licenseType: text("license_type").default("personal"), // 'personal' | 'team' | 'enterprise'
    stripePriceId: text("stripe_price_id"),
    stripeProductId: text("stripe_product_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Workflow purchases table
export const workflowPurchases = pgTable("workflow_purchases", {
    id: uuid("id").primaryKey().defaultRandom(),
    workflowId: uuid("workflow_id").notNull().references(() => workflows.id, { onDelete: "cascade" }),
    buyerId: uuid("buyer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    sellerId: uuid("seller_id").notNull().references(() => users.id, { onDelete: "set null" }),
    amount: integer("amount").notNull(), // in cents
    platformFee: integer("platform_fee").notNull(), // in cents (30%)
    creatorEarnings: integer("creator_earnings").notNull(), // in cents (70%)
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    licenseType: text("license_type").notNull(),
    expiresAt: timestamp("expires_at"), // for subscription-based workflows
    createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
    buyerWorkflowIdx: index("workflow_purchases_buyer_workflow_idx").on(table.buyerId, table.workflowId),
    buyerHistoryIdx: index("workflow_purchases_buyer_history_idx").on(table.buyerId, table.createdAt),
    sellerIdx: index("workflow_purchases_seller_idx").on(table.sellerId, table.createdAt),
    stripePaymentIntentIdUnique: uniqueIndex("workflow_purchases_stripe_payment_intent_id_unique").on(table.stripePaymentIntentId),
}));

// Workflow creator earnings summary
export const workflowCreatorEarnings = pgTable("workflow_creator_earnings", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
    totalEarnings: integer("total_earnings").notNull().default(0), // in cents
    pendingEarnings: integer("pending_earnings").notNull().default(0), // in cents
    lifetimeSales: integer("lifetime_sales").notNull().default(0),
    lastPayoutAt: timestamp("last_payout_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Featured workflows for premium placement
export const featuredWorkflows = pgTable("featured_workflows", {
    id: uuid("id").primaryKey().defaultRandom(),
    workflowId: uuid("workflow_id").notNull().references(() => workflows.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
    positionIdx: index("featured_workflows_position_idx").on(table.position),
}));

// Tool Builder Relations
export const toolTemplatesRelations = relations(toolTemplates, ({ one, many }) => ({
  creator: one(users, { fields: [toolTemplates.creatorId], references: [users.id] }),
  drafts: many(toolDrafts),
}));

export const toolDraftsRelations = relations(toolDrafts, ({ one, many }) => ({
  user: one(users, { fields: [toolDrafts.userId], references: [users.id] }),
  template: one(toolTemplates, { fields: [toolDrafts.templateId], references: [toolTemplates.id] }),
  usageStats: many(toolUsageStats),
}));

export const toolUsageStatsRelations = relations(toolUsageStats, ({ one }) => ({
  tool: one(fxns, { fields: [toolUsageStats.toolId], references: [fxns.id] }),
  draft: one(toolDrafts, { fields: [toolUsageStats.draftId], references: [toolDrafts.id] }),
  user: one(users, { fields: [toolUsageStats.userId], references: [users.id] }),
}));

// API Integration Relations
export const apiConfigurationsRelations = relations(apiConfigurations, ({ one, many }) => ({
  user: one(users, { fields: [apiConfigurations.userId], references: [users.id] }),
  credentials: many(apiCredentials),
  usageLogs: many(apiUsageLogs),
}));

export const apiCredentialsRelations = relations(apiCredentials, ({ one }) => ({
  user: one(users, { fields: [apiCredentials.userId], references: [users.id] }),
  configuration: one(apiConfigurations, { fields: [apiCredentials.configId], references: [apiConfigurations.id] }),
}));

export const webhookEndpointsRelations = relations(webhookEndpoints, ({ one, many }) => ({
  user: one(users, { fields: [webhookEndpoints.userId], references: [users.id] }),
  targetTool: one(fxns, { fields: [webhookEndpoints.targetToolId], references: [fxns.id] }),
  deliveries: many(webhookDeliveries),
}));

export const apiUsageLogsRelations = relations(apiUsageLogs, ({ one }) => ({
  user: one(users, { fields: [apiUsageLogs.userId], references: [users.id] }),
  configuration: one(apiConfigurations, { fields: [apiUsageLogs.configId], references: [apiConfigurations.id] }),
  tool: one(fxns, { fields: [apiUsageLogs.toolId], references: [fxns.id] }),
}));

export const webhookDeliveriesRelations = relations(webhookDeliveries, ({ one }) => ({
  webhook: one(webhookEndpoints, { fields: [webhookDeliveries.webhookId], references: [webhookEndpoints.id] }),
}));

// Workflow System Relations
export const workflowsRelations = relations(workflows, ({ one, many }) => ({
  user: one(users, { fields: [workflows.userId], references: [users.id] }),
  steps: many(workflowSteps),
  connections: many(workflowConnections),
  executions: many(workflowExecutions),
}));

export const workflowStepsRelations = relations(workflowSteps, ({ one, many }) => ({
  workflow: one(workflows, { fields: [workflowSteps.workflowId], references: [workflows.id] }),
  integration: one(integrationConnections, { fields: [workflowSteps.integrationId], references: [integrationConnections.id] }),
  sourceConnections: many(workflowConnections, { relationName: "sourceConnections" }),
  targetConnections: many(workflowConnections, { relationName: "targetConnections" }),
  executionSteps: many(workflowExecutionSteps),
}));

export const workflowConnectionsRelations = relations(workflowConnections, ({ one }) => ({
  workflow: one(workflows, { fields: [workflowConnections.workflowId], references: [workflows.id] }),
  sourceStep: one(workflowSteps, { fields: [workflowConnections.sourceStepId], references: [workflowSteps.id], relationName: "sourceConnections" }),
  targetStep: one(workflowSteps, { fields: [workflowConnections.targetStepId], references: [workflowSteps.id], relationName: "targetConnections" }),
}));

export const workflowExecutionsRelations = relations(workflowExecutions, ({ one, many }) => ({
  workflow: one(workflows, { fields: [workflowExecutions.workflowId], references: [workflows.id] }),
  user: one(users, { fields: [workflowExecutions.userId], references: [users.id] }),
  executionSteps: many(workflowExecutionSteps),
}));

export const workflowExecutionStepsRelations = relations(workflowExecutionSteps, ({ one }) => ({
  execution: one(workflowExecutions, { fields: [workflowExecutionSteps.executionId], references: [workflowExecutions.id] }),
  step: one(workflowSteps, { fields: [workflowExecutionSteps.stepId], references: [workflowSteps.id] }),
}));

export const integrationConnectionsRelations = relations(integrationConnections, ({ one, many }) => ({
  user: one(users, { fields: [integrationConnections.userId], references: [users.id] }),
  workflowSteps: many(workflowSteps),
}));

export const insertUserSchema = createInsertSchema(users).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    lastLoginAt: true,
    emailVerified: true,
});

export const insertFxnSchema = createInsertSchema(fxns).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});

export const insertRunSchema = createInsertSchema(runs).omit({
    id: true,
    createdAt: true,
});

export const insertFavoriteSchema = createInsertSchema(favorites).omit({
    id: true,
    createdAt: true,
});

export const insertPlanSchema = createInsertSchema(plans).omit({
    id: true,
    createdAt: true,
}).extend({
    features: z.any(),
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});

// Insert schemas for Smart Productivity Suite
export const insertTaskSchema = createInsertSchema(tasks).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});

export const insertNoteSchema = createInsertSchema(notes).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});

export const insertAutomationRuleSchema = createInsertSchema(automationRules).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    lastTriggered: true,
    runCount: true,
});

export const insertProgressPostSchema = createInsertSchema(progressPosts).omit({
    id: true,
    createdAt: true,
});

export const insertEncouragementSchema = createInsertSchema(encouragements).omit({
    id: true,
    createdAt: true,
});

export const insertGoalSchema = createInsertSchema(goals).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});

export const insertAiUsageSchema = createInsertSchema(aiUsage).omit({
    id: true,
    createdAt: true,
});

// Tool Builder Insert Schemas
export const insertToolTemplateSchema = createInsertSchema(toolTemplates).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    usageCount: true,
    rating: true,
    ratingCount: true,
});

export const insertToolDraftSchema = createInsertSchema(toolDrafts).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    version: true,
});

export const insertToolUsageStatsSchema = createInsertSchema(toolUsageStats).omit({
    id: true,
    createdAt: true,
});

// API Integration Insert Schemas
export const insertApiConfigurationSchema = createInsertSchema(apiConfigurations).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
}).extend({
    authConfig: z.any().optional(),
    defaultHeaders: z.any().optional(),
});

export const insertApiCredentialSchema = createInsertSchema(apiCredentials).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});

export const insertWebhookEndpointSchema = createInsertSchema(webhookEndpoints).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    lastTriggered: true,
}).extend({
    processingConfig: z.any().optional(),
});

export const insertApiUsageLogSchema = createInsertSchema(apiUsageLogs).omit({
    id: true,
    createdAt: true,
});

export const insertWebhookDeliverySchema = createInsertSchema(webhookDeliveries).omit({
    id: true,
    createdAt: true,
}).extend({
    headers: z.any().optional(),
    payload: z.any().optional(),
});

// Workflow System Insert Schemas
export const insertWorkflowSchema = createInsertSchema(workflows).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    executionCount: true,
    lastExecutedAt: true,
    viewCount: true,
    cloneCount: true,
}).extend({
    triggerConfig: z.any(),
    canvasData: z.any().optional(),
    tags: z.array(z.string()).optional(),
});

export const insertWorkflowStepSchema = createInsertSchema(workflowSteps).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
}).extend({
    position: z.object({ x: z.number(), y: z.number() }),
    config: z.any(),
});

export const insertWorkflowConnectionSchema = createInsertSchema(workflowConnections).omit({
    id: true,
    createdAt: true,
});

export const insertWorkflowExecutionSchema = createInsertSchema(workflowExecutions).omit({
    id: true,
    createdAt: true,
    completedAt: true,
    durationMs: true,
}).extend({
    triggerData: z.any().optional(),
});

export const insertWorkflowExecutionStepSchema = createInsertSchema(workflowExecutionSteps).omit({
    id: true,
    createdAt: true,
    startedAt: true,
    completedAt: true,
    durationMs: true,
    retryCount: true,
}).extend({
    inputData: z.any().optional(),
    outputData: z.any().optional(),
});

export const insertIntegrationConnectionSchema = createInsertSchema(integrationConnections).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    lastUsedAt: true,
}).extend({
    scopes: z.array(z.string()).optional(),
    metadata: z.any().optional(),
});

// Workflow Marketplace Insert Schemas
export const insertWorkflowPricingSchema = createInsertSchema(workflowPricing).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});

export const selectWorkflowPricingSchema = createSelectSchema(workflowPricing);

export const insertWorkflowPurchaseSchema = createInsertSchema(workflowPurchases).omit({
    id: true,
    createdAt: true,
});

export const selectWorkflowPurchaseSchema = createSelectSchema(workflowPurchases);

export const insertWorkflowCreatorEarningsSchema = createInsertSchema(workflowCreatorEarnings).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});

export const selectWorkflowCreatorEarningsSchema = createSelectSchema(workflowCreatorEarnings);

export const insertFeaturedWorkflowSchema = createInsertSchema(featuredWorkflows).omit({
    id: true,
    createdAt: true,
});

export const selectFeaturedWorkflowSchema = createSelectSchema(featuredWorkflows);

export const loginSchema = z.object({
    email: z.string(),
    password: z.string(),
});

export const registerSchema = z.object({
    password: z.string().min(8),
    name: z.string(),
    email: z.string().email(),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

export const passwordResetRequestSchema = z.object({
    email: z.string().email(),
});

export const passwordResetSchema = z.object({
    token: z.string(),
    newPassword: z.string().min(8, "Password must be at least 8 characters")
        .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
        .regex(/[a-z]/, "Password must contain at least one lowercase letter")
        .regex(/[0-9]/, "Password must contain at least one number"),
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Fxn = typeof fxns.$inferSelect;
export type InsertFxn = z.infer<typeof insertFxnSchema>;
export type Run = typeof runs.$inferSelect;
export type InsertRun = z.infer<typeof insertRunSchema>;
export type Favorite = typeof favorites.$inferSelect;
export type InsertFavorite = z.infer<typeof insertFavoriteSchema>;
export type Plan = typeof plans.$inferSelect;
export type InsertPlan = z.infer<typeof insertPlanSchema>;
export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type LoginData = z.infer<typeof loginSchema>;
export type RegisterData = z.infer<typeof registerSchema>;
export type PasswordResetRequestData = z.infer<typeof passwordResetRequestSchema>;
export type PasswordResetData = z.infer<typeof passwordResetSchema>;
export type Session = typeof sessions.$inferSelect;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type EmailVerificationToken = typeof emailVerificationTokens.$inferSelect;
export type FxnReport = typeof fxnReports.$inferSelect;
export type InsertFxnReport = z.infer<typeof insertFxnReportSchema>;

// Types for Smart Productivity Suite
export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Note = typeof notes.$inferSelect;
export type InsertNote = z.infer<typeof insertNoteSchema>;
export type AutomationRule = typeof automationRules.$inferSelect;
export type InsertAutomationRule = z.infer<typeof insertAutomationRuleSchema>;
export type ProgressPost = typeof progressPosts.$inferSelect;
export type InsertProgressPost = z.infer<typeof insertProgressPostSchema>;
export type Encouragement = typeof encouragements.$inferSelect;
export type InsertEncouragement = z.infer<typeof insertEncouragementSchema>;
export type Goal = typeof goals.$inferSelect;
export type InsertGoal = z.infer<typeof insertGoalSchema>;
export type AiUsage = typeof aiUsage.$inferSelect;
export type InsertAiUsage = z.infer<typeof insertAiUsageSchema>;

// Tool Builder System Types
export type ToolTemplate = typeof toolTemplates.$inferSelect;
export type InsertToolTemplate = typeof toolTemplates.$inferInsert;
export type ToolDraft = typeof toolDrafts.$inferSelect;
export type InsertToolDraft = typeof toolDrafts.$inferInsert;
export type ToolUsageStats = typeof toolUsageStats.$inferSelect;
export type InsertToolUsageStats = typeof toolUsageStats.$inferInsert;

// Workflow System Types
export type Workflow = typeof workflows.$inferSelect;
export type InsertWorkflow = z.infer<typeof insertWorkflowSchema>;
export type WorkflowStep = typeof workflowSteps.$inferSelect;
export type InsertWorkflowStep = z.infer<typeof insertWorkflowStepSchema>;
export type WorkflowConnection = typeof workflowConnections.$inferSelect;
export type InsertWorkflowConnection = z.infer<typeof insertWorkflowConnectionSchema>;
export type WorkflowExecution = typeof workflowExecutions.$inferSelect;
export type InsertWorkflowExecution = z.infer<typeof insertWorkflowExecutionSchema>;
export type WorkflowExecutionStep = typeof workflowExecutionSteps.$inferSelect;
export type InsertWorkflowExecutionStep = z.infer<typeof insertWorkflowExecutionStepSchema>;
export type IntegrationConnection = typeof integrationConnections.$inferSelect;
export type InsertIntegrationConnection = z.infer<typeof insertIntegrationConnectionSchema>;

// Workflow Marketplace Types
export type WorkflowPricing = typeof workflowPricing.$inferSelect;
export type InsertWorkflowPricing = z.infer<typeof insertWorkflowPricingSchema>;
export type WorkflowPurchase = typeof workflowPurchases.$inferSelect;
export type InsertWorkflowPurchase = z.infer<typeof insertWorkflowPurchaseSchema>;
export type WorkflowCreatorEarnings = typeof workflowCreatorEarnings.$inferSelect;
export type InsertWorkflowCreatorEarnings = z.infer<typeof insertWorkflowCreatorEarningsSchema>;
export type FeaturedWorkflow = typeof featuredWorkflows.$inferSelect;
export type InsertFeaturedWorkflow = z.infer<typeof insertFeaturedWorkflowSchema>;