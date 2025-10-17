import { Router } from 'express';
import { db } from './storage';
import { 
  toolPricing, 
  toolPurchases, 
  creatorEarnings, 
  featuredTools,
  fxns,
  users 
} from '../shared/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import { z } from 'zod';
import { stripe } from './stripe-client';
import { appCache, cacheMiddleware } from './cache-service';

export const marketplaceRouter = Router();

const toolPricingSchema = z.object({
  pricingModel: z.enum(['free', 'one_time']), // Subscriptions not yet supported - requires invoice.payment_succeeded webhook handling
  price: z.number().int().min(0).optional(),
  licenseType: z.enum(['personal', 'team', 'enterprise']).default('personal'),
  accessTier: z.enum(['free', 'pro']).optional().default('free'),
});

const purchaseSchema = z.object({
  fxnId: z.string().uuid(),
  licenseType: z.enum(['personal', 'team', 'enterprise']),
});

marketplaceRouter.get('/featured', 
  cacheMiddleware(appCache, () => 'marketplace:featured', 15 * 60 * 1000), // 15 min cache
  async (req, res) => {
  try {
    const featured = await db
      .select({
        fxn: fxns,
        pricing: toolPricing,
        creator: {
          id: users.id,
          name: users.name,
        },
      })
      .from(featuredTools)
      .innerJoin(fxns, eq(featuredTools.fxnId, fxns.id))
      .leftJoin(toolPricing, eq(fxns.id, toolPricing.fxnId))
      .leftJoin(users, eq(fxns.createdBy, users.id))
      .where(
        and(
          eq(fxns.moderationStatus, 'approved'),
          sql`${featuredTools.expiresAt} IS NULL OR ${featuredTools.expiresAt} > NOW()`
        )
      )
      .orderBy(featuredTools.position)
      .limit(3);

    res.json({ tools: featured });
  } catch (error) {
    console.error('Get featured tools error:', error);
    res.status(500).json({ message: 'Failed to get featured tools' });
  }
});

marketplaceRouter.get('/bestsellers', 
  cacheMiddleware(appCache, () => 'marketplace:bestsellers', 10 * 60 * 1000), // 10 min cache
  async (req, res) => {
  try {
    const bestsellers = await db
      .select({
        fxn: fxns,
        pricing: toolPricing,
        creator: {
          id: users.id,
          name: users.name,
        },
        salesCount: sql<number>`COUNT(${toolPurchases.id})`.as('sales_count'),
      })
      .from(fxns)
      .innerJoin(toolPricing, eq(fxns.id, toolPricing.fxnId))
      .innerJoin(toolPurchases, eq(fxns.id, toolPurchases.fxnId))
      .leftJoin(users, eq(fxns.createdBy, users.id))
      .where(
        and(
          eq(fxns.moderationStatus, 'approved'),
          sql`${toolPricing.pricingModel} != 'free'`
        )
      )
      .groupBy(fxns.id, toolPricing.id, users.id)
      .orderBy(desc(sql`sales_count`))
      .limit(12);

    res.json({ tools: bestsellers });
  } catch (error) {
    console.error('Get bestsellers error:', error);
    res.status(500).json({ message: 'Failed to get bestsellers' });
  }
});

marketplaceRouter.get('/pricing/:fxnId', async (req, res) => {
  try {
    const { fxnId } = req.params;

    const pricing = await db.query.toolPricing.findFirst({
      where: eq(toolPricing.fxnId, fxnId),
    });

    if (!pricing) {
      return res.json({ pricingModel: 'free' });
    }

    res.json(pricing);
  } catch (error) {
    console.error('Get tool pricing error:', error);
    res.status(500).json({ message: 'Failed to get tool pricing' });
  }
});

marketplaceRouter.post('/pricing/:fxnId', async (req, res) => {
  const userId = (req.user as any)?.id;
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const { fxnId } = req.params;
    const data = toolPricingSchema.parse(req.body);

    const fxn = await db.query.fxns.findFirst({
      where: eq(fxns.id, fxnId),
    });

    if (!fxn || fxn.createdBy !== userId) {
      return res.status(403).json({ message: 'Only tool creator can set pricing' });
    }

    if (data.accessTier === 'pro') {
      const { proService } = await import('./pro-service');
      const hasPro = await proService.hasProSubscription(userId);
      
      if (!hasPro) {
        return res.status(403).json({ 
          message: 'Pro subscription required to create Pro tier tools',
          upgradeRequired: true,
          upgradeUrl: '/pricing'
        });
      }
    }

    if (data.pricingModel !== 'free' && !data.price) {
      return res.status(400).json({ message: 'Price required for paid tools' });
    }

    if (data.accessTier === 'pro' && data.pricingModel !== 'free') {
      return res.status(400).json({ message: 'Pro tier tools cannot have paid pricing' });
    }

    let stripeProductId, stripePriceId;
    
    if (data.pricingModel !== 'free') {
      const product = await stripe.products.create({
        name: fxn.title,
        description: fxn.description,
        metadata: { fxnId },
      });
      stripeProductId = product.id;

      const price = await stripe.prices.create({
        product: stripeProductId,
        unit_amount: data.price!,
        currency: 'usd',
        // Note: Subscriptions not yet supported, only one_time payments
      });
      stripePriceId = price.id;
    }

    const existing = await db.query.toolPricing.findFirst({
      where: eq(toolPricing.fxnId, fxnId),
    });

    let pricing;
    if (existing) {
      [pricing] = await db.update(toolPricing)
        .set({ 
          ...data, 
          stripeProductId, 
          stripePriceId,
          updatedAt: new Date() 
        })
        .where(eq(toolPricing.fxnId, fxnId))
        .returning();
    } else {
      [pricing] = await db.insert(toolPricing)
        .values({ 
          fxnId, 
          ...data, 
          stripeProductId, 
          stripePriceId 
        })
        .returning();
    }

    await db.update(fxns)
      .set({ accessTier: data.accessTier || 'free' })
      .where(eq(fxns.id, fxnId));

    // Invalidate bestsellers cache when pricing changes (free ↔ paid affects inclusion)
    appCache.invalidateBestsellers();

    res.json(pricing);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid pricing data', errors: error.errors });
    }
    console.error('Set tool pricing error:', error);
    res.status(500).json({ message: 'Failed to set tool pricing' });
  }
});

