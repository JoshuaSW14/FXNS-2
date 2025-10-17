import { Router } from 'express';
import { db } from './storage';
import { 
  workflowPricing, 
  workflowPurchases, 
  workflowCreatorEarnings, 
  featuredWorkflows,
  workflows,
  users 
} from '../shared/schema';
import { eq, desc, asc, and, or, sql, ilike } from 'drizzle-orm';
import { z } from 'zod';
import { stripe } from './stripe-client';
import { appCache, cacheMiddleware } from './cache-service';
import { requireAuth } from './middleware/admin-auth';

export const workflowMarketplaceRouter = Router();

const workflowPricingSchema = z.object({
  pricingModel: z.enum(['free', 'one_time']),
  price: z.number().int().min(0).optional(),
  licenseType: z.enum(['personal', 'team', 'enterprise']).default('personal'),
});

const purchaseSchema = z.object({
  workflowId: z.string().uuid(),
  licenseType: z.enum(['personal', 'team', 'enterprise']),
});

workflowMarketplaceRouter.get('/featured', 
  cacheMiddleware(appCache, () => 'workflow-marketplace:featured', 15 * 60 * 1000),
  async (req, res) => {
  try {
    const featured = await db
      .select({
        workflow: workflows,
        pricing: workflowPricing,
        creator: {
          id: users.id,
          name: users.name,
        },
      })
      .from(featuredWorkflows)
      .innerJoin(workflows, eq(featuredWorkflows.workflowId, workflows.id))
      .leftJoin(workflowPricing, eq(workflows.id, workflowPricing.workflowId))
      .leftJoin(users, eq(workflows.userId, users.id))
      .where(
        and(
          eq(workflows.isActive, true),
          sql`${featuredWorkflows.expiresAt} IS NULL OR ${featuredWorkflows.expiresAt} > NOW()`
        )
      )
      .orderBy(featuredWorkflows.position)
      .limit(6);

    res.json({ workflows: featured });
  } catch (error) {
    console.error('Get featured workflows error:', error);
    res.status(500).json({ message: 'Failed to get featured workflows' });
  }
});

workflowMarketplaceRouter.get('/bestsellers', 
  cacheMiddleware(appCache, () => 'workflow-marketplace:bestsellers', 10 * 60 * 1000),
  async (req, res) => {
  try {
    const bestsellers = await db
      .select({
        workflow: workflows,
        pricing: workflowPricing,
        creator: {
          id: users.id,
          name: users.name,
        },
        salesCount: sql<number>`COUNT(${workflowPurchases.id})`.as('sales_count'),
      })
      .from(workflows)
      .innerJoin(workflowPricing, eq(workflows.id, workflowPricing.workflowId))
      .innerJoin(workflowPurchases, eq(workflows.id, workflowPurchases.workflowId))
      .leftJoin(users, eq(workflows.userId, users.id))
      .where(
        and(
          eq(workflows.isActive, true),
          sql`${workflowPricing.pricingModel} != 'free'`
        )
      )
      .groupBy(workflows.id, workflowPricing.id, users.id)
      .orderBy(desc(sql`sales_count`))
      .limit(10);

    res.json({ workflows: bestsellers });
  } catch (error) {
    console.error('Get bestsellers error:', error);
    res.status(500).json({ message: 'Failed to get bestsellers' });
  }
});

