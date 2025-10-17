import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, ResponsiveContainer, Treemap } from 'recharts';

interface HeatmapData {
  name: string;
  value: number;
  color?: string;
}

interface EngagementHeatmapProps {
  title: string;
  data: HeatmapData[];
  height?: number;
  className?: string;
}

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'];

export default function EngagementHeatmap({
  title,
  data,
  height = 300,
  className = ''
}: EngagementHeatmapProps) {
  const getColor = (index: number) => COLORS[index % COLORS.length];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="text-sm font-medium">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            Usage: {data.value} times
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomTreemapContent = ({ x, y, width, height, index, payload }: any) => {
    if (width < 30 || height < 20) return null;

    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          style={{
            fill: getColor(index),
            fillOpacity: 0.8,
            stroke: '#fff',
            strokeWidth: 2,
          }}
          rx={4}
        />
        {width > 60 && height > 30 && (
          <text
            x={x + width / 2}
            y={y + height / 2}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={Math.min(12, width / 8)}
            fill="white"
            fontWeight="500"
          >
            {payload.name.length > 12 ? payload.name.substring(0, 12) + '...' : payload.name}
          </text>
        )}
        {width > 80 && height > 45 && (
          <text
            x={x + width / 2}
            y={y + height / 2 + 15}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={10}
            fill="white"
            opacity={0.8}
          >
            {payload.value}
          </text>
        )}
      </g>
    );
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <Treemap
            data={data}
            dataKey="value"
            aspectRatio={1}
            stroke="white"
            content={<CustomTreemapContent />}
          >
            <Tooltip content={<CustomTooltip />} />
          </Treemap>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}