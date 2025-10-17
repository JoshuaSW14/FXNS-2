import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Repeat } from 'lucide-react';
import { Card } from '@/components/ui/card';

export interface LoopNodeData {
  label: string;
  loopType?: string;
}

function LoopNode({ data, selected }: NodeProps<LoopNodeData>) {
  return (
    <Card className={`min-w-[200px] transition-all ${selected ? 'ring-2 ring-primary shadow-lg' : 'shadow-md'}`}>
      <Handle
        id="in"
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-cyan-600 !border-2 !border-white"
      />
      <div className="p-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-cyan-500/10">
            <Repeat className="w-5 h-5 text-cyan-600" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-foreground">Loop</div>
            <div className="text-xs text-muted-foreground">{data.label}</div>
          </div>
        </div>
        {data.loopType && (
          <div className="text-xs text-muted-foreground mt-2 px-2 py-1 bg-muted rounded">
            {data.loopType}
          </div>
        )}
      </div>
      <Handle
        id="out"
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-cyan-600 !border-2 !border-white"
      />
    </Card>
  );
}

export default memo(LoopNode);
