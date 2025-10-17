import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
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
import { useToast } from "@/hooks/use-toast";
import { Loader2, CreditCard } from "lucide-react";
import { apiRequest } from "@/lib/api";

const stripePromise = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY 
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
  : null;

interface PurchaseToolModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fxnId: string;
  fxnTitle: string;
  pricing: {
    pricingModel: string;
    price: number;
  };
  onSuccess?: () => void;
}

function CheckoutForm({ fxnId, fxnTitle, pricing, onSuccess }: any) {
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
          return_url: `${window.location.origin}/purchases?success=true`,
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
          description: `You now have access to ${fxnTitle}`,
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
            {pricing.pricingModel === 'subscription' && '/mo'}
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

export function PurchaseToolModal({
  open,
  onOpenChange,
  fxnId,
  fxnTitle,
  pricing,
  onSuccess,
}: PurchaseToolModalProps) {
  const { toast } = useToast();
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  const initiatePurchaseMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', 'marketplace/purchase', {
        fxnId,
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
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      onOpenChange(false);
    },
  });

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && !clientSecret) {
      initiatePurchaseMutation.mutate();
    } else if (!newOpen) {
      setClientSecret(null);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Purchase {fxnTitle}</DialogTitle>
          <DialogDescription>
            Complete your purchase to get instant access
          </DialogDescription>
        </DialogHeader>

        {initiatePurchaseMutation.isPending ? (
          <div className="py-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Preparing checkout...</p>
          </div>
        ) : clientSecret ? (
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <CheckoutForm
              fxnId={fxnId}
              fxnTitle={fxnTitle}
              pricing={pricing}
              onSuccess={() => {
                onSuccess?.();
                handleOpenChange(false);
              }}
            />
          </Elements>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
