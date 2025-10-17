import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ProBadge } from "@/components/ui/pro-badge";
import { ProUpgradeDialog } from "@/components/ui/pro-upgrade-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { 
  Plus, 
  Trash2, 
  Calculator, 
  GitBranch, 
  Shuffle,
  ArrowDown,
  Settings,
  Workflow,
  Brain,
  Globe,
  Search,
  Eye,
  X,
  AlertTriangle,
  HelpCircle,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { FormField, LogicStep, Variable } from "@shared/tool-builder-schemas";
import VisualFlowchartDesigner from "./visual-flowchart-designer";
import { 
  PROMPT_TEMPLATES, 
  PROMPT_CATEGORIES, 
  getTemplatesByCategory, 
  getTemplateById,
  estimateTokensForPrompt,
  estimateCost,
  formatCost
} from "@shared/prompt-templates";

export type { LogicStep, Variable };

interface LogicFlowBuilderProps {
  steps: LogicStep[];
  formFields: FormField[];
  onChange: (steps: LogicStep[]) => void;
}

const stepTypes = [
  { 
    value: 'calculation', 
    label: 'Calculate', 
    icon: Calculator, 
    description: 'Perform mathematical calculations',
    color: 'bg-blue-100 text-blue-800 border-blue-200'
  },
  { 
    value: 'condition', 
    label: 'If/Then/Else', 
    icon: GitBranch, 
    description: 'Conditional logic with if/else-if/else branches',
    color: 'bg-green-100 text-green-800 border-green-200'
  },
  { 
    value: 'switch', 
    label: 'Switch/Case', 
    icon: Workflow, 
    description: 'Multi-way branching based on value matching',
    color: 'bg-teal-100 text-teal-800 border-teal-200'
  },
  { 
    value: 'transform', 
    label: 'Transform', 
    icon: Shuffle, 
    description: 'Transform text or data',
    color: 'bg-purple-100 text-purple-800 border-purple-200'
  },
  { 
    value: 'ai_analysis', 
    label: 'AI Analysis', 
    icon: Brain, 
    description: 'Use AI to analyze, generate, or decide',
    color: 'bg-orange-100 text-orange-800 border-orange-200'
  },
  { 
    value: 'api_call', 
    label: 'API Call', 
    icon: Globe, 
    description: 'Fetch data from external services',
    color: 'bg-indigo-100 text-indigo-800 border-indigo-200'
  }
];

const operators = [
  { value: 'equals', label: 'equals' },
  { value: 'not_equals', label: 'not equals' },
  { value: 'greater_than', label: 'greater than' },
  { value: 'less_than', label: 'less than' },
  { value: 'contains', label: 'contains' }
];

const transformTypes = [
  { value: 'uppercase', label: 'UPPERCASE' },
  { value: 'lowercase', label: 'lowercase' },
  { value: 'trim', label: 'Remove whitespace' },
  { value: 'format_currency', label: 'Format as Currency' },
  { value: 'format_date', label: 'Format as Date' },
  { value: 'extract_domain', label: 'Extract Domain' }
];

// Component for step type selection dropdown
interface StepTypeSelectorProps {
  onSelect: (type: LogicStep['type']) => void;
  isPro: boolean;
  onProFeatureClick: (stepLabel: string) => void;
  buttonClassName?: string;
  buttonVariant?: 'default' | 'ghost' | 'outline';
}

