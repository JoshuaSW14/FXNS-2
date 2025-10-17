import { Router } from 'express';
import Stripe from 'stripe';
import { db } from './storage';
import { toolPurchases, creatorEarnings, users, fxns, stripeEvents, toolPricing, billingHistory, workflowPricing, workflowPurchases, workflowCreatorEarnings, workflows } from '../shared/schema';
import { eq, sql, and } from 'drizzle-orm';
import { stripe } from './stripe-client';
import { appCache } from './cache-service';

export const stripeWebhookRouter = Router();

stripeWebhookRouter.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];

  if (!sig) {
    console.error('❌ Missing Stripe signature header');
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
    console.error('❌ Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`🔔 Stripe webhook received: ${event.type} (${event.id})`);

  try {
    // Check if event exists and if it's already processed
    const [existingEvent] = await db
      .select()
      .from(stripeEvents)
      .where(eq(stripeEvents.stripeEventId, event.id))
      .limit(1);

    if (existingEvent) {
      if (existingEvent.processed) {
        console.log(`⏭️ Event ${event.id} already processed, skipping`);
        return res.json({ received: true });
      }
      console.log(`🔄 Event ${event.id} exists but not processed, continuing...`);
    } else {
      // Record new event
      await db.insert(stripeEvents).values({
        stripeEventId: event.id,
        eventType: event.type,
        processed: false,
      });
      console.log(`✅ Event ${event.id} recorded, proceeding with processing`);
    }

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentIntentSucceeded(paymentIntent, event.id);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`⚠️ Payment failed for PaymentIntent ${paymentIntent.id}`);
        await db.update(stripeEvents)
          .set({ processed: true })
          .where(eq(stripeEvents.stripeEventId, event.id));
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentSucceeded(invoice, event.id);
        break;
      }

      default:
        console.log(`🔔 Unhandled webhook event type: ${event.type}`);
        await db.update(stripeEvents)
          .set({ processed: true })
          .where(eq(stripeEvents.stripeEventId, event.id));
    }

    res.json({ received: true });
  } catch (error) {
    console.error(`❌ Error processing webhook ${event.type}:`, error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent, eventId: string) {
  const { metadata } = paymentIntent;
  const { workflowId, fxnId, buyerId, sellerId } = metadata;

  // Determine purchase type and route to appropriate handler
  if (workflowId) {
    return await handleWorkflowPurchase(paymentIntent, eventId);
  } else if (fxnId) {
    return await handleToolPurchase(paymentIntent, eventId);
  } else {
    console.error('❌ Missing required metadata in PaymentIntent:', paymentIntent.id, '- neither workflowId nor fxnId found');
    return;
  }
}

async function handleToolPurchase(paymentIntent: Stripe.PaymentIntent, eventId: string) {
  const { metadata } = paymentIntent;
  const { fxnId, buyerId, sellerId } = metadata;

  if (!fxnId || !buyerId || !sellerId) {
    console.error('❌ Missing required metadata in PaymentIntent:', paymentIntent.id);
    return;
  }

  console.log(`💰 Processing successful payment for tool ${fxnId} by user ${buyerId}`);

  try {
    const pricing = await db.query.toolPricing.findFirst({
      where: eq(toolPricing.fxnId, fxnId),
    });

    if (!pricing) {
      console.error(`❌ No pricing found for tool ${fxnId}`);
      return;
    }

    const amountReceived = paymentIntent.amount_received || paymentIntent.amount;
    const platformFee = Math.floor(amountReceived * 0.3);
    const creatorEarningsAmount = amountReceived - platformFee;

    const expiresAt = pricing.pricingModel === 'subscription' 
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      : null;

    const purchase = await db.transaction(async (tx) => {
      const [newPurchase] = await tx.insert(toolPurchases)
        .values({
          fxnId,
          buyerId,
          sellerId,
          amount: amountReceived,
          platformFee,
          creatorEarnings: creatorEarningsAmount,
          stripePaymentIntentId: paymentIntent.id,
          licenseType: metadata.licenseType || 'personal',
          expiresAt,
        })
        .returning();

      console.log(`✅ Created purchase record ${newPurchase.id}`);

      // Get the charge ID and receipt URL from the payment intent
      let chargeId = paymentIntent.latest_charge as string | null;
      let receiptUrl: string | null = null;
      
      if (!chargeId || typeof paymentIntent.latest_charge !== 'object') {
        // Fetch full payment intent with charges if not included
        const fullPI = await stripe.paymentIntents.retrieve(paymentIntent.id, {
          expand: ['latest_charge'],
        });
        const charge = typeof fullPI.latest_charge === 'object' ? fullPI.latest_charge : null;
        chargeId = charge?.id || (typeof fullPI.latest_charge === 'string' ? fullPI.latest_charge : paymentIntent.id);
        receiptUrl = charge?.receipt_url || null;
      } else {
        // Extract from expanded charge object
        const charge = paymentIntent.latest_charge as any;
        receiptUrl = charge.receipt_url || null;
      }

      // Record the purchase in billing history for the buyer
      await tx.insert(billingHistory).values({
        userId: buyerId,
        stripeChargeId: chargeId,
        type: 'charge',
        status: 'paid',
        amount: amountReceived,
        currency: paymentIntent.currency || 'usd',
        description: `Purchase of tool: ${metadata.toolName || fxnId}`,
        metadata: {
          fxnId,
          sellerId,
          licenseType: metadata.licenseType || 'personal',
          paymentIntentId: paymentIntent.id,
          receiptUrl,
          toolName: metadata.toolName,
        },
      });
      console.log(`✅ Recorded billing history for buyer ${buyerId} (charge: ${chargeId}, receipt: ${receiptUrl ? 'available' : 'unavailable'})`);

      let earnings = await tx.query.creatorEarnings.findFirst({
        where: eq(creatorEarnings.userId, sellerId),
      });

      if (!earnings) {
        await tx.insert(creatorEarnings).values({
          userId: sellerId,
          totalEarnings: creatorEarningsAmount,
          pendingEarnings: creatorEarningsAmount,
          lifetimeSales: 1,
        });
        console.log(`✅ Created earnings record for seller ${sellerId}: $${(creatorEarningsAmount / 100).toFixed(2)}`);
      } else {
        await tx.update(creatorEarnings)
          .set({
            totalEarnings: sql`${creatorEarnings.totalEarnings} + ${creatorEarningsAmount}`,
            pendingEarnings: sql`${creatorEarnings.pendingEarnings} + ${creatorEarningsAmount}`,
            lifetimeSales: sql`${creatorEarnings.lifetimeSales} + 1`,
            updatedAt: new Date(),
          })
          .where(eq(creatorEarnings.userId, sellerId));
        console.log(`✅ Updated earnings for seller ${sellerId}: +$${(creatorEarningsAmount / 100).toFixed(2)}`);
      }

      await tx.update(stripeEvents)
        .set({ processed: true })
        .where(eq(stripeEvents.stripeEventId, eventId));

      return newPurchase;
    });

    // Invalidate bestsellers cache after successful purchase
    appCache.invalidateBestsellers();
    console.log('🗑️ Invalidated bestsellers cache after purchase');

    try {
      const buyer = await db.query.users.findFirst({
        where: eq(users.id, buyerId),
      });
      
      const fxn = await db.query.fxns.findFirst({
        where: eq(fxns.id, fxnId),
      });

      if (buyer && fxn) {
        const { sendPurchaseNotification } = await import('./email-notifications');
        await sendPurchaseNotification(
          sellerId,
          buyer.name || buyer.email,
          fxn.title,
          purchase.amount,
          creatorEarningsAmount
        );
      }
    } catch (emailError) {
      console.error('⚠️ Failed to send purchase notification email:', emailError);
    }

    console.log(`✅ Successfully processed payment for purchase ${purchase.id} and marked event ${eventId} as processed`);
  } catch (error) {
    console.error('❌ Error processing payment_intent.succeeded:', error);
    throw error;
  }
}

async function handleWorkflowPurchase(paymentIntent: Stripe.PaymentIntent, eventId: string) {
  const { metadata } = paymentIntent;
  const { workflowId, buyerId, sellerId } = metadata;

  if (!workflowId || !buyerId || !sellerId) {
    console.error('❌ Missing required metadata in PaymentIntent:', paymentIntent.id);
    return;
  }

  console.log(`💰 Processing successful payment for workflow ${workflowId} by user ${buyerId}`);

  try {
    const pricing = await db.query.workflowPricing.findFirst({
      where: eq(workflowPricing.workflowId, workflowId),
    });

    if (!pricing) {
      console.error(`❌ No pricing found for workflow ${workflowId}`);
      return;
    }

    const amountReceived = paymentIntent.amount_received || paymentIntent.amount;
    const platformFee = Math.floor(amountReceived * 0.3);
    const creatorEarningsAmount = amountReceived - platformFee;

    const purchase = await db.transaction(async (tx) => {
      const [newPurchase] = await tx.insert(workflowPurchases)
        .values({
          workflowId,
          buyerId,
          sellerId,
          amount: amountReceived,
          platformFee,
          creatorEarnings: creatorEarningsAmount,
          stripePaymentIntentId: paymentIntent.id,
          licenseType: metadata.licenseType || 'personal',
          expiresAt: null,
        })
        .returning();

      console.log(`✅ Created workflow purchase record ${newPurchase.id}`);

      // Get the charge ID and receipt URL from the payment intent
      let chargeId = paymentIntent.latest_charge as string | null;
      let receiptUrl: string | null = null;
      
      if (!chargeId || typeof paymentIntent.latest_charge !== 'object') {
        // Fetch full payment intent with charges if not included
        const fullPI = await stripe.paymentIntents.retrieve(paymentIntent.id, {
          expand: ['latest_charge'],
        });
        const charge = typeof fullPI.latest_charge === 'object' ? fullPI.latest_charge : null;
        chargeId = charge?.id || (typeof fullPI.latest_charge === 'string' ? fullPI.latest_charge : paymentIntent.id);
        receiptUrl = charge?.receipt_url || null;
      } else {
        // Extract from expanded charge object
        const charge = paymentIntent.latest_charge as any;
        receiptUrl = charge.receipt_url || null;
      }

      // Get workflow details for billing history description
      const workflow = await tx.query.workflows.findFirst({
        where: eq(workflows.id, workflowId),
      });

      // Record the purchase in billing history for the buyer
      await tx.insert(billingHistory).values({
        userId: buyerId,
        stripeChargeId: chargeId,
        type: 'charge',
        status: 'paid',
        amount: amountReceived,
        currency: paymentIntent.currency || 'usd',
        description: `Workflow purchase: ${workflow?.name || workflowId}`,
        metadata: {
          workflowId,
          sellerId,
          licenseType: metadata.licenseType || 'personal',
          paymentIntentId: paymentIntent.id,
          receiptUrl,
          workflowName: metadata.workflowName || workflow?.name,
          platformFee,
        },
      });
      console.log(`✅ Recorded billing history for buyer ${buyerId} (charge: ${chargeId}, receipt: ${receiptUrl ? 'available' : 'unavailable'})`);

      const [existingEarnings] = await tx.select()
        .from(workflowCreatorEarnings)
        .where(eq(workflowCreatorEarnings.userId, sellerId))
        .limit(1);

      if (existingEarnings) {
        await tx.update(workflowCreatorEarnings)
          .set({
            totalEarnings: sql`${workflowCreatorEarnings.totalEarnings} + ${creatorEarningsAmount}`,
            pendingEarnings: sql`${workflowCreatorEarnings.pendingEarnings} + ${creatorEarningsAmount}`,
            lifetimeSales: sql`${workflowCreatorEarnings.lifetimeSales} + 1`,
            updatedAt: new Date(),
          })
          .where(eq(workflowCreatorEarnings.userId, sellerId));
        console.log(`✅ Updated workflow earnings for seller ${sellerId}: +$${(creatorEarningsAmount / 100).toFixed(2)}`);
      } else {
        await tx.insert(workflowCreatorEarnings).values({
          userId: sellerId,
          totalEarnings: creatorEarningsAmount,
          pendingEarnings: creatorEarningsAmount,
          lifetimeSales: 1,
        });
        console.log(`✅ Created workflow earnings record for seller ${sellerId}: $${(creatorEarningsAmount / 100).toFixed(2)}`);
      }

      await tx.update(stripeEvents)
        .set({ processed: true })
        .where(eq(stripeEvents.stripeEventId, eventId));

      return newPurchase;
    });

    // Invalidate workflow marketplace cache after successful purchase
    appCache.delete('workflow-marketplace:featured');
    appCache.delete('workflow-marketplace:bestsellers');
    console.log('🗑️ Invalidated workflow marketplace cache after purchase');

    try {
      const buyer = await db.query.users.findFirst({
        where: eq(users.id, buyerId),
      });
      
      const workflow = await db.query.workflows.findFirst({
        where: eq(workflows.id, workflowId),
      });

      if (buyer && workflow) {
        const { sendPurchaseNotification } = await import('./email-notifications');
        await sendPurchaseNotification(
          sellerId,
          buyer.name || buyer.email,
          workflow.name,
          purchase.amount,
          creatorEarningsAmount
        );
      }
    } catch (emailError) {
      console.error('⚠️ Failed to send workflow purchase notification email:', emailError);
    }

    console.log(`✅ Successfully processed workflow payment for purchase ${purchase.id} and marked event ${eventId} as processed`);
  } catch (error) {
    console.error('❌ Error processing workflow payment_intent.succeeded:', error);
    throw error;
  }
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice, eventId: string) {
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
      await db.update(stripeEvents)
        .set({ processed: true })
        .where(eq(stripeEvents.stripeEventId, eventId));
      return;
    }

    console.log(`💰 Processing subscription invoice payment for user ${user.email}`);

    // Use transaction to ensure atomicity and idempotency
    await db.transaction(async (tx) => {
      // Record successful invoice payment in billing history
      await tx.insert(billingHistory).values({
        userId: user.id,
        stripeInvoiceId: invoice.id,
        type: 'invoice',
        status: 'paid',
        amount: (invoice as any).amount_paid || 0,
        currency: invoice.currency || 'usd',
        description: invoice.description || `Payment for ${invoice.lines.data[0]?.description || 'subscription'}`,
        metadata: {
          invoiceNumber: invoice.number,
          periodStart: (invoice as any).period_start,
          periodEnd: (invoice as any).period_end,
          hostedInvoiceUrl: invoice.hosted_invoice_url,
          invoicePdf: invoice.invoice_pdf,
        }
      });

      console.log(`✅ Recorded billing history for invoice ${invoice.id}`);

      // Mark event as processed within the same transaction
      await tx.update(stripeEvents)
        .set({ processed: true })
        .where(eq(stripeEvents.stripeEventId, eventId));
    });

    console.log(`✅ Invoice payment succeeded for user ${user.email}: $${((invoice as any).amount_paid / 100).toFixed(2)}`);
  } catch (error) {
    console.error('❌ Error handling invoice payment success:', error);
    throw error;
  }
}
