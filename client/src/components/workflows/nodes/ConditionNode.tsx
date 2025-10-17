import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { GitBranch } from 'lucide-react';
import { Card } from '@/components/ui/card';

export interface ConditionNodeData {
  label: string;
  condition?: string;
}

function ConditionNode({ data, selected }: NodeProps<ConditionNodeData>) {
  return (
    <Card className={`min-w-[200px] transition-all ${selected ? 'ring-2 ring-primary shadow-lg' : 'shadow-md'}`}>
      <div className="p-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-amber-500/10">
            <GitBranch className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-foreground">Condition</div>
            <div className="text-xs text-muted-foreground">{data.label}</div>
          </div>
        </div>
        {data.condition && (
          <div className="text-xs text-muted-foreground mt-2 px-2 py-1 bg-muted rounded">
            {data.condition}
          </div>
        )}
      </div>
      <Handle
        id="in"
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-amber-600 !border-2 !border-white"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="true"
        className="!w-3 !h-3 !bg-amber-600 !border-2 !border-white !top-[35%]"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="false"
        className="!w-3 !h-3 !bg-amber-600 !border-2 !border-white !top-[65%]"
      />
    </Card>
  );
}

export default memo(ConditionNode);
