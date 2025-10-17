import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Sparkles, ArrowRight, Check } from "lucide-react";
import { useLocation } from "wouter";

interface ProUpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature: string;
  description?: string;
}

export function ProUpgradeDialog({ open, onOpenChange, feature, description }: ProUpgradeDialogProps) {
  const [, setLocation] = useLocation();

  const handleUpgrade = () => {
    onOpenChange(false);
    setLocation('/subscription');
  };

  const proFeatures = [
    "🧠 AI-powered analysis & insights",
    "🌐 Advanced API integrations", 
    "📝 Rich text & signature fields",
    "📍 Location & mapping tools",
    "💰 Currency & financial tools",
    "⭐ Rating & feedback components",
    "🔧 JSON editor & advanced fields",
    "📱 Barcode & QR code scanning"
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg">
              <Crown className="h-5 w-5 text-white" />
            </div>
            <DialogTitle className="text-xl">Upgrade to Pro</DialogTitle>
          </div>
          <DialogDescription>
            <span className="font-medium text-foreground">{feature}</span> is a Pro feature.
            {description && (
              <span className="block mt-1 text-muted-foreground">{description}</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 p-4 rounded-lg border">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-purple-600" />
              <span className="font-medium">Pro Plan includes:</span>
            </div>
            <div className="grid grid-cols-1 gap-2 text-sm">
              {proFeatures.slice(0, 4).map((feature, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Check className="h-3 w-3 text-green-600 shrink-0" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 text-center">
              <Badge variant="secondary" className="bg-gradient-to-r from-purple-100 to-blue-100 text-purple-800 dark:from-purple-900 dark:to-blue-900 dark:text-purple-200">
                + Much more for just $20/month
              </Badge>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Maybe Later
          </Button>
          <Button onClick={handleUpgrade} className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
            <Crown className="h-4 w-4 mr-2" />
            Upgrade Now
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}