marketplaceRouter.post('/purchase', async (req, res) => {
  const userId = (req.user as any)?.id;
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const data = purchaseSchema.parse(req.body);

    const existing = await db.query.toolPurchases.findFirst({
      where: and(
        eq(toolPurchases.buyerId, userId),
        eq(toolPurchases.fxnId, data.fxnId),
        sql`${toolPurchases.expiresAt} IS NULL OR ${toolPurchases.expiresAt} > NOW()`
      ),
    });

    if (existing) {
      return res.status(400).json({ message: 'You already own this tool' });
    }

    const pricing = await db.query.toolPricing.findFirst({
      where: eq(toolPricing.fxnId, data.fxnId),
    });

    if (!pricing || pricing.pricingModel === 'free') {
      return res.status(400).json({ message: 'This tool is free' });
    }

    const fxn = await db.query.fxns.findFirst({
      where: eq(fxns.id, data.fxnId),
      with: { creator: true },
    });

    if (!fxn) {
      return res.status(404).json({ message: 'Tool not found' });
    }

    const amount = pricing.price!;

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      metadata: {
        fxnId: data.fxnId,
        buyerId: userId,
        sellerId: fxn.createdBy!,
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
    console.error('Purchase tool error:', error);
    res.status(500).json({ message: 'Failed to process purchase' });
  }
});

marketplaceRouter.get('/my-purchases', async (req, res) => {
  const userId = (req.user as any)?.id;
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const purchases = await db
      .select({
        purchase: toolPurchases,
        fxn: fxns,
        seller: {
          id: users.id,
          name: users.name,
        },
      })
      .from(toolPurchases)
      .innerJoin(fxns, eq(toolPurchases.fxnId, fxns.id))
      .leftJoin(users, eq(toolPurchases.sellerId, users.id))
      .where(eq(toolPurchases.buyerId, userId))
      .orderBy(desc(toolPurchases.createdAt));

    res.json({ purchases });
  } catch (error) {
    console.error('Get my purchases error:', error);
    res.status(500).json({ message: 'Failed to get purchases' });
  }
});

marketplaceRouter.get('/my-earnings', async (req, res) => {
  const userId = (req.user as any)?.id;
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    let earnings = await db.query.creatorEarnings.findFirst({
      where: eq(creatorEarnings.userId, userId),
    });

    if (!earnings) {
      earnings = {
        id: '',
        userId,
        totalEarnings: 0,
        pendingEarnings: 0,
        lifetimeSales: 0,
        stripeAccountId: null,
        lastPayoutAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    const sales = await db
      .select({
        purchase: toolPurchases,
        fxn: fxns,
        buyer: {
          id: users.id,
          name: users.name,
        },
      })
      .from(toolPurchases)
      .innerJoin(fxns, eq(toolPurchases.fxnId, fxns.id))
      .leftJoin(users, eq(toolPurchases.buyerId, users.id))
      .where(eq(toolPurchases.sellerId, userId))
      .orderBy(desc(toolPurchases.createdAt))
      .limit(50);

    res.json({ earnings, sales });
  } catch (error) {
    console.error('Get earnings error:', error);
    res.status(500).json({ message: 'Failed to get earnings' });
  }
});

marketplaceRouter.get('/check-access/:fxnId', async (req, res) => {
  const userId = (req.user as any)?.id;
  const { fxnId } = req.params;

  try {
    const pricing = await db.query.toolPricing.findFirst({
      where: eq(toolPricing.fxnId, fxnId),
    });

    if (!pricing || pricing.pricingModel === 'free') {
      return res.json({ hasAccess: true, reason: 'free' });
    }

    if (!userId) {
      return res.json({ hasAccess: false, reason: 'not_authenticated' });
    }

    const fxn = await db.query.fxns.findFirst({
      where: eq(fxns.id, fxnId),
    });

    if (fxn?.createdBy === userId) {
      return res.json({ hasAccess: true, reason: 'owner' });
    }

    const purchase = await db.query.toolPurchases.findFirst({
      where: and(
        eq(toolPurchases.buyerId, userId),
        eq(toolPurchases.fxnId, fxnId),
        sql`${toolPurchases.expiresAt} IS NULL OR ${toolPurchases.expiresAt} > NOW()`
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
