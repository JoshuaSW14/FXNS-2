import { useCallback, useState, DragEvent, useMemo, useEffect, useRef } from "react";
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  NodeTypes,
  Panel,
} from "reactflow";
import "reactflow/dist/style.css";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Save,
  Play,
  Settings,
  Zap,
  GitBranch,
  Shuffle,
  Globe,
  Sparkles,
  RefreshCw,
  Wrench,
} from "lucide-react";
import TriggerNode from "./nodes/TriggerNode";
import ActionNode from "./nodes/ActionNode";
import ConditionNode from "./nodes/ConditionNode";
import TransformNode from "./nodes/TransformNode";
import ApiNode from "./nodes/ApiNode";
import AiNode from "./nodes/AiNode";
import LoopNode from "./nodes/LoopNode";
import ToolNode from "./nodes/ToolNode";
import NodeConfigPanel from "./node-config-panel";

interface WorkflowCanvasProps {
  initialNodes?: Node[];
  initialEdges?: Edge[];
  onSave?: (nodes: Node[], edges: Edge[]) => void;
  onRun?: () => void;
  onSettings?: () => void;
  onCanvasReady?: (api: {
    addGeneratedNodes: (nodes: Node[], edges: Edge[]) => void;
  }) => void;
  onNodesChange?: (nodes: Node[]) => void;
  onEdgesChange?: (edges: Edge[]) => void;
}

const nodeTypes: NodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  condition: ConditionNode,
  transform: TransformNode,
  api: ApiNode,
  ai: AiNode,
  loop: LoopNode,
  tool: ToolNode,
};

const nodePalette = [
  {
    type: "trigger",
    label: "Trigger",
    icon: Zap,
    color: "text-green-600",
    bgColor: "bg-green-500/10",
  },
  {
    type: "action",
    label: "Action",
    icon: Play,
    color: "text-blue-600",
    bgColor: "bg-blue-500/10",
  },
  {
    type: "condition",
    label: "Condition",
    icon: GitBranch,
    color: "text-amber-600",
    bgColor: "bg-amber-500/10",
  },
  {
    type: "transform",
    label: "Transform",
    icon: Shuffle,
    color: "text-purple-600",
    bgColor: "bg-purple-500/10",
  },
  {
    type: "api",
    label: "API Call",
    icon: Globe,
    color: "text-indigo-600",
    bgColor: "bg-indigo-500/10",
  },
  {
    type: "ai",
    label: "AI Task",
    icon: Sparkles,
    color: "text-pink-600",
    bgColor: "bg-pink-500/10",
  },
  {
    type: "loop",
    label: "Loop",
    icon: RefreshCw,
    color: "text-orange-600",
    bgColor: "bg-orange-500/10",
  },
  {
    type: "tool",
    label: "Tool",
    icon: Wrench,
    color: "text-teal-600",
    bgColor: "bg-teal-500/10",
  },
];

