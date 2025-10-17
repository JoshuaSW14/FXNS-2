import { useState } from 'react';
import { useLocation } from 'wouter';
import { useWorkflows, useCreateWorkflow, useDeleteWorkflow } from '@/hooks/use-workflows';
import NavigationHeader from '@/components/navigation-header';
import Footer from '@/components/footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import {
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Play,
  Pause,
  Clock,
  Activity,
  Workflow as WorkflowIcon,
} from 'lucide-react';

export default function WorkflowsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: workflows, isLoading } = useWorkflows();
  const createWorkflow = useCreateWorkflow();
  const deleteWorkflow = useDeleteWorkflow();
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newWorkflowName, setNewWorkflowName] = useState('');
  const [newWorkflowDescription, setNewWorkflowDescription] = useState('');

  const handleCreateWorkflow = async () => {
    if (!newWorkflowName.trim()) {
      toast({
        title: 'Name required',
        description: 'Please enter a workflow name',
        variant: 'destructive',
      });
      return;
    }

    try {
      const workflow = await createWorkflow.mutateAsync({
        name: newWorkflowName,
        description: newWorkflowDescription,
      });
      
      toast({
        title: 'Workflow created',
        description: 'Your new workflow has been created successfully',
      });
      
      setIsCreateDialogOpen(false);
      setNewWorkflowName('');
      setNewWorkflowDescription('');
      
      setLocation(`/workflows/${workflow.id}`);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create workflow',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteWorkflow = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      await deleteWorkflow.mutateAsync(id);
      toast({
        title: 'Workflow deleted',
        description: 'The workflow has been deleted successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete workflow',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (isActive: boolean) => {
    return isActive 
      ? <Badge className="bg-green-500">Active</Badge>
      : <Badge variant="secondary">Inactive</Badge>;
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* <NavigationHeader /> */}
      
      <div className="flex-1 container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Workflows</h1>
            <p className="text-muted-foreground">
              Create and manage automated workflows with visual flow builder
            </p>
          </div>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg">
                <Plus className="w-4 h-4 mr-2" />
                Create Workflow
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Workflow</DialogTitle>
                <DialogDescription>
                  Start building a new automated workflow
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Workflow Name</Label>
                  <Input
                    id="name"
                    placeholder="My Awesome Workflow"
                    value={newWorkflowName}
                    onChange={(e) => setNewWorkflowName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="What does this workflow do?"
                    value={newWorkflowDescription}
                    onChange={(e) => setNewWorkflowDescription(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateWorkflow} disabled={createWorkflow.isPending}>
                  {createWorkflow.isPending ? 'Creating...' : 'Create Workflow'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Separator className="mb-8" />

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading workflows...</p>
          </div>
        ) : workflows && workflows.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workflows.map((workflow) => (
              <Card
                key={workflow.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setLocation(`/workflows/${workflow.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <WorkflowIcon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{workflow.name}</CardTitle>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          setLocation(`/workflows/${workflow.id}`);
                        }}>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteWorkflow(workflow.id, workflow.name);
                          }}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <CardDescription className="mt-2">
                    {workflow.description || 'No description'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Status</span>
                      {getStatusBadge(workflow.isActive)}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Nodes</span>
                      {/* <span className="text-sm font-medium">{workflow.nodes.length ?? 0}</span> */}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Updated</span>
                      <span className="text-sm">
                        {new Date(workflow.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="py-12">
            <CardContent className="text-center">
              <WorkflowIcon className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No workflows yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first workflow to get started with automation
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Workflow
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
