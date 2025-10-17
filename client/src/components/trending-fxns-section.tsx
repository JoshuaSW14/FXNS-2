import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Calculator, ArrowRightLeft, Code, Play, Heart, Star } from "lucide-react";
import { Fxn } from "@shared/schema";
import { useLocation } from "wouter";

const nf = new Intl.NumberFormat();

interface TrendingFxnsSectionProps {
    onFxnClick: (fxn: Fxn) => void;
}

export default function TrendingFxnsSection({ onFxnClick }: TrendingFxnsSectionProps) {
    const [, setLocation] = useLocation();
    const { data: fxnsData, isLoading } = useQuery<{ fxns: Fxn[] }>({
        queryKey: ["/api/discovery/trending"],
        queryFn: async () => {
            const res = await fetch("/api/discovery/trending?limit=6", {
                credentials: "include",
                headers: { 'X-Requested-With': 'fetch' }
            });
            if (!res.ok) throw new Error("Failed to fetch trending tools");
            return res.json();
        }
    });

    const trendingFxns = fxnsData?.fxns || [];

    const getIcon = (category: string) => {
        switch (category) {
            case "calculator":
                return Calculator;
            case "converter":
                return ArrowRightLeft;
            case "developer":
                return Code;
            default:
                return Calculator;
        }
    };

    const getIconColor = (category: string) => {
        switch (category) {
            case "calculator":
                return "bg-primary-100 text-primary-600 group-hover:bg-primary-200";
            case "converter":
                return "bg-violet-100 text-violet-600 group-hover:bg-violet-200";
            case "developer":
                return "bg-emerald-100 text-emerald-600 group-hover:bg-emerald-200";
            default:
                return "bg-primary-100 text-primary-600 group-hover:bg-primary-200";
        }
    };

    if (isLoading) {
        return (
            <section className="py-16 bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center mb-12">
                        <div>
                            <h2 className="text-3xl font-bold text-gray-900 mb-2">Trending Tools</h2>
                            <p className="text-gray-600">Most popular shortcuts this week</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <Card key={i} className="h-48 animate-pulse">
                                <CardContent className="p-6">
                                    <div className="bg-gray-200 rounded-lg w-12 h-12 mb-4"></div>
                                    <div className="bg-gray-200 rounded w-3/4 h-4 mb-2"></div>
                                    <div className="bg-gray-200 rounded w-full h-3 mb-4"></div>
                                    <div className="bg-gray-200 rounded w-1/2 h-3"></div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className="py-16 bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center mb-12">
                    <div>
                        <h2 className="text-3xl font-bold text-gray-900 mb-2">Trending Tools</h2>
                        <p className="text-gray-600">Most popular shortcuts this week</p>
                    </div>
                    <Button variant="ghost" className="text-primary-600 hover:text-primary-700" data-testid="link-view-all" onClick={() => setLocation("/explore")}>
                        View all <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {trendingFxns.map((fxn, index) => {
                        const runs = (fxn as any).runCount ?? 0;
                        const favorites = (fxn as any).favoriteCount ?? 0;
                        const Icon = getIcon(fxn.category);
                        return (
                            <Card
                                key={fxn.id}
                                className="cursor-pointer group hover:shadow-lg hover:border-primary-200 transition-all duration-200"
                                onClick={() => onFxnClick(fxn)}
                                data-testid={`fxn-card-${fxn.slug}`}
                            >
                                <CardContent className="p-6">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getIconColor(fxn.category)}`}>
                                            <Icon className="h-5 w-5" />
                                        </div>
                                        {index === 0 && (
                                            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                                                Hot
                                            </Badge>
                                        )}
                                        {index === 1 && (
                                            <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                                                Popular
                                            </Badge>
                                        )}
                                    </div>
                                    <h3 className="font-semibold text-gray-900 mb-2">{fxn.title}</h3>
                                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">{fxn.description}</p>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                                            {Number((fxn as any).avgRating) > 0 && (
                                                <span className="flex items-center">
                                                    <Star className="mr-1 h-3 w-3 fill-yellow-400 text-yellow-400" />
                                                    {Number((fxn as any).avgRating).toFixed(1)}
                                                </span>
                                            )}
                                            <span className="flex items-center">
                                                <Play className="mr-1 h-3 w-3" />
                                                {nf.format(runs)}
                                            </span>
                                            <span className="flex items-center">
                                                <Heart className="mr-1 h-3 w-3" />
                                                {nf.format(favorites)}
                                            </span>
                                        </div>
                                        <Badge variant="secondary" className="text-xs">
                                            {fxn.category}
                                        </Badge>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
