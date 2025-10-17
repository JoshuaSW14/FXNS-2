import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';
import { format } from 'date-fns';
import NavigationHeader from '@/components/navigation-header';
import Footer from '@/components/footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import {
  LayoutDashboard,
  Users,
  Wrench,
  Play,
  CreditCard,
  UserPlus,
  PlusCircle,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Flag,
  ExternalLink,
  Eye,
  CheckCircle
} from 'lucide-react';

interface AdminStats {
  totalUsers: number;
  totalTools: number;
  totalRuns: number;
  activeProSubscriptions: number;
  usersLast30Days: number;
  toolsLast30Days: number;
  totalRevenue: number;
}

interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
  subscriptionStatus: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  suspended: boolean;
  suspendedAt: string | null;
}

interface Tool {
  id: string;
  title: string;
  category: string;
  createdBy: string | null;
  runCount: number;
  moderationStatus: string;
  isPublic: boolean;
  createdAt: string;
}

interface UsersResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
}

interface ToolsResponse {
  tools: Tool[];
  total: number;
  page: number;
  limit: number;
}

interface FlaggedTool {
  id: string;
  title: string;
  slug: string;
  moderationStatus: string;
  flaggedReasons: string[] | null;
  createdBy: string | null;
  createdAt: string;
}

interface UserReport {
  id: string;
  fxnId: string;
  fxnTitle: string;
  reporterId: string | null;
  reporterName: string | null;
  reason: string;
  details: string | null;
  createdAt: string;
}

interface ModerationQueueData {
  tools: FlaggedTool[];
  reports: UserReport[];
}

