import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  iconColor?: string;
  trend?: number;
  trendLabel?: string;
  badge?: {
    text: string;
    variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  };
  className?: string;
  formatValue?: (value: any) => string;
}

export default function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  iconColor = 'text-primary-600',
  trend,
  trendLabel,
  badge,
  className = '',
  formatValue
}: MetricCardProps) {
  const renderTrendIndicator = () => {
    if (trend === undefined) return null;
    
    const getTrendIcon = () => {
      if (trend > 0) return <TrendingUp className="h-4 w-4" />;
      if (trend < 0) return <TrendingDown className="h-4 w-4" />;
      return <Minus className="h-4 w-4" />;
    };

    const getTrendStyle = () => {
      if (trend > 0) return 'text-green-600 bg-green-50';
      if (trend < 0) return 'text-red-600 bg-red-50';
      return 'text-gray-600 bg-gray-50';
    };

    return (
      <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getTrendStyle()}`}>
        {getTrendIcon()}
        <span>
          {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
        </span>
        {trendLabel && <span className="ml-1">{trendLabel}</span>}
      </div>
    );
  };

  const displayValue = formatValue ? formatValue(value) : value;

  return (
    <Card className={`transition-all duration-200 hover:shadow-md ${className}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              {badge && (
                <Badge variant={badge.variant || 'default'} className="text-xs">
                  {badge.text}
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-3 mb-2">
              <p className="text-2xl font-bold text-gray-900">
                {displayValue}
              </p>
              {renderTrendIndicator()}
            </div>

            {description && (
              <p className="text-sm text-muted-foreground">
                {description}
              </p>
            )}
          </div>
          
          {Icon && (
            <div className={`ml-4 ${iconColor}`}>
              <Icon className="h-8 w-8" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}