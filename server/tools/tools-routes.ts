import express from "express";
import { z } from "zod";
import { db, getAllFxnsWithStats, storage } from "./../storage";
import {
  fxns as tools,
  insertFxnSchema as insertToolSchema,
  toolPricing,
  toolPurchases,
  Fxn as Tool,
  runs,
  favorites,
} from "../../shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getUserFxns } from "server/storage";
import { UUID } from "crypto";
import { ResolverKey, resolvers } from "server/resolvers";

const requireAuth = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
};

const router = express.Router();

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const myTools = await getUserFxns(userId as UUID);
    res.json({ tools: myTools });
  } catch (err) {
    next(err);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const { category, search } = req.query;
    const fxns = await getAllFxnsWithStats({
      category: category as string,
      search: search as string,
      isPublic: true,
    });
    res.json({ fxns });
  } catch (error) {
    next(error);
  }
});

router.patch("/:id", async (req, res, next) => {
  try {
    if (!req.isAuthenticated())
      return res.status(401).json({ error: "Unauthorized" });
    const id = req.params.id as UUID;
    const fxn = await storage.getFxn(id);
    if (!fxn) return res.status(404).json({ error: { code: "FXN_NOT_FOUND" } });
    if (fxn.createdBy && fxn.createdBy !== req.user.id)
      return res.status(403).json({ error: "Forbidden" });

    const updates: any = {};
    for (const k of ["title", "description", "category", "isPublic"])
      if (k in req.body) updates[k] = req.body[k];
    if ("inputSchema" in req.body)
      updates.inputSchema = JSON.parse(req.body.inputSchema);
    if ("outputSchema" in req.body)
      updates.outputSchema = JSON.parse(req.body.outputSchema);
    if ("code" in req.body) {
      updates.codeKind = "custom";
      updates.codeRef = String(req.body.code);
    }

    const saved = await storage.updateFxn(fxn.id as any, updates);
    res.json({ fxn: saved });
  } catch (e) {
    if (e instanceof SyntaxError)
      return res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "Invalid JSON" },
      });
    next(e);
  }
});

router.post("/", async (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    // Parse and validate input data
    const {
      title,
      description,
      category,
      isPublic,
      inputSchema,
      outputSchema,
      code,
    } = req.body;

    // Validate required fields
    if (
      !title ||
      !description ||
      !category ||
      !inputSchema ||
      !outputSchema ||
      !code
    ) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Missing required fields",
        },
      });
    }

    // Generate slug from title
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();

    // Validate JSON schemas
    try {
      JSON.parse(inputSchema);
      JSON.parse(outputSchema);
    } catch (parseError) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid JSON in input or output schema",
        },
      });
    }

    const validatedData = insertToolSchema.parse({
      slug,
      title,
      description,
      category,
      inputSchema: JSON.parse(inputSchema),
      outputSchema: JSON.parse(outputSchema),
      codeKind: "custom" as const,
      codeRef: code,
      isPublic: isPublic || false,
      createdBy: req.user.id,
    });

    const fxn = await storage.createFxn(validatedData);
    res.status(201).json({ fxn });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid input data",
          details: error.errors,
        },
      });
    }
    // Postgres unique constraint (e.g., slug already exists)
    // @ts-ignore
    if (error?.code === "23505") {
      // Try to specialize the message for slug
      const message =
        // @ts-ignore
        /fxns_slug_key/.test(error?.constraint || "")
          ? "A tool with this title/slug already exists. Try a different title."
          : "Duplicate value violates a unique constraint.";
      return res.status(409).json({
        error: { code: "CONFLICT", message },
      });
    }
    next(error);
  }
});