workflowMarketplaceRouter.get('/browse', async (req, res) => {
  try {
    const search = req.query.search as string | undefined;
    const category = req.query.category as string | undefined;
    const sort = (req.query.sort as string) || 'popular';
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const whereConditions = [eq(workflows.isActive, true)];
    
    if (search) {
      whereConditions.push(
        or(
          ilike(workflows.name, `%${search}%`),
          ilike(workflows.description, `%${search}%`)
        )!
      );
    }
    
    if (category) {
      whereConditions.push(eq(workflows.category, category));
    }

    const whereClause = and(...whereConditions);

    const [totalResult] = await db
      .select({ count: sql<number>`COUNT(DISTINCT ${workflows.id})` })
      .from(workflows)
      .where(whereClause);

    const total = Number(totalResult?.count) || 0;

    let query = db
      .select({
        workflow: workflows,
        pricing: workflowPricing,
        creator: {
          id: users.id,
          name: users.name,
        },
        salesCount: sql<number>`COUNT(${workflowPurchases.id})`.as('sales_count'),
      })
      .from(workflows)
      .leftJoin(workflowPricing, eq(workflows.id, workflowPricing.workflowId))
      .leftJoin(users, eq(workflows.userId, users.id))
      .leftJoin(workflowPurchases, eq(workflows.id, workflowPurchases.workflowId))
      .where(whereClause)
      .groupBy(workflows.id, workflowPricing.id, users.id)
      .$dynamic();

    switch (sort) {
      case 'newest':
        query = query.orderBy(desc(workflows.createdAt));
        break;
      case 'price_low':
        query = query.orderBy(asc(workflowPricing.price));
        break;
      case 'price_high':
        query = query.orderBy(desc(workflowPricing.price));
        break;
      case 'popular':
      default:
        query = query.orderBy(desc(sql`sales_count`));
    }

    const result = await query.limit(limit).offset(offset);
    
    res.json({ workflows: result, total });
  } catch (error) {
    console.error('Browse workflows error:', error);
    res.status(500).json({ message: 'Failed to browse workflows' });
  }
});

workflowMarketplaceRouter.get('/pricing/:workflowId', async (req, res) => {
  try {
    const { workflowId } = req.params;

    const workflow = await db.query.workflows.findFirst({
      where: eq(workflows.id, workflowId),
    });

    if (!workflow || !workflow.isPublic) {
      return res.status(404).json({ message: 'Workflow not found' });
    }

    const pricing = await db.query.workflowPricing.findFirst({
      where: eq(workflowPricing.workflowId, workflowId),
    });

    if (!pricing) {
      return res.json({ pricingModel: 'free' });
    }

    res.json(pricing);
  } catch (error) {
    console.error('Get workflow pricing error:', error);
    res.status(500).json({ message: 'Failed to get workflow pricing' });
  }
});

workflowMarketplaceRouter.post('/pricing/:workflowId', requireAuth, async (req, res) => {
  const userId = (req.user as any)?.id;
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const { workflowId } = req.params;
    const data = workflowPricingSchema.parse(req.body);

    const workflow = await db.query.workflows.findFirst({
      where: eq(workflows.id, workflowId),
    });

    if (!workflow || workflow.userId !== userId) {
      return res.status(403).json({ message: 'Only workflow creator can set pricing' });
    }

    if (data.pricingModel !== 'free' && !data.price) {
      return res.status(400).json({ message: 'Price required for paid workflows' });
    }

    let stripeProductId, stripePriceId;
    
    if (data.pricingModel !== 'free') {
      const product = await stripe.products.create({
        name: workflow.name,
        description: workflow.description || undefined,
        metadata: { workflowId },
      });
      stripeProductId = product.id;

      const price = await stripe.prices.create({
        product: stripeProductId,
        unit_amount: data.price!,
        currency: 'usd',
      });
      stripePriceId = price.id;
    }

    const existing = await db.query.workflowPricing.findFirst({
      where: eq(workflowPricing.workflowId, workflowId),
    });

    let pricing;
    if (existing) {
      [pricing] = await db.update(workflowPricing)
        .set({ 
          ...data, 
          stripeProductId, 
          stripePriceId,
          updatedAt: new Date() 
        })
        .where(eq(workflowPricing.workflowId, workflowId))
        .returning();
    } else {
      [pricing] = await db.insert(workflowPricing)
        .values({ 
          workflowId, 
          ...data, 
          stripeProductId, 
          stripePriceId 
        })
        .returning();
    }

    appCache.delete('workflow-marketplace:bestsellers');

    res.json(pricing);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid pricing data', errors: error.errors });
    }
    console.error('Set workflow pricing error:', error);
    res.status(500).json({ message: 'Failed to set workflow pricing' });
  }
});