export default function WorkflowCanvas({
  initialNodes = [],
  initialEdges = [],
  onSave,
  onRun,
  onSettings,
  onCanvasReady,
  onNodesChange: onNodesChangeProp,
  onEdgesChange: onEdgesChangeProp,
}: WorkflowCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const configPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (onNodesChangeProp) {
      onNodesChangeProp(nodes);
    }
  }, [nodes, onNodesChangeProp]);

  useEffect(() => {
    if (onEdgesChangeProp) {
      onEdgesChangeProp(edges);
    }
  }, [edges, onEdgesChangeProp]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        selectedNode &&
        configPanelRef.current &&
        !configPanelRef.current.contains(event.target as Node)
      ) {
        const target = event.target as HTMLElement;
        const isNodeClick = target.closest('.react-flow__node');
        if (!isNodeClick) {
          setSelectedNode(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [selectedNode]);

  const addGeneratedNodes = useCallback(
    (newNodes: Node[], newEdges: Edge[]) => {
      setNodes((currentNodes) => [...currentNodes, ...newNodes]);
      setEdges((currentEdges) => [...currentEdges, ...newEdges]);
    },
    [setNodes, setEdges]
  );

  const deleteNode = useCallback((id: string) => {
    setNodes(prev => prev.filter(n => n.id !== id));
    setEdges(prev => prev.filter(e => e.source !== id && e.target !== id));
    setSelectedNode(curr => (curr?.id === id ? null : curr));
  }, []);

  useEffect(() => {
    if (onCanvasReady) {
      onCanvasReady({ addGeneratedNodes });
    }
  }, [onCanvasReady, addGeneratedNodes]);

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) => addEdge({ ...params, type: "smoothstep" }, eds)),
    [setEdges]
  );

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onSelectionChange = useCallback(({ nodes: selected }: { nodes: Node[] }) => {
    setSelectedNode(selected?.[0] ?? null);
  }, []);

  const onNodeContextMenu = useCallback(
    (evt: React.MouseEvent, node: Node) => {
      evt.preventDefault();
      // super-light context action: immediate delete with confirm
      if (confirm(`Delete node "${node.data?.label ?? node.id}"?`)) {
        deleteNode(node.id);
      }
    },
    [deleteNode]
  );

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const data = event.dataTransfer.getData("application/reactflow");
      if (!data) {
        console.warn("WorkflowCanvas: No drag data found");
        return;
      }

      let parsedData;
      try {
        parsedData = JSON.parse(data);
      } catch (e) {
        console.error("WorkflowCanvas: Failed to parse drag data", e);
        return;
      }

      const { type, label } = parsedData;
      if (!type) {
        console.warn("WorkflowCanvas: Missing node type");
        return;
      }
      
      if (!reactFlowInstance) {
        console.warn("WorkflowCanvas: ReactFlow instance not ready");
        return;
      }

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: { label },
      };
      
      console.log("WorkflowCanvas: Adding new node", newNode);
      setNodes((nds) => {
        const updated = nds.concat(newNode);
        console.log("WorkflowCanvas: Total nodes after add:", updated.length);
        return updated;
      });
    },
    [reactFlowInstance, setNodes]
  );

  const handleSave = () => {
    if (onSave) {
      onSave(nodes, edges);
    }
  };

  const handleNodeClick = useCallback((_event: any, node: Node) => {
    setSelectedNode(node);
  }, []);

  const handleUpdateNode = useCallback(
    (nodeId: string, updates: any) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId) {
            return { ...node, data: updates };
          }
          return node;
        })
      );
      setSelectedNode((current) =>
        current?.id === nodeId ? { ...current, data: updates } : current
      );
    },
    [setNodes]
  );

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* 1) Full-bleed canvas as the base layer */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDrop={onDrop} // make sure this reads your dataTransfer payload
        onDragOver={(e) => {
          // keep this — prevents default so drop fires
          e.preventDefault();
          if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
        }}
        onNodeClick={handleNodeClick}
        deleteKeyCode={["Delete", "Backspace"]}
        nodeTypes={nodeTypes}
        fitView
        className="absolute inset-0 bg-background z-0"
        style={{ width: "100%", height: "100%" }}
        onInit={setReactFlowInstance}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        <Controls />
        <MiniMap className="!bg-background !border !border-border" />
        {/* keep ReactFlow Panels only for simple buttons if you want */}
      </ReactFlow>

      {/* 2) Floating PALETTE — outside ReactFlow so DnD works reliably */}
      <div className="absolute top-6 left-6 z-40 pointer-events-auto select-none">
        <Card className="w-72 p-4 shadow-xl border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 max-h-[70vh] overflow-auto">
          <h3 className="font-semibold mb-4">Node Palette</h3>
          <Separator className="mb-4" />
          <div className="space-y-2">
            {nodePalette.map((node) => (
              <div
                key={node.type}
                className="flex items-center gap-3 p-3 rounded-lg border bg-card cursor-move hover:bg-accent transition-colors"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData(
                    "application/reactflow",
                    JSON.stringify({ type: node.type, label: node.label })
                  );
                  e.dataTransfer.effectAllowed = "move";
                }}
              >
                <div className={`p-2 rounded-lg ${node.bgColor}`}>
                  <node.icon className={`w-4 h-4 ${node.color}`} />
                </div>
                <span className="text-sm font-medium">{node.label}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* 3) Floating CONFIG PANEL — overlay, not pushing layout */}
      {selectedNode && (
        <div 
          ref={configPanelRef}
          className="absolute inset-y-0 right-0 z-50 pointer-events-none"
        >
          <div className="pointer-events-auto w-[380px] max-w-[90vw] h-full">
            <div className="h-full overflow-auto">
              <NodeConfigPanel
                selectedNode={selectedNode}
                onClose={() => setSelectedNode(null)}
                onUpdate={handleUpdateNode}
                onDelete={(id) => deleteNode(id)} 
              />
            </div>
          </div>
        </div>
      )}

      {/* 4) Floating toolbar - moves left when config panel is open */}
      <div 
        className={`absolute top-4 z-40 flex gap-2 transition-all duration-200 ${
          selectedNode ? 'right-[400px]' : 'right-4'
        }`}
      >
        <Button variant="outline" size="sm" onClick={handleSave}>
          <Save className="w-4 h-4 mr-2" />
          Save
        </Button>
        <Button variant="outline" size="sm" onClick={onRun}>
          <Play className="w-4 h-4 mr-2" />
          Run
        </Button>
        <Button variant="outline" size="sm" onClick={onSettings}>
          <Settings className="w-4 h-4 mr-2" />
          Settings
        </Button>
      </div>
    </div>
  );
}