router.post("/:id/run", async (req, res, next) => {
  let startTime: number = Date.now();
  let fxn: any;

  try {
    const id = req.params.id;
    // Allow user to run their own tools regardless of moderation status
    fxn = await getFxnByIdOrSlug(id, { userId: req.user?.id as any });
    if (!fxn) {
      return res.status(404).json({
        error: { code: "FXN_NOT_FOUND", message: "Function not found" },
      });
    }

    // Check Pro tier access control
    if (fxn.accessTier === "pro" && fxn.createdBy !== req.user?.id) {
      if (!req.user?.id) {
        return res.status(401).json({
          error: {
            code: "PRO_REQUIRED",
            message:
              "You must be logged in with a Pro subscription to use this tool",
            upgradeRequired: true,
            upgradeUrl: "/pricing",
          },
        });
      }

      const { proService } = await import("./../pro-service");
      const hasPro = await proService.hasProSubscription(req.user.id);

      if (!hasPro) {
        return res.status(403).json({
          error: {
            code: "PRO_REQUIRED",
            message: "This tool requires a Pro subscription",
            upgradeRequired: true,
            upgradeUrl: "/pricing",
          },
        });
      }
    }

    // Check access control for paid tools
    const pricing = await db.query.toolPricing.findFirst({
      where: eq(toolPricing.fxnId, fxn.id),
    });

    // If tool has pricing and is not free, check if user has access
    if (
      pricing &&
      pricing.pricingModel !== "free" &&
      fxn.createdBy !== req.user?.id
    ) {
      // If not logged in, deny access
      if (!req.user?.id) {
        return res.status(401).json({
          needsPurchase: true,
          pricing: {
            pricingModel: pricing.pricingModel,
            price: pricing.price,
          },
          error: {
            code: "PURCHASE_REQUIRED",
            message: "You must be logged in and purchase this tool to use it",
          },
        });
      }

      // Check for purchase
      const purchase = await db.query.toolPurchases.findFirst({
        where: and(
          eq(toolPurchases.buyerId, req.user.id),
          eq(toolPurchases.fxnId, fxn.id),
          sql`${toolPurchases.expiresAt} IS NULL OR ${toolPurchases.expiresAt} > NOW()`
        ),
      });

      if (!purchase) {
        return res.status(403).json({
          needsPurchase: true,
          pricing: {
            pricingModel: pricing.pricingModel,
            price: pricing.price,
          },
          error: {
            code: "PURCHASE_REQUIRED",
            message: "You need to purchase this tool to use it",
          },
        });
      }
    }

    let outputs;
    let validatedInput;
    startTime = Date.now();

    if (fxn.codeKind === "builtin") {
      const resolver = resolvers[fxn.codeRef as ResolverKey];
      if (!resolver) {
        return res.status(500).json({
          error: {
            code: "RESOLVER_NOT_FOUND",
            message: "Function resolver not found",
          },
        });
      }
      validatedInput = resolver.inputSchema.parse(req.body) as any;
      outputs = resolver.resolver(validatedInput);
    } else if (fxn.codeKind === "custom") {
      // use our simple DSL to validate/coerce
      let incoming = req.body;
      try {
        incoming = validateAndCoerceInputs(fxn.inputSchema, incoming);
      } catch (ve: any) {
        return res
          .status(400)
          .json({ error: { code: "VALIDATION_ERROR", message: ve.message } });
      }
      validatedInput = incoming;
      const func = new Function(
        "inputs",
        fxn.codeRef.includes("function")
          ? fxn.codeRef + "; return customTool(inputs);"
          : `return (${fxn.codeRef})(inputs);`
      );
      outputs = func(validatedInput);
    } else if (fxn.codeKind === "config") {
      // Handle tool builder created tools
      let incoming = req.body;
      try {
        incoming = validateAndCoerceInputs(fxn.inputSchema, incoming);
      } catch (ve: any) {
        return res
          .status(400)
          .json({ error: { code: "VALIDATION_ERROR", message: ve.message } });
      }
      validatedInput = incoming;

      // Check if tool configuration contains API calls or AI analysis (including nested)
      // These must be executed server-side for security
      const builderConfig = fxn.builderConfig as any;
      const hasServerSideStepsRecursive = (steps: any[]): boolean => {
        if (!Array.isArray(steps)) return false;
        return steps.some((step: any) => {
          if (step.type === "api_call" || step.type === "ai_analysis") {
            return true;
          }
          // Check nested steps in conditions
          if (step.config?.condition) {
            const thenSteps = step.config.condition.then || [];
            const elseSteps = step.config.condition.else || [];
            return (
              hasServerSideStepsRecursive(thenSteps) ||
              hasServerSideStepsRecursive(elseSteps)
            );
          }
          return false;
        });
      };
      const hasServerSideSteps = hasServerSideStepsRecursive(
        builderConfig?.logicConfig || []
      );

      if (
        hasServerSideSteps &&
        builderConfig?.inputConfig &&
        builderConfig?.logicConfig &&
        builderConfig?.outputConfig
      ) {
        // Execute server-side using toolBuilderService for API/AI steps
        const { toolBuilderService } = await import(
          "./../tool-builder-service.js"
        );
        outputs = await toolBuilderService.testToolTemplate(
          builderConfig.inputConfig,
          builderConfig.logicConfig,
          builderConfig.outputConfig,
          validatedInput
        );
      } else {
        // Execute the tool resolver function safely for simple tools
        const func = new Function(
          "inputs",
          fxn.codeRef.includes("function")
            ? fxn.codeRef + "; return resolver(inputs);"
            : `return (${fxn.codeRef})(inputs);`
        );
        outputs = await func(validatedInput);
      }
    } else {
      return res.status(400).json({
        error: {
          code: "UNSUPPORTED_FXN",
          message: "Unsupported function type",
        },
      });
    }

    const durationMs = Date.now() - startTime;

    // record a run even if not authenticated
    await storage.createRun({
      fxnId: fxn.id,
      inputs: validatedInput,
      outputs,
      durationMs,
      userId: req.user?.id ?? null,
    });

    // Track analytics for authenticated users
    if (req.user?.id) {
      try {
        const { analyticsService } = await import("./../analytics-service.js");
        await analyticsService.trackToolUsage(
          req.user.id,
          fxn.id,
          durationMs,
          true // execution succeeded if we got here
        );
      } catch (analyticsError) {
        // Don't fail the request if analytics fails
        console.warn("Analytics tracking failed:", analyticsError);
      }
    }

    res.json({ success: true, outputs, durationMs });
  } catch (error: any) {
    const durationMs = startTime ? Date.now() - startTime : 0;

    // Track failed execution analytics for authenticated users
    if (req.user?.id && fxn) {
      try {
        const { analyticsService } = await import("./../analytics-service.js");
        await analyticsService.trackToolUsage(
          req.user.id,
          fxn.id,
          durationMs,
          false // execution failed
        );
      } catch (analyticsError) {
        console.warn(
          "Analytics tracking for failed execution failed:",
          analyticsError
        );
      }
    }

    // Enhanced error handling with user-friendly messages
    console.error("Tool execution error:", error);

    // Zod validation errors (input schema validation)
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message:
            "Invalid input data. Please check your inputs and try again.",
          details: error.errors.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
          userMessage:
            "Please check the highlighted fields and correct any errors.",
        },
      });
    }

    // Custom validation errors from executeToolLogic
    if (error.message?.includes("VALIDATION_ERROR:")) {
      const userMessage = error.message.replace("VALIDATION_ERROR:", "").trim();
      return res.status(400).json({
        error: {
          code: "INPUT_VALIDATION_ERROR",
          message: userMessage,
          userMessage: userMessage,
          category: "user_input",
        },
      });
    }

    // Calculation errors
    if (error.message?.includes("CALCULATION_ERROR:")) {
      const userMessage = error.message
        .replace("CALCULATION_ERROR:", "")
        .trim();
      return res.status(400).json({
        error: {
          code: "CALCULATION_ERROR",
          message: userMessage,
          userMessage: userMessage,
          category: "user_input",
          helpText: "Please verify that all numeric inputs are valid numbers.",
        },
      });
    }

    // Transform errors
    if (error.message?.includes("TRANSFORM_ERROR:")) {
      const userMessage = error.message.replace("TRANSFORM_ERROR:", "").trim();
      return res.status(400).json({
        error: {
          code: "TRANSFORM_ERROR",
          message: userMessage,
          userMessage: userMessage,
          category: "user_input",
        },
      });
    }

    // API call errors
    if (error.message?.includes("API_")) {
      const [errorCode, ...messageParts] = error.message.split(":");
      const userMessage = messageParts.join(":").trim();
      const statusCode =
        errorCode.includes("UNAUTHORIZED") || errorCode.includes("FORBIDDEN")
          ? 403
          : 500;

      return res.status(statusCode).json({
        error: {
          code: errorCode.trim(),
          message: userMessage || error.message,
          userMessage:
            userMessage || "An error occurred while calling an external API.",
          category: "external_service",
          helpText:
            errorCode.includes("UNAUTHORIZED") || errorCode.includes("AUTH")
              ? "This tool may require authentication. Please contact the tool creator."
              : errorCode.includes("TIMEOUT") || errorCode.includes("NETWORK")
                ? "Please check your internet connection and try again."
                : errorCode.includes("RATE_LIMITED")
                  ? "The service is rate limited. Please wait a moment before trying again."
                  : "Please try again or contact the tool creator if the issue persists.",
        },
      });
    }

    // AI analysis errors
    if (error.message?.includes("AI_")) {
      const [errorCode, ...messageParts] = error.message.split(":");
      const userMessage = messageParts.join(":").trim();
      const statusCode =
        errorCode.includes("RATE_LIMIT") || errorCode.includes("QUOTA")
          ? 429
          : errorCode.includes("AUTH") || errorCode.includes("KEY_MISSING")
            ? 403
            : 500;

      return res.status(statusCode).json({
        error: {
          code: errorCode.trim(),
          message: userMessage || error.message,
          userMessage: userMessage || "An error occurred during AI analysis.",
          category: "ai_service",
          helpText: errorCode.includes("RATE_LIMIT")
            ? "The AI service is rate limited. Please wait a moment and try again."
            : errorCode.includes("QUOTA")
              ? "AI quota exceeded. Please contact the tool creator."
              : errorCode.includes("AUTH") || errorCode.includes("KEY")
                ? "AI service not properly configured. Please contact the tool creator."
                : errorCode.includes("INPUT_TOO_LONG")
                  ? "Try reducing the length of your input text."
                  : "Please try again or contact the tool creator if the issue persists.",
        },
      });
    }

    // Custom code execution errors
    if (error.message?.includes("CUSTOM_CODE_ERROR:")) {
      const userMessage = error.message
        .replace("CUSTOM_CODE_ERROR:", "")
        .trim();
      return res.status(500).json({
        error: {
          code: "CUSTOM_CODE_ERROR",
          message: "The tool's custom code encountered an error.",
          userMessage:
            "This tool has a configuration error. Please contact the tool creator.",
          category: "tool_configuration",
          technicalDetails: userMessage,
        },
      });
    }

    // Execution errors
    if (error.message?.includes("EXECUTION_ERROR:")) {
      const userMessage = error.message.replace("EXECUTION_ERROR:", "").trim();
      return res.status(500).json({
        error: {
          code: "EXECUTION_ERROR",
          message: userMessage,
          userMessage:
            "An error occurred while executing this tool. Please try again or contact the tool creator.",
          category: "tool_execution",
          technicalDetails: userMessage,
        },
      });
    }

    // Generic errors - pass to error handler middleware
    next(error);
  }
});

