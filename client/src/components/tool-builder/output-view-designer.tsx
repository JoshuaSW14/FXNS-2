import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  FileText,
  Code,
  FileCode,
  LayoutGrid,
  Plus,
  Trash2,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Sparkles
} from "lucide-react";
import { OutputConfig, FieldMapping, FormField } from "@shared/tool-builder-schemas";

interface OutputViewDesignerProps {
  outputConfig: OutputConfig;
  onChange: (config: OutputConfig) => void;
  formFields: FormField[];
}

const OUTPUT_FORMATS = [
  {
    value: 'text' as const,
    label: 'Text',
    description: 'Simple text output (default)',
    icon: FileText,
  },
  {
    value: 'json' as const,
    label: 'JSON',
    description: 'Pretty-printed JSON with syntax highlighting',
    icon: Code,
  },
  {
    value: 'table' as const,
    label: 'Table',
    description: 'Display results as a formatted table',
    icon: Table,
  },
  {
    value: 'markdown' as const,
    label: 'Markdown',
    description: 'Render markdown-formatted output',
    icon: FileCode,
  },
  {
    value: 'card' as const,
    label: 'Card Layout',
    description: 'Display results as visually appealing cards',
    icon: LayoutGrid,
  },
];

const FIELD_FORMATS = [
  { value: 'text', label: 'Text' },
  { value: 'currency', label: 'Currency ($)' },
  { value: 'date', label: 'Date' },
  { value: 'percentage', label: 'Percentage (%)' },
  { value: 'number', label: 'Number' },
  { value: 'boolean', label: 'Yes/No' },
];

