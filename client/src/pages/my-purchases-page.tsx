import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import NavigationHeader from "@/components/navigation-header";
import Footer from "@/components/footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingBag, Calendar, User, ExternalLink } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { SEO } from "@/components/seo";
import { format } from "date-fns";

export default function MyPurchasesPage() {
  const [, setLocation] = useLocation();

  const { data, isLoading } = useQuery({
    queryKey: ["my-purchases"],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/marketplace/my-purchases');
      if (!response.ok) throw new Error("Failed to fetch purchases");
      return response.json();
    },
  });

  const purchases = data?.purchases || [];

  const formatPrice = (cents: number) => {
    return `${(cents / 100).toFixed(2)}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50">
        {/* <NavigationHeader /> */}
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-12 w-64 mb-8" />
          <div className="space-y-4">
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
        title="My Purchases - fxns"
        description="View your purchased tools and access your library"
      />
      
      <div className="min-h-screen bg-neutral-50">
        {/* <NavigationHeader /> */}
        
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">My Purchases</h1>
            <p className="text-muted-foreground">
              Access all your purchased tools
            </p>
          </div>

          {purchases.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <ShoppingBag className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <h3 className="text-xl font-semibold mb-2">No purchases yet</h3>
                <p className="text-muted-foreground mb-6">
                  Browse the marketplace to find premium tools
                </p>
                <Button onClick={() => setLocation("/marketplace")}>
                  Browse Marketplace
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {purchases.map((item: any) => {
                const { purchase, fxn, seller } = item;
                const isActive = !purchase.expiresAt || new Date(purchase.expiresAt) > new Date();

                return (
                  <Card key={purchase.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-xl">{fxn.title}</CardTitle>
                          <CardDescription className="mt-2">
                            {fxn.description}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                          {isActive ? (
                            <Badge className="bg-green-600">Active</Badge>
                          ) : (
                            <Badge variant="secondary">Expired</Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground mb-4">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          Purchased {format(new Date(purchase.createdAt), 'MMM d, yyyy')}
                        </span>
                        {seller?.name && (
                          <span className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            by {seller.name}
                          </span>
                        )}
                        <Badge variant="outline" className="capitalize">
                          {purchase.licenseType} License
                        </Badge>
                        <span className="font-semibold text-foreground">
                          {formatPrice(purchase.amount)}
                        </span>
                      </div>

                      {purchase.expiresAt && (
                        <p className="text-sm text-muted-foreground mb-4">
                          {isActive ? 'Renews' : 'Expired'} on {format(new Date(purchase.expiresAt), 'MMM d, yyyy')}
                        </p>
                      )}

                      <div className="flex gap-2">
                        <Button
                          onClick={() => setLocation(`/fxn/${fxn.slug}`)}
                          disabled={!isActive}
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Open Tool
                        </Button>
                        {!isActive && (
                          <Button variant="outline">
                            Renew Subscription
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {purchases.length > 0 && (
            <Card className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50">
              <CardContent className="py-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold mb-1">Looking for more tools?</h3>
                    <p className="text-sm text-muted-foreground">
                      Discover premium tools in the marketplace
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => setLocation("/marketplace")}>
                    Browse More
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
