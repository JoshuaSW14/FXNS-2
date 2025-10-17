import React, { useCallback, useMemo, useState } from 'react';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  MiniMap,
  Controls,
  Background,
  Handle,
  Position,
  NodeProps,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Calculator, 
  GitBranch, 
  Shuffle, 
  Settings2,
  Trash2,
  Eye,
  List,
  Brain,
  Globe
} from 'lucide-react';
import { FormField, LogicStep } from '@shared/tool-builder-schemas';

interface VisualFlowchartDesignerProps {
  steps: LogicStep[];
  formFields: FormField[];
  onChange: (steps: LogicStep[]) => void;
  onStepSelect: (stepId: string | null) => void;
  selectedStepId: string | null;
}

const stepTypeIcons = {
  calculation: Calculator,
  condition: GitBranch,
  transform: Shuffle,
  ai_analysis: Brain,
  api_call: Globe,
};

const stepTypeColors = {
  calculation: 'bg-blue-500',
  condition: 'bg-green-500', 
  transform: 'bg-purple-500',
  ai_analysis: 'bg-orange-500',
  api_call: 'bg-indigo-500',
};

// Custom Node Component for Logic Steps
function LogicStepNode({ data, selected }: NodeProps) {
  const { step, onSelect, onDelete } = data;
  const Icon = stepTypeIcons[step.type as keyof typeof stepTypeIcons] || Calculator;
  const bgColor = stepTypeColors[step.type as keyof typeof stepTypeColors] || 'bg-gray-500';

  return (
    <Card 
      className={`min-w-[200px] ${selected ? 'ring-2 ring-blue-500' : ''} cursor-pointer`}
      onClick={() => onSelect(step.id)} // Make entire card clickable for selection
    >
      <Handle type="target" position={Position.Top} />
      
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <div className={`p-1.5 rounded-md ${bgColor} text-white`}>
            <Icon className="h-3 w-3" />
          </div>
          <span className="text-sm font-medium capitalize">{step.type}</span>
        </div>
        
        <div className="text-xs text-gray-600 mb-2">
          {getStepSummary(step)}
        </div>
        
        <div className="flex gap-1">
          <Button
            size="sm" 
            variant="ghost"
            className="h-6 px-1"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(step.id);
            }}
          >
            <Settings2 className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost" 
            className="h-6 px-1 text-red-600 hover:text-red-700"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(step.id);
            }}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
      
      <Handle type="source" position={Position.Bottom} />
    </Card>
  );
}

// Input Fields Node to show available inputs
function InputFieldsNode({ data }: NodeProps) {
  const { formFields } = data;
  
  return (
    <Card className="min-w-[180px] bg-gray-50">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-1.5 rounded-md bg-gray-500 text-white">
            <List className="h-3 w-3" />
          </div>
          <span className="text-sm font-medium">Inputs</span>
        </div>
        
        <div className="space-y-1">
          {formFields.map((field: FormField) => (
            <Badge key={field.id} variant="outline" className="text-xs">
              {field.label}
            </Badge>
          ))}
          {formFields.length === 0 && (
            <div className="text-xs text-gray-500">No input fields</div>
          )}
        </div>
      </CardContent>
      
      <Handle type="source" position={Position.Bottom} />
    </Card>
  );
}

// Result Node to show final output
function ResultNode({ data }: NodeProps) {
  return (
    <Card className="min-w-[160px] bg-green-50">
      <Handle type="target" position={Position.Top} />
      
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-1.5 rounded-md bg-green-500 text-white">
            <Eye className="h-3 w-3" />
          </div>
          <span className="text-sm font-medium">Result</span>
        </div>
        
        <div className="text-xs text-gray-600">
          Final output will be displayed here
        </div>
      </CardContent>
    </Card>
  );
}

const nodeTypes = {
  logicStep: LogicStepNode,
  inputFields: InputFieldsNode,
  result: ResultNode,
};

