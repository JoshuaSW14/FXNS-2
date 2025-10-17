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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/api";

interface ToolPricingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fxnId: string;
  currentPricing?: {
    pricingModel: 'free' | 'one_time';
    price?: number;
    licenseType?: string;
  };
  currentAccessTier?: 'free' | 'pro';
}

export function ToolPricingModal({
  open,
  onOpenChange,
  fxnId,
  currentPricing,
  currentAccessTier = 'free',
}: ToolPricingModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [pricingModel, setPricingModel] = useState<'free' | 'pro' | 'one_time'>(
    currentAccessTier === 'pro' ? 'pro' : (currentPricing?.pricingModel || 'free')
  );
  const [price, setPrice] = useState(
    currentPricing?.price ? (currentPricing.price / 100).toFixed(2) : '9.99'
  );
  const [licenseType, setLicenseType] = useState<'personal' | 'team' | 'enterprise'>(
    (currentPricing?.licenseType as any) || 'personal'
  );

  const updatePricingMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', `/api/marketplace/pricing/${fxnId}`, data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update pricing');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tool-pricing', fxnId] });
      toast({
        title: 'Pricing updated',
        description: 'Your tool pricing has been saved successfully.',
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const priceInCents = pricingModel === 'one_time' ? Math.round(parseFloat(price) * 100) : 0;

    if (pricingModel === 'one_time' && priceInCents < 99) {
      toast({
        title: 'Invalid price',
        description: 'Minimum price is $0.99',
        variant: 'destructive',
      });
      return;
    }

    const data: any = {
      pricingModel: pricingModel === 'pro' ? 'free' : pricingModel,
      price: priceInCents,
      licenseType,
      accessTier: pricingModel === 'pro' ? 'pro' : 'free',
    };

    updatePricingMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Set Tool Pricing</DialogTitle>
            <DialogDescription>
              Configure how users can access your tool
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-3">
              <Label>Pricing Model</Label>
              <RadioGroup value={pricingModel} onValueChange={(value: any) => setPricingModel(value)}>
                <div className="flex items-center space-x-2 border rounded-lg p-3">
                  <RadioGroupItem value="free" id="free" />
                  <Label htmlFor="free" className="flex-1 cursor-pointer">
                    <div className="font-medium">Free</div>
                    <div className="text-sm text-muted-foreground">
                      Available to everyone
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 border rounded-lg p-3 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20">
                  <RadioGroupItem value="pro" id="pro" />
                  <Label htmlFor="pro" className="flex-1 cursor-pointer">
                    <div className="font-medium flex items-center gap-1">
                      Pro Tier
                      <span className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 px-1.5 py-0.5 rounded">PRO</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Requires Pro subscription to use
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 border rounded-lg p-3">
                  <RadioGroupItem value="one_time" id="one_time" />
                  <Label htmlFor="one_time" className="flex-1 cursor-pointer">
                    <div className="font-medium">One-time Purchase</div>
                    <div className="text-sm text-muted-foreground">
                      Pay once, use forever
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {pricingModel === 'one_time' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="price">
                    Price (USD)
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
                    You'll receive 70% ($  {((parseFloat(price) || 0) * 0.7).toFixed(2)}) after platform fees
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>License Type</Label>
                  <RadioGroup value={licenseType} onValueChange={(value: any) => setLicenseType(value)}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="personal" id="personal" />
                      <Label htmlFor="personal" className="cursor-pointer">Personal</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="team" id="team" />
                      <Label htmlFor="team" className="cursor-pointer">Team</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="enterprise" id="enterprise" />
                      <Label htmlFor="enterprise" className="cursor-pointer">Enterprise</Label>
                    </div>
                  </RadioGroup>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updatePricingMutation.isPending}>
              {updatePricingMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Save Pricing
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