export default function AdminDashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [usersPage, setUsersPage] = useState(1);
  const [toolsPage, setToolsPage] = useState(1);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [moderationDialogOpen, setModerationDialogOpen] = useState(false);
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [moderationStatus, setModerationStatus] = useState<string>('');
  const [moderationNotes, setModerationNotes] = useState('');

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      setLocation('/');
    }
  }, [user, authLoading, setLocation]);

  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery<AdminStats>({
    queryKey: ['/api/admin/stats'],
    enabled: !!user && user.role === 'admin'
  });

  const { data: usersData, isLoading: usersLoading } = useQuery<UsersResponse>({
    queryKey: ['/api/admin/users', usersPage],
    queryFn: async () => {
      const response = await fetch(`/api/admin/users?page=${usersPage}&limit=10`, {
        credentials: 'include',
        headers: { 'X-Requested-With': 'fetch' }
      });
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json();
    },
    enabled: !!user && user.role === 'admin'
  });

  const { data: toolsData, isLoading: toolsLoading } = useQuery<ToolsResponse>({
    queryKey: ['/api/admin/tools', toolsPage],
    queryFn: async () => {
      const response = await fetch(`/api/admin/tools?page=${toolsPage}&limit=10`, {
        credentials: 'include',
        headers: { 'X-Requested-With': 'fetch' }
      });
      if (!response.ok) throw new Error('Failed to fetch tools');
      return response.json();
    },
    enabled: !!user && user.role === 'admin'
  });

  const { data: moderationQueueData, isLoading: moderationQueueLoading } = useQuery<ModerationQueueData>({
    queryKey: ['/api/admin/moderation-queue'],
    queryFn: async () => {
      const response = await fetch('/api/admin/moderation-queue', {
        credentials: 'include',
        headers: { 'X-Requested-With': 'fetch' }
      });
      if (!response.ok) throw new Error('Failed to fetch moderation queue');
      return response.json();
    },
    enabled: !!user && user.role === 'admin'
  });

  const changeRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'fetch' },
        body: JSON.stringify({ role })
      });
      if (!response.ok) throw new Error('Failed to update role');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setRoleDialogOpen(false);
      toast({
        title: 'Role Updated',
        description: 'User role has been successfully updated.'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const moderateToolMutation = useMutation({
    mutationFn: async ({ toolId, status, notes }: { toolId: string; status: string; notes: string }) => {
      const response = await fetch(`/api/admin/tools/${toolId}/moderation`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'fetch' },
        body: JSON.stringify({ status, notes })
      });
      if (!response.ok) throw new Error('Failed to moderate tool');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/tools'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/moderation-queue'] });
      setModerationDialogOpen(false);
      setModerationNotes('');
      toast({
        title: 'Moderation Updated',
        description: 'Tool moderation status has been successfully updated.'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const resolveReportMutation = useMutation({
    mutationFn: async (reportId: string) => {
      const response = await fetch(`/api/admin/reports/${reportId}/resolve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'fetch' }
      });
      if (!response.ok) throw new Error('Failed to resolve report');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/moderation-queue'] });
      toast({
        title: 'Report Resolved',
        description: 'User report has been successfully resolved.'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const suspendUserMutation = useMutation({
    mutationFn: async ({ userId, suspend }: { userId: string; suspend: boolean }) => {
      const endpoint = suspend ? 'suspend' : 'unsuspend';
      const response = await fetch(`/api/admin/users/${userId}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'fetch' }
      });
      if (!response.ok) throw new Error(`Failed to ${endpoint} user`);
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: variables.suspend ? 'User Suspended' : 'User Unsuspended',
        description: `User has been successfully ${variables.suspend ? 'suspended' : 'unsuspended'}.`
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value / 100);
  };

  const getRoleBadgeVariant = (role: string) => {
    return role === 'admin' ? 'destructive' : 'default';
  };

  const getSubscriptionBadgeVariant = (status: string | null) => {
    return status === 'active' ? 'default' : 'secondary';
  };

  const getModerationBadgeVariant = (status: string) => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
      case 'flagged': return 'outline';
      default: return 'secondary';
    }
  };

  const getModerationBadgeColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100';
      case 'approved': return 'bg-green-100 text-green-800 hover:bg-green-100';
      case 'rejected': return 'bg-red-100 text-red-800 hover:bg-red-100';
      case 'flagged': return 'bg-orange-100 text-orange-800 hover:bg-orange-100';
      default: return '';
    }
  };

  const getReasonBadgeColor = (reason: string) => {
    switch (reason) {
      case 'spam': return 'bg-purple-100 text-purple-800 hover:bg-purple-100';
      case 'malware': return 'bg-red-100 text-red-800 hover:bg-red-100';
      case 'copyright': return 'bg-orange-100 text-orange-800 hover:bg-orange-100';
      case 'offensive': return 'bg-pink-100 text-pink-800 hover:bg-pink-100';
      case 'misleading': return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100';
      case 'other': return 'bg-gray-100 text-gray-800 hover:bg-gray-100';
      default: return 'bg-gray-100 text-gray-800 hover:bg-gray-100';
    }
  };

  const handleChangeRole = (user: User) => {
    setSelectedUser(user);
    setSelectedRole(user.role);
    setRoleDialogOpen(true);
  };

  const handleModerate = (tool: Tool) => {
    setSelectedTool(tool);
    setModerationStatus(tool.moderationStatus);
    setModerationDialogOpen(true);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* <NavigationHeader /> */}

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <LayoutDashboard className="h-8 w-8 text-orange-600" />
            Admin Dashboard
          </h1>
        </div>

        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="tools">Tools</TabsTrigger>
            <TabsTrigger value="moderation">Moderation Queue</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            {statsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(7)].map((_, i) => (
                  <Card key={i}>
                    <CardHeader className="pb-3">
                      <Skeleton className="h-4 w-24" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-8 w-16" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : statsError ? (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-6">
                  <p className="text-red-600">Failed to load statistics</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Total Users
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats?.totalUsers.toLocaleString()}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                      <Wrench className="h-4 w-4" />
                      Total Tools
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats?.totalTools.toLocaleString()}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                      <Play className="h-4 w-4" />
                      Total Runs
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats?.totalRuns.toLocaleString()}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Active Pro Subscriptions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats?.activeProSubscriptions.toLocaleString()}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                      <UserPlus className="h-4 w-4" />
                      New Users (30 days)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats?.usersLast30Days.toLocaleString()}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                      <PlusCircle className="h-4 w-4" />
                      New Tools (30 days)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats?.toolsLast30Days.toLocaleString()}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Total Revenue
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(stats?.totalRevenue || 0)}</div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>Manage user roles and view user information</CardDescription>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Subscription</TableHead>
                          <TableHead>Joined</TableHead>
                          <TableHead>Last Login</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {usersData?.users.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">{user.email}</TableCell>
                            <TableCell>{user.name || '-'}</TableCell>
                            <TableCell>
                              <Badge variant={getRoleBadgeVariant(user.role)} className={user.role === 'admin' ? 'bg-red-100 text-red-800 hover:bg-red-100' : 'bg-blue-100 text-blue-800 hover:bg-blue-100'}>
                                {user.role}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={user.suspended ? 'destructive' : 'default'} className={user.suspended ? 'bg-red-100 text-red-800 hover:bg-red-100' : 'bg-green-100 text-green-800 hover:bg-green-100'}>
                                {user.suspended ? 'Suspended' : 'Active'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={getSubscriptionBadgeVariant(user.subscriptionStatus)} className={user.subscriptionStatus === 'active' ? 'bg-green-100 text-green-800 hover:bg-green-100' : 'bg-gray-100 text-gray-800 hover:bg-gray-100'}>
                                {user.subscriptionStatus === 'active' ? 'Active' : 'Free'}
                              </Badge>
                            </TableCell>
                            <TableCell>{format(new Date(user.createdAt), 'MMM d, yyyy')}</TableCell>
                            <TableCell>{user.lastLoginAt ? format(new Date(user.lastLoginAt), 'MMM d, yyyy') : '-'}</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleChangeRole(user)}
                                >
                                  Change Role
                                </Button>
                                <Button
                                  variant={user.suspended ? 'default' : 'destructive'}
                                  size="sm"
                                  onClick={() => suspendUserMutation.mutate({ userId: user.id, suspend: !user.suspended })}
                                  disabled={suspendUserMutation.isPending}
                                >
                                  {user.suspended ? 'Unsuspend' : 'Suspend'}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    <div className="flex items-center justify-between mt-4">
                      <p className="text-sm text-gray-600">
                        Page {usersData?.page} of {Math.ceil((usersData?.total || 0) / (usersData?.limit || 10))}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setUsersPage(p => Math.max(1, p - 1))}
                          disabled={usersPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4 mr-1" />
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setUsersPage(p => p + 1)}
                          disabled={usersPage >= Math.ceil((usersData?.total || 0) / (usersData?.limit || 10))}
                        >
                          Next
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tools" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Tools Analytics</CardTitle>
                <CardDescription>Manage tool moderation and view analytics</CardDescription>
              </CardHeader>
              <CardContent>
                {toolsLoading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Creator</TableHead>
                          <TableHead>Runs</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {toolsData?.tools.map((tool) => (
                          <TableRow key={tool.id}>
                            <TableCell className="font-medium">{tool.title}</TableCell>
                            <TableCell>{tool.category}</TableCell>
                            <TableCell>{tool.createdBy || '-'}</TableCell>
                            <TableCell>{tool.runCount.toLocaleString()}</TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <Badge className={getModerationBadgeColor(tool.moderationStatus)}>
                                  {tool.moderationStatus}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {tool.isPublic ? 'Public' : 'Private'}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell>{format(new Date(tool.createdAt), 'MMM d, yyyy')}</TableCell>
                            <TableCell>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleModerate(tool)}
                              >
                                Moderate
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    <div className="flex items-center justify-between mt-4">
                      <p className="text-sm text-gray-600">
                        Page {toolsData?.page} of {Math.ceil((toolsData?.total || 0) / (toolsData?.limit || 10))}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setToolsPage(p => Math.max(1, p - 1))}
                          disabled={toolsPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4 mr-1" />
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setToolsPage(p => p + 1)}
                          disabled={toolsPage >= Math.ceil((toolsData?.total || 0) / (toolsData?.limit || 10))}
                        >
                          Next
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="moderation" className="space-y-6">
            {moderationQueueLoading ? (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <Skeleton className="h-6 w-48" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Flag className="h-5 w-5 text-orange-600" />
                      Flagged Tools
                    </CardTitle>
                    <CardDescription>
                      Tools that need moderation review ({moderationQueueData?.tools.length || 0} items)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {!moderationQueueData?.tools.length ? (
                      <p className="text-gray-500 text-center py-8">No tools need moderation</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Tool</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Reason</TableHead>
                            <TableHead>Creator</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {moderationQueueData?.tools.map((tool) => (
                            <TableRow key={tool.id}>
                              <TableCell className="font-medium">{tool.title}</TableCell>
                              <TableCell>
                                <Badge className={getModerationBadgeColor(tool.moderationStatus)}>
                                  {tool.moderationStatus}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {tool.flaggedReasons && tool.flaggedReasons.length > 0 ? (
                                  <ul className="list-disc list-inside text-sm">
                                    {tool.flaggedReasons.map((reason, idx) => (
                                      <li key={idx}>{reason}</li>
                                    ))}
                                  </ul>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </TableCell>
                              <TableCell>{tool.createdBy || 'Unknown'}</TableCell>
                              <TableCell>{format(new Date(tool.createdAt), 'MMM d, yyyy')}</TableCell>
                              <TableCell>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedTool({
                                      id: tool.id,
                                      title: tool.title,
                                      category: '',
                                      createdBy: tool.createdBy,
                                      runCount: 0,
                                      moderationStatus: tool.moderationStatus,
                                      isPublic: true,
                                      createdAt: tool.createdAt
                                    });
                                    setModerationStatus(tool.moderationStatus);
                                    setModerationDialogOpen(true);
                                  }}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  Review
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Flag className="h-5 w-5 text-red-600" />
                      User Reports
                    </CardTitle>
                    <CardDescription>
                      Open user-submitted reports ({moderationQueueData?.reports.length || 0} items)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {!moderationQueueData?.reports.length ? (
                      <p className="text-gray-500 text-center py-8">No open reports</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Reported Tool</TableHead>
                            <TableHead>Reporter</TableHead>
                            <TableHead>Reason</TableHead>
                            <TableHead>Details</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {moderationQueueData?.reports.map((report) => (
                            <TableRow key={report.id}>
                              <TableCell className="font-medium">{report.fxnTitle}</TableCell>
                              <TableCell>{report.reporterName || 'Anonymous'}</TableCell>
                              <TableCell>
                                <Badge className={getReasonBadgeColor(report.reason)}>
                                  {report.reason}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {report.details ? (
                                  <span className="text-sm text-gray-600" title={report.details}>
                                    {report.details.length > 50 
                                      ? `${report.details.substring(0, 50)}...` 
                                      : report.details}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </TableCell>
                              <TableCell>{format(new Date(report.createdAt), 'MMM d, yyyy')}</TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => window.open(`/fxn/${report.fxnId}`, '_blank')}
                                  >
                                    <ExternalLink className="h-4 w-4 mr-1" />
                                    View Tool
                                  </Button>
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => resolveReportMutation.mutate(report.id)}
                                    disabled={resolveReportMutation.isPending}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Resolve
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
            <DialogDescription>
              Update the role for {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedUser) {
                  changeRoleMutation.mutate({ userId: selectedUser.id, role: selectedRole });
                }
              }}
              disabled={changeRoleMutation.isPending}
            >
              {changeRoleMutation.isPending ? 'Updating...' : 'Update Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={moderationDialogOpen} onOpenChange={setModerationDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Moderate Tool</DialogTitle>
            <DialogDescription>
              Update moderation status for {selectedTool?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={moderationStatus} onValueChange={setModerationStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="flagged">Flagged</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Notes</label>
              <Textarea
                placeholder="Add moderation notes..."
                value={moderationNotes}
                onChange={(e) => setModerationNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModerationDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedTool) {
                  moderateToolMutation.mutate({
                    toolId: selectedTool.id,
                    status: moderationStatus,
                    notes: moderationNotes
                  });
                }
              }}
              disabled={moderateToolMutation.isPending}
            >
              {moderateToolMutation.isPending ? 'Updating...' : 'Update Status'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
