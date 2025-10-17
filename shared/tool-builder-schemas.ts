import { z } from "zod";

// ===== UNIFIED TOOL BUILDER SCHEMAS =====

// Form Field Schemas
export const FormFieldOptionSchema = z.object({
  label: z.string(),
  value: z.string(),
});

export const FormFieldBaseSchema = z.object({
  id: z.string(),
  label: z.string(),
  placeholder: z.string().optional(),
  required: z.boolean().default(false),
  defaultValue: z.any().optional(),
});

export const TextFieldSchema = FormFieldBaseSchema.extend({
  type: z.literal('text'),
});

export const NumberFieldSchema = FormFieldBaseSchema.extend({
  type: z.literal('number'),
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional(),
});

export const BooleanFieldSchema = FormFieldBaseSchema.extend({
  type: z.literal('boolean'),
});

export const SelectFieldSchema = FormFieldBaseSchema.extend({
  type: z.literal('select'),
  options: z.array(FormFieldOptionSchema),
});

export const TextareaFieldSchema = FormFieldBaseSchema.extend({
  type: z.literal('textarea'),
  rows: z.number().optional(),
});

export const EmailFieldSchema = FormFieldBaseSchema.extend({
  type: z.literal('email'),
});

export const TelFieldSchema = FormFieldBaseSchema.extend({
  type: z.literal('tel'),
});

export const UrlFieldSchema = FormFieldBaseSchema.extend({
  type: z.literal('url'),
});

export const DateFieldSchema = FormFieldBaseSchema.extend({
  type: z.literal('date'),
});

// Enhanced Field Types
export const FileFieldSchema = FormFieldBaseSchema.extend({
  type: z.literal('file'),
  maxSize: z.number().optional().default(5), // MB
  acceptedTypes: z.array(z.string()).optional().default(['*/*']),
  multiple: z.boolean().optional().default(false),
});

export const MultiSelectFieldSchema = FormFieldBaseSchema.extend({
  type: z.literal('multiselect'),
  options: z.array(FormFieldOptionSchema),
  maxSelections: z.number().optional(),
});

export const RangeFieldSchema = FormFieldBaseSchema.extend({
  type: z.literal('range'),
  min: z.number().default(0),
  max: z.number().default(100),
  step: z.number().optional().default(1),
  showValue: z.boolean().optional().default(true),
});

export const ColorFieldSchema = FormFieldBaseSchema.extend({
  type: z.literal('color'),
});

export const PasswordFieldSchema = FormFieldBaseSchema.extend({
  type: z.literal('password'),
  confirmPassword: z.boolean().optional().default(false),
  minLength: z.number().optional().default(8),
  requireSpecialChar: z.boolean().optional().default(false),
  requireNumber: z.boolean().optional().default(false),
});

export const TimeFieldSchema = FormFieldBaseSchema.extend({
  type: z.literal('time'),
});

export const DateTimeFieldSchema = FormFieldBaseSchema.extend({
  type: z.literal('datetime'),
});

// Advanced Field Types
export const RichTextFieldSchema = FormFieldBaseSchema.extend({
  type: z.literal('rich_text'),
  minLength: z.number().optional(),
  maxLength: z.number().optional(),
  enabledFeatures: z.array(z.enum(['bold', 'italic', 'underline', 'link', 'list', 'code'])).optional().default(['bold', 'italic', 'underline', 'link', 'list']),
});

export const LocationFieldSchema = FormFieldBaseSchema.extend({
  type: z.literal('location'),
  enableGeolocation: z.boolean().optional().default(true),
  enableMap: z.boolean().optional().default(true),
  defaultZoom: z.number().optional().default(10),
  restrictToCountries: z.array(z.string()).optional(), // Country codes
});

export const RatingFieldSchema = FormFieldBaseSchema.extend({
  type: z.literal('rating'),
  maxRating: z.number().optional().default(5),
  ratingType: z.enum(['stars', 'hearts', 'thumbs', 'numbers']).optional().default('stars'),
  allowHalfRatings: z.boolean().optional().default(false),
  showLabels: z.boolean().optional().default(true),
});

export const SignatureFieldSchema = FormFieldBaseSchema.extend({
  type: z.literal('signature'),
  width: z.number().optional().default(400),
  height: z.number().optional().default(200),
  penColor: z.string().optional().default('#000000'),
  backgroundColor: z.string().optional().default('#ffffff'),
  lineWidth: z.number().optional().default(2),
});

export const CurrencyFieldSchema = FormFieldBaseSchema.extend({
  type: z.literal('currency'),
  currencyCode: z.string().optional().default('USD'),
  locale: z.string().optional().default('en-US'),
  min: z.number().optional(),
  max: z.number().optional(),
  allowDecimals: z.boolean().optional().default(true),
  showSymbol: z.boolean().optional().default(true),
});

export const JsonFieldSchema = FormFieldBaseSchema.extend({
  type: z.literal('json'),
  maxDepth: z.number().optional().default(10),
  enableValidation: z.boolean().optional().default(true),
  enableFormatting: z.boolean().optional().default(true),
  schemaTemplate: z.string().optional(), // JSON Schema for validation
});

export const BarcodeFieldSchema = FormFieldBaseSchema.extend({
  type: z.literal('barcode'),
  barcodeType: z.enum(['qr', 'code128', 'ean13', 'upca', 'code39']).optional().default('qr'),
  enableCamera: z.boolean().optional().default(true),
  enableManualEntry: z.boolean().optional().default(true),
  width: z.number().optional().default(200),
  height: z.number().optional().default(200),
});

// Conditional Field Support
export const ConditionalRuleSchema = z.object({
  fieldId: z.string(),
  operator: z.enum(['equals', 'not_equals', 'contains', 'greater_than', 'less_than', 'is_empty', 'is_not_empty']),
  value: z.any(),
});

export const ConditionalFieldSchema = FormFieldBaseSchema.extend({
  type: z.literal('conditional'),
  showWhen: ConditionalRuleSchema,
  fieldType: z.enum(['text', 'number', 'boolean', 'select', 'textarea', 'email', 'tel', 'url', 'date']),
  fieldConfig: z.record(z.any()), // Additional config for the nested field
});

// Advanced Validation Schema
export const ValidationRuleSchema = z.object({
  type: z.enum(['minLength', 'maxLength', 'pattern', 'custom', 'min', 'max', 'required', 'email', 'url', 'phone']),
  value: z.any(),
  message: z.string(),
});

// Enhanced base schema with validation
export const EnhancedFormFieldBaseSchema = FormFieldBaseSchema.extend({
  validation: z.array(ValidationRuleSchema).optional().default([]),
  helpText: z.string().optional(),
  prefix: z.string().optional(),
  suffix: z.string().optional(),
});

export const FormFieldSchema = z.discriminatedUnion('type', [
  TextFieldSchema,
  NumberFieldSchema,
  BooleanFieldSchema,
  SelectFieldSchema,
  TextareaFieldSchema,
  EmailFieldSchema,
  TelFieldSchema,
  UrlFieldSchema,
  DateFieldSchema,
  FileFieldSchema,
  MultiSelectFieldSchema,
  RangeFieldSchema,
  ColorFieldSchema,
  PasswordFieldSchema,
  TimeFieldSchema,
  DateTimeFieldSchema,
  ConditionalFieldSchema,
  // Advanced Field Types
  RichTextFieldSchema,
  LocationFieldSchema,
  RatingFieldSchema,
  SignatureFieldSchema,
  CurrencyFieldSchema,
  JsonFieldSchema,
  BarcodeFieldSchema,
]);

// Logic Step Schemas
export const VariableSchema = z.object({
  name: z.string(),
  fieldId: z.string(),
});

export const CalculationConfigSchema = z.object({
  formula: z.string(),
  variables: z.array(VariableSchema),
});

export const ConditionConfigSchema = z.object({
  if: z.object({
    fieldId: z.string(),
    operator: z.enum(['equals', 'not_equals', 'greater_than', 'less_than', 'contains']),
    value: z.string(),
  }),
  then: z.array(z.any()), // Will be LogicStep[] but avoiding circular reference
  else: z.array(z.any()).optional(),
});

export const TransformConfigSchema = z.object({
  inputFieldId: z.string(),
  transformType: z.enum(['uppercase', 'lowercase', 'trim', 'format_currency', 'format_date', 'extract_domain']),
});

export const CustomConfigSchema = z.object({
  code: z.string(),
  description: z.string().optional(),
});

export const AIAnalysisConfigSchema = z.object({
  prompt: z.string(),
  inputFields: z.array(z.string()),
  outputFormat: z.enum(['text', 'json', 'markdown']),
});

export const APICallConfigSchema = z.object({
  method: z.enum(['GET', 'POST']),
  url: z.string(),
  headers: z.record(z.string()).optional(),
  body: z.record(z.any()).optional(),
});

export const LogicStepSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  type: z.enum(['calculation', 'condition', 'transform', 'custom', 'ai_analysis', 'api_call']),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }).optional(),
  config: z.object({
    calculation: CalculationConfigSchema.optional(),
    condition: ConditionConfigSchema.optional(),
    transform: TransformConfigSchema.optional(),
    custom: CustomConfigSchema.optional(),
    aiAnalysis: AIAnalysisConfigSchema.optional(),
    apiCall: APICallConfigSchema.optional(),
  }),
  connections: z.array(z.string()).optional(),
});

// Output Schemas
export const OutputSectionSchema = z.object({
  id: z.string().optional(),
  type: z.enum(['text', 'number', 'boolean', 'list', 'object', 'result']),
  title: z.string(),
  content: z.string(),
  sourceStepId: z.string().optional(),
  visible: z.boolean().default(true),
});

export const OutputConfigSchema = z.object({
  format: z.enum(['text', 'json', 'table', 'chart']),
  sections: z.array(OutputSectionSchema),
});

// Tool Draft Schemas
export const ToolDraftCreateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  category: z.string(),
  templateId: z.string().optional(),
});

export const ToolDraftUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  category: z.string().optional(),
  status: z.enum(['draft', 'testing']).optional(),
  inputConfig: z.array(FormFieldSchema).optional(),
  logicConfig: z.array(LogicStepSchema).optional(),
  outputConfig: OutputConfigSchema.optional(),
});

export const ToolDraftSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.string(),
  status: z.enum(['draft', 'testing', 'published']),
  inputConfig: z.array(FormFieldSchema),
  logicConfig: z.array(LogicStepSchema),
  outputConfig: OutputConfigSchema,
  generatedSchema: z.any().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
});

// Type Exports
export type FormFieldOption = z.infer<typeof FormFieldOptionSchema>;
export type FormField = z.infer<typeof FormFieldSchema>;
export type Variable = z.infer<typeof VariableSchema>;
export type CalculationConfig = z.infer<typeof CalculationConfigSchema>;
export type ConditionConfig = z.infer<typeof ConditionConfigSchema>;
export type TransformConfig = z.infer<typeof TransformConfigSchema>;
export type CustomConfig = z.infer<typeof CustomConfigSchema>;
export type AIAnalysisConfig = z.infer<typeof AIAnalysisConfigSchema>;
export type APICallConfig = z.infer<typeof APICallConfigSchema>;
export type LogicStep = z.infer<typeof LogicStepSchema>;
export type OutputSection = z.infer<typeof OutputSectionSchema>;
export type OutputConfig = z.infer<typeof OutputConfigSchema>;
export type ToolDraftCreate = z.infer<typeof ToolDraftCreateSchema>;
export type ToolDraftUpdate = z.infer<typeof ToolDraftUpdateSchema>;
export type ToolDraft = z.infer<typeof ToolDraftSchema>;

// Helper functions for migration
export function migrateStringArrayToOptions(options: string[]): FormFieldOption[] {
  return options.map(option => ({
    label: option,
    value: option.toLowerCase().replace(/\s+/g, '_')
  }));
}

export function migrateOptionsToStringArray(options: FormFieldOption[]): string[] {
  return options.map(option => option.label);
}

export function createDefaultOutputConfig(): OutputConfig {
  return {
    format: 'text',
    sections: [
      {
        id: 'default_result',
        type: 'text',
        title: 'Result',
        content: '{{result}}',
        visible: true,
      }
    ]
  };
}