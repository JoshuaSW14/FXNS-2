import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import Footer from "@/components/footer";
import FxnCard from "@/components/fxn-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
    Plus,
    Download,
    Settings as SettingsIcon,
    Settings,
    ExternalLink,
    Play,
    Calendar,
    Heart,
    TrendingUp,
    Search,
    Filter,
    BarChart3,
    Users,
    Eye,
    Zap,
    FileText,
    Clock,
    Star,
    ChevronRight,
    Activity,
    Target,
    Sparkles
} from "lucide-react";
import { Fxn, Run } from "@shared/schema";
import AnalyticsDashboard from "@/components/analytics/AnalyticsDashboard";

interface Analytics {
  myTools: {
    total: number | string;
    published: number | string;
    totalViews: number | string;
    totalFavorites: number | string;
  };
  usage: {
    totalRuns: number | string;
    averageRunTime: number;
    successRate: number;
  };
  engagement: {
    totalSessions: number | string;
    averageSessionDuration: number;
    toolsCreated: number;
    toolsPublished: number | string;
    favoriteTools: number;
    lastActive: ISODateString;
    retentionScore: number;
    engagementLevel: "high" | "medium" | "low" | string;
  };
  recentActivity: RecentActivity[];
  topTools: TopTool[];
  insights: string[];
  totalRuns: number | string;
  toolViews: number | string;
  toolsCreated: number;
  averageRating: number;
  topCategories: string[];
  recentGrowth: string[];
  popularTools: TopTool[];
}

export interface RecentActivity {
  toolId: string;
  toolName: string;
  lastUsed: ISODateString;
  runCount: number | string;
}

export type ISODateString = string;

/** Popular tool summary. */
export interface TopTool {
  toolId: string;
  toolName: string;
  category: string;
  totalRuns: number | string;
  uniqueUsers: number | string;
}

interface DashboardData {
    favorites: Fxn[];
    recentRuns: (Run & { fxn?: { title: string; category: string } })[];
    analytics?: Analytics;
    drafts?: {
        id: string;
        name: string;
        status: 'draft' | 'testing' | 'published';
        updatedAt: string;
        category: string;
        progress: number;
    }[];
}

