import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Filter, 
  Star, 
  Clock, 
  Users, 
  Zap, 
  Brain,
  Globe,
  Calculator,
  FileText,
  BarChart3,
  DollarSign,
  Shuffle,
  Heart,
  ChevronRight,
  Play,
  Eye,
  Bookmark,
  TrendingUp,
  Shield
} from 'lucide-react';
import { 
  SIMPLE_TOOL_TEMPLATES, 
  SIMPLE_TEMPLATE_CATEGORIES, 
  getSimpleTemplatesByCategory, 
  getSimpleTemplatesByDifficulty, 
  searchSimpleTemplates,
  SimpleToolTemplate 
} from '@shared/simple-tool-templates';
import { useAuth } from '@/hooks/use-auth';
import { ProBadge } from '@/components/ui/pro-badge';

interface TemplateBrowserProps {
  onSelectTemplate: (template: SimpleToolTemplate) => void;
  onPreviewTemplate: (template: SimpleToolTemplate) => void;
  selectedTemplateId?: string;
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

export default function TemplateBrowser({ onSelectTemplate, onPreviewTemplate, selectedTemplateId }: TemplateBrowserProps) {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const filteredTemplates = useMemo(() => {
    let templates = SIMPLE_TOOL_TEMPLATES;

    // Search filter
    if (searchTerm) {
      templates = searchSimpleTemplates(searchTerm);
    }

    // Category filter
    if (selectedCategory !== 'all') {
      templates = templates.filter(template => template.category === selectedCategory);
    }

    // Difficulty filter
    if (selectedDifficulty !== 'all') {
      templates = templates.filter(template => template.difficulty === selectedDifficulty);
    }

    return templates;
  }, [searchTerm, selectedCategory, selectedDifficulty]);

  const popularTemplates = useMemo(() => {
    return SIMPLE_TOOL_TEMPLATES.filter(template => 
      ['simple-tip-calculator', 'text-formatter', 'business-card-builder'].includes(template.id)
    );
  }, []);

  const recentTemplates = useMemo(() => {
    return SIMPLE_TOOL_TEMPLATES.filter(template => 
      ['password-strength-checker', 'business-card-builder', 'text-formatter'].includes(template.id)
    );
  }, []);

  const renderTemplateCard = (template: SimpleToolTemplate, size: 'small' | 'medium' | 'large' = 'medium') => {
    const isSelected = selectedTemplateId === template.id;
    const Icon = categoryIcons[template.category as keyof typeof categoryIcons] || FileText;
    const DifficultyIcon = difficultyIcons[template.difficulty];
    const isAdvanced = template.difficulty === 'advanced';
    const requiresPro = isAdvanced && user?.subscriptionStatus !== 'active';

    return (
      <Card 
        key={template.id}
        className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] ${
          isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''
        } ${size === 'small' ? 'h-32' : size === 'large' ? 'h-48' : 'h-40'}`}
        onClick={() => onSelectTemplate(template)}
      >
        <CardHeader className={`pb-2 ${size === 'small' ? 'p-3' : ''}`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gray-100">
                <Icon className="h-4 w-4 text-gray-600" />
              </div>
              {requiresPro && <ProBadge />}
            </div>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onPreviewTemplate(template);
                }}
              >
                <Eye className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
              >
                <Bookmark className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <CardTitle className={`${size === 'small' ? 'text-sm' : 'text-base'} line-clamp-1`}>
            {template.name}
          </CardTitle>
          <CardDescription className={`${size === 'small' ? 'text-xs' : 'text-sm'} line-clamp-2`}>
            {template.description}
          </CardDescription>
        </CardHeader>
        
        <CardContent className={`pt-0 ${size === 'small' ? 'px-3 pb-2' : ''}`}>
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap gap-1">
              <Badge 
                variant="outline" 
                className={`text-xs ${difficultyColors[template.difficulty]}`}
              >
                <DifficultyIcon className="w-3 h-3 mr-1" />
                {template.difficulty}
              </Badge>
              {template.tags.slice(0, 2).map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Template Library</h2>
            <p className="text-gray-600">Kickstart your tool creation with professionally designed templates</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              Grid
            </Button>
            <Button 
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              List
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {SIMPLE_TEMPLATE_CATEGORIES.map(category => (
                <SelectItem key={category.value} value={category.value}>
                  {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Difficulty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="beginner">Beginner</SelectItem>
              <SelectItem value="intermediate">Intermediate</SelectItem>
              <SelectItem value="advanced">Advanced</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Quick Access Sections */}
      {!searchTerm && selectedCategory === 'all' && selectedDifficulty === 'all' && (
        <Tabs defaultValue="popular" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="popular">Popular</TabsTrigger>
            <TabsTrigger value="recent">Recently Added</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
          </TabsList>
          
          <TabsContent value="popular" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {popularTemplates.map(template => renderTemplateCard(template, 'small'))}
            </div>
          </TabsContent>
          
          <TabsContent value="recent" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentTemplates.map(template => renderTemplateCard(template, 'medium'))}
            </div>
          </TabsContent>
          
          <TabsContent value="categories" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {SIMPLE_TEMPLATE_CATEGORIES.map(category => {
                const Icon = categoryIcons[category.value as keyof typeof categoryIcons] || FileText;
                const categoryTemplates = getSimpleTemplatesByCategory(category.value);
                
                return (
                  <Card 
                    key={category.value}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setSelectedCategory(category.value)}
                  >
                    <CardHeader className="text-center pb-2">
                      <div className="mx-auto p-3 rounded-lg bg-gray-100 w-fit">
                        <Icon className="h-6 w-6 text-gray-600" />
                      </div>
                      <CardTitle className="text-sm">{category.label}</CardTitle>
                      <CardDescription className="text-xs">
                        {categoryTemplates.length} template{categoryTemplates.length !== 1 ? 's' : ''}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* Results */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            {searchTerm ? `Search Results (${filteredTemplates.length})` : 
             selectedCategory !== 'all' || selectedDifficulty !== 'all' ? 
             `Filtered Results (${filteredTemplates.length})` : 
             `All Templates (${filteredTemplates.length})`}
          </h3>
          {(searchTerm || selectedCategory !== 'all' || selectedDifficulty !== 'all') && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('all');
                setSelectedDifficulty('all');
              }}
            >
              Clear Filters
            </Button>
          )}
        </div>

        {filteredTemplates.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="space-y-2">
              <Search className="h-12 w-12 text-gray-400 mx-auto" />
              <h3 className="text-lg font-medium">No templates found</h3>
              <p className="text-gray-600">Try adjusting your search or filter criteria</p>
            </div>
          </Card>
        ) : (
          <div className={
            viewMode === 'grid' 
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
              : "space-y-3"
          }>
            {filteredTemplates.map(template => 
              viewMode === 'grid' 
                ? renderTemplateCard(template, 'medium')
                : (
                    <Card 
                      key={template.id}
                      className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                        selectedTemplateId === template.id ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                      }`}
                      onClick={() => onSelectTemplate(template)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-gray-100">
                              <Icon className="h-5 w-5 text-gray-600" />
                            </div>
                            <div>
                              <CardTitle className="text-base">{template.name}</CardTitle>
                              <CardDescription className="text-sm">{template.description}</CardDescription>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${difficultyColors[template.difficulty]}`}
                            >
                              {template.difficulty}
                            </Badge>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                onPreviewTemplate(template);
                              }}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Preview
                            </Button>
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectTemplate(template);
                              }}
                            >
                              <Play className="h-4 w-4 mr-1" />
                              Use Template
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  )
            )}
          </div>
        )}
      </div>
    </div>
  );
}