import type { Express } from "express";
import { createServer as createHttpServer, type Server } from "http";
import { createServer as createHttpsServer } from "https";
import fs from "fs";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import cors from "cors";
import { websocketService } from "./websocket-service";
import { z } from "zod";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { resolvers, type ResolverKey } from "./resolvers";
import { registerProductivityRoutes } from "./productivity-routes";
import toolBuilderRoutes from "./tool-builder-routes";
import { subscriptionRoutes } from "./subscription-routes";
import apiIntegrationRoutes, { publicWebhookRouter } from "./api-integration-routes";
import discoveryRoutes from "./discovery-routes";
import { payoutRouter } from "./payout-routes";
import { tagsRouter } from "./tags-routes";
import { billingRouter } from "./billing-routes";
import {
  insertFxnSchema,
  users,
  runs,
  favorites,
  fxns,
  toolDrafts,
  stripeEvents,
  billingHistory,
  subscriptions,
  plans,
  toolPricing,
  toolPurchases,
  tags,
  type Fxn,
} from "@shared/schema";
import {
  getAllFxnsWithStats,
  getFxnWithStatsBySlug,
  getUserFxns,
} from "./storage";
import { db } from "./db";
import {
  eq,
  desc,
  and,
  ilike,
  or,
  sql,
  count,
  inArray,
  gte,
  lt,
} from "drizzle-orm";
import express from "express";
import bcrypt from "bcryptjs";
import { UUID } from "crypto";
import Stripe from "stripe";
import {
  appCache,
  userCache,
  staticCache,
  cacheMiddleware,
  setApiCacheHeaders,
} from "./cache-service";
import {
  performanceMonitor,
  performanceMiddleware,
} from "./performance-monitor";
import {
  rateLimiters,
  enhancedCSRFProtection,
  securityHeaders,
  httpsRedirect,
  withNonce,
} from "./security-middleware";
import { sendEmail, emailTemplates } from "./email-service";
import {
  sendProUpgradeEmail,
  sendSubscriptionCancelledEmail,
  sendPaymentSuccessEmail,
  sendPaymentFailedEmail,
} from "./email-notifications";
import { generateWorkflowFromPrompt } from "./ai-service";

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many authentication attempts, please try again later.",
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: {
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many requests, please try again later.",
    },
  },
});

// Import centralized Stripe client
import { stripe } from "./stripe-client";

// Stripe webhook event handler
async function handleStripeWebhook(event: Stripe.Event) {
  console.log(`🔔 Stripe webhook received: ${event.type} (${event.id})`);

  try {
    // Check if we've already processed this event (idempotency)
    const [existingEvent] = await db
      .select()
      .from(stripeEvents)
      .where(eq(stripeEvents.stripeEventId, event.id))
      .limit(1);

    if (existingEvent) {
      console.log(`⏭️ Event ${event.id} already processed, skipping`);
      return;
    }

    // Record the event as being processed
    await db.insert(stripeEvents).values({
      stripeEventId: event.id,
      eventType: event.type,
      processed: false,
    });

    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionCancellation(subscription);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentSuccess(invoice);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailure(invoice);
        break;
      }

      case "customer.subscription.trial_will_end": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleTrialEnding(subscription);
        break;
      }

      default:
        console.log(`🔔 Unhandled webhook event type: ${event.type}`);
    }

    // Mark event as successfully processed
    await db
      .update(stripeEvents)
      .set({ processed: true })
      .where(eq(stripeEvents.stripeEventId, event.id));
  } catch (error) {
    console.error(`❌ Error handling webhook ${event.type}:`, error);
    throw error;
  }
}

// Handle subscription creation/updates
async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  try {
    // Find user by Stripe customer ID
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.stripeCustomerId, customerId))
      .limit(1);

    if (!user) {
      console.error(`❌ User not found for customer ID: ${customerId}`);
      return;
    }

    // Get Pro plan ID
    const [proPlan] = await db
      .select()
      .from(plans)
      .where(eq(plans.code, "pro"))
      .limit(1);

    if (!proPlan) {
      console.error(`❌ Pro plan not found in database`);
      return;
    }

    // Update user subscription details
    await db
      .update(users)
      .set({
        stripeSubscriptionId: subscription.id,
        subscriptionStatus: subscription.status,
        subscriptionCurrentPeriodEnd: new Date(
          (subscription as any).current_period_end * 1000
        ),
      })
      .where(eq(users.id, user.id));

    // Create or update subscription record in subscriptions table
    const [existingSubscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, user.id))
      .limit(1);

    const isNewSubscription = !existingSubscription;

    if (existingSubscription) {
      // Update existing subscription
      await db
        .update(subscriptions)
        .set({
          planId: proPlan.id,
          status: subscription.status as any,
          currentPeriodEnd: new Date(
            (subscription as any).current_period_end * 1000
          ),
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.userId, user.id));
    } else {
      // Create new subscription
      await db.insert(subscriptions).values({
        userId: user.id,
        planId: proPlan.id,
        status: subscription.status as any,
        currentPeriodEnd: new Date(
          (subscription as any).current_period_end * 1000
        ),
      });
    }

    console.log(
      `✅ Updated subscription for user ${user.email}: ${subscription.status}`
    );

    // Send upgrade email for new Pro subscriptions
    if (isNewSubscription && subscription.status === "active") {
      const nextBillingDate = new Date(
        (subscription as any).current_period_end * 1000
      ).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      await sendProUpgradeEmail(
        user.id,
        user.name || "there",
        user.email,
        nextBillingDate
      );
    }
  } catch (error) {
    console.error("❌ Error updating subscription:", error);
    throw error;
  }
}

// Handle subscription cancellation
async function handleSubscriptionCancellation(
  subscription: Stripe.Subscription
) {
  const customerId = subscription.customer as string;

  try {
    // Find user by Stripe customer ID
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.stripeCustomerId, customerId))
      .limit(1);

    if (!user) {
      console.error(`❌ User not found for customer ID: ${customerId}`);
      return;
    }

    // Update user subscription to canceled (use Stripe's spelling)
    await db
      .update(users)
      .set({
        subscriptionStatus: "canceled",
        subscriptionCurrentPeriodEnd: new Date(
          (subscription as any).current_period_end * 1000
        ),
      })
      .where(eq(users.id, user.id));

    console.log(`✅ Canceled subscription for user ${user.email}`);

    // Send cancellation email
    const accessEndDate = new Date(
      (subscription as any).current_period_end * 1000
    ).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    await sendSubscriptionCancelledEmail(
      user.id,
      user.name || "there",
      user.email,
      accessEndDate
    );
  } catch (error) {
    console.error("❌ Error cancelling subscription:", error);
    throw error;
  }
}

// Handle successful payments
async function handlePaymentSuccess(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  try {
    // Find user by Stripe customer ID
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.stripeCustomerId, customerId))
      .limit(1);

    if (!user) {
      console.error(`❌ User not found for customer ID: ${customerId}`);
      return;
    }

    // If this is a subscription invoice, update the subscription status
    if ((invoice as any).subscription) {
      const subscription = await stripe.subscriptions.retrieve(
        (invoice as any).subscription as string
      );

      await db
        .update(users)
        .set({
          subscriptionStatus: subscription.status,
          subscriptionCurrentPeriodEnd: new Date(
            (subscription as any).current_period_end * 1000
          ),
        })
        .where(eq(users.id, user.id));
    }

    // Record successful payment in billing history
    await db.insert(billingHistory).values({
      userId: user.id,
      stripeInvoiceId: invoice.id,
      type: "invoice",
      status: "paid",
      amount: (invoice as any).amount_paid || 0,
      currency: invoice.currency || "usd",
      description:
        invoice.description ||
        `Payment for ${invoice.lines.data[0]?.description || "subscription"}`,
      metadata: {
        invoiceNumber: invoice.number,
        periodStart: (invoice as any).period_start,
        periodEnd: (invoice as any).period_end,
        hostedInvoiceUrl: invoice.hosted_invoice_url,
        invoicePdf: invoice.invoice_pdf,
      },
    });

    console.log(
      `✅ Payment succeeded for user ${user.email}: $${((invoice as any).amount_paid / 100).toFixed(2)}`
    );

    // Send payment success email for subscription payments
    if ((invoice as any).subscription) {
      const subscription = await stripe.subscriptions.retrieve(
        (invoice as any).subscription as string
      );
      const nextBillingDate = new Date(
        (subscription as any).current_period_end * 1000
      ).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      await sendPaymentSuccessEmail(
        user.id,
        user.name || "there",
        user.email,
        (invoice as any).amount_paid || 0,
        nextBillingDate,
        invoice.hosted_invoice_url || undefined
      );
    }
  } catch (error) {
    console.error("❌ Error handling payment success:", error);
    throw error;
  }
}

