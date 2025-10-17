import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Wrench, Settings } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default memo(({ data, selected }: NodeProps) => {
  const toolName = data?.toolName || data?.label || 'Select Tool';
  const toolCategory = data?.toolCategory;
  const mappedInputsCount = data?.inputMappings?.length || 0;

  return (
    <Card className={`min-w-[200px] ${selected ? 'ring-2 ring-teal-500' : ''}`}>
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-teal-500"
      />
      
      <div className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center">
            <Wrench className="w-4 h-4 text-teal-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm truncate">{toolName}</div>
            {toolCategory && (
              <div className="text-xs text-muted-foreground">{toolCategory}</div>
            )}
          </div>
          {data?.toolId && (
            <Settings className="w-4 h-4 text-muted-foreground shrink-0" />
          )}
        </div>
        
        {mappedInputsCount > 0 && (
          <Badge variant="secondary" className="text-xs">
            {mappedInputsCount} input{mappedInputsCount !== 1 ? 's' : ''} mapped
          </Badge>
        )}
        
        {!data?.toolId && (
          <div className="text-xs text-amber-600 mt-2">
            Configure tool
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-teal-500"
      />
    </Card>
  );
});
