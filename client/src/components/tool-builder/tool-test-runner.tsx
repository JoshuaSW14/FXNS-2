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
import { Loader2, Play, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { FormField } from "@shared/tool-builder-schemas";

interface ToolTestRunnerProps {
  draftId: string;
  formFields: FormField[];
  isDisabled?: boolean;
}

interface TestResult {
  success: boolean;
  result?: any;
  error?: string;
  executionTime?: number;
}

export default function ToolTestRunner({ 
  draftId, 
  formFields, 
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
                </div>
                
                <div>
                  <Label>Output</Label>
                  <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                    <pre className="text-sm whitespace-pre-wrap">
                      {JSON.stringify(testResult.result, null, 2)}
                    </pre>
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