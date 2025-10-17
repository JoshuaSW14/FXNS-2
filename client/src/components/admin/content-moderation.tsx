import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Search, 
  CheckCircle, 
  XCircle, 
  Flag, 
  Eye, 
  Filter,
  MoreHorizontal,
  AlertTriangle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Tool {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  isPublic: boolean;
  moderationStatus: 'pending' | 'approved' | 'rejected' | 'flagged';
  moderatedBy?: string;
  moderatedAt?: string;
  moderationNotes?: string;
  flaggedReasons?: string[];
  createdAt: string;
  creatorName?: string;
  creatorEmail?: string;
}

interface ModerationStats {
  totalTools: number;
  pendingTools: number;
  approvedTools: number;
  rejectedTools: number;
  flaggedTools: number;
}

export default function ContentModeration() {
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [moderationAction, setModerationAction] = useState<'approved' | 'rejected' | 'flagged'>('approved');
  const [moderationNotes, setModerationNotes] = useState('');
  const [flaggedReasons, setFlaggedReasons] = useState<string[]>([]);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch moderation statistics
  const { data: statsData } = useQuery({
    queryKey: ['admin', 'moderation', 'stats'],
    queryFn: async () => {
      const response = await fetch('/api/admin/moderation/stats', {
        credentials: 'include',
        headers: { 'X-Requested-With': 'fetch' }
      });
      if (!response.ok) throw new Error('Failed to fetch moderation stats');
      const result = await response.json();
      return result.data;
    }
  });

  // Fetch tools for moderation
  const { data: toolsData, isLoading, refetch } = useQuery({
    queryKey: ['admin', 'moderation', 'tools', { search: searchTerm, status: statusFilter, category: categoryFilter }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);
      if (categoryFilter && categoryFilter !== 'all') params.append('category', categoryFilter);
      
      const response = await fetch(`/api/admin/moderation/tools?${params.toString()}`, {
        credentials: 'include',
        headers: { 'X-Requested-With': 'fetch' }
      });
      if (!response.ok) throw new Error('Failed to fetch tools');
      const result = await response.json();
      return result.data;
    }
  });

  // Moderation action mutation
  const moderationMutation = useMutation({
    mutationFn: async ({ toolId, status, notes, flaggedReasons }: {
      toolId: string;
      status: 'approved' | 'rejected' | 'flagged';
      notes?: string;
      flaggedReasons?: string[];
    }) => {
      const response = await fetch('/api/admin/moderation/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'fetch' },
        credentials: 'include',
        body: JSON.stringify({ toolId, status, notes, flaggedReasons })
      });
      if (!response.ok) throw new Error('Failed to moderate tool');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'moderation'] });
      toast({ title: 'Success', description: 'Tool moderation updated successfully' });
      setSelectedTool(null);
      setModerationNotes('');
      setFlaggedReasons([]);
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update moderation status', variant: 'destructive' });
    }
  });

  // Bulk moderation mutation
  const bulkModerationMutation = useMutation({
    mutationFn: async ({ toolIds, status, notes }: {
      toolIds: string[];
      status: 'approved' | 'rejected' | 'flagged';
      notes?: string;
    }) => {
      const response = await fetch('/api/admin/moderation/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'fetch' },
        credentials: 'include',
        body: JSON.stringify({ toolIds, status, notes })
      });
      if (!response.ok) throw new Error('Failed to perform bulk moderation');
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'moderation'] });
      toast({ title: 'Success', description: `${data.data.count} tools moderated successfully` });
      setSelectedTools([]);
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to perform bulk moderation', variant: 'destructive' });
    }
  });

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      flagged: 'bg-orange-100 text-orange-800'
    };
    
    const icons = {
      pending: <AlertTriangle className="w-3 h-3" />,
      approved: <CheckCircle className="w-3 h-3" />,
      rejected: <XCircle className="w-3 h-3" />,
      flagged: <Flag className="w-3 h-3" />
    };

    return (
      <Badge className={`${variants[status as keyof typeof variants]} flex items-center gap-1`}>
        {icons[status as keyof typeof icons]}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const handleModerateTool = () => {
    if (!selectedTool) return;
    
    moderationMutation.mutate({
      toolId: selectedTool.id,
      status: moderationAction,
      notes: moderationNotes,
      flaggedReasons: moderationAction === 'flagged' ? flaggedReasons : undefined
    });
  };

  const handleBulkModeration = (status: 'approved' | 'rejected' | 'flagged') => {
    if (selectedTools.length === 0) {
      toast({ title: 'Error', description: 'Please select tools to moderate', variant: 'destructive' });
      return;
    }

    bulkModerationMutation.mutate({
      toolIds: selectedTools,
      status,
      notes: `Bulk ${status} action`
    });
  };

  const handleSelectAll = () => {
    if (selectedTools.length === toolsData?.tools?.length) {
      setSelectedTools([]);
    } else {
      setSelectedTools(toolsData?.tools?.map((tool: Tool) => tool.id) || []);
    }
  };

  const stats = statsData?.stats;

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tools</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalTools || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats?.pendingTools || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.approvedTools || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats?.rejectedTools || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Flagged</CardTitle>
            <Flag className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats?.flaggedTools || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Content Moderation</CardTitle>
          <CardDescription>Review and moderate user-generated tools</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search tools..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="flagged">Flagged</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="calculation">Calculation</SelectItem>
                <SelectItem value="conversion">Conversion</SelectItem>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="finance">Finance</SelectItem>
                <SelectItem value="health">Health</SelectItem>
                <SelectItem value="productivity">Productivity</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Bulk Actions */}
          {selectedTools.length > 0 && (
            <div className="flex items-center gap-2 mb-4 p-3 bg-blue-50 rounded-lg">
              <span className="text-sm font-medium">
                {selectedTools.length} tool{selectedTools.length > 1 ? 's' : ''} selected
              </span>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => handleBulkModeration('approved')}
                disabled={bulkModerationMutation.isPending}
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Approve
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => handleBulkModeration('rejected')}
                disabled={bulkModerationMutation.isPending}
              >
                <XCircle className="w-4 h-4 mr-1" />
                Reject
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => handleBulkModeration('flagged')}
                disabled={bulkModerationMutation.isPending}
              >
                <Flag className="w-4 h-4 mr-1" />
                Flag
              </Button>
            </div>
          )}

          {/* Tools Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedTools.length === toolsData?.tools?.length && toolsData?.tools?.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Tool</TableHead>
                  <TableHead>Creator</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Loading tools...
                    </TableCell>
                  </TableRow>
                ) : toolsData?.tools?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      No tools found
                    </TableCell>
                  </TableRow>
                ) : (
                  toolsData?.tools?.map((tool: Tool) => (
                    <TableRow key={tool.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedTools.includes(tool.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedTools([...selectedTools, tool.id]);
                            } else {
                              setSelectedTools(selectedTools.filter(id => id !== tool.id));
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{tool.title}</div>
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {tool.description}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{tool.creatorName || 'Unknown'}</div>
                          <div className="text-sm text-gray-500">{tool.creatorEmail}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{tool.category}</Badge>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(tool.moderationStatus)}
                      </TableCell>
                      <TableCell>
                        {new Date(tool.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedTool(tool)}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Review
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Moderate Tool: {selectedTool?.title}</DialogTitle>
                              <DialogDescription>
                                Review this tool and update its moderation status
                              </DialogDescription>
                            </DialogHeader>
                            
                            {selectedTool && (
                              <div className="space-y-4">
                                <div>
                                  <h4 className="font-medium">Tool Details</h4>
                                  <div className="mt-2 space-y-2 text-sm">
                                    <p><strong>Title:</strong> {selectedTool.title}</p>
                                    <p><strong>Description:</strong> {selectedTool.description}</p>
                                    <p><strong>Category:</strong> {selectedTool.category}</p>
                                    <p><strong>Creator:</strong> {selectedTool.creatorName} ({selectedTool.creatorEmail})</p>
                                    <p><strong>Current Status:</strong> {getStatusBadge(selectedTool.moderationStatus)}</p>
                                  </div>
                                </div>
                                
                                <div>
                                  <label className="block text-sm font-medium mb-2">
                                    Moderation Action
                                  </label>
                                  <Select value={moderationAction} onValueChange={(value: any) => setModerationAction(value)}>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="approved">Approve</SelectItem>
                                      <SelectItem value="rejected">Reject</SelectItem>
                                      <SelectItem value="flagged">Flag for Review</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                
                                <div>
                                  <label className="block text-sm font-medium mb-2">
                                    Moderation Notes
                                  </label>
                                  <Textarea
                                    placeholder="Add notes about this moderation decision..."
                                    value={moderationNotes}
                                    onChange={(e) => setModerationNotes(e.target.value)}
                                  />
                                </div>
                                
                                {moderationAction === 'flagged' && (
                                  <div>
                                    <label className="block text-sm font-medium mb-2">
                                      Flagged Reasons
                                    </label>
                                    <div className="space-y-2">
                                      {['Inappropriate content', 'Spam', 'Copyright violation', 'Misleading information', 'Other'].map((reason) => (
                                        <div key={reason} className="flex items-center space-x-2">
                                          <Checkbox
                                            checked={flaggedReasons.includes(reason)}
                                            onCheckedChange={(checked) => {
                                              if (checked) {
                                                setFlaggedReasons([...flaggedReasons, reason]);
                                              } else {
                                                setFlaggedReasons(flaggedReasons.filter(r => r !== reason));
                                              }
                                            }}
                                          />
                                          <label className="text-sm">{reason}</label>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                            
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setSelectedTool(null)}>
                                Cancel
                              </Button>
                              <Button 
                                onClick={handleModerateTool}
                                disabled={moderationMutation.isPending}
                              >
                                {moderationMutation.isPending ? 'Updating...' : 'Update Status'}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}