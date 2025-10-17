import React, { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Brush,
  ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Eye, 
  EyeOff,
  TrendingUp,
  Download
} from 'lucide-react';

interface DataSeries {
  key: string;
  name: string;
  color: string;
  visible: boolean;
  type?: 'line' | 'bar' | 'area';
}

interface AdvancedChartProps {
  title: string;
  description?: string;
  data: any[];
  series: DataSeries[];
  xAxis: string;
  height?: number;
  enableBrush?: boolean;
  enableZoom?: boolean;
  enableLegendToggle?: boolean;
  onDataPointClick?: (data: any, seriesKey: string) => void;
  formatValue?: (value: any) => string;
  className?: string;
}

export default function AdvancedChart({
  title,
  description,
  data,
  series,
  xAxis,
  height = 400,
  enableBrush = true,
  enableZoom = true,
  enableLegendToggle = true,
  onDataPointClick,
  formatValue,
  className = ''
}: AdvancedChartProps) {
  const [visibleSeries, setVisibleSeries] = useState<Set<string>>(
    new Set(series.filter(s => s.visible).map(s => s.key))
  );
  const [zoomDomain, setZoomDomain] = useState<{ left?: number; right?: number }>({});
  const [brushData, setBrushData] = useState<{ startIndex?: number; endIndex?: number }>({});

  // Filter data for visible series and zoom domain
  const chartData = useMemo(() => {
    let filtered = data;
    
    if (brushData.startIndex !== undefined && brushData.endIndex !== undefined) {
      filtered = data.slice(brushData.startIndex, brushData.endIndex + 1);
    }
    
    return filtered;
  }, [data, brushData]);

  const toggleSeries = (seriesKey: string) => {
    const newVisible = new Set(visibleSeries);
    if (newVisible.has(seriesKey)) {
      newVisible.delete(seriesKey);
    } else {
      newVisible.add(seriesKey);
    }
    setVisibleSeries(newVisible);
  };

  const resetZoom = () => {
    setZoomDomain({});
    setBrushData({});
  };

  const handleBrushChange = (brushData: any) => {
    if (brushData && brushData.startIndex !== undefined) {
      setBrushData({
        startIndex: brushData.startIndex,
        endIndex: brushData.endIndex
      });
    }
  };

  const exportData = () => {
    const csv = [
      // Header
      [xAxis, ...series.filter(s => visibleSeries.has(s.key)).map(s => s.name)].join(','),
      // Data rows
      ...chartData.map(row => [
        row[xAxis],
        ...series.filter(s => visibleSeries.has(s.key)).map(s => row[s.key] || 0)
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.toLowerCase().replace(/\s+/g, '_')}_data.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border rounded-lg shadow-lg max-w-xs">
          <p className="font-medium text-sm mb-2">{label}</p>
          <div className="space-y-1">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: entry.color }}
                  />
                  <span>{entry.name}:</span>
                </div>
                <span className="font-medium">
                  {formatValue ? formatValue(entry.value) : entry.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  const renderChart = () => {
    // Determine chart type based on series (use first visible series type)
    const firstVisibleSeries = series.find(s => visibleSeries.has(s.key));
    const chartType = firstVisibleSeries?.type || 'line';

    const commonProps = {
      data: chartData,
      margin: { top: 20, right: 30, left: 20, bottom: 60 },
      onClick: onDataPointClick ? (data: any) => {
        if (data && data.activePayload) {
          onDataPointClick(data.activePayload[0].payload, data.activeLabel);
        }
      } : undefined
    };

    const axes = (
      <>
        <XAxis 
          dataKey={xAxis}
          stroke="#64748b"
          fontSize={12}
          axisLine={false}
          tickLine={false}
          domain={zoomDomain.left && zoomDomain.right ? [zoomDomain.left, zoomDomain.right] : undefined}
        />
        <YAxis 
          stroke="#64748b"
          fontSize={12}
          axisLine={false}
          tickLine={false}
          tickFormatter={formatValue}
        />
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <Tooltip content={<CustomTooltip />} />
        {enableLegendToggle && <Legend />}
      </>
    );

    const seriesComponents = series
      .filter(s => visibleSeries.has(s.key))
      .map(s => {
        const Component = chartType === 'bar' ? Bar : 
                          chartType === 'area' ? Area : Line;
        
        const props = {
          key: s.key,
          dataKey: s.key,
          name: s.name,
          stroke: s.color,
          fill: chartType === 'area' ? s.color : undefined,
          fillOpacity: chartType === 'area' ? 0.1 : undefined,
          strokeWidth: chartType === 'line' ? 2.5 : undefined,
          type: chartType === 'line' ? 'monotone' : undefined,
          dot: chartType === 'line' ? { fill: s.color, strokeWidth: 2, r: 4 } : undefined,
          activeDot: chartType === 'line' ? { r: 6, fill: s.color } : undefined,
          radius: chartType === 'bar' ? [4, 4, 0, 0] : undefined,
        };

        return React.createElement(Component as any, props);
      });

    const ChartComponent = chartType === 'bar' ? BarChart : 
                           chartType === 'area' ? AreaChart : LineChart;

    return React.createElement(
      ChartComponent as any,
      commonProps,
      axes,
      ...seriesComponents,
      enableBrush && React.createElement(Brush, {
        dataKey: xAxis,
        height: 30,
        stroke: '#6366f1',
        onChange: handleBrushChange
      })
    );
  };

  return (
    <Card className={`${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">{title}</CardTitle>
            {description && (
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {enableZoom && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetZoom}
                  disabled={!brushData.startIndex}
                  className="h-8"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportData}
                  className="h-8"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
        
        {/* Series Toggle Controls */}
        {enableLegendToggle && (
          <div className="flex flex-wrap gap-2 mt-4">
            {series.map(s => (
              <Button
                key={s.key}
                variant="ghost"
                size="sm"
                onClick={() => toggleSeries(s.key)}
                className={`h-8 px-3 ${
                  visibleSeries.has(s.key) 
                    ? 'bg-primary/10 text-primary' 
                    : 'text-muted-foreground'
                }`}
              >
                {visibleSeries.has(s.key) ? (
                  <Eye className="h-3 w-3 mr-1" />
                ) : (
                  <EyeOff className="h-3 w-3 mr-1" />
                )}
                <div 
                  className="w-3 h-3 rounded-full mr-2" 
                  style={{ backgroundColor: s.color }}
                />
                {s.name}
              </Button>
            ))}
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          {renderChart()}
        </ResponsiveContainer>
        
        {brushData.startIndex && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-blue-700">
              <TrendingUp className="h-4 w-4" />
              <span>
                Showing data from index {brushData.startIndex} to {brushData.endIndex} 
                ({(brushData.endIndex || 0) - (brushData.startIndex || 0) + 1} items)
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}