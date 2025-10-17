import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Users,
    Heart,
    MessageCircle,
    Share2,
    Plus,
    Trophy,
    Target,
    TrendingUp,
    Filter,
    Calendar,
    MoreVertical,
    ThumbsUp,
    Zap
} from "lucide-react";
import { apiRequest } from "@/lib/api";

interface ProgressPost {
    id: string;
    userId: string;
    content: string;
    goalId?: string;
    isPublic: boolean;
    createdAt: string;
    user: {
        id: string;
        name: string;
        email: string;
    };
    goal?: {
        id: string;
        title: string;
        category: string;
    };
    encouragements: Encouragement[];
    _count: {
        encouragements: number;
    };
}

interface Encouragement {
    id: string;
    userId: string;
    postId: string;
    message?: string;
    createdAt: string;
    user: {
        id: string;
        name: string;
    };
}

interface CommunityStats {
    totalPosts: number;
    totalEncouragements: number;
    activeUsers: number;
    topContributors: { userId: string; userName: string; count: number }[];
}

export default function CommunityFeed() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [filter, setFilter] = useState<'all' | 'following' | 'mine'>('all');
    const [showNewPostDialog, setShowNewPostDialog] = useState(false);
    const [newPostContent, setNewPostContent] = useState('');
    const [isPublic, setIsPublic] = useState(true);

    // Fetch community posts
    const { data: postsResponse, isLoading } = useQuery<{ posts: ProgressPost[] }>({
        queryKey: ['/api/productivity/community/posts', filter],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (filter !== 'all') params.append('filter', filter);
            
            const response = await apiRequest('GET', `/api/productivity/community/posts?${params}`);
            return response.json();
        },
        enabled: !!user,
    });

    // Fetch community stats
    const { data: statsResponse } = useQuery<{ stats: CommunityStats }>({
        queryKey: ['/api/productivity/community/stats'],
        queryFn: async () => {
            const response = await apiRequest('GET', '/api/productivity/community/stats');
            return response.json();
        },
        enabled: !!user,
    });

    // Create post mutation
    const createPostMutation = useMutation({
        mutationFn: async (postData: { content: string; isPublic: boolean; goalId?: string }) => {
            const response = await apiRequest('POST', '/api/productivity/community/posts', postData);
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/productivity/community/posts'] });
            queryClient.invalidateQueries({ queryKey: ['/api/productivity/community/stats'] });
            setShowNewPostDialog(false);
            setNewPostContent('');
        },
    });

    // Encourage post mutation
    const encourageMutation = useMutation({
        mutationFn: async ({ postId, message }: { postId: string; message?: string }) => {
            const response = await apiRequest('POST', `/api/productivity/community/posts/${postId}/encourage`, { message });
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/productivity/community/posts'] });
        },
    });

    const posts = postsResponse?.posts || [];
    const stats = statsResponse?.stats;

    const handleCreatePost = () => {
        if (!newPostContent.trim()) return;
        
        createPostMutation.mutate({
            content: newPostContent.trim(),
            isPublic,
        });
    };

    const handleEncourage = (postId: string, message?: string) => {
        encourageMutation.mutate({ postId, message });
    };

    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase();
    };

    const formatTimeAgo = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInHours = Math.abs(now.getTime() - date.getTime()) / 36e5;

        if (diffInHours < 1) {
            return `${Math.floor(diffInHours * 60)}m ago`;
        } else if (diffInHours < 24) {
            return `${Math.floor(diffInHours)}h ago`;
        } else if (diffInHours < 168) {
            return `${Math.floor(diffInHours / 24)}d ago`;
        } else {
            return date.toLocaleDateString();
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="animate-pulse">
                    <div className="h-32 bg-gray-200 rounded-lg mb-6"></div>
                    <div className="h-12 bg-gray-200 rounded mb-4"></div>
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Community Statistics */}
            {stats && (
                <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
                    <CardContent className="p-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-green-600">{stats.totalPosts}</div>
                                <div className="text-sm text-gray-600">Posts</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-blue-600">{stats.totalEncouragements}</div>
                                <div className="text-sm text-gray-600">Encouragements</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-purple-600">{stats.activeUsers}</div>
                                <div className="text-sm text-gray-600">Active Users</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-orange-600">
                                    {stats.topContributors.length}
                                </div>
                                <div className="text-sm text-gray-600">Contributors</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Header and Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                        <Users className="mr-2 h-6 w-6 text-green-600" />
                        Community Feed
                    </h1>
                    <p className="text-gray-600 mt-1">Share your progress and encourage others</p>
                </div>
                
                <div className="flex items-center space-x-2">
                    <Dialog open={showNewPostDialog} onOpenChange={setShowNewPostDialog}>
                        <DialogTrigger asChild>
                            <Button size="sm">
                                <Plus className="mr-1 h-4 w-4" />
                                Share Progress
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle>Share Your Progress</DialogTitle>
                                <DialogDescription>
                                    Let the community know what you've accomplished
                                </DialogDescription>
                            </DialogHeader>
                            
                            <div className="space-y-4">
                                <Textarea
                                    value={newPostContent}
                                    onChange={(e) => setNewPostContent(e.target.value)}
                                    placeholder="What have you accomplished today? Share your wins, challenges, or insights..."
                                    rows={4}
                                />
                                
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            id="isPublic"
                                            checked={isPublic}
                                            onChange={(e) => setIsPublic(e.target.checked)}
                                            className="rounded"
                                        />
                                        <label htmlFor="isPublic" className="text-sm">
                                            Make public (visible to all users)
                                        </label>
                                    </div>
                                </div>

                                <div className="flex justify-end space-x-2">
                                    <Button 
                                        variant="outline" 
                                        onClick={() => setShowNewPostDialog(false)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button 
                                        onClick={handleCreatePost}
                                        disabled={!newPostContent.trim() || createPostMutation.isPending}
                                    >
                                        {createPostMutation.isPending ? 'Sharing...' : 'Share Post'}
                                    </Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center space-x-2">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                            <Filter className="mr-1 h-4 w-4" />
                            {filter === 'all' ? 'All Posts' : 
                             filter === 'following' ? 'Following' : 'My Posts'}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => setFilter('all')}>
                            All Posts
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setFilter('following')}>
                            Following
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setFilter('mine')}>
                            My Posts
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Posts Feed */}
            <div className="space-y-4">
                {posts.length === 0 ? (
                    <Card className="border border-gray-200">
                        <CardContent className="p-12 text-center">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Users className="h-8 w-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">No posts yet</h3>
                            <p className="text-gray-600 mb-6">
                                {filter !== 'all' 
                                    ? 'Try changing your filter or be the first to share'
                                    : 'Be the first to share your progress with the community'
                                }
                            </p>
                            <Button onClick={() => setShowNewPostDialog(true)}>
                                <Plus className="mr-1 h-4 w-4" />
                                Share Progress
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    posts.map((post) => (
                        <Card key={post.id} className="border border-gray-200 hover:shadow-md transition-shadow">
                            <CardContent className="p-6">
                                {/* Post Header */}
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-start space-x-3">
                                        <Avatar className="h-10 w-10">
                                            <AvatarFallback className="bg-green-100 text-green-700">
                                                {getInitials(post.user.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <div className="font-medium text-gray-900">{post.user.name}</div>
                                            <div className="flex items-center space-x-2 text-sm text-gray-500">
                                                <Calendar className="h-3 w-3" />
                                                <span>{formatTimeAgo(post.createdAt)}</span>
                                                {!post.isPublic && (
                                                    <Badge variant="secondary" className="text-xs">
                                                        Private
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {post.userId === user?.id && (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem>Edit Post</DropdownMenuItem>
                                                <DropdownMenuItem className="text-red-600">
                                                    Delete Post
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    )}
                                </div>

                                {/* Goal Badge */}
                                {post.goal && (
                                    <Badge variant="outline" className="mb-3 bg-blue-50 text-blue-700 border-blue-200">
                                        <Target className="h-3 w-3 mr-1" />
                                        {post.goal.title}
                                    </Badge>
                                )}

                                {/* Post Content */}
                                <div className="mb-4">
                                    <p className="text-gray-900 whitespace-pre-wrap">{post.content}</p>
                                </div>

                                {/* Post Actions */}
                                <div className="flex items-center justify-between border-t pt-4">
                                    <div className="flex items-center space-x-4">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleEncourage(post.id)}
                                            disabled={encourageMutation.isPending}
                                            className="flex items-center space-x-1 hover:text-red-600"
                                        >
                                            <Heart className="h-4 w-4" />
                                            <span>Encourage ({post._count.encouragements})</span>
                                        </Button>

                                        <Button variant="ghost" size="sm" className="flex items-center space-x-1">
                                            <MessageCircle className="h-4 w-4" />
                                            <span>Comment</span>
                                        </Button>

                                        <Button variant="ghost" size="sm" className="flex items-center space-x-1">
                                            <Share2 className="h-4 w-4" />
                                            <span>Share</span>
                                        </Button>
                                    </div>
                                </div>

                                {/* Recent Encouragements */}
                                {post.encouragements.length > 0 && (
                                    <div className="mt-4 space-y-2">
                                        <div className="text-sm font-medium text-gray-700">
                                            Recent encouragements:
                                        </div>
                                        {post.encouragements.slice(0, 3).map((encouragement) => (
                                            <div key={encouragement.id} className="flex items-center space-x-2 text-sm">
                                                <ThumbsUp className="h-3 w-3 text-green-600" />
                                                <span className="font-medium">{encouragement.user.name}</span>
                                                {encouragement.message && (
                                                    <span className="text-gray-600">: {encouragement.message}</span>
                                                )}
                                            </div>
                                        ))}
                                        {post._count.encouragements > 3 && (
                                            <div className="text-xs text-gray-500">
                                                +{post._count.encouragements - 3} more encouragements
                                            </div>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}