import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';

export interface AiNodeData {
  label: string;
  aiType?: string;
}

function AiNode({ data, selected }: NodeProps<AiNodeData>) {
  return (
    <Card className={`min-w-[200px] transition-all ${selected ? 'ring-2 ring-primary shadow-lg' : 'shadow-md'}`}>
      <Handle
        id="in"
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-pink-600 !border-2 !border-white"
      />
      <div className="p-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-pink-500/10">
            <Sparkles className="w-5 h-5 text-pink-600" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-foreground">AI Action</div>
            <div className="text-xs text-muted-foreground">{data.label}</div>
          </div>
        </div>
        {data.aiType && (
          <div className="text-xs text-muted-foreground mt-2 px-2 py-1 bg-muted rounded">
            {data.aiType}
          </div>
        )}
      </div>
      <Handle
        id="out"
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-pink-600 !border-2 !border-white"
      />
    </Card>
  );
}

export default memo(AiNode);