//-------------------------------------------------------HELPER FUNCTIONS
async function getFxnByIdOrSlug(
  idOrSlug: string,
  options?: { userId?: UUID; adminOverride?: boolean }
): Promise<Tool | undefined> {
  const isUUID =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      idOrSlug
    );
  if (isUUID) {
    return await storage.getFxn(idOrSlug as UUID, options);
  } else {
    return await storage.getFxnBySlug(idOrSlug, options);
  }
}

// Run fxn
function validateAndCoerceInputs(schema: any, body: any) {
  if (!schema || typeof schema !== "object" || Array.isArray(schema))
    return body; // nothing to do
  const result: Record<string, any> = {};
  for (const [key, spec] of Object.entries(schema as Record<string, any>)) {
    const required = !!spec.required;
    let v = body[key];
    switch (spec.type) {
      case "number":
        if (v === "" || v === undefined || v === null) {
          if (required) throw new Error(`Field "${key}" is required`);
          break;
        }
        if (typeof v !== "number") {
          const num = Number(v);
          if (Number.isNaN(num))
            throw new Error(`Field "${key}" must be a number`);
          v = num;
        }
        if (spec.min !== undefined && v < spec.min)
          throw new Error(`Field "${key}" must be >= ${spec.min}`);
        if (spec.max !== undefined && v > spec.max)
          throw new Error(`Field "${key}" must be <= ${spec.max}`);
        break;
      case "boolean":
        v = !!v;
        break;
      case "list":
        if (Array.isArray(v)) {
          v = v.map((s: any) => String(s)).filter(Boolean);
        } else if (typeof v === "string") {
          v = v
            .split(/\r?\n|,/)
            .map((s) => s.trim())
            .filter(Boolean);
        } else if (v == null) {
          v = [];
        } else {
          v = [String(v)];
        }
        if (required && v.length === 0)
          throw new Error(`Field "${key}" must include at least one item`);
        break;
      default:
        // string/textarea/select/multiselect/etc.
        if (v == null || v === "") {
          if (required) throw new Error(`Field "${key}" is required`);
        } else {
          // coerce multiselect commas/newlines into array
          if (spec.type === "multiselect" && !Array.isArray(v)) {
            v = String(v)
              .split(/\r?\n|,/)
              .map((s) => s.trim())
              .filter(Boolean);
          }
        }
    }
    result[key] = v;
  }
  return result;
}

