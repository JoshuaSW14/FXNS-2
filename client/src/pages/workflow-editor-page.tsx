import { useState, useCallback, useRef, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import {
  useWorkflow,
  useUpdateWorkflow,
  useExecuteWorkflow,
  useDeleteWorkflow,
} from "@/hooks/use-workflows";
import NavigationHeader from "@/components/navigation-header";
import WorkflowCanvas from "@/components/workflows/workflow-canvas";
import AiAssistantPanel from "@/components/workflows/ai-assistant-panel";
import { WorkflowDebugPanel } from "@/components/workflows/workflow-debug-panel";
import WorkflowSettingsDialog from "@/components/workflows/workflow-settings-dialog";
import { PublishWorkflowModal } from "@/components/workflows/publish-workflow-modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Sparkles,
  Settings,
  Play,
  History,
  BarChart3,
  Upload,
  Bug,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Trash2,
  Save,
} from "lucide-react";
import { Node, Edge } from "reactflow";
import { useAuth } from "@/hooks/use-auth";
import { useSidebar } from "@/components/ui/sidebar";

export default function WorkflowEditorPage() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: workflow, isLoading } = useWorkflow(params.id!);
  const updateWorkflow = useUpdateWorkflow();
  const executeWorkflow = useExecuteWorkflow();
  const deleteWorkflow = useDeleteWorkflow();
  
  const [aiAssistantOpen, setAiAssistantOpen] = useState(false);
  const [debugPanelOpen, setDebugPanelOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [currentNodes, setCurrentNodes] = useState<Node[]>([]);
  const [currentEdges, setCurrentEdges] = useState<Edge[]>([]);
  const [canvasRef, setCanvasRef] = useState<{
    addGeneratedNodes: (nodes: Node[], edges: Edge[]) => void;
  } | null>(null);
  
  // Auto-save and confirmation dialogs
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'error' | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedNodesRef = useRef<Node[]>([]);
  const lastSavedEdgesRef = useRef<Edge[]>([]);
  
  const { open, openMobile, setOpen, setOpenMobile, isMobile } = useSidebar();
  const prevDesktopOpen = useRef(open);
  const prevMobileOpen = useRef(openMobile);

  const didCollapse = useRef(false);
  useEffect(() => {
    if (didCollapse.current) return;
    didCollapse.current = true;

    if (isMobile) setOpenMobile(false);
    else setOpen(false);

    // OPTIONAL: restore on unmount so you don't overwrite user pref
    return () => {
      if (isMobile) setOpenMobile(prevMobileOpen.current);
      else setOpen(prevDesktopOpen.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // <-- important: empty deps

  // Auto-save function with debounce
  const triggerAutoSave = useCallback((nodes: Node[], edges: Edge[]) => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    setAutoSaveStatus('saving');
    setHasUnsavedChanges(true);
    
    autoSaveTimeoutRef.current = setTimeout(async () => {
      if (!workflow) return;
      
      try {
        await updateWorkflow.mutateAsync({
          id: workflow.id,
          nodes,
          edges,
        });
        
        lastSavedNodesRef.current = nodes;
        lastSavedEdgesRef.current = edges;
        setHasUnsavedChanges(false);
        setAutoSaveStatus('saved');
        
        // Reset auto-save status after 3 seconds
        setTimeout(() => {
          setAutoSaveStatus(null);
        }, 3000);
      } catch (error) {
        setAutoSaveStatus('error');
        console.error('Auto-save failed:', error);
        
        // Reset error status after 5 seconds
        setTimeout(() => {
          setAutoSaveStatus(null);
        }, 5000);
      }
    }, 2000); // Auto-save after 2 seconds of inactivity
  }, [workflow, updateWorkflow]);

  const handleSave = async (nodes: Node[], edges: Edge[], showToast = true) => {
    if (!workflow) return;

    try {
      setCurrentNodes(nodes);
      setCurrentEdges(edges);
      setAutoSaveStatus('saving');
      
      await updateWorkflow.mutateAsync({
        id: workflow.id,
        nodes,
        edges,
      });

      lastSavedNodesRef.current = nodes;
      lastSavedEdgesRef.current = edges;
      setHasUnsavedChanges(false);
      setAutoSaveStatus('saved');

      if (showToast) {
        toast({
          title: "Workflow saved",
          description: "Your workflow has been saved successfully",
        });
      }
      
      // Reset auto-save status after 3 seconds
      setTimeout(() => {
        setAutoSaveStatus(null);
      }, 3000);
    } catch (error: any) {
      setAutoSaveStatus('error');
      toast({
        title: "Save failed",
        description: error.message || "Failed to save workflow",
        variant: "destructive",
      });
      
      // Reset error status after 5 seconds
      setTimeout(() => {
        setAutoSaveStatus(null);
      }, 5000);
    }
  };

  const handleRun = async () => {
    if (!workflow) return;

    try {
      const result = await executeWorkflow.mutateAsync({
        id: workflow.id,
        triggerData: {},
      });

      toast({
        title: "Workflow executed successfully",
        description: `Execution started. Click Debug to view execution details.`,
      });
    } catch (error: any) {
      toast({
        title: "Execution failed",
        description: error.message || "Failed to execute workflow",
        variant: "destructive",
      });
    }
  };

  const handleSettings = () => {
    setSettingsOpen(true);
  };

  const handleWorkflowGenerated = (nodes: Node[], edges: Edge[]) => {
    if (canvasRef) {
      canvasRef.addGeneratedNodes(nodes, edges);
      toast({
        title: "Workflow generated",
        description: "AI has generated your workflow nodes",
      });
    }
  };

  const handleDeleteWorkflow = () => {
    setShowDeleteDialog(true);
  };

  const confirmDeleteWorkflow = async () => {
    if (!workflow) return;
    
    try {
      await deleteWorkflow.mutateAsync(workflow.id);
      toast({
        title: "Workflow deleted",
        description: "Your workflow has been permanently deleted.",
      });
      setLocation('/workflows');
    } catch (error: any) {
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete workflow",
        variant: "destructive",
      });
    } finally {
      setShowDeleteDialog(false);
    }
  };

  // Prevent navigation with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Watch for node/edge changes to trigger auto-save
  useEffect(() => {
    if (workflow && (currentNodes.length > 0 || currentEdges.length > 0)) {
      const nodesChanged = JSON.stringify(currentNodes) !== JSON.stringify(lastSavedNodesRef.current);
      const edgesChanged = JSON.stringify(currentEdges) !== JSON.stringify(lastSavedEdgesRef.current);
      
      if (nodesChanged || edgesChanged) {
        triggerAutoSave(currentNodes, currentEdges);
      }
    }
  }, [currentNodes, currentEdges, workflow, triggerAutoSave]);

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <Badge className="bg-green-500">Active</Badge>
    ) : (
      <Badge variant="secondary">Inactive</Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        {/* <NavigationHeader /> */}
        <div className="flex-1 flex flex-col">
          <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container mx-auto px-4 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10" />
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-64" />
                  </div>
                </div>
                <Skeleton className="h-8 w-24" />
              </div>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <p className="text-muted-foreground">Loading workflow...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        {/* <NavigationHeader /> */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Workflow not found</h2>
            <p className="text-muted-foreground mb-4">
              The workflow you're looking for doesn't exist
            </p>
            <Button onClick={() => setLocation("/workflows")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Workflows
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-hidden bg-background">
      {/* <NavigationHeader /> */}

      {/* Workflow Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10 shrink-0">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLocation("/workflows")}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold">{workflow.name}</h1>
                  {getStatusBadge(workflow.isActive)}
                </div>
                {workflow.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {workflow.description}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Auto-save status indicator */}
              {autoSaveStatus && (
                <div className={`flex items-center gap-2 text-xs sm:text-sm ${
                  autoSaveStatus === 'saved' ? 'text-green-600' : 
                  autoSaveStatus === 'saving' ? 'text-blue-600' : 
                  'text-red-600'
                }`}>
                  {autoSaveStatus === 'saving' && <Loader2 className="w-4 h-4 animate-spin" />}
                  {autoSaveStatus === 'saved' && <CheckCircle className="w-4 h-4" />}
                  {autoSaveStatus === 'error' && <AlertTriangle className="w-4 h-4" />}
                  <span className="hidden sm:inline">
                    {autoSaveStatus === 'saved' ? 'All changes saved' : 
                     autoSaveStatus === 'saving' ? 'Saving...' : 
                     'Save failed'}
                  </span>
                </div>
              )}
              
              <div className="text-sm text-muted-foreground mr-2">
                {currentNodes.length || workflow.nodes.length} nodes
              </div>
              
              {/* Manual save button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSave(currentNodes, currentEdges)}
                disabled={updateWorkflow.isPending}
              >
                {updateWorkflow.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDebugPanelOpen(true)}
                className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border-orange-200 hover:from-orange-500/20 hover:to-red-500/20"
              >
                <Bug className="w-4 h-4 mr-2" />
                Debug
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setLocation(`/workflows/${workflow.id}/executions`)
                }
              >
                <History className="w-4 h-4 mr-2" />
                History
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setLocation(`/workflows/${workflow.id}/analytics`)
                }
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Analytics
              </Button>
              <Button variant="outline" size="sm" onClick={handleSettings}>
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
              {user && workflow.userId === user.id && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPublishModalOpen(true)}
                    className="bg-gradient-to-r from-green-500/10 to-blue-500/10 border-green-200 hover:from-green-500/20 hover:to-blue-500/20"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Publish
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDeleteWorkflow}
                    disabled={deleteWorkflow.isPending}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    {deleteWorkflow.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4 mr-2" />
                    )}
                    Delete
                  </Button>
                </>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAiAssistantOpen(true)}
                className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-200 hover:from-purple-500/20 hover:to-pink-500/20"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                AI Assistant
              </Button>
              <Button
                size="sm"
                onClick={handleRun}
                disabled={
                  executeWorkflow.isPending || (currentNodes.length === 0 && workflow.nodes.length === 0)
                }
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
              >
                {executeWorkflow.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                {executeWorkflow.isPending ? "Running..." : "Run Workflow"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="h-[calc(100vh-88px)] min-h-0">
        <WorkflowCanvas
          initialNodes={workflow.nodes}
          initialEdges={workflow.edges}
          onSave={handleSave}
          onRun={handleRun}
          onSettings={handleSettings}
          onCanvasReady={setCanvasRef}
          onNodesChange={setCurrentNodes}
          onEdgesChange={setCurrentEdges}
        />
      </div>

      {/* AI Assistant Panel */}
      <AiAssistantPanel
        open={aiAssistantOpen}
        onOpenChange={setAiAssistantOpen}
        onWorkflowGenerated={handleWorkflowGenerated}
      />

      {/* Debug Panel */}
      <WorkflowDebugPanel
        workflowId={workflow.id}
        open={debugPanelOpen}
        onOpenChange={setDebugPanelOpen}
      />

      {/* Workflow Settings Dialog */}
      <WorkflowSettingsDialog
        workflow={workflow}
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />

      {/* Publish Workflow Modal */}
      <PublishWorkflowModal
        open={publishModalOpen}
        onOpenChange={setPublishModalOpen}
        workflowId={workflow.id}
        workflowName={workflow.name}
        workflowDescription={workflow.description}
        nodes={workflow.nodes}
        triggerType={workflow.triggerType}
      />

      {/* Delete Workflow Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workflow?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{workflow.name}"? This action cannot be undone and all workflow data will be permanently lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteWorkflow}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Workflow
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