export default function OutputViewDesigner({
  outputConfig,
  onChange,
  formFields,
}: OutputViewDesignerProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleFormatChange = (format: OutputConfig['format']) => {
    onChange({
      ...outputConfig,
      format,
    });
  };

  const handleAddFieldMapping = () => {
    const newMapping: FieldMapping = {
      fieldId: formFields[0]?.id || 'result',
      label: formFields[0]?.label || 'Result',
      format: 'text',
      order: (outputConfig.fieldMappings?.length || 0),
    };

    onChange({
      ...outputConfig,
      fieldMappings: [...(outputConfig.fieldMappings || []), newMapping],
    });
  };

  const handleRemoveFieldMapping = (index: number) => {
    const newMappings = [...(outputConfig.fieldMappings || [])];
    newMappings.splice(index, 1);
    onChange({
      ...outputConfig,
      fieldMappings: newMappings,
    });
  };

  const handleUpdateFieldMapping = (index: number, updates: Partial<FieldMapping>) => {
    const newMappings = [...(outputConfig.fieldMappings || [])];
    newMappings[index] = { ...newMappings[index], ...updates };
    onChange({
      ...outputConfig,
      fieldMappings: newMappings,
    });
  };

  const handleMoveFieldMapping = (index: number, direction: 'up' | 'down') => {
    const newMappings = [...(outputConfig.fieldMappings || [])];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= newMappings.length) return;
    
    [newMappings[index], newMappings[targetIndex]] = [newMappings[targetIndex], newMappings[index]];
    
    newMappings.forEach((mapping, idx) => {
      mapping.order = idx;
    });
    
    onChange({
      ...outputConfig,
      fieldMappings: newMappings,
    });
  };

  const handleCustomTemplateChange = (template: string) => {
    onChange({
      ...outputConfig,
      customTemplate: template,
    });
  };

  const selectedFormat = OUTPUT_FORMATS.find(f => f.value === outputConfig.format);
  const showFieldMappings = outputConfig.format === 'table' || outputConfig.format === 'card';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            Output View Designer
          </CardTitle>
          <CardDescription>
            Customize how your tool results are displayed to users
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Format Selector */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Display Format</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {OUTPUT_FORMATS.map((format) => {
                const Icon = format.icon;
                const isSelected = outputConfig.format === format.value;
                
                return (
                  <button
                    key={format.value}
                    onClick={() => handleFormatChange(format.value)}
                    className={`
                      relative p-4 rounded-lg border-2 transition-all text-left
                      ${isSelected 
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/30' 
                        : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                      }
                    `}
                  >
                    {isSelected && (
                      <Badge className="absolute top-2 right-2 bg-purple-500">
                        Active
                      </Badge>
                    )}
                    <div className="flex items-start gap-3">
                      <Icon className={`h-5 w-5 mt-0.5 ${isSelected ? 'text-purple-500' : 'text-gray-500'}`} />
                      <div className="flex-1">
                        <div className={`font-semibold ${isSelected ? 'text-purple-700 dark:text-purple-400' : ''}`}>
                          {format.label}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {format.description}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Field Mappings for Table and Card formats */}
          {showFieldMappings && (
            <>
              <Separator />
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-semibold">Field Mappings</Label>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Configure which fields to display and how to format them
                    </p>
                  </div>
                  <Button
                    onClick={handleAddFieldMapping}
                    size="sm"
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Field
                  </Button>
                </div>

                {outputConfig.fieldMappings && outputConfig.fieldMappings.length > 0 ? (
                  <div className="space-y-3">
                    {outputConfig.fieldMappings.map((mapping, index) => (
                      <Card key={index} className="border-gray-200 dark:border-gray-700">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="flex flex-col gap-1 mt-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleMoveFieldMapping(index, 'up')}
                                disabled={index === 0}
                                className="h-6 w-6 p-0"
                              >
                                <ChevronUp className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleMoveFieldMapping(index, 'down')}
                                disabled={index === (outputConfig.fieldMappings?.length || 0) - 1}
                                className="h-6 w-6 p-0"
                              >
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                            </div>

                            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <Label className="text-xs">Field</Label>
                                <Select
                                  value={mapping.fieldId}
                                  onValueChange={(value) => handleUpdateFieldMapping(index, { fieldId: value })}
                                >
                                  <SelectTrigger className="mt-1">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="result">Result</SelectItem>
                                    {formFields.map((field) => (
                                      <SelectItem key={field.id} value={field.id}>
                                        {field.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div>
                                <Label className="text-xs">Display Label</Label>
                                <Input
                                  value={mapping.label}
                                  onChange={(e) => handleUpdateFieldMapping(index, { label: e.target.value })}
                                  placeholder="Enter label"
                                  className="mt-1"
                                />
                              </div>

                              <div>
                                <Label className="text-xs">Format</Label>
                                <Select
                                  value={mapping.format || 'text'}
                                  onValueChange={(value: any) => handleUpdateFieldMapping(index, { format: value })}
                                >
                                  <SelectTrigger className="mt-1">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {FIELD_FORMATS.map((format) => (
                                      <SelectItem key={format.value} value={format.value}>
                                        {format.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveFieldMapping(index)}
                              className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 mt-6"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      No field mappings configured yet
                    </p>
                    <Button
                      onClick={handleAddFieldMapping}
                      size="sm"
                      variant="outline"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Your First Field
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Advanced: Custom Template */}
          <Separator />
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Advanced Options</Label>
              <Switch
                checked={showAdvanced}
                onCheckedChange={setShowAdvanced}
              />
            </div>

            {showAdvanced && (
              <div className="space-y-2 pt-2">
                <Label className="text-sm">Custom Template (Advanced)</Label>
                <Textarea
                  value={outputConfig.customTemplate || ''}
                  onChange={(e) => handleCustomTemplateChange(e.target.value)}
                  placeholder="Enter custom template using {{fieldId}} syntax"
                  rows={6}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Use variables like <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">{"{{fieldId}}"}</code> to reference form fields and results
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Preview Section */}
      <Card className="border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20">
        <CardHeader>
          <CardTitle className="text-base">Format Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold">Selected Format:</span>
              <Badge variant="outline" className="bg-white dark:bg-gray-900">
                {selectedFormat?.label}
              </Badge>
            </div>
            {showFieldMappings && outputConfig.fieldMappings && outputConfig.fieldMappings.length > 0 && (
              <div>
                <span className="font-semibold">Fields to Display:</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {outputConfig.fieldMappings.map((mapping, idx) => (
                    <Badge key={idx} variant="secondary">
                      {mapping.label} ({mapping.format || 'text'})
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
