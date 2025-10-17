import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Crown, ArrowRight } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/use-auth';
import { queryClient } from '../lib/queryClient';

export function CheckoutSuccessPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [isVerifying, setIsVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Get session_id from URL params
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');

    if (!sessionId) {
      setError('No session ID found');
      setIsVerifying(false);
      return;
    }

    // Verify the checkout session and refresh user data
    const verifyCheckout = async () => {
      try {
        // Refresh user data to get updated subscription status
        queryClient.invalidateQueries({ queryKey: ["/api/user"] });
        setIsVerifying(false);
      } catch (err) {
        console.error('Error verifying checkout:', err);
        setError('Failed to verify checkout');
        setIsVerifying(false);
      }
    };

    // Add a small delay to ensure webhook has time to process
    setTimeout(verifyCheckout, 2000);
  }, []);

  const handleViewSubscription = () => {
    setLocation('/subscription');
  };

  const handleGoToDashboard = () => {
    setLocation('/dashboard');
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
              <p>Verifying your subscription...</p>
              <p className="text-sm text-muted-foreground">
                Please wait while we confirm your payment
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-destructive">
              Verification Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <div className="mt-4 flex gap-2">
              <Button variant="outline" onClick={handleViewSubscription} className="flex-1">
                View Subscription
              </Button>
              <Button onClick={handleGoToDashboard} className="flex-1">
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Welcome to fxns Pro!</CardTitle>
          <CardDescription>
            Your subscription has been activated successfully
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg bg-gradient-to-r from-yellow-50 to-amber-50 p-4 border border-yellow-200">
            <div className="flex items-center gap-3">
              <Crown className="h-5 w-5 text-yellow-600" />
              <div>
                <h3 className="font-medium text-yellow-800">Pro Features Unlocked</h3>
                <p className="text-sm text-yellow-700">
                  You now have access to all premium features and capabilities
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium">What's new for you:</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                Unlimited tool usage and executions
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                Access to the visual tool builder
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                Advanced analytics and usage insights
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                Priority customer support
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <Button onClick={handleGoToDashboard} className="w-full">
              Start Using Pro Features
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            <Button 
              variant="outline" 
              onClick={handleViewSubscription}
              className="w-full"
            >
              View Subscription Details
            </Button>
          </div>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Questions? Contact our support team for help getting started.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}