import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Globe, Plug } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const PROVIDER_LABELS: Record<string, string> = {
  gmail: "Gmail",
  google_calendar: "Google Calendar",
  spotify: "Spotify",
  openweather: "Weather",
  twilio: "Twilio",
  github: "GitHub",
};

export interface ApiNodeData {
  label: string;
  apiType?: string;
  integrationId?: string;
  integrationProvider?: string;
}

function ApiNode({ data, selected }: NodeProps<ApiNodeData>) {
  return (
    <Card className={`min-w-[200px] transition-all ${selected ? 'ring-2 ring-primary shadow-lg' : 'shadow-md'}`}>
      <Handle
        id="in"
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-orange-600 !border-2 !border-white"
      />
      <div className="p-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-orange-500/10">
            <Globe className="w-5 h-5 text-orange-600" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-foreground">API Call</div>
            <div className="text-xs text-muted-foreground">{data.label}</div>
          </div>
        </div>
        {data.apiType && (
          <div className="text-xs text-muted-foreground mt-2 px-2 py-1 bg-muted rounded">
            {data.apiType}
          </div>
        )}
        {data.integrationProvider && (
          <Badge variant="secondary" className="mt-2 text-xs">
            <Plug className="w-3 h-3 mr-1" />
            {PROVIDER_LABELS[data.integrationProvider] || data.integrationProvider}
          </Badge>
        )}
      </div>
      <Handle
        id="out"
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-orange-600 !border-2 !border-white"
      />
    </Card>
  );
}

export default memo(ApiNode);
