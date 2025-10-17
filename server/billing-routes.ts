import { Router, Request, Response } from "express";
import { db } from "./db";
import { billingHistory } from "@shared/schema";
import { eq, desc, and, gte, lte, or, ilike, sql } from "drizzle-orm";
import { z } from "zod";

const router = Router();

// Validation schema for billing history query params
const billingHistoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['paid', 'pending', 'failed', 'refunded']).optional(),
  type: z.enum(['invoice', 'charge', 'refund']).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  search: z.string().optional(),
});

// GET /api/billing/history - Get user's billing history with pagination and filters
router.get("/history", async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const query = billingHistoryQuerySchema.safeParse(req.query);
    if (!query.success) {
      return res.status(400).json({ 
        error: "Invalid query parameters", 
        details: query.error.issues 
      });
    }

    const { page, limit, status, type, startDate, endDate, search } = query.data;
    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [eq(billingHistory.userId, req.user.id)];

    if (status) {
      conditions.push(eq(billingHistory.status, status));
    }

    if (type) {
      conditions.push(eq(billingHistory.type, type));
    }

    if (startDate) {
      const startOfDay = new Date(startDate);
      startOfDay.setHours(0, 0, 0, 0);
      conditions.push(gte(billingHistory.createdAt, startOfDay));
    }

    if (endDate) {
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      conditions.push(lte(billingHistory.createdAt, endOfDay));
    }

    if (search) {
      conditions.push(
        or(
          ilike(billingHistory.description, `%${search}%`),
          ilike(billingHistory.stripeInvoiceId, `%${search}%`),
          ilike(billingHistory.stripeChargeId, `%${search}%`)
        )!
      );
    }

    // Get total count for pagination
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(billingHistory)
      .where(and(...conditions));

    const total = countResult?.count || 0;

    // Get paginated results
    const records = await db
      .select()
      .from(billingHistory)
      .where(and(...conditions))
      .orderBy(desc(billingHistory.createdAt))
      .limit(limit)
      .offset(offset);

    res.json({
      records,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: offset + records.length < total,
      },
    });
  } catch (error) {
    console.error("Error fetching billing history:", error);
    res.status(500).json({ error: "Failed to fetch billing history" });
  }
});

// GET /api/billing/history/:id - Get single billing record details with buyer/seller info
router.get("/history/:id", async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const [record] = await db
      .select()
      .from(billingHistory)
      .where(
        and(
          eq(billingHistory.id, req.params.id),
          eq(billingHistory.userId, req.user.id)
        )
      )
      .limit(1);

    if (!record) {
      return res.status(404).json({ error: "Billing record not found" });
    }

    // Fetch buyer info (current user)
    const [buyer] = await db
      .select({
        id: sql`id`,
        name: sql`name`,
        email: sql`email`,
      })
      .from(sql`users`)
      .where(sql`id = ${req.user.id}`)
      .limit(1);

    // Fetch seller info if available
    let seller = null;
    const metadata = record.metadata as any;
    if (metadata?.sellerId) {
      const [sellerData] = await db
        .select({
          id: sql`id`,
          name: sql`name`,
          email: sql`email`,
        })
        .from(sql`users`)
        .where(sql`id = ${metadata.sellerId}`)
        .limit(1);
      seller = sellerData;
    }

    // Fetch tool info if available (for slug)
    let tool = null;
    if (metadata?.fxnId) {
      const [toolData] = await db
        .select({
          id: sql`id`,
          title: sql`title`,
          slug: sql`slug`,
        })
        .from(sql`fxns`)
        .where(sql`id = ${metadata.fxnId}`)
        .limit(1);
      tool = toolData;
    }

    res.json({
      ...record,
      buyer,
      seller,
      tool,
    });
  } catch (error) {
    console.error("Error fetching billing record:", error);
    res.status(500).json({ error: "Failed to fetch billing record" });
  }
});

// GET /api/billing/stats - Get billing statistics for the user
router.get("/stats", async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Get statistics with net spend (subtract refunds)
    const [stats] = await db
      .select({
        totalSpent: sql<number>`COALESCE(
          SUM(CASE 
            WHEN ${billingHistory.status} = 'paid' THEN ${billingHistory.amount}
            WHEN ${billingHistory.type} = 'refund' OR ${billingHistory.status} = 'refunded' THEN -${billingHistory.amount}
            ELSE 0 
          END), 0)::int`,
        totalTransactions: sql<number>`count(*)::int`,
        paidCount: sql<number>`COALESCE(SUM(CASE WHEN ${billingHistory.status} = 'paid' THEN 1 ELSE 0 END), 0)::int`,
        pendingCount: sql<number>`COALESCE(SUM(CASE WHEN ${billingHistory.status} = 'pending' THEN 1 ELSE 0 END), 0)::int`,
        failedCount: sql<number>`COALESCE(SUM(CASE WHEN ${billingHistory.status} = 'failed' THEN 1 ELSE 0 END), 0)::int`,
        refundedCount: sql<number>`COALESCE(SUM(CASE WHEN ${billingHistory.type} = 'refund' OR ${billingHistory.status} = 'refunded' THEN 1 ELSE 0 END), 0)::int`,
      })
      .from(billingHistory)
      .where(eq(billingHistory.userId, req.user.id));

    res.json(stats || {
      totalSpent: 0,
      totalTransactions: 0,
      paidCount: 0,
      pendingCount: 0,
      failedCount: 0,
      refundedCount: 0,
    });
  } catch (error) {
    console.error("Error fetching billing stats:", error);
    res.status(500).json({ error: "Failed to fetch billing statistics" });
  }
});

export const billingRouter = router;
