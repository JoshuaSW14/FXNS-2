import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import NavigationHeader from "@/components/navigation-header";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Save,
  Eye,
  Rocket,
  Wand2,
  Sparkles,
  CheckCircle,
  FileText,
  Settings,
  Play,
  ArrowRight,
  DollarSign
} from "lucide-react";

// Import shared schemas and components
import { FormField, LogicStep, OutputConfig, createDefaultOutputConfig } from "@shared/tool-builder-schemas";
import VisualFormDesigner from "@/components/tool-builder/visual-form-designer";
import LogicFlowBuilder from "@/components/tool-builder/logic-flow-builder";
import ToolTestRunner from "@/components/tool-builder/tool-test-runner";
import TemplateSelector from "@/components/tool-builder/template-selector";
import { ToolTemplate } from "@shared/tool-templates";
import { ToolPricingModal } from "@/components/tool-pricing-modal";
import TagMultiSelect from "@/components/tag-multi-select";

const toolMetadataSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  description: z.string().min(1, "Description is required").max(500, "Description must be less than 500 characters"),
  category: z.string().min(1, "Category is required"),
});

type ToolMetadata = z.infer<typeof toolMetadataSchema>;

const categories = [
  "calculator",
  "converter", 
  "developer",
  "design",
  "productivity",
  "utility",
  "finance",
  "health",
  "security",
];

interface ToolDraft {
  id: string;
  name: string;
  description: string;
  category: string;
  status: 'draft' | 'testing' | 'published';
  inputConfig: FormField[];
  logicConfig: LogicStep[];
  outputConfig: any;
  createdAt: string;
  updatedAt: string;
}

const STEPS = [
  { id: 'metadata', label: 'Tool Info', icon: FileText },
  { id: 'form', label: 'Input Form', icon: Settings },
  { id: 'logic', label: 'Logic Flow', icon: Wand2 },
  { id: 'test', label: 'Test & Preview', icon: Play },
  { id: 'publish', label: 'Publish', icon: Rocket }
];