// Handle failed payments
async function handlePaymentFailure(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  try {
    // Find user by Stripe customer ID
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.stripeCustomerId, customerId))
      .limit(1);

    if (!user) {
      console.error(`❌ User not found for customer ID: ${customerId}`);
      return;
    }

    // Update subscription status to past_due if subscription-related
    if ((invoice as any).subscription) {
      const subscription = await stripe.subscriptions.retrieve(
        (invoice as any).subscription as string
      );

      await db
        .update(users)
        .set({
          subscriptionStatus: subscription.status, // Usually 'past_due'
        })
        .where(eq(users.id, user.id));
    }

    // Record failed payment in billing history
    await db.insert(billingHistory).values({
      userId: user.id,
      stripeInvoiceId: invoice.id,
      type: "invoice",
      status: "failed",
      amount: (invoice as any).amount_due || 0,
      currency: invoice.currency || "usd",
      description: `Failed payment for ${invoice.lines.data[0]?.description || "subscription"}`,
      metadata: {
        invoiceNumber: invoice.number,
        attemptCount: (invoice as any).attempt_count,
      },
    });

    console.log(
      `⚠️ Payment failed for user ${user.email}: $${((invoice as any).amount_due / 100).toFixed(2)}`
    );

    // Send payment failed email for subscription payments
    if ((invoice as any).subscription) {
      const subscription = await stripe.subscriptions.retrieve(
        (invoice as any).subscription as string
      );
      const nextRetryDate = (invoice as any).next_payment_attempt
        ? new Date(
            (invoice as any).next_payment_attempt * 1000
          ).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        : "within the next few days";
      await sendPaymentFailedEmail(
        user.id,
        user.name || "there",
        user.email,
        (invoice as any).amount_due || 0,
        nextRetryDate
      );
    }
  } catch (error) {
    console.error("❌ Error handling payment failure:", error);
    throw error;
  }
}

// Handle trial ending notification
async function handleTrialEnding(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  try {
    // Find user by Stripe customer ID
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.stripeCustomerId, customerId))
      .limit(1);

    if (!user) {
      console.error(`❌ User not found for customer ID: ${customerId}`);
      return;
    }

    console.log(`⏰ Trial ending for user ${user.email} in 3 days`);

    // Send trial ending email notification
    const trialEndDate = subscription.trial_end
      ? new Date((subscription.trial_end as number) * 1000).toLocaleDateString(
          "en-US",
          {
            year: "numeric",
            month: "long",
            day: "numeric",
          }
        )
      : "soon";

    const emailTemplate = emailTemplates.trialEnding(
      user.name || "there",
      trialEndDate
    );
    const emailSent = await sendEmail({
      to: user.email,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
    });

    if (emailSent) {
      console.log(`✅ Trial ending email sent to ${user.email}`);
    } else {
      console.error(`❌ Failed to send trial ending email to ${user.email}`);
    }
  } catch (error) {
    console.error("❌ Error handling trial ending:", error);
    throw error;
  }
}