export default function DashboardPage() {
    const [, setLocation] = useLocation();
    const { user } = useAuth();
    const { toast } = useToast();
    
    // Enhanced state management
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [sortBy, setSortBy] = useState('recent');
    const [activeTab, setActiveTab] = useState('overview');
    const [isExporting, setIsExporting] = useState(false);

    // Fetch the user's own tools (public + private)
    const { data: myFxnsResp } = useQuery<{ tools: (Fxn & { runCount: number })[] }>({
        queryKey: ["/api/tools/me"],
        queryFn: async () => {
            const res = await fetch("/api/tools/me", { credentials: "include", headers: { 'X-Requested-With': 'fetch' } });
            if (!res.ok) throw new Error("Failed to fetch my tools");
            return res.json();
        },
        enabled: !!user,
    });

    const myFxns = myFxnsResp?.tools ?? [];

    const { data: dashboardData, isLoading } = useQuery<DashboardData>({
        queryKey: ["/api/me/dashboard"],
        queryFn: async () => {
            const res = await fetch("/api/me/dashboard", {
                credentials: 'include',
                headers: { 'X-Requested-With': 'fetch' }
            });
            if (!res.ok) throw new Error('Failed to fetch dashboard data');
            return res.json();
        },
        enabled: !!user,
    });

    const favorites = dashboardData?.favorites || [];
    const recentRuns = dashboardData?.recentRuns || [];
    const analytics = dashboardData?.analytics;
    const drafts = dashboardData?.drafts || [];

    // Enhanced filtering and sorting
    const filteredTools = myFxns.filter((tool: Fxn) => {
        const matchesSearch = tool.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (tool.description?.toLowerCase() || '').includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || tool.category === selectedCategory;
        return matchesSearch && matchesCategory;
    }).sort((a, b) => {
        switch (sortBy) {
            case 'recent':
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            case 'popular':
                return (b.runCount || 0) - (a.runCount || 0);
            case 'name':
                return a.title.localeCompare(b.title);
            default:
                return 0;
        }
    });

    const categories = ['calculator', 'converter', 'developer', 'design', 'productivity', 'utility', 'finance', 'health', 'security'];

    const handleFxnClick = (fxn: Fxn) => {
        setLocation(`/fxn/${fxn.id}`);
    };

    const handleTestDraft = async (draftId: string) => {
        try {
            const response = await fetch(`/api/tool-builder/drafts/${draftId}/test`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'X-Requested-With': 'fetch' }
            });
            if (response.ok) {
                // Invalidate relevant queries instead of page reload
                await Promise.all([
                    queryClient.invalidateQueries({ queryKey: ['/api/me/dashboard'] }),
                    queryClient.invalidateQueries({ queryKey: ['/api/tool-builder/drafts'] })
                ]);
            }
        } catch (error) {
            console.error('Failed to test draft:', error);
        }
    };

    const handlePublishDraft = async (draftId: string) => {
        try {
            const response = await fetch(`/api/tool-builder/drafts/${draftId}/publish`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'X-Requested-With': 'fetch' }
            });
            if (response.ok) {
                // Invalidate relevant queries to show published tool
                await Promise.all([
                    queryClient.invalidateQueries({ queryKey: ['/api/me/dashboard'] }),
                    queryClient.invalidateQueries({ queryKey: ['/api/tools/me'] }),
                    queryClient.invalidateQueries({ queryKey: ['/api/tool-builder/drafts'] }),
                    queryClient.invalidateQueries({ queryKey: ['/api/tools'] }) // Also refresh discover page data
                ]);
            }
        } catch (error) {
            console.error('Failed to publish draft:', error);
        }
    };

    const handleDeleteDraft = async (draftId: string) => {
        if (confirm('Are you sure you want to delete this draft? This action cannot be undone.')) {
            try {
                const response = await fetch(`/api/tool-builder/drafts/${draftId}`, {
                    method: 'DELETE',
                    credentials: 'include',
                    headers: { 'X-Requested-With': 'fetch' }
                });
                if (response.ok) {
                    // Invalidate relevant queries to remove deleted draft
                    await Promise.all([
                        queryClient.invalidateQueries({ queryKey: ['/api/me/dashboard'] }),
                        queryClient.invalidateQueries({ queryKey: ['/api/tool-builder/drafts'] })
                    ]);
                }
            } catch (error) {
                console.error('Failed to delete draft:', error);
            }
        }
    };

    const handleExportData = async () => {
        setIsExporting(true);
        try {
            const response = await fetch('/api/me/export', {
                method: 'GET',
                credentials: 'include',
                headers: { 'X-Requested-With': 'fetch' }
            });
            
            if (!response.ok) {
                throw new Error('Failed to export data');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `fxns-export-${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toast({
                title: "Export Successful",
                description: "Your data has been downloaded successfully.",
            });
        } catch (error) {
            console.error('Failed to export data:', error);
            toast({
                title: "Export Failed",
                description: "There was an error exporting your data. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsExporting(false);
        }
    };

    const quickActions = [
        {
            icon: Plus,
            title: "Create Custom Tool",
            description: "Build your own micro-tool",
            isPro: true,
            action: () => {
                setLocation('/create-tool');
            },
        },
        {
            icon: Download,
            title: "Export Data",
            description: "Download your usage data",
            action: handleExportData,
        },
        {
            icon: SettingsIcon,
            title: "Account Settings",
            description: "Manage your account",
            action: () => setLocation('/settings'),
        },
    ];

    if (isLoading) {
        return (
            <div className="min-h-screen bg-neutral-50">
                {/* <NavigationHeader /> */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <div className="animate-pulse">
                        {/* Header skeleton */}
                        <div className="bg-gradient-to-r from-primary-50 to-violet-50 rounded-xl p-8 mb-8">
                            <div className="h-6 bg-gray-200 rounded mb-2 w-64"></div>
                            <div className="h-4 bg-gray-200 rounded w-48"></div>
                        </div>

                        {/* Content skeleton */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2">
                                <div className="h-6 bg-gray-200 rounded mb-6 w-32"></div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {[1, 2, 3, 4].map(i => (
                                        <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <div className="h-6 bg-gray-200 rounded mb-6 w-32"></div>
                                <div className="space-y-4">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="h-16 bg-gray-200 rounded-lg"></div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-neutral-50">
            {/* <NavigationHeader /> */}
            <div>
                <section className="py-16 bg-white">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        {/* Dashboard Header */}
                        <Card className="bg-gradient-to-r from-primary-50 to-violet-50 border border-primary-100 mb-8">
                            <CardContent className="p-4 sm:p-6 lg:p-8">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                    <div>
                                        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                                            Welcome back, {user?.name || 'there'}! 👋
                                        </h1>
                                        <p className="text-sm sm:text-base text-gray-600">
                                            You've favorited {favorites.length} tools and have {recentRuns.length} recent runs
                                        </p>
                                    </div>
                                    <div className="flex sm:hidden items-center justify-around gap-4 pt-2 border-t border-primary-200">
                                        <div className="text-center">
                                            <div className="text-xl font-bold text-primary-600">{favorites.length}</div>
                                            <div className="text-xs text-gray-600">Favorites</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-xl font-bold text-violet-600">{recentRuns.length}</div>
                                            <div className="text-xs text-gray-600">Runs</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-xl font-bold text-emerald-600">Free</div>
                                            <div className="text-xs text-gray-600">Plan</div>
                                        </div>
                                    </div>
                                    <div className="hidden sm:flex items-center gap-4 lg:gap-6">
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-primary-600">{favorites.length}</div>
                                            <div className="text-sm text-gray-600">Favorites</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-violet-600">{recentRuns.length}</div>
                                            <div className="text-sm text-gray-600">Runs</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-emerald-600">Free</div>
                                            <div className="text-sm text-gray-600">Plan</div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Main Dashboard Tabs */}
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                                <TabsList className="inline-flex w-auto sm:grid sm:w-full grid-cols-4 min-w-max sm:min-w-0">
                                    <TabsTrigger value="overview" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                                        <Activity className="h-3 w-3 sm:h-4 sm:w-4" />
                                        <span className="hidden sm:inline">Overview</span>
                                        <span className="sm:hidden">Home</span>
                                    </TabsTrigger>
                                    <TabsTrigger value="analytics" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                                        <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4" />
                                        <span className="hidden sm:inline">Analytics</span>
                                        <span className="sm:hidden">Stats</span>
                                    </TabsTrigger>
                                    <TabsTrigger value="tools" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                                        <Zap className="h-3 w-3 sm:h-4 sm:w-4" />
                                        <span className="hidden sm:inline">My Tools</span>
                                        <span className="sm:hidden">Tools</span>
                                    </TabsTrigger>
                                    <TabsTrigger value="drafts" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                                        <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
                                        Drafts
                                    </TabsTrigger>
                                </TabsList>
                            </div>

                            {/* Overview Tab */}
                            <TabsContent value="overview" className="space-y-6 sm:space-y-8">
                                {/* Quick Stats */}
                                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
                                    <Card>
                                        <CardContent className="p-4 sm:p-6">
                                            <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-2">
                                                <div>
                                                    <p className="text-xs sm:text-sm font-medium text-gray-600">Total Runs</p>
                                                    <p className="text-xl sm:text-2xl font-bold text-blue-600">
                                                        {analytics?.totalRuns || 0}
                                                    </p>
                                                </div>
                                                <Play className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardContent className="p-4 sm:p-6">
                                            <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-2">
                                                <div>
                                                    <p className="text-xs sm:text-sm font-medium text-gray-600">Tools Created</p>
                                                    <p className="text-xl sm:text-2xl font-bold text-green-600">
                                                        {analytics?.myTools.total || 0}
                                                    </p>
                                                </div>
                                                <Zap className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardContent className="p-4 sm:p-6">
                                            <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-2">
                                                <div>
                                                    <p className="text-xs sm:text-sm font-medium text-gray-600">Total Views</p>
                                                    <p className="text-xl sm:text-2xl font-bold text-purple-600">
                                                        {analytics?.myTools.totalViews || 0}
                                                    </p>
                                                </div>
                                                <Eye className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardContent className="p-4 sm:p-6">
                                            <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-2">
                                                <div>
                                                    <p className="text-xs sm:text-sm font-medium text-gray-600">Avg Rating</p>
                                                    <p className="text-xl sm:text-2xl font-bold text-yellow-600">
                                                        {analytics?.averageRating.toFixed(1) || 'N/A'}
                                                    </p>
                                                </div>
                                                <Star className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-600" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Pinned/Favorite Tools */}
                                <div>
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
                                    <h2 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center">
                                        <Heart className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-red-500" />
                                        Favorite Tools
                                    </h2>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setLocation('/explore')}
                                        data-testid="link-discover-tools"
                                        className="w-full sm:w-auto"
                                    >
                                        Explore more
                                    </Button>
                                </div>

                                {favorites.length === 0 ? (
                                    <Card className="border border-gray-200">
                                        <CardContent className="p-6 sm:p-12 text-center">
                                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <Heart className="h-8 w-8 text-gray-400" />
                                            </div>
                                            <h3 className="text-lg font-semibold text-gray-900 mb-2">No favorites yet</h3>
                                            <p className="text-gray-600 mb-6">
                                                Start exploring tools and favorite the ones you use most often
                                            </p>
                                            <Button onClick={() => setLocation('/explore')} data-testid="button-discover-tools">
                                                Explore Tools
                                            </Button>
                                        </CardContent>
                                    </Card>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3 sm:gap-4">
                                        {favorites.map((fxn : any) => (
                                            <FxnCard
                                                key={fxn.id}
                                                fxn={fxn}
                                                onClick={() => handleFxnClick(fxn)}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Enhanced My Tools Section with Search & Filters */}
                            <div>
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
                                    <h2 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center">
                                        My Tools
                                        <Badge variant="secondary" className="ml-2">{filteredTools.length}</Badge>
                                    </h2>
                                    <Button size="sm" onClick={() => setLocation('/create-tool')} data-testid="link-create-tool" className="w-full sm:w-auto">
                                        <Plus className="mr-1 h-4 w-4" /> New Tool
                                    </Button>
                                </div>

                                {/* Enhanced Search & Filter Controls */}
                                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4 sm:mb-6">
                                    <div className="flex-1">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                            <Input
                                                placeholder="Search your tools..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className="pl-10"
                                            />
                                        </div>
                                    </div>
                                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                        <SelectTrigger className="w-full sm:w-48 text-sm">
                                            <SelectValue placeholder="All Categories" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Categories</SelectItem>
                                            {categories.map((category) => (
                                                <SelectItem key={category} value={category}>
                                                    {category.charAt(0).toUpperCase() + category.slice(1)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Select value={sortBy} onValueChange={setSortBy}>
                                        <SelectTrigger className="w-full sm:w-32">
                                            <SelectValue placeholder="Sort by" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="recent">Recent</SelectItem>
                                            <SelectItem value="popular">Popular</SelectItem>
                                            <SelectItem value="name">Name</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {filteredTools.length === 0 ? (
                                    <Card className="border border-gray-200">
                                        <CardContent className="p-8 text-center">
                                            <h3 className="text-lg font-semibold text-gray-900 mb-2">You haven’t created any tools yet</h3>
                                            <p className="text-gray-600 mb-6">Build a private or public tool tailored to your workflow.</p>
                                            <Button onClick={() => setLocation('/create-tool')}>Create Custom Tool</Button>
                                        </CardContent>
                                    </Card>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {filteredTools.map((fxn: any) => (
                                            <FxnCard
                                                key={fxn.id}
                                                fxn={fxn}
                                                onClick={() => handleFxnClick(fxn)}
                                                showBadge={!fxn.isPublic}
                                                badgeText={!fxn.isPublic ? "Private" : undefined}
                                                badgeVariant={!fxn.isPublic ? "secondary" : "default"}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Recent Activity & Quick Actions */}
                            <div className="space-y-8">
                                {/* Recent Activity */}
                                <div>
                                    <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                                        <TrendingUp className="mr-2 h-5 w-5 text-blue-500" />
                                        Recent Activity
                                    </h3>
                                    <div className="space-y-4">
                                        {recentRuns.length === 0 ? (
                                            <Card className="border border-gray-200">
                                                <CardContent className="p-6 text-center">
                                                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                                        <Play className="h-6 w-6 text-gray-400" />
                                                    </div>
                                                    <p className="text-gray-600 text-sm">No recent activity</p>
                                                </CardContent>
                                            </Card>
                                        ) : (
                                            recentRuns.slice(0, 5).map((run: any) => (
                                                <Card key={run.id} className="border border-gray-200 hover:shadow-md transition-shadow">
                                                    <CardContent className="p-4">
                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                <h4 className="font-medium text-gray-900">
                                                                    {run.fxn?.title || 'Unknown Tool'}
                                                                </h4>
                                                                <div className="flex items-center space-x-2 text-sm text-gray-500 mt-1">
                                                                    <Calendar className="h-3 w-3" />
                                                                    <span>{new Date(run.createdAt).toLocaleDateString()}</span>
                                                                    <Badge variant="secondary" className="text-xs capitalize">
                                                                        {run.fxn?.category || 'unknown'}
                                                                    </Badge>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            ))
                                        )}
                                    </div>
                                </div>

                                <Separator />

                                {/* Quick Actions */}
                                <div>
                                    <h3 className="text-xl font-semibold text-gray-900 mb-6">Quick Actions</h3>
                                    <div className="space-y-3">
                                        {quickActions.map((action, index) => {
                                            const isExportAction = action.title === "Export Data";
                                            const isDisabled = isExportAction && isExporting;
                                            
                                            return (
                                                <Button
                                                    key={index}
                                                    variant="ghost"
                                                    className="w-full justify-start p-4 h-auto hover:bg-gray-50"
                                                    onClick={action.action}
                                                    disabled={isDisabled}
                                                    data-testid={`button-${action.title.toLowerCase().replace(/\s+/g, '-')}`}
                                                >
                                                    <div className="flex items-start space-x-3">
                                                        <action.icon className="h-5 w-5 text-gray-600 mt-0.5 flex-shrink-0" />
                                                        <div className="text-left">
                                                            <div className="flex items-center space-x-2">
                                                                <span className="font-medium text-gray-900">
                                                                    {action.title}
                                                                    {isDisabled && " (Exporting...)"}
                                                                </span>
                                                                {action.isPro && (
                                                                    <Badge variant="secondary" className="text-xs">Pro</Badge>
                                                                )}
                                                            </div>
                                                            <p className="text-sm text-gray-600 mt-1">{action.description}</p>
                                                        </div>
                                                    </div>
                                                </Button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                            </TabsContent>

                            {/* Analytics Tab */}
                            <TabsContent value="analytics" className="space-y-8">
                                <AnalyticsDashboard />
                            </TabsContent>

                            {/* My Tools Tab */}
                            <TabsContent value="tools" className="space-y-8">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                                        My Tools
                                        <Badge variant="secondary" className="ml-2">{filteredTools.length}</Badge>
                                    </h2>
                                    <Button size="sm" onClick={() => setLocation('/create-tool')} data-testid="link-create-tool">
                                        <Plus className="mr-1 h-4 w-4" /> New Tool
                                    </Button>
                                </div>

                                {/* Enhanced Search & Filter Controls */}
                                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                                    <div className="flex-1">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                            <Input
                                                placeholder="Search your tools..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className="pl-10"
                                            />
                                        </div>
                                    </div>
                                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                        <SelectTrigger className="w-full sm:w-48 text-sm">
                                            <SelectValue placeholder="All Categories" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Categories</SelectItem>
                                            {categories.map((category) => (
                                                <SelectItem key={category} value={category}>
                                                    {category.charAt(0).toUpperCase() + category.slice(1)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Select value={sortBy} onValueChange={setSortBy}>
                                        <SelectTrigger className="w-full sm:w-32">
                                            <SelectValue placeholder="Sort by" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="recent">Recent</SelectItem>
                                            <SelectItem value="popular">Popular</SelectItem>
                                            <SelectItem value="name">Name</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {filteredTools.length === 0 ? (
                                    <Card className="border border-gray-200">
                                        <CardContent className="p-8 text-center">
                                            <h3 className="text-lg font-semibold text-gray-900 mb-2">You haven't created any tools yet</h3>
                                            <p className="text-gray-600 mb-6">Build a private or public tool tailored to your workflow.</p>
                                            <Button onClick={() => setLocation('/create-tool')}>Create Custom Tool</Button>
                                        </CardContent>
                                    </Card>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {filteredTools.map((fxn: any) => (
                                            <FxnCard
                                                key={fxn.id}
                                                fxn={fxn}
                                                onClick={() => handleFxnClick(fxn)}
                                                showBadge={!fxn.isPublic}
                                                badgeText={!fxn.isPublic ? "Private" : undefined}
                                                badgeVariant={!fxn.isPublic ? "secondary" : "default"}
                                            />
                                        ))}
                                    </div>
                                )}
                            </TabsContent>

                            {/* Drafts Tab */}
                            <TabsContent value="drafts" className="space-y-8">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                                        Tool Drafts
                                        <Badge variant="secondary" className="ml-2">{drafts.length}</Badge>
                                    </h2>
                                    <Button size="sm" onClick={() => setLocation('/create-tool')} data-testid="link-create-draft">
                                        <Plus className="mr-1 h-4 w-4" /> New Draft
                                    </Button>
                                </div>

                                {drafts.length === 0 ? (
                                    <Card className="border border-gray-200">
                                        <CardContent className="p-12 text-center">
                                            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                            <h3 className="text-lg font-semibold text-gray-900 mb-2">No drafts yet</h3>
                                            <p className="text-gray-600 mb-6">Start building a tool to see your drafts here.</p>
                                            <Button onClick={() => setLocation('/create-tool')}>Start Building</Button>
                                        </CardContent>
                                    </Card>
                                ) : (
                                    <div className="space-y-4">
                                        {drafts.map((draft: any) => (
                                            <Card key={draft.id} className="p-6">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <h3 className="font-semibold">{draft.name}</h3>
                                                            <Badge 
                                                                variant={draft.status === 'published' ? 'default' : 
                                                                        draft.status === 'testing' ? 'secondary' : 'outline'}
                                                                className={
                                                                    draft.status === 'published' ? 'bg-green-100 text-green-700 border-green-200' :
                                                                    draft.status === 'testing' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                                                    'bg-gray-100 text-gray-700 border-gray-200'
                                                                }
                                                            >
                                                                {draft.status === 'published' ? '✅ Published' :
                                                                 draft.status === 'testing' ? '🧪 Testing' :
                                                                 '📝 Draft'}
                                                            </Badge>
                                                            {draft.status === 'draft' && draft.progress >= 75 && (
                                                                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                                                                    Ready to Test
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-4 text-sm text-gray-600">
                                                            <span>{draft.category}</span>
                                                            <span>•</span>
                                                            <span>Updated {new Date(draft.updatedAt).toLocaleDateString()}</span>
                                                        </div>
                                                        <div className="mt-3">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="text-sm text-gray-600">Progress</span>
                                                                <span className="text-sm font-medium">{draft.progress}%</span>
                                                            </div>
                                                            <Progress value={draft.progress} className="h-2" />
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 ml-6">
                                                        <Button 
                                                            size="sm" 
                                                            variant="outline" 
                                                            onClick={() => setLocation(`/create-tool?draft=${draft.id}`)}
                                                        >
                                                            <SettingsIcon className="h-3 w-3 mr-1" />
                                                            Edit
                                                        </Button>
                                                        
                                                        {draft.status === 'draft' && draft.progress >= 50 && (
                                                            <Button 
                                                                size="sm" 
                                                                variant="secondary"
                                                                onClick={() => handleTestDraft(draft.id)}
                                                            >
                                                                <Play className="h-3 w-3 mr-1" />
                                                                Test
                                                            </Button>
                                                        )}
                                                        
                                                        {draft.status === 'testing' && (
                                                            <Button 
                                                                size="sm" 
                                                                onClick={() => handlePublishDraft(draft.id)}
                                                            >
                                                                <Sparkles className="h-3 w-3 mr-1" />
                                                                Publish
                                                            </Button>
                                                        )}
                                                        
                                                        {draft.status === 'published' && (
                                                            <Button 
                                                                size="sm" 
                                                                onClick={() => setLocation(`/fxn/${draft.id}`)}
                                                            >
                                                                <ExternalLink className="h-3 w-3 mr-1" />
                                                                View
                                                            </Button>
                                                        )}
                                                        
                                                        <Button 
                                                            size="sm" 
                                                            variant="ghost" 
                                                            onClick={() => handleDeleteDraft(draft.id)}
                                                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                        >
                                                            <span className="sr-only">Delete</span>
                                                            ×
                                                        </Button>
                                                    </div>
                                                </div>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </TabsContent>
                        </Tabs>
                    </div>
                </section>
            </div>
        </div>
    );
}
