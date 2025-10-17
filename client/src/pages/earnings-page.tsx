import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import NavigationHeader from "@/components/navigation-header";
import Footer from "@/components/footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, TrendingUp, ShoppingBag, Calendar, ExternalLink, CheckCircle2, AlertCircle, Loader2, History } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { SEO } from "@/components/seo";
import { format } from "date-fns";

export default function EarningsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [payoutAmount, setPayoutAmount] = useState<string>("");
  
  const { data, isLoading } = useQuery({
    queryKey: ["my-earnings"],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/marketplace/my-earnings');
      if (!response.ok) throw new Error("Failed to fetch earnings");
      return response.json();
    },
  });

  const { data: connectStatus } = useQuery({
    queryKey: ["connect-status"],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/payouts/connect-status');
      if (!response.ok) throw new Error("Failed to fetch connect status");
      return response.json();
    },
  });

  const { data: payoutHistory } = useQuery({
    queryKey: ["payout-history"],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/payouts/history');
      if (!response.ok) throw new Error("Failed to fetch payout history");
      return response.json();
    },
    enabled: connectStatus?.connected === true,
  });

  const earnings = data?.earnings || {
    totalEarnings: 0,
    pendingEarnings: 0,
    lifetimeSales: 0,
  };

  const sales = data?.sales || [];
  
  const connectAccountMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/payouts/connect-account', {});
      if (!response.ok) throw new Error("Failed to create connect account");
      return response.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: () => {
      toast({
        title: "Connection Failed",
        description: "Could not create Stripe Connect account. Please try again.",
        variant: "destructive",
      });
    },
  });

  const requestPayoutMutation = useMutation({
    mutationFn: async (amount: number) => {
      const response = await apiRequest('POST', '/api/payouts/request-payout', { amount });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || error.error || "Payout request failed");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Payout Requested",
        description: "Your payout is being processed. It will arrive in 2-7 business days.",
      });
      setPayoutAmount("");
      queryClient.invalidateQueries({ queryKey: ["my-earnings"] });
      queryClient.invalidateQueries({ queryKey: ["payout-history"] });
      queryClient.invalidateQueries({ queryKey: ["connect-status"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Payout Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleRequestPayout = () => {
    const amountCents = Math.round(parseFloat(payoutAmount) * 100);
    if (isNaN(amountCents) || amountCents < 5000) {
      toast({
        title: "Invalid Amount",
        description: "Minimum payout amount is $50.00",
        variant: "destructive",
      });
      return;
    }
    if (amountCents > earnings.pendingEarnings) {
      toast({
        title: "Insufficient Balance",
        description: `You only have ${formatPrice(earnings.pendingEarnings)} available`,
        variant: "destructive",
      });
      return;
    }
    requestPayoutMutation.mutate(amountCents);
  };
  
  const canRequestPayout = connectStatus?.connected && 
    connectStatus?.accountStatus?.payoutsEnabled && 
    earnings.pendingEarnings >= 5000;

  const formatPrice = (cents: number) => {
    return `${(cents / 100).toFixed(2)}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50">
        {/* <NavigationHeader /> */}
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-12 w-64 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEO
        title="Earnings Dashboard - fxns"
        description="View your tool sales, earnings, and analytics"
      />
      
      <div className="min-h-screen bg-neutral-50">
        {/* <NavigationHeader /> */}
        
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Earnings Dashboard</h1>
            <p className="text-muted-foreground">
              Track your tool sales and revenue
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Earnings
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatPrice(earnings.totalEarnings)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  70% revenue share
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Pending Payout
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatPrice(earnings.pendingEarnings)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Available for withdrawal
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Lifetime Sales
                </CardTitle>
                <ShoppingBag className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {earnings.lifetimeSales}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Total transactions
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Sales</CardTitle>
              <CardDescription>
                Your latest tool purchases and earnings
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sales.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ShoppingBag className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>No sales yet</p>
                  <p className="text-sm mt-2">
                    Share your tools to start earning!
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sales.map((sale: any) => (
                    <div
                      key={sale.purchase.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-neutral-50 transition-colors"
                    >
                      <div className="flex-1">
                        <h4 className="font-medium">{sale.fxn.title}</h4>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(sale.purchase.createdAt), 'MMM d, yyyy')}
                          </span>
                          <span>Buyer: {sale.buyer?.name || 'Anonymous'}</span>
                          <Badge variant="outline" className="capitalize">
                            {sale.purchase.licenseType}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-600">
                          +{formatPrice(sale.purchase.creatorEarnings)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          from {formatPrice(sale.purchase.amount)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Payouts
              </CardTitle>
              <CardDescription>
                Connect your Stripe account to receive your earnings
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!connectStatus?.connected ? (
                <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6 border border-green-200">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold mb-2 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-amber-600" />
                        Connect your Stripe account
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        To receive payouts, you need to connect a Stripe account. This only takes a few minutes and allows you to withdraw your earnings securely.
                      </p>
                      <ul className="text-sm text-muted-foreground space-y-1 mb-4">
                        <li>• Minimum payout: $50.00</li>
                        <li>• Payouts arrive in 2-7 business days</li>
                        <li>• Secure bank transfer via Stripe</li>
                      </ul>
                    </div>
                    <Button 
                      onClick={() => connectAccountMutation.mutate()}
                      disabled={connectAccountMutation.isPending}
                      size="lg"
                    >
                      {connectAccountMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Connect Stripe
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : connectStatus?.accountStatus?.payoutsEnabled === false ? (
                <div className="bg-amber-50 rounded-lg p-6 border border-amber-200">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold mb-2 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-amber-600" />
                        Complete your Stripe onboarding
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Your Stripe account is connected, but you need to complete the onboarding process to enable payouts.
                      </p>
                    </div>
                    <Button 
                      onClick={() => connectAccountMutation.mutate()}
                      disabled={connectAccountMutation.isPending}
                      size="lg"
                      variant="outline"
                    >
                      {connectAccountMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Continue Setup
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <div className="flex items-center gap-2 text-green-700 font-medium mb-1">
                      <CheckCircle2 className="w-5 h-5" />
                      Stripe Account Connected
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Your payouts will be sent to your connected Stripe account
                    </p>
                  </div>

                  <div className="border rounded-lg p-6 bg-gradient-to-br from-white to-neutral-50">
                    <h3 className="font-semibold mb-4">Request Payout</h3>
                    {earnings.pendingEarnings < 5000 ? (
                      <div className="text-center py-6">
                        <p className="text-muted-foreground mb-2">
                          You need at least $50.00 in pending earnings to request a payout
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Current balance: {formatPrice(earnings.pendingEarnings)}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="payout-amount">Amount (USD)</Label>
                          <div className="relative mt-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                              $
                            </span>
                            <Input
                              id="payout-amount"
                              type="number"
                              min="50"
                              step="0.01"
                              placeholder="50.00"
                              value={payoutAmount}
                              onChange={(e) => setPayoutAmount(e.target.value)}
                              className="pl-7"
                              disabled={!canRequestPayout}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Available: {formatPrice(earnings.pendingEarnings)} • Minimum: $50.00
                          </p>
                        </div>
                        <Button 
                          onClick={handleRequestPayout}
                          disabled={!canRequestPayout || requestPayoutMutation.isPending}
                          className="w-full"
                        >
                          {requestPayoutMutation.isPending ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>Request Payout</>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {connectStatus?.connected && payoutHistory && payoutHistory.payouts?.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Payout History
                </CardTitle>
                <CardDescription>
                  Your recent payout transactions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {payoutHistory.payouts.map((payout: any) => (
                    <div
                      key={payout.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{formatPrice(payout.amount)}</span>
                          <Badge 
                            variant={
                              payout.status === 'completed' ? 'default' : 
                              payout.status === 'pending' ? 'secondary' : 
                              'destructive'
                            }
                          >
                            {payout.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(payout.createdAt), 'MMM d, yyyy h:mm a')}
                          </span>
                          {payout.completedAt && (
                            <span>
                              Completed: {format(new Date(payout.completedAt), 'MMM d, yyyy')}
                            </span>
                          )}
                        </div>
                        {payout.failureReason && (
                          <p className="text-sm text-red-600 mt-1">
                            {payout.failureReason}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
