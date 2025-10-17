import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import NavigationHeader from "@/components/navigation-header";
import Footer from "@/components/footer";
import LazyFxnCard from "@/components/lazy-fxn-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Filter, Crown, DollarSign, X } from "lucide-react";
import { Fxn } from "@shared/schema";
import { Helmet } from "react-helmet-async";
import TagBadge from "@/components/tag-badge";
import { apiRequest } from "@/lib/api";

const categories = [
  { id: "all", name: "All Tools", count: 0 },
  { id: "calculator", name: "Calculators", count: 0 },
  { id: "converter", name: "Converters", count: 0 },
  { id: "developer", name: "Developers", count: 0 },
  { id: "health", name: "Health", count: 0 },
  { id: "design", name: "Design", count: 0 },
  { id: "finance", name: "Finance", count: 0 },
];

interface Tag {
  id: string;
  name: string;
  slug: string;
  color: string | null;
}

interface FxnWithTags extends Fxn {
  tags?: Array<{id: string, name: string, slug: string, color: string | null}>;
  pricing?: {
    pricingModel: string;
    price: number;
  };
  salesCount?: number;
}

export default function ExplorePage() {
  const [loc, setLocation] = useLocation();
  
  const [selectedTagSlugs, setSelectedTagSlugs] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    const qs = new URLSearchParams(window.location.search);
    const tagsParam = qs.get("tags");
    return tagsParam ? tagsParam.split(",").filter(Boolean) : [];
  });
  
  useEffect(() => {
    const qs = new URLSearchParams(window.location.search);
    if (qs.has("category")) {
      const qCategory = qs.get("category") ?? "all";
      if (qCategory !== selectedCategory) setSelectedCategory(qCategory);
    }
    if (qs.has("tags")) {
      const tagsParam = qs.get("tags") ?? "";
      const tagSlugs = tagsParam.split(",").filter(Boolean);
      setSelectedTagSlugs(tagSlugs);
    }
  }, [loc]);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>(() => {
    if (typeof window === "undefined") return "all";
    const qs = new URLSearchParams(window.location.search);
    return qs.get("category") ?? "all";
  });
  const [sortBy, setSortBy] = useState("relevance");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const selectCategory = (catId: string) => {
    setSelectedCategory(catId);
    const qs = new URLSearchParams();
    if (catId !== "all") qs.set("category", catId);
    if (selectedTagSlugs.length > 0) qs.set("tags", selectedTagSlugs.join(","));
    setLocation(`/explore${qs.toString() ? `?${qs.toString()}` : ""}`);
  };

  const toggleTag = (tagSlug: string) => {
    const newTags = selectedTagSlugs.includes(tagSlug)
      ? selectedTagSlugs.filter(s => s !== tagSlug)
      : [...selectedTagSlugs, tagSlug];
    
    setSelectedTagSlugs(newTags);
    
    const qs = new URLSearchParams();
    if (selectedCategory !== "all") qs.set("category", selectedCategory);
    if (newTags.length > 0) qs.set("tags", newTags.join(","));
    setLocation(`/explore${qs.toString() ? `?${qs.toString()}` : ""}`);
  };

  const clearTags = () => {
    setSelectedTagSlugs([]);
    const qs = new URLSearchParams();
    if (selectedCategory !== "all") qs.set("category", selectedCategory);
    setLocation(`/explore${qs.toString() ? `?${qs.toString()}` : ""}`);
  };

  const { data: tagsData } = useQuery<{ tags: Tag[] }>({
    queryKey: ["/api/tags"],
    queryFn: async () => {
      const res = await fetch("/api/tags", { credentials: "include", headers: { 'X-Requested-With': 'fetch' } });
      if (!res.ok) throw new Error("Failed to fetch tags");
      return res.json();
    },
  });

  const allTags = tagsData?.tags || [];

  const { data: featuredData, isLoading: loadingFeatured } = useQuery({
    queryKey: ["marketplace-featured"],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/marketplace/featured');
      if (!response.ok) throw new Error("Failed to fetch featured tools");
      return response.json();
    },
  });

  const { data, isLoading, error } = useQuery<{ fxns: FxnWithTags[] }>({
    queryKey: [
      "/api/discovery/search",
      {
        search: debouncedSearchQuery || undefined,
        category: selectedCategory !== "all" ? selectedCategory : undefined,
        sort: sortBy,
        tags: selectedTagSlugs.length > 0 ? selectedTagSlugs.join(",") : undefined,
      },
    ],
    queryFn: async ({ queryKey }) => {
      const [, { search, category, sort, tags }] = queryKey as [
        string,
        { search?: string; category?: string; sort: string; tags?: string }
      ];
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (category) params.append("category", category);
      if (sort) params.append("sort", sort);
      if (tags) params.append("tags", tags);
      const url = `/api/discovery/search${
        params.toString() ? `?${params.toString()}` : ""
      }`;
      const res = await fetch(url, { credentials: "include", headers: { 'X-Requested-With': 'fetch' } });
      if (!res.ok) throw new Error("Failed to fetch tools");
      return res.json();
    },
  });

  const fxns = data?.fxns ?? [];
  const allFxns = fxns;

  const categoriesWithCounts = categories.map((cat) => ({
    ...cat,
    count:
      cat.id === "all"
        ? allFxns.length
        : allFxns.filter((f) => f.category === cat.id).length,
  }));

  const handleFxnClick = (fxn: Fxn) => {
    setLocation(`/fxn/${fxn.slug}`);
  };

  const formatPrice = (cents: number) => {
    return `${(cents / 100).toFixed(2)}`;
  };

  const FeaturedToolCard = ({ tool }: { tool: any }) => {
    const pricing = tool.pricing || {};
    const fxn = tool.fxn || tool;
    const creator = tool.creator || {};

    return (
      <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setLocation(`/fxn/${fxn.slug}`)}>
        <CardHeader className="p-4 sm:p-6">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base sm:text-lg truncate">{fxn.title}</CardTitle>
              <CardDescription className="line-clamp-2 mt-1 text-xs sm:text-sm">
                {fxn.description}
              </CardDescription>
            </div>
            <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500 flex-shrink-0" />
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <div className="flex items-center justify-between text-xs sm:text-sm text-muted-foreground">
            <span className="capitalize truncate">{fxn.category}</span>
            {creator.name && <span className="truncate ml-2">by {creator.name}</span>}
          </div>
        </CardContent>
        <CardFooter className="p-4 sm:p-6 pt-0 flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-2">
          <div className="flex items-center gap-2 justify-between sm:justify-start flex-1">
            {pricing.pricingModel === 'free' ? (
              <Badge variant="secondary" className="text-xs">Free</Badge>
            ) : (
              <Badge className="bg-green-600 hover:bg-green-700 text-xs">
                <DollarSign className="w-3 h-3 mr-1" />
                {formatPrice(pricing.price)}
                {pricing.pricingModel === 'subscription' && '/mo'}
              </Badge>
            )}
            {tool.salesCount > 0 && (
              <span className="text-xs text-muted-foreground">
                {tool.salesCount} sales
              </span>
            )}
          </div>
          <Button variant="outline" size="sm" className="w-full sm:w-auto">
            View Tool
          </Button>
        </CardFooter>
      </Card>
    );
  };

  return (
    <>
      <Helmet>
        <title>Explore Tools - fxns</title>
        <meta
          name="description"
          content="Explore our complete collection of micro-tools designed to simplify your everyday tasks. Browse featured tools, calculators, converters, and more."
        />
        <meta property="og:title" content="Explore Tools - fxns" />
        <meta property="og:description" content="Explore our complete collection of micro-tools designed to simplify your everyday tasks." />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="https://www.fxns.ca/explore" />
      </Helmet>
      <div className="min-h-screen bg-neutral-50">
        {/* <NavigationHeader /> */}
        <div>
          <section className="bg-gradient-to-br from-blue-50 via-white to-violet-50 py-8 sm:py-12 lg:py-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-6 sm:mb-8">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
                  Explore Tools
                </h1>
                <p className="text-base sm:text-lg lg:text-xl text-gray-600 max-w-2xl mx-auto px-4">
                  Browse our complete collection of micro-tools designed to
                  simplify your everyday tasks
                </p>
              </div>

              <div className="max-w-2xl mx-auto mb-6 sm:mb-8">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 sm:h-5 sm:w-5" />
                  <Input
                    type="text"
                    placeholder="Search for tools, calculators, converters..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 sm:py-3 text-sm sm:text-base lg:text-lg"
                    data-testid="input-search"
                  />
                </div>
              </div>

              <div className="flex flex-wrap justify-center gap-2 mb-4">
                {categoriesWithCounts.map((category) => (
                  <Button
                    key={category.id}
                    variant={
                      selectedCategory === category.id ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => selectCategory(category.id)}
                    className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
                    data-testid={`filter-${category.id}`}
                  >
                    <span>{category.name}</span>
                    {category.count > 0 && (
                      <Badge variant="secondary" className="ml-1 text-xs">
                        {category.count}
                      </Badge>
                    )}
                  </Button>
                ))}
              </div>

              {allTags.length > 0 && (
                <div className="max-w-4xl mx-auto">
                  <div className="text-center mb-3">
                    <p className="text-sm text-gray-600">Filter by tags:</p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2">
                    {allTags.slice(0, 8).map((tag) => (
                      <TagBadge
                        key={tag.id}
                        name={tag.name}
                        color={tag.color || undefined}
                        onClick={() => toggleTag(tag.slug)}
                        className={`text-xs cursor-pointer ${
                          selectedTagSlugs.includes(tag.slug)
                            ? "ring-2 ring-offset-1 ring-blue-500"
                            : ""
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {selectedTagSlugs.length > 0 && (
                <div className="max-w-4xl mx-auto mt-4 p-3 bg-blue-50 rounded-lg">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">Active filters:</span>
                    {selectedTagSlugs.map((slug) => {
                      const tag = allTags.find(t => t.slug === slug);
                      return tag ? (
                        <TagBadge
                          key={tag.id}
                          name={tag.name}
                          color={tag.color || undefined}
                          onRemove={() => toggleTag(tag.slug)}
                          className="text-xs"
                        />
                      ) : null;
                    })}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearTags}
                      className="h-6 text-xs"
                    >
                      Clear all
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </section>

          {featuredData?.tools?.length > 0 && (
            <section className="py-8 sm:py-12 bg-gradient-to-br from-yellow-50 to-orange-50">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center gap-2 mb-4 sm:mb-6">
                  <Crown className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-500" />
                  <h2 className="text-xl sm:text-2xl font-bold">Featured Tools</h2>
                </div>
                
                {loadingFeatured ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {[1, 2, 3].map((i) => (
                      <Card key={i}>
                        <CardHeader>
                          <div className="h-6 bg-gray-200 rounded mb-2 w-3/4 animate-pulse"></div>
                          <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
                        </CardHeader>
                        <CardContent>
                          <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {featuredData.tools.map((tool: any) => (
                      <FeaturedToolCard key={tool.fxn.id} tool={tool} />
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

          <section className="py-8 sm:py-12 lg:py-16 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-6 sm:mb-8">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                  {debouncedSearchQuery
                    ? `Search results for "${debouncedSearchQuery}"`
                    : selectedCategory === "all"
                    ? "All Tools"
                    : categories.find((c) => c.id === selectedCategory)?.name}
                </h2>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                    <Filter className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span>{fxns.length} tools found</span>
                  </div>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-full sm:w-40 text-sm">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="relevance">Relevance</SelectItem>
                      <SelectItem value="popular">Most Popular</SelectItem>
                      <SelectItem value="rating">Highest Rated</SelectItem>
                      <SelectItem value="recent">Recently Added</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div
                      key={i}
                      className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 animate-pulse"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                      </div>
                      <div className="h-4 bg-gray-200 rounded mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded mb-4 w-3/4"></div>
                      <div className="flex items-center justify-between">
                        <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                        <div className="h-5 bg-gray-200 rounded w-16"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : fxns.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No tools found
                  </h3>
                  <p className="text-gray-600 mb-6">
                    {searchQuery
                      ? "Try adjusting your search terms or browse by category"
                      : "No tools are available in this category yet"}
                  </p>
                  {searchQuery && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchQuery("");
                        setSelectedCategory("all");
                      }}
                      data-testid="button-clear-search"
                    >
                      Clear search
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {fxns.map((fxn) => (
                    <LazyFxnCard
                      key={fxn.id}
                      fxn={fxn}
                      onClick={() => handleFxnClick(fxn)}
                      tags={fxn.tags}
                      pricing={fxn.pricing}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="py-12 sm:py-16 bg-gradient-to-r from-purple-50 to-blue-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="bg-white rounded-xl p-6 sm:p-8 text-center shadow-lg">
                <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">Want to sell your tools?</h2>
                <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6 max-w-2xl mx-auto px-4">
                  Create and monetize your custom tools on the fxns marketplace. Earn 70% revenue share on every sale.
                </p>
                <Button size="lg" onClick={() => setLocation("/create-tool")} className="w-full sm:w-auto">
                  Start Building
                </Button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