export function registerRoutes(app: Express): Server {
  // HTTP to HTTPS redirect (must be first to redirect before any processing)
  app.use(httpsRedirect);

  // Generate nonce for CSP (must be early to be available for all responses)
  app.use(withNonce);

  // Performance monitoring for all routes
  app.use(performanceMiddleware(performanceMonitor));

  // Enhanced security headers (includes Stripe-compatible CSP with nonce)
  app.use(securityHeaders);

  // Legacy helmet for additional protection (CSP disabled to prevent conflicts)
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false, // Prevent conflicts with development
    })
  );

  app.use(
    cors({
      origin: [
        process.env.FRONTEND_URL || "https://localhost:5000",
        "http://localhost:5000",
        "http://127.0.0.1:5001",
        "http://localhost:4200",
        "https://localhost:4200",
        "http://localhost:5001",
        "https://fxns.ca",
        "https://www.fxns.ca",
        "https://localhost:5001",
      ],
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "X-CSRF-Token", "Authorization", "X-Requested-With"],
    })
  );

  // Enhanced rate limiting with endpoint-specific limits
  app.use("/api/auth", rateLimiters.auth); // Covers /api/auth/login, /api/auth/register
  app.use("/api/integrations", rateLimiters.apiIntegration);
  app.use("/api/ai", rateLimiters.ai);
  app.use("/api/subscription/upload", rateLimiters.upload);
  app.use("/api", rateLimiters.general);

  // Setup authentication routes
  setupAuth(app);

  // Register webhook and special routes BEFORE CSRF protection
  // These routes have their own security mechanisms and should not be blocked by CSRF

  // Client Error Logging Endpoint - No CSRF needed (monitoring/logging only)
  app.post("/api/errors/client", async (req, res) => {
    try {
      const errorData = req.body;
      console.error("🔴 Client Error Report:", {
        errorId: errorData.errorId,
        message: errorData.message,
        url: errorData.url,
        timestamp: errorData.timestamp,
        userAgent: errorData.userAgent,
        stack: errorData.stack?.substring(0, 500), // Truncate for logs
      });

      // Store error in logs/monitoring service
      // In production, you might want to send this to a service like Sentry

      res.status(200).json({
        success: true,
        message: "Error logged successfully",
        errorId: errorData.errorId,
      });
    } catch (error) {
      console.error("Failed to log client error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to log error",
      });
    }
  });

  // Stripe webhook endpoint - No CSRF needed (external webhook with signature verification)
  app.post(
    "/api/stripe/webhook",
    express.raw({ type: "application/json" }),
    (req, res) => {
      const sig = req.headers["stripe-signature"];
      const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

      if (!sig) {
        console.error("⚠️ Webhook signature missing");
        return res.status(400).send("Webhook signature missing");
      }

      if (!endpointSecret) {
        console.error("⚠️ Webhook endpoint secret not configured");
        return res.status(500).send("Webhook not configured");
      }

      let event: Stripe.Event;

      try {
        // Verify the webhook signature
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
      } catch (err: any) {
        console.error(`⚠️ Webhook signature verification failed:`, err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }

      // Handle the webhook event
      handleStripeWebhook(event)
        .then(() => {
          res.json({ received: true });
        })
        .catch((error) => {
          console.error("❌ Webhook handler error:", error);
          res.status(500).send("Webhook handler error");
        });
    }
  );

  // API Integration public webhook endpoints - No CSRF needed (external webhooks with signature verification)
  app.use("/api/integrations", publicWebhookRouter);

  // Apply CSRF protection to ALL state-changing routes after this point
  // This ensures all POST/PUT/DELETE/PATCH operations require proper CSRF headers
  // GET/HEAD/OPTIONS are automatically exempted by the middleware
  app.use(enhancedCSRFProtection);

  // Stripe subscription management endpoints
  app.post("/api/stripe/create-subscription", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const user = req.user;
      if (!user.email) {
        return res.status(400).json({ error: "User email required" });
      }

      // Check if user already has an active subscription
      if (user.stripeSubscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(
          user.stripeSubscriptionId
        );

        if (subscription.status === "active") {
          return res.json({
            subscriptionId: subscription.id,
            status: subscription.status,
            clientSecret: (subscription as any).latest_invoice?.payment_intent
              ?.client_secret,
          });
        }
      }

      let customerId = user.stripeCustomerId;

      // Create customer if doesn't exist
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: user.name || user.email,
          metadata: {
            userId: user.id,
          },
        });
        customerId = customer.id;

        // Update user with customer ID
        await db
          .update(users)
          .set({ stripeCustomerId: customerId })
          .where(eq(users.id, user.id));
      }

      // Create subscription with setup intent for payment method collection
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [
          {
            price:
              process.env.STRIPE_PRICE_ID ||
              (() => {
                throw new Error(
                  "STRIPE_PRICE_ID environment variable is required"
                );
              })(),
          },
        ],
        payment_behavior: "default_incomplete",
        payment_settings: {
          save_default_payment_method: "on_subscription",
        },
        expand: ["latest_invoice.payment_intent"],
      });

      // Update user with subscription ID
      await db
        .update(users)
        .set({
          stripeSubscriptionId: subscription.id,
          subscriptionStatus: subscription.status,
        })
        .where(eq(users.id, user.id));

      res.json({
        subscriptionId: subscription.id,
        clientSecret: (subscription as any).latest_invoice?.payment_intent
          ?.client_secret,
        status: subscription.status,
      });
    } catch (error: any) {
      console.error("❌ Subscription creation error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/stripe/cancel-subscription", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const user = req.user;
      if (!user.stripeSubscriptionId) {
        return res.status(400).json({ error: "No active subscription found" });
      }

      // Cancel subscription at period end
      const subscription = await stripe.subscriptions.update(
        user.stripeSubscriptionId,
        {
          cancel_at_period_end: true,
        }
      );

      // Update user subscription status (mark as canceled at period end)
      await db
        .update(users)
        .set({ subscriptionStatus: subscription.status }) // Keep Stripe's actual status
        .where(eq(users.id, user.id));

      res.json({
        subscriptionId: subscription.id,
        status: subscription.status,
        cancelAtPeriodEnd: (subscription as any).cancel_at_period_end,
        currentPeriodEnd: (subscription as any).current_period_end,
      });
    } catch (error: any) {
      console.error("❌ Subscription cancellation error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/stripe/subscription-status", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const user = req.user;

      if (!user.stripeSubscriptionId) {
        return res.json({
          status: "free",
          subscriptionId: null,
        });
      }

      // Fetch current subscription status from Stripe
      const subscription = await stripe.subscriptions.retrieve(
        user.stripeSubscriptionId
      );

      // Update local database with current status
      await db
        .update(users)
        .set({
          subscriptionStatus: subscription.status,
          subscriptionCurrentPeriodEnd: new Date(
            (subscription as any).current_period_end * 1000
          ),
        })
        .where(eq(users.id, user.id));

      res.json({
        subscriptionId: subscription.id,
        status: subscription.status,
        currentPeriodEnd: (subscription as any).current_period_end,
        cancelAtPeriodEnd: (subscription as any).cancel_at_period_end,
      });
    } catch (error: any) {
      console.error("❌ Subscription status error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Seed data (development only)
  app.post("/api/admin/seed", async (req, res, next) => {
    try {
      if (process.env.NODE_ENV === "production") {
        return res.status(403).json({
          error: {
            code: "FORBIDDEN",
            message: "Seeding not allowed in production",
          },
        });
      }

      // Create built-in fxns
      const builtinFxns = [
        {
          slug: "tip-calculator",
          title: "Tip Calculator",
          description:
            "Calculate tips and split bills with tax included. Perfect for dining out with friends.",
          category: "calculator",
          inputSchema: {}, // Frontend has hardcoded form for builtin tools
          outputSchema: {},
          codeKind: "builtin" as const,
          codeRef: "tip-calculator",
          isPublic: true,
          createdBy: null,
          moderationStatus: "approved", // Auto-approve builtin tools
        },
        {
          slug: "unit-converter",
          title: "Unit Converter",
          description:
            "Convert between different units of length, weight, temperature, and more.",
          category: "converter",
          inputSchema: {}, // Frontend has hardcoded form for builtin tools
          outputSchema: {},
          codeKind: "builtin" as const,
          codeRef: "unit-converter",
          isPublic: true,
          createdBy: null,
        },
        {
          slug: "loan-payment",
          title: "Loan Payment Calculator",
          description:
            "Calculate loan payments and amortization schedules for mortgages and loans.",
          category: "finance",
          inputSchema: {}, // Frontend has hardcoded form for builtin tools
          outputSchema: {},
          codeKind: "builtin" as const,
          codeRef: "loan-payment",
          isPublic: true,
          createdBy: null,
        },
        {
          slug: "json-formatter",
          title: "JSON Formatter",
          description:
            "Format and validate JSON data with syntax highlighting and error detection.",
          category: "developer",
          inputSchema: {}, // Frontend has hardcoded form for builtin tools
          outputSchema: {},
          codeKind: "builtin" as const,
          codeRef: "json-formatter",
          isPublic: true,
          createdBy: null,
        },
        {
          slug: "regex-tester",
          title: "Regex Tester",
          description:
            "Test regular expressions against text with match highlighting and capture groups.",
          category: "developer",
          inputSchema: {}, // Frontend has hardcoded form for builtin tools
          outputSchema: {},
          codeKind: "builtin" as const,
          codeRef: "regex-tester",
          isPublic: true,
          createdBy: null,
        },
        {
          slug: "workout-generator",
          title: "Workout Generator",
          description:
            "Generate personalized workout routines based on your fitness level and goals.",
          category: "health",
          inputSchema: {}, // Frontend has hardcoded form for builtin tools
          outputSchema: {},
          codeKind: "builtin" as const,
          codeRef: "workout-generator",
          isPublic: true,
          createdBy: null,
        },
        {
          slug: "ai-task-prioritizer",
          title: "AI Task Prioritizer",
          description:
            "Use AI to intelligently prioritize your tasks based on urgency, importance, and context.",
          category: "productivity",
          inputSchema: {}, // Frontend has hardcoded form for builtin tools
          outputSchema: {},
          codeKind: "builtin" as const,
          codeRef: "ai-task-prioritizer",
          isPublic: true,
          createdBy: null,
        },
        {
          slug: "meeting-transcript-analyzer",
          title: "Meeting Transcript Analyzer",
          description:
            "Transform meeting transcripts into actionable insights, summaries, and task lists using AI.",
          category: "productivity",
          inputSchema: {}, // Frontend has hardcoded form for builtin tools
          outputSchema: {},
          codeKind: "builtin" as const,
          codeRef: "meeting-transcript-analyzer",
          isPublic: true,
          createdBy: null,
        },
        {
          slug: "smart-scheduler",
          title: "Smart Scheduler",
          description:
            "Generate optimized daily schedules that balance productivity, breaks, and personal habits using AI.",
          category: "productivity",
          inputSchema: {}, // Frontend has hardcoded form for builtin tools
          outputSchema: {},
          codeKind: "builtin" as const,
          codeRef: "smart-scheduler",
          isPublic: true,
          createdBy: null,
        },
      ];

      // Insert fxns
      for (const fxn of builtinFxns) {
        const existing = await storage.getFxnBySlug(fxn.slug);
        if (!existing) {
          await storage.createFxn(fxn);
        }
      }

      // Seed tags
      const commonTags = [
        {
          name: "Calculator",
          slug: "calculator",
          description: "Tools for mathematical calculations",
          color: "#3B82F6",
        },
        {
          name: "Converter",
          slug: "converter",
          description: "Convert between different units and formats",
          color: "#10B981",
        },
        {
          name: "Security",
          slug: "security",
          description: "Security and encryption tools",
          color: "#EF4444",
        },
        {
          name: "Data Processing",
          slug: "data-processing",
          description: "Process and transform data",
          color: "#8B5CF6",
        },
        {
          name: "Text Tools",
          slug: "text-tools",
          description: "Text manipulation and formatting",
          color: "#F59E0B",
        },
        {
          name: "Developer",
          slug: "developer",
          description: "Tools for developers and programmers",
          color: "#06B6D4",
        },
        {
          name: "Finance",
          slug: "finance",
          description: "Financial calculations and planning",
          color: "#14B8A6",
        },
        {
          name: "Health",
          slug: "health",
          description: "Health and wellness tools",
          color: "#EC4899",
        },
        {
          name: "Productivity",
          slug: "productivity",
          description: "Boost your productivity",
          color: "#6366F1",
        },
        {
          name: "AI-Powered",
          slug: "ai-powered",
          description: "Uses artificial intelligence",
          color: "#A855F7",
        },
        {
          name: "Quick",
          slug: "quick",
          description: "Fast and simple to use",
          color: "#22C55E",
        },
        {
          name: "Advanced",
          slug: "advanced",
          description: "Advanced features and options",
          color: "#F97316",
        },
      ];

      for (const tag of commonTags) {
        const existing = await db.query.tags.findFirst({
          where: eq(tags.slug, tag.slug),
        });
        if (!existing) {
          await db.insert(tags).values(tag);
        }
      }

      res.json({ message: "Database seeded successfully" });
    } catch (error) {
      next(error);
    }
  });

  // Fxns routes
  // app.get("/api/fxns", async (req, res, next) => {
  //   try {
  //     const { category, search } = req.query;
  //     const fxns = await getAllFxnsWithStats({
  //       category: category as string,
  //       search: search as string,
  //       isPublic: true,
  //     });
  //     res.json({ fxns });
  //   } catch (error) {
  //     next(error);
  //   }
  // });

  // app.patch("/api/fxns/:id", async (req, res, next) => {
  //   try {
  //     if (!req.isAuthenticated())
  //       return res.status(401).json({ error: "Unauthorized" });
  //     const id = req.params.id as UUID;
  //     const fxn = await storage.getFxn(id);
  //     if (!fxn)
  //       return res.status(404).json({ error: { code: "FXN_NOT_FOUND" } });
  //     if (fxn.createdBy && fxn.createdBy !== req.user.id)
  //       return res.status(403).json({ error: "Forbidden" });

  //     const updates: any = {};
  //     for (const k of ["title", "description", "category", "isPublic"])
  //       if (k in req.body) updates[k] = req.body[k];
  //     if ("inputSchema" in req.body)
  //       updates.inputSchema = JSON.parse(req.body.inputSchema);
  //     if ("outputSchema" in req.body)
  //       updates.outputSchema = JSON.parse(req.body.outputSchema);
  //     if ("code" in req.body) {
  //       updates.codeKind = "custom";
  //       updates.codeRef = String(req.body.code);
  //     }

  //     const saved = await storage.updateFxn(fxn.id as any, updates);
  //     res.json({ fxn: saved });
  //   } catch (e) {
  //     if (e instanceof SyntaxError)
  //       return res.status(400).json({
  //         error: { code: "VALIDATION_ERROR", message: "Invalid JSON" },
  //       });
  //     next(e);
  //   }
  // });

  // app.post("/api/fxns", async (req, res, next) => {
  //   if (!req.isAuthenticated()) {
  //     return res.status(401).json({ error: "Unauthorized" });
  //   }
  //   try {
  //     // Parse and validate input data
  //     const {
  //       title,
  //       description,
  //       category,
  //       isPublic,
  //       inputSchema,
  //       outputSchema,
  //       code,
  //     } = req.body;

  //     // Validate required fields
  //     if (
  //       !title ||
  //       !description ||
  //       !category ||
  //       !inputSchema ||
  //       !outputSchema ||
  //       !code
  //     ) {
  //       return res.status(400).json({
  //         error: {
  //           code: "VALIDATION_ERROR",
  //           message: "Missing required fields",
  //         },
  //       });
  //     }

  //     // Generate slug from title
  //     const slug = title
  //       .toLowerCase()
  //       .replace(/[^a-z0-9\s-]/g, "")
  //       .replace(/\s+/g, "-")
  //       .replace(/-+/g, "-")
  //       .trim();

  //     // Validate JSON schemas
  //     try {
  //       JSON.parse(inputSchema);
  //       JSON.parse(outputSchema);
  //     } catch (parseError) {
  //       return res.status(400).json({
  //         error: {
  //           code: "VALIDATION_ERROR",
  //           message: "Invalid JSON in input or output schema",
  //         },
  //       });
  //     }

  //     const validatedData = insertFxnSchema.parse({
  //       slug,
  //       title,
  //       description,
  //       category,
  //       inputSchema: JSON.parse(inputSchema),
  //       outputSchema: JSON.parse(outputSchema),
  //       codeKind: "custom" as const,
  //       codeRef: code,
  //       isPublic: isPublic || false,
  //       createdBy: req.user.id,
  //     });

  //     const fxn = await storage.createFxn(validatedData);
  //     res.status(201).json({ fxn });
  //   } catch (error) {
  //     if (error instanceof z.ZodError) {
  //       return res.status(400).json({
  //         error: {
  //           code: "VALIDATION_ERROR",
  //           message: "Invalid input data",
  //           details: error.errors,
  //         },
  //       });
  //     }
  //     // Postgres unique constraint (e.g., slug already exists)
  //     // @ts-ignore
  //     if (error?.code === "23505") {
  //       // Try to specialize the message for slug
  //       const message =
  //         // @ts-ignore
  //         /fxns_slug_key/.test(error?.constraint || "")
  //           ? "A tool with this title/slug already exists. Try a different title."
  //           : "Duplicate value violates a unique constraint.";
  //       return res.status(409).json({
  //         error: { code: "CONFLICT", message },
  //       });
  //     }
  //     next(error);
  //   }
  // });

  // // Run fxn
  // function validateAndCoerceInputs(schema: any, body: any) {
  //   if (!schema || typeof schema !== "object" || Array.isArray(schema))
  //     return body; // nothing to do
  //   const result: Record<string, any> = {};
  //   for (const [key, spec] of Object.entries(schema as Record<string, any>)) {
  //     const required = !!spec.required;
  //     let v = body[key];
  //     switch (spec.type) {
  //       case "number":
  //         if (v === "" || v === undefined || v === null) {
  //           if (required) throw new Error(`Field "${key}" is required`);
  //           break;
  //         }
  //         if (typeof v !== "number") {
  //           const num = Number(v);
  //           if (Number.isNaN(num))
  //             throw new Error(`Field "${key}" must be a number`);
  //           v = num;
  //         }
  //         if (spec.min !== undefined && v < spec.min)
  //           throw new Error(`Field "${key}" must be >= ${spec.min}`);
  //         if (spec.max !== undefined && v > spec.max)
  //           throw new Error(`Field "${key}" must be <= ${spec.max}`);
  //         break;
  //       case "boolean":
  //         v = !!v;
  //         break;
  //       case "list":
  //         if (Array.isArray(v)) {
  //           v = v.map((s: any) => String(s)).filter(Boolean);
  //         } else if (typeof v === "string") {
  //           v = v
  //             .split(/\r?\n|,/)
  //             .map((s) => s.trim())
  //             .filter(Boolean);
  //         } else if (v == null) {
  //           v = [];
  //         } else {
  //           v = [String(v)];
  //         }
  //         if (required && v.length === 0)
  //           throw new Error(`Field "${key}" must include at least one item`);
  //         break;
  //       default:
  //         // string/textarea/select/multiselect/etc.
  //         if (v == null || v === "") {
  //           if (required) throw new Error(`Field "${key}" is required`);
  //         } else {
  //           // coerce multiselect commas/newlines into array
  //           if (spec.type === "multiselect" && !Array.isArray(v)) {
  //             v = String(v)
  //               .split(/\r?\n|,/)
  //               .map((s) => s.trim())
  //               .filter(Boolean);
  //           }
  //         }
  //     }
  //     result[key] = v;
  //   }
  //   return result;
  // }

  // // Helper function to get fxn by ID or slug
  // async function getFxnByIdOrSlug(idOrSlug: string, options?: { userId?: UUID; adminOverride?: boolean }): Promise<Fxn | undefined> {
  //   const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
  //   if (isUUID) {
  //     return await storage.getFxn(idOrSlug as UUID, options);
  //   } else {
  //     return await storage.getFxnBySlug(idOrSlug, options);
  //   }
  // }

  // app.post("/api/fxns/:id/run", async (req, res, next) => {
  //   let startTime: number = Date.now();
  //   let fxn: any;

  //   try {
  //     const id = req.params.id;
  //     // Allow user to run their own tools regardless of moderation status
  //     fxn = await getFxnByIdOrSlug(id, { userId: req.user?.id as any });
  //     if (!fxn) {
  //       return res.status(404).json({
  //         error: { code: "FXN_NOT_FOUND", message: "Function not found" },
  //       });
  //     }

  //     // Check Pro tier access control
  //     if (fxn.accessTier === 'pro' && fxn.createdBy !== req.user?.id) {
  //       if (!req.user?.id) {
  //         return res.status(401).json({
  //           error: {
  //             code: 'PRO_REQUIRED',
  //             message: 'You must be logged in with a Pro subscription to use this tool',
  //             upgradeRequired: true,
  //             upgradeUrl: '/pricing'
  //           }
  //         });
  //       }

  //       const { proService } = await import('./pro-service');
  //       const hasPro = await proService.hasProSubscription(req.user.id);

  //       if (!hasPro) {
  //         return res.status(403).json({
  //           error: {
  //             code: 'PRO_REQUIRED',
  //             message: 'This tool requires a Pro subscription',
  //             upgradeRequired: true,
  //             upgradeUrl: '/pricing'
  //           }
  //         });
  //       }
  //     }

  //     // Check access control for paid tools
  //     const pricing = await db.query.toolPricing.findFirst({
  //       where: eq(toolPricing.fxnId, fxn.id),
  //     });

  //     // If tool has pricing and is not free, check if user has access
  //     if (pricing && pricing.pricingModel !== 'free' && fxn.createdBy !== req.user?.id) {
  //       // If not logged in, deny access
  //       if (!req.user?.id) {
  //         return res.status(401).json({
  //           needsPurchase: true,
  //           pricing: {
  //             pricingModel: pricing.pricingModel,
  //             price: pricing.price,
  //           },
  //           error: {
  //             code: "PURCHASE_REQUIRED",
  //             message: "You must be logged in and purchase this tool to use it",
  //           },
  //         });
  //       }

  //       // Check for purchase
  //       const purchase = await db.query.toolPurchases.findFirst({
  //         where: and(
  //           eq(toolPurchases.buyerId, req.user.id),
  //           eq(toolPurchases.fxnId, fxn.id),
  //           sql`${toolPurchases.expiresAt} IS NULL OR ${toolPurchases.expiresAt} > NOW()`
  //         ),
  //       });

  //       if (!purchase) {
  //         return res.status(403).json({
  //           needsPurchase: true,
  //           pricing: {
  //             pricingModel: pricing.pricingModel,
  //             price: pricing.price,
  //           },
  //           error: {
  //             code: "PURCHASE_REQUIRED",
  //             message: "You need to purchase this tool to use it",
  //           },
  //         });
  //       }
  //     }

  //     let outputs;
  //     let validatedInput;
  //     startTime = Date.now();

  //     if (fxn.codeKind === "builtin") {
  //       const resolver = resolvers[fxn.codeRef as ResolverKey];
  //       if (!resolver) {
  //         return res.status(500).json({
  //           error: {
  //             code: "RESOLVER_NOT_FOUND",
  //             message: "Function resolver not found",
  //           },
  //         });
  //       }
  //       validatedInput = resolver.inputSchema.parse(req.body) as any;
  //       outputs = resolver.resolver(validatedInput);
  //     } else if (fxn.codeKind === "custom") {
  //       // use our simple DSL to validate/coerce
  //       let incoming = req.body;
  //       try {
  //         incoming = validateAndCoerceInputs(fxn.inputSchema, incoming);
  //       } catch (ve: any) {
  //         return res
  //           .status(400)
  //           .json({ error: { code: "VALIDATION_ERROR", message: ve.message } });
  //       }
  //       validatedInput = incoming;
  //       const func = new Function(
  //         "inputs",
  //         fxn.codeRef.includes("function")
  //           ? fxn.codeRef + "; return customTool(inputs);"
  //           : `return (${fxn.codeRef})(inputs);`
  //       );
  //       outputs = func(validatedInput);
  //     } else if (fxn.codeKind === "config") {
  //       // Handle tool builder created tools
  //       let incoming = req.body;
  //       try {
  //         incoming = validateAndCoerceInputs(fxn.inputSchema, incoming);
  //       } catch (ve: any) {
  //         return res
  //           .status(400)
  //           .json({ error: { code: "VALIDATION_ERROR", message: ve.message } });
  //       }
  //       validatedInput = incoming;

  //       // Check if tool configuration contains API calls or AI analysis (including nested)
  //       // These must be executed server-side for security
  //       const builderConfig = fxn.builderConfig as any;
  //       const hasServerSideStepsRecursive = (steps: any[]): boolean => {
  //         if (!Array.isArray(steps)) return false;
  //         return steps.some((step: any) => {
  //           if (step.type === 'api_call' || step.type === 'ai_analysis') {
  //             return true;
  //           }
  //           // Check nested steps in conditions
  //           if (step.config?.condition) {
  //             const thenSteps = step.config.condition.then || [];
  //             const elseSteps = step.config.condition.else || [];
  //             return hasServerSideStepsRecursive(thenSteps) || hasServerSideStepsRecursive(elseSteps);
  //           }
  //           return false;
  //         });
  //       };
  //       const hasServerSideSteps = hasServerSideStepsRecursive(builderConfig?.logicConfig || []);

  //       if (hasServerSideSteps && builderConfig?.inputConfig && builderConfig?.logicConfig && builderConfig?.outputConfig) {
  //         // Execute server-side using toolBuilderService for API/AI steps
  //         const { toolBuilderService } = await import('./tool-builder-service.js');
  //         outputs = await toolBuilderService.testToolTemplate(
  //           builderConfig.inputConfig,
  //           builderConfig.logicConfig,
  //           builderConfig.outputConfig,
  //           validatedInput
  //         );
  //       } else {
  //         // Execute the tool resolver function safely for simple tools
  //         const func = new Function(
  //           "inputs",
  //           fxn.codeRef.includes("function")
  //             ? fxn.codeRef + "; return resolver(inputs);"
  //             : `return (${fxn.codeRef})(inputs);`
  //         );
  //         outputs = await func(validatedInput);
  //       }
  //     } else {
  //       return res.status(400).json({
  //         error: {
  //           code: "UNSUPPORTED_FXN",
  //           message: "Unsupported function type",
  //         },
  //       });
  //     }

  //     const durationMs = Date.now() - startTime;

  //     // record a run even if not authenticated
  //     await storage.createRun({
  //       fxnId: fxn.id,
  //       inputs: validatedInput,
  //       outputs,
  //       durationMs,
  //       userId: req.user?.id ?? null,
  //     });

  //     // Track analytics for authenticated users
  //     if (req.user?.id) {
  //       try {
  //         const { analyticsService } = await import('./analytics-service.js');
  //         await analyticsService.trackToolUsage(
  //           req.user.id,
  //           fxn.id,
  //           durationMs,
  //           true // execution succeeded if we got here
  //         );
  //       } catch (analyticsError) {
  //         // Don't fail the request if analytics fails
  //         console.warn('Analytics tracking failed:', analyticsError);
  //       }
  //     }

  //     res.json({ success: true, outputs, durationMs });
  //   } catch (error: any) {
  //     const durationMs = startTime ? Date.now() - startTime : 0;

  //     // Track failed execution analytics for authenticated users
  //     if (req.user?.id && fxn) {
  //       try {
  //         const { analyticsService } = await import('./analytics-service.js');
  //         await analyticsService.trackToolUsage(
  //           req.user.id,
  //           fxn.id,
  //           durationMs,
  //           false // execution failed
  //         );
  //       } catch (analyticsError) {
  //         console.warn('Analytics tracking for failed execution failed:', analyticsError);
  //       }
  //     }

  //     // Enhanced error handling with user-friendly messages
  //     console.error('Tool execution error:', error);

  //     // Zod validation errors (input schema validation)
  //     if (error instanceof z.ZodError) {
  //       return res.status(400).json({
  //         error: {
  //           code: "VALIDATION_ERROR",
  //           message: "Invalid input data. Please check your inputs and try again.",
  //           details: error.errors.map(e => ({
  //             field: e.path.join('.'),
  //             message: e.message
  //           })),
  //           userMessage: "Please check the highlighted fields and correct any errors."
  //         },
  //       });
  //     }

  //     // Custom validation errors from executeToolLogic
  //     if (error.message?.includes('VALIDATION_ERROR:')) {
  //       const userMessage = error.message.replace('VALIDATION_ERROR:', '').trim();
  //       return res.status(400).json({
  //         error: {
  //           code: "INPUT_VALIDATION_ERROR",
  //           message: userMessage,
  //           userMessage: userMessage,
  //           category: "user_input"
  //         },
  //       });
  //     }

  //     // Calculation errors
  //     if (error.message?.includes('CALCULATION_ERROR:')) {
  //       const userMessage = error.message.replace('CALCULATION_ERROR:', '').trim();
  //       return res.status(400).json({
  //         error: {
  //           code: "CALCULATION_ERROR",
  //           message: userMessage,
  //           userMessage: userMessage,
  //           category: "user_input",
  //           helpText: "Please verify that all numeric inputs are valid numbers."
  //         },
  //       });
  //     }

  //     // Transform errors
  //     if (error.message?.includes('TRANSFORM_ERROR:')) {
  //       const userMessage = error.message.replace('TRANSFORM_ERROR:', '').trim();
  //       return res.status(400).json({
  //         error: {
  //           code: "TRANSFORM_ERROR",
  //           message: userMessage,
  //           userMessage: userMessage,
  //           category: "user_input"
  //         },
  //       });
  //     }

  //     // API call errors
  //     if (error.message?.includes('API_')) {
  //       const [errorCode, ...messageParts] = error.message.split(':');
  //       const userMessage = messageParts.join(':').trim();
  //       const statusCode = errorCode.includes('UNAUTHORIZED') || errorCode.includes('FORBIDDEN') ? 403 : 500;

  //       return res.status(statusCode).json({
  //         error: {
  //           code: errorCode.trim(),
  //           message: userMessage || error.message,
  //           userMessage: userMessage || "An error occurred while calling an external API.",
  //           category: "external_service",
  //           helpText: errorCode.includes('UNAUTHORIZED') || errorCode.includes('AUTH')
  //             ? "This tool may require authentication. Please contact the tool creator."
  //             : errorCode.includes('TIMEOUT') || errorCode.includes('NETWORK')
  //             ? "Please check your internet connection and try again."
  //             : errorCode.includes('RATE_LIMITED')
  //             ? "The service is rate limited. Please wait a moment before trying again."
  //             : "Please try again or contact the tool creator if the issue persists."
  //         },
  //       });
  //     }

  //     // AI analysis errors
  //     if (error.message?.includes('AI_')) {
  //       const [errorCode, ...messageParts] = error.message.split(':');
  //       const userMessage = messageParts.join(':').trim();
  //       const statusCode = errorCode.includes('RATE_LIMIT') || errorCode.includes('QUOTA') ? 429 :
  //                         errorCode.includes('AUTH') || errorCode.includes('KEY_MISSING') ? 403 : 500;

  //       return res.status(statusCode).json({
  //         error: {
  //           code: errorCode.trim(),
  //           message: userMessage || error.message,
  //           userMessage: userMessage || "An error occurred during AI analysis.",
  //           category: "ai_service",
  //           helpText: errorCode.includes('RATE_LIMIT')
  //             ? "The AI service is rate limited. Please wait a moment and try again."
  //             : errorCode.includes('QUOTA')
  //             ? "AI quota exceeded. Please contact the tool creator."
  //             : errorCode.includes('AUTH') || errorCode.includes('KEY')
  //             ? "AI service not properly configured. Please contact the tool creator."
  //             : errorCode.includes('INPUT_TOO_LONG')
  //             ? "Try reducing the length of your input text."
  //             : "Please try again or contact the tool creator if the issue persists."
  //         },
  //       });
  //     }

  //     // Custom code execution errors
  //     if (error.message?.includes('CUSTOM_CODE_ERROR:')) {
  //       const userMessage = error.message.replace('CUSTOM_CODE_ERROR:', '').trim();
  //       return res.status(500).json({
  //         error: {
  //           code: "CUSTOM_CODE_ERROR",
  //           message: "The tool's custom code encountered an error.",
  //           userMessage: "This tool has a configuration error. Please contact the tool creator.",
  //           category: "tool_configuration",
  //           technicalDetails: userMessage
  //         },
  //       });
  //     }

  //     // Execution errors
  //     if (error.message?.includes('EXECUTION_ERROR:')) {
  //       const userMessage = error.message.replace('EXECUTION_ERROR:', '').trim();
  //       return res.status(500).json({
  //         error: {
  //           code: "EXECUTION_ERROR",
  //           message: userMessage,
  //           userMessage: "An error occurred while executing this tool. Please try again or contact the tool creator.",
  //           category: "tool_execution",
  //           technicalDetails: userMessage
  //         },
  //       });
  //     }

  //     // Generic errors - pass to error handler middleware
  //     next(error);
  //   }
  // });

  // OPTIONAL: a tiny stats endpoint if you ever want to refetch just counts
  // app.get("/api/fxns/:id/stats", async (req, res, next) => {
  //   try {
  //     const id = req.params.id;
  //     const fxn = await getFxnByIdOrSlug(id);
  //     if (!fxn) {
  //       return res.status(404).json({ error: { code: "FXN_NOT_FOUND" } });
  //     }
  //     const [runRow, favRow] = await Promise.all([
  //       db
  //         .select({ count: sql<number>`count(*)` })
  //         .from(runs)
  //         .where(eq(runs.fxnId, fxn.id)),
  //       db
  //         .select({ count: sql<number>`count(*)` })
  //         .from(favorites)
  //         .where(eq(favorites.fxnId, fxn.id)),
  //     ]);
  //     res.json({
  //       runCount: Number(runRow?.[0]?.count ?? 0),
  //       favoriteCount: Number(favRow?.[0]?.count ?? 0),
  //     });
  //   } catch (e) {
  //     next(e);
  //   }
  // });

  // app.get("/api/fxns/:id", async (req, res, next) => {
  //   try {
  //     const { id } = req.params as any;

  //     // Pull the base row - allow users to view their own tools regardless of moderation status
  //     const base = await getFxnByIdOrSlug(id, { userId: req.user?.id as any });
  //     if (!base)
  //       return res.status(404).json({ error: { code: "FXN_NOT_FOUND" } });

  //     // Respect privacy
  //     const isOwner =
  //       req.isAuthenticated() &&
  //       base.createdBy &&
  //       base.createdBy === req.user.id;
  //     if (!base.isPublic && !isOwner)
  //       return res.status(404).json({ error: { code: "FXN_NOT_FOUND" } });

  //     // Add run/favorite counts - use base.id (UUID) not the slug
  //     const [runRow, favRow] = await Promise.all([
  //       db
  //         .select({ c: sql<number>`count(*)` })
  //         .from(runs)
  //         .where(eq(runs.fxnId, base.id)),
  //       db
  //         .select({ c: sql<number>`count(*)` })
  //         .from(favorites)
  //         .where(eq(favorites.fxnId, base.id)),
  //     ]);

  //     const fxn = {
  //       ...base,
  //       runCount: Number(runRow?.[0]?.c ?? 0),
  //       favoriteCount: Number(favRow?.[0]?.c ?? 0),
  //     };

  //     res.json({ fxn });
  //   } catch (err) {
  //     next(err);
  //   }
  // });

  // app.delete("/api/fxns/:id", async (req, res, next) => {
  //   try {
  //     if (!req.isAuthenticated())
  //       return res.status(401).json({ error: "Unauthorized" });
  //     const id = req.params.id;
  //     const fxn = await getFxnByIdOrSlug(id, { userId: req.user.id as any });
  //     if (!fxn)
  //       return res.status(404).json({ error: { code: "FXN_NOT_FOUND" } });
  //     if (fxn.createdBy && fxn.createdBy !== req.user.id)
  //       return res.status(403).json({ error: "Forbidden" });

  //     await storage.deleteFxn(fxn.id as any);
  //     res.json({ success: true });
  //   } catch (e) {
  //     next(e);
  //   }
  // });

  // app.post("/api/fxns/:id/clone", async (req, res, next) => {
  //   try {
  //     if (!req.isAuthenticated())
  //       return res.status(401).json({ error: "Unauthorized" });
  //     const id = req.params.id;
  //     const base = await getFxnByIdOrSlug(id);
  //     if (!base)
  //       return res.status(404).json({ error: { code: "FXN_NOT_FOUND" } });

  //     // Create a new title/slug; make it definitely custom and assign to current user
  //     const title = `Copy of ${base.title}`.slice(0, 100);
  //     const slug = title
  //       .toLowerCase()
  //       .replace(/[^a-z0-9\s-]/g, "")
  //       .replace(/\s+/g, "-")
  //       .replace(/-+/g, "-")
  //       .trim();

  //     const cloned = await storage.createFxn({
  //       slug,
  //       title,
  //       description: base.description,
  //       category: base.category,
  //       inputSchema: base.inputSchema,
  //       outputSchema: base.outputSchema,
  //       codeKind: "custom",
  //       codeRef: base.codeRef, // copy code
  //       isPublic: false, // start private so the user can tweak
  //       createdBy: req.user.id,
  //     });
  //     res.status(201).json({ fxn: cloned });
  //   } catch (e) {
  //     next(e);
  //   }
  // });

  // app.get("/api/fxns/:id/related", async (req, res, next) => {
  //   try {
  //     const id = req.params.id;
  //     const fxn = await getFxnByIdOrSlug(id, { userId: req.user?.id as any });
  //     if (!fxn)
  //       return res.status(404).json({ error: { code: "FXN_NOT_FOUND" } });

  //     const all = await getAllFxnsWithStats({
  //       category: fxn.category,
  //       isPublic: true,
  //     });
  //     const related = all.filter((x) => x.id !== fxn.id).slice(0, 6);
  //     res.json({ fxns: related });
  //   } catch (e) {
  //     next(e);
  //   }
  // });

  // Favorites routes
  // app.post("/api/fxns/:id/favorite", async (req, res, next) => {
  //   if (!req.isAuthenticated()) {
  //     return res.status(401).json({ error: "Unauthorized" });
  //   }
  //   try {
  //     const { id } = req.params;
  //     const userId = req.user.id as UUID;

  //     const fxn = await getFxnByIdOrSlug(id);
  //     if (!fxn) {
  //       return res.status(404).json({
  //         error: { code: "FXN_NOT_FOUND", message: "Function not found" },
  //       });
  //     }

  //     await storage.addFavorite(userId, fxn.id as any);
  //     res.json({ success: true });
  //   } catch (error) {
  //     next(error);
  //   }
  // });

  // app.delete("/api/fxns/:id/favorite", async (req, res, next) => {
  //   if (!req.isAuthenticated()) {
  //     return res.status(401).json({ error: "Unauthorized" });
  //   }
  //   try {
  //     const { id } = req.params;
  //     const userId = req.user.id as UUID;

  //     const fxn = await getFxnByIdOrSlug(id);
  //     if (!fxn) {
  //       return res.status(404).json({
  //         error: { code: "FXN_NOT_FOUND", message: "Function not found" },
  //       });
  //     }

  //     await storage.removeFavorite(userId, fxn.id as any);
  //     res.json({ success: true });
  //   } catch (error) {
  //     next(error);
  //   }
  // });

  // app.post("/api/fxns/:id/favorite", async (req, res, next) => {
  //   try {
  //     if (!req.isAuthenticated())
  //       return res.status(401).json({ error: "Unauthorized" });

  //     const id = req.params.id as UUID;
  //     const fxn = await storage.getFxn(id);
  //     if (!fxn)
  //       return res.status(404).json({ error: { code: "FXN_NOT_FOUND" } });

  //     const isFav = await storage.isFavorite(req.user.id as any, fxn.id as any);
  //     if (isFav) {
  //       await storage.removeFavorite(req.user.id as any, fxn.id as any);
  //       return res.json({ favorited: false });
  //     } else {
  //       await storage.addFavorite(req.user.id as any, fxn.id as any);
  //       return res.json({ favorited: true });
  //     }
  //   } catch (e) {
  //     next(e);
  //   }
  // });

  app.get("/api/me/favorites", async (req, res, next) => {
    try {
      if (!req.isAuthenticated())
        return res.status(401).json({ error: "Unauthorized" });
      const list = await storage.getUserFavorites(req.user.id as any);
      res.json({ fxns: list });
    } catch (e) {
      next(e);
    }
  });

  // Tool testing endpoint
  // app.post("/api/tools/test", async (req, res, next) => {
  //   if (!req.isAuthenticated()) {
  //     return res.status(401).json({ error: "Unauthorized" });
  //   }
  //   try {
  //     const { code, inputs } = req.body;

  //     if (!code || !inputs) {
  //       return res.status(400).json({
  //         error: {
  //           code: "VALIDATION_ERROR",
  //           message: "Code and inputs are required",
  //         },
  //       });
  //     }

  //     // Execute the custom function in a safe context
  //     try {
  //       // Create a safe function execution context
  //       const func = new Function(
  //         "inputs",
  //         code.includes("function")
  //           ? code + "; return customTool(inputs);"
  //           : `return (${code})(inputs);`
  //       );
  //       const result = func(inputs);

  //       res.json(result);
  //     } catch (executionError: any) {
  //       res.status(400).json({
  //         error: {
  //           code: "EXECUTION_ERROR",
  //           message:
  //             executionError.message || "Error executing custom function",
  //         },
  //       });
  //     }
  //   } catch (error) {
  //     next(error);
  //   }
  // });

  app.get("/api/me/favorites", async (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    try {
      const userId = req.user.id as UUID;
      const favorites = await storage.getUserFavorites(userId);
      res.json({ favorites });
    } catch (error) {
      next(error);
    }
  });

  // User dashboard data with comprehensive analytics
  app.get("/api/me/dashboard", async (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    try {
      const userId = req.user.id as UUID;

      // Get comprehensive analytics data
      const { analyticsService } = await import("./analytics-service.js");
      const dashboardData =
        await analyticsService.getUserDashboardAnalytics(userId);

      // Also get basic data for backwards compatibility
      const [favorites, recentRuns, userFxns] = await Promise.all([
        storage.getUserFavorites(userId),
        storage.getUserRuns(userId, 10),
        db.select().from(fxns).where(eq(fxns.createdBy, userId)),
      ]);

      // Get drafts from tool builder for backwards compatibility
      const drafts = await db
        .select({
          id: toolDrafts.id,
          name: toolDrafts.name,
          status: toolDrafts.status,
          updatedAt: toolDrafts.updatedAt,
          category: toolDrafts.category,
          progress: sql<number>`
            CASE 
              WHEN ${toolDrafts.status} = 'published' THEN 100
              WHEN ${toolDrafts.status} = 'testing' THEN 75
              WHEN ${toolDrafts.name} IS NOT NULL AND ${toolDrafts.inputConfig} IS NOT NULL THEN 50
              WHEN ${toolDrafts.name} IS NOT NULL THEN 25
              ELSE 10
            END
          `.as("progress"),
        })
        .from(toolDrafts)
        .where(eq(toolDrafts.userId, userId))
        .orderBy(desc(toolDrafts.updatedAt))
        .limit(10);

      // Combine comprehensive analytics with backwards compatible data
      res.json({
        favorites,
        recentRuns,
        analytics: {
          // Enhanced analytics from new service
          ...dashboardData,
          // Legacy fields for backwards compatibility
          totalRuns: dashboardData.usage.totalRuns,
          toolViews: dashboardData.myTools.totalViews,
          toolsCreated: dashboardData.myTools.total,
          averageRating: 4.5, // TODO: Implement actual ratings system
          topCategories: [], // Will be populated from new analytics
          recentGrowth: [], // Will be populated from new analytics
          popularTools: dashboardData.topTools || [],
        },
        drafts: drafts.map((d) => ({
          id: d.id,
          name: d.name,
          status: d.status,
          updatedAt: d.updatedAt.toISOString(),
          category: d.category || "utility",
          progress: d.progress,
        })),
      });
    } catch (error) {
      next(error);
    }
  });

  // --- Sessions (for settings page) ---
  app.get("/api/me/sessions", async (req, res) => {
    if (!req.isAuthenticated())
      return res.status(401).json({ error: "Unauthorized" });

    const userId = req.user.id as UUID;
    const sessions = await storage.listSessions(userId, req.sessionID);
    res.json({ sessions });
  });

  app.post("/api/me/sessions/:id/revoke", async (req, res, next) => {
    if (!req.isAuthenticated())
      return res.status(401).json({ error: "Unauthorized" });
    try {
      const userId = req.user.id as UUID;
      const sessionId = req.params.id as unknown as UUID;
      await storage.revokeSession(userId, sessionId);
      res.json({ success: true });
    } catch (e) {
      next(e);
    }
  });

  app.post("/api/me/sessions/logout-all", async (req, res, next) => {
    if (!req.isAuthenticated())
      return res.status(401).json({ error: "Unauthorized" });
    try {
      const userId = req.user.id as UUID;
      const currentSid = req.sessionID;
      await storage.revokeAllOtherSessions(userId, currentSid);
      res.json({ success: true });
    } catch (e) {
      next(e);
    }
  });

  // Plans routes
  app.get("/api/plans", async (req, res, next) => {
    try {
      const plans = await storage.getAllPlans();
      res.json({ plans });
    } catch (error) {
      next(error);
    }
  });

  // app.get("/api/me/fxns", async (req, res, next) => {
  //   if (!req.isAuthenticated()) {
  //     return res.status(401).json({ error: "Unauthorized" });
  //   }
  //   try {
  //     const userId = req.user.id;
  //     const myFxns = await getUserFxns(userId as UUID);
  //     res.json({ fxns: myFxns });
  //   } catch (err) {
  //     next(err);
  //   }
  // });

  app.get("/api/me/export", async (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    try {
      const userId = req.user.id as UUID;
      const user = req.user;

      const [userProfile, myFxns, myRuns, myFavorites, myDrafts] =
        await Promise.all([
          db
            .select({
              id: users.id,
              name: users.name,
              email: users.email,
              createdAt: users.createdAt,
              subscriptionStatus: users.subscriptionStatus,
            })
            .from(users)
            .where(eq(users.id, userId))
            .limit(1),
          getUserFxns(userId),
          storage.getUserRuns(userId, 1000),
          storage.getUserFavorites(userId),
          db.select().from(toolDrafts).where(eq(toolDrafts.userId, userId)),
        ]);

      const exportData = {
        metadata: {
          exportDate: new Date().toISOString(),
          userId: userId,
          totalCounts: {
            tools: myFxns.length,
            runs: myRuns.length,
            favorites: myFavorites.length,
            drafts: myDrafts.length,
          },
        },
        profile: userProfile[0] || null,
        tools: myFxns,
        runs: myRuns,
        favorites: myFavorites,
        drafts: myDrafts,
      };

      const filename = `fxns-export-${userId}-${Date.now()}.json`;

      res.setHeader("Content-Type", "application/json");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );
      res.json(exportData);
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/me", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const userId = req.user.id;
    const rows = await db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, userId));
    const me = rows?.[0];
    if (!me)
      return res
        .status(404)
        .json({ error: { code: "USER_NOT_FOUND", message: "User not found" } });
    res.json({ user: me });
  });

  /**
   * Me: update profile (name/email)
   */
  app.patch("/api/me/profile", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const bodySchema = z.object({
      name: z.string().min(1, "Name is required"),
      email: z
        .string()
        .email("Invalid email")
        .transform((e) => e.toLowerCase()),
    });
    const parse = bodySchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid input",
          details: parse.error.issues,
        },
      });
    }
    const { name, email } = parse.data;
    const userId = req.user.id;

    // unique email check
    const existingByEmail = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email));
    if (existingByEmail.length && existingByEmail[0].id !== userId) {
      return res.status(409).json({
        error: { code: "EMAIL_IN_USE", message: "Email is already in use" },
      });
    }

    await db.update(users).set({ name, email }).where(eq(users.id, userId));
    const updated = await db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, userId));
    return res.json({ user: updated[0] });
  });

  /**
   * Me: change password
   */
  app.post("/api/me/change-password", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const bodySchema = z.object({
      currentPassword: z.string().min(1, "Current password is required"),
      newPassword: z
        .string()
        .min(8, "New password must be at least 8 characters"),
    });
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid input",
          details: parsed.error.issues,
        },
      });
    }
    const { currentPassword, newPassword } = parsed.data;
    const userId = req.user.id;

    // Fetch password hash
    const row = await db
      .select({
        id: users.id,
        passwordHash: users.passwordHash,
      })
      .from(users)
      .where(eq(users.id, userId));
    const me = row?.[0];
    if (!me || !me.passwordHash) {
      return res
        .status(404)
        .json({ error: { code: "USER_NOT_FOUND", message: "User not found" } });
    }

    const ok = await bcrypt.compare(currentPassword, me.passwordHash);
    if (!ok) {
      return res.status(400).json({
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Current password is incorrect",
        },
      });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await db
      .update(users)
      .set({
        [(users as any).passwordHash?.name || "passwordHash"]: newHash,
      } as any)
      .where(eq(users.id, userId));
    return res.json({ success: true });
  });

  const reportBody = z.object({
    reason: z.enum([
      "spam",
      "malware",
      "copyright",
      "offensive",
      "misleading",
      "other",
    ]),
    details: z.string().trim().max(2000).optional(),
  });

  // app.post("/api/fxns/:id/report", async (req, res, next) => {
  //   try {
  //     if (!req.isAuthenticated())
  //       return res.status(401).json({ error: "Unauthorized" });

  //     const id = req.params.id as UUID;
  //     const fxn = await storage.getFxn(id);
  //     if (!fxn) return res.status(404).json({ error: "FXN_NOT_FOUND" });

  //     const parsed = reportBody.safeParse(req.body);
  //     if (!parsed.success)
  //       return res.status(400).json({ error: parsed.error.flatten() });

  //     // prevent duplicate open reports by the same user on the same tool
  //     const existing = await storage.getOpenReportForFxnByUser(
  //       id,
  //       req.user.id as UUID
  //     );
  //     if (existing) return res.status(200).json({ report: existing, duplicate: true });

  //     const report = await storage.createFxnReport({
  //       fxnId: id,
  //       reporterId: req.user.id,
  //       reason: parsed.data.reason,
  //       details: parsed.data.details,
  //       status: "open",
  //     });

  //     // Send moderation alert to admins
  //     const { sendModerationAlert } = await import('./email-notifications');
  //     sendModerationAlert(fxn.id, fxn.title, parsed.data.reason);

  //     res.status(201).json({ report });
  //   } catch (err) {
  //     next(err);
  //   }
  // });

  // AI Workflow Generation
  app.post("/api/workflows/generate", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { prompt } = req.body;

      if (!prompt || typeof prompt !== "string") {
        return res
          .status(400)
          .json({ error: "Prompt is required and must be a string" });
      }

      const workflow = await generateWorkflowFromPrompt(req.user.id, prompt);

      res.json(workflow);
    } catch (error) {
      console.error("Workflow generation error:", error);

      // Send user-friendly error messages for validation failures
      if (error instanceof Error && error.message) {
        return res.status(400).json({ error: error.message });
      }

      // Generic error for unexpected failures
      res
        .status(500)
        .json({ error: "Failed to generate workflow. Please try again." });
    }
  });

  // Register productivity suite routes
  //registerProductivityRoutes(app);

  // Register tool builder routes for visual tool creation
  app.use("/api/tool-builder", toolBuilderRoutes);

  // Register subscription management routes for Pro features
  app.use("/api/subscription", subscriptionRoutes);

  // Register API integration routes for external service connectivity
  app.use("/api/integrations", apiIntegrationRoutes);

  // Register payout routes for Stripe Connect creator earnings
  app.use("/api/payouts", payoutRouter);

  // Register tags routes for tool categorization and filtering
  app.use("/api/tags", tagsRouter);

  // Register billing routes for transaction history and invoices
  app.use("/api/billing", billingRouter);

  // Register discovery routes for search, trending, ratings, and reviews
  app.use(discoveryRoutes);

  const isProd = process.env.NODE_ENV === "production";
  const useHttps = !isProd && (process.env.DEV_SSL ?? "true") !== "false"; // HTTPs in dev by default, unless DEV_SSL=false

  let httpServer: Server;
  if (useHttps) {
    const key = fs.readFileSync("./localhost-key.pem");
    const cert = fs.readFileSync("./localhost.pem");
    httpServer = createHttpsServer({ key, cert }, app);
  } else {
    httpServer = createHttpServer(app);
  }

  // Initialize WebSocket service
  websocketService.initialize(httpServer);

  return httpServer;
}