router.get("/:id/stats", async (req, res, next) => {
  try {
    const id = req.params.id;
    const fxn = await getFxnByIdOrSlug(id);
    if (!fxn) {
      return res.status(404).json({ error: { code: "FXN_NOT_FOUND" } });
    }
    const [runRow, favRow] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)` })
        .from(runs)
        .where(eq(runs.fxnId, fxn.id)),
      db
        .select({ count: sql<number>`count(*)` })
        .from(favorites)
        .where(eq(favorites.fxnId, fxn.id)),
    ]);
    res.json({
      runCount: Number(runRow?.[0]?.count ?? 0),
      favoriteCount: Number(favRow?.[0]?.count ?? 0),
    });
  } catch (e) {
    next(e);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params as any;

    // Pull the base row - allow users to view their own tools regardless of moderation status
    const base = await getFxnByIdOrSlug(id, { userId: req.user?.id as any });
    if (!base)
      return res.status(404).json({ error: { code: "FXN_NOT_FOUND" } });

    // Respect privacy
    const isOwner =
      req.isAuthenticated() && base.createdBy && base.createdBy === req.user.id;
    if (!base.isPublic && !isOwner)
      return res.status(404).json({ error: { code: "FXN_NOT_FOUND" } });

    // Add run/favorite counts - use base.id (UUID) not the slug
    const [runRow, favRow] = await Promise.all([
      db
        .select({ c: sql<number>`count(*)` })
        .from(runs)
        .where(eq(runs.fxnId, base.id)),
      db
        .select({ c: sql<number>`count(*)` })
        .from(favorites)
        .where(eq(favorites.fxnId, base.id)),
    ]);

    const fxn = {
      ...base,
      runCount: Number(runRow?.[0]?.c ?? 0),
      favoriteCount: Number(favRow?.[0]?.c ?? 0),
    };

    res.json({ fxn });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    if (!req.isAuthenticated())
      return res.status(401).json({ error: "Unauthorized" });
    const id = req.params.id;
    const fxn = await getFxnByIdOrSlug(id, { userId: req.user.id as any });
    if (!fxn) return res.status(404).json({ error: { code: "FXN_NOT_FOUND" } });
    if (fxn.createdBy && fxn.createdBy !== req.user.id)
      return res.status(403).json({ error: "Forbidden" });

    await storage.deleteFxn(fxn.id as any);
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

router.post("/:id/clone", async (req, res, next) => {
  try {
    if (!req.isAuthenticated())
      return res.status(401).json({ error: "Unauthorized" });
    const id = req.params.id;
    const base = await getFxnByIdOrSlug(id);
    if (!base)
      return res.status(404).json({ error: { code: "FXN_NOT_FOUND" } });

    // Create a new title/slug; make it definitely custom and assign to current user
    const title = `Copy of ${base.title}`.slice(0, 100);
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();

    const cloned = await storage.createFxn({
      slug,
      title,
      description: base.description,
      category: base.category,
      inputSchema: base.inputSchema,
      outputSchema: base.outputSchema,
      codeKind: "custom",
      codeRef: base.codeRef, // copy code
      isPublic: false, // start private so the user can tweak
      createdBy: req.user.id,
    });
    res.status(201).json({ fxn: cloned });
  } catch (e) {
    next(e);
  }
});

router.get("/:id/related", async (req, res, next) => {
  try {
    const id = req.params.id;
    const fxn = await getFxnByIdOrSlug(id, { userId: req.user?.id as any });
    if (!fxn) return res.status(404).json({ error: { code: "FXN_NOT_FOUND" } });

    const all = await getAllFxnsWithStats({
      category: fxn.category,
      isPublic: true,
    });
    const related = all.filter((x) => x.id !== fxn.id).slice(0, 6);
    res.json({ fxns: related });
  } catch (e) {
    next(e);
  }
});

router.post("/:id/favorite", async (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const { id } = req.params;
    const userId = req.user.id as UUID;

    const fxn = await getFxnByIdOrSlug(id);
    if (!fxn) {
      return res.status(404).json({
        error: { code: "FXN_NOT_FOUND", message: "Function not found" },
      });
    }

    await storage.addFavorite(userId, fxn.id as any);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id/favorite", async (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const { id } = req.params;
    const userId = req.user.id as UUID;

    const fxn = await getFxnByIdOrSlug(id);
    if (!fxn) {
      return res.status(404).json({
        error: { code: "FXN_NOT_FOUND", message: "Function not found" },
      });
    }

    await storage.removeFavorite(userId, fxn.id as any);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.post("/:id/favorite", async (req, res, next) => {
  try {
    if (!req.isAuthenticated())
      return res.status(401).json({ error: "Unauthorized" });

    const id = req.params.id as UUID;
    const fxn = await storage.getFxn(id);
    if (!fxn) return res.status(404).json({ error: { code: "FXN_NOT_FOUND" } });

    const isFav = await storage.isFavorite(req.user.id as any, fxn.id as any);
    if (isFav) {
      await storage.removeFavorite(req.user.id as any, fxn.id as any);
      return res.json({ favorited: false });
    } else {
      await storage.addFavorite(req.user.id as any, fxn.id as any);
      return res.json({ favorited: true });
    }
  } catch (e) {
    next(e);
  }
});

router.post("/test", async (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const { code, inputs } = req.body;

    if (!code || !inputs) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Code and inputs are required",
        },
      });
    }

    // Execute the custom function in a safe context
    try {
      // Create a safe function execution context
      const func = new Function(
        "inputs",
        code.includes("function")
          ? code + "; return customTool(inputs);"
          : `return (${code})(inputs);`
      );
      const result = func(inputs);

      res.json(result);
    } catch (executionError: any) {
      res.status(400).json({
        error: {
          code: "EXECUTION_ERROR",
          message: executionError.message || "Error executing custom function",
        },
      });
    }
  } catch (error) {
    next(error);
  }
});

router.post("/:id/report", async (req, res, next) => {
  try {
    if (!req.isAuthenticated())
      return res.status(401).json({ error: "Unauthorized" });

    const id = req.params.id as UUID;
    const fxn = await storage.getFxn(id);
    if (!fxn) return res.status(404).json({ error: "FXN_NOT_FOUND" });

    const parsed = reportBody.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({ error: parsed.error.flatten() });

    // prevent duplicate open reports by the same user on the same tool
    const existing = await storage.getOpenReportForFxnByUser(
      id,
      req.user.id as UUID
    );
    if (existing)
      return res.status(200).json({ report: existing, duplicate: true });

    const report = await storage.createFxnReport({
      fxnId: id,
      reporterId: req.user.id,
      reason: parsed.data.reason,
      details: parsed.data.details,
      status: "open",
    });

    // Send moderation alert to admins
    const { sendModerationAlert } = await import("./../email-notifications");
    sendModerationAlert(fxn.id, fxn.title, parsed.data.reason);

    res.status(201).json({ report });
  } catch (err) {
    next(err);
  }
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

export default router;
