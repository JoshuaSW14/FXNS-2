import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Play, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { FormField, OutputConfig } from "@shared/tool-builder-schemas";

interface ToolTestRunnerProps {
  draftId: string;
  formFields: FormField[];
  outputConfig?: OutputConfig;
  isDisabled?: boolean;
}

interface TestResult {
  success: boolean;
  result?: any;
  error?: string;
  executionTime?: number;
}

const formatValue = (value: any, format?: string): string => {
  if (value === null || value === undefined) return '-';
  
  switch (format) {
    case 'currency':
      return typeof value === 'number' 
        ? `$${value.toFixed(2)}` 
        : `$${parseFloat(value).toFixed(2)}`;
    case 'date':
      return new Date(value).toLocaleDateString();
    case 'percentage':
      return typeof value === 'number'
        ? `${(value * 100).toFixed(1)}%`
        : `${parseFloat(value).toFixed(1)}%`;
    case 'number':
      return typeof value === 'number'
        ? value.toLocaleString()
        : parseFloat(value).toLocaleString();
    case 'boolean':
      return value ? 'Yes' : 'No';
    case 'text':
    default:
      return String(value);
  }
};

const renderOutput = (result: any, config?: OutputConfig) => {
  if (!config || config.format === 'text') {
    return (
      <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
        <pre className="text-sm whitespace-pre-wrap">
          {typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result)}
        </pre>
      </div>
    );
  }

  switch (config.format) {
    case 'json':
      return (
        <div className="p-4 bg-gray-900 rounded-lg overflow-x-auto">
          <pre className="text-sm text-green-400 font-mono">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      );

    case 'markdown':
      const markdownContent = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
      return (
        <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
          <div 
            className="prose dark:prose-invert max-w-none text-sm"
            dangerouslySetInnerHTML={{ 
              __html: markdownContent
                .replace(/^### (.*$)/gim, '<h3>$1</h3>')
                .replace(/^## (.*$)/gim, '<h2>$1</h2>')
                .replace(/^# (.*$)/gim, '<h1>$1</h1>')
                .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
                .replace(/\*(.*)\*/gim, '<em>$1</em>')
                .replace(/\n/gim, '<br />')
            }}
          />
        </div>
      );

    case 'table':
      if (!config.fieldMappings || config.fieldMappings.length === 0) {
        return (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              No field mappings configured for table view. Please add fields in the Output View Designer.
            </AlertDescription>
          </Alert>
        );
      }

      const isArrayResult = Array.isArray(result);
      const dataRows = isArrayResult ? result : [result];

      return (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                {config.fieldMappings.map((mapping, idx) => (
                  <TableHead key={idx}>{mapping.label}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {dataRows.map((row, rowIdx) => (
                <TableRow key={rowIdx}>
                  {config.fieldMappings!.map((mapping, cellIdx) => (
                    <TableCell key={cellIdx}>
                      {formatValue(row[mapping.fieldId], mapping.format)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      );

    case 'card':
      if (!config.fieldMappings || config.fieldMappings.length === 0) {
        return (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              No field mappings configured for card view. Please add fields in the Output View Designer.
            </AlertDescription>
          </Alert>
        );
      }

      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {config.fieldMappings.map((mapping, idx) => (
            <Card key={idx} className="border-gray-200 dark:border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {mapping.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {formatValue(result[mapping.fieldId], mapping.format)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      );

    default:
      return (
        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <pre className="text-sm whitespace-pre-wrap">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      );
  }
};

export default function ToolTestRunner({ 
  draftId, 
  formFields,
  outputConfig,
  isDisabled = false 
}: ToolTestRunnerProps) {
  const { toast } = useToast();
  const [testData, setTestData] = useState<Record<string, any>>({});
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  // Initialize test data with default values
  React.useEffect(() => {
    const initialData: Record<string, any> = {};
    formFields.forEach(field => {
      switch (field.type) {
        case 'text':
        case 'textarea':
        case 'email':
        case 'tel':
        case 'url':
          initialData[field.id] = field.defaultValue || '';
          break;
        case 'number':
          initialData[field.id] = field.defaultValue || 0;
          break;
        case 'boolean':
          initialData[field.id] = field.defaultValue || false;
          break;
        case 'select':
          initialData[field.id] = field.defaultValue || (field.options?.[0]?.value || '');
          break;
        case 'date':
          initialData[field.id] = field.defaultValue || new Date().toISOString().split('T')[0];
          break;
        default:
          initialData[field.id] = '';
      }
    });
    setTestData(initialData);
  }, [formFields]);

  const testMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const response = await apiRequest('POST', `/api/tool-builder/drafts/${draftId}/test`, {
        testData: data
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Test failed');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setTestResult({
        success: true,
        result: data.result,
        executionTime: data.executionTime
      });
      toast({
        title: "Test successful!",
        description: "Your tool executed without errors.",
      });
    },
    onError: (error: Error) => {
      setTestResult({
        success: false,
        error: error.message
      });
      toast({
        title: "Test failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleInputChange = (fieldId: string, value: any) => {
    setTestData(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleTest = () => {
    if (!draftId) {
      toast({
        title: "Cannot test",
        description: "Please save your tool as a draft first",
        variant: "destructive",
      });
      return;
    }

    // Validate required fields
    const missingFields = formFields
      .filter(field => field.required && !testData[field.id])
      .map(field => field.label);

    if (missingFields.length > 0) {
      toast({
        title: "Missing required fields",
        description: `Please fill in: ${missingFields.join(', ')}`,
        variant: "destructive",
      });
      return;
    }

    setTestResult(null);
    testMutation.mutate(testData);
  };

  const canTest = draftId && formFields.length > 0 && !isDisabled;

  return (
    <div className="space-y-6">
      {/* Test Input Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Test Your Tool
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {formFields.length === 0 ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Add some form fields to test your tool.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {formFields.map((field) => (
                  <div key={field.id}>
                    <Label className={field.required ? "after:content-['*'] after:text-red-500" : ""}>
                      {field.label}
                    </Label>
                    
                    {field.type === 'text' && (
                      <Input
                        placeholder={field.placeholder}
                        value={testData[field.id] || ''}
                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                      />
                    )}
                    
                    {field.type === 'number' && (
                      <Input
                        type="number"
                        placeholder={field.placeholder}
                        value={testData[field.id] || ''}
                        onChange={(e) => handleInputChange(field.id, parseFloat(e.target.value) || 0)}
                      />
                    )}
                    
                    {field.type === 'textarea' && (
                      <Textarea
                        placeholder={field.placeholder}
                        value={testData[field.id] || ''}
                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                        rows={3}
                      />
                    )}
                    
                    {field.type === 'boolean' && (
                      <div className="flex items-center space-x-2 pt-2">
                        <Switch
                          checked={testData[field.id] || false}
                          onCheckedChange={(checked) => handleInputChange(field.id, checked)}
                        />
                        <span className="text-sm text-gray-600">
                          {testData[field.id] ? 'Yes' : 'No'}
                        </span>
                      </div>
                    )}
                    
                    {field.type === 'select' && (
                      <Select
                        value={testData[field.id] || ''}
                        onValueChange={(value) => handleInputChange(field.id, value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={field.placeholder || 'Select an option'} />
                        </SelectTrigger>
                        <SelectContent>
                          {(field.type === 'select' ? field.options || [] : []).map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    
                    {(field.type === 'email' || field.type === 'tel' || field.type === 'url' || field.type === 'date') && (
                      <Input
                        type={field.type}
                        placeholder={field.placeholder}
                        value={testData[field.id] || ''}
                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                      />
                    )}
                  </div>
                ))}
              </div>
              
              <div className="flex justify-center pt-4">
                <Button
                  onClick={handleTest}
                  disabled={!canTest || testMutation.isPending}
                  size="lg"
                  className="flex items-center gap-2"
                >
                  {testMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  {testMutation.isPending ? 'Testing...' : 'Run Test'}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Test Results */}
      {testResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {testResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              Test Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            {testResult.success ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    Success
                  </Badge>
                  {testResult.executionTime && (
                    <Badge variant="outline">
                      {testResult.executionTime}ms
                    </Badge>
                  )}
                  {outputConfig && (
                    <Badge variant="outline" className="ml-auto">
                      Format: {outputConfig.format}
                    </Badge>
                  )}
                </div>
                
                <div>
                  <Label>Output</Label>
                  <div className="mt-2">
                    {renderOutput(testResult.result, outputConfig)}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <Badge variant="destructive">
                  Error
                </Badge>
                
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    {testResult.error}
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Help Text */}
      {!canTest && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {!draftId 
              ? "Save your tool as a draft first to enable testing."
              : formFields.length === 0
              ? "Add form fields to test your tool."
              : "Testing is temporarily disabled."
            }
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}