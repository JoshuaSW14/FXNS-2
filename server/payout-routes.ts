import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { db } from './db';
import { payouts, creatorEarnings, users } from '../shared/schema';
import { eq, desc, and } from 'drizzle-orm';
import { z } from 'zod';
import { stripe } from './stripe-client';

export const payoutRouter = Router();

const MINIMUM_PAYOUT_CENTS = 5000; // $50 minimum

const payoutRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 requests per hour per user
  message: 'Too many payout requests. Please try again in an hour.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const userId = (req.user as any)?.id;
    return userId || 'anonymous';
  },
  skip: (req) => {
    return !(req.user as any)?.id;
  },
  handler: (req, res) => {
    res.status(429).json({
      message: 'Too many payout requests. Please try again in an hour.',
      retryAfter: '1 hour',
    });
  },
});

const requestPayoutSchema = z.object({
  amount: z.number().int().min(MINIMUM_PAYOUT_CENTS),
});

// GET /api/payouts/connect-status - Check if user has connected Stripe account
payoutRouter.get('/connect-status', async (req, res) => {
  const userId = (req.user as any)?.id;
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const earnings = await db.query.creatorEarnings.findFirst({
      where: eq(creatorEarnings.userId, userId),
    });

    const hasConnectedAccount = !!earnings?.stripeAccountId;
    let accountStatus = null;

    if (hasConnectedAccount && earnings.stripeAccountId) {
      try {
        const account = await stripe.accounts.retrieve(earnings.stripeAccountId);
        accountStatus = {
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
          detailsSubmitted: account.details_submitted,
        };
      } catch (error) {
        console.error('Error retrieving Stripe account:', error);
      }
    }

    res.json({
      connected: hasConnectedAccount,
      stripeAccountId: earnings?.stripeAccountId || null,
      accountStatus,
      pendingEarnings: earnings?.pendingEarnings || 0,
      totalEarnings: earnings?.totalEarnings || 0,
    });
  } catch (error) {
    console.error('Connect status error:', error);
    res.status(500).json({ message: 'Failed to get connect status' });
  }
});

