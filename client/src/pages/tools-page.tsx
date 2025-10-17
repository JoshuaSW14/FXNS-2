import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { SEO } from "@/components/seo";
import Footer from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Fxn } from "@shared/schema";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
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
} from "lucide-react";
import {
  useMyTools,
  useCreateTool,
  useDeleteTool,
  useCloneTool,
  useUpdateTool,
  Tool,
} from "@/hooks/use-tools";
import FxnCard from "@/components/fxn-card";

const categories = [
  { id: "all", name: "All Tools", count: 0 },
  { id: "calculator", name: "Calculators", count: 0 },
  { id: "converter", name: "Converters", count: 0 },
  { id: "developer", name: "Developers", count: 0 },
  { id: "health", name: "Health", count: 0 },
  { id: "design", name: "Design", count: 0 },
  { id: "finance", name: "Finance", count: 0 },
];

interface Tag {
  id: string;
  name: string;
  slug: string;
  color: string | null;
}

interface FxnWithTags extends Fxn {
  tags?: Array<{
    id: string;
    name: string;
    slug: string;
    color: string | null;
  }>;
  pricing?: {
    pricingModel: string;
    price: number;
  };
  salesCount?: number;
}

export default function ToolsPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const deleteTool = useDeleteTool();

  // Fetch tools
  const { data: tools, isLoading } = useMyTools();

  const handleToolClick = (tool: Tool) => {
    setLocation(`/fxn/${tool.id}`);
  };

  const handleDeleteTool = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      await deleteTool.mutateAsync(id);
      toast({
        title: "Tool deleted",
        description: "The tool has been deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete tool",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <SEO
        title="Tools - fxns"
        description="View your payment history, invoices, and transaction details"
      />

      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">Tools</h1>
              <p className="text-muted-foreground">
                View, create, and manage your tools
              </p>
            </div>
            <Button onClick={() => setLocation("/create-tool")} size="lg">
              <Plus className="w-4 h-4 mr-2" />
              Create Tool
            </Button>
          </div>

          <Separator className="mb-8" />

          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading tools...</p>
            </div>
          ) : tools && tools.tools.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {tools.tools.map((tool: any) => (
                <FxnCard
                  key={tool.id}
                  fxn={tool}
                  onClick={() => handleToolClick(tool)}
                  showBadge={!tool.isPublic}
                  badgeText={!tool.isPublic ? "Private" : undefined}
                  badgeVariant={!tool.isPublic ? "secondary" : "default"}
                />
              ))}
            </div>
          ) : (
            // <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            //   {tools.tools.map((tool) => (
            //     <Card
            //       key={tool.id}
            //       className="hover:shadow-lg transition-shadow cursor-pointer"
            //       onClick={() => setLocation(`/tools/${tool.id}`)}
            //     >
            //       <CardHeader>
            //         <div className="flex items-start justify-between">
            //           <div className="flex items-center gap-2">
            //             <div className="p-2 rounded-lg bg-primary/10">
            //               <WorkflowIcon className="w-5 h-5 text-primary" />
            //             </div>
            //             <div>
            //               <CardTitle className="text-lg">
            //                 {tool.title}
            //               </CardTitle>
            //             </div>
            //           </div>
            //           <DropdownMenu>
            //             <DropdownMenuTrigger
            //               asChild
            //               onClick={(e) => e.stopPropagation()}
            //             >
            //               <Button variant="ghost" size="icon">
            //                 <MoreVertical className="w-4 h-4" />
            //               </Button>
            //             </DropdownMenuTrigger>
            //             <DropdownMenuContent align="end">
            //               <DropdownMenuItem
            //                 onClick={(e) => {
            //                   e.stopPropagation();
            //                   setLocation(`/tools/${tool.id}`);
            //                 }}
            //               >
            //                 <Edit className="w-4 h-4 mr-2" />
            //                 Edit
            //               </DropdownMenuItem>
            //               <DropdownMenuItem
            //                 className="text-destructive"
            //                 onClick={(e) => {
            //                   e.stopPropagation();
            //                   handleDeleteTool(tool.id, tool.title);
            //                 }}
            //               >
            //                 <Trash2 className="w-4 h-4 mr-2" />
            //                 Delete
            //               </DropdownMenuItem>
            //             </DropdownMenuContent>
            //           </DropdownMenu>
            //         </div>
            //         <CardDescription className="mt-2">
            //           {tool.description || "No description"}
            //         </CardDescription>
            //       </CardHeader>
            //       <CardContent>
            //         <div className="space-y-3">
            //           <div className="flex items-center justify-between">
            //             <span className="text-sm text-muted-foreground">
            //               Updated
            //             </span>
            //             <span className="text-sm">
            //               {new Date(tool.updatedAt).toLocaleDateString()}
            //             </span>
            //           </div>
            //         </div>
            //       </CardContent>
            //     </Card>
            //   ))}
            // </div>
            <Card className="py-12">
              <CardContent className="text-center">
                <WorkflowIcon className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">No tools yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first tool to get started with automation
                </p>
                <Button onClick={() => setLocation("/create-tool")}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Tool
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
