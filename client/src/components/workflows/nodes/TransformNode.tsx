import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Shuffle } from 'lucide-react';
import { Card } from '@/components/ui/card';

export interface TransformNodeData {
  label: string;
  transformType?: string;
}

function TransformNode({ data, selected }: NodeProps<TransformNodeData>) {
  return (
    <Card className={`min-w-[200px] transition-all ${selected ? 'ring-2 ring-primary shadow-lg' : 'shadow-md'}`}>
      <div className="p-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-purple-500/10">
            <Shuffle className="w-5 h-5 text-purple-600" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-foreground">Transform</div>
            <div className="text-xs text-muted-foreground">{data.label}</div>
          </div>
        </div>
        {data.transformType && (
          <div className="text-xs text-muted-foreground mt-2 px-2 py-1 bg-muted rounded">
            {data.transformType}
          </div>
        )}
      </div>
      <Handle
        id="in"
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-purple-600 !border-2 !border-white"
      />
      <Handle
        id="out"
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-purple-600 !border-2 !border-white"
      />
    </Card>
  );
}

export default memo(TransformNode);