// POST /api/payouts/connect-account - Initiate Stripe Connect OAuth
payoutRouter.post('/connect-account', async (req, res) => {
  const userId = (req.user as any)?.id;
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let earnings = await db.query.creatorEarnings.findFirst({
      where: eq(creatorEarnings.userId, userId),
    });

    let stripeAccountId = earnings?.stripeAccountId;

    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: user.email,
        capabilities: {
          transfers: { requested: true },
        },
        metadata: {
          userId: userId,
        },
      });

      stripeAccountId = account.id;

      if (earnings) {
        await db.update(creatorEarnings)
          .set({ 
            stripeAccountId,
            updatedAt: new Date(),
          })
          .where(eq(creatorEarnings.userId, userId));
      } else {
        await db.insert(creatorEarnings).values({
          userId,
          stripeAccountId,
          totalEarnings: 0,
          pendingEarnings: 0,
          lifetimeSales: 0,
        });
      }
    }

    const baseUrl = `${process.env.FRONTEND_URL || 'http://localhost:5000'}`;

    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${baseUrl}/earnings?connect=refresh`,
      return_url: `${baseUrl}/earnings?connect=success`,
      type: 'account_onboarding',
    });

    res.json({ 
      url: accountLink.url,
      stripeAccountId,
    });
  } catch (error) {
    console.error('Connect account error:', error);
    res.status(500).json({ 
      message: 'Failed to create connect account',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/payouts/connect-callback - Handle OAuth callback
payoutRouter.get('/connect-callback', async (req, res) => {
  const userId = (req.user as any)?.id;
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const earnings = await db.query.creatorEarnings.findFirst({
      where: eq(creatorEarnings.userId, userId),
    });

    if (!earnings?.stripeAccountId) {
      return res.status(400).json({ message: 'No Stripe account found' });
    }

    const account = await stripe.accounts.retrieve(earnings.stripeAccountId);

    res.json({
      connected: true,
      accountStatus: {
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
      },
    });
  } catch (error) {
    console.error('Connect callback error:', error);
    res.status(500).json({ message: 'Failed to verify account connection' });
  }
});

// POST /api/payouts/request-payout - Request a payout with transaction safety and idempotency
// TODO: Implement webhook handler for transfer.succeeded/failed events for truly async processing
payoutRouter.post('/request-payout', payoutRateLimiter, async (req, res) => {
  const userId = (req.user as any)?.id;
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  console.log(`[Payout] Request initiated by user ${userId}`);

  try {
    const data = requestPayoutSchema.parse(req.body);
    console.log(`[Payout] User ${userId} requesting payout of ${data.amount} cents`);

    const result = await db.transaction(async (tx) => {
      const [lockedEarnings] = await tx
        .select()
        .from(creatorEarnings)
        .where(eq(creatorEarnings.userId, userId))
        .for('update');

      if (!lockedEarnings) {
        throw new Error('No earnings account found');
      }

      if (!lockedEarnings.stripeAccountId) {
        throw new Error('STRIPE_NOT_CONNECTED');
      }

      if (lockedEarnings.pendingEarnings < MINIMUM_PAYOUT_CENTS) {
        throw new Error(`MINIMUM_NOT_MET:${lockedEarnings.pendingEarnings}:${MINIMUM_PAYOUT_CENTS}`);
      }

      if (data.amount > lockedEarnings.pendingEarnings) {
        throw new Error(`INSUFFICIENT_BALANCE:${lockedEarnings.pendingEarnings}:${data.amount}`);
      }

      const account = await stripe.accounts.retrieve(lockedEarnings.stripeAccountId);
      
      if (!account.payouts_enabled) {
        throw new Error('PAYOUTS_NOT_ENABLED');
      }

      const [pendingPayout] = await tx.insert(payouts).values({
        userId,
        amount: data.amount,
        status: 'pending',
        stripeTransferId: null,
        stripeAccountId: lockedEarnings.stripeAccountId,
        failureReason: null,
        completedAt: null,
      }).returning();

      console.log(`[Payout] Created pending payout record ${pendingPayout.id} for user ${userId}`);

      let transferId: string | null = null;
      let payoutStatus: 'pending' | 'completed' | 'failed' = 'pending';
      let failureReason: string | null = null;
      let newPendingEarnings = lockedEarnings.pendingEarnings;

      try {
        const transfer = await stripe.transfers.create({
          amount: data.amount,
          currency: 'usd',
          destination: lockedEarnings.stripeAccountId,
          metadata: {
            userId: userId,
            payoutId: pendingPayout.id,
            type: 'creator_payout',
          },
        }, {
          idempotencyKey: `payout_${pendingPayout.id}`,
        });

        transferId = transfer.id;
        payoutStatus = 'completed';
        newPendingEarnings = lockedEarnings.pendingEarnings - data.amount;

        console.log(`[Payout] Stripe transfer successful: ${transferId} for payout ${pendingPayout.id}`);

        await tx.update(creatorEarnings)
          .set({
            pendingEarnings: newPendingEarnings,
            lastPayoutAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(creatorEarnings.userId, userId));

        console.log(`[Payout] Updated earnings for user ${userId}. New balance: ${newPendingEarnings} cents`);
      } catch (stripeError: any) {
        console.error(`[Payout] Stripe transfer error for payout ${pendingPayout.id}:`, stripeError);
        payoutStatus = 'failed';
        failureReason = stripeError.message || 'Transfer failed';
      }

      const [updatedPayout] = await tx.update(payouts)
        .set({
          status: payoutStatus,
          stripeTransferId: transferId,
          failureReason,
          completedAt: payoutStatus === 'completed' ? new Date() : null,
        })
        .where(eq(payouts.id, pendingPayout.id))
        .returning();

      return {
        payout: updatedPayout,
        remainingBalance: newPendingEarnings,
        status: payoutStatus,
        failureReason,
      };
    });

    if (result.status === 'failed') {
      console.log(`[Payout] Failed for user ${userId}: ${result.failureReason}`);
      return res.status(500).json({ 
        message: 'Payout failed. Your balance has not been affected.',
        failureReason: result.failureReason,
        payout: result.payout,
      });
    }

    console.log(`[Payout] Successful for user ${userId}. Remaining balance: ${result.remainingBalance} cents`);
    
    res.json({ 
      message: 'Payout completed successfully',
      payout: result.payout,
      remainingBalance: result.remainingBalance,
    });
  } catch (error) {
    console.error(`[Payout] Error processing payout for user ${userId}:`, error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: 'Invalid payout amount',
        errors: error.errors,
      });
    }

    if (error instanceof Error) {
      if (error.message === 'STRIPE_NOT_CONNECTED') {
        return res.status(400).json({ 
          message: 'Please connect your Stripe account first to receive payouts',
        });
      }

      if (error.message.startsWith('MINIMUM_NOT_MET:')) {
        const [, pending, minimum] = error.message.split(':');
        return res.status(400).json({ 
          message: `Minimum payout is $${parseInt(minimum) / 100}`,
          pendingEarnings: parseInt(pending),
          minimumPayout: parseInt(minimum),
        });
      }

      if (error.message.startsWith('INSUFFICIENT_BALANCE:')) {
        const [, pending, requested] = error.message.split(':');
        return res.status(400).json({ 
          message: 'Insufficient balance for this payout amount',
          pendingEarnings: parseInt(pending),
          requestedAmount: parseInt(requested),
        });
      }

      if (error.message === 'PAYOUTS_NOT_ENABLED') {
        return res.status(400).json({ 
          message: 'Your Stripe account is not yet enabled for payouts. Please complete account setup.',
        });
      }

      if (error.message === 'No earnings account found') {
        return res.status(404).json({ message: 'No earnings account found' });
      }
    }

    res.status(500).json({ 
      message: 'Failed to process payout request. Please try again later.',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/payouts/history - Get payout history
payoutRouter.get('/history', async (req, res) => {
  const userId = (req.user as any)?.id;
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const payoutHistory = await db.query.payouts.findMany({
      where: eq(payouts.userId, userId),
      orderBy: [desc(payouts.createdAt)],
      limit,
      offset,
    });

    const earnings = await db.query.creatorEarnings.findFirst({
      where: eq(creatorEarnings.userId, userId),
    });

    res.json({
      payouts: payoutHistory,
      earnings: earnings || {
        totalEarnings: 0,
        pendingEarnings: 0,
        lifetimeSales: 0,
        lastPayoutAt: null,
      },
      pagination: {
        limit,
        offset,
        total: payoutHistory.length,
      },
    });
  } catch (error) {
    console.error('Get payout history error:', error);
    res.status(500).json({ message: 'Failed to get payout history' });
  }
});
