import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Zap, Plug } from 'lucide-react';
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

export interface TriggerNodeData {
  label: string;
  triggerType?: string;
  integrationId?: string;
  integrationProvider?: string;
}

function TriggerNode({ data, selected }: NodeProps<TriggerNodeData>) {
  return (
    <Card className={`min-w-[200px] transition-all ${selected ? 'ring-2 ring-primary shadow-lg' : 'shadow-md'}`}>
      <div className="p-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-green-500/10">
            <Zap className="w-5 h-5 text-green-600" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-foreground">Trigger</div>
            <div className="text-xs text-muted-foreground">{data.label}</div>
          </div>
        </div>
        {data.triggerType && (
          <div className="text-xs text-muted-foreground mt-2 px-2 py-1 bg-muted rounded">
            {data.triggerType}
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
        className="!w-3 !h-3 !bg-green-600 !border-2 !border-white"
      />
    </Card>
  );
}

export default memo(TriggerNode);