function StepTypeSelector({ 
  onSelect, 
  isPro, 
  onProFeatureClick,
  buttonClassName = "h-6 text-xs",
  buttonVariant = "ghost"
}: StepTypeSelectorProps) {
  const proStepTypes = new Set(['ai_analysis', 'api_call']);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={buttonVariant} size="sm" className={buttonClassName}>
          <Plus className="h-3 w-3 mr-1" />
          Add Step
          <ChevronDown className="h-3 w-3 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        {stepTypes.map((stepType) => {
          const Icon = stepType.icon;
          const isProFeature = proStepTypes.has(stepType.value);
          const isLocked = isProFeature && !isPro;

          return (
            <DropdownMenuItem
              key={stepType.value}
              onClick={() => {
                if (isLocked) {
                  onProFeatureClick(stepType.label);
                } else {
                  onSelect(stepType.value as LogicStep['type']);
                }
              }}
              className="cursor-pointer"
            >
              <div className="flex items-center gap-3 w-full">
                <div className={`p-1.5 rounded ${stepType.color}`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{stepType.label}</span>
                    {isProFeature && <ProBadge size="sm" />}
                  </div>
                  <div className="text-xs text-gray-500">{stepType.description}</div>
                </div>
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function LogicFlowBuilder({ 
  steps, 
  formFields, 
  onChange 
}: LogicFlowBuilderProps) {
  const { user } = useAuth();
  const [selectedStep, setSelectedStep] = useState<string | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'list' | 'visual'>('list');
  const [showProUpgrade, setShowProUpgrade] = useState(false);
  const [pendingProFeature, setPendingProFeature] = useState<string>('');

  // Check if user has Pro subscription
  const isPro = user?.subscriptionStatus === 'active';

  // Pro-only step types
  const proStepTypes = new Set(['ai_analysis', 'api_call']);

  const handleProFeatureClick = (stepType: string, stepLabel: string) => {
    if (isPro || !proStepTypes.has(stepType)) {
      addStep(stepType as LogicStep['type']);
    } else {
      setPendingProFeature(stepLabel);
      setShowProUpgrade(true);
    }
  };

  const generateId = () => `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const addStep = useCallback((type: LogicStep['type']) => {
    const newStep: LogicStep = {
      id: generateId(),
      type,
      position: { x: 0, y: steps.length * 100 },
      config: {}
    };

    // Initialize config based on type
    if (type === 'calculation') {
      newStep.config.calculation = {
        formula: '',
        variables: []
      };
    } else if (type === 'condition') {
      newStep.config.condition = {
        if: {
          fieldId: formFields[0]?.id || '',
          operator: 'equals',
          value: ''
        },
        then: [],
        elseIf: [],
        else: []
      };
    } else if (type === 'switch') {
      newStep.config.switch = {
        fieldId: formFields[0]?.id || '',
        cases: [
          { value: '', then: [] }
        ],
        default: []
      };
    } else if (type === 'transform') {
      newStep.config.transform = {
        inputFieldId: formFields[0]?.id || '',
        transformType: 'uppercase'
      };
    } else if (type === 'ai_analysis') {
      newStep.config.aiAnalysis = {
        prompt: '',
        inputFields: [],
        outputFormat: 'text'
      };
    } else if (type === 'api_call') {
      newStep.config.apiCall = {
        method: 'GET',
        url: '',
        headers: {},
        body: {}
      };
    }

    onChange([...steps, newStep]);
    setSelectedStep(newStep.id);
  }, [steps, formFields, onChange]);

  const updateStep = useCallback((id: string, updates: Partial<LogicStep>) => {
    onChange(steps.map(step => 
      step.id === id ? { ...step, ...updates } : step
    ));
  }, [steps, onChange]);

  const removeStep = useCallback((id: string) => {
    onChange(steps.filter(step => step.id !== id));
    if (selectedStep === id) {
      setSelectedStep(null);
    }
  }, [steps, onChange, selectedStep]);

  const selectedStepData = selectedStep ? steps.find(s => s.id === selectedStep) : null;

  const toggleStepExpansion = useCallback((stepId: string) => {
    setExpandedSteps(prev => {
      const newSet = new Set(prev);
      if (newSet.has(stepId)) {
        newSet.delete(stepId);
      } else {
        newSet.add(stepId);
      }
      return newSet;
    });
  }, []);

  // Helper to add nested steps to branches
  const addNestedStep = useCallback((path: string, stepType: LogicStep['type'] = 'calculation') => {
    const pathParts = path.split('.');
    const newSteps = [...steps];
    
    // Create new step with required properties
    const newStep: LogicStep = {
      id: generateId(),
      type: stepType,
      position: { x: 0, y: 0 },
      connections: [],
      config: {}
    };

    // Initialize config based on type
    if (stepType === 'calculation') {
      newStep.config.calculation = {
        formula: '',
        variables: []
      };
    } else if (stepType === 'condition') {
      newStep.config.condition = {
        if: {
          fieldId: formFields[0]?.id || '',
          operator: 'equals',
          value: ''
        },
        then: [],
        elseIf: [],
        else: []
      };
    } else if (stepType === 'switch') {
      newStep.config.switch = {
        fieldId: formFields[0]?.id || '',
        cases: [{ value: '', then: [] }],
        default: []
      };
    } else if (stepType === 'transform') {
      newStep.config.transform = {
        inputFieldId: formFields[0]?.id || '',
        transformType: 'uppercase'
      };
    } else if (stepType === 'ai_analysis') {
      newStep.config.aiAnalysis = {
        prompt: '',
        inputFields: [],
        outputFormat: 'text'
      };
    } else if (stepType === 'api_call') {
      newStep.config.apiCall = {
        method: 'GET',
        url: '',
        headers: {},
        body: {}
      };
    }
    
    // Navigate to the target array and add the step
    const stepIndex = newSteps.findIndex(s => s.id === pathParts[0]);
    if (stepIndex !== -1) {
      // Navigate through the config to find the target array
      let target: any = newSteps[stepIndex].config;
      
      for (let j = 1; j < pathParts.length - 1; j++) {
        const p = pathParts[j];
        if (p.includes('[')) {
          const [k, idx] = p.split('[');
          const index = parseInt(idx.replace(']', ''));
          
          // Ensure the array exists and has the element
          if (!target[k] || !Array.isArray(target[k])) {
            target[k] = [];
          }
          if (!target[k][index]) {
            target[k][index] = {};
          }
          target = target[k][index];
        } else {
          // Ensure the property exists
          if (!target[p]) {
            target[p] = {};
          }
          target = target[p];
        }
      }
      
      // Add to the final array
      const finalPart = pathParts[pathParts.length - 1];
      if (!target[finalPart] || !Array.isArray(target[finalPart])) {
        target[finalPart] = [];
      }
      target[finalPart].push(newStep);
    }
    
    onChange(newSteps);
    setSelectedStep(newStep.id);
  }, [steps, formFields, onChange]);

  // Helper to remove nested steps
  const removeNestedStep = useCallback((path: string, stepId: string) => {
    const pathParts = path.split('.');
    const newSteps = [...steps];
    
    // Navigate to the parent array and remove the step
    const stepIndex = newSteps.findIndex(s => s.id === pathParts[0]);
    if (stepIndex !== -1) {
      let target: any = newSteps[stepIndex].config;
      
      for (let i = 1; i < pathParts.length - 1; i++) {
        const part = pathParts[i];
        if (part.includes('[')) {
          const [key, idx] = part.split('[');
          const index = parseInt(idx.replace(']', ''));
          
          // Safely navigate
          if (!target[key] || !Array.isArray(target[key]) || !target[key][index]) {
            return; // Path doesn't exist, nothing to remove
          }
          target = target[key][index];
        } else {
          // Safely navigate
          if (!target[part]) {
            return; // Path doesn't exist, nothing to remove
          }
          target = target[part];
        }
      }
      
      // Remove from the final array
      const finalPart = pathParts[pathParts.length - 1];
      if (target[finalPart] && Array.isArray(target[finalPart])) {
        const removeIndex = target[finalPart].findIndex((s: LogicStep) => s.id === stepId);
        if (removeIndex !== -1) {
          target[finalPart].splice(removeIndex, 1);
        }
      }
    }
    
    onChange(newSteps);
    if (selectedStep === stepId) {
      setSelectedStep(null);
    }
  }, [steps, selectedStep, onChange]);

  // Simpler step rendering without drag-drop for now
  const renderStep = useCallback((step: LogicStep, depth: number = 0, parentPath: string = '') => {
    const stepType = stepTypes.find(st => st.value === step.type);
    const Icon = stepType?.icon || Calculator;
    const isExpanded = expandedSteps.has(step.id);
    
    return (
      <div key={step.id} className="mb-3" style={{ marginLeft: depth > 0 ? `${depth * 20}px` : '0' }}>
        <Card className={`${isExpanded ? 'border-blue-300' : ''}`}>
          <CardContent className="p-3">
            {/* Step Header */}
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded ${stepType?.color || 'bg-gray-100'}`}>
                <Icon className="h-4 w-4" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{stepType?.label}</div>
                {!isExpanded && (
                  <div className="text-xs text-gray-500 truncate">
                    {getStepDescription(step)}
                  </div>
                )}
              </div>

              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleStepExpansion(step.id)}
                  className="h-7 w-7 p-0"
                >
                  {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => parentPath ? removeNestedStep(parentPath, step.id) : removeStep(step.id)}
                  className="h-7 w-7 p-0 text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Configuration */}
            {isExpanded && (
              <div className="mt-3 pt-3 border-t">
                {step.type === 'calculation' && step.config.calculation && (
                  <CalculationConfig
                    step={step}
                    formFields={formFields}
                    onChange={(config) => updateStep(step.id, { config })}
                  />
                )}
                
                {step.type === 'condition' && step.config.condition && (
                  <ConditionConfig
                    step={step}
                    formFields={formFields}
                    onChange={(config) => updateStep(step.id, { config })}
                  />
                )}
                
                {step.type === 'switch' && step.config.switch && (
                  <SwitchConfig
                    step={step}
                    formFields={formFields}
                    onChange={(config) => updateStep(step.id, { config })}
                  />
                )}
                
                {step.type === 'transform' && step.config.transform && (
                  <TransformConfig
                    step={step}
                    formFields={formFields}
                    onChange={(config) => updateStep(step.id, { config })}
                  />
                )}
                
                {step.type === 'ai_analysis' && step.config.aiAnalysis && (
                  <AIAnalysisConfig
                    step={step}
                    formFields={formFields}
                    onChange={(config) => updateStep(step.id, { config })}
                  />
                )}
                
                {step.type === 'api_call' && step.config.apiCall && (
                  <APICallConfig
                    step={step}
                    formFields={formFields}
                    onChange={(config) => updateStep(step.id, { config })}
                  />
                )}
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Nested Branch Steps */}
        {step.type === 'condition' && step.config.condition && isExpanded && (
          <div className="mt-2 space-y-2">
            {/* THEN */}
            <div className="ml-4">
              <div className="flex items-center gap-2 mb-1">
                <Badge className="bg-green-100 text-green-800">THEN</Badge>
                <StepTypeSelector
                  onSelect={(type) => addNestedStep(`${step.id}.then`, type)}
                  isPro={isPro}
                  onProFeatureClick={(label) => {
                    setPendingProFeature(label);
                    setShowProUpgrade(true);
                  }}
                />
              </div>
              {step.config.condition.then?.map((nestedStep: LogicStep, idx: number) => 
                renderStep(nestedStep, depth + 1, `${step.id}.then`)
              )}
            </div>
            
            {/* ELSE-IF */}
            {step.config.condition.elseIf?.map((elseIfBranch: any, idx: number) => (
              <div key={idx} className="ml-4">
                <div className="flex items-center gap-2 mb-1">
                  <Badge className="bg-yellow-100 text-yellow-800">ELSE IF {idx + 1}</Badge>
                  <StepTypeSelector
                    onSelect={(type) => addNestedStep(`${step.id}.elseIf[${idx}].then`, type)}
                    isPro={isPro}
                    onProFeatureClick={(label) => {
                      setPendingProFeature(label);
                      setShowProUpgrade(true);
                    }}
                  />
                </div>
                {elseIfBranch.then?.map((nestedStep: LogicStep) => 
                  renderStep(nestedStep, depth + 1, `${step.id}.elseIf[${idx}].then`)
                )}
              </div>
            ))}
            
            {/* ELSE */}
            {step.config.condition.else !== undefined && (
              <div className="ml-4">
                <div className="flex items-center gap-2 mb-1">
                  <Badge className="bg-red-100 text-red-800">ELSE</Badge>
                  <StepTypeSelector
                    onSelect={(type) => addNestedStep(`${step.id}.else`, type)}
                    isPro={isPro}
                    onProFeatureClick={(label) => {
                      setPendingProFeature(label);
                      setShowProUpgrade(true);
                    }}
                  />
                </div>
                {step.config.condition.else?.map((nestedStep: LogicStep) => 
                  renderStep(nestedStep, depth + 1, `${step.id}.else`)
                )}
              </div>
            )}
          </div>
        )}
        
        {/* Switch Branches */}
        {step.type === 'switch' && step.config.switch && isExpanded && (
          <div className="mt-2 space-y-2">
            {step.config.switch.cases?.map((caseItem: any, idx: number) => (
              <div key={idx} className="ml-4">
                <div className="flex items-center gap-2 mb-1">
                  <Badge className="bg-teal-100 text-teal-800">CASE: {caseItem.value}</Badge>
                  <StepTypeSelector
                    onSelect={(type) => addNestedStep(`${step.id}.cases[${idx}].then`, type)}
                    isPro={isPro}
                    onProFeatureClick={(label) => {
                      setPendingProFeature(label);
                      setShowProUpgrade(true);
                    }}
                  />
                </div>
                {caseItem.then?.map((nestedStep: LogicStep) => 
                  renderStep(nestedStep, depth + 1, `${step.id}.cases[${idx}].then`)
                )}
              </div>
            ))}
            
            {step.config.switch.default !== undefined && (
              <div className="ml-4">
                <div className="flex items-center gap-2 mb-1">
                  <Badge className="bg-gray-100 text-gray-800">DEFAULT</Badge>
                  <StepTypeSelector
                    onSelect={(type) => addNestedStep(`${step.id}.default`, type)}
                    isPro={isPro}
                    onProFeatureClick={(label) => {
                      setPendingProFeature(label);
                      setShowProUpgrade(true);
                    }}
                  />
                </div>
                {step.config.switch.default?.map((nestedStep: LogicStep) => 
                  renderStep(nestedStep, depth + 1, `${step.id}.default`)
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }, [expandedSteps, toggleStepExpansion, addNestedStep, removeNestedStep, isPro, setPendingProFeature, setShowProUpgrade, removeStep, updateStep, formFields]);

  // Show visual flow designer if in visual mode
  if (viewMode === 'visual') {
    return (
      <>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Logic Flow</h3>
            <Button
              variant="outline"
              onClick={() => setViewMode('list')}
              className="flex items-center gap-2"
            >
              <ArrowDown className="h-4 w-4" />
              List View
            </Button>
          </div>
          
          <VisualFlowchartDesigner
            steps={steps}
            formFields={formFields}
            onChange={onChange}
            onStepSelect={setSelectedStep}
            selectedStepId={selectedStep}
          />
          
          {/* Configuration Panel */}
          {selectedStepData && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-base">
                  Configure {stepTypes.find(st => st.value === selectedStepData.type)?.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedStepData.type === 'calculation' && (
                  <CalculationConfig
                    step={selectedStepData}
                    formFields={formFields}
                    onChange={(config) => updateStep(selectedStepData.id, { config })}
                  />
                )}
                
                {selectedStepData.type === 'condition' && (
                  <ConditionConfig
                    step={selectedStepData}
                    formFields={formFields}
                    onChange={(config) => updateStep(selectedStepData.id, { config })}
                  />
                )}
                
                {selectedStepData.type === 'switch' && (
                  <SwitchConfig
                    step={selectedStepData}
                    formFields={formFields}
                    onChange={(config) => updateStep(selectedStepData.id, { config })}
                  />
                )}
                
                {selectedStepData.type === 'transform' && (
                  <TransformConfig
                    step={selectedStepData}
                    formFields={formFields}
                    onChange={(config) => updateStep(selectedStepData.id, { config })}
                  />
                )}
                
                {selectedStepData.type === 'ai_analysis' && (
                  <AIAnalysisConfig
                    step={selectedStepData}
                    formFields={formFields}
                    onChange={(config) => updateStep(selectedStepData.id, { config })}
                  />
                )}
                
                {selectedStepData.type === 'api_call' && (
                  <APICallConfig
                    step={selectedStepData}
                    formFields={formFields}
                    onChange={(config) => updateStep(selectedStepData.id, { config })}
                  />
                )}
              </CardContent>
            </Card>
          )}
        </div>
        
        {/* Pro Upgrade Dialog - Available in Visual Mode */}
        <ProUpgradeDialog
          open={showProUpgrade}
          onOpenChange={setShowProUpgrade}
          feature={pendingProFeature}
          description="AI Analysis and API Call features require a Pro subscription to unlock advanced tool capabilities."
        />
      </>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
      {/* Logic Flow Canvas */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Logic Flow</h3>
          <div className="flex gap-2">
            <StepTypeSelector
              onSelect={(type) => addStep(type)}
              isPro={isPro}
              onProFeatureClick={(label) => {
                setPendingProFeature(label);
                setShowProUpgrade(true);
              }}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode('visual')}
              className="flex items-center gap-2"
            >
              <Workflow className="h-4 w-4" />
              Visual Flow
            </Button>
          </div>
        </div>
        
        <div className="space-y-3">
          {steps.length === 0 ? (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <p className="text-gray-500 mb-4">
                Add logic steps to define your tool's behavior
              </p>
              <StepTypeSelector
                onSelect={(type) => addStep(type)}
                isPro={isPro}
                onProFeatureClick={(label) => {
                  setPendingProFeature(label);
                  setShowProUpgrade(true);
                }}
              />
            </div>
          ) : (
            <>
              {steps.map((step, index) => (
                <div key={step.id}>
                  {renderStep(step, 0, '')}
                  {index < steps.length - 1 && (
                    <div className="flex justify-center my-2">
                      <ArrowDown className="h-4 w-4 text-gray-400" />
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Step Configuration Panel */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Step Configuration</h3>
        
        {selectedStepData ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Configure {stepTypes.find(st => st.value === selectedStepData.type)?.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedStepData.type === 'calculation' && (
                <CalculationConfig
                  step={selectedStepData}
                  formFields={formFields}
                  onChange={(config) => updateStep(selectedStepData.id, { config })}
                />
              )}
              
              {selectedStepData.type === 'condition' && (
                <ConditionConfig
                  step={selectedStepData}
                  formFields={formFields}
                  onChange={(config) => updateStep(selectedStepData.id, { config })}
                />
              )}
              
              {selectedStepData.type === 'switch' && (
                <SwitchConfig
                  step={selectedStepData}
                  formFields={formFields}
                  onChange={(config) => updateStep(selectedStepData.id, { config })}
                />
              )}
              
              {selectedStepData.type === 'transform' && (
                <TransformConfig
                  step={selectedStepData}
                  formFields={formFields}
                  onChange={(config) => updateStep(selectedStepData.id, { config })}
                />
              )}
              
              {selectedStepData.type === 'ai_analysis' && (
                <AIAnalysisConfig
                  step={selectedStepData}
                  formFields={formFields}
                  onChange={(config) => updateStep(selectedStepData.id, { config })}
                />
              )}
              
              {selectedStepData.type === 'api_call' && (
                <APICallConfig
                  step={selectedStepData}
                  formFields={formFields}
                  onChange={(config) => updateStep(selectedStepData.id, { config })}
                />
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-gray-500">
                Select a step to configure its settings
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Pro Upgrade Dialog */}
      <ProUpgradeDialog
        open={showProUpgrade}
        onOpenChange={setShowProUpgrade}
        feature={pendingProFeature}
        description="AI Analysis and API Call features require a Pro subscription to unlock advanced tool capabilities."
      />
    </div>
  );
}

function CalculationConfig({ 
  step, 
  formFields, 
  onChange 
}: { 
  step: LogicStep; 
  formFields: FormField[]; 
  onChange: (config: any) => void;
}) {
  const calculation = step.config.calculation || { formula: '', variables: [] };
  const [showHelp, setShowHelp] = useState(false);

  return (
    <div className="space-y-4">
      <div>
        <Label>Formula</Label>
        <Input
          value={calculation.formula}
          onChange={(e) => onChange({
            ...step.config,
            calculation: { ...calculation, formula: e.target.value }
          })}
          placeholder="e.g., price * quantity * (1 + taxRate)"
        />
        <p className="text-xs text-gray-500 mt-1">
          Use field names as variables in your formula
        </p>
      </div>
      
      <div>
        <Label>Available Variables</Label>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {formFields.filter(f => f.type === 'number').map((field) => (
            <Badge
              key={field.id}
              variant="outline"
              className="text-xs cursor-pointer"
              onClick={() => {
                const input = document.querySelector('input[placeholder*="price"]') as HTMLInputElement;
                if (input) {
                  // Sanitize variable name: remove spaces and special characters, convert to snake_case
                  const sanitizedName = field.label
                    .toLowerCase()
                    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
                    .replace(/\s+/g, '_') // Replace spaces with underscores
                    .replace(/^_+|_+$/g, ''); // Remove leading/trailing underscores
                    
                  const newVariable: Variable = {
                    name: sanitizedName || field.id, // Fallback to field.id if sanitization results in empty string
                    fieldId: field.id
                  };
                  input.value += ` ${sanitizedName || field.id}`;
                  onChange({
                    ...step.config,
                    calculation: { 
                      ...calculation, 
                      formula: input.value,
                      variables: [...calculation.variables, newVariable]
                    }
                  });
                }
              }}
            >
              {field.label}
            </Badge>
          ))}
        </div>
      </div>

      {/* Formula Help Section */}
      <div className="border rounded-lg">
        <button
          type="button"
          onClick={() => setShowHelp(!showHelp)}
          className="w-full flex items-center justify-between p-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4" />
            <span>Formula Help & Examples</span>
          </div>
          {showHelp ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        
        {showHelp && (
          <div className="p-4 border-t bg-gray-50 space-y-3">
            <div>
              <h4 className="text-xs font-semibold text-gray-700 mb-2">Supported Operators</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><code className="bg-white px-2 py-1 rounded">+</code> Addition</div>
                <div><code className="bg-white px-2 py-1 rounded">-</code> Subtraction</div>
                <div><code className="bg-white px-2 py-1 rounded">*</code> Multiplication</div>
                <div><code className="bg-white px-2 py-1 rounded">/</code> Division</div>
                <div><code className="bg-white px-2 py-1 rounded">%</code> Modulo</div>
                <div><code className="bg-white px-2 py-1 rounded">**</code> Power</div>
              </div>
            </div>
            
            <div>
              <h4 className="text-xs font-semibold text-gray-700 mb-2">Example Formulas</h4>
              <div className="space-y-2 text-xs">
                <div className="bg-white p-2 rounded">
                  <code className="text-blue-600">price * quantity</code>
                  <p className="text-gray-600 mt-1">Calculate total from price and quantity</p>
                </div>
                <div className="bg-white p-2 rounded">
                  <code className="text-blue-600">amount * (1 + tax_rate / 100)</code>
                  <p className="text-gray-600 mt-1">Add percentage tax to amount</p>
                </div>
                <div className="bg-white p-2 rounded">
                  <code className="text-blue-600">(price * quantity) - discount</code>
                  <p className="text-gray-600 mt-1">Calculate total with discount using parentheses</p>
                </div>
                <div className="bg-white p-2 rounded">
                  <code className="text-blue-600">principal * rate * time</code>
                  <p className="text-gray-600 mt-1">Simple interest calculation</p>
                </div>
              </div>
            </div>
            
            <Alert>
              <AlertDescription className="text-xs">
                <strong>Tip:</strong> Click variable badges above to add them to your formula. Spaces in field labels will be automatically converted to underscores.
              </AlertDescription>
            </Alert>
          </div>
        )}
      </div>
    </div>
  );
}

function ConditionConfig({ 
  step, 
  formFields, 
  onChange 
}: { 
  step: LogicStep; 
  formFields: FormField[]; 
  onChange: (config: any) => void;
}) {
  const condition = step.config.condition || {
    if: { fieldId: '', operator: 'equals', value: '' },
    then: [],
    elseIf: [],
    else: []
  };

  const addElseIfBranch = () => {
    onChange({
      ...step.config,
      condition: {
        ...condition,
        elseIf: [
          ...(condition.elseIf || []),
          {
            condition: {
              fieldId: formFields[0]?.id || '',
              operator: 'equals',
              value: ''
            },
            then: []
          }
        ]
      }
    });
  };

  const removeElseIfBranch = (index: number) => {
    const newElseIf = [...(condition.elseIf || [])];
    newElseIf.splice(index, 1);
    onChange({
      ...step.config,
      condition: {
        ...condition,
        elseIf: newElseIf
      }
    });
  };

  const updateElseIfBranch = (index: number, updates: any) => {
    const newElseIf = [...(condition.elseIf || [])];
    newElseIf[index] = { ...newElseIf[index], ...updates };
    onChange({
      ...step.config,
      condition: {
        ...condition,
        elseIf: newElseIf
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
        <Label className="text-green-800 font-semibold">IF Condition</Label>
        <div className="grid grid-cols-3 gap-2 mt-2">
          <Select
            value={condition.if.fieldId}
            onValueChange={(value) => onChange({
              ...step.config,
              condition: {
                ...condition,
                if: { ...condition.if, fieldId: value }
              }
            })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select field" />
            </SelectTrigger>
            <SelectContent>
              {formFields.map((field) => (
                <SelectItem key={field.id} value={field.id}>
                  {field.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select
            value={condition.if.operator}
            onValueChange={(value) => onChange({
              ...step.config,
              condition: {
                ...condition,
                if: { ...condition.if, operator: value }
              }
            })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {operators.map((op) => (
                <SelectItem key={op.value} value={op.value}>
                  {op.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Input
            value={condition.if.value}
            onChange={(e) => onChange({
              ...step.config,
              condition: {
                ...condition,
                if: { ...condition.if, value: e.target.value }
              }
            })}
            placeholder="Value"
          />
        </div>
        <p className="text-xs text-green-700 mt-2">
          Actions will execute if this condition is true
        </p>
      </div>

      {/* Else-If Branches */}
      {condition.elseIf && condition.elseIf.map((elseIfBranch: any, index: number) => (
        <div key={index} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-yellow-800 font-semibold">ELSE IF Condition {index + 1}</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeElseIfBranch(index)}
              className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Select
              value={elseIfBranch.condition.fieldId}
              onValueChange={(value) => updateElseIfBranch(index, {
                condition: { ...elseIfBranch.condition, fieldId: value }
              })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select field" />
              </SelectTrigger>
              <SelectContent>
                {formFields.map((field) => (
                  <SelectItem key={field.id} value={field.id}>
                    {field.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select
              value={elseIfBranch.condition.operator}
              onValueChange={(value) => updateElseIfBranch(index, {
                condition: { ...elseIfBranch.condition, operator: value }
              })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {operators.map((op) => (
                  <SelectItem key={op.value} value={op.value}>
                    {op.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Input
              value={elseIfBranch.condition.value}
              onChange={(e) => updateElseIfBranch(index, {
                condition: { ...elseIfBranch.condition, value: e.target.value }
              })}
              placeholder="Value"
            />
          </div>
          <p className="text-xs text-yellow-700 mt-2">
            Actions will execute if IF is false and this condition is true
          </p>
        </div>
      ))}

      {/* Add Else-If Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={addElseIfBranch}
        className="w-full border-dashed"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Else-If Branch
      </Button>

      {/* Else Branch */}
      <div className="p-3 bg-gray-100 border border-gray-300 rounded-lg">
        <Label className="text-gray-800 font-semibold">ELSE (Default)</Label>
        <p className="text-xs text-gray-600 mt-2">
          Actions will execute if all above conditions are false
        </p>
      </div>

      <Alert>
        <AlertDescription className="text-xs">
          <strong>Note:</strong> Conditions are evaluated in order (IF → ELSE IF → ELSE). The first matching condition executes its actions.
        </AlertDescription>
      </Alert>
    </div>
  );
}

function SwitchConfig({ 
  step, 
  formFields, 
  onChange 
}: { 
  step: LogicStep; 
  formFields: FormField[]; 
  onChange: (config: any) => void;
}) {
  const switchConfig = step.config.switch || {
    fieldId: formFields[0]?.id || '',
    cases: [{ value: '', then: [] }],
    default: []
  };

  const addCase = () => {
    onChange({
      ...step.config,
      switch: {
        ...switchConfig,
        cases: [
          ...switchConfig.cases,
          { value: '', then: [] }
        ]
      }
    });
  };

  const removeCase = (index: number) => {
    const newCases = [...switchConfig.cases];
    newCases.splice(index, 1);
    onChange({
      ...step.config,
      switch: {
        ...switchConfig,
        cases: newCases
      }
    });
  };

  const updateCase = (index: number, value: string) => {
    const newCases = [...switchConfig.cases];
    newCases[index] = { ...newCases[index], value };
    onChange({
      ...step.config,
      switch: {
        ...switchConfig,
        cases: newCases
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg">
        <Label className="text-teal-800 font-semibold">Switch On Field</Label>
        <Select
          value={switchConfig.fieldId}
          onValueChange={(value) => onChange({
            ...step.config,
            switch: {
              ...switchConfig,
              fieldId: value
            }
          })}
        >
          <SelectTrigger className="mt-2">
            <SelectValue placeholder="Select field to evaluate" />
          </SelectTrigger>
          <SelectContent>
            {formFields.map((field) => (
              <SelectItem key={field.id} value={field.id}>
                {field.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-teal-700 mt-2">
          The value of this field will be compared against each case
        </p>
      </div>

      {/* Case Branches */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Case Branches</Label>
        {switchConfig.cases.map((caseItem: any, index: number) => (
          <div key={index} className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Label className="text-blue-800 text-xs">Case {index + 1}: When value equals</Label>
                <Input
                  value={caseItem.value}
                  onChange={(e) => updateCase(index, e.target.value)}
                  placeholder="Enter value to match"
                  className="mt-1"
                />
              </div>
              {switchConfig.cases.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeCase(index)}
                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 self-end"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <p className="text-xs text-blue-700 mt-2">
              Actions will execute if field value matches "{caseItem.value || '(empty)'}"
            </p>
          </div>
        ))}
      </div>

      {/* Add Case Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={addCase}
        className="w-full border-dashed"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Case Branch
      </Button>

      {/* Default Branch */}
      <div className="p-3 bg-gray-100 border border-gray-300 rounded-lg">
        <Label className="text-gray-800 font-semibold">DEFAULT (No Match)</Label>
        <p className="text-xs text-gray-600 mt-2">
          Actions will execute if the value doesn't match any case
        </p>
      </div>

      <Alert>
        <AlertDescription className="text-xs">
          <strong>Note:</strong> Cases are checked in order. The first exact match executes its actions. If no match is found, the default branch executes.
        </AlertDescription>
      </Alert>
    </div>
  );
}

function TransformConfig({ 
  step, 
  formFields, 
  onChange 
}: { 
  step: LogicStep; 
  formFields: FormField[]; 
  onChange: (config: any) => void;
}) {
  const transform = step.config.transform || {
    inputFieldId: '',
    transformType: 'uppercase'
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Input Field</Label>
        <Select
          value={transform.inputFieldId || ''}
          onValueChange={(value) => onChange({
            ...step.config,
            transform: { ...transform, inputFieldId: value }
          })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select field" />
          </SelectTrigger>
          <SelectContent>
            {formFields.filter(f => f.type === 'text' || f.type === 'textarea').map((field) => (
              <SelectItem key={field.id} value={field.id}>
                {field.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div>
        <Label>Transform Type</Label>
        <Select
          value={transform.transformType}
          onValueChange={(value: any) => onChange({
            ...step.config,
            transform: { ...transform, transformType: value }
          })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {transformTypes.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function AIAnalysisConfig({ 
  step, 
  formFields, 
  onChange 
}: { 
  step: LogicStep; 
  formFields: FormField[]; 
  onChange: (config: any) => void;
}) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [showTemplates, setShowTemplates] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewResult, setPreviewResult] = useState<any>(null);
  const [tokenEstimate, setTokenEstimate] = useState<number>(0);
  const [costEstimate, setCostEstimate] = useState<string>('');

  const aiAnalysis = step.config.aiAnalysis || {
    prompt: '',
    inputFields: [],
    outputFormat: 'text'
  };

  // Update token and cost estimates when prompt or input fields change
  useEffect(() => {
    if (aiAnalysis.prompt) {
      // Create realistic sample data for estimation
      const sampleData: Record<string, string> = {};
      aiAnalysis.inputFields.forEach(fieldId => {
        const field = formFields.find(f => f.id === fieldId);
        if (field) {
          // Generate longer sample data based on field type for better estimation
          switch (field.type) {
            case 'email':
              sampleData[fieldId] = 'user.example@company.com';
              break;
            case 'number':
              sampleData[fieldId] = '1,234.56';
              break;
            case 'text':
              sampleData[fieldId] = `Sample ${field.label.toLowerCase()} content with realistic length`;
              break;
            case 'textarea':
              sampleData[fieldId] = `This is a sample ${field.label.toLowerCase()} with multiple sentences to represent typical user input. It includes various details that users might provide when filling out this field in a real scenario.`;
              break;
            default:
              sampleData[fieldId] = `Sample data for ${field.label} field`;
          }
        }
      });

      // Replace placeholders with sample data to get accurate token estimate
      let estimationPrompt = aiAnalysis.prompt;
      Object.entries(sampleData).forEach(([fieldId, value]) => {
        estimationPrompt = estimationPrompt.replace(new RegExp(`\\{${fieldId}\\}`, 'g'), value);
      });

      const tokens = estimateTokensForPrompt(estimationPrompt);
      const cost = estimateCost(tokens);
      setTokenEstimate(tokens);
      setCostEstimate(formatCost(cost));
    } else {
      setTokenEstimate(0);
      setCostEstimate('$0.00');
    }
  }, [aiAnalysis.prompt, aiAnalysis.inputFields, formFields]);

  const handleTemplateSelect = (templateId: string) => {
    const template = getTemplateById(templateId);
    if (template) {
      onChange({
        ...step.config,
        aiAnalysis: {
          ...aiAnalysis,
          prompt: template.prompt,
          outputFormat: template.outputFormat,
          inputFields: template.suggestedInputFields.filter(field => 
            formFields.some(f => f.label.toLowerCase().includes(field.toLowerCase()))
          )
        }
      });
      setSelectedTemplate(templateId);
      setShowTemplates(false);
    }
  };

  const handlePreview = async () => {
    if (!aiAnalysis.prompt.trim()) return;
    
    setIsPreviewLoading(true);
    try {
      // Create sample data for preview
      const sampleData: Record<string, string> = {};
      aiAnalysis.inputFields.forEach(fieldId => {
        const field = formFields.find(f => f.id === fieldId);
        if (field) {
          // Generate realistic sample data based on field type
          switch (field.type) {
            case 'email':
              sampleData[fieldId] = 'user.example@company.com';
              break;
            case 'number':
              sampleData[fieldId] = '1,234.56';
              break;
            case 'text':
              sampleData[fieldId] = `Sample ${field.label.toLowerCase()} content with realistic example data`;
              break;
            case 'textarea':
              sampleData[fieldId] = `This is a sample ${field.label.toLowerCase()} with multiple sentences to demonstrate how the AI analysis will work. It includes various details that users might provide when using this tool in a real scenario.`;
              break;
            default:
              sampleData[fieldId] = `Sample data for ${field.label} field`;
          }
        }
      });

      // Replace placeholders in prompt
      let previewPrompt = aiAnalysis.prompt;
      Object.entries(sampleData).forEach(([fieldId, value]) => {
        previewPrompt = previewPrompt.replace(new RegExp(`\\{${fieldId}\\}`, 'g'), value);
      });

      const response = await fetch('/api/ai/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'fetch' },
        credentials: 'include',
        body: JSON.stringify({
          prompt: previewPrompt,
          outputFormat: aiAnalysis.outputFormat
        })
      });

      if (!response.ok) {
        if (response.status === 401) {
          setPreviewResult({ 
            error: 'Authentication required for AI preview. Please log in to test your prompts.' 
          });
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          setPreviewResult({ 
            error: errorData.error || 'Preview failed. Please check your configuration.' 
          });
        }
        return;
      }
      
      const result = await response.json();
      setPreviewResult(result);
    } catch (error) {
      console.error('Preview error:', error);
      setPreviewResult({ 
        error: 'Preview failed due to network error. Please try again.' 
      });
    } finally {
      setIsPreviewLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Template Selector */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>AI Prompt</Label>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              ~{tokenEstimate} tokens • {costEstimate}
            </Badge>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowTemplates(!showTemplates)}
            >
              <Brain className="h-3 w-3 mr-1" />
              Templates
            </Button>
          </div>
        </div>

        {showTemplates && (
          <Card className="mb-3">
            <CardContent className="p-3">
              <div className="space-y-3">
                <Label className="text-sm font-medium">Choose a Template</Label>
                {PROMPT_CATEGORIES.map(category => {
                  const templates = getTemplatesByCategory(category);
                  if (templates.length === 0) return null;
                  
                  return (
                    <div key={category}>
                      <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-2">
                        {category}
                      </h4>
                      <div className="grid grid-cols-1 gap-2">
                        {templates.map(template => (
                          <div
                            key={template.id}
                            className={`p-2 border rounded cursor-pointer hover:bg-gray-50 transition-colors ${
                              selectedTemplate === template.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                            }`}
                            onClick={() => handleTemplateSelect(template.id)}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h5 className="text-sm font-medium">{template.name}</h5>
                                <p className="text-xs text-gray-500 mt-1">{template.description}</p>
                                <div className="flex items-center gap-2 mt-2">
                                  <Badge variant="outline" className="text-xs">
                                    {template.outputFormat}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    ~{template.estimatedTokens} tokens
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        <Textarea
          value={aiAnalysis.prompt}
          onChange={(e) => onChange({
            ...step.config,
            aiAnalysis: { ...aiAnalysis, prompt: e.target.value }
          })}
          placeholder="e.g., Analyze the sentiment of this text: {text}"
          rows={6}
        />
        <div className="flex items-center justify-between mt-1">
          <p className="text-xs text-gray-500">
            Use {'{field_name}'} to reference input fields in your prompt
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePreview}
            disabled={!aiAnalysis.prompt.trim() || isPreviewLoading}
          >
            {isPreviewLoading ? (
              <>
                <div className="animate-spin h-3 w-3 mr-1 border border-gray-300 border-t-gray-900 rounded-full" />
                Testing...
              </>
            ) : (
              <>
                <Eye className="h-3 w-3 mr-1" />
                Preview
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Preview Result */}
      {previewResult && (
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium">Preview Result</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setPreviewResult(null)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            
            {previewResult.error ? (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{previewResult.error}</AlertDescription>
              </Alert>
            ) : (
              <div className="bg-gray-50 p-3 rounded text-sm">
                {aiAnalysis.outputFormat === 'json' ? (
                  <pre className="whitespace-pre-wrap text-xs">
                    {JSON.stringify(previewResult, null, 2)}
                  </pre>
                ) : aiAnalysis.outputFormat === 'markdown' ? (
                  <div className="prose prose-sm max-w-none">
                    {previewResult.markdown || previewResult.text || JSON.stringify(previewResult)}
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">
                    {previewResult.text || JSON.stringify(previewResult)}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      <div>
        <Label>Input Fields to Use</Label>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {formFields.map((field) => (
            <Badge
              key={field.id}
              variant={aiAnalysis.inputFields.includes(field.id) ? "default" : "outline"}
              className="text-xs cursor-pointer"
              onClick={() => {
                const isIncluded = aiAnalysis.inputFields.includes(field.id);
                const newInputFields = isIncluded
                  ? aiAnalysis.inputFields.filter(id => id !== field.id)
                  : [...aiAnalysis.inputFields, field.id];
                onChange({
                  ...step.config,
                  aiAnalysis: { ...aiAnalysis, inputFields: newInputFields }
                });
              }}
            >
              {field.label}
            </Badge>
          ))}
        </div>
      </div>
      
      <div>
        <Label>Output Format</Label>
        <Select
          value={aiAnalysis.outputFormat}
          onValueChange={(value: any) => onChange({
            ...step.config,
            aiAnalysis: { ...aiAnalysis, outputFormat: value }
          })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="text">Plain Text</SelectItem>
            <SelectItem value="json">JSON</SelectItem>
            <SelectItem value="markdown">Markdown</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function APICallConfig({ 
  step, 
  formFields, 
  onChange 
}: { 
  step: LogicStep; 
  formFields: FormField[]; 
  onChange: (config: any) => void;
}) {
  const apiCall = step.config.apiCall || {
    method: 'GET',
    url: '',
    headers: {},
    body: {}
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>HTTP Method</Label>
        <Select
          value={apiCall.method}
          onValueChange={(value: any) => onChange({
            ...step.config,
            apiCall: { ...apiCall, method: value }
          })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="GET">GET</SelectItem>
            <SelectItem value="POST">POST</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div>
        <Label>API URL</Label>
        <Input
          value={apiCall.url}
          onChange={(e) => onChange({
            ...step.config,
            apiCall: { ...apiCall, url: e.target.value }
          })}
          placeholder="https://api.example.com/data"
        />
        <p className="text-xs text-gray-500 mt-1">
          Use {'{field_name}'} to include input field values in the URL
        </p>
      </div>
      
      <div>
        <Label>Request Headers (JSON)</Label>
        <Textarea
          value={JSON.stringify(apiCall.headers, null, 2)}
          onChange={(e) => {
            try {
              const headers = JSON.parse(e.target.value);
              onChange({
                ...step.config,
                apiCall: { ...apiCall, headers }
              });
            } catch (error) {
              // Invalid JSON, don't update
            }
          }}
          placeholder='{"Content-Type": "application/json", "Authorization": "Bearer token"}'
          rows={3}
        />
      </div>
      
      {apiCall.method === 'POST' && (
        <div>
          <Label>Request Body (JSON)</Label>
          <Textarea
            value={JSON.stringify(apiCall.body, null, 2)}
            onChange={(e) => {
              try {
                const body = JSON.parse(e.target.value);
                onChange({
                  ...step.config,
                  apiCall: { ...apiCall, body }
                });
              } catch (error) {
                // Invalid JSON, don't update
              }
            }}
            placeholder='{"field1": "{input_value}", "field2": "static_value"}'
            rows={4}
          />
        </div>
      )}
      
      <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
        💡 Tip: Use {'{field_name}'} to dynamically include input field values
      </div>
    </div>
  );
}

function getStepDescription(step: LogicStep): string {
  switch (step.type) {
    case 'calculation':
      return step.config.calculation?.formula || 'No formula set';
    case 'condition':
      const cond = step.config.condition;
      if (!cond) return 'No condition set';
      const elseIfCount = cond.elseIf?.length || 0;
      const hasElse = cond.else && cond.else.length > 0;
      let desc = `If ${cond.if.fieldId} ${cond.if.operator} ${cond.if.value}`;
      if (elseIfCount > 0) desc += ` + ${elseIfCount} else-if`;
      if (hasElse) desc += ' + else';
      return desc;
    case 'switch':
      const switchConfig = step.config.switch;
      if (!switchConfig) return 'No switch configured';
      const caseCount = switchConfig.cases?.length || 0;
      return `Switch ${switchConfig.fieldId} (${caseCount} cases)`;
    case 'transform':
      const trans = step.config.transform;
      return trans ? `${trans.transformType} ${trans.inputFieldId}` : 'No transform set';
    case 'ai_analysis':
      const ai = step.config.aiAnalysis;
      return ai?.prompt ? `AI: ${ai.prompt.substring(0, 30)}...` : 'No AI prompt set';
    case 'api_call':
      const api = step.config.apiCall;
      return api?.url ? `${api.method} ${api.url}` : 'No API URL set';
    default:
      return 'Not configured';
  }
}