export default function VisualFlowchartDesigner({
  steps,
  formFields,
  onChange,
  onStepSelect,
  selectedStepId
}: VisualFlowchartDesignerProps) {
  // Removed isFlowView state to eliminate duplicate toggle confusion

  // Convert LogicSteps to React Flow nodes
  const initialNodes: Node[] = useMemo(() => {
    const nodes: Node[] = [];
    
    // Add input fields node
    nodes.push({
      id: 'inputs',
      type: 'inputFields',
      position: { x: 250, y: 50 },
      data: { formFields },
      draggable: false,
    });

    // Add logic step nodes
    steps.forEach((step, index) => {
      nodes.push({
        id: step.id,
        type: 'logicStep',
        position: step.position || { x: 250, y: 150 + (index * 120) },
        selected: selectedStepId === step.id, // Sync visual selection with parent state
        data: {
          step,
          onSelect: onStepSelect,
          onDelete: (stepId: string) => {
            onChange(steps.filter(s => s.id !== stepId));
            if (selectedStepId === stepId) {
              onStepSelect(null);
            }
          }
        },
      });
    });

    // Add result node
    nodes.push({
      id: 'result', 
      type: 'result',
      position: { x: 250, y: 150 + (steps.length * 120) + 50 },
      data: {},
      draggable: false,
    });

    return nodes;
  }, [steps, formFields, selectedStepId, onStepSelect, onChange]);

  // Convert connections to React Flow edges
  const initialEdges: Edge[] = useMemo(() => {
    const edges: Edge[] = [];
    
    // Connect inputs to first step or result
    if (steps.length > 0) {
      edges.push({
        id: 'inputs-to-first',
        source: 'inputs',
        target: steps[0].id,
        type: 'smoothstep',
      });
    } else {
      edges.push({
        id: 'inputs-to-result',
        source: 'inputs', 
        target: 'result',
        type: 'smoothstep',
      });
    }

    // Connect steps sequentially
    steps.forEach((step, index) => {
      if (index < steps.length - 1) {
        edges.push({
          id: `${step.id}-to-${steps[index + 1].id}`,
          source: step.id,
          target: steps[index + 1].id,
          type: 'smoothstep',
        });
      } else {
        // Connect last step to result
        edges.push({
          id: `${step.id}-to-result`,
          source: step.id,
          target: 'result',
          type: 'smoothstep',
        });
      }
    });

    return edges;
  }, [steps]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Handle new connections (not fully implemented yet)
  const onConnect = useCallback(
    (params: Edge | Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // Update node positions when dragged
  const handleNodeDrag = useCallback(
    (nodeId: string, newPosition: { x: number; y: number }) => {
      const stepIndex = steps.findIndex(s => s.id === nodeId);
      if (stepIndex !== -1) {
        const updatedSteps = [...steps];
        updatedSteps[stepIndex] = {
          ...updatedSteps[stepIndex],
          position: newPosition
        };
        onChange(updatedSteps);
      }
    },
    [steps, onChange]
  );

  // Update nodes when steps change
  React.useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  React.useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  // Always render the visual flow when this component is shown

  return (
    <div className="h-[600px] border rounded-lg bg-gray-50">
      <div className="flex items-center justify-between p-3 border-b bg-white">
        <h3 className="text-sm font-medium">Visual Flow Designer</h3>
        <div className="text-xs text-gray-500">
          Drag nodes to reposition • Click nodes to configure
        </div>
      </div>
      
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        onNodeDragStop={(event, node) => {
          handleNodeDrag(node.id, node.position);
        }}
        fitView
        fitViewOptions={{
          padding: 0.2,
          includeHiddenNodes: false,
        }}
      >
        <Controls />
        <MiniMap />
        <Background variant={"dots" as any} gap={12} size={1} />
      </ReactFlow>
    </div>
  );
}

function getStepSummary(step: LogicStep): string {
  switch (step.type) {
    case 'calculation':
      const formula = step.config.calculation?.formula;
      return formula ? `Formula: ${formula.length > 15 ? formula.substring(0, 15) + '...' : formula}` : 'No formula set';
    case 'condition':
      const condition = step.config.condition;
      return condition?.if ? `If ${condition.if.fieldId} ${condition.if.operator} ${condition.if.value}` : 'No condition set';
    case 'transform':
      const transform = step.config.transform;
      return transform ? `${transform.transformType} transformation` : 'No transform set';
    case 'ai_analysis':
      const ai = step.config.aiAnalysis;
      return ai?.prompt ? `AI: ${ai.prompt.substring(0, 20)}...` : 'No AI prompt set';
    case 'api_call':
      const api = step.config.apiCall;
      return api?.url ? `${api.method} ${api.url}` : 'No API URL set';
    default:
      return 'Configure this step';
  }
}