import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Play, 
  Eye, 
  Clock, 
  Users, 
  Star,
  TrendingUp,
  Zap,
  BookOpen,
  CheckCircle,
  ArrowRight,
  FileText,
  Calculator,
  Globe,
  Brain,
  BarChart3,
  DollarSign,
  Shuffle,
  Heart,
  Shield
} from 'lucide-react';
import { SimpleToolTemplate } from '@shared/simple-tool-templates';
import { useAuth } from '@/hooks/use-auth';
import { ProBadge } from '@/components/ui/pro-badge';

interface TemplatePreviewModalProps {
  template: SimpleToolTemplate | null;
  isOpen: boolean;
  onClose: () => void;
  onUseTemplate: (template: SimpleToolTemplate) => void;
}

const difficultyColors = {
  beginner: 'bg-green-100 text-green-800 border-green-200',
  intermediate: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  advanced: 'bg-red-100 text-red-800 border-red-200'
};

const categoryIcons = {
  calculator: Calculator,
  converter: Shuffle,
  finance: DollarSign,
  productivity: FileText,
  security: Shield,
  utility: Zap,
  developer: Globe,
  design: Shuffle,
  analytics: BarChart3,
  text: FileText,
  integration: Globe,
  health: Heart
};

const difficultyIcons = {
  beginner: Star,
  intermediate: TrendingUp,
  advanced: Zap
};

export default function TemplatePreviewModal({ template, isOpen, onClose, onUseTemplate }: TemplatePreviewModalProps) {
  const { user } = useAuth();

  if (!template) return null;

  const Icon = categoryIcons[template.category as keyof typeof categoryIcons] || FileText;
  const DifficultyIcon = difficultyIcons[template.difficulty];
  const isAdvanced = template.difficulty === 'advanced';
  const requiresPro = isAdvanced && user?.subscriptionStatus !== 'active';

  const handleUseTemplate = () => {
    onUseTemplate(template);
    onClose();
  };

  const renderField = (field: any) => (
    <Card key={field.id} className="p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-sm">{field.label}</span>
        <Badge variant="outline" className="text-xs">
          {field.type}
        </Badge>
      </div>
      {field.placeholder && (
        <p className="text-xs text-gray-500 italic">"{field.placeholder}"</p>
      )}
      {field.required && (
        <p className="text-xs text-red-600">Required</p>
      )}
    </Card>
  );

  const renderLogicStep = (step: any) => (
    <Card key={step.id} className="p-3">
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1 rounded bg-blue-100">
          {step.type === 'calculation' && <Calculator className="h-3 w-3 text-blue-600" />}
          {step.type === 'condition' && <ArrowRight className="h-3 w-3 text-green-600" />}
          {step.type === 'transform' && <Shuffle className="h-3 w-3 text-purple-600" />}
          {step.type === 'ai_analysis' && <Brain className="h-3 w-3 text-orange-600" />}
          {step.type === 'api_call' && <Globe className="h-3 w-3 text-indigo-600" />}
        </div>
        <span className="font-medium text-sm capitalize">{step.type}</span>
      </div>
      <p className="text-xs text-gray-600">{step.name}</p>
    </Card>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-gray-100">
                <Icon className="h-6 w-6 text-gray-600" />
              </div>
              <div>
                <DialogTitle className="flex items-center gap-2">
                  {template.name}
                  {requiresPro && <ProBadge />}
                </DialogTitle>
                <DialogDescription className="mt-1">
                  {template.description}
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge 
                variant="outline" 
                className={difficultyColors[template.difficulty]}
              >
                <DifficultyIcon className="w-3 h-3 mr-1" />
                {template.difficulty}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="structure">Structure</TabsTrigger>
            <TabsTrigger value="tutorial">Tutorial</TabsTrigger>
            <TabsTrigger value="examples">Examples</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Build Time
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{template.estimatedTime || '5 min'}</p>
                  <p className="text-xs text-gray-600">Estimated</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Skill Level
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold capitalize">{template.difficulty}</p>
                  <p className="text-xs text-gray-600">Required</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Star className="h-4 w-4" />
                    Category
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold capitalize">{template.category}</p>
                  <p className="text-xs text-gray-600">Type</p>
                </CardContent>
              </Card>
            </div>

            {template.useCases && template.useCases.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Use Cases</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {template.useCases.map((useCase, index) => (
                    <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                      <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <span className="text-sm">{useCase}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className="text-lg font-semibold mb-3">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {template.tags.map(tag => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="structure" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Input Fields ({template.inputConfig.length})
                </h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {template.inputConfig.map(renderField)}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Logic Steps ({template.logicConfig.length})
                </h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {template.logicConfig.map(renderLogicStep)}
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">Output Configuration</h3>
              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium">Format: {template.outputConfig.format}</span>
                  <Badge variant="outline">{template.outputConfig.sections.length} sections</Badge>
                </div>
                <div className="space-y-2">
                  {template.outputConfig.sections.map((section, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                      <Badge variant="secondary" className="text-xs">
                        {section.type}
                      </Badge>
                      <span className="text-sm font-medium">{section.title}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="tutorial" className="space-y-6">
            {template.tutorials ? (
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  {template.tutorials.title}
                </h3>
                <div className="space-y-3">
                  {template.tutorials.steps.map((step, index) => (
                    <div key={index} className="flex gap-3 p-4 bg-gray-50 rounded-lg">
                      <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </div>
                      <p className="text-sm">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <Card className="p-8 text-center">
                <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Tutorial Available</h3>
                <p className="text-gray-600">This template doesn't include a step-by-step tutorial, but you can explore its structure in the other tabs.</p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="examples" className="space-y-6">
            <Card className="p-8 text-center">
              <Eye className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Live Examples Coming Soon</h3>
              <p className="text-gray-600">Interactive examples and demos will be available in a future update.</p>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between items-center pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close Preview
          </Button>
          <div className="flex gap-2">
            <Button variant="outline">
              <BookOpen className="h-4 w-4 mr-2" />
              Learn More
            </Button>
            <Button onClick={handleUseTemplate} disabled={requiresPro}>
              <Play className="h-4 w-4 mr-2" />
              Use This Template
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}