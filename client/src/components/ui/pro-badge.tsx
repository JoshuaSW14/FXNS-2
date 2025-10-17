import { Badge } from "@/components/ui/badge";
import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProBadgeProps {
  className?: string;
  size?: 'sm' | 'md';
}

export function ProBadge({ className, size = 'sm' }: ProBadgeProps) {
  return (
    <Badge 
      className={cn(
        "bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-0 font-medium",
        size === 'sm' && "text-xs px-1.5 py-0.5",
        size === 'md' && "text-sm px-2 py-1",
        className
      )}
    >
      <Crown className={cn(
        "mr-1",
        size === 'sm' && "h-3 w-3",
        size === 'md' && "h-4 w-4"
      )} />
      PRO
    </Badge>
  );
}