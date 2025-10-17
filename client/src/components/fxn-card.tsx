import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calculator, ArrowRightLeft, Code, Dumbbell, Palette, TrendingUp, Play, Heart, DollarSign } from "lucide-react";
import { Fxn } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import TagBadge from "./tag-badge";

interface FxnCardProps {
    fxn: Fxn;
    onClick: () => void;
    showBadge?: boolean;
    badgeText?: string;
    badgeVariant?: "default" | "secondary" | "destructive" | "outline";
    tags?: Array<{id: string, name: string, slug: string, color: string | null}>;
    pricing?: {
        pricingModel: string;
        price: number;
    };
}

interface Tag {
    id: string;
    name: string;
    slug: string;
    color: string | null;
}

const nf = new Intl.NumberFormat();

export default function FxnCard({ fxn, onClick, showBadge, badgeText, badgeVariant = "default", tags: tagsProp, pricing }: FxnCardProps) {
    const [, setLocation] = useLocation();

    // Fetch tags for this tool only if not provided via props
    const { data: tagsData } = useQuery<{ tags: Tag[] }>({
        queryKey: [`/api/tags/for-tool/${fxn.id}`],
        queryFn: async () => {
            const res = await fetch(`/api/tags/for-tool/${fxn.id}`, { credentials: 'include', headers: { 'X-Requested-With': 'fetch' } });
            if (!res.ok) throw new Error('Failed to fetch tags');
            return res.json();
        },
        enabled: !tagsProp,
    });

    const tags = tagsProp || tagsData?.tags || [];

    const handleTagClick = (tagSlug: string) => () => {
        setLocation(`/explore?tags=${tagSlug}`);
    };

    const getIcon = (category: string) => {
        switch (category) {
            case "calculator":
                return Calculator;
            case "converter":
                return ArrowRightLeft;
            case "developer":
                return Code;
            case "health":
                return Dumbbell;
            case "design":
                return Palette;
            case "finance":
                return TrendingUp;
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
            case "health":
                return "bg-orange-100 text-orange-600 group-hover:bg-orange-200";
            case "design":
                return "bg-pink-100 text-pink-600 group-hover:bg-pink-200";
            case "finance":
                return "bg-indigo-100 text-indigo-600 group-hover:bg-indigo-200";
            default:
                return "bg-primary-100 text-primary-600 group-hover:bg-primary-200";
        }
    };

    const Icon = getIcon(fxn.category);

    const runs = (fxn as any).runCount ?? (fxn as any).runs ?? 0;
    const favorites = (fxn as any).favoriteCount ?? (fxn as any).favorites ?? 0;

    const formatPrice = (cents: number) => {
        return `${(cents / 100).toFixed(2)}`;
    };

    return (
        <Card
            className="cursor-pointer group hover:shadow-lg hover:border-primary-200 transition-all duration-200 bg-white h-full"
            onClick={onClick}
            data-testid={`fxn-card-${fxn.slug}`}
        >
            <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getIconColor(fxn.category)}`}>
                        <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex gap-2">
                        {fxn.accessTier === 'pro' && (
                            <Badge
                                className="bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 hover:from-purple-200 hover:to-pink-200 dark:from-purple-900/20 dark:to-pink-900/20 dark:text-purple-300"
                            >
                                PRO
                            </Badge>
                        )}
                        {showBadge && badgeText && (
                            <Badge
                                variant={badgeVariant}
                                className={
                                    badgeVariant === "default"
                                        ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                                        : undefined
                                }
                            >
                                {badgeText}
                            </Badge>
                        )}
                    </div>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{fxn.title}</h3>
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">{fxn.description}</p>
                
                {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                        {tags.slice(0, 3).map((tag) => (
                            <TagBadge
                                key={tag.id}
                                name={tag.name}
                                color={tag.color || undefined}
                                onClick={handleTagClick(tag.slug)}
                                className="text-xs"
                            />
                        ))}
                        {tags.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                                +{tags.length - 3}
                            </Badge>
                        )}
                    </div>
                )}
                
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span className="flex items-center">
                            <Play className="mr-1 h-3 w-3" />
                            {nf.format(runs)} runs
                        </span>
                        <span className="flex items-center">
                            <Heart className="mr-1 h-3 w-3" />
                            {nf.format(favorites)}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        {fxn.accessTier === 'pro' ? (
                            <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 text-xs font-semibold">
                                PRO ONLY
                            </Badge>
                        ) : pricing && pricing.pricingModel === 'one_time' ? (
                            <Badge className="bg-green-600 text-white hover:bg-green-700 text-xs font-semibold">
                                <DollarSign className="h-3 w-3 mr-0.5" />
                                {formatPrice(pricing.price)}
                            </Badge>
                        ) : pricing && pricing.pricingModel === 'free' ? (
                            <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 text-xs font-semibold">
                                FREE
                            </Badge>
                        ) : null}
                        <Badge variant="secondary" className="text-xs capitalize">
                            {fxn.category}
                        </Badge>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
