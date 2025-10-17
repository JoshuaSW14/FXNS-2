import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Star, 
  Clock, 
  Zap,
  ArrowRight,
  Sparkles,
  Settings
} from 'lucide-react';
import { 
  TOOL_TEMPLATES, 
  TEMPLATE_CATEGORIES, 
  ToolTemplate,
  getTemplatesByCategory,
  getTemplatesByDifficulty,
  searchTemplates
} from '@shared/tool-templates';

interface TemplateSelectorProps {
  onSelectTemplate: (template: ToolTemplate) => void;
  onStartBlank: () => void;
}

const difficultyIcons = {
  beginner: { icon: '🌱', label: 'Beginner', color: 'bg-green-100 text-green-700 border-green-200' },
  intermediate: { icon: '⚡', label: 'Intermediate', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  advanced: { icon: '🚀', label: 'Advanced', color: 'bg-red-100 text-red-700 border-red-200' }
};

export default function TemplateSelector({ onSelectTemplate, onStartBlank }: TemplateSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  const getFilteredTemplates = () => {
    let filtered = TOOL_TEMPLATES;
    
    if (searchQuery) {
      filtered = searchTemplates(searchQuery);
    }
    
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(template => template.category === selectedCategory);
    }
    
    return filtered;
  };

  const popularTemplates = TOOL_TEMPLATES.filter(t => ['tip-calculator', 'contact-form', 'unit-converter'].includes(t.id));
  const beginnerTemplates = getTemplatesByDifficulty('beginner');
  const filteredTemplates = getFilteredTemplates();

  return (
    <div className="mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-2 text-3xl font-bold">
          <Sparkles className="h-8 w-8 text-purple-600" />
          Choose Your Starting Point
        </div>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Jump-start your tool creation with professionally designed templates, 
          or build from scratch with complete creative freedom.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button 
          onClick={onStartBlank}
          size="lg" 
          variant="outline"
          className="flex items-center gap-2 px-8 py-3 text-base"
        >
          <Zap className="h-5 w-5" />
          Start from Scratch
        </Button>
        <Button 
          onClick={() => document.getElementById('templates')?.scrollIntoView({ behavior: 'smooth' })}
          size="lg" 
          className="flex items-center gap-2 px-8 py-3 text-base"
        >
          <Star className="h-5 w-5" />
          Browse Templates
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Templates Section */}
      <div id="templates">
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="space-y-6">
          {/* Search and Tabs */}
          <div className="space-y-4">
            <div className="relative max-w-md mx-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="w-full overflow-x-auto">
              <TabsList className="inline-flex w-max min-w-full justify-start lg:justify-center p-1">
                <TabsTrigger value="all" className="whitespace-nowrap">All</TabsTrigger>
                <TabsTrigger value="popular" className="whitespace-nowrap">Popular</TabsTrigger>
                <TabsTrigger value="beginner" className="whitespace-nowrap">Beginner</TabsTrigger>
                {TEMPLATE_CATEGORIES.map(category => (
                  <TabsTrigger 
                    key={category.value} 
                    value={category.value} 
                    className="whitespace-nowrap hidden sm:flex"
                  >
                    <span className="mr-1">{category.icon}</span>
                    <span className="hidden md:inline">{category.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </div>

          {/* Template Grids */}
          <TabsContent value="all">
            <TemplateGrid templates={filteredTemplates} onSelect={onSelectTemplate} />
          </TabsContent>

          <TabsContent value="popular">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                Most Popular Templates
              </h3>
              <TemplateGrid templates={popularTemplates} onSelect={onSelectTemplate} />
            </div>
          </TabsContent>

          <TabsContent value="beginner">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <span className="text-xl">🌱</span>
                Perfect for Getting Started
              </h3>
              <TemplateGrid templates={beginnerTemplates} onSelect={onSelectTemplate} />
            </div>
          </TabsContent>

          {TEMPLATE_CATEGORIES.map(category => (
            <TabsContent key={category.value} value={category.value}>
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <span className="text-xl">{category.icon}</span>
                  {category.label} Templates
                </h3>
                <TemplateGrid 
                  templates={getTemplatesByCategory(category.value)} 
                  onSelect={onSelectTemplate} 
                />
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}

interface TemplateGridProps {
  templates: ToolTemplate[];
  onSelect: (template: ToolTemplate) => void;
}

function TemplateGrid({ templates, onSelect }: TemplateGridProps) {
  if (templates.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-gray-500">No templates found matching your criteria.</p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
      {templates.map(template => (
        <TemplateCard key={template.id} template={template} onSelect={onSelect} />
      ))}
    </div>
  );
}

interface TemplateCardProps {
  template: ToolTemplate;
  onSelect: (template: ToolTemplate) => void;
}

function TemplateCard({ template, onSelect }: TemplateCardProps) {
  const difficulty = difficultyIcons[template.difficulty];

  return (
    <Card className="group hover:shadow-lg transition-all duration-200 hover:scale-[1.02] cursor-pointer border-2 hover:border-blue-300 h-full flex flex-col" 
          onClick={() => onSelect(template)}>
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="text-2xl flex-shrink-0">{template.icon}</div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-base lg:text-lg group-hover:text-blue-600 transition-colors truncate">
                {template.name}
              </CardTitle>
            </div>
          </div>
          <Badge 
            variant="outline" 
            className={`${difficulty.color} text-xs flex-shrink-0 whitespace-nowrap`}
          >
            <span className="hidden sm:inline">{difficulty.icon} </span>
            <span className="hidden lg:inline">{difficulty.label}</span>
            <span className="lg:hidden">{difficulty.icon}</span>
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4 flex-1 flex flex-col">
        <p className="text-sm text-gray-600 line-clamp-3 flex-grow">
          {template.description}
        </p>

        <div className="flex flex-wrap gap-1">
          {template.tags.slice(0, 2).map(tag => (
            <Badge key={tag} variant="secondary" className="text-xs truncate max-w-[80px]">
              {tag}
            </Badge>
          ))}
          {template.tags.length > 2 && (
            <Badge variant="secondary" className="text-xs">
              +{template.tags.length - 2}
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between pt-2 border-t mt-auto">
          <div className="flex items-center gap-2 lg:gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Settings className="h-3 w-3 flex-shrink-0" />
              <span className="hidden sm:inline">{template.inputConfig.length}</span>
              <span className="hidden lg:inline">inputs</span>
            </span>
            <span className="flex items-center gap-1">
              <Zap className="h-3 w-3 flex-shrink-0" />
              <span className="hidden sm:inline">{template.logicConfig.length}</span>
              <span className="hidden lg:inline">steps</span>
            </span>
          </div>
          
          <Button size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity text-xs px-2 lg:px-3">
            <span className="hidden sm:inline">Use Template</span>
            <span className="sm:hidden">Use</span>
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}