export default function VisualToolBuilderPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State management
  const [showTemplateSelector, setShowTemplateSelector] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [logicSteps, setLogicSteps] = useState<LogicStep[]>([]);
  const [outputConfig, setOutputConfig] = useState<OutputConfig>(createDefaultOutputConfig());
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  
  // Form for tool metadata
  const form = useForm<ToolMetadata>({
    resolver: zodResolver(toolMetadataSchema),
    defaultValues: {
      name: "",
      description: "",
      category: "",
    },
  });

  // Dynamic draft ID state for proper query updates
  const urlParams = new URLSearchParams(window.location.search);
  const initialDraftId = urlParams.get("draft");
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(initialDraftId);
  
  // Hide template selector if we have a draft ID
  React.useEffect(() => {
    if (initialDraftId) {
      setShowTemplateSelector(false);
    }
  }, [initialDraftId]);

  // Load existing draft if editing
  const { data: existingDraft, error: draftError } = useQuery<{ success: boolean; data: ToolDraft }>({
    queryKey: [`/api/tool-builder/drafts/${currentDraftId}`],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/tool-builder/drafts/${currentDraftId}`);
      if (!response.ok) throw new Error('Failed to load draft');
      return response.json();
    },
    enabled: !!currentDraftId,
    retry: false // Don't retry, let us handle the 404
  });

  // If draft loading fails, try to create draft from published tool
  const createDraftFromPublishedMutation = useMutation({
    mutationFn: async (fxnId: string) => {
      const response = await apiRequest('POST', `/api/tool-builder/drafts/from-published/${fxnId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to create draft from published tool');
      }
      return response.json();
    },
    onSuccess: (data) => {
      const newDraftId = data.data.id;
      const draftData = data.data;
      
      // Update URL to use the new draft ID
      window.history.replaceState({}, '', `?draft=${newDraftId}`);
      setDraftId(newDraftId);
      setCurrentDraftId(newDraftId);
      
      // Immediately populate form with converted data
      form.setValue('name', draftData.name);
      form.setValue('description', draftData.description || '');
      form.setValue('category', draftData.category);
      setFormFields(draftData.inputConfig || []);
      setLogicSteps(draftData.logicConfig || []);
      setOutputConfig(draftData.outputConfig || createDefaultOutputConfig());
      
      toast({
        title: "Tool loaded for editing!",
        description: "Your published tool has been converted to an editable draft.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Cannot edit this tool",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Handle draft loading error - try to convert published tool (only for 404s)
  useEffect(() => {
    if (draftError && currentDraftId && !createDraftFromPublishedMutation.isPending && !createDraftFromPublishedMutation.isSuccess && !createDraftFromPublishedMutation.isError) {
      // Only trigger conversion for 404 errors (draft not found), not for other server errors
      const is404Error = (draftError as any).status === 404 || 
                        draftError.message.includes('404') || 
                        draftError.message.includes('not found');
      
      if (is404Error) {
        console.log('Draft not found (404), attempting to create from published tool:', currentDraftId);
        createDraftFromPublishedMutation.mutate(currentDraftId);
      } else {
        console.error('Non-404 error loading draft:', draftError.message);
      }
    }
  }, [draftError, currentDraftId]);

  // Note: Tags are associated with published tools (fxns), not drafts
  // Tags are assigned at publish time, so we don't preload them here
  // If needed in the future, we would need to track the source toolId separately

  // Load draft data when available
  useEffect(() => {
    if (existingDraft?.data) {
      const draft = existingDraft.data;
      setDraftId(draft.id);
      form.setValue('name', draft.name);
      form.setValue('description', draft.description);
      form.setValue('category', draft.category);
      setFormFields(draft.inputConfig || []);
      setLogicSteps(draft.logicConfig || []);
      setOutputConfig(draft.outputConfig || createDefaultOutputConfig());
    }
  }, [existingDraft, form]);

  // Save draft mutation
  const saveDraftMutation = useMutation({
    mutationFn: async (data: { 
      name: string; 
      description: string; 
      category: string; 
      inputConfig: FormField[]; 
      logicConfig: LogicStep[];
      outputConfig: OutputConfig;
      status?: 'draft' | 'testing';
    }) => {
      const url = draftId 
        ? `/api/tool-builder/drafts/${draftId}`
        : '/api/tool-builder/drafts';
      
      const method = draftId ? 'PUT' : 'POST';
      
      const response = await apiRequest(method, url, {
        name: data.name,
        description: data.description,
        category: data.category,
        status: data.status || 'draft',
        inputConfig: data.inputConfig,
        logicConfig: data.logicConfig,
        outputConfig: data.outputConfig
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save draft');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      if (!draftId) {
        setDraftId(data.data.id);
        // Update URL without reload
        window.history.replaceState({}, '', `?draft=${data.data.id}`);
      }
      toast({
        title: "Draft saved!",
        description: "Your tool has been saved as a draft.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Publish mutation
  const publishMutation = useMutation({
    mutationFn: async () => {
      if (!draftId) throw new Error('No draft to publish');
      
      // Get current form values for metadata
      const formData = form.getValues();
      
      const response = await apiRequest('POST', `/api/tool-builder/drafts/${draftId}/publish`, {
        name: formData.name,
        description: formData.description,
        category: formData.category
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.details || errorData.error?.message || errorData.error || 'Failed to publish tool');
      }
      
      return response.json();
    },
    onSuccess: async (data) => {
      const toolId = data.data.toolId;
      
      // Assign tags to the published tool
      if (selectedTagIds.length > 0) {
        try {
          const tagResponse = await apiRequest('POST', `/api/tags/assign/${toolId}`, {
            tagIds: selectedTagIds
          });
          
          if (!tagResponse.ok) {
            console.error('Failed to assign tags, but tool was published');
          }
        } catch (error) {
          console.error('Error assigning tags:', error);
        }
      }
      
      toast({
        title: "Tool published! 🚀",
        description: "Your tool is now live and available to users.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tools"] });
      setLocation(`/fxn/${toolId}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to publish",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSaveDraft = async () => {
    const metadata = form.getValues();
    const validation = toolMetadataSchema.safeParse(metadata);
    
    if (!validation.success) {
      toast({
        title: "Please fill in all required fields",
        description: validation.error.errors[0]?.message || "Validation failed",
        variant: "destructive",
      });
      return;
    }

    saveDraftMutation.mutate({
      name: metadata.name,
      description: metadata.description,
      category: metadata.category,
      inputConfig: formFields,
      logicConfig: logicSteps,
      outputConfig: outputConfig,
      status: 'draft'
    });
  };

  // Enhanced validation for each step
  const validateCurrentStep = () => {
    switch (currentStep) {
      case 0: // Metadata step
        const metadata = form.getValues();
        const validation = toolMetadataSchema.safeParse(metadata);
        if (!validation.success) {
          toast({
            title: "Please complete tool information",
            description: validation.error.errors[0]?.message || "Validation failed",
            variant: "destructive",
          });
          return false;
        }
        break;
      
      case 1: // Form fields step
        if (formFields.length === 0) {
          toast({
            title: "Add some input fields",
            description: "Your tool needs at least one input field",
            variant: "destructive",
          });
          return false;
        }
        
        // Validate each field has required properties
        for (const field of formFields) {
          if (!field.label || field.label.trim().length === 0) {
            toast({
              title: "Invalid field configuration",
              description: `Field "${field.id}" needs a label`,
              variant: "destructive",
            });
            return false;
          }
        }
        break;
      
      case 2: // Logic step
        if (logicSteps.length === 0) {
          toast({
            title: "Add some logic steps",
            description: "Your tool needs at least one logic step to process the input",
            variant: "destructive",
          });
          return false;
        }
        
        // Validate logic steps
        for (const step of logicSteps) {
          if (step.type === 'calculation' && !step.config.calculation?.formula) {
            toast({
              title: "Invalid logic step",
              description: `Calculation step "${step.id}" needs a formula`,
              variant: "destructive",
            });
            return false;
          }
        }
        break;
      
      case 3: // Test step
        if (!draftId) {
          toast({
            title: "Save your draft first",
            description: "Please save your tool before testing",
            variant: "destructive",
          });
          return false;
        }
        break;
    }
    return true;
  };

  const handleMoveToTesting = async () => {
    if (!validateCurrentStep()) return;

    const metadata = form.getValues();
    
    saveDraftMutation.mutate({
      name: metadata.name,
      description: metadata.description,
      category: metadata.category,
      inputConfig: formFields,
      logicConfig: logicSteps,
      outputConfig: outputConfig,
      status: 'testing'
    });
    
    setCurrentStep(3); // Move to test step
  };

  const handleNextStep = () => {
    if (validateCurrentStep()) {
      setCurrentStep(Math.min(currentStep + 1, STEPS.length - 1));
    }
  };

  // CRITICAL FIX: Auto-save when navigating between steps
  const handleStepNavigation = async (targetStep: number) => {
    // If we're navigating from a step that has data, save it first
    if (currentStep >= 1 && (formFields.length > 0 || logicSteps.length > 0)) {
      const metadata = form.getValues();
      const validation = toolMetadataSchema.safeParse(metadata);
      
      if (validation.success) {
        try {
          await saveDraftMutation.mutateAsync({
            name: metadata.name,
            description: metadata.description,
            category: metadata.category,
            inputConfig: formFields,
            logicConfig: logicSteps,
            outputConfig: outputConfig,
            status: 'draft'
          });
        } catch (error) {
          console.error('Auto-save failed during navigation:', error);
          // Continue navigation even if save fails - user can manually save
        }
      }
    }
    
    setCurrentStep(targetStep);
  };

  const handlePublish = () => {
    if (!draftId) {
      toast({
        title: "Save your draft first",
        description: "Please save your tool before publishing",
        variant: "destructive",
      });
      return;
    }

    // CRITICAL FIX: Validate tool configuration before publishing
    if (formFields.length === 0) {
      toast({
        title: "Cannot publish incomplete tool",
        description: "Your tool needs at least one input field",
        variant: "destructive",
      });
      return;
    }

    if (logicSteps.length === 0) {
      toast({
        title: "Cannot publish incomplete tool", 
        description: "Your tool needs at least one logic step to process inputs",
        variant: "destructive",
      });
      return;
    }

    // Validate logic steps have proper configuration
    for (const step of logicSteps) {
      if (step.type === 'calculation' && !step.config.calculation?.formula) {
        toast({
          title: "Invalid calculation step",
          description: `Calculation step "${step.id}" needs a formula`,
          variant: "destructive",
        });
        return;
      }
    }

    publishMutation.mutate();
  };

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  return (
    <>
      {/* <NavigationHeader /> */}
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3">
                  <Sparkles className="text-blue-600 w-5 h-5 sm:w-6 sm:h-6" />
                  Visual Tool Builder
                </h1>
                <p className="text-sm sm:text-base text-gray-600 mt-1">
                  Create powerful tools without coding - drag, drop, and go live!
                </p>
              </div>
              
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                {createDraftFromPublishedMutation.isPending && (
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-blue-600 w-full sm:w-auto">
                    <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-blue-600"></div>
                    <span className="hidden sm:inline">Converting tool for editing...</span>
                    <span className="sm:hidden">Converting...</span>
                  </div>
                )}
                
                <Button
                  variant="outline"
                  onClick={handleSaveDraft}
                  disabled={saveDraftMutation.isPending || createDraftFromPublishedMutation.isPending}
                  className="flex items-center gap-2 w-full sm:w-auto"
                  size="sm"
                >
                  <Save className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">{saveDraftMutation.isPending ? 'Saving...' : 'Save Draft'}</span>
                  <span className="sm:hidden">Save</span>
                </Button>
                
                {draftId && (
                  <Button
                    variant="outline"
                    onClick={() => setShowPricingModal(true)}
                    className="flex items-center gap-2 w-full sm:w-auto"
                    size="sm"
                  >
                    <DollarSign className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Pricing</span>
                    <span className="sm:hidden">$</span>
                  </Button>
                )}
                
                {currentStep >= 3 && (
                  <Button
                    onClick={handlePublish}
                    disabled={publishMutation.isPending || !draftId || createDraftFromPublishedMutation.isPending}
                    className="flex items-center gap-2 w-full sm:w-auto"
                    size="sm"
                  >
                    <Rocket className="h-3 w-3 sm:h-4 sm:w-4" />
                    {publishMutation.isPending ? 'Publishing...' : 'Publish'}
                  </Button>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs sm:text-sm text-gray-600">
                <span>Progress</span>
                <span>{Math.round(progress)}% complete</span>
              </div>
              <Progress value={progress} className="h-1.5 sm:h-2" />
            </div>

            {/* Step Navigation */}
            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <div className="flex items-center justify-between mt-4 sm:mt-6 min-w-max sm:min-w-0">
              {STEPS.map((step, index) => {
                const Icon = step.icon;
                const isActive = index === currentStep;
                const isCompleted = index < currentStep;
                
                return (
                  <div
                    key={step.id}
                    className={`flex items-center ${index < STEPS.length - 1 ? 'sm:flex-1' : ''}`}
                  >
                    <button
                      onClick={() => handleStepNavigation(index)}
                      className={`flex items-center gap-1 sm:gap-2 p-1.5 sm:p-2 rounded-lg transition-colors text-xs sm:text-sm whitespace-nowrap ${
                        isActive
                          ? 'bg-blue-100 text-blue-700'
                          : isCompleted
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                      ) : (
                        <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                      )}
                      <span className="font-medium hidden sm:inline">{step.label}</span>
                    </button>
                    
                    {index < STEPS.length - 1 && (
                      <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 mx-1 sm:mx-2 flex-shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          </div>

          {/* Step Content */}
          <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
            {currentStep === 0 && (
              <div className="mx-auto space-y-4 sm:space-y-6">
                {showTemplateSelector ? (
                  // Template Selector View
                  <div>
                    <TemplateSelector
                      onSelectTemplate={async (template: ToolTemplate) => {
                        // Populate form with template data
                        form.setValue('name', template.name);
                        form.setValue('description', template.description);
                        form.setValue('category', template.category);
                        setFormFields(template.inputConfig);
                        setLogicSteps(template.logicConfig);
                        setOutputConfig(template.outputConfig);
                        setShowTemplateSelector(false);
                        
                        // Auto-save the draft with template data
                        try {
                          await saveDraftMutation.mutateAsync({
                            name: template.name,
                            description: template.description,
                            category: template.category,
                            inputConfig: template.inputConfig,
                            logicConfig: template.logicConfig,
                            outputConfig: template.outputConfig,
                          });
                        } catch (error) {
                          console.error('Failed to save template:', error);
                        }
                        
                        toast({
                          title: "Template loaded! ✨",
                          description: `${template.name} template is ready to customize`,
                        });
                      }}
                      onStartBlank={() => {
                        setShowTemplateSelector(false);
                      }}
                    />
                  </div>
                ) : (
                  // Manual Tool Creation View
                  <div>
                    <div className="text-center mb-8">
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setShowTemplateSelector(true)}
                          className="flex items-center gap-2 w-full sm:w-auto order-2 sm:order-1"
                        >
                          <Sparkles className="h-4 w-4" />
                          Use Template
                        </Button>
                        <h2 className="text-xl sm:text-2xl font-bold order-1 sm:order-2">Tool Information</h2>
                        <div className="hidden sm:block sm:w-24 order-3"></div>
                      </div>
                      <p className="text-gray-600">
                        Let's start by giving your tool a name and description
                      </p>
                    </div>

                    <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Tool Name *</Label>
                    <Input
                      id="name"
                      {...form.register('name')}
                      placeholder="e.g., Tip Calculator, Unit Converter"
                      className="mt-1"
                    />
                    {form.formState.errors.name && (
                      <p className="text-sm text-red-600 mt-1">
                        {form.formState.errors.name.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      {...form.register('description')}
                      placeholder="Describe what your tool does and how it helps users"
                      rows={3}
                      className="mt-1"
                    />
                    {form.formState.errors.description && (
                      <p className="text-sm text-red-600 mt-1">
                        {form.formState.errors.description.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="category">Category *</Label>
                    <Select
                      value={form.watch('category')}
                      onValueChange={(value) => form.setValue('category', value)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category.charAt(0).toUpperCase() + category.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form.formState.errors.category && (
                      <p className="text-sm text-red-600 mt-1">
                        {form.formState.errors.category.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label>Tags (optional)</Label>
                    <p className="text-sm text-gray-500 mb-2">
                      Add tags to help users discover your tool
                    </p>
                    <TagMultiSelect
                      selectedTagIds={selectedTagIds}
                      onChange={setSelectedTagIds}
                    />
                  </div>
                </div>

                <div className="flex justify-center pt-6">
                  <Button
                    onClick={handleNextStep}
                    className="flex items-center gap-2"
                  >
                    Next: Design Form
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
                  </div>
                )}
              </div>
            )}

            {currentStep === 1 && (
              <div>
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold mb-2">Design Input Form</h2>
                  <p className="text-gray-600">
                    Drag and drop fields to create your tool's input form
                  </p>
                </div>

                <VisualFormDesigner
                  fields={formFields}
                  onChange={setFormFields}
                  onPreview={() => setIsPreviewMode(!isPreviewMode)}
                  isPreviewMode={isPreviewMode}
                />

                <div className="flex justify-between pt-6">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep(0)}
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleNextStep}
                    className="flex items-center gap-2"
                  >
                    Next: Add Logic
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div>
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold mb-2">Build Logic Flow</h2>
                  <p className="text-gray-600">
                    Add calculations, conditions, and transformations to process user input
                  </p>
                </div>

                <LogicFlowBuilder
                  steps={logicSteps}
                  formFields={formFields}
                  onChange={setLogicSteps}
                />

                <div className="flex justify-between pt-6">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep(1)}
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleMoveToTesting}
                    className="flex items-center gap-2"
                  >
                    Next: Test Tool
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div>
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold mb-2">Test Your Tool</h2>
                  <p className="text-gray-600">
                    Try out your tool to make sure everything works perfectly
                  </p>
                </div>

                <ToolTestRunner
                  draftId={draftId || ''}
                  formFields={formFields}
                  isDisabled={!draftId}
                />

                <div className="flex justify-between pt-6">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep(2)}
                  >
                    Back
                  </Button>
                  <Button
                    onClick={() => setCurrentStep(4)}
                    disabled={!draftId}
                    className="flex items-center gap-2"
                  >
                    Ready to Publish
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="max-w-2xl mx-auto">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold mb-2">Publish Your Tool</h2>
                  <p className="text-gray-600">
                    Your tool is ready! Publish it to make it available to all users.
                  </p>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Tool Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Name</Label>
                      <p className="font-medium">{form.watch('name')}</p>
                    </div>
                    
                    <div>
                      <Label>Description</Label>
                      <p className="text-gray-600">{form.watch('description')}</p>
                    </div>
                    
                    <div>
                      <Label>Category</Label>
                      <Badge variant="secondary">
                        {form.watch('category')?.charAt(0).toUpperCase() + form.watch('category')?.slice(1)}
                      </Badge>
                    </div>
                    
                    <Separator />
                    
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-blue-600">{formFields.length}</p>
                        <p className="text-sm text-gray-600">Input Fields</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-green-600">{logicSteps.length}</p>
                        <p className="text-sm text-gray-600">Logic Steps</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-between pt-6">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep(3)}
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handlePublish}
                    disabled={publishMutation.isPending || !draftId}
                    size="lg"
                    className="flex items-center gap-2"
                  >
                    <Rocket className="h-5 w-5" />
                    {publishMutation.isPending ? 'Publishing...' : 'Publish Tool'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {draftId && (
        <ToolPricingModal
          open={showPricingModal}
          onOpenChange={setShowPricingModal}
          fxnId={draftId}
        />
      )}
    </>
  );
}