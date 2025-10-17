import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Lightbulb, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Info,
  ArrowRight,
  LucideIcon
} from 'lucide-react';

export interface InsightData {
  id: string;
  type: 'recommendation' | 'warning' | 'success' | 'info';
  title: string;
  description: string;
  impact?: 'high' | 'medium' | 'low';
  action?: {
    label: string;
    onClick: () => void;
  };
  metrics?: {
    label: string;
    value: string;
  }[];
}

interface InsightCardProps {
  insight: InsightData;
  className?: string;
}

const INSIGHT_CONFIG = {
  recommendation: {
    icon: Lightbulb,
    iconColor: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200'
  },
  warning: {
    icon: AlertTriangle,
    iconColor: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200'
  },
  success: {
    icon: CheckCircle,
    iconColor: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200'
  },
  info: {
    icon: Info,
    iconColor: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200'
  }
};

const IMPACT_CONFIG = {
  high: { color: 'text-red-600', bg: 'bg-red-100' },
  medium: { color: 'text-yellow-600', bg: 'bg-yellow-100' },
  low: { color: 'text-green-600', bg: 'bg-green-100' }
};

export default function InsightCard({ insight, className = '' }: InsightCardProps) {
  const config = INSIGHT_CONFIG[insight.type];
  const Icon = config.icon;

  return (
    <Card className={`${config.borderColor} ${className}`}>
      <CardHeader className={`${config.bgColor} pb-3`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${config.bgColor} ${config.iconColor}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">{insight.title}</CardTitle>
            </div>
          </div>
          {insight.impact && (
            <Badge 
              variant="outline" 
              className={`${IMPACT_CONFIG[insight.impact].color} ${IMPACT_CONFIG[insight.impact].bg} border-current`}
            >
              {insight.impact} impact
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-4 pb-4">
        <p className="text-sm text-muted-foreground mb-4">
          {insight.description}
        </p>

        {insight.metrics && insight.metrics.length > 0 && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            {insight.metrics.map((metric, index) => (
              <div key={index} className="text-center p-2 bg-gray-50 rounded-lg">
                <p className="text-xs text-muted-foreground">{metric.label}</p>
                <p className="font-semibold text-sm">{metric.value}</p>
              </div>
            ))}
          </div>
        )}

        {insight.action && (
          <Button
            variant="outline"
            size="sm"
            onClick={insight.action.onClick}
            className="w-full flex items-center justify-center gap-2"
          >
            {insight.action.label}
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}