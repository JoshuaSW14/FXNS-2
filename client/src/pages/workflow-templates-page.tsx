import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import NavigationHeader from '@/components/navigation-header';
import Footer from '@/components/footer';
import { Search, Copy, Clock, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  triggerType: string;
  nodeCount: number;
  estimatedTime: string;
  tags: string[];
}

const fetchTemplates = async (): Promise<WorkflowTemplate[]> => {
  const response = await fetch('/api/workflow-templates', {
    credentials: 'include',
    headers: { 'X-Requested-With': 'fetch' },
  });
  if (!response.ok) throw new Error('Failed to fetch templates');
  return response.json();
};

export default function WorkflowTemplatesPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['workflow-templates'],
    queryFn: fetchTemplates,
  });

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || template.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleCloneTemplate = async (templateId: string) => {
    try {
      const response = await fetch(`/api/workflow-templates/${templateId}/clone`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
      });

      if (!response.ok) throw new Error('Failed to clone template');

      const result = await response.json();
      
      toast({
        title: 'Template cloned!',
        description: 'Your new workflow has been created from the template',
      });
      
      setLocation(`/workflows/${result.id}`);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to clone template',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* <NavigationHeader /> */}
      
      <div className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Workflow Templates</h1>
          <p className="text-muted-foreground">
            Browse and use pre-built automation workflows to get started quickly
          </p>
        </div>

        <div className="space-y-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="productivity">Productivity</SelectItem>
              <SelectItem value="communication">Communication</SelectItem>
              <SelectItem value="data">Data Processing</SelectItem>
              <SelectItem value="social">Social Media</SelectItem>
              <SelectItem value="finance">Finance</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Templates Grid */}
        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-5 bg-muted rounded w-3/4" />
                  <div className="h-4 bg-muted rounded w-full mt-2" />
                </CardHeader>
                <CardContent>
                  <div className="h-4 bg-muted rounded w-full" />
                  <div className="h-4 bg-muted rounded w-2/3 mt-2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No templates found matching your criteria</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredTemplates.map((template) => (
              <Card key={template.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <Badge variant="outline" className="ml-2 capitalize">
                      {template.triggerType}
                    </Badge>
                  </div>
                  <CardDescription className="line-clamp-2">
                    {template.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Zap className="h-4 w-4" />
                      <span>{template.nodeCount} steps</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{template.estimatedTime}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {template.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    onClick={() => handleCloneTemplate(template.id)}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Use Template
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
