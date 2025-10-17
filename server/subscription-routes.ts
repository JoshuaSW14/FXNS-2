import { Router } from 'express';
import { db } from './db';
import { users, billingHistory } from '../shared/schema';
import { eq, desc } from 'drizzle-orm';

// Define requireAuth middleware locally
function requireAuth(req: any, res: any, next: any) {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    next();
}

// Note: CSRF protection is now applied globally via enhancedCSRFProtection middleware
// in routes.ts. No need for local requireCSRFHeader middleware.
import { proService } from './pro-service';

// Use centralized Stripe client  
import { stripe } from './stripe-client';
import { staticCache, cacheMiddleware, setApiCacheHeaders } from './cache-service';

const router = Router();

// Get current subscription info
router.get('/subscription', requireAuth, async (req, res) => {
    try {
        const userId = req.user!.id;
        const subscriptionInfo = await proService.getSubscriptionInfo(userId);
        
        if (!subscriptionInfo) {
            return res.status(404).json({ error: 'Subscription not found' });
        }

        res.json(subscriptionInfo);
    } catch (error) {
        console.error('Error getting subscription:', error);
        res.status(500).json({ error: 'Failed to get subscription information' });
    }
});

// Get Pro plan features and pricing
router.get('/plans', 
    cacheMiddleware(staticCache, () => 'subscription:plans', 30 * 60 * 1000), 
    async (req, res) => {
    try {
        setApiCacheHeaders(res, 1800); // 30 minutes
        res.json({
            plans: {
                free: {
                    name: 'Free',
                    price: 0,
                    features: [
                        '50 tasks & 20 notes',
                        '10 AI requests per month',
                        'Basic tool builder',
                        '2 API integrations',
                        '100 API calls per month',
                        '1 webhook endpoint',
                        '2 automation rules',
                        'Community access'
                    ],
                    limits: {
                        aiRequestsPerMonth: 10,
                        maxTasks: 50,
                        maxNotes: 20,
                        maxAutomationRules: 2,
                        maxFileUploads: 2,
                        maxApiConfigurations: 2,
                        maxApiCallsPerMonth: 100,
                        maxWebhookEndpoints: 1
                    }
                },
                pro: {
                    name: 'Pro',
                    price: 20, // $20/month
                    features: [
                        'Unlimited tasks & notes',
                        '1,000 AI requests per month',
                        'AI task prioritization & smart scheduling',
                        'Advanced tool builder with AI assistance',
                        '50 API integrations (vs 2 free)',
                        '10,000 API calls per month (vs 100 free)',
                        '25 webhook endpoints (vs 1 free)',
                        'Advanced automation (50 rules)',
                        'Advanced analytics & insights',
                        'Team collaboration features',
                        'Priority support & resources'
                    ],
                    limits: {
                        aiRequestsPerMonth: 1000,
                        maxTasks: -1,
                        maxNotes: -1,
                        maxAutomationRules: 50,
                        maxFileUploads: 100,
                        maxApiConfigurations: 50,
                        maxApiCallsPerMonth: 10000,
                        maxWebhookEndpoints: 25
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error getting plans:', error);
        res.status(500).json({ error: 'Failed to get plan information' });
    }
});

// Check feature access
router.post('/check-feature', requireAuth, async (req, res) => {
    try {
        const userId = req.user!.id;
        const { feature } = req.body;

        if (!feature) {
            return res.status(400).json({ error: 'Feature name required' });
        }

        const canUse = await proService.canUseAIFeature(userId, feature);
        res.json(canUse);
    } catch (error) {
        console.error('Error checking feature access:', error);
        res.status(500).json({ error: 'Failed to check feature access' });
    }
});

// Create Stripe Checkout session for Pro upgrade
router.post('/upgrade', requireAuth, async (req, res) => {
    try {
        const userId = req.user!.id;
        const userEmail = req.user!.email;
        
        // Get or create Stripe customer
        let customer;
        let customerId = req.user!.stripeCustomerId;
        
        if (customerId) {
            try {
                customer = await stripe.customers.retrieve(customerId);
            } catch (error) {
                console.error('Error retrieving customer:', error);
                customerId = null; // Will create new customer below
            }
        }
        
        if (!customerId) {
            customer = await stripe.customers.create({
                email: userEmail,
                name: req.user!.name || userEmail,
                metadata: {
                    userId: userId
                }
            });
            customerId = customer.id;
            
            // Persist customer ID to user record immediately
            await db.update(users)
                .set({ stripeCustomerId: customerId })
                .where(eq(users.id, userId));
        }
        
        // Create Stripe Checkout session
        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: 'fxns Pro',
                            description: 'Unlimited tools, AI features, and premium support'
                        },
                        unit_amount: 2000, // $20.00
                        recurring: {
                            interval: 'month'
                        }
                    },
                    quantity: 1,
                }
            ],
            mode: 'subscription',
            success_url: `${process.env.FRONTEND_URL || 'https://localhost:5000'}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.FRONTEND_URL || 'https://localhost:5000'}/subscription?upgrade_cancelled=true`,
            metadata: {
                userId: userId
            }
        });
        
        res.json({
            success: true,
            sessionId: session.id,
            checkoutUrl: session.url
        });
    } catch (error) {
        console.error('Error creating Stripe checkout session:', error);
        res.status(500).json({ error: 'Failed to create checkout session' });
    }
});

