import { Request, Response, NextFunction } from 'express';
import { db } from './db';
import { fxns, toolPricing, toolPurchases } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { proService } from './pro-service';

export interface ToolAccessRequest extends Request {
  toolAccess?: {
    tool: any;
    hasPro: boolean;
    isPaid: boolean;
    hasPurchased: boolean;
    pricing?: any;
  };
}

export async function ensureToolAccess(
  req: ToolAccessRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const fxnId = req.params.id || req.params.fxnId;

    if (!fxnId) {
      return res.status(400).json({
        error: {
          code: 'MISSING_FXN_ID',
          message: 'Tool ID is required'
        }
      });
    }

    const [tool] = await db
      .select()
      .from(fxns)
      .where(eq(fxns.id, fxnId))
      .limit(1);

    if (!tool) {
      return res.status(404).json({
        error: {
          code: 'TOOL_NOT_FOUND',
          message: 'Tool not found'
        }
      });
    }

    const userId = req.user?.id;

    if (tool.createdBy === userId) {
      req.toolAccess = {
        tool,
        hasPro: true,
        isPaid: false,
        hasPurchased: true
      };
      return next();
    }

    const hasPro = userId ? await proService.hasProSubscription(userId) : false;

    const [pricing] = await db
      .select()
      .from(toolPricing)
      .where(eq(toolPricing.fxnId, fxnId))
      .limit(1);

    const isPaid = pricing && (pricing.price ?? 0) > 0;

    if (tool.accessTier === 'pro' && !hasPro) {
      return res.status(403).json({
        error: {
          code: 'PRO_REQUIRED',
          message: 'This tool requires a Pro subscription',
          upgradeRequired: true,
          upgradeUrl: '/pricing'
        }
      });
    }

    let hasPurchased = false;
    if (isPaid && userId && pricing) {
      const [purchase] = await db
        .select()
        .from(toolPurchases)
        .where(
          and(
            eq(toolPurchases.fxnId, fxnId),
            eq(toolPurchases.buyerId, userId)
          )
        )
        .limit(1);

      hasPurchased = !!purchase;

      if (!hasPurchased) {
        return res.status(403).json({
          error: {
            code: 'PURCHASE_REQUIRED',
            message: 'You need to purchase this tool to use it',
            pricing: {
              price: pricing.price ?? 0,
              stripePriceId: pricing.stripePriceId
            }
          }
        });
      }
    }

    req.toolAccess = {
      tool,
      hasPro,
      isPaid,
      hasPurchased,
      pricing: isPaid ? pricing : undefined
    };

    next();
  } catch (error) {
    console.error('Error checking tool access:', error);
    return res.status(500).json({
      error: {
        code: 'ACCESS_CHECK_FAILED',
        message: 'Failed to verify tool access'
      }
    });
  }
}
