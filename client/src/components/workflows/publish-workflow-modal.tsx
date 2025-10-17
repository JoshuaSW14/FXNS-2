import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ExternalLink } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { useLocation } from "wouter";

interface PublishWorkflowModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflowId: string;
  workflowName: string;
  workflowDescription?: string | null;
  nodes?: any[];
  triggerType?: string;
}

const categories = [
  { id: "productivity", name: "Productivity" },
  { id: "communication", name: "Communication" },
  { id: "data", name: "Data" },
  { id: "social", name: "Social" },
  { id: "finance", name: "Finance" },
  { id: "automation", name: "Automation" },
];

export function PublishWorkflowModal({
  open,
  onOpenChange,
  workflowId,
  workflowName,
  workflowDescription,
  nodes = [],
  triggerType,
}: PublishWorkflowModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const [pricingModel, setPricingModel] = useState<'free' | 'one_time'>('free');
  const [price, setPrice] = useState('9.99');
  const [licenseType, setLicenseType] = useState<'personal' | 'team' | 'enterprise'>('personal');
  const [category, setCategory] = useState('automation');
  const [description, setDescription] = useState(workflowDescription || '');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const publishMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', `/api/workflow-marketplace/pricing/${workflowId}`, data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to publish workflow');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-pricing', workflowId] });
      queryClient.invalidateQueries({ queryKey: ['workflow-marketplace-bestsellers'] });
      toast({
        title: 'Workflow published!',
        description: 'Your workflow is now available on the marketplace.',
      });
      onOpenChange(false);
      setLocation('/workflow-marketplace');
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const validateForm = (): boolean => {
    const errors: string[] = [];

    if (!nodes || nodes.length < 2) {
      errors.push('Workflow must have at least 2 nodes');
    }

    if (!triggerType || triggerType === 'manual') {
      errors.push('Workflow must have a trigger configured (not manual)');
    }

    if (!description || description.trim().length < 50) {
      errors.push('Description must be at least 50 characters');
    }

    if (pricingModel === 'one_time') {
      const priceNum = parseFloat(price);
      if (isNaN(priceNum) || priceNum < 0.99) {
        errors.push('Price must be at least $0.99');
      }
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast({
        title: 'Validation failed',
        description: 'Please fix the errors before publishing',
        variant: 'destructive',
      });
      return;
    }

    const priceInCents = pricingModel === 'one_time' ? Math.round(parseFloat(price) * 100) : 0;

    const data = {
      pricingModel,
      price: priceInCents,
      licenseType,
    };

    publishMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Publish Workflow to Marketplace</DialogTitle>
            <DialogDescription>
              Configure pricing and details for "{workflowName}"
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {validationErrors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="text-sm font-medium text-red-800 mb-2">
                  Please fix the following issues:
                </div>
                <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="description">
                Description <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="description"
                placeholder="Describe what your workflow does and how it can help users..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                required
              />
              <p className="text-xs text-muted-foreground">
                {description.length}/50 characters minimum
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label>Pricing Model <span className="text-red-500">*</span></Label>
              <RadioGroup value={pricingModel} onValueChange={(value: any) => setPricingModel(value)}>
                <div className="flex items-center space-x-2 border rounded-lg p-3">
                  <RadioGroupItem value="free" id="free" />
                  <Label htmlFor="free" className="flex-1 cursor-pointer">
                    <div className="font-medium">Free</div>
                    <div className="text-sm text-muted-foreground">
                      Available to everyone at no cost
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 border rounded-lg p-3">
                  <RadioGroupItem value="one_time" id="one_time" />
                  <Label htmlFor="one_time" className="flex-1 cursor-pointer">
                    <div className="font-medium">One-time Purchase</div>
                    <div className="text-sm text-muted-foreground">
                      Users pay once, use forever
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {pricingModel === 'one_time' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="price">
                    Price (USD) <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      $
                    </span>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      min="0.99"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="pl-7"
                      required
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    You'll receive 70% (${((parseFloat(price) || 0) * 0.7).toFixed(2)}) after platform fees
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>License Type</Label>
                  <RadioGroup value={licenseType} onValueChange={(value: any) => setLicenseType(value)}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="personal" id="personal" />
                      <Label htmlFor="personal" className="cursor-pointer">Personal Use</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="team" id="team" />
                      <Label htmlFor="team" className="cursor-pointer">Team Use</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="enterprise" id="enterprise" />
                      <Label htmlFor="enterprise" className="cursor-pointer">Enterprise Use</Label>
                    </div>
                  </RadioGroup>
                </div>
              </>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-sm text-blue-800">
                <div className="font-medium mb-1">Publishing Requirements:</div>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>At least 2 nodes configured</li>
                  <li>Trigger type set (schedule, webhook, or event)</li>
                  <li>Description at least 50 characters</li>
                  <li>Price required if one-time purchase selected</li>
                </ul>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={publishMutation.isPending}>
              {publishMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Publish to Marketplace
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
