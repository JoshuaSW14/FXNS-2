import React from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  RadialBarChart,
  RadialBar,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface AnalyticsChartProps {
  title: string;
  description?: string;
  type: 'line' | 'bar' | 'area' | 'pie' | 'radial' | 'donut';
  data: any[];
  dataKey: string;
  xAxis?: string;
  yAxis?: string;
  colors?: string[];
  height?: number;
  showTrend?: boolean;
  trendValue?: number;
  formatValue?: (value: any) => string;
  className?: string;
}

const DEFAULT_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f97316', '#eab308', 
  '#22c55e', '#06b6d4', '#3b82f6', '#a855f7', '#ef4444'
];

export default function AnalyticsChart({
  title,
  description,
  type,
  data,
  dataKey,
  xAxis = 'name',
  yAxis,
  colors = DEFAULT_COLORS,
  height = 300,
  showTrend = false,
  trendValue = 0,
  formatValue,
  className = ''
}: AnalyticsChartProps) {
  const renderTrendIndicator = () => {
    if (!showTrend) return null;
    
    const getTrendIcon = () => {
      if (trendValue > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
      if (trendValue < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
      return <Minus className="h-4 w-4 text-gray-500" />;
    };

    const getTrendColor = () => {
      if (trendValue > 0) return 'text-green-500';
      if (trendValue < 0) return 'text-red-500';
      return 'text-gray-500';
    };

    return (
      <div className="flex items-center gap-1 text-sm">
        {getTrendIcon()}
        <span className={getTrendColor()}>
          {trendValue > 0 ? '+' : ''}{trendValue.toFixed(1)}%
        </span>
      </div>
    );
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="text-sm font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatValue ? formatValue(entry.value) : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderChart = () => {
    switch (type) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis 
                dataKey={xAxis} 
                stroke="#64748b" 
                fontSize={12}
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                stroke="#64748b" 
                fontSize={12}
                axisLine={false}
                tickLine={false}
                tickFormatter={formatValue}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey={dataKey}
                stroke={colors[0]}
                strokeWidth={2.5}
                dot={{ fill: colors[0], strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, fill: colors[0] }}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis 
                dataKey={xAxis} 
                stroke="#64748b" 
                fontSize={12}
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                stroke="#64748b" 
                fontSize={12}
                axisLine={false}
                tickLine={false}
                tickFormatter={formatValue}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey={dataKey} fill={colors[0]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis 
                dataKey={xAxis} 
                stroke="#64748b" 
                fontSize={12}
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                stroke="#64748b" 
                fontSize={12}
                axisLine={false}
                tickLine={false}
                tickFormatter={formatValue}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey={dataKey}
                stroke={colors[0]}
                fill={colors[0]}
                fillOpacity={0.1}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'pie':
      case 'donut':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                outerRadius={type === 'donut' ? 80 : 100}
                innerRadius={type === 'donut' ? 40 : 0}
                dataKey={dataKey}
                nameKey={xAxis}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'radial':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <RadialBarChart cx="50%" cy="50%" innerRadius="10%" outerRadius="80%" data={data}>
              <RadialBar dataKey={dataKey} cornerRadius={10} fill={colors[0]} />
              <Tooltip content={<CustomTooltip />} />
            </RadialBarChart>
          </ResponsiveContainer>
        );

      default:
        return <div>Unsupported chart type</div>;
    }
  };

  return (
    <Card className={`h-full ${className}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">{title}</CardTitle>
            {description && (
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          {renderTrendIndicator()}
        </div>
      </CardHeader>
      <CardContent className="pb-6">
        {renderChart()}
      </CardContent>
    </Card>
  );
}