import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import NavigationHeader from "@/components/navigation-header";
import Footer from "@/components/footer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Crown, DollarSign, GitBranch, User, Calendar } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { format } from "date-fns";
import { SEO } from "@/components/seo";
import { WorkflowDetailModal } from "@/components/workflow-marketplace/workflow-detail-modal";

const categories = [
  { id: "all", name: "All Categories" },
  { id: "productivity", name: "Productivity" },
  { id: "communication", name: "Communication" },
  { id: "data", name: "Data" },
  { id: "social", name: "Social" },
  { id: "finance", name: "Finance" },
  { id: "automation", name: "Automation" },
];

interface WorkflowListing {
  workflow: {
    id: string;
    name: string;
    description: string | null;
    category: string | null;
    nodes: any[];
    createdAt: string;
  };
  pricing: {
    pricingModel: string;
    price: number;
  } | null;
  creator: {
    id: string;
    name: string;
  } | null;
  salesCount?: number;
}

export default function WorkflowMarketplacePage() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("popular");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  const itemsPerPage = 20;

  const offset = (currentPage - 1) * itemsPerPage;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, sortBy]);

  const { data: featuredData, isLoading: loadingFeatured } = useQuery({
    queryKey: ["workflow-marketplace-featured"],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/workflow-marketplace/featured');
      if (!response.ok) throw new Error("Failed to fetch featured workflows");
      return response.json();
    },
  });

  const { data: bestsellersData, isLoading: loadingBestsellers } = useQuery({
    queryKey: ["workflow-marketplace-browse", searchQuery, selectedCategory, sortBy, currentPage],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      params.append('sort', sortBy);
      params.append('limit', itemsPerPage.toString());
      params.append('offset', offset.toString());
      
      const url = `/api/workflow-marketplace/browse?${params.toString()}`;
      const response = await apiRequest('GET', url);
      if (!response.ok) throw new Error("Failed to fetch workflows");
      return response.json();
    },
  });

  const { data: purchasesData, isLoading: loadingPurchases } = useQuery({
    queryKey: ["workflow-marketplace-my-purchases"],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/workflow-marketplace/my-purchases');
      if (!response.ok) throw new Error("Failed to fetch purchases");
      return response.json();
    },
  });

  const featuredWorkflows = featuredData?.workflows || [];
  const allWorkflows = bestsellersData?.workflows || [];
  const myPurchases = purchasesData?.purchases || [];

  const paginatedWorkflows = allWorkflows;
  const totalCount = bestsellersData?.total || 0;
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const formatPrice = (cents: number) => {
    return `${(cents / 100).toFixed(2)}`;
  };

  const WorkflowCard = ({ item, isPurchased = false }: { item: WorkflowListing; isPurchased?: boolean }) => {
    const { workflow, pricing, creator, salesCount } = item;
    const nodeCount = workflow.nodes?.length || 0;

    return (
      <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setSelectedWorkflowId(workflow.id)}>
        <CardHeader className="p-4 sm:p-6">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base sm:text-lg truncate flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-primary" />
                {workflow.name}
              </CardTitle>
              <CardDescription className="line-clamp-2 mt-1 text-xs sm:text-sm">
                {workflow.description || "No description available"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <div className="flex items-center justify-between text-xs sm:text-sm text-muted-foreground mb-2">
            <div className="flex items-center gap-2">
              {workflow.category && (
                <Badge variant="outline" className="capitalize">
                  {workflow.category}
                </Badge>
              )}
              <span className="flex items-center gap-1">
                <GitBranch className="w-3 h-3" />
                {nodeCount} nodes
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {creator?.name && (
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {creator.name}
              </span>
            )}
            {salesCount !== undefined && salesCount > 0 && (
              <span>• {salesCount} sales</span>
            )}
          </div>
        </CardContent>
        <CardFooter className="p-4 sm:p-6 pt-0 flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-2">
          <div className="flex items-center gap-2 justify-between sm:justify-start flex-1">
            {!pricing || pricing.pricingModel === 'free' ? (
              <Badge variant="secondary" className="text-xs">Free</Badge>
            ) : (
              <Badge className="bg-green-600 hover:bg-green-700 text-xs">
                <DollarSign className="w-3 h-3 mr-1" />
                {formatPrice(pricing.price)}
              </Badge>
            )}
            {isPurchased && (
              <Badge variant="default" className="text-xs">Purchased</Badge>
            )}
          </div>
          <Button variant="outline" size="sm" className="w-full sm:w-auto">
            {isPurchased ? 'View Workflow' : 'View Details'}
          </Button>
        </CardFooter>
      </Card>
    );
  };

  const LoadingSkeleton = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-6 w-3/4 mb-2" />
            <Skeleton className="h-4 w-full" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-1/2" />
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <>
      <SEO
        title="Workflow Marketplace - fxns"
        description="Browse and purchase published workflows from the community"
      />
      
      <div className="min-h-screen bg-neutral-50">
        {/* <NavigationHeader /> */}
        
        <div>
          <section className="bg-gradient-to-br from-blue-50 via-white to-violet-50 py-8 sm:py-12 lg:py-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-6 sm:mb-8">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4 flex items-center justify-center gap-2">
                  <GitBranch className="w-8 h-8" />
                  Workflow Marketplace
                </h1>
                <p className="text-base sm:text-lg lg:text-xl text-gray-600 max-w-2xl mx-auto px-4">
                  Discover and purchase ready-to-use workflows from the community
                </p>
              </div>

              <div className="max-w-2xl mx-auto mb-6 sm:mb-8">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 sm:h-5 sm:w-5" />
                  <Input
                    type="text"
                    placeholder="Search workflows..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 sm:py-3 text-sm sm:text-base lg:text-lg"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between mb-4">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="popular">Most Popular</SelectItem>
                    <SelectItem value="newest">Newest</SelectItem>
                    <SelectItem value="price_low">Price: Low to High</SelectItem>
                    <SelectItem value="price_high">Price: High to Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          {featuredWorkflows.length > 0 && (
            <section className="py-8 sm:py-12 bg-gradient-to-br from-yellow-50 to-orange-50">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center gap-2 mb-4 sm:mb-6">
                  <Crown className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-500" />
                  <h2 className="text-xl sm:text-2xl font-bold">Featured Workflows</h2>
                </div>
                
                {loadingFeatured ? (
                  <LoadingSkeleton />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {featuredWorkflows.map((item: WorkflowListing) => (
                      <WorkflowCard key={item.workflow.id} item={item} />
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

          <section className="py-8 sm:py-12 lg:py-16 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <Tabs defaultValue="browse" className="w-full">
                <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
                  <TabsTrigger value="browse">Browse Workflows</TabsTrigger>
                  <TabsTrigger value="purchases">My Purchases</TabsTrigger>
                </TabsList>

                <TabsContent value="browse">
                  <div className="mb-6">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                      {searchQuery ? `Search results for "${searchQuery}"` : "All Workflows"}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {paginatedWorkflows.length} workflows found
                    </p>
                  </div>

                  {loadingBestsellers ? (
                    <LoadingSkeleton />
                  ) : paginatedWorkflows.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Search className="h-8 w-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        No workflows found
                      </h3>
                      <p className="text-gray-600 mb-6">
                        Try adjusting your search or filters
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSearchQuery("");
                          setSelectedCategory("all");
                        }}
                      >
                        Clear filters
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                        {paginatedWorkflows.map((item: WorkflowListing) => (
                          <WorkflowCard key={item.workflow.id} item={item} />
                        ))}
                      </div>

                      {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-2 mt-8">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                          >
                            Previous
                          </Button>
                          <span className="text-sm text-muted-foreground px-4">
                            Page {currentPage} of {totalPages}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                          >
                            Next
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </TabsContent>

                <TabsContent value="purchases">
                  <div className="mb-6">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                      My Purchased Workflows
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {myPurchases.length} workflows purchased
                    </p>
                  </div>

                  {loadingPurchases ? (
                    <LoadingSkeleton />
                  ) : myPurchases.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <GitBranch className="h-8 w-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        No purchases yet
                      </h3>
                      <p className="text-gray-600 mb-6">
                        Browse the marketplace to find workflows you can use
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                      {myPurchases.map((purchase: any) => (
                        <WorkflowCard
                          key={purchase.purchase.id}
                          item={{
                            workflow: purchase.workflow,
                            pricing: null,
                            creator: purchase.seller,
                          }}
                          isPurchased={true}
                        />
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </section>

          <section className="py-12 sm:py-16 bg-gradient-to-r from-purple-50 to-blue-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="bg-white rounded-xl p-6 sm:p-8 text-center shadow-lg">
                <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">Want to sell your workflows?</h2>
                <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6 max-w-2xl mx-auto px-4">
                  Publish your workflows to the marketplace and earn 70% revenue share on every sale.
                </p>
                <Button size="lg" onClick={() => setLocation("/workflows")} className="w-full sm:w-auto">
                  Start Creating
                </Button>
              </div>
            </div>
          </section>
        </div>
      </div>

      {selectedWorkflowId && (
        <WorkflowDetailModal
          workflowId={selectedWorkflowId}
          open={!!selectedWorkflowId}
          onOpenChange={(open) => {
            if (!open) setSelectedWorkflowId(null);
          }}
        />
      )}
    </>
  );
}
