import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Check, CreditCard, Crown, Calendar, DollarSign } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/use-auth';
import { loadStripe } from '@stripe/stripe-js';
import { queryClient } from '../lib/queryClient';

// Types for subscription data
interface BillingHistoryItem {
  id: string;
  type: string;
  status: string;
  amount: number;
  currency: string;
  description: string;
  createdAt: string;
  metadata?: {
    invoiceNumber?: string;
    periodStart?: number;
    periodEnd?: number;
  };
}

interface SubscriptionInfo {
  subscriptionStatus: string | null;
  subscriptionCurrentPeriodEnd: string | null;
  billingHistory: BillingHistoryItem[];
}

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

export function SubscriptionPage() {
  const { user } = useAuth();
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if user has Pro subscription
  const isPro = user?.subscriptionStatus === 'active';

  // Fetch subscription information
  useEffect(() => {
    const fetchSubscriptionInfo = async () => {
      try {
        const response = await fetch('/api/subscription/info', {
          credentials: 'include',
          headers: { 'X-Requested-With': 'fetch' },
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch subscription info');
        }
        
        const data = await response.json();
        setSubscriptionInfo(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchSubscriptionInfo();
    } else {
      setLoading(false);
    }
  }, [user]);

  // Handle upgrade to Pro
  const handleUpgrade = async () => {
    try {
      setUpgrading(true);
      setError(null);

      const response = await fetch('/api/subscription/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'fetch'
        },
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe Checkout
      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error('Stripe failed to load');
      }

      const { error } = await stripe.redirectToCheckout({
        sessionId: data.sessionId,
      });

      if (error) {
        throw new Error(error.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upgrade failed');
      setUpgrading(false);
    }
  };

  // Handle subscription cancellation
  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your Pro subscription? You will lose access to Pro features at the end of your current billing period.')) {
      return;
    }

    try {
      const response = await fetch('/api/subscription/cancel', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'X-Requested-With': 'fetch',
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to cancel subscription');
      }

      // Refresh user data and subscription info
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cancellation failed');
    }
  };

  // Handle resuming cancelled subscription
  const handleResumeSubscription = async () => {
    try {
      const response = await fetch('/api/subscription/resume', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'X-Requested-With': 'fetch',
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to resume subscription');
      }

      // Refresh user data and subscription info
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resume subscription');
    }
  };

  // Handle opening Customer Portal for billing management
  const handleManageBilling = async () => {
    try {
      setUpgrading(true);
      const response = await fetch('/api/subscription/create-portal-session', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'X-Requested-With': 'fetch',
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to open billing portal');
      }

      const data = await response.json();
      // Redirect to Stripe Customer Portal
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open billing portal');
      setUpgrading(false);
    }
  };

  // Format currency amount
  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  // Format date
  const formatDate = (dateString: string | number) => {
    const date = typeof dateString === 'string' ? new Date(dateString) : new Date(dateString * 1000);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Please log in to view your subscription information.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center">Loading subscription information...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Subscription Management</h1>
        <p className="text-muted-foreground">
          Manage your fxns Pro subscription and view billing history
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Payment failure alert */}
      {user?.subscriptionStatus === 'past_due' && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Payment Failed</AlertTitle>
          <AlertDescription>
            Your recent payment could not be processed. Please update your payment method to avoid service interruption.
            <Button
              variant="link"
              className="p-0 h-auto font-semibold ml-1"
              onClick={handleManageBilling}
            >
              Update Payment Method →
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Current Plan */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isPro ? (
                <>
                  <Crown className="h-5 w-5 text-yellow-500" />
                  fxns Pro
                </>
              ) : (
                <>
                  <Check className="h-5 w-5" />
                  fxns Free
                </>
              )}
            </CardTitle>
            <CardDescription>
              {isPro ? 'Your premium subscription' : 'Your current plan'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Status</span>
                <Badge variant={isPro ? 'default' : 'secondary'}>
                  {isPro ? 'Active' : 'Free'}
                </Badge>
              </div>
              
              {isPro && user.subscriptionCurrentPeriodEnd && (
                <div className="flex items-center justify-between">
                  <span>Next billing date</span>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {formatDate(new Date(user.subscriptionCurrentPeriodEnd).toISOString())}
                  </div>
                </div>
              )}

              <Separator />

              <div className="space-y-2">
                <h4 className="font-medium">Features included:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {isPro ? (
                    <>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        Unlimited tool usage
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        Priority support
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        Advanced analytics
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        Custom tool builder
                      </li>
                    </>
                  ) : (
                    <>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        Basic tool usage
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        Community support
                      </li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex-col gap-2">
            {isPro ? (
              <>
                {/* Check if subscription is cancelled but still active */}
                {user.subscriptionStatus === 'canceled' ? (
                  <Button 
                    onClick={handleResumeSubscription}
                    className="w-full"
                  >
                    Resume Subscription
                  </Button>
                ) : (
                  <>
                    <Button 
                      variant="outline"
                      onClick={handleManageBilling}
                      disabled={upgrading}
                      className="w-full"
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      {upgrading ? 'Loading...' : 'Manage Billing & Payment'}
                    </Button>
                    <Button 
                      variant="ghost" 
                      onClick={handleCancelSubscription}
                      className="w-full text-muted-foreground hover:text-destructive"
                    >
                      Cancel Subscription
                    </Button>
                  </>
                )}
              </>
            ) : (
              <Button 
                onClick={handleUpgrade} 
                disabled={upgrading}
                className="w-full"
              >
                <Crown className="h-4 w-4 mr-2" />
                {upgrading ? 'Processing...' : 'Upgrade to Pro - $20/month'}
              </Button>
            )}
          </CardFooter>
        </Card>

        {/* Billing History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Billing History
            </CardTitle>
            <CardDescription>
              View your payment history and invoices
            </CardDescription>
          </CardHeader>
          <CardContent>
            {subscriptionInfo?.billingHistory && subscriptionInfo.billingHistory.length > 0 ? (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {subscriptionInfo.billingHistory.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{item.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(item.createdAt)}
                        {item.metadata?.invoiceNumber && (
                          <> • Invoice #{item.metadata.invoiceNumber}</>
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {formatAmount(item.amount, item.currency)}
                      </p>
                      <Badge 
                        variant={item.status === 'paid' ? 'default' : 'destructive'}
                        className="text-xs"
                      >
                        {item.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <DollarSign className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  {isPro ? 'No billing history yet' : 'No payment history on Free plan'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pro Features Preview for Free Users */}
      {!isPro && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-yellow-500" />
              Upgrade to Pro
            </CardTitle>
            <CardDescription>
              Unlock powerful features to supercharge your productivity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <h4 className="font-medium">Enhanced Capabilities</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Unlimited tool executions</li>
                  <li>• Advanced analytics and insights</li>
                  <li>• Priority customer support</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">Exclusive Features</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Visual tool builder</li>
                  <li>• Custom tool creation</li>
                  <li>• API access (coming soon)</li>
                </ul>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={handleUpgrade} 
              disabled={upgrading}
              className="w-full"
              size="lg"
            >
              <Crown className="h-4 w-4 mr-2" />
              {upgrading ? 'Processing...' : 'Start Your Pro Journey - $20/month'}
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}