// Cancel subscription
router.post('/cancel', requireAuth, async (req, res) => {
    try {
        const userId = req.user!.id;
        
        await proService.cancelSubscription(userId);
        
        res.json({
            success: true,
            message: 'Subscription cancelled successfully'
        });
    } catch (error) {
        console.error('Error cancelling subscription:', error);
        res.status(500).json({ error: 'Failed to cancel subscription' });
    }
});

// Resume/reactivate cancelled subscription
router.post('/resume', requireAuth, async (req, res) => {
    try {
        const userId = req.user!.id;
        const user = req.user!;
        
        if (!user.stripeSubscriptionId) {
            return res.status(400).json({ error: 'No subscription found' });
        }
        
        // Check current subscription status
        const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
        
        // Only allow resuming if subscription is set to cancel at period end
        if (!(subscription as any).cancel_at_period_end) {
            return res.status(400).json({ error: 'Subscription is not scheduled for cancellation' });
        }
        
        // Resume the subscription by removing the cancellation
        const updatedSubscription = await stripe.subscriptions.update(user.stripeSubscriptionId, {
            cancel_at_period_end: false,
        });
        
        // Update user subscription status
        await db.update(users)
            .set({ 
                subscriptionStatus: updatedSubscription.status,
            })
            .where(eq(users.id, userId));
        
        res.json({
            success: true,
            message: 'Subscription reactivated successfully',
            subscriptionId: updatedSubscription.id,
            status: updatedSubscription.status,
        });
    } catch (error) {
        console.error('Error resuming subscription:', error);
        res.status(500).json({ error: 'Failed to resume subscription' });
    }
});

// Create Stripe Customer Portal session for managing billing
router.post('/create-portal-session', requireAuth, async (req, res) => {
    try {
        const user = req.user!;
        
        if (!user.stripeCustomerId) {
            return res.status(400).json({ error: 'No Stripe customer found' });
        }
        
        // Create a portal session
        const session = await stripe.billingPortal.sessions.create({
            customer: user.stripeCustomerId,
            return_url: `${process.env.FRONTEND_URL || 'https://localhost:5000'}/subscription`,
        });
        
        res.json({
            success: true,
            url: session.url
        });
    } catch (error) {
        console.error('Error creating portal session:', error);
        res.status(500).json({ error: 'Failed to create billing portal session' });
    }
});

// Get usage statistics
router.get('/usage', requireAuth, async (req, res) => {
    try {
        const userId = req.user!.id;
        const usage = await proService.getUserUsage(userId);
        const limits = await proService.getUserLimits(userId);
        const apiLimits = await proService.getApiIntegrationLimits(userId);
        
        res.json({
            usage,
            limits,
            apiLimits,
            percentages: {
                aiRequests: limits.aiRequestsPerMonth > 0 
                    ? Math.round((usage.aiRequestsThisMonth / limits.aiRequestsPerMonth) * 100)
                    : 0,
                fileUploads: limits.maxFileUploads > 0
                    ? Math.round((usage.fileUploadsThisMonth / limits.maxFileUploads) * 100)
                    : 0,
                apiCalls: apiLimits.maxApiCallsPerMonth > 0
                    ? Math.round((usage.apiCallsThisMonth / apiLimits.maxApiCallsPerMonth) * 100)
                    : 0,
                apiConfigurations: apiLimits.maxApiConfigurations > 0
                    ? Math.round((usage.apiConfigurationsCount / apiLimits.maxApiConfigurations) * 100)
                    : 0,
                webhookEndpoints: apiLimits.maxWebhookEndpoints > 0
                    ? Math.round((usage.webhookEndpointsCount / apiLimits.maxWebhookEndpoints) * 100)
                    : 0
            }
        });
    } catch (error) {
        console.error('Error getting usage stats:', error);
        res.status(500).json({ error: 'Failed to get usage statistics' });
    }
});

// Get advanced analytics (Pro only)
router.get('/analytics', requireAuth, async (req, res) => {
    try {
        const userId = req.user!.id;
        const analytics = await proService.getAdvancedAnalytics(userId);
        
        if (analytics.error) {
            return res.status(403).json(analytics);
        }
        
        res.json(analytics);
    } catch (error) {
        console.error('Error getting analytics:', error);
        res.status(500).json({ error: 'Failed to get analytics' });
    }
});

// Check API integration limits
router.get('/api-limits', requireAuth, async (req, res) => {
    try {
        const userId = req.user!.id;
        const configCheck = await proService.canCreateApiConfiguration(userId);
        const callCheck = await proService.canMakeApiCall(userId);
        const limits = await proService.getApiIntegrationLimits(userId);
        
        res.json({
            canCreateConfiguration: configCheck,
            canMakeApiCall: callCheck,
            limits
        });
    } catch (error) {
        console.error('Error checking API limits:', error);
        res.status(500).json({ error: 'Failed to check API limits' });
    }
});

// Webhook endpoint removed - using centralized webhook handler in routes.ts

// Get subscription info and billing history
router.get('/info', requireAuth, async (req, res) => {
    try {
        const userId = req.user!.id;

        // Get billing history
        const billing = await db.select()
            .from(billingHistory)
            .where(eq(billingHistory.userId, userId))
            .orderBy(desc(billingHistory.createdAt))
            .limit(50);

        res.json({
            subscriptionStatus: req.user!.subscriptionStatus,
            subscriptionCurrentPeriodEnd: req.user!.subscriptionCurrentPeriodEnd,
            billingHistory: billing
        });
    } catch (error) {
        console.error('Error fetching subscription info:', error);
        res.status(500).json({ error: 'Failed to fetch subscription info' });
    }
});

export { router as subscriptionRoutes };