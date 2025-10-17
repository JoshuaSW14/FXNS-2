import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Play, Loader2 } from "lucide-react";

interface FormField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'enum' | 'textarea';
  label: string;
  placeholder?: string;
  required?: boolean;
  min?: number;
  max?: number;
  options?: string[];
  defaultValue?: any;
}

interface DynamicFormProps {
  fields: FormField[];
  onSubmit: (data: any) => void;
  isLoading?: boolean;
  submitText?: string;
  title?: string;
}

export default function DynamicForm({ 
  fields, 
  onSubmit, 
  isLoading = false, 
  submitText = "Run",
  title = "Input"
}: DynamicFormProps) {
  // Build Zod schema dynamically
  const schemaFields: Record<string, z.ZodTypeAny> = {};
  const defaultValues: Record<string, any> = {};

  fields.forEach(field => {
    let fieldSchema: z.ZodTypeAny;

    switch (field.type) {
      case 'string':
        fieldSchema = z.string();
        if (field.required) {
          fieldSchema = fieldSchema.min(1, `${field.label} is required`);
        }
        break;
      case 'number':
        fieldSchema = z.coerce.number();
        if (field.min !== undefined) {
          fieldSchema = fieldSchema.min(field.min, `${field.label} must be at least ${field.min}`);
        }
        if (field.max !== undefined) {
          fieldSchema = fieldSchema.max(field.max, `${field.label} must be at most ${field.max}`);
        }
        break;
      case 'boolean':
        fieldSchema = z.boolean().default(false);
        break;
      case 'enum':
        if (field.options && field.options.length > 0) {
          fieldSchema = z.enum(field.options as [string, ...string[]]);
        } else {
          fieldSchema = z.string();
        }
        break;
      case 'textarea':
        fieldSchema = z.string();
        if (field.required) {
          fieldSchema = fieldSchema.min(1, `${field.label} is required`);
        }
        break;
      default:
        fieldSchema = z.string();
    }

    if (!field.required && field.type !== 'boolean') {
      fieldSchema = fieldSchema.optional();
    }

    schemaFields[field.name] = fieldSchema;
    if (field.defaultValue !== undefined) {
      defaultValues[field.name] = field.defaultValue;
    }
  });

  const schema = z.object(schemaFields);
  
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const renderField = (field: FormField) => {
    const fieldError = form.formState.errors[field.name];

    switch (field.type) {
      case 'string':
        return (
          <div key={field.name}>
            <Label htmlFor={field.name} className="text-sm font-medium text-gray-700 mb-2 block">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={field.name}
              type="text"
              placeholder={field.placeholder}
              {...form.register(field.name)}
              className="w-full"
              data-testid={`input-${field.name}`}
            />
            {fieldError && (
              <p className="text-sm text-red-600 mt-1">
                {fieldError.message as string}
              </p>
            )}
          </div>
        );

      case 'number':
        return (
          <div key={field.name}>
            <Label htmlFor={field.name} className="text-sm font-medium text-gray-700 mb-2 block">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={field.name}
              type="number"
              placeholder={field.placeholder}
              min={field.min}
              max={field.max}
              step={field.type === 'number' ? '0.01' : undefined}
              {...form.register(field.name)}
              className="w-full"
              data-testid={`input-${field.name}`}
            />
            {fieldError && (
              <p className="text-sm text-red-600 mt-1">
                {fieldError.message as string}
              </p>
            )}
          </div>
        );

      case 'enum':
        return (
          <div key={field.name}>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Select 
              onValueChange={(value) => form.setValue(field.name, value)}
              defaultValue={field.defaultValue}
            >
              <SelectTrigger data-testid={`select-${field.name}`}>
                <SelectValue placeholder={field.placeholder || `Select ${field.label.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldError && (
              <p className="text-sm text-red-600 mt-1">
                {fieldError.message as string}
              </p>
            )}
          </div>
        );

      case 'boolean':
        return (
          <div key={field.name} className="flex items-center space-x-2">
            <Checkbox
              id={field.name}
              {...form.register(field.name)}
              data-testid={`checkbox-${field.name}`}
            />
            <Label htmlFor={field.name} className="text-sm font-medium text-gray-700">
              {field.label}
            </Label>
            {fieldError && (
              <p className="text-sm text-red-600">
                {fieldError.message as string}
              </p>
            )}
          </div>
        );

      case 'textarea':
        return (
          <div key={field.name}>
            <Label htmlFor={field.name} className="text-sm font-medium text-gray-700 mb-2 block">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Textarea
              id={field.name}
              placeholder={field.placeholder}
              {...form.register(field.name)}
              className="w-full min-h-[100px]"
              data-testid={`textarea-${field.name}`}
            />
            {fieldError && (
              <p className="text-sm text-red-600 mt-1">
                {fieldError.message as string}
              </p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="border border-gray-200">
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">{title}</h3>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            {fields.map(renderField)}
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
            data-testid="button-submit"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                {submitText}
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
