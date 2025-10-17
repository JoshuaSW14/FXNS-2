import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { db } from '../db';
import { 
  users, 
  fxns, 
  toolPricing, 
  toolPurchases, 
  creatorEarnings, 
  stripeEvents, 
  billingHistory,
  subscriptions,
  plans
} from '../../shared/schema';
import { eq, and } from 'drizzle-orm';
import { setupAuth } from '../auth';
import cookieParser from 'cookie-parser';
import Stripe from 'stripe';
import { stripe } from '../stripe-client';

process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret_for_integration_tests';

describe('Stripe Payment Integration Tests', () => {
  let app: express.Application;
  let buyerEmail: string;
  let sellerEmail: string;
  let buyerId: string;
  let sellerId: string;
  let buyerCookie: string;
  let sellerCookie: string;
  let testFxnId: string;
  let testPricingId: string;
  let proPlanId: string;

  beforeAll(async () => {
    vi.spyOn(stripe.paymentIntents, 'retrieve').mockImplementation(async (id: string, params?: any) => {
      return {
        id,
        object: 'payment_intent',
        amount: 1000,
        amount_received: 1000,
        currency: 'usd',
        status: 'succeeded',
        latest_charge: {
          id: `ch_${id.replace('pi_', '')}`,
          object: 'charge',
          receipt_url: `https://pay.stripe.com/receipts/test_${id}`,
        },
        metadata: {},
      } as any;
    });

    vi.spyOn(stripe.customers, 'retrieve').mockImplementation(async (id: string) => {
      return {
        id,
        object: 'customer',
        email: 'test@example.com',
        name: 'Test Customer',
      } as any;
    });

    vi.spyOn(stripe.customers, 'create').mockImplementation(async (params: any) => {
      return {
        id: `cus_test_${Date.now()}`,
        object: 'customer',
        email: params.email,
        name: params.name,
        metadata: params.metadata,
      } as any;
    });

    vi.spyOn(stripe.subscriptions, 'retrieve').mockImplementation(async (id: string) => {
      return {
        id,
        object: 'subscription',
        customer: 'cus_test',
        status: 'active',
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        cancel_at_period_end: false,
        items: {
          object: 'list',
          data: [],
          has_more: false,
          url: '',
        },
      } as any;
    });

    vi.spyOn(stripe.subscriptions, 'update').mockImplementation(async (id: string, params: any) => {
      return {
        id,
        object: 'subscription',
        customer: 'cus_test',
        status: 'active',
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        cancel_at_period_end: params.cancel_at_period_end || false,
        items: {
          object: 'list',
          data: [],
          has_more: false,
          url: '',
        },
      } as any;
    });

    vi.spyOn(stripe.billingPortal.sessions, 'create').mockImplementation(async (params: any) => {
      return {
        id: 'bps_test_123',
        object: 'billing_portal.session',
        url: 'https://billing.stripe.com/session/test_123',
      } as any;
    });

    app = express();
    
    app.use('/api/marketplace/webhook', express.raw({ type: 'application/json' }));
    app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));
    
    app.use(express.json());
    app.use(cookieParser());
    setupAuth(app as any);

    const [proPlan] = await db
      .select()
      .from(plans)
      .where(eq(plans.code, 'pro'))
      .limit(1);
    
    if (proPlan) {
      proPlanId = proPlan.id;
    } else {
      const [newPlan] = await db.insert(plans).values({
        code: 'pro',
        name: 'Pro',
        features: JSON.parse(JSON.stringify(['unlimited_tools', 'advanced_analytics'])),
        price: 2000,
      }).returning();
      proPlanId = newPlan.id;
    }

    const { marketplaceRouter } = await import('../marketplace-routes');
    const { stripeWebhookRouter } = await import('../stripe-webhook');
    const { subscriptionRoutes } = await import('../subscription-routes');
    
    app.use('/api/marketplace', marketplaceRouter);
    app.use('/api/marketplace', stripeWebhookRouter);
    app.use('/api/subscriptions', subscriptionRoutes);

    app.post('/api/stripe/webhook', async (req, res) => {
      const sig = req.headers['stripe-signature'];
      if (!sig) {
        return res.status(400).send('Missing signature');
      }

      let event: Stripe.Event;
      try {
        event = stripe.webhooks.constructEvent(
          req.body,
          sig,
          process.env.STRIPE_WEBHOOK_SECRET!
        );
      } catch (err: any) {
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }

      try {
        const { stripeEvents, users, subscriptions, plans } = await import('../../shared/schema');
        const { db } = await import('../db');
        const { eq } = await import('drizzle-orm');

        const [existingEvent] = await db
          .select()
          .from(stripeEvents)
          .where(eq(stripeEvents.stripeEventId, event.id))
          .limit(1);

        if (existingEvent?.processed) {
          return res.json({ received: true });
        }

        if (!existingEvent) {
          await db.insert(stripeEvents).values({
            stripeEventId: event.id,
            eventType: event.type,
            processed: false,
          });
        }

        switch (event.type) {
          case 'customer.subscription.created':
          case 'customer.subscription.updated': {
            const subscription = event.data.object as Stripe.Subscription;
            const customerId = subscription.customer as string;
            
            const [user] = await db
              .select()
              .from(users)
              .where(eq(users.stripeCustomerId, customerId))
              .limit(1);

            if (user) {
              const [proPlan] = await db
                .select()
                .from(plans)
                .where(eq(plans.code, 'pro'))
                .limit(1);

              await db.update(users)
                .set({
                  stripeSubscriptionId: subscription.id,
                  subscriptionStatus: subscription.status,
                  subscriptionCurrentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
                })
                .where(eq(users.id, user.id));

              if (proPlan) {
                const [existingSubscription] = await db
                  .select()
                  .from(subscriptions)
                  .where(eq(subscriptions.userId, user.id))
                  .limit(1);

                if (existingSubscription) {
                  await db.update(subscriptions)
                    .set({
                      status: subscription.status,
                      currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
                    })
                    .where(eq(subscriptions.userId, user.id));
                } else {
                  await db.insert(subscriptions).values({
                    userId: user.id,
                    planId: proPlan.id,
                    status: subscription.status,
                    provider: 'stripe',
                    currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
                  });
                }
              }
            }
            break;
          }

          case 'customer.subscription.deleted': {
            const subscription = event.data.object as Stripe.Subscription;
            const customerId = subscription.customer as string;
            
            const [user] = await db
              .select()
              .from(users)
              .where(eq(users.stripeCustomerId, customerId))
              .limit(1);

            if (user) {
              await db.update(users)
                .set({
                  subscriptionStatus: 'canceled',
                })
                .where(eq(users.id, user.id));

              await db.update(subscriptions)
                .set({
                  status: 'canceled',
                })
                .where(eq(subscriptions.userId, user.id));
            }
            break;
          }
        }

        await db.update(stripeEvents)
          .set({ processed: true })
          .where(eq(stripeEvents.stripeEventId, event.id));

        res.json({ received: true });
      } catch (error) {
        console.error('Webhook processing error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
      }
    });
  });

  beforeEach(async () => {
    buyerEmail = `buyer-${Date.now()}@example.com`;
    sellerEmail = `seller-${Date.now()}@example.com`;

    const buyerResponse = await request(app)
      .post('/api/register')
      .send({
        name: 'Test Buyer',
        email: buyerEmail,
        password: 'BuyerPassword123!',
      });
    
    buyerId = buyerResponse.body.id;
    buyerCookie = buyerResponse.headers['set-cookie'][0];

    const sellerResponse = await request(app)
      .post('/api/register')
      .send({
        name: 'Test Seller',
        email: sellerEmail,
        password: 'SellerPassword123!',
      });
    
    sellerId = sellerResponse.body.id;
    sellerCookie = sellerResponse.headers['set-cookie'][0];

    const [fxn] = await db.insert(fxns).values({
      slug: `test-tool-${Date.now()}`,
      title: 'Test Tool',
      description: 'A test tool for payment testing',
      category: 'utility',
      inputSchema: {},
      outputSchema: {},
      codeKind: 'builtin',
      codeRef: 'test',
      createdBy: sellerId,
      moderationStatus: 'approved',
    }).returning();

    testFxnId = fxn.id;

    const [pricing] = await db.insert(toolPricing).values({
      fxnId: testFxnId,
      pricingModel: 'one_time',
      price: 1000,
      licenseType: 'personal',
    }).returning();

    testPricingId = pricing.id;
  });

  afterEach(async () => {
    try {
      await db.delete(toolPurchases).where(eq(toolPurchases.fxnId, testFxnId));
      await db.delete(billingHistory).where(eq(billingHistory.userId, buyerId));
      await db.delete(creatorEarnings).where(eq(creatorEarnings.userId, sellerId));
      await db.delete(stripeEvents);
      await db.delete(toolPricing).where(eq(toolPricing.fxnId, testFxnId));
      await db.delete(fxns).where(eq(fxns.id, testFxnId));
      await db.delete(subscriptions).where(eq(subscriptions.userId, buyerId));
      await db.delete(users).where(eq(users.id, buyerId));
      await db.delete(users).where(eq(users.id, sellerId));
    } catch (error) {
      console.log('Test cleanup error:', error);
    }
  });

  afterAll(async () => {
    vi.restoreAllMocks();
  });

  describe('Tool Purchases (One-time Payments)', () => {
    it('should successfully process a tool purchase with correct payment flow', async () => {
      const stripeMock = vi.spyOn(stripe.paymentIntents, 'create').mockResolvedValue({
        id: 'pi_test_123',
        client_secret: 'pi_test_123_secret_456',
        status: 'requires_payment_method',
        amount: 1000,
        currency: 'usd',
        metadata: {
          fxnId: testFxnId,
          buyerId,
          sellerId,
          licenseType: 'personal',
        },
      } as any);

      const response = await request(app)
        .post(`/api/marketplace/purchase`)
        .set('Cookie', buyerCookie)
        .send({
          fxnId: testFxnId,
          licenseType: 'personal',
        })
        .expect(200);

      expect(response.body.clientSecret).toBeDefined();
      expect(stripeMock).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 1000,
          currency: 'usd',
          metadata: expect.objectContaining({
            fxnId: testFxnId,
            buyerId,
            sellerId,
          }),
        })
      );

      stripeMock.mockRestore();
    });

    it('should create purchase record and calculate 70/30 split on payment success', async () => {
      const paymentIntent: Stripe.PaymentIntent = {
        id: 'pi_test_success_123',
        object: 'payment_intent',
        amount: 1000,
        amount_received: 1000,
        currency: 'usd',
        status: 'succeeded',
        metadata: {
          fxnId: testFxnId,
          buyerId,
          sellerId,
          licenseType: 'personal',
        },
        latest_charge: {
          id: 'ch_test_123',
          object: 'charge',
          receipt_url: 'https://pay.stripe.com/receipts/test_pi_test_success_123',
        } as any,
      } as any;

      const event: Stripe.Event = {
        id: 'evt_test_purchase_123',
        object: 'event',
        type: 'payment_intent.succeeded',
        data: {
          object: paymentIntent,
        },
        created: Math.floor(Date.now() / 1000),
        livemode: false,
        api_version: '2024-12-18.acacia',
        pending_webhooks: 0,
        request: null,
      } as any;

      const constructEventMock = vi.spyOn(stripe.webhooks, 'constructEvent').mockReturnValue(event);

      await request(app)
        .post('/api/marketplace/webhook')
        .set('stripe-signature', 'test_signature')
        .set('Content-Type', 'application/json')
        .send(Buffer.from(JSON.stringify(event)))
        .expect(200);

      const [purchase] = await db
        .select()
        .from(toolPurchases)
        .where(
          and(
            eq(toolPurchases.fxnId, testFxnId),
            eq(toolPurchases.buyerId, buyerId)
          )
        );

      expect(purchase).toBeDefined();
      expect(purchase.amount).toBe(1000);
      expect(purchase.platformFee).toBe(300);
      expect(purchase.creatorEarnings).toBe(700);
      expect(purchase.sellerId).toBe(sellerId);

      const [earnings] = await db
        .select()
        .from(creatorEarnings)
        .where(eq(creatorEarnings.userId, sellerId));

      expect(earnings).toBeDefined();
      expect(earnings.totalEarnings).toBe(700);
      expect(earnings.pendingEarnings).toBe(700);
      expect(earnings.lifetimeSales).toBe(1);

      const [billing] = await db
        .select()
        .from(billingHistory)
        .where(eq(billingHistory.userId, buyerId));

      expect(billing).toBeDefined();
      expect(billing.type).toBe('charge');
      expect(billing.status).toBe('paid');
      expect(billing.amount).toBe(1000);

      constructEventMock.mockRestore();
    });

    it('should prevent purchasing already-owned tool', async () => {
      await db.insert(toolPurchases).values({
        fxnId: testFxnId,
        buyerId,
        sellerId,
        amount: 1000,
        platformFee: 300,
        creatorEarnings: 700,
        licenseType: 'personal',
      });

      const stripeMock = vi.spyOn(stripe.paymentIntents, 'create');

      const response = await request(app)
        .post(`/api/marketplace/purchase`)
        .set('Cookie', buyerCookie)
        .send({
          fxnId: testFxnId,
          licenseType: 'personal',
        })
        .expect(400);

      expect(response.body.message).toContain('already own');
      expect(stripeMock).not.toHaveBeenCalled();

      stripeMock.mockRestore();
    });

    it('should verify payment intent has correct amount from pricing', async () => {
      await db.update(toolPricing)
        .set({ price: 2500 })
        .where(eq(toolPricing.id, testPricingId));

      const stripeMock = vi.spyOn(stripe.paymentIntents, 'create').mockResolvedValue({
        id: 'pi_test_amount',
        client_secret: 'pi_test_amount_secret',
        status: 'requires_payment_method',
        amount: 2500,
        currency: 'usd',
        metadata: {},
      } as any);

      await request(app)
        .post(`/api/marketplace/purchase`)
        .set('Cookie', buyerCookie)
        .send({
          fxnId: testFxnId,
          licenseType: 'personal',
        })
        .expect(200);

      expect(stripeMock).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 2500,
        })
      );

      stripeMock.mockRestore();
    });

    it('should update buyer access immediately after successful payment', async () => {
      const paymentIntent: Stripe.PaymentIntent = {
        id: 'pi_test_access_123',
        object: 'payment_intent',
        amount: 1000,
        amount_received: 1000,
        currency: 'usd',
        status: 'succeeded',
        metadata: {
          fxnId: testFxnId,
          buyerId,
          sellerId,
          licenseType: 'personal',
        },
        latest_charge: {
          id: 'ch_test_access',
          object: 'charge',
          receipt_url: 'https://pay.stripe.com/receipts/test_pi_test_access_123',
        } as any,
      } as any;

      const event: Stripe.Event = {
        id: 'evt_test_access_123',
        object: 'event',
        type: 'payment_intent.succeeded',
        data: {
          object: paymentIntent,
        },
        created: Math.floor(Date.now() / 1000),
        livemode: false,
        api_version: '2024-12-18.acacia',
        pending_webhooks: 0,
        request: null,
      } as any;

      const constructEventMock = vi.spyOn(stripe.webhooks, 'constructEvent').mockReturnValue(event);

      await request(app)
        .post('/api/marketplace/webhook')
        .set('stripe-signature', 'test_signature')
        .set('Content-Type', 'application/json')
        .send(Buffer.from(JSON.stringify(event)))
        .expect(200);

      const checkAccessResponse = await request(app)
        .get(`/api/marketplace/check-access/${testFxnId}`)
        .set('Cookie', buyerCookie)
        .expect(200);

      expect(checkAccessResponse.body.hasAccess).toBe(true);
      expect(checkAccessResponse.body.reason).toBe('purchased');

      constructEventMock.mockRestore();
    });
  });

  describe('Subscription Management', () => {
    it('should create Pro subscription checkout session with correct amount', async () => {
      const stripeMock = vi.spyOn(stripe.checkout.sessions, 'create').mockResolvedValue({
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/pay/cs_test_123',
        mode: 'subscription',
        customer: 'cus_test',
      } as any);

      const response = await request(app)
        .post('/api/subscriptions/upgrade')
        .set('Cookie', buyerCookie)
        .set('X-Requested-With', 'XMLHttpRequest')
        .expect(200);

      expect(response.body.checkoutUrl).toBeDefined();
      expect(stripeMock).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'subscription',
          line_items: [
            expect.objectContaining({
              price_data: expect.objectContaining({
                unit_amount: 2000,
                recurring: expect.objectContaining({
                  interval: 'month',
                }),
              }),
            }),
          ],
        })
      );

      stripeMock.mockRestore();
    });

    it('should update subscription status in database on subscription.created webhook', async () => {
      await db.update(users)
        .set({ stripeCustomerId: 'cus_test_sub_123' })
        .where(eq(users.id, buyerId));

      const subscription: Stripe.Subscription = {
        id: 'sub_test_123',
        object: 'subscription',
        customer: 'cus_test_sub_123',
        status: 'active',
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        items: {
          object: 'list',
          data: [],
          has_more: false,
          url: '',
        },
      } as any;

      const event: Stripe.Event = {
        id: 'evt_sub_created_123',
        object: 'event',
        type: 'customer.subscription.created',
        data: {
          object: subscription,
        },
        created: Math.floor(Date.now() / 1000),
        livemode: false,
        api_version: '2024-12-18.acacia',
        pending_webhooks: 0,
        request: null,
      } as any;

      const constructEventMock = vi.spyOn(stripe.webhooks, 'constructEvent').mockReturnValue(event);

      await request(app)
        .post('/api/stripe/webhook')
        .set('stripe-signature', 'test_signature')
        .set('Content-Type', 'application/json')
        .send(Buffer.from(JSON.stringify(event)))
        .expect(200);

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, buyerId));

      expect(user.stripeSubscriptionId).toBe('sub_test_123');
      expect(user.subscriptionStatus).toBe('active');
      expect(user.subscriptionCurrentPeriodEnd).toBeDefined();

      const [dbSubscription] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, buyerId));

      expect(dbSubscription).toBeDefined();
      expect(dbSubscription.status).toBe('active');
      expect(dbSubscription.planId).toBe(proPlanId);

      constructEventMock.mockRestore();
    });

    it('should handle subscription cancellation correctly', async () => {
      await db.update(users)
        .set({ 
          stripeCustomerId: 'cus_test_cancel',
          stripeSubscriptionId: 'sub_test_cancel',
          subscriptionStatus: 'active',
        })
        .where(eq(users.id, buyerId));

      await db.insert(subscriptions).values({
        userId: buyerId,
        planId: proPlanId,
        status: 'active',
        provider: 'stripe',
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      const subscription: Stripe.Subscription = {
        id: 'sub_test_cancel',
        object: 'subscription',
        customer: 'cus_test_cancel',
        status: 'canceled',
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        items: {
          object: 'list',
          data: [],
          has_more: false,
          url: '',
        },
      } as any;

      const event: Stripe.Event = {
        id: 'evt_sub_deleted_123',
        object: 'event',
        type: 'customer.subscription.deleted',
        data: {
          object: subscription,
        },
        created: Math.floor(Date.now() / 1000),
        livemode: false,
        api_version: '2024-12-18.acacia',
        pending_webhooks: 0,
        request: null,
      } as any;

      const constructEventMock = vi.spyOn(stripe.webhooks, 'constructEvent').mockReturnValue(event);

      await request(app)
        .post('/api/stripe/webhook')
        .set('stripe-signature', 'test_signature')
        .set('Content-Type', 'application/json')
        .send(Buffer.from(JSON.stringify(event)))
        .expect(200);

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, buyerId));

      expect(user.subscriptionStatus).toBe('canceled');

      const [dbSubscription] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, buyerId));

      expect(dbSubscription.status).toBe('canceled');

      constructEventMock.mockRestore();
    });

    it('should update subscription on customer.subscription.updated webhook', async () => {
      await db.update(users)
        .set({ 
          stripeCustomerId: 'cus_test_update',
          stripeSubscriptionId: 'sub_test_update',
          subscriptionStatus: 'active',
        })
        .where(eq(users.id, buyerId));

      await db.insert(subscriptions).values({
        userId: buyerId,
        planId: proPlanId,
        status: 'active',
        provider: 'stripe',
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      const subscription: Stripe.Subscription = {
        id: 'sub_test_update',
        object: 'subscription',
        customer: 'cus_test_update',
        status: 'past_due',
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        items: {
          object: 'list',
          data: [],
          has_more: false,
          url: '',
        },
      } as any;

      const event: Stripe.Event = {
        id: 'evt_sub_updated_123',
        object: 'event',
        type: 'customer.subscription.updated',
        data: {
          object: subscription,
        },
        created: Math.floor(Date.now() / 1000),
        livemode: false,
        api_version: '2024-12-18.acacia',
        pending_webhooks: 0,
        request: null,
      } as any;

      const constructEventMock = vi.spyOn(stripe.webhooks, 'constructEvent').mockReturnValue(event);

      await request(app)
        .post('/api/stripe/webhook')
        .set('stripe-signature', 'test_signature')
        .set('Content-Type', 'application/json')
        .send(Buffer.from(JSON.stringify(event)))
        .expect(200);

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, buyerId));

      expect(user.subscriptionStatus).toBe('past_due');

      constructEventMock.mockRestore();
    });

    it('should handle subscription expiration correctly', async () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      await db.update(users)
        .set({ 
          stripeCustomerId: 'cus_test_expired',
          stripeSubscriptionId: 'sub_test_expired',
          subscriptionStatus: 'active',
          subscriptionCurrentPeriodEnd: pastDate,
        })
        .where(eq(users.id, buyerId));

      await db.insert(subscriptions).values({
        userId: buyerId,
        planId: proPlanId,
        status: 'active',
        provider: 'stripe',
        currentPeriodEnd: pastDate,
      });

      const { proService } = await import('../pro-service');
      const hasPro = await proService.hasProSubscription(buyerId);

      expect(hasPro).toBe(false);
    });
  });

  describe('Payment Failures', () => {
    it('should handle payment_intent.payment_failed webhook', async () => {
      const paymentIntent: Stripe.PaymentIntent = {
        id: 'pi_test_failed_123',
        object: 'payment_intent',
        amount: 1000,
        currency: 'usd',
        status: 'requires_payment_method',
        last_payment_error: {
          type: 'card_error',
          code: 'card_declined',
          message: 'Your card was declined',
        } as any,
        metadata: {
          fxnId: testFxnId,
          buyerId,
          sellerId,
        },
      } as any;

      const event: Stripe.Event = {
        id: 'evt_payment_failed_123',
        object: 'event',
        type: 'payment_intent.payment_failed',
        data: {
          object: paymentIntent,
        },
        created: Math.floor(Date.now() / 1000),
        livemode: false,
        api_version: '2024-12-18.acacia',
        pending_webhooks: 0,
        request: null,
      } as any;

      const constructEventMock = vi.spyOn(stripe.webhooks, 'constructEvent').mockReturnValue(event);

      await request(app)
        .post('/api/marketplace/webhook')
        .set('stripe-signature', 'test_signature')
        .set('Content-Type', 'application/json')
        .send(Buffer.from(JSON.stringify(event)))
        .expect(200);

      const purchases = await db
        .select()
        .from(toolPurchases)
        .where(
          and(
            eq(toolPurchases.fxnId, testFxnId),
            eq(toolPurchases.buyerId, buyerId)
          )
        );

      expect(purchases.length).toBe(0);

      const earnings = await db
        .select()
        .from(creatorEarnings)
        .where(eq(creatorEarnings.userId, sellerId));

      expect(earnings.length === 0 || earnings[0].totalEarnings === 0).toBe(true);

      constructEventMock.mockRestore();
    });

    it('should not grant access when payment fails', async () => {
      const paymentIntent: Stripe.PaymentIntent = {
        id: 'pi_test_no_access',
        object: 'payment_intent',
        amount: 1000,
        currency: 'usd',
        status: 'requires_payment_method',
        last_payment_error: {
          type: 'card_error',
          code: 'insufficient_funds',
          message: 'Insufficient funds',
        } as any,
        metadata: {
          fxnId: testFxnId,
          buyerId,
          sellerId,
        },
      } as any;

      const event: Stripe.Event = {
        id: 'evt_no_access_123',
        object: 'event',
        type: 'payment_intent.payment_failed',
        data: {
          object: paymentIntent,
        },
        created: Math.floor(Date.now() / 1000),
        livemode: false,
        api_version: '2024-12-18.acacia',
        pending_webhooks: 0,
        request: null,
      } as any;

      const constructEventMock = vi.spyOn(stripe.webhooks, 'constructEvent').mockReturnValue(event);

      await request(app)
        .post('/api/marketplace/webhook')
        .set('stripe-signature', 'test_signature')
        .set('Content-Type', 'application/json')
        .send(Buffer.from(JSON.stringify(event)))
        .expect(200);

      const checkAccessResponse = await request(app)
        .get(`/api/marketplace/check-access/${testFxnId}`)
        .set('Cookie', buyerCookie)
        .expect(200);

      expect(checkAccessResponse.body.hasAccess).toBe(false);

      constructEventMock.mockRestore();
    });
  });

  describe('Webhook Processing', () => {
    it('should verify webhook signature and reject invalid signatures', async () => {
      const event: Stripe.Event = {
        id: 'evt_invalid_sig',
        object: 'event',
        type: 'payment_intent.succeeded',
        data: {
          object: {} as any,
        },
        created: Math.floor(Date.now() / 1000),
        livemode: false,
        api_version: '2024-12-18.acacia',
        pending_webhooks: 0,
        request: null,
      } as any;

      const constructEventMock = vi.spyOn(stripe.webhooks, 'constructEvent')
        .mockImplementation(() => {
          throw new Error('Webhook signature verification failed');
        });

      const response = await request(app)
        .post('/api/stripe/webhook')
        .set('stripe-signature', 'invalid_signature')
        .send(event)
        .expect(400);

      expect(response.text).toContain('Webhook Error');

      constructEventMock.mockRestore();
    });

    it('should implement idempotency and ignore duplicate events', async () => {
      const paymentIntent: Stripe.PaymentIntent = {
        id: 'pi_test_idempotent',
        object: 'payment_intent',
        amount: 1000,
        amount_received: 1000,
        currency: 'usd',
        status: 'succeeded',
        metadata: {
          fxnId: testFxnId,
          buyerId,
          sellerId,
          licenseType: 'personal',
        },
        latest_charge: {
          id: 'ch_test_idempotent',
          object: 'charge',
          receipt_url: 'https://pay.stripe.com/receipts/test_pi_test_idempotent',
        } as any,
      } as any;

      const event: Stripe.Event = {
        id: 'evt_idempotent_test_123',
        object: 'event',
        type: 'payment_intent.succeeded',
        data: {
          object: paymentIntent,
        },
        created: Math.floor(Date.now() / 1000),
        livemode: false,
        api_version: '2024-12-18.acacia',
        pending_webhooks: 0,
        request: null,
      } as any;

      const constructEventMock = vi.spyOn(stripe.webhooks, 'constructEvent').mockReturnValue(event);

      await request(app)
        .post('/api/marketplace/webhook')
        .set('stripe-signature', 'test_signature')
        .set('Content-Type', 'application/json')
        .send(Buffer.from(JSON.stringify(event)))
        .expect(200);

      const purchasesAfterFirst = await db
        .select()
        .from(toolPurchases)
        .where(eq(toolPurchases.fxnId, testFxnId));

      expect(purchasesAfterFirst.length).toBe(1);

      await request(app)
        .post('/api/marketplace/webhook')
        .set('stripe-signature', 'test_signature')
        .send(event)
        .expect(200);

      const purchasesAfterSecond = await db
        .select()
        .from(toolPurchases)
        .where(eq(toolPurchases.fxnId, testFxnId));

      expect(purchasesAfterSecond.length).toBe(1);

      const eventRecords = await db
        .select()
        .from(stripeEvents)
        .where(eq(stripeEvents.stripeEventId, 'evt_idempotent_test_123'));

      expect(eventRecords.length).toBe(1);
      expect(eventRecords[0].processed).toBe(true);

      constructEventMock.mockRestore();
    });

    it('should process checkout.session.completed webhook for subscriptions', async () => {
      const session: Stripe.Checkout.Session = {
        id: 'cs_test_completed',
        object: 'checkout.session',
        mode: 'subscription',
        customer: 'cus_test_checkout',
        subscription: 'sub_test_checkout',
        metadata: {
          userId: buyerId,
        },
        amount_total: 2000,
        currency: 'usd',
      } as any;

      const event: Stripe.Event = {
        id: 'evt_checkout_completed_123',
        object: 'event',
        type: 'checkout.session.completed',
        data: {
          object: session,
        },
        created: Math.floor(Date.now() / 1000),
        livemode: false,
        api_version: '2024-12-18.acacia',
        pending_webhooks: 0,
        request: null,
      } as any;

      const constructEventMock = vi.spyOn(stripe.webhooks, 'constructEvent').mockReturnValue(event);

      await request(app)
        .post('/api/marketplace/webhook')
        .set('stripe-signature', 'test_signature')
        .set('Content-Type', 'application/json')
        .send(Buffer.from(JSON.stringify(event)))
        .expect(200);

      const eventRecords = await db
        .select()
        .from(stripeEvents)
        .where(eq(stripeEvents.stripeEventId, 'evt_checkout_completed_123'));

      expect(eventRecords.length).toBe(1);
      expect(eventRecords[0].processed).toBe(true);

      constructEventMock.mockRestore();
    });

    it('should mark events as processed in stripeEvents table', async () => {
      const paymentIntent: Stripe.PaymentIntent = {
        id: 'pi_test_processed',
        object: 'payment_intent',
        amount: 1000,
        amount_received: 1000,
        currency: 'usd',
        status: 'succeeded',
        metadata: {
          fxnId: testFxnId,
          buyerId,
          sellerId,
          licenseType: 'personal',
        },
        latest_charge: {
          id: 'ch_test_processed',
          object: 'charge',
          receipt_url: 'https://pay.stripe.com/receipts/test_pi_test_processed',
        } as any,
      } as any;

      const event: Stripe.Event = {
        id: 'evt_processed_test_456',
        object: 'event',
        type: 'payment_intent.succeeded',
        data: {
          object: paymentIntent,
        },
        created: Math.floor(Date.now() / 1000),
        livemode: false,
        api_version: '2024-12-18.acacia',
        pending_webhooks: 0,
        request: null,
      } as any;

      const constructEventMock = vi.spyOn(stripe.webhooks, 'constructEvent').mockReturnValue(event);

      await request(app)
        .post('/api/marketplace/webhook')
        .set('stripe-signature', 'test_signature')
        .set('Content-Type', 'application/json')
        .send(Buffer.from(JSON.stringify(event)))
        .expect(200);

      const [eventRecord] = await db
        .select()
        .from(stripeEvents)
        .where(eq(stripeEvents.stripeEventId, 'evt_processed_test_456'));

      expect(eventRecord).toBeDefined();
      expect(eventRecord.eventType).toBe('payment_intent.succeeded');
      expect(eventRecord.processed).toBe(true);

      constructEventMock.mockRestore();
    });

    it('should handle invoice.payment_succeeded webhook', async () => {
      await db.update(users)
        .set({ 
          stripeCustomerId: 'cus_test_invoice',
          stripeSubscriptionId: 'sub_test_invoice',
        })
        .where(eq(users.id, buyerId));

      const invoice: Stripe.Invoice = {
        id: 'in_test_succeeded',
        object: 'invoice',
        customer: 'cus_test_invoice',
        subscription: 'sub_test_invoice',
        amount_paid: 2000,
        currency: 'usd',
        status: 'paid',
        lines: {
          object: 'list',
          data: [
            {
              id: 'il_test',
              object: 'line_item',
              description: 'Pro subscription',
              amount: 2000,
            }
          ],
          has_more: false,
          url: '',
        },
        hosted_invoice_url: 'https://invoice.stripe.com/i/test',
        invoice_pdf: 'https://invoice.stripe.com/i/test/pdf',
        number: 'INV-TEST-001',
        period_start: Math.floor(Date.now() / 1000),
        period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
      } as any;

      const event: Stripe.Event = {
        id: 'evt_invoice_succeeded_123',
        object: 'event',
        type: 'invoice.payment_succeeded',
        data: {
          object: invoice,
        },
        created: Math.floor(Date.now() / 1000),
        livemode: false,
        api_version: '2024-12-18.acacia',
        pending_webhooks: 0,
        request: null,
      } as any;

      const constructEventMock = vi.spyOn(stripe.webhooks, 'constructEvent').mockReturnValue(event);

      await request(app)
        .post('/api/marketplace/webhook')
        .set('stripe-signature', 'test_signature')
        .set('Content-Type', 'application/json')
        .send(Buffer.from(JSON.stringify(event)))
        .expect(200);

      const eventRecords = await db
        .select()
        .from(stripeEvents)
        .where(eq(stripeEvents.stripeEventId, 'evt_invoice_succeeded_123'));

      expect(eventRecords.length).toBe(1);
      expect(eventRecords[0].processed).toBe(true);

      constructEventMock.mockRestore();
    });
  });
});
