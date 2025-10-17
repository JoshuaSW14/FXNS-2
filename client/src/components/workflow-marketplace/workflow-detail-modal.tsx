import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CreditCard, GitBranch, User, Calendar, CheckCircle2, Copy } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { format } from "date-fns";
import { useLocation } from "wouter";
import { useCloneWorkflow } from "@/hooks/use-workflows";

const stripePromise = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY 
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
  : null;

interface WorkflowDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflowId: string;
}

function CheckoutForm({ workflowId, workflowName, pricing, onSuccess }: any) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [licenseType, setLicenseType] = useState<'personal' | 'team' | 'enterprise'>('personal');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/workflow-marketplace?success=true`,
        },
        redirect: 'if_required',
      });

      if (error) {
        toast({
          title: 'Payment failed',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Purchase successful!',
          description: `You now have access to ${workflowName}`,
        });
        onSuccess?.();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-3">
        <Label>License Type</Label>
        <RadioGroup value={licenseType} onValueChange={(value: any) => setLicenseType(value)}>
          <div className="flex items-center space-x-2 border rounded-lg p-3">
            <RadioGroupItem value="personal" id="lic-personal" />
            <Label htmlFor="lic-personal" className="flex-1 cursor-pointer">
              <div className="font-medium">Personal</div>
              <div className="text-sm text-muted-foreground">
                For individual use
              </div>
            </Label>
          </div>
          <div className="flex items-center space-x-2 border rounded-lg p-3">
            <RadioGroupItem value="team" id="lic-team" />
            <Label htmlFor="lic-team" className="flex-1 cursor-pointer">
              <div className="font-medium">Team</div>
              <div className="text-sm text-muted-foreground">
                For team collaboration
              </div>
            </Label>
          </div>
          <div className="flex items-center space-x-2 border rounded-lg p-3">
            <RadioGroupItem value="enterprise" id="lic-enterprise" />
            <Label htmlFor="lic-enterprise" className="flex-1 cursor-pointer">
              <div className="font-medium">Enterprise</div>
              <div className="text-sm text-muted-foreground">
                For large organizations
              </div>
            </Label>
          </div>
        </RadioGroup>
      </div>

      <div className="space-y-3">
        <Label>Payment Details</Label>
        <div className="border rounded-lg p-4">
          <PaymentElement />
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t">
        <div>
          <div className="text-sm text-muted-foreground">Total</div>
          <div className="text-2xl font-bold">
            ${(pricing.price / 100).toFixed(2)}
          </div>
        </div>
        <Button
          type="submit"
          disabled={!stripe || isProcessing}
          size="lg"
        >
          {isProcessing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          <CreditCard className="w-4 h-4 mr-2" />
          {isProcessing ? 'Processing...' : 'Complete Purchase'}
        </Button>
      </div>
    </form>
  );
}

export function WorkflowDetailModal({
  open,
  onOpenChange,
  workflowId,
}: WorkflowDetailModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const cloneWorkflow = useCloneWorkflow();

  const { data: workflowData, isLoading } = useQuery({
    queryKey: ['workflow-detail', workflowId],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/workflows/${workflowId}`);
      if (!response.ok) throw new Error("Failed to fetch workflow");
      return response.json();
    },
    enabled: open && !!workflowId,
  });

  const { data: pricingData } = useQuery({
    queryKey: ['workflow-pricing', workflowId],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/workflow-marketplace/pricing/${workflowId}`);
      if (!response.ok) throw new Error("Failed to fetch pricing");
      return response.json();
    },
    enabled: open && !!workflowId,
  });

  const { data: accessData } = useQuery({
    queryKey: ['workflow-access', workflowId],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/workflow-marketplace/check-access/${workflowId}`);
      if (!response.ok) throw new Error("Failed to check access");
      return response.json();
    },
    enabled: open && !!workflowId,
  });

  const initiatePurchaseMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/workflow-marketplace/purchase', {
        workflowId,
        licenseType: 'personal',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to initiate purchase');
      }
      return response.json();
    },
    onSuccess: (data) => {
      if (data.clientSecret) {
        setClientSecret(data.clientSecret);
        setShowCheckout(true);
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleClone = () => {
    cloneWorkflow.mutate(workflowId, {
      onSuccess: (data) => {
        toast({
          title: 'Workflow cloned!',
          description: 'The workflow has been added to your workflows',
        });
        onOpenChange(false);
        setLocation(`/workflows/${data.id}`);
      },
      onError: () => {
        toast({
          title: 'Error',
          description: 'Failed to clone workflow',
          variant: 'destructive',
        });
      },
    });
  };

  const handlePurchase = () => {
    initiatePurchaseMutation.mutate();
  };

  const workflow = workflowData;
  const pricing = pricingData;
  const hasAccess = accessData?.hasAccess;
  const isPurchased = accessData?.reason === 'purchased';
  const isFree = !pricing || pricing.pricingModel === 'free';

  const nodeCount = workflow?.nodes?.length || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="w-5 h-5" />
            {workflow?.name || 'Loading...'}
          </DialogTitle>
          <DialogDescription>
            {workflow?.description || 'No description available'}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : showCheckout && clientSecret ? (
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <CheckoutForm
              workflowId={workflowId}
              workflowName={workflow?.name}
              pricing={pricing}
              onSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ['workflow-access', workflowId] });
                queryClient.invalidateQueries({ queryKey: ['workflow-marketplace-my-purchases'] });
                setShowCheckout(false);
                setClientSecret(null);
              }}
            />
          </Elements>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <GitBranch className="w-4 h-4" />
                <span>{nodeCount} nodes</span>
              </div>
              {workflow?.category && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="capitalize">
                    {workflow.category}
                  </Badge>
                </div>
              )}
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>{workflow?.createdAt ? format(new Date(workflow.createdAt), 'MMM d, yyyy') : ''}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="w-4 h-4" />
                <span>Creator</span>
              </div>
            </div>

            <Separator />

            {isPurchased && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-700 font-medium">
                  <CheckCircle2 className="w-5 h-5" />
                  You own this workflow
                </div>
              </div>
            )}

            <div>
              <h3 className="font-semibold mb-3">Workflow Nodes</h3>
              {nodeCount === 0 ? (
                <p className="text-sm text-muted-foreground">No nodes configured</p>
              ) : (
                <div className="space-y-2">
                  {workflow?.nodes?.map((node: any, index: number) => (
                    <div key={node.id} className="flex items-center gap-2 p-2 border rounded">
                      <Badge variant="secondary">{index + 1}</Badge>
                      <span className="font-medium capitalize">{node.type}</span>
                      <span className="text-sm text-muted-foreground ml-auto">{node.data?.label || 'Untitled'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {workflow?.triggerType && (
              <div>
                <h3 className="font-semibold mb-2">Trigger Configuration</h3>
                <div className="p-3 bg-neutral-50 rounded-lg">
                  <div className="text-sm">
                    <span className="font-medium">Type: </span>
                    <Badge variant="outline" className="capitalize ml-2">{workflow.triggerType}</Badge>
                  </div>
                </div>
              </div>
            )}

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Price</div>
                {isFree ? (
                  <Badge variant="secondary" className="text-lg">Free</Badge>
                ) : (
                  <div className="text-2xl font-bold">
                    ${((pricing?.price || 0) / 100).toFixed(2)}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                {hasAccess ? (
                  <Button onClick={handleClone} disabled={cloneWorkflow.isPending}>
                    {cloneWorkflow.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    <Copy className="w-4 h-4 mr-2" />
                    Clone to My Workflows
                  </Button>
                ) : isFree ? (
                  <Button onClick={handleClone} disabled={cloneWorkflow.isPending}>
                    {cloneWorkflow.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    <Copy className="w-4 h-4 mr-2" />
                    Clone Workflow
                  </Button>
                ) : (
                  <Button onClick={handlePurchase} disabled={initiatePurchaseMutation.isPending}>
                    {initiatePurchaseMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    <CreditCard className="w-4 h-4 mr-2" />
                    Purchase Workflow
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
