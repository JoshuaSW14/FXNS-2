import { Calculator, ArrowRightLeft, Code, Dumbbell, Palette, TrendingUp } from "lucide-react";
import { Fxn } from "@shared/schema";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";

interface CategoriesSectionProps {
    onCategoryClick: (category: string) => void;
}

const categories = [
    {
        id: "calculator",
        name: "Calculators",
        icon: Calculator,
        count: 0,
        color: "primary",
    },
    {
        id: "converter",
        name: "Converters",
        icon: ArrowRightLeft,
        count: 0,
        color: "violet",
    },
    {
        id: "developer",
        name: "Developers",
        icon: Code,
        count: 0,
        color: "emerald",
    },
    {
        id: "health",
        name: "Health",
        icon: Dumbbell,
        count: 0,
        color: "orange",
    },
    {
        id: "design",
        name: "Design",
        icon: Palette,
        count: 0,
        color: "pink",
    },
    {
        id: "finance",
        name: "Finance",
        icon: TrendingUp,
        count: 0,
        color: "indigo",
    },
];

export default function CategoriesSection({ onCategoryClick }: CategoriesSectionProps) {
    const [, setLocation] = useLocation();
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("all");

    // replace the single useQuery with two:

    // 1) always fetch all (within search scope) -> used for counts and "All Tools" view
    const { data: allData, isLoading: isLoadingAll } = useQuery<{ fxns: Fxn[] }>({
        queryKey: ["/api/tools", { search: searchQuery || undefined }],
        queryFn: async ({ queryKey }) => {
            const [, { search }] = queryKey as [string, { search?: string }];
            const params = new URLSearchParams();
            if (search) params.append("search", search);
            const url = `/api/tools${params.toString() ? `?${params.toString()}` : ""}`;
            const res = await fetch(url, { credentials: "include", headers: { 'X-Requested-With': 'fetch' } });
            if (!res.ok) throw new Error("Failed to fetch fxns");
            return res.json();
        },
    });

    // 2) fetch filtered list only when a category (other than "all") is selected
    const { data: filteredData, isLoading: isLoadingFiltered } = useQuery<{ fxns: Fxn[] }>({
        queryKey: ["/api/tools", { category: selectedCategory, search: searchQuery || undefined }],
        enabled: selectedCategory !== "all", // don't run when viewing "All Tools"
        queryFn: async ({ queryKey }) => {
            const [, { category, search }] = queryKey as [string, { category?: string; search?: string }];
            const params = new URLSearchParams();
            if (category && category !== "all") params.append("category", category);
            if (search) params.append("search", search);
            const url = `/api/tools${params.toString() ? `?${params.toString()}` : ""}`;
            const res = await fetch(url, { credentials: "include", headers: { 'X-Requested-With': 'fetch' } });
            if (!res.ok) throw new Error("Failed to fetch tools");
            return res.json();
        },
    });

    // derive the list to render
    const allFxns = allData?.fxns ?? [];
    const fxns = selectedCategory === "all" ? allFxns : (filteredData?.fxns ?? []);

    // compute counts from the unfiltered (search-scoped) set
    const categoriesWithCounts = categories.map((cat) => ({
        ...cat,
        count: cat.id === "all" ? allFxns.length : allFxns.filter((f) => f.category === cat.id).length,
    }));

    const getColorClasses = (color: string) => {
        const colorMap = {
            primary: "bg-primary-100 text-primary-600 group-hover:bg-primary-200",
            violet: "bg-violet-100 text-violet-600 group-hover:bg-violet-200",
            emerald: "bg-emerald-100 text-emerald-600 group-hover:bg-emerald-200",
            orange: "bg-orange-100 text-orange-600 group-hover:bg-orange-200",
            pink: "bg-pink-100 text-pink-600 group-hover:bg-pink-200",
            indigo: "bg-indigo-100 text-indigo-600 group-hover:bg-indigo-200",
        };
        return colorMap[color as keyof typeof colorMap] || colorMap.primary;
    };

    return (
        <section className="py-16 bg-white" id="categories">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold text-gray-900 mb-4">Browse by Category</h2>
                    <p className="text-gray-600 max-w-2xl mx-auto">
                        Discover tools organized by the tasks you need to accomplish
                    </p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {categoriesWithCounts.map((category) => {
                        const Icon = category.icon;
                        return (
                            <div
                                key={category.id}
                                className="group cursor-pointer"
                                onClick={() => setLocation(`/explore?category=${category.id}`)}
                                data-testid={`category-${category.id}`}
                            >
                                <div className="bg-gray-50 rounded-xl p-6 text-center group-hover:bg-primary-50 group-hover:border-primary-200 border-2 border-transparent transition-all duration-200">
                                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-3 ${getColorClasses(category.color)}`}>
                                        <Icon className="h-5 w-5" />
                                    </div>
                                    <h3 className="font-semibold text-gray-900 mb-1">{category.name}</h3>
                                    <p className="text-sm text-gray-500">{category.count} tools</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
