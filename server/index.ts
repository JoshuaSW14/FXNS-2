import express, { type Request, Response, NextFunction } from "express";
import { config } from "dotenv";
import { registerRoutes } from "./routes";
import aiPreviewRoutes from "./routes/ai-preview.js";
import analyticsRoutes from "./routes/analytics.js";
import adminRoutes from "./routes/admin.js";
import adminRoutesSimple from "./admin-routes.js";
import reportsRoutes from "./routes/reports.js";
import sitemapRoutes from "./sitemap-routes.js";
import { emailRouter } from "./email-routes.js";
import { marketplaceRouter } from "./marketplace-routes.js";
import { workflowMarketplaceRouter } from "./workflow-marketplace-routes.js";
import { stripeWebhookRouter } from "./stripe-webhook.js";
import { tagsRouter } from "./tags-routes.js";
import integrationConnectionRoutes from "./integration-connection-routes.js";
import { requireAdmin } from "./middleware/admin.js";
import { requireAuth } from "./middleware/admin-auth.js";
import { setupVite, serveStatic, log } from "./vite";
import { schedulerService } from "./scheduler-service";
import { initializeCronJobs } from "./cron-jobs";

config();

const app = express();

app.set("trust proxy", 1);

// Health check endpoint - before any middleware
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Redirect from fxns.ca to www.fxns.ca in production
app.use((req, res, next) => {
  if (process.env.NODE_ENV === "production") {
    const host = req.get("host");
    // Redirect fxns.ca to www.fxns.ca (301 permanent redirect)
    if (host === "fxns.ca") {
      const protocol = req.secure ? "https" : "http";
      return res.redirect(301, `${protocol}://www.fxns.ca${req.originalUrl}`);
    }
  }
  next();
});

// Raw body parser for webhooks BEFORE any JSON parsing
app.use("/api/stripe/webhook", express.raw({ type: "application/json" }));
app.use("/api/marketplace/webhook", express.raw({ type: "application/json" }));
app.use("/api/webhooks/:workflowId", express.raw({ type: "application/json" }));

// JSON parsing for all other routes
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: false, limit: "10mb" }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Initialize scheduler service for automation
  await schedulerService.initialize();

  // Initialize email cron jobs
  const cronJobs = initializeCronJobs();

  const server = await registerRoutes(app);

  // Add AI preview routes
  app.use("/api/ai", aiPreviewRoutes);

  // Add analytics routes
  app.use("/api/analytics", analyticsRoutes);

  // Add admin routes (old comprehensive version)
  app.use("/api/admin-v2", adminRoutes);

  // Add simple admin routes with middleware
  app.use("/api/admin", requireAdmin, adminRoutesSimple);

  // Add reports routes with auth middleware
  app.use("/api/reports", requireAuth, reportsRoutes);

  // Add email preferences routes
  app.use("/api/email", requireAuth, emailRouter);

  // Add marketplace routes
  app.use("/api/marketplace", marketplaceRouter);

  // Add workflow marketplace routes
  app.use("/api/workflow-marketplace", workflowMarketplaceRouter);

  // Add Stripe webhook handler for marketplace purchases
  app.use("/api/marketplace", stripeWebhookRouter);

  // Add tags routes
  app.use("/api/tags", tagsRouter);

  // Add integration connection routes
  app.use("/api/integrations", integrationConnectionRoutes);

  // Add tools routes
  const toolsRoutes = await import("./tools/tools-routes.js");
  app.use("/api/tools", toolsRoutes.default);

  // Add workflow routes
  const workflowRoutes = await import("./workflow-routes.js");
  app.use("/api/workflows", workflowRoutes.default);

  // Add workflow execution routes
  const workflowExecutionRoutes = await import(
    "./workflow-execution-routes.js"
  );
  app.use("/api/workflows", workflowExecutionRoutes.default);

  // Add workflow webhook routes (must be before SEO routes for proper routing)
  const workflowWebhookRoutes = await import("./workflow-webhook-routes.js");
  app.use("/api", workflowWebhookRoutes.default);

  // Add workflow templates routes
  const workflowTemplatesRoutes = await import(
    "./workflow-templates-routes.js"
  );
  app.use("/api", workflowTemplatesRoutes.default);

  // Add workflow analytics routes
  const workflowAnalyticsRoutes = await import(
    "./workflow-analytics-routes.js"
  );
  app.use("/api", workflowAnalyticsRoutes.default);

  // Add SEO routes (sitemap and robots.txt)
  app.use(sitemapRoutes);

  // Use enhanced error handler
  const { errorHandler } = await import("./middleware/error-handler.js");
  app.use(errorHandler);

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    log("DEVELOPMENT");
    //await setupVite(app, server);
  } else {
    log("PROD");
    serveStatic(app);
  }

  // Backend server always listens on localhost:5001 in development
  // In production, it serves both API and static files on the configured port
  const listenPort = process.env.PORT ? Number(process.env.PORT) : 5001;
  const listenHost = app.get("env") === "development" ? "localhost" : "0.0.0.0";
  server.listen(listenPort, listenHost, () => {
    const mode = app.get("env");
    log(`running in mode: ${mode}`);
    log(`serving on ${listenHost}:${listenPort}`);
  });

  // Graceful shutdown handling
  process.on("SIGINT", async () => {
    log("🛑 Shutting down gracefully...");
    cronJobs.stop();
    await schedulerService.shutdown();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    log("🛑 Shutting down gracefully...");
    cronJobs.stop();
    await schedulerService.shutdown();
    process.exit(0);
  });
})();