workflowMarketplaceRouter.post('/purchase', requireAuth, async (req, res) => {
  const userId = (req.user as any)?.id;
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const data = purchaseSchema.parse(req.body);

    const existing = await db.query.workflowPurchases.findFirst({
      where: and(
        eq(workflowPurchases.buyerId, userId),
        eq(workflowPurchases.workflowId, data.workflowId),
        sql`${workflowPurchases.expiresAt} IS NULL OR ${workflowPurchases.expiresAt} > NOW()`
      ),
    });

    if (existing) {
      return res.status(400).json({ message: 'You already own this workflow' });
    }

    const pricing = await db.query.workflowPricing.findFirst({
      where: eq(workflowPricing.workflowId, data.workflowId),
    });

    if (!pricing || pricing.pricingModel === 'free') {
      return res.status(400).json({ message: 'This workflow is free' });
    }

    const workflow = await db.query.workflows.findFirst({
      where: eq(workflows.id, data.workflowId),
      with: { user: true },
    });

    if (!workflow) {
      return res.status(404).json({ message: 'Workflow not found' });
    }

    const amount = pricing.price!;

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      metadata: {
        workflowId: data.workflowId,
        buyerId: userId,
        sellerId: workflow.userId!,
        licenseType: data.licenseType,
      },
      automatic_payment_methods: { enabled: true },
    });

    res.json({ 
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid purchase data', errors: error.errors });
    }
    console.error('Purchase workflow error:', error);
    res.status(500).json({ message: 'Failed to process purchase' });
  }
});

workflowMarketplaceRouter.get('/my-purchases', requireAuth, async (req, res) => {
  const userId = (req.user as any)?.id;
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const purchases = await db
      .select({
        purchase: workflowPurchases,
        workflow: workflows,
        seller: {
          id: users.id,
          name: users.name,
        },
      })
      .from(workflowPurchases)
      .innerJoin(workflows, eq(workflowPurchases.workflowId, workflows.id))
      .leftJoin(users, eq(workflowPurchases.sellerId, users.id))
      .where(eq(workflowPurchases.buyerId, userId))
      .orderBy(desc(workflowPurchases.createdAt));

    res.json({ purchases });
  } catch (error) {
    console.error('Get my purchases error:', error);
    res.status(500).json({ message: 'Failed to get purchases' });
  }
});

workflowMarketplaceRouter.get('/my-earnings', requireAuth, async (req, res) => {
  const userId = (req.user as any)?.id;
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    let earnings = await db.query.workflowCreatorEarnings.findFirst({
      where: eq(workflowCreatorEarnings.userId, userId),
    });

    if (!earnings) {
      earnings = {
        id: '',
        userId,
        totalEarnings: 0,
        pendingEarnings: 0,
        lifetimeSales: 0,
        lastPayoutAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    const sales = await db
      .select({
        purchase: workflowPurchases,
        workflow: workflows,
        buyer: {
          id: users.id,
          name: users.name,
        },
      })
      .from(workflowPurchases)
      .innerJoin(workflows, eq(workflowPurchases.workflowId, workflows.id))
      .leftJoin(users, eq(workflowPurchases.buyerId, users.id))
      .where(eq(workflowPurchases.sellerId, userId))
      .orderBy(desc(workflowPurchases.createdAt))
      .limit(50);

    res.json({ earnings, sales });
  } catch (error) {
    console.error('Get earnings error:', error);
    res.status(500).json({ message: 'Failed to get earnings' });
  }
});

workflowMarketplaceRouter.get('/check-access/:workflowId', requireAuth, async (req, res) => {
  const userId = (req.user as any)?.id;
  const { workflowId } = req.params;

  try {
    const pricing = await db.query.workflowPricing.findFirst({
      where: eq(workflowPricing.workflowId, workflowId),
    });

    if (!pricing || pricing.pricingModel === 'free') {
      return res.json({ hasAccess: true, reason: 'free' });
    }

    if (!userId) {
      return res.json({ hasAccess: false, reason: 'not_authenticated' });
    }

    const workflow = await db.query.workflows.findFirst({
      where: eq(workflows.id, workflowId),
    });

    if (workflow?.userId === userId) {
      return res.json({ hasAccess: true, reason: 'owned' });
    }

    const purchase = await db.query.workflowPurchases.findFirst({
      where: and(
        eq(workflowPurchases.buyerId, userId),
        eq(workflowPurchases.workflowId, workflowId),
        sql`${workflowPurchases.expiresAt} IS NULL OR ${workflowPurchases.expiresAt} > NOW()`
      ),
    });

    if (purchase) {
      return res.json({ hasAccess: true, reason: 'purchased' });
    }

    res.json({ hasAccess: false, reason: 'not_purchased', pricing });
  } catch (error) {
    console.error('Check access error:', error);
    res.status(500).json({ message: 'Failed to check access' });
  }
});
