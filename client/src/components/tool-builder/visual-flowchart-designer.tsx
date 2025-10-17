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
  Globe,
  Workflow
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
  switch: Workflow,
  transform: Shuffle,
  ai_analysis: Brain,
  api_call: Globe,
};

const stepTypeColors = {
  calculation: 'bg-blue-500',
  condition: 'bg-green-500',
  switch: 'bg-teal-500',
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

  // Helper function to recursively collect all nodes including nested ones
  const collectNodes = useCallback((
    stepList: LogicStep[],
    xOffset: number = 250,
    yOffset: number = 150,
    parentId: string | null = null
  ): { nodes: Node[], nextY: number } => {
    const nodes: Node[] = [];
    let currentY = yOffset;

    stepList.forEach((step, index) => {
      // Add the main step node
      nodes.push({
        id: step.id,
        type: 'logicStep',
        position: step.position || { x: xOffset, y: currentY },
        selected: selectedStepId === step.id,
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
      
      currentY += 120;

      // Handle nested steps for condition
      if (step.type === 'condition' && step.config.condition) {
        const branchOffsetX = 150;
        let branchIndex = 0;
        
        // Process THEN branch
        if (step.config.condition.then && step.config.condition.then.length > 0) {
          const result = collectNodes(
            step.config.condition.then,
            xOffset + branchOffsetX * (branchIndex - 1),
            currentY,
            step.id
          );
          nodes.push(...result.nodes);
          branchIndex++;
        }
        
        // Process ELSE-IF branches
        if (step.config.condition.elseIf) {
          step.config.condition.elseIf.forEach((elseIfBranch: any) => {
            if (elseIfBranch.then && elseIfBranch.then.length > 0) {
              const result = collectNodes(
                elseIfBranch.then,
                xOffset + branchOffsetX * branchIndex,
                currentY,
                step.id
              );
              nodes.push(...result.nodes);
              branchIndex++;
            }
          });
        }
        
        // Process ELSE branch
        if (step.config.condition.else && step.config.condition.else.length > 0) {
          const result = collectNodes(
            step.config.condition.else,
            xOffset + branchOffsetX * branchIndex,
            currentY,
            step.id
          );
          nodes.push(...result.nodes);
        }
        
        // Adjust currentY to account for branch heights
        currentY += 100; // Extra spacing after branches
      }

      // Handle nested steps for switch
      if (step.type === 'switch' && step.config.switch) {
        const branchOffsetX = 150;
        let branchIndex = 0;
        
        // Process CASE branches
        if (step.config.switch.cases) {
          step.config.switch.cases.forEach((caseItem: any) => {
            if (caseItem.then && caseItem.then.length > 0) {
              const result = collectNodes(
                caseItem.then,
                xOffset + branchOffsetX * (branchIndex - Math.floor(step.config.switch.cases.length / 2)),
                currentY,
                step.id
              );
              nodes.push(...result.nodes);
              branchIndex++;
            }
          });
        }
        
        // Process DEFAULT branch
        if (step.config.switch.default && step.config.switch.default.length > 0) {
          const result = collectNodes(
            step.config.switch.default,
            xOffset + branchOffsetX * branchIndex,
            currentY,
            step.id
          );
          nodes.push(...result.nodes);
        }
        
        currentY += 100; // Extra spacing after branches
      }
    });

    return { nodes, nextY: currentY };
  }, [selectedStepId, onStepSelect, onChange, steps]);

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

    // Collect all nodes including nested ones
    const { nodes: stepNodes, nextY } = collectNodes(steps, 250, 150, null);
    nodes.push(...stepNodes);

    // Add result node
    nodes.push({
      id: 'result', 
      type: 'result',
      position: { x: 250, y: nextY + 50 },
      data: {},
      draggable: false,
    });

    return nodes;
  }, [steps, formFields, selectedStepId, onStepSelect, onChange, collectNodes]);

  // Helper function to recursively collect all edges including branch connections
  const collectEdges = useCallback((
    stepList: LogicStep[],
    parentId: string | null = null,
    branchLabel: string = ''
  ): Edge[] => {
    const edges: Edge[] = [];

    stepList.forEach((step, index) => {
      // Connect to parent if this is a nested step
      if (parentId && index === 0) {
        edges.push({
          id: `${parentId}-to-${step.id}`,
          source: parentId,
          target: step.id,
          type: 'smoothstep',
          label: branchLabel,
          labelStyle: { fontSize: 10, fontWeight: 500 },
          style: { 
            stroke: branchLabel.includes('THEN') ? '#22c55e' : 
                    branchLabel.includes('ELSE IF') ? '#eab308' :
                    branchLabel.includes('ELSE') ? '#ef4444' :
                    branchLabel.includes('CASE') ? '#14b8a6' :
                    branchLabel.includes('DEFAULT') ? '#6b7280' : '#3b82f6'
          }
        });
      }

      // Connect sequential steps within the same branch
      if (index < stepList.length - 1) {
        edges.push({
          id: `${step.id}-to-${stepList[index + 1].id}`,
          source: step.id,
          target: stepList[index + 1].id,
          type: 'smoothstep',
        });
      }

      // Handle nested steps for condition
      if (step.type === 'condition' && step.config.condition) {
        // THEN branch
        if (step.config.condition.then && step.config.condition.then.length > 0) {
          const branchEdges = collectEdges(step.config.condition.then, step.id, 'THEN');
          edges.push(...branchEdges);
        }
        
        // ELSE-IF branches
        if (step.config.condition.elseIf) {
          step.config.condition.elseIf.forEach((elseIfBranch: any, idx: number) => {
            if (elseIfBranch.then && elseIfBranch.then.length > 0) {
              const branchEdges = collectEdges(elseIfBranch.then, step.id, `ELSE IF ${idx + 1}`);
              edges.push(...branchEdges);
            }
          });
        }
        
        // ELSE branch
        if (step.config.condition.else && step.config.condition.else.length > 0) {
          const branchEdges = collectEdges(step.config.condition.else, step.id, 'ELSE');
          edges.push(...branchEdges);
        }
      }

      // Handle nested steps for switch
      if (step.type === 'switch' && step.config.switch) {
        // CASE branches
        if (step.config.switch.cases) {
          step.config.switch.cases.forEach((caseItem: any, idx: number) => {
            if (caseItem.then && caseItem.then.length > 0) {
              const branchEdges = collectEdges(caseItem.then, step.id, `CASE: ${caseItem.value}`);
              edges.push(...branchEdges);
            }
          });
        }
        
        // DEFAULT branch
        if (step.config.switch.default && step.config.switch.default.length > 0) {
          const branchEdges = collectEdges(step.config.switch.default, step.id, 'DEFAULT');
          edges.push(...branchEdges);
        }
      }
    });

    return edges;
  }, []);

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

    // Collect all edges including branch connections
    const stepEdges = collectEdges(steps, null, '');
    edges.push(...stepEdges);

    // Find all leaf steps (steps with no children) to connect to result
    const findLeafSteps = (stepList: LogicStep[]): string[] => {
      const leafIds: string[] = [];
      
      stepList.forEach(step => {
        let hasChildren = false;
        
        if (step.type === 'condition' && step.config.condition) {
          const hasThen = step.config.condition.then && step.config.condition.then.length > 0;
          const hasElseIf = step.config.condition.elseIf && step.config.condition.elseIf.some((b: any) => b.then && b.then.length > 0);
          const hasElse = step.config.condition.else && step.config.condition.else.length > 0;
          
          if (hasThen || hasElseIf || hasElse) {
            hasChildren = true;
            if (hasThen) leafIds.push(...findLeafSteps(step.config.condition.then));
            if (hasElseIf) {
              step.config.condition.elseIf.forEach((b: any) => {
                if (b.then && b.then.length > 0) leafIds.push(...findLeafSteps(b.then));
              });
            }
            if (hasElse) leafIds.push(...findLeafSteps(step.config.condition.else));
          }
        }
        
        if (step.type === 'switch' && step.config.switch) {
          const hasCases = step.config.switch.cases && step.config.switch.cases.some((c: any) => c.then && c.then.length > 0);
          const hasDefault = step.config.switch.default && step.config.switch.default.length > 0;
          
          if (hasCases || hasDefault) {
            hasChildren = true;
            if (hasCases) {
              step.config.switch.cases.forEach((c: any) => {
                if (c.then && c.then.length > 0) leafIds.push(...findLeafSteps(c.then));
              });
            }
            if (hasDefault) leafIds.push(...findLeafSteps(step.config.switch.default));
          }
        }
        
        if (!hasChildren) {
          leafIds.push(step.id);
        }
      });
      
      return leafIds;
    };

    const leafSteps = findLeafSteps(steps);
    
    // Connect leaf steps to result
    if (leafSteps.length > 0) {
      leafSteps.forEach(leafId => {
        edges.push({
          id: `${leafId}-to-result`,
          source: leafId,
          target: 'result',
          type: 'smoothstep',
        });
      });
    } else if (steps.length > 0) {
      // If no leaves found but we have steps, connect last step to result
      edges.push({
        id: `${steps[steps.length - 1].id}-to-result`,
        source: steps[steps.length - 1].id,
        target: 'result',
        type: 'smoothstep',
      });
    }

    return edges;
  }, [steps, collectEdges]);

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
      if (!condition?.if) return 'No condition set';
      const elseIfCount = condition.elseIf?.length || 0;
      const hasElse = condition.else && condition.else.length > 0;
      let summary = `If ${condition.if.fieldId} ${condition.if.operator} ${condition.if.value}`;
      if (elseIfCount > 0) summary += ` +${elseIfCount} else-if`;
      if (hasElse) summary += ' +else';
      return summary;
    case 'switch':
      const switchConfig = step.config.switch;
      if (!switchConfig) return 'No switch configured';
      const caseCount = switchConfig.cases?.length || 0;
      return `Switch on ${switchConfig.fieldId} (${caseCount} cases)`;
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