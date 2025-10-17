import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import {
  X,
  Plug,
  Clock,
  Webhook,
  Play,
  Info,
  Copy,
  RefreshCw,
  Calendar,
  Zap,
  Mail,
  MessageSquare,
  Database,
  Globe,
  FileText,
  Bell,
  Plus,
  Trash2,
  GripVertical,
  ToggleLeft,
  TestTube,
  Check,
  AlertCircle,
  Filter,
  ArrowUpDown,
  Calculator,
  FileType,
  Key,
  Lock,
  User,
  Brain,
  Repeat,
  SkipForward,
  Pause,
  Code,
  Sparkles,
  Settings,
  Wrench,
} from "lucide-react";
import { Node } from "reactflow";
import { useToast } from "@/hooks/use-toast";

interface IntegrationConnection {
  id: string;
  provider: string;
  providerAccountId: string;
  authType: string;
  isActive: boolean;
  createdAt: string;
}

interface NodeConfigPanelProps {
  selectedNode: Node | null;
  onClose: () => void;
  onUpdate: (nodeId: string, updates: any) => void;
  onDelete?: (nodeId: string) => void;
}

const PROVIDER_LABELS: Record<string, string> = {
  gmail: "Gmail",
  google_calendar: "Google Calendar",
  spotify: "Spotify",
  openweather: "OpenWeather",
  twilio: "Twilio",
  github: "GitHub",
};

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Dubai",
  "Australia/Sydney",
  "UTC",
];

const triggerConfigSchema = z.object({
  triggerType: z.enum(["manual", "schedule", "webhook"], {
    required_error: "Trigger type is required",
  }),
  enabled: z.boolean().default(true),
  description: z.string().optional(),
  timeout: z.number().min(10).max(300).default(60),
  maxRetries: z.number().min(0).max(5).default(3),
  retryDelay: z.number().min(1).max(60).default(5),
  scheduleInterval: z
    .enum(["hourly", "daily", "weekly", "monthly", "custom"])
    .optional(),
  cronExpression: z.string().optional(),
  timezone: z.string().default("America/New_York"),
  webhookUrl: z.string().optional(),
  webhookSecret: z.string().optional(),
  hmacVerification: z.boolean().default(true),
});

type TriggerConfigFormData = z.infer<typeof triggerConfigSchema>;

const actionConfigSchema = z.object({
  actionType: z.enum(
    [
      "send_email",
      "send_sms",
      "create_record",
      "update_record",
      "http_request",
      "run_script",
      "notification",
      "file_operation",
    ],
    {
      required_error: "Action type is required",
    }
  ),
  emailTo: z.string().optional(),
  emailCc: z.string().optional(),
  emailBcc: z.string().optional(),
  emailSubject: z.string().optional(),
  emailBody: z.string().optional(),
  emailAttachments: z.boolean().default(false),
  smsTo: z.string().optional(),
  smsFrom: z.string().optional(),
  smsBody: z.string().optional(),
  httpUrl: z.string().optional(),
  httpMethod: z.enum(["GET", "POST", "PUT", "DELETE", "PATCH"]).default("GET"),
  httpHeaders: z
    .array(z.object({ key: z.string(), value: z.string() }))
    .default([]),
  httpBody: z.string().optional(),
  httpBodyType: z.enum(["json", "form", "raw"]).default("json"),
  dbTable: z.string().optional(),
  dbData: z.string().optional(),
  dbRecordId: z.string().optional(),
  scriptCode: z.string().optional(),
  notificationTitle: z.string().optional(),
  notificationMessage: z.string().optional(),
  fileOperation: z.enum(["read", "write", "delete", "copy"]).optional(),
  filePath: z.string().optional(),
  fileContent: z.string().optional(),
  outputVariable: z.string().optional(),
  outputPath: z.string().optional(),
  outputFormat: z.enum(["json", "text", "number", "boolean"]).default("json"),
  storeFullResponse: z.boolean().default(false),
  continueOnError: z.boolean().default(false),
  fallbackValue: z.string().optional(),
  errorNotification: z.boolean().default(true),
  maxRetries: z.number().min(0).max(5).default(3),
  description: z.string().optional(),
  timeout: z.number().min(5).max(300).default(60),
  runConditionally: z.boolean().default(false),
  conditionExpression: z.string().optional(),
});

type ActionConfigFormData = z.infer<typeof actionConfigSchema>;

const conditionSchema = z.object({
  id: z.string(),
  leftOperand: z.string(),
  operator: z.string(),
  rightOperand: z.string().optional(),
  type: z.enum(["number", "string", "boolean", "existence"]).default("string"),
});

const conditionConfigSchema = z.object({
  conditions: z.array(conditionSchema).default([]),
  logicOperator: z.enum(["AND", "OR"]).default("AND"),
  caseSensitive: z.boolean().default(true),
  trimWhitespace: z.boolean().default(true),
  typeCoercion: z.boolean().default(false),
  negateGroup: z.boolean().default(false),
  trueLabel: z.string().default("True"),
  falseLabel: z.string().default("False"),
  storeResult: z.boolean().default(false),
  resultVariable: z.string().optional(),
  description: z.string().optional(),
});

type ConditionConfigFormData = z.infer<typeof conditionConfigSchema>;
type Condition = z.infer<typeof conditionSchema>;

const fieldMappingSchema = z.object({
  id: z.string(),
  sourceField: z.string(),
  targetField: z.string(),
  transform: z
    .enum([
      "none",
      "uppercase",
      "lowercase",
      "trim",
      "number",
      "date",
      "custom",
    ])
    .default("none"),
  customTransform: z.string().optional(),
});

const transformConfigSchema = z.object({
  transformType: z.enum(
    [
      "map_fields",
      "filter_array",
      "sort_array",
      "aggregate",
      "format",
      "parse",
    ],
    {
      required_error: "Transform type is required",
    }
  ),
  fieldMappings: z.array(fieldMappingSchema).default([]),
  filterExpression: z.string().optional(),
  sortField: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
  aggregateFunction: z.enum(["sum", "avg", "count", "min", "max"]).optional(),
  aggregateField: z.string().optional(),
  formatType: z.enum(["date", "number", "string"]).optional(),
  formatPattern: z.string().optional(),
  parseType: z.enum(["json", "csv", "xml"]).optional(),
  sourceData: z.string().optional(),
  templateMode: z.boolean().default(false),
  template: z.string().optional(),
  sampleInput: z.string().optional(),
  description: z.string().optional(),
  timeout: z.number().min(5).max(300).default(60),
});

type TransformConfigFormData = z.infer<typeof transformConfigSchema>;
type FieldMapping = z.infer<typeof fieldMappingSchema>;

const apiConfigSchema = z.object({
  httpMethod: z
    .enum(["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"])
    .default("GET"),
  url: z.string(),
  urlScheme: z.string().default("https"),
  urlHost: z.string().optional(),
  urlPath: z.string().optional(),
  headers: z
    .array(z.object({ key: z.string(), value: z.string() }))
    .default([]),
  bodyType: z.enum(["none", "json", "form", "raw", "binary"]).default("none"),
  body: z.string().optional(),
  authType: z
    .enum(["none", "api_key", "bearer", "basic", "oauth2"])
    .default("none"),
  apiKeyHeader: z.string().optional(),
  apiKeyValue: z.string().optional(),
  bearerToken: z.string().optional(),
  basicUsername: z.string().optional(),
  basicPassword: z.string().optional(),
  expectedStatusCode: z.string().default("200-299"),
  responsePath: z.string().optional(),
  storeFullResponse: z.boolean().default(false),
  retryOnFailure: z.boolean().default(true),
  maxRetries: z.number().min(0).max(5).default(3),
  fallbackValue: z.string().optional(),
  description: z.string().optional(),
  timeout: z.number().min(5).max(300).default(60),
});

type ApiConfigFormData = z.infer<typeof apiConfigSchema>;

const aiConfigSchema = z.object({
  provider: z.enum(["openai", "anthropic", "google", "custom"], {
    required_error: "AI provider is required",
  }),
  model: z.string(),
  systemPrompt: z.string().optional(),
  userPrompt: z.string(),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().min(1).max(4000).default(1000),
  topP: z.number().min(0).max(1).default(1),
  frequencyPenalty: z.number().min(-2).max(2).default(0),
  presencePenalty: z.number().min(-2).max(2).default(0),
  stopSequences: z.string().optional(),
  jsonMode: z.boolean().default(false),
  jsonSchema: z.string().optional(),
  outputPath: z.string().optional(),
  storeFullResponse: z.boolean().default(false),
  customEndpoint: z.string().optional(),
  promptTemplate: z.string().optional(),
  description: z.string().optional(),
  timeout: z.number().min(5).max(300).default(60),
});

type AiConfigFormData = z.infer<typeof aiConfigSchema>;

const loopConfigSchema = z.object({
  loopType: z.enum(["for_each", "while", "count", "until"], {
    required_error: "Loop type is required",
  }),
  sourceVariable: z.string().optional(),
  itemVariable: z.string().default("item"),
  indexVariable: z.string().optional(),
  maxIterations: z.number().min(1).max(1000).default(100),
  parallelExecution: z.boolean().default(false),
  batchSize: z.number().min(1).max(10).default(1),
  delayMs: z.number().min(0).max(60000).default(0),
  breakCondition: z.string().optional(),
  continueOnError: z.boolean().default(false),
  collectOutputs: z.boolean().default(true),
  iteratorVariable: z.string().optional(),
  startValue: z.number().optional(),
  endValue: z.number().optional(),
  stepValue: z.number().default(1),
  whileCondition: z.string().optional(),
  description: z.string().optional(),
  timeout: z.number().min(5).max(600).default(300),
});

type LoopConfigFormData = z.infer<typeof loopConfigSchema>;

const toolConfigSchema = z.object({
  toolId: z.string().optional(),
  inputMappings: z.array(z.object({
    fieldId: z.string(),
    value: z.union([
      z.string(),
      z.object({
        fromNode: z.string(),
        fieldName: z.string(),
      }),
    ]),
  })).default([]),
  description: z.string().optional(),
});

type ToolConfigFormData = z.infer<typeof toolConfigSchema>;

const OPERATORS_BY_TYPE = {
  number: [
    { value: "equals", label: "=" },
    { value: "not_equals", label: "!=" },
    { value: "greater_than", label: ">" },
    { value: "less_than", label: "<" },
    { value: "greater_or_equal", label: ">=" },
    { value: "less_or_equal", label: "<=" },
  ],
  string: [
    { value: "equals", label: "equals" },
    { value: "not_equals", label: "not equals" },
    { value: "contains", label: "contains" },
    { value: "not_contains", label: "not contains" },
    { value: "starts_with", label: "starts with" },
    { value: "ends_with", label: "ends with" },
    { value: "is_empty", label: "is empty" },
    { value: "is_not_empty", label: "is not empty" },
  ],
  boolean: [
    { value: "is_true", label: "is true" },
    { value: "is_false", label: "is false" },
  ],
  existence: [
    { value: "exists", label: "exists" },
    { value: "not_exists", label: "does not exist" },
  ],
};

const ACTION_TYPES = [
  { value: "send_email", label: "Send Email", icon: Mail },
  { value: "send_sms", label: "Send SMS/Text", icon: MessageSquare },
  { value: "create_record", label: "Create Record", icon: Database },
  { value: "update_record", label: "Update Record", icon: Database },
  { value: "http_request", label: "HTTP Request", icon: Globe },
  { value: "run_script", label: "Run Script", icon: FileText },
  { value: "notification", label: "Notification", icon: Bell },
  { value: "file_operation", label: "File Operation", icon: FileText },
];

const HTTP_METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH"];

const QUICK_INTERVALS = [
  { value: "hourly", label: "Every Hour", cron: "0 * * * *" },
  { value: "daily", label: "Every Day (9 AM)", cron: "0 9 * * *" },
  { value: "weekly", label: "Every Week (Mon 9 AM)", cron: "0 9 * * 1" },
  { value: "monthly", label: "Every Month (1st, 9 AM)", cron: "0 9 1 * *" },
  { value: "custom", label: "Custom Cron", cron: "" },
];

function validateCronExpression(cron: string): boolean {
  if (!cron) return false;
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return false;

  const validPatterns =
    /^(\*|([0-5]?[0-9])|([0-5]?[0-9]-[0-5]?[0-9])|([0-5]?[0-9](,[0-5]?[0-9])+)|(\*\/[0-9]+))$/;
  return parts.every((part, index) => {
    if (index === 2) {
      return /^(\*|([0-2]?[0-9]|3[0-1])|([0-2]?[0-9]|3[0-1])-([0-2]?[0-9]|3[0-1])|(\*\/[0-9]+))$/.test(
        part
      );
    }
    if (index === 3) {
      return /^(\*|(1[0-2]|[1-9])|([1-9]|1[0-2])-([1-9]|1[0-2])|(\*\/[0-9]+))$/.test(
        part
      );
    }
    if (index === 4) {
      return /^(\*|[0-6]|[0-6]-[0-6]|(\*\/[0-9]+))$/.test(part);
    }
    return validPatterns.test(part);
  });
}

function getNextRunTime(cronExpression: string, timezone: string): string {
  if (!validateCronExpression(cronExpression)) {
    return "Invalid cron expression";
  }

  const now = new Date();
  const parts = cronExpression.split(/\s+/);
  const [minute, hour] = parts;

  if (minute === "*" && hour === "*") {
    const next = new Date(now);
    next.setMinutes(now.getMinutes() + 1);
    return next.toLocaleString("en-US", {
      timeZone: timezone,
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  return "Next run: (calculated based on cron)";
}

export default function NodeConfigPanel({
  selectedNode,
  onClose,
  onUpdate,
  onDelete,
}: NodeConfigPanelProps) {
  const { toast } = useToast();
  const { data: connections } = useQuery<IntegrationConnection[]>({
    queryKey: ["/api/integrations/connections"],
    enabled: !!selectedNode,
  });

  const [webhookSecret, setWebhookSecret] = useState(
    selectedNode?.data?.config?.webhookSecret || generateSecret()
  );

  const form = useForm<TriggerConfigFormData>({
    resolver: zodResolver(triggerConfigSchema),
    defaultValues: {
      triggerType: selectedNode?.data?.config?.triggerType || "manual",
      enabled: selectedNode?.data?.config?.enabled ?? true,
      description: selectedNode?.data?.config?.description || "",
      timeout: selectedNode?.data?.config?.timeout || 60,
      maxRetries: selectedNode?.data?.config?.maxRetries || 3,
      retryDelay: selectedNode?.data?.config?.retryDelay || 5,
      scheduleInterval: selectedNode?.data?.config?.scheduleInterval || "daily",
      cronExpression: selectedNode?.data?.config?.cronExpression || "0 9 * * *",
      timezone: selectedNode?.data?.config?.timezone || "America/New_York",
      webhookUrl: selectedNode?.data?.config?.webhookUrl || "",
      webhookSecret: selectedNode?.data?.config?.webhookSecret || webhookSecret,
      hmacVerification: selectedNode?.data?.config?.hmacVerification ?? true,
    },
  });

  const actionForm = useForm<ActionConfigFormData>({
    resolver: zodResolver(actionConfigSchema),
    defaultValues: {
      actionType: selectedNode?.data?.config?.actionType || "send_email",
      emailTo: selectedNode?.data?.config?.emailTo || "",
      emailCc: selectedNode?.data?.config?.emailCc || "",
      emailBcc: selectedNode?.data?.config?.emailBcc || "",
      emailSubject: selectedNode?.data?.config?.emailSubject || "",
      emailBody: selectedNode?.data?.config?.emailBody || "",
      emailAttachments: selectedNode?.data?.config?.emailAttachments ?? false,
      smsTo: selectedNode?.data?.config?.smsTo || "",
      smsFrom: selectedNode?.data?.config?.smsFrom || "",
      smsBody: selectedNode?.data?.config?.smsBody || "",
      httpUrl: selectedNode?.data?.config?.httpUrl || "",
      httpMethod: selectedNode?.data?.config?.httpMethod || "GET",
      httpHeaders: selectedNode?.data?.config?.httpHeaders || [],
      httpBody: selectedNode?.data?.config?.httpBody || "",
      httpBodyType: selectedNode?.data?.config?.httpBodyType || "json",
      dbTable: selectedNode?.data?.config?.dbTable || "",
      dbData: selectedNode?.data?.config?.dbData || "",
      dbRecordId: selectedNode?.data?.config?.dbRecordId || "",
      scriptCode: selectedNode?.data?.config?.scriptCode || "",
      notificationTitle: selectedNode?.data?.config?.notificationTitle || "",
      notificationMessage:
        selectedNode?.data?.config?.notificationMessage || "",
      fileOperation: selectedNode?.data?.config?.fileOperation || "read",
      filePath: selectedNode?.data?.config?.filePath || "",
      fileContent: selectedNode?.data?.config?.fileContent || "",
      outputVariable: selectedNode?.data?.config?.outputVariable || "",
      outputPath: selectedNode?.data?.config?.outputPath || "",
      outputFormat: selectedNode?.data?.config?.outputFormat || "json",
      storeFullResponse: selectedNode?.data?.config?.storeFullResponse ?? false,
      continueOnError: selectedNode?.data?.config?.continueOnError ?? false,
      fallbackValue: selectedNode?.data?.config?.fallbackValue || "",
      errorNotification: selectedNode?.data?.config?.errorNotification ?? true,
      maxRetries: selectedNode?.data?.config?.maxRetries || 3,
      description: selectedNode?.data?.config?.description || "",
      timeout: selectedNode?.data?.config?.timeout || 60,
      runConditionally: selectedNode?.data?.config?.runConditionally ?? false,
      conditionExpression:
        selectedNode?.data?.config?.conditionExpression || "",
    },
  });

  const watchTriggerType = form.watch("triggerType");
  const watchScheduleInterval = form.watch("scheduleInterval");
  const watchCronExpression = form.watch("cronExpression");
  const watchTimezone = form.watch("timezone");

  const watchActionType = actionForm.watch("actionType");
  const watchSmsBody = actionForm.watch("smsBody");
  const watchRunConditionally = actionForm.watch("runConditionally");

  const conditionForm = useForm<ConditionConfigFormData>({
    resolver: zodResolver(conditionConfigSchema),
    defaultValues: {
      conditions: selectedNode?.data?.config?.conditions || [],
      logicOperator: selectedNode?.data?.config?.logicOperator || "AND",
      caseSensitive: selectedNode?.data?.config?.caseSensitive ?? true,
      trimWhitespace: selectedNode?.data?.config?.trimWhitespace ?? true,
      typeCoercion: selectedNode?.data?.config?.typeCoercion ?? false,
      negateGroup: selectedNode?.data?.config?.negateGroup ?? false,
      trueLabel: selectedNode?.data?.config?.trueLabel || "True",
      falseLabel: selectedNode?.data?.config?.falseLabel || "False",
      storeResult: selectedNode?.data?.config?.storeResult ?? false,
      resultVariable: selectedNode?.data?.config?.resultVariable || "",
      description: selectedNode?.data?.config?.description || "",
    },
  });

  const watchConditions = conditionForm.watch("conditions");
  const watchLogicOperator = conditionForm.watch("logicOperator");
  const watchNegateGroup = conditionForm.watch("negateGroup");
  const watchStoreResult = conditionForm.watch("storeResult");

  const [testMode, setTestMode] = useState(false);
  const [testValues, setTestValues] = useState<Record<string, string>>({});
  const [sampleOutput, setSampleOutput] = useState<string>("");

  const transformForm = useForm<TransformConfigFormData>({
    resolver: zodResolver(transformConfigSchema),
    defaultValues: {
      transformType: selectedNode?.data?.config?.transformType || "map_fields",
      fieldMappings: selectedNode?.data?.config?.fieldMappings || [],
      filterExpression: selectedNode?.data?.config?.filterExpression || "",
      sortField: selectedNode?.data?.config?.sortField || "",
      sortOrder: selectedNode?.data?.config?.sortOrder || "asc",
      aggregateFunction: selectedNode?.data?.config?.aggregateFunction || "sum",
      aggregateField: selectedNode?.data?.config?.aggregateField || "",
      formatType: selectedNode?.data?.config?.formatType || "date",
      formatPattern: selectedNode?.data?.config?.formatPattern || "",
      parseType: selectedNode?.data?.config?.parseType || "json",
      sourceData: selectedNode?.data?.config?.sourceData || "",
      templateMode: selectedNode?.data?.config?.templateMode ?? false,
      template: selectedNode?.data?.config?.template || "",
      sampleInput: selectedNode?.data?.config?.sampleInput || "",
      description: selectedNode?.data?.config?.description || "",
      timeout: selectedNode?.data?.config?.timeout || 60,
    },
  });

  const apiForm = useForm<ApiConfigFormData>({
    resolver: zodResolver(apiConfigSchema),
    defaultValues: {
      httpMethod: selectedNode?.data?.config?.httpMethod || "GET",
      url: selectedNode?.data?.config?.url || "",
      urlScheme: selectedNode?.data?.config?.urlScheme || "https",
      urlHost: selectedNode?.data?.config?.urlHost || "",
      urlPath: selectedNode?.data?.config?.urlPath || "",
      headers: selectedNode?.data?.config?.headers || [],
      bodyType: selectedNode?.data?.config?.bodyType || "none",
      body: selectedNode?.data?.config?.body || "",
      authType: selectedNode?.data?.config?.authType || "none",
      apiKeyHeader: selectedNode?.data?.config?.apiKeyHeader || "X-API-Key",
      apiKeyValue: selectedNode?.data?.config?.apiKeyValue || "",
      bearerToken: selectedNode?.data?.config?.bearerToken || "",
      basicUsername: selectedNode?.data?.config?.basicUsername || "",
      basicPassword: selectedNode?.data?.config?.basicPassword || "",
      expectedStatusCode:
        selectedNode?.data?.config?.expectedStatusCode || "200-299",
      responsePath: selectedNode?.data?.config?.responsePath || "",
      storeFullResponse: selectedNode?.data?.config?.storeFullResponse ?? false,
      retryOnFailure: selectedNode?.data?.config?.retryOnFailure ?? true,
      maxRetries: selectedNode?.data?.config?.maxRetries || 3,
      fallbackValue: selectedNode?.data?.config?.fallbackValue || "",
      description: selectedNode?.data?.config?.description || "",
      timeout: selectedNode?.data?.config?.timeout || 60,
    },
  });

  const aiForm = useForm<AiConfigFormData>({
    resolver: zodResolver(aiConfigSchema),
    defaultValues: {
      provider: selectedNode?.data?.config?.provider || "openai",
      model: selectedNode?.data?.config?.model || "gpt-4",
      systemPrompt: selectedNode?.data?.config?.systemPrompt || "",
      userPrompt: selectedNode?.data?.config?.userPrompt || "",
      temperature: selectedNode?.data?.config?.temperature || 0.7,
      maxTokens: selectedNode?.data?.config?.maxTokens || 1000,
      topP: selectedNode?.data?.config?.topP || 1,
      frequencyPenalty: selectedNode?.data?.config?.frequencyPenalty || 0,
      presencePenalty: selectedNode?.data?.config?.presencePenalty || 0,
      stopSequences: selectedNode?.data?.config?.stopSequences || "",
      jsonMode: selectedNode?.data?.config?.jsonMode ?? false,
      jsonSchema: selectedNode?.data?.config?.jsonSchema || "",
      outputPath: selectedNode?.data?.config?.outputPath || "",
      storeFullResponse: selectedNode?.data?.config?.storeFullResponse ?? false,
      customEndpoint: selectedNode?.data?.config?.customEndpoint || "",
      promptTemplate: selectedNode?.data?.config?.promptTemplate || "",
      description: selectedNode?.data?.config?.description || "",
      timeout: selectedNode?.data?.config?.timeout || 60,
    },
  });

  const loopForm = useForm<LoopConfigFormData>({
    resolver: zodResolver(loopConfigSchema),
    defaultValues: {
      loopType: selectedNode?.data?.config?.loopType || "for_each",
      sourceVariable: selectedNode?.data?.config?.sourceVariable || "",
      itemVariable: selectedNode?.data?.config?.itemVariable || "item",
      indexVariable: selectedNode?.data?.config?.indexVariable || "",
      maxIterations: selectedNode?.data?.config?.maxIterations || 100,
      parallelExecution: selectedNode?.data?.config?.parallelExecution ?? false,
      batchSize: selectedNode?.data?.config?.batchSize || 1,
      delayMs: selectedNode?.data?.config?.delayMs || 0,
      breakCondition: selectedNode?.data?.config?.breakCondition || "",
      continueOnError: selectedNode?.data?.config?.continueOnError ?? false,
      collectOutputs: selectedNode?.data?.config?.collectOutputs ?? true,
      iteratorVariable: selectedNode?.data?.config?.iteratorVariable || "i",
      startValue: selectedNode?.data?.config?.startValue || 0,
      endValue: selectedNode?.data?.config?.endValue || 10,
      stepValue: selectedNode?.data?.config?.stepValue || 1,
      whileCondition: selectedNode?.data?.config?.whileCondition || "",
      description: selectedNode?.data?.config?.description || "",
      timeout: selectedNode?.data?.config?.timeout || 300,
    },
  });

  const toolForm = useForm<ToolConfigFormData>({
    resolver: zodResolver(toolConfigSchema),
    defaultValues: {
      toolId: selectedNode?.data?.toolId || "",
      inputMappings: selectedNode?.data?.inputMappings || [],
      description: selectedNode?.data?.description || "",
    },
  });

  const { data: userTools } = useQuery<{ tools: any[] }>({
    queryKey: ["/api/tools/me"],
    enabled: selectedNode?.type === "tool",
  });

  const watchTransformType = transformForm.watch("transformType");
  const watchTemplateMode = transformForm.watch("templateMode");
  const watchFieldMappings = transformForm.watch("fieldMappings");

  const watchApiMethod = apiForm.watch("httpMethod");
  const watchApiBodyType = apiForm.watch("bodyType");
  const watchAuthType = apiForm.watch("authType");
  const watchApiHeaders = apiForm.watch("headers");

  const watchAiProvider = aiForm.watch("provider");
  const watchJsonMode = aiForm.watch("jsonMode");
  const watchUserPrompt = aiForm.watch("userPrompt");
  const watchSystemPrompt = aiForm.watch("systemPrompt");

  const watchLoopType = loopForm.watch("loopType");
  const watchParallelExecution = loopForm.watch("parallelExecution");

  useEffect(() => {
    if (
      selectedNode &&
      watchScheduleInterval &&
      watchScheduleInterval !== "custom"
    ) {
      const interval = QUICK_INTERVALS.find(
        (i) => i.value === watchScheduleInterval
      );
      if (interval && interval.cron) {
        form.setValue("cronExpression", interval.cron);
      }
    }
  }, [watchScheduleInterval, selectedNode, form]);

  useEffect(() => {
    const subscription = form.watch((value) => {
      if (selectedNode && selectedNode.type === "trigger") {
        handleConfigChange(value as TriggerConfigFormData);
      }
    });
    return () => subscription.unsubscribe();
  }, [selectedNode]);

  useEffect(() => {
    const subscription = actionForm.watch((value) => {
      if (selectedNode && selectedNode.type === "action") {
        handleActionConfigChange(value as ActionConfigFormData);
      }
    });
    return () => subscription.unsubscribe();
  }, [selectedNode]);

  useEffect(() => {
    const subscription = conditionForm.watch((value) => {
      if (selectedNode && selectedNode.type === "condition") {
        handleConditionConfigChange(value as ConditionConfigFormData);
      }
    });
    return () => subscription.unsubscribe();
  }, [selectedNode]);

  useEffect(() => {
    const subscription = transformForm.watch((value) => {
      if (selectedNode && selectedNode.type === "transform") {
        handleTransformConfigChange(value as TransformConfigFormData);
      }
    });
    return () => subscription.unsubscribe();
  }, [selectedNode]);

  useEffect(() => {
    const subscription = apiForm.watch((value) => {
      if (selectedNode && selectedNode.type === "api") {
        handleApiConfigChange(value as ApiConfigFormData);
      }
    });
    return () => subscription.unsubscribe();
  }, [selectedNode]);

  useEffect(() => {
    const subscription = aiForm.watch((value) => {
      if (selectedNode && selectedNode.type === "ai") {
        handleAiConfigChange(value as AiConfigFormData);
      }
    });
    return () => subscription.unsubscribe();
  }, [selectedNode]);

  useEffect(() => {
    const subscription = loopForm.watch((value) => {
      if (selectedNode && selectedNode.type === "loop") {
        handleLoopConfigChange(value as LoopConfigFormData);
      }
    });
    return () => subscription.unsubscribe();
  }, [selectedNode]);

  useEffect(() => {
    const subscription = toolForm.watch((value) => {
      if (selectedNode && selectedNode.type === "tool") {
        handleToolConfigChange(value as ToolConfigFormData);
      }
    });
    return () => subscription.unsubscribe();
  }, [selectedNode, userTools]);

  if (!selectedNode) return null;

  function generateSecret(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
      ""
    );
  }

  const handleConfigChange = (config: Partial<TriggerConfigFormData>) => {
    onUpdate(selectedNode.id, {
      ...selectedNode.data,
      config: {
        ...selectedNode.data.config,
        ...config,
      },
    });
  };

  const handleActionConfigChange = (config: Partial<ActionConfigFormData>) => {
    onUpdate(selectedNode.id, {
      ...selectedNode.data,
      config: {
        ...selectedNode.data.config,
        ...config,
      },
    });
  };

  const handleConditionConfigChange = (
    config: Partial<ConditionConfigFormData>
  ) => {
    onUpdate(selectedNode.id, {
      ...selectedNode.data,
      config: {
        ...selectedNode.data.config,
        ...config,
      },
    });
  };

  const handleTransformConfigChange = (
    config: Partial<TransformConfigFormData>
  ) => {
    onUpdate(selectedNode.id, {
      ...selectedNode.data,
      config: {
        ...selectedNode.data.config,
        ...config,
      },
    });
  };

  const handleApiConfigChange = (config: Partial<ApiConfigFormData>) => {
    onUpdate(selectedNode.id, {
      ...selectedNode.data,
      config: {
        ...selectedNode.data.config,
        ...config,
      },
    });
  };

  const handleAiConfigChange = (config: Partial<AiConfigFormData>) => {
    onUpdate(selectedNode.id, {
      ...selectedNode.data,
      config: {
        ...selectedNode.data.config,
        ...config,
      },
    });
  };

  const handleLoopConfigChange = (config: Partial<LoopConfigFormData>) => {
    onUpdate(selectedNode.id, {
      ...selectedNode.data,
      config: {
        ...selectedNode.data.config,
        ...config,
      },
    });
  };

  const handleToolConfigChange = (config: Partial<ToolConfigFormData>) => {
    const selectedTool = userTools?.tools.find(t => t.id === config.toolId);
    onUpdate(selectedNode.id, {
      ...selectedNode.data,
      toolId: config.toolId,
      toolName: selectedTool?.title,
      toolCategory: selectedTool?.category,
      inputMappings: config.inputMappings || [],
      description: config.description,
    });
  };

  const addCondition = () => {
    const newCondition: Condition = {
      id: `cond-${Date.now()}`,
      leftOperand: "",
      operator: "equals",
      rightOperand: "",
      type: "string",
    };
    const conditions = conditionForm.getValues("conditions");
    conditionForm.setValue("conditions", [...conditions, newCondition]);
  };

  const removeCondition = (id: string) => {
    const conditions = conditionForm.getValues("conditions");
    conditionForm.setValue(
      "conditions",
      conditions.filter((c) => c.id !== id)
    );
  };

  const updateCondition = (id: string, updates: Partial<Condition>) => {
    const conditions = conditionForm.getValues("conditions");
    const index = conditions.findIndex((c) => c.id === id);
    if (index !== -1) {
      conditions[index] = { ...conditions[index], ...updates };
      conditionForm.setValue("conditions", [...conditions]);
    }
  };

  const addFieldMapping = () => {
    const newMapping: FieldMapping = {
      id: `mapping-${Date.now()}`,
      sourceField: "",
      targetField: "",
      transform: "none",
      customTransform: "",
    };
    const mappings = transformForm.getValues("fieldMappings");
    transformForm.setValue("fieldMappings", [...mappings, newMapping]);
  };

  const removeFieldMapping = (id: string) => {
    const mappings = transformForm.getValues("fieldMappings");
    transformForm.setValue(
      "fieldMappings",
      mappings.filter((m) => m.id !== id)
    );
  };

  const updateFieldMapping = (id: string, updates: Partial<FieldMapping>) => {
    const mappings = transformForm.getValues("fieldMappings");
    const index = mappings.findIndex((m) => m.id === id);
    if (index !== -1) {
      mappings[index] = { ...mappings[index], ...updates };
      transformForm.setValue("fieldMappings", [...mappings]);
    }
  };

  const previewTransform = () => {
    const sampleInput = transformForm.getValues("sampleInput");
    if (!sampleInput) {
      toast({
        title: "No Input",
        description: "Please provide sample input data to preview",
        variant: "destructive",
      });
      return;
    }

    try {
      JSON.parse(sampleInput);
      setSampleOutput("Preview: Transformation would be applied here");
      toast({
        title: "Preview Generated",
        description: "Check the output preview below",
      });
    } catch (e) {
      toast({
        title: "Invalid JSON",
        description: "Sample input must be valid JSON",
        variant: "destructive",
      });
    }
  };

  const generateConditionSummary = (): string => {
    const conditions = watchConditions || [];
    if (conditions.length === 0) return "No conditions set";

    const parts = conditions.map((cond) => {
      const left = cond.leftOperand || "[operand]";
      const op =
        OPERATORS_BY_TYPE[cond.type as keyof typeof OPERATORS_BY_TYPE]?.find(
          (o) => o.value === cond.operator
        )?.label || cond.operator;
      const right =
        cond.rightOperand ||
        (cond.operator === "is_empty" ||
        cond.operator === "is_not_empty" ||
        cond.operator === "exists" ||
        cond.operator === "not_exists" ||
        cond.operator === "is_true" ||
        cond.operator === "is_false"
          ? ""
          : "[value]");
      return `${left} ${op}${right ? " " + right : ""}`;
    });

    const logic = watchLogicOperator || "AND";
    const joined = parts.join(` ${logic} `);
    const negated = watchNegateGroup ? "NOT (" : "";
    const closeParen = watchNegateGroup ? ")" : "";

    return `If ${negated}${joined}${closeParen}`;
  };

  const isConditionValid = (cond: Condition): boolean => {
    if (!cond.leftOperand) return false;
    if (!cond.operator) return false;
    const noRightOperandNeeded = [
      "is_empty",
      "is_not_empty",
      "exists",
      "not_exists",
      "is_true",
      "is_false",
    ];
    if (!noRightOperandNeeded.includes(cond.operator) && !cond.rightOperand)
      return false;
    return true;
  };

  const handleLabelChange = (value: string) => {
    onUpdate(selectedNode.id, { ...selectedNode.data, label: value });
  };

  const handleIntegrationChange = (integrationId: string) => {
    const connection = connections?.find((c) => c.id === integrationId);
    onUpdate(selectedNode.id, {
      ...selectedNode.data,
      integrationId,
      integrationProvider: connection?.provider,
    });
  };

  const regenerateSecret = () => {
    const newSecret = generateSecret();
    setWebhookSecret(newSecret);
    form.setValue("webhookSecret", newSecret);
    toast({
      title: "Secret Regenerated",
      description: "New webhook secret has been generated",
    });
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  const nodeSupportsIntegrations = ["action", "api", "trigger"].includes(
    selectedNode.type || ""
  );

  const getWebhookUrl = () => {
    if (typeof window !== "undefined") {
      const baseUrl = window.location.origin;
      return `${baseUrl}/api/webhooks/${selectedNode.id}`;
    }
    return "";
  };

  const cronValid = validateCronExpression(watchCronExpression || "");

  return (
    <Card className="w-80 m-4 ml-0 flex-shrink-0 h-fit max-h-[calc(100vh-2rem)] overflow-y-auto">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-lg">Node Configuration</CardTitle>
          <div className="flex items-center gap-1">
            {selectedNode && (
              <Button
                variant="destructive"
                size="icon"
                title="Delete node"
                onClick={() => selectedNode && onDelete?.(selectedNode.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <CardDescription className="capitalize">
          {selectedNode.type} Node
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="node-label">Label</Label>
          <Input
            id="node-label"
            value={selectedNode.data.label || ""}
            onChange={(e) => handleLabelChange(e.target.value)}
            placeholder="Node name"
          />
        </div>

        {nodeSupportsIntegrations && (
          <div className="space-y-2">
            <Label
              htmlFor="node-integration"
              className="flex items-center gap-2"
            >
              <Plug className="h-4 w-4" />
              Integration
            </Label>
            {connections && connections.length > 0 ? (
              <Select
                value={selectedNode.data.integrationId || ""}
                onValueChange={handleIntegrationChange}
              >
                <SelectTrigger id="node-integration">
                  <SelectValue placeholder="Select an integration..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="None">None</SelectItem>
                  {connections.map((connection) => (
                    <SelectItem key={connection.id} value={connection.id}>
                      <div className="flex items-center gap-2">
                        <span>
                          {PROVIDER_LABELS[connection.provider] ||
                            connection.provider}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({connection.providerAccountId})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="space-y-2">
                <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-200 rounded-md">
                  <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm space-y-1">
                    <p className="font-medium text-amber-900 dark:text-amber-100">
                      Integration Required
                    </p>
                    <p className="text-amber-800 dark:text-amber-200">
                      This node requires an integration to function properly. Connect your account to get started.
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => window.open('/integrations', '_blank')}
                >
                  <Plug className="h-4 w-4 mr-2" />
                  Connect Integration
                </Button>
              </div>
            )}
            {selectedNode.data.integrationId && (
              <div className="text-xs text-muted-foreground">
                Selected:{" "}
                {PROVIDER_LABELS[selectedNode.data.integrationProvider] ||
                  selectedNode.data.integrationProvider}
              </div>
            )}
          </div>
        )}

        {selectedNode.type === "trigger" && (
          <>
            <Separator className="my-4" />

            <div className="space-y-4">
              <div className="space-y-2">
                <Label
                  htmlFor="trigger-type"
                  className="flex items-center gap-2"
                >
                  <Zap className="h-4 w-4" />
                  Trigger Type
                </Label>
                <Select
                  value={form.watch("triggerType")}
                  onValueChange={(value: any) =>
                    form.setValue("triggerType", value)
                  }
                >
                  <SelectTrigger id="trigger-type">
                    <SelectValue placeholder="Select trigger type..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">
                      <div className="flex items-center gap-2">
                        <Play className="h-4 w-4" />
                        <span>Manual</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="schedule">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>Schedule</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="webhook">
                      <div className="flex items-center gap-2">
                        <Webhook className="h-4 w-4" />
                        <span>Webhook</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {watchTriggerType === "schedule" && (
                <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                  <div className="space-y-2">
                    <Label
                      htmlFor="schedule-interval"
                      className="flex items-center gap-2"
                    >
                      <Calendar className="h-4 w-4" />
                      Schedule Interval
                    </Label>
                    <Select
                      value={form.watch("scheduleInterval")}
                      onValueChange={(value: any) =>
                        form.setValue("scheduleInterval", value)
                      }
                    >
                      <SelectTrigger id="schedule-interval">
                        <SelectValue placeholder="Select interval..." />
                      </SelectTrigger>
                      <SelectContent>
                        {QUICK_INTERVALS.map((interval) => (
                          <SelectItem
                            key={interval.value}
                            value={interval.value}
                          >
                            {interval.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {watchScheduleInterval === "custom" && (
                    <div className="space-y-2">
                      <Label
                        htmlFor="cron-expression"
                        className="flex items-center gap-2"
                      >
                        Cron Expression
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-3 w-3 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">
                                Format: minute hour day month weekday
                              </p>
                              <p className="text-xs">
                                Example: 0 9 * * 1 (Mon at 9 AM)
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </Label>
                      <Input
                        id="cron-expression"
                        {...form.register("cronExpression")}
                        placeholder="0 9 * * *"
                        className={
                          !cronValid && watchCronExpression
                            ? "border-red-500"
                            : ""
                        }
                      />
                      {!cronValid && watchCronExpression && (
                        <p className="text-xs text-red-500">
                          Invalid cron expression (5 fields required)
                        </p>
                      )}
                    </div>
                  )}

                  {watchScheduleInterval !== "custom" && (
                    <div className="text-xs text-muted-foreground bg-background p-2 rounded">
                      Cron: {watchCronExpression}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select
                      value={form.watch("timezone")}
                      onValueChange={(value) =>
                        form.setValue("timezone", value)
                      }
                    >
                      <SelectTrigger id="timezone">
                        <SelectValue placeholder="Select timezone..." />
                      </SelectTrigger>
                      <SelectContent>
                        {TIMEZONES.map((tz) => (
                          <SelectItem key={tz} value={tz}>
                            {tz}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {cronValid && (
                    <div className="p-3 bg-background rounded-md border">
                      <p className="text-xs font-medium mb-1">Next Run</p>
                      <p className="text-xs text-muted-foreground">
                        {getNextRunTime(
                          watchCronExpression || "",
                          watchTimezone || "America/New_York"
                        )}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {watchTriggerType === "webhook" && (
                <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                  <div className="space-y-2">
                    <Label htmlFor="webhook-url">Webhook URL</Label>
                    <div className="flex gap-2">
                      <Input
                        id="webhook-url"
                        value={getWebhookUrl()}
                        readOnly
                        className="font-mono text-xs"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() =>
                          copyToClipboard(getWebhookUrl(), "Webhook URL")
                        }
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="webhook-secret"
                      className="flex items-center gap-2"
                    >
                      Webhook Secret
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3 w-3 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">
                              Use this to verify webhook requests
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="webhook-secret"
                        value={webhookSecret}
                        readOnly
                        type="password"
                        className="font-mono text-xs"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() =>
                          copyToClipboard(webhookSecret, "Webhook Secret")
                        }
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={regenerateSecret}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="hmac-verification" className="text-sm">
                        HMAC Signature Verification
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Verify requests with HMAC-SHA256
                      </p>
                    </div>
                    <Switch
                      id="hmac-verification"
                      checked={form.watch("hmacVerification")}
                      onCheckedChange={(checked) =>
                        form.setValue("hmacVerification", checked)
                      }
                    />
                  </div>

                  <div className="pt-2">
                    <a
                      href={`/workflows/webhook-logs/${selectedNode.id}`}
                      className="text-sm text-primary hover:underline flex items-center gap-1"
                    >
                      View Request Logs
                      <span className="text-xs">→</span>
                    </a>
                  </div>
                </div>
              )}

              <Separator className="my-4" />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Common Settings</h4>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="enabled" className="text-sm">
                      Enable Trigger
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Allow this trigger to execute
                    </p>
                  </div>
                  <Switch
                    id="enabled"
                    checked={form.watch("enabled")}
                    onCheckedChange={(checked) =>
                      form.setValue("enabled", checked)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timeout" className="flex items-center gap-2">
                    Timeout (seconds)
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3 w-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">10-300 seconds</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                  <Input
                    id="timeout"
                    type="number"
                    min={10}
                    max={300}
                    {...form.register("timeout", { valueAsNumber: true })}
                  />
                  {form.formState.errors.timeout && (
                    <p className="text-xs text-red-500">
                      {form.formState.errors.timeout.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="max-retries"
                    className="flex items-center gap-2"
                  >
                    Max Retries
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3 w-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">0-5 retries on failure</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                  <Input
                    id="max-retries"
                    type="number"
                    min={0}
                    max={5}
                    {...form.register("maxRetries", { valueAsNumber: true })}
                  />
                  {form.formState.errors.maxRetries && (
                    <p className="text-xs text-red-500">
                      {form.formState.errors.maxRetries.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="retry-delay"
                    className="flex items-center gap-2"
                  >
                    Retry Delay (seconds)
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3 w-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">
                            1-60 seconds between retries
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                  <Input
                    id="retry-delay"
                    type="number"
                    min={1}
                    max={60}
                    {...form.register("retryDelay", { valueAsNumber: true })}
                  />
                  {form.formState.errors.retryDelay && (
                    <p className="text-xs text-red-500">
                      {form.formState.errors.retryDelay.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    {...form.register("description")}
                    placeholder="Describe what this trigger does..."
                    rows={3}
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {selectedNode.type === "action" && (
          <>
            <Separator className="my-4" />

            <div className="space-y-4">
              <div className="space-y-2">
                <Label
                  htmlFor="action-type"
                  className="flex items-center gap-2"
                >
                  <Zap className="h-4 w-4" />
                  Action Type
                </Label>
                <Select
                  value={actionForm.watch("actionType")}
                  onValueChange={(value: any) =>
                    actionForm.setValue("actionType", value)
                  }
                >
                  <SelectTrigger id="action-type">
                    <SelectValue placeholder="Select action type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTION_TYPES.map((actionType) => {
                      const Icon = actionType.icon;
                      return (
                        <SelectItem
                          key={actionType.value}
                          value={actionType.value}
                        >
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            <span>{actionType.label}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {watchActionType === "send_email" && (
                <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email Configuration
                  </h4>

                  <div className="space-y-2">
                    <Label htmlFor="email-to">
                      To <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="email-to"
                      {...actionForm.register("emailTo")}
                      placeholder="recipient@example.com, other@example.com"
                    />
                    <p className="text-xs text-muted-foreground">
                      Comma-separated email addresses. Use {"{{"} variables{" "}
                      {"}}"} for dynamic values.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email-cc">CC</Label>
                    <Input
                      id="email-cc"
                      {...actionForm.register("emailCc")}
                      placeholder="cc@example.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email-bcc">BCC</Label>
                    <Input
                      id="email-bcc"
                      {...actionForm.register("emailBcc")}
                      placeholder="bcc@example.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email-subject">
                      Subject <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="email-subject"
                      {...actionForm.register("emailSubject")}
                      placeholder="Email subject line"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email-body">
                      Body <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      id="email-body"
                      {...actionForm.register("emailBody")}
                      placeholder="Email body content. Use {{variableName}} for dynamic values."
                      rows={6}
                    />
                    <p className="text-xs text-muted-foreground">
                      Supports HTML and variable substitution
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="email-attachments" className="text-sm">
                        Enable Attachments
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Allow file attachments
                      </p>
                    </div>
                    <Switch
                      id="email-attachments"
                      checked={actionForm.watch("emailAttachments")}
                      onCheckedChange={(checked) =>
                        actionForm.setValue("emailAttachments", checked)
                      }
                    />
                  </div>
                </div>
              )}

              {watchActionType === "send_sms" && (
                <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    SMS Configuration
                  </h4>

                  <div className="space-y-2">
                    <Label htmlFor="sms-to">
                      To Phone Number <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="sms-to"
                      {...actionForm.register("smsTo")}
                      placeholder="+1234567890"
                    />
                    <p className="text-xs text-muted-foreground">
                      E.164 format (e.g., +1234567890)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sms-from">From Phone Number</Label>
                    <Input
                      id="sms-from"
                      {...actionForm.register("smsFrom")}
                      placeholder="Auto-filled from integration"
                      disabled={!!selectedNode.data.integrationId}
                    />
                    {selectedNode.data.integrationId && (
                      <p className="text-xs text-muted-foreground">
                        Using number from Twilio connection
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sms-body">
                      Message <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      id="sms-body"
                      {...actionForm.register("smsBody")}
                      placeholder="Your SMS message"
                      rows={4}
                      maxLength={160}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>
                        Use {"{{"} variables {"}}"} for dynamic values
                      </span>
                      <span>{watchSmsBody?.length || 0}/160</span>
                    </div>
                  </div>
                </div>
              )}

              {(watchActionType === "create_record" ||
                watchActionType === "update_record") && (
                <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    Database Configuration
                  </h4>

                  <div className="space-y-2">
                    <Label htmlFor="db-table">
                      Table Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="db-table"
                      {...actionForm.register("dbTable")}
                      placeholder="users"
                    />
                  </div>

                  {watchActionType === "update_record" && (
                    <div className="space-y-2">
                      <Label htmlFor="db-record-id">
                        Record ID <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="db-record-id"
                        {...actionForm.register("dbRecordId")}
                        placeholder="{{trigger.userId}}"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="db-data">
                      Data (JSON) <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      id="db-data"
                      {...actionForm.register("dbData")}
                      placeholder='{"name": "{{trigger.name}}", "email": "{{trigger.email}}"}'
                      rows={6}
                      className="font-mono text-xs"
                    />
                    <p className="text-xs text-muted-foreground">
                      JSON object with field values
                    </p>
                  </div>
                </div>
              )}

              {watchActionType === "http_request" && (
                <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    HTTP Request Configuration
                  </h4>

                  <div className="space-y-2">
                    <Label htmlFor="http-url">
                      URL <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="http-url"
                      {...actionForm.register("httpUrl")}
                      placeholder="https://api.example.com/endpoint"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="http-method">Method</Label>
                    <Select
                      value={actionForm.watch("httpMethod")}
                      onValueChange={(value: any) =>
                        actionForm.setValue("httpMethod", value)
                      }
                    >
                      <SelectTrigger id="http-method">
                        <SelectValue placeholder="Select method..." />
                      </SelectTrigger>
                      <SelectContent>
                        {HTTP_METHODS.map((method) => (
                          <SelectItem key={method} value={method}>
                            {method}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Headers</Label>
                    {actionForm.watch("httpHeaders")?.map((header, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          placeholder="Key"
                          value={header.key}
                          onChange={(e) => {
                            const headers = actionForm.watch("httpHeaders");
                            headers[index].key = e.target.value;
                            actionForm.setValue("httpHeaders", [...headers]);
                          }}
                        />
                        <Input
                          placeholder="Value"
                          value={header.value}
                          onChange={(e) => {
                            const headers = actionForm.watch("httpHeaders");
                            headers[index].value = e.target.value;
                            actionForm.setValue("httpHeaders", [...headers]);
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            const headers = actionForm.watch("httpHeaders");
                            headers.splice(index, 1);
                            actionForm.setValue("httpHeaders", [...headers]);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const headers = actionForm.watch("httpHeaders") || [];
                        actionForm.setValue("httpHeaders", [
                          ...headers,
                          { key: "", value: "" },
                        ]);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Header
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="http-body-type">Body Type</Label>
                    <Select
                      value={actionForm.watch("httpBodyType")}
                      onValueChange={(value: any) =>
                        actionForm.setValue("httpBodyType", value)
                      }
                    >
                      <SelectTrigger id="http-body-type">
                        <SelectValue placeholder="Select type..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="json">JSON</SelectItem>
                        <SelectItem value="form">Form Data</SelectItem>
                        <SelectItem value="raw">Raw</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="http-body">Body</Label>
                    <Textarea
                      id="http-body"
                      {...actionForm.register("httpBody")}
                      placeholder={
                        actionForm.watch("httpBodyType") === "json"
                          ? '{"key": "value"}'
                          : "Request body"
                      }
                      rows={6}
                      className="font-mono text-xs"
                    />
                  </div>
                </div>
              )}

              {watchActionType === "run_script" && (
                <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Script Configuration
                  </h4>

                  <div className="space-y-2">
                    <Label htmlFor="script-code">
                      JavaScript Code <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      id="script-code"
                      {...actionForm.register("scriptCode")}
                      placeholder="// Your JavaScript code here\nreturn { result: 'value' };"
                      rows={10}
                      className="font-mono text-xs"
                    />
                    <p className="text-xs text-muted-foreground">
                      Code must return a value. Context available via variables.
                    </p>
                  </div>
                </div>
              )}

              {watchActionType === "notification" && (
                <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    Notification Configuration
                  </h4>

                  <div className="space-y-2">
                    <Label htmlFor="notification-title">
                      Title <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="notification-title"
                      {...actionForm.register("notificationTitle")}
                      placeholder="Notification title"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notification-message">
                      Message <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      id="notification-message"
                      {...actionForm.register("notificationMessage")}
                      placeholder="Notification message"
                      rows={4}
                    />
                  </div>
                </div>
              )}

              {watchActionType === "file_operation" && (
                <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    File Operation Configuration
                  </h4>

                  <div className="space-y-2">
                    <Label htmlFor="file-operation">Operation</Label>
                    <Select
                      value={actionForm.watch("fileOperation")}
                      onValueChange={(value: any) =>
                        actionForm.setValue("fileOperation", value)
                      }
                    >
                      <SelectTrigger id="file-operation">
                        <SelectValue placeholder="Select operation..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="read">Read</SelectItem>
                        <SelectItem value="write">Write</SelectItem>
                        <SelectItem value="delete">Delete</SelectItem>
                        <SelectItem value="copy">Copy</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="file-path">
                      File Path <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="file-path"
                      {...actionForm.register("filePath")}
                      placeholder="/path/to/file.txt"
                    />
                  </div>

                  {(actionForm.watch("fileOperation") === "write" ||
                    actionForm.watch("fileOperation") === "copy") && (
                    <div className="space-y-2">
                      <Label htmlFor="file-content">Content</Label>
                      <Textarea
                        id="file-content"
                        {...actionForm.register("fileContent")}
                        placeholder="File content"
                        rows={6}
                      />
                    </div>
                  )}
                </div>
              )}

              <Separator className="my-4" />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Output Mapping</h4>

                <div className="space-y-2">
                  <Label htmlFor="output-variable">Output Variable Name</Label>
                  <Input
                    id="output-variable"
                    {...actionForm.register("outputVariable")}
                    placeholder="myVariable"
                  />
                  <p className="text-xs text-muted-foreground">
                    Alphanumeric and underscores only
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="output-path">Extract Path</Label>
                  <Input
                    id="output-path"
                    {...actionForm.register("outputPath")}
                    placeholder="data.result.id"
                  />
                  <p className="text-xs text-muted-foreground">
                    Path to extract from response (e.g., data.result.id)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="output-format">Output Format</Label>
                  <Select
                    value={actionForm.watch("outputFormat")}
                    onValueChange={(value: any) =>
                      actionForm.setValue("outputFormat", value)
                    }
                  >
                    <SelectTrigger id="output-format">
                      <SelectValue placeholder="Select format..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="json">JSON</SelectItem>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="number">Number</SelectItem>
                      <SelectItem value="boolean">Boolean</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="store-full-response" className="text-sm">
                      Store Full Response
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Save entire response instead of extracted path
                    </p>
                  </div>
                  <Switch
                    id="store-full-response"
                    checked={actionForm.watch("storeFullResponse")}
                    onCheckedChange={(checked) =>
                      actionForm.setValue("storeFullResponse", checked)
                    }
                  />
                </div>
              </div>

              <Separator className="my-4" />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Error Handling</h4>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="continue-on-error" className="text-sm">
                      Continue on Error
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Don't stop workflow if this action fails
                    </p>
                  </div>
                  <Switch
                    id="continue-on-error"
                    checked={actionForm.watch("continueOnError")}
                    onCheckedChange={(checked) =>
                      actionForm.setValue("continueOnError", checked)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fallback-value">Fallback Value</Label>
                  <Input
                    id="fallback-value"
                    {...actionForm.register("fallbackValue")}
                    placeholder="Default value on error"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="error-notification" className="text-sm">
                      Error Notification
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Send notification on error
                    </p>
                  </div>
                  <Switch
                    id="error-notification"
                    checked={actionForm.watch("errorNotification")}
                    onCheckedChange={(checked) =>
                      actionForm.setValue("errorNotification", checked)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="action-max-retries">Max Retry Attempts</Label>
                  <Input
                    id="action-max-retries"
                    type="number"
                    min={0}
                    max={5}
                    {...actionForm.register("maxRetries", {
                      valueAsNumber: true,
                    })}
                  />
                  <p className="text-xs text-muted-foreground">
                    0-5 retry attempts on failure
                  </p>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Common Settings</h4>

                <div className="space-y-2">
                  <Label htmlFor="action-description">Description</Label>
                  <Textarea
                    id="action-description"
                    {...actionForm.register("description")}
                    placeholder="Describe what this action does..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="action-timeout">Timeout (seconds)</Label>
                  <Input
                    id="action-timeout"
                    type="number"
                    min={5}
                    max={300}
                    {...actionForm.register("timeout", { valueAsNumber: true })}
                  />
                  <p className="text-xs text-muted-foreground">5-300 seconds</p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="run-conditionally" className="text-sm">
                      Run Conditionally
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Only run if condition is met
                    </p>
                  </div>
                  <Switch
                    id="run-conditionally"
                    checked={actionForm.watch("runConditionally")}
                    onCheckedChange={(checked) =>
                      actionForm.setValue("runConditionally", checked)
                    }
                  />
                </div>

                {watchRunConditionally && (
                  <div className="space-y-2">
                    <Label htmlFor="condition-expression">
                      Condition Expression
                    </Label>
                    <Input
                      id="condition-expression"
                      {...actionForm.register("conditionExpression")}
                      placeholder="{{trigger.status}} === 'active'"
                    />
                    <p className="text-xs text-muted-foreground">
                      JavaScript expression that evaluates to true/false
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {selectedNode.type === "condition" && (
          <>
            <Separator className="my-4" />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Condition Builder</h4>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addCondition}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Condition
                </Button>
              </div>

              {watchConditions && watchConditions.length > 0 ? (
                <div className="space-y-3">
                  {watchConditions.map((condition, index) => (
                    <div key={condition.id}>
                      <div
                        className={`p-3 border rounded-lg space-y-3 ${!isConditionValid(condition) ? "border-red-500 bg-red-50 dark:bg-red-950/20" : "bg-muted/50"}`}
                      >
                        <div className="flex items-start gap-2">
                          <GripVertical className="h-4 w-4 mt-2 text-muted-foreground cursor-move" />
                          <div className="flex-1 space-y-2">
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">
                                Left Operand
                              </Label>
                              <Input
                                value={condition.leftOperand}
                                onChange={(e) =>
                                  updateCondition(condition.id, {
                                    leftOperand: e.target.value,
                                  })
                                }
                                placeholder="e.g., {{trigger.email}} or age"
                                className="font-mono text-xs"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">
                                  Type
                                </Label>
                                <Select
                                  value={condition.type}
                                  onValueChange={(value: any) => {
                                    updateCondition(condition.id, {
                                      type: value,
                                      operator:
                                        OPERATORS_BY_TYPE[
                                          value as keyof typeof OPERATORS_BY_TYPE
                                        ][0].value,
                                    });
                                  }}
                                >
                                  <SelectTrigger className="h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="string">
                                      String
                                    </SelectItem>
                                    <SelectItem value="number">
                                      Number
                                    </SelectItem>
                                    <SelectItem value="boolean">
                                      Boolean
                                    </SelectItem>
                                    <SelectItem value="existence">
                                      Existence
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">
                                  Operator
                                </Label>
                                <Select
                                  value={condition.operator}
                                  onValueChange={(value) =>
                                    updateCondition(condition.id, {
                                      operator: value,
                                    })
                                  }
                                >
                                  <SelectTrigger className="h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {OPERATORS_BY_TYPE[
                                      condition.type as keyof typeof OPERATORS_BY_TYPE
                                    ]?.map((op) => (
                                      <SelectItem
                                        key={op.value}
                                        value={op.value}
                                      >
                                        {op.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            {![
                              "is_empty",
                              "is_not_empty",
                              "exists",
                              "not_exists",
                              "is_true",
                              "is_false",
                            ].includes(condition.operator) && (
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">
                                  Right Operand
                                </Label>
                                <Input
                                  value={condition.rightOperand || ""}
                                  onChange={(e) =>
                                    updateCondition(condition.id, {
                                      rightOperand: e.target.value,
                                    })
                                  }
                                  placeholder="e.g., @gmail.com or 18"
                                  className="font-mono text-xs"
                                />
                              </div>
                            )}

                            {!isConditionValid(condition) && (
                              <div className="flex items-center gap-1 text-xs text-red-600">
                                <AlertCircle className="h-3 w-3" />
                                <span>Missing required fields</span>
                              </div>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => removeCondition(condition.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {index < watchConditions.length - 1 && (
                        <div className="flex items-center justify-center py-2">
                          <div className="px-3 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">
                            {watchLogicOperator}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-sm text-muted-foreground border-2 border-dashed rounded-lg">
                  No conditions added yet. Click "Add Condition" to start.
                </div>
              )}

              {watchConditions && watchConditions.length > 1 && (
                <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                  <Label className="text-sm flex items-center gap-2">
                    <ToggleLeft className="h-4 w-4" />
                    Logic Operator
                  </Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={
                        watchLogicOperator === "AND" ? "default" : "outline"
                      }
                      size="sm"
                      className="flex-1"
                      onClick={() =>
                        conditionForm.setValue("logicOperator", "AND")
                      }
                    >
                      AND (all must be true)
                    </Button>
                    <Button
                      type="button"
                      variant={
                        watchLogicOperator === "OR" ? "default" : "outline"
                      }
                      size="sm"
                      className="flex-1"
                      onClick={() =>
                        conditionForm.setValue("logicOperator", "OR")
                      }
                    >
                      OR (any can be true)
                    </Button>
                  </div>
                </div>
              )}

              <Separator className="my-4" />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Advanced Options</h4>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="case-sensitive" className="text-sm">
                      Case Sensitive
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      For string comparisons
                    </p>
                  </div>
                  <Switch
                    id="case-sensitive"
                    checked={conditionForm.watch("caseSensitive")}
                    onCheckedChange={(checked) =>
                      conditionForm.setValue("caseSensitive", checked)
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="trim-whitespace" className="text-sm">
                      Trim Whitespace
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Remove leading/trailing spaces
                    </p>
                  </div>
                  <Switch
                    id="trim-whitespace"
                    checked={conditionForm.watch("trimWhitespace")}
                    onCheckedChange={(checked) =>
                      conditionForm.setValue("trimWhitespace", checked)
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="type-coercion" className="text-sm">
                      Type Coercion
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Auto-convert strings to numbers
                    </p>
                  </div>
                  <Switch
                    id="type-coercion"
                    checked={conditionForm.watch("typeCoercion")}
                    onCheckedChange={(checked) =>
                      conditionForm.setValue("typeCoercion", checked)
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="negate-group" className="text-sm">
                      Negate Condition Group (NOT)
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Invert the entire condition result
                    </p>
                  </div>
                  <Switch
                    id="negate-group"
                    checked={conditionForm.watch("negateGroup")}
                    onCheckedChange={(checked) =>
                      conditionForm.setValue("negateGroup", checked)
                    }
                  />
                </div>
              </div>

              <Separator className="my-4" />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Validation & Preview</h4>

                <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                  <p className="text-sm font-medium mb-1">Condition Summary</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {generateConditionSummary()}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Test Mode</Label>
                    <Button
                      type="button"
                      variant={testMode ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTestMode(!testMode)}
                    >
                      <TestTube className="h-4 w-4 mr-2" />
                      {testMode ? "Exit Test" : "Test Conditions"}
                    </Button>
                  </div>

                  {testMode &&
                    watchConditions &&
                    watchConditions.length > 0 && (
                      <div className="p-3 border rounded-lg space-y-2 bg-background">
                        <p className="text-xs font-medium">
                          Enter test values:
                        </p>
                        {watchConditions.map((cond) => (
                          <div key={cond.id} className="space-y-1">
                            <Label className="text-xs text-muted-foreground">
                              {cond.leftOperand || "[operand]"}
                            </Label>
                            <Input
                              value={testValues[cond.leftOperand] || ""}
                              onChange={(e) =>
                                setTestValues({
                                  ...testValues,
                                  [cond.leftOperand]: e.target.value,
                                })
                              }
                              placeholder="Enter test value"
                              className="h-8 text-xs"
                            />
                          </div>
                        ))}
                        <div className="pt-2 flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-600" />
                          <span className="text-xs text-green-600 font-medium">
                            Result: Test evaluation (simulated)
                          </span>
                        </div>
                      </div>
                    )}
                </div>
              </div>

              <Separator className="my-4" />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">
                  Output Path Configuration
                </h4>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="true-label" className="text-xs">
                      True Path Label
                    </Label>
                    <Input
                      id="true-label"
                      {...conditionForm.register("trueLabel")}
                      placeholder="True"
                      className="h-8"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="false-label" className="text-xs">
                      False Path Label
                    </Label>
                    <Input
                      id="false-label"
                      {...conditionForm.register("falseLabel")}
                      placeholder="False"
                      className="h-8"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="store-result" className="text-sm">
                      Store Result in Variable
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Save boolean result for later use
                    </p>
                  </div>
                  <Switch
                    id="store-result"
                    checked={conditionForm.watch("storeResult")}
                    onCheckedChange={(checked) =>
                      conditionForm.setValue("storeResult", checked)
                    }
                  />
                </div>

                {watchStoreResult && (
                  <div className="space-y-1">
                    <Label htmlFor="result-variable" className="text-xs">
                      Variable Name
                    </Label>
                    <Input
                      id="result-variable"
                      {...conditionForm.register("resultVariable")}
                      placeholder="conditionResult"
                      className="h-8 font-mono text-xs"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <Label htmlFor="condition-description" className="text-xs">
                    Description
                  </Label>
                  <Textarea
                    id="condition-description"
                    {...conditionForm.register("description")}
                    placeholder="Describe what this condition checks..."
                    rows={3}
                    className="text-xs"
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {selectedNode.type === "transform" && (
          <>
            <Separator className="my-4" />

            <div className="space-y-4">
              <div className="space-y-2">
                <Label
                  htmlFor="transform-type"
                  className="flex items-center gap-2"
                >
                  <Settings className="h-4 w-4" />
                  Transform Type
                </Label>
                <Select
                  value={transformForm.watch("transformType")}
                  onValueChange={(value: any) =>
                    transformForm.setValue("transformType", value)
                  }
                >
                  <SelectTrigger id="transform-type">
                    <SelectValue placeholder="Select transform type..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="map_fields">
                      <div className="flex items-center gap-2">
                        <Code className="h-4 w-4" />
                        <span>Map Fields</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="filter_array">
                      <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4" />
                        <span>Filter Array</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="sort_array">
                      <div className="flex items-center gap-2">
                        <ArrowUpDown className="h-4 w-4" />
                        <span>Sort Array</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="aggregate">
                      <div className="flex items-center gap-2">
                        <Calculator className="h-4 w-4" />
                        <span>Aggregate</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="format">
                      <div className="flex items-center gap-2">
                        <FileType className="h-4 w-4" />
                        <span>Format</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="parse">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span>Parse</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {watchTransformType === "map_fields" && (
                <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">Field Mapping</h4>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addFieldMapping}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Mapping
                    </Button>
                  </div>

                  {watchFieldMappings && watchFieldMappings.length > 0 ? (
                    <div className="space-y-3">
                      {watchFieldMappings.map((mapping) => (
                        <div
                          key={mapping.id}
                          className="p-3 border rounded-lg space-y-2 bg-background"
                        >
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs">Source Field</Label>
                              <Input
                                value={mapping.sourceField}
                                onChange={(e) =>
                                  updateFieldMapping(mapping.id, {
                                    sourceField: e.target.value,
                                  })
                                }
                                placeholder="{{previous.fieldName}}"
                                className="h-8 text-xs font-mono"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Target Field</Label>
                              <Input
                                value={mapping.targetField}
                                onChange={(e) =>
                                  updateFieldMapping(mapping.id, {
                                    targetField: e.target.value,
                                  })
                                }
                                placeholder="newFieldName"
                                className="h-8 text-xs font-mono"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-xs">
                              Transform Function
                            </Label>
                            <Select
                              value={mapping.transform}
                              onValueChange={(value: any) =>
                                updateFieldMapping(mapping.id, {
                                  transform: value,
                                })
                              }
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                <SelectItem value="uppercase">
                                  Uppercase
                                </SelectItem>
                                <SelectItem value="lowercase">
                                  Lowercase
                                </SelectItem>
                                <SelectItem value="trim">
                                  Trim Whitespace
                                </SelectItem>
                                <SelectItem value="number">
                                  Convert to Number
                                </SelectItem>
                                <SelectItem value="date">
                                  Format Date
                                </SelectItem>
                                <SelectItem value="custom">
                                  Custom Expression
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {mapping.transform === "custom" && (
                            <div className="space-y-1">
                              <Label className="text-xs">
                                Custom Expression
                              </Label>
                              <Input
                                value={mapping.customTransform || ""}
                                onChange={(e) =>
                                  updateFieldMapping(mapping.id, {
                                    customTransform: e.target.value,
                                  })
                                }
                                placeholder="value.toUpperCase().trim()"
                                className="h-8 text-xs font-mono"
                              />
                            </div>
                          )}

                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="w-full"
                            onClick={() => removeFieldMapping(mapping.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remove Mapping
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-sm text-muted-foreground border-2 border-dashed rounded-lg">
                      No field mappings. Click "Add Mapping" to start.
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <Label htmlFor="template-mode" className="text-sm">
                      Template Mode
                    </Label>
                    <Switch
                      id="template-mode"
                      checked={transformForm.watch("templateMode")}
                      onCheckedChange={(checked) =>
                        transformForm.setValue("templateMode", checked)
                      }
                    />
                  </div>

                  {watchTemplateMode && (
                    <div className="space-y-2">
                      <Label htmlFor="template">Template String</Label>
                      <Textarea
                        id="template"
                        {...transformForm.register("template")}
                        placeholder='{"name": "{{firstName}} {{lastName}}", "email": "{{email}}"}'
                        rows={4}
                        className="font-mono text-xs"
                      />
                      <p className="text-xs text-muted-foreground">
                        Complex object templates with variable substitution
                      </p>
                    </div>
                  )}
                </div>
              )}

              {watchTransformType === "filter_array" && (
                <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    Filter Configuration
                  </h4>

                  <div className="space-y-2">
                    <Label htmlFor="filter-expression">Filter Expression</Label>
                    <Textarea
                      id="filter-expression"
                      {...transformForm.register("filterExpression")}
                      placeholder="item.age > 18 && item.status === 'active'"
                      rows={3}
                      className="font-mono text-xs"
                    />
                    <p className="text-xs text-muted-foreground">
                      JavaScript expression. Use 'item' to reference array
                      elements.
                    </p>
                  </div>
                </div>
              )}

              {watchTransformType === "sort_array" && (
                <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <ArrowUpDown className="h-4 w-4" />
                    Sort Configuration
                  </h4>

                  <div className="space-y-2">
                    <Label htmlFor="sort-field">Sort Field</Label>
                    <Input
                      id="sort-field"
                      {...transformForm.register("sortField")}
                      placeholder="createdAt"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sort-order">Sort Order</Label>
                    <Select
                      value={transformForm.watch("sortOrder")}
                      onValueChange={(value: any) =>
                        transformForm.setValue("sortOrder", value)
                      }
                    >
                      <SelectTrigger id="sort-order">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="asc">
                          Ascending (A-Z, 0-9)
                        </SelectItem>
                        <SelectItem value="desc">
                          Descending (Z-A, 9-0)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {watchTransformType === "aggregate" && (
                <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Calculator className="h-4 w-4" />
                    Aggregate Configuration
                  </h4>

                  <div className="space-y-2">
                    <Label htmlFor="aggregate-function">Function</Label>
                    <Select
                      value={transformForm.watch("aggregateFunction")}
                      onValueChange={(value: any) =>
                        transformForm.setValue("aggregateFunction", value)
                      }
                    >
                      <SelectTrigger id="aggregate-function">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sum">Sum</SelectItem>
                        <SelectItem value="avg">Average</SelectItem>
                        <SelectItem value="count">Count</SelectItem>
                        <SelectItem value="min">Minimum</SelectItem>
                        <SelectItem value="max">Maximum</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="aggregate-field">Field to Aggregate</Label>
                    <Input
                      id="aggregate-field"
                      {...transformForm.register("aggregateField")}
                      placeholder="price"
                    />
                  </div>
                </div>
              )}

              {watchTransformType === "format" && (
                <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <FileType className="h-4 w-4" />
                    Format Configuration
                  </h4>

                  <div className="space-y-2">
                    <Label htmlFor="format-type">Format Type</Label>
                    <Select
                      value={transformForm.watch("formatType")}
                      onValueChange={(value: any) =>
                        transformForm.setValue("formatType", value)
                      }
                    >
                      <SelectTrigger id="format-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="date">Date</SelectItem>
                        <SelectItem value="number">Number</SelectItem>
                        <SelectItem value="string">String</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="format-pattern">Format Pattern</Label>
                    <Input
                      id="format-pattern"
                      {...transformForm.register("formatPattern")}
                      placeholder={
                        transformForm.watch("formatType") === "date"
                          ? "YYYY-MM-DD"
                          : transformForm.watch("formatType") === "number"
                            ? "$0,0.00"
                            : "Custom pattern"
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      {transformForm.watch("formatType") === "date" &&
                        "e.g., YYYY-MM-DD, MM/DD/YYYY"}
                      {transformForm.watch("formatType") === "number" &&
                        "e.g., $0,0.00, 0.00%"}
                      {transformForm.watch("formatType") === "string" &&
                        "Custom formatting"}
                    </p>
                  </div>
                </div>
              )}

              {watchTransformType === "parse" && (
                <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Parse Configuration
                  </h4>

                  <div className="space-y-2">
                    <Label htmlFor="parse-type">Parse Type</Label>
                    <Select
                      value={transformForm.watch("parseType")}
                      onValueChange={(value: any) =>
                        transformForm.setValue("parseType", value)
                      }
                    >
                      <SelectTrigger id="parse-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="json">JSON</SelectItem>
                        <SelectItem value="csv">CSV</SelectItem>
                        <SelectItem value="xml">XML</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <Separator className="my-4" />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Data Preview</h4>

                <div className="space-y-2">
                  <Label htmlFor="sample-input">Sample Input (JSON)</Label>
                  <Textarea
                    id="sample-input"
                    {...transformForm.register("sampleInput")}
                    placeholder='{"name": "John", "age": 30}'
                    rows={4}
                    className="font-mono text-xs"
                  />
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={previewTransform}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Preview Output
                </Button>

                {sampleOutput && (
                  <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                    <p className="text-xs font-medium mb-1">Output Preview</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {sampleOutput}
                    </p>
                  </div>
                )}
              </div>

              <Separator className="my-4" />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Transform Templates</h4>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      transformForm.setValue("transformType", "map_fields");
                      transformForm.setValue(
                        "template",
                        '{"email": "{{email}}"}'
                      );
                      transformForm.setValue("templateMode", true);
                    }}
                  >
                    Extract Email
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      transformForm.setValue("transformType", "format");
                      transformForm.setValue("formatType", "number");
                      transformForm.setValue("formatPattern", "$0,0.00");
                    }}
                  >
                    Format Currency
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      transformForm.setValue("transformType", "parse");
                      transformForm.setValue("parseType", "json");
                    }}
                  >
                    Parse JSON
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      transformForm.setValue("transformType", "format");
                      transformForm.setValue("formatType", "date");
                      transformForm.setValue("formatPattern", "YYYY-MM-DD");
                    }}
                  >
                    Format Date
                  </Button>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Common Settings</h4>

                <div className="space-y-2">
                  <Label htmlFor="transform-description">Description</Label>
                  <Textarea
                    id="transform-description"
                    {...transformForm.register("description")}
                    placeholder="Describe what this transformation does..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="transform-timeout">Timeout (seconds)</Label>
                  <Input
                    id="transform-timeout"
                    type="number"
                    min={5}
                    max={300}
                    {...transformForm.register("timeout", {
                      valueAsNumber: true,
                    })}
                  />
                  <p className="text-xs text-muted-foreground">5-300 seconds</p>
                </div>
              </div>
            </div>
          </>
        )}

        {selectedNode.type === "api" && (
          <>
            <Separator className="my-4" />

            <div className="space-y-4">
              <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  HTTP Configuration
                </h4>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-1 space-y-2">
                    <Label htmlFor="http-method">Method</Label>
                    <Select
                      value={apiForm.watch("httpMethod")}
                      onValueChange={(value: any) =>
                        apiForm.setValue("httpMethod", value)
                      }
                    >
                      <SelectTrigger id="http-method">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GET">GET</SelectItem>
                        <SelectItem value="POST">POST</SelectItem>
                        <SelectItem value="PUT">PUT</SelectItem>
                        <SelectItem value="DELETE">DELETE</SelectItem>
                        <SelectItem value="PATCH">PATCH</SelectItem>
                        <SelectItem value="HEAD">HEAD</SelectItem>
                        <SelectItem value="OPTIONS">OPTIONS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="api-url">URL</Label>
                    <Input
                      id="api-url"
                      {...apiForm.register("url")}
                      placeholder="https://api.example.com/endpoint"
                    />
                    <p className="text-xs text-muted-foreground">
                      Supports {`{{variable}}`} substitution
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Headers</h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const headers = apiForm.watch("headers") || [];
                      apiForm.setValue("headers", [
                        ...headers,
                        { key: "", value: "" },
                      ]);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Header
                  </Button>
                </div>

                {watchApiHeaders && watchApiHeaders.length > 0 ? (
                  <div className="space-y-2">
                    {watchApiHeaders.map((header, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          placeholder="Header Key"
                          value={header.key}
                          onChange={(e) => {
                            const headers = apiForm.watch("headers");
                            headers[index].key = e.target.value;
                            apiForm.setValue("headers", [...headers]);
                          }}
                          className="text-xs"
                        />
                        <Input
                          placeholder="Value"
                          value={header.value}
                          onChange={(e) => {
                            const headers = apiForm.watch("headers");
                            headers[index].value = e.target.value;
                            apiForm.setValue("headers", [...headers]);
                          }}
                          className="text-xs"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            const headers = apiForm.watch("headers");
                            headers.splice(index, 1);
                            apiForm.setValue("headers", [...headers]);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 text-center text-xs text-muted-foreground border-2 border-dashed rounded-lg">
                    No custom headers. Click "Add Header" to add.
                  </div>
                )}

                <div className="pt-2">
                  <p className="text-xs font-medium mb-2">Common Headers:</p>
                  <div className="flex flex-wrap gap-1">
                    {[
                      "Content-Type",
                      "Authorization",
                      "Accept",
                      "User-Agent",
                    ].map((name) => (
                      <Button
                        key={name}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => {
                          const headers = apiForm.watch("headers") || [];
                          apiForm.setValue("headers", [
                            ...headers,
                            { key: name, value: "" },
                          ]);
                        }}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        {name}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              {(watchApiMethod === "POST" ||
                watchApiMethod === "PUT" ||
                watchApiMethod === "PATCH") && (
                <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                  <h4 className="text-sm font-medium">Request Body</h4>

                  <div className="space-y-2">
                    <Label htmlFor="body-type">Body Type</Label>
                    <Select
                      value={apiForm.watch("bodyType")}
                      onValueChange={(value: any) =>
                        apiForm.setValue("bodyType", value)
                      }
                    >
                      <SelectTrigger id="body-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="json">JSON</SelectItem>
                        <SelectItem value="form">Form Data</SelectItem>
                        <SelectItem value="raw">Raw</SelectItem>
                        <SelectItem value="binary">Binary</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {watchApiBodyType !== "none" &&
                    watchApiBodyType !== "binary" && (
                      <div className="space-y-2">
                        <Label htmlFor="api-body">Body Content</Label>
                        <Textarea
                          id="api-body"
                          {...apiForm.register("body")}
                          placeholder={
                            watchApiBodyType === "json"
                              ? '{"key": "{{variable}}"}'
                              : "Body content"
                          }
                          rows={6}
                          className="font-mono text-xs"
                        />
                        <p className="text-xs text-muted-foreground">
                          Use {`{{variable}}`} for dynamic values
                        </p>
                      </div>
                    )}
                </div>
              )}

              <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Authentication
                </h4>

                <div className="space-y-2">
                  <Label htmlFor="auth-type">Auth Type</Label>
                  <Select
                    value={apiForm.watch("authType")}
                    onValueChange={(value: any) =>
                      apiForm.setValue("authType", value)
                    }
                  >
                    <SelectTrigger id="auth-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="api_key">API Key</SelectItem>
                      <SelectItem value="bearer">Bearer Token</SelectItem>
                      <SelectItem value="basic">Basic Auth</SelectItem>
                      <SelectItem value="oauth2">
                        OAuth 2.0 (use integration)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {watchAuthType === "api_key" && (
                  <div className="space-y-2">
                    <div className="space-y-2">
                      <Label htmlFor="api-key-header">Header Name</Label>
                      <Input
                        id="api-key-header"
                        {...apiForm.register("apiKeyHeader")}
                        placeholder="X-API-Key"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="api-key-value">API Key</Label>
                      <Input
                        id="api-key-value"
                        {...apiForm.register("apiKeyValue")}
                        type="password"
                        placeholder="Your API key"
                      />
                    </div>
                  </div>
                )}

                {watchAuthType === "bearer" && (
                  <div className="space-y-2">
                    <Label htmlFor="bearer-token">Bearer Token</Label>
                    <Input
                      id="bearer-token"
                      {...apiForm.register("bearerToken")}
                      type="password"
                      placeholder="Your bearer token"
                    />
                  </div>
                )}

                {watchAuthType === "basic" && (
                  <div className="space-y-2">
                    <div className="space-y-2">
                      <Label htmlFor="basic-username">Username</Label>
                      <Input
                        id="basic-username"
                        {...apiForm.register("basicUsername")}
                        placeholder="Username"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="basic-password">Password</Label>
                      <Input
                        id="basic-password"
                        {...apiForm.register("basicPassword")}
                        type="password"
                        placeholder="Password"
                      />
                    </div>
                  </div>
                )}

                {watchAuthType === "oauth2" && (
                  <div className="p-3 bg-background border rounded-lg">
                    <p className="text-xs text-muted-foreground">
                      OAuth 2.0 authentication will use the selected integration
                      connection from the top of this panel.
                    </p>
                  </div>
                )}
              </div>

              <Separator className="my-4" />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Response Handling</h4>

                <div className="space-y-2">
                  <Label htmlFor="expected-status">Expected Status Code</Label>
                  <Input
                    id="expected-status"
                    {...apiForm.register("expectedStatusCode")}
                    placeholder="200-299"
                  />
                  <p className="text-xs text-muted-foreground">
                    e.g., 200, 200-299, 201,204
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="response-path">Extract Path</Label>
                  <Input
                    id="response-path"
                    {...apiForm.register("responsePath")}
                    placeholder="data.result.id"
                  />
                  <p className="text-xs text-muted-foreground">
                    Path to extract from JSON response
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="api-store-full" className="text-sm">
                      Store Full Response
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Save entire response instead of extracted path
                    </p>
                  </div>
                  <Switch
                    id="api-store-full"
                    checked={apiForm.watch("storeFullResponse")}
                    onCheckedChange={(checked) =>
                      apiForm.setValue("storeFullResponse", checked)
                    }
                  />
                </div>
              </div>

              <Separator className="my-4" />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Error Handling</h4>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="api-retry" className="text-sm">
                      Retry on Failure
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Automatically retry failed requests
                    </p>
                  </div>
                  <Switch
                    id="api-retry"
                    checked={apiForm.watch("retryOnFailure")}
                    onCheckedChange={(checked) =>
                      apiForm.setValue("retryOnFailure", checked)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="api-max-retries">Max Retries</Label>
                  <Input
                    id="api-max-retries"
                    type="number"
                    min={0}
                    max={5}
                    {...apiForm.register("maxRetries", { valueAsNumber: true })}
                  />
                  <p className="text-xs text-muted-foreground">
                    0-5 retry attempts
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="api-fallback">Fallback Value</Label>
                  <Input
                    id="api-fallback"
                    {...apiForm.register("fallbackValue")}
                    placeholder="Default value on error"
                  />
                </div>
              </div>

              <Separator className="my-4" />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Common Settings</h4>

                <div className="space-y-2">
                  <Label htmlFor="api-description">Description</Label>
                  <Textarea
                    id="api-description"
                    {...apiForm.register("description")}
                    placeholder="Describe what this API call does..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="api-timeout">Timeout (seconds)</Label>
                  <Input
                    id="api-timeout"
                    type="number"
                    min={5}
                    max={300}
                    {...apiForm.register("timeout", { valueAsNumber: true })}
                  />
                  <p className="text-xs text-muted-foreground">5-300 seconds</p>
                </div>
              </div>
            </div>
          </>
        )}

        {selectedNode.type === "ai" && (
          <>
            <Separator className="my-4" />

            <div className="space-y-4">
              <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  AI Configuration
                </h4>

                <div className="space-y-2">
                  <Label htmlFor="ai-provider">AI Provider</Label>
                  <Select
                    value={aiForm.watch("provider")}
                    onValueChange={(value: any) =>
                      aiForm.setValue("provider", value)
                    }
                  >
                    <SelectTrigger id="ai-provider">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">
                        OpenAI (GPT-4, GPT-3.5)
                      </SelectItem>
                      <SelectItem value="anthropic">
                        Anthropic (Claude)
                      </SelectItem>
                      <SelectItem value="google">Google (Gemini)</SelectItem>
                      <SelectItem value="custom">
                        Custom/Local Endpoint
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ai-model">Model</Label>
                  <Select
                    value={aiForm.watch("model")}
                    onValueChange={(value) => aiForm.setValue("model", value)}
                  >
                    <SelectTrigger id="ai-model">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {watchAiProvider === "openai" && (
                        <>
                          <SelectItem value="gpt-4">
                            GPT-4 (8K context)
                          </SelectItem>
                          <SelectItem value="gpt-4-turbo">
                            GPT-4 Turbo (128K context)
                          </SelectItem>
                          <SelectItem value="gpt-3.5-turbo">
                            GPT-3.5 Turbo (16K context)
                          </SelectItem>
                        </>
                      )}
                      {watchAiProvider === "anthropic" && (
                        <>
                          <SelectItem value="claude-3-opus">
                            Claude 3 Opus
                          </SelectItem>
                          <SelectItem value="claude-3-sonnet">
                            Claude 3 Sonnet
                          </SelectItem>
                          <SelectItem value="claude-3-haiku">
                            Claude 3 Haiku
                          </SelectItem>
                        </>
                      )}
                      {watchAiProvider === "google" && (
                        <>
                          <SelectItem value="gemini-pro">Gemini Pro</SelectItem>
                          <SelectItem value="gemini-ultra">
                            Gemini Ultra
                          </SelectItem>
                        </>
                      )}
                      {watchAiProvider === "custom" && (
                        <SelectItem value="custom">Custom Model</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {watchAiProvider === "custom" && (
                  <div className="space-y-2">
                    <Label htmlFor="custom-endpoint">Custom Endpoint</Label>
                    <Input
                      id="custom-endpoint"
                      {...aiForm.register("customEndpoint")}
                      placeholder="https://your-api.com/v1/chat"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Prompt Builder
                </h4>

                <div className="space-y-2">
                  <Label htmlFor="system-prompt">
                    System Prompt (Optional)
                  </Label>
                  <Textarea
                    id="system-prompt"
                    {...aiForm.register("systemPrompt")}
                    placeholder="You are a helpful assistant..."
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    {watchSystemPrompt?.length || 0} characters
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="user-prompt">User Prompt</Label>
                  <Textarea
                    id="user-prompt"
                    {...aiForm.register("userPrompt")}
                    placeholder="Analyze the following text: {{input.text}}"
                    rows={6}
                  />
                  <p className="text-xs text-muted-foreground">
                    {watchUserPrompt?.length || 0} characters • Approx{" "}
                    {Math.ceil((watchUserPrompt?.length || 0) / 4)} tokens
                  </p>
                </div>

                <div className="pt-2">
                  <p className="text-xs font-medium mb-2">Prompt Templates:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      {
                        label: "Summarize",
                        prompt:
                          "Summarize the following text in 3 sentences: {{text}}",
                      },
                      {
                        label: "Extract Entities",
                        prompt:
                          "Extract all named entities (people, places, organizations) from: {{text}}",
                      },
                      {
                        label: "Sentiment",
                        prompt:
                          "Analyze the sentiment (positive/negative/neutral) of: {{text}}",
                      },
                      {
                        label: "Generate",
                        prompt: "Generate a professional response to: {{text}}",
                      },
                    ].map((template) => (
                      <Button
                        key={template.label}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          aiForm.setValue("userPrompt", template.prompt)
                        }
                      >
                        {template.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                <h4 className="text-sm font-medium">Parameters</h4>

                <div className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="temperature">Temperature</Label>
                      <span className="text-xs text-muted-foreground">
                        {aiForm.watch("temperature")}
                      </span>
                    </div>
                    <Slider
                      id="temperature"
                      min={0}
                      max={2}
                      step={0.1}
                      value={[aiForm.watch("temperature")]}
                      onValueChange={(value) =>
                        aiForm.setValue("temperature", value[0])
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Lower = more focused, Higher = more creative
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="max-tokens">Max Tokens</Label>
                    <Input
                      id="max-tokens"
                      type="number"
                      min={1}
                      max={4000}
                      {...aiForm.register("maxTokens", { valueAsNumber: true })}
                    />
                    <p className="text-xs text-muted-foreground">
                      1-4000 tokens (~750 words per 1000 tokens)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="top-p">Top P</Label>
                      <span className="text-xs text-muted-foreground">
                        {aiForm.watch("topP")}
                      </span>
                    </div>
                    <Slider
                      id="top-p"
                      min={0}
                      max={1}
                      step={0.1}
                      value={[aiForm.watch("topP")]}
                      onValueChange={(value) =>
                        aiForm.setValue("topP", value[0])
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="frequency-penalty">
                        Frequency Penalty
                      </Label>
                      <span className="text-xs text-muted-foreground">
                        {aiForm.watch("frequencyPenalty")}
                      </span>
                    </div>
                    <Slider
                      id="frequency-penalty"
                      min={-2}
                      max={2}
                      step={0.1}
                      value={[aiForm.watch("frequencyPenalty")]}
                      onValueChange={(value) =>
                        aiForm.setValue("frequencyPenalty", value[0])
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="presence-penalty">Presence Penalty</Label>
                      <span className="text-xs text-muted-foreground">
                        {aiForm.watch("presencePenalty")}
                      </span>
                    </div>
                    <Slider
                      id="presence-penalty"
                      min={-2}
                      max={2}
                      step={0.1}
                      value={[aiForm.watch("presencePenalty")]}
                      onValueChange={(value) =>
                        aiForm.setValue("presencePenalty", value[0])
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="stop-sequences">Stop Sequences</Label>
                    <Input
                      id="stop-sequences"
                      {...aiForm.register("stopSequences")}
                      placeholder="Comma-separated: END, STOP"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                <h4 className="text-sm font-medium">Output Format</h4>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="json-mode" className="text-sm">
                      JSON Mode
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Force response to be valid JSON
                    </p>
                  </div>
                  <Switch
                    id="json-mode"
                    checked={aiForm.watch("jsonMode")}
                    onCheckedChange={(checked) =>
                      aiForm.setValue("jsonMode", checked)
                    }
                  />
                </div>

                {watchJsonMode && (
                  <div className="space-y-2">
                    <Label htmlFor="json-schema">JSON Schema (Optional)</Label>
                    <Textarea
                      id="json-schema"
                      {...aiForm.register("jsonSchema")}
                      placeholder='{"type": "object", "properties": {"name": {"type": "string"}}}'
                      rows={4}
                      className="font-mono text-xs"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="ai-output-path">Extract Path</Label>
                  <Input
                    id="ai-output-path"
                    {...aiForm.register("outputPath")}
                    placeholder="result.summary"
                  />
                  <p className="text-xs text-muted-foreground">
                    Extract specific field from response
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="ai-store-full" className="text-sm">
                      Store Full Response
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Save entire AI response
                    </p>
                  </div>
                  <Switch
                    id="ai-store-full"
                    checked={aiForm.watch("storeFullResponse")}
                    onCheckedChange={(checked) =>
                      aiForm.setValue("storeFullResponse", checked)
                    }
                  />
                </div>
              </div>

              <Separator className="my-4" />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Common Settings</h4>

                <div className="space-y-2">
                  <Label htmlFor="ai-description">Description</Label>
                  <Textarea
                    id="ai-description"
                    {...aiForm.register("description")}
                    placeholder="Describe what this AI task does..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ai-timeout">Timeout (seconds)</Label>
                  <Input
                    id="ai-timeout"
                    type="number"
                    min={5}
                    max={300}
                    {...aiForm.register("timeout", { valueAsNumber: true })}
                  />
                  <p className="text-xs text-muted-foreground">5-300 seconds</p>
                </div>
              </div>
            </div>
          </>
        )}

        {selectedNode.type === "loop" && (
          <>
            <Separator className="my-4" />

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="loop-type" className="flex items-center gap-2">
                  <Repeat className="h-4 w-4" />
                  Loop Type
                </Label>
                <Select
                  value={loopForm.watch("loopType")}
                  onValueChange={(value: any) =>
                    loopForm.setValue("loopType", value)
                  }
                >
                  <SelectTrigger id="loop-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="for_each">
                      For Each (iterate over array)
                    </SelectItem>
                    <SelectItem value="while">
                      While (condition-based)
                    </SelectItem>
                    <SelectItem value="count">
                      Count (fixed iterations)
                    </SelectItem>
                    <SelectItem value="until">
                      Until (run until condition true)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {watchLoopType === "for_each" && (
                <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                  <h4 className="text-sm font-medium">
                    For Each Configuration
                  </h4>

                  <div className="space-y-2">
                    <Label htmlFor="source-variable">
                      Source Variable (Array)
                    </Label>
                    <Input
                      id="source-variable"
                      {...loopForm.register("sourceVariable")}
                      placeholder="{{previous.items}}"
                      className="font-mono"
                    />
                    <p className="text-xs text-muted-foreground">
                      Array from previous node
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="item-variable">Current Item Variable</Label>
                    <Input
                      id="item-variable"
                      {...loopForm.register("itemVariable")}
                      placeholder="item"
                      className="font-mono"
                    />
                    <p className="text-xs text-muted-foreground">
                      Use {`{{item}}`} to reference current item
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="index-variable">
                      Index Variable (Optional)
                    </Label>
                    <Input
                      id="index-variable"
                      {...loopForm.register("indexVariable")}
                      placeholder="index"
                      className="font-mono"
                    />
                    <p className="text-xs text-muted-foreground">
                      Use {`{{index}}`} for current position
                    </p>
                  </div>
                </div>
              )}

              {watchLoopType === "count" && (
                <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                  <h4 className="text-sm font-medium">Count Configuration</h4>

                  <div className="space-y-2">
                    <Label htmlFor="iterator-variable">Iterator Variable</Label>
                    <Input
                      id="iterator-variable"
                      {...loopForm.register("iteratorVariable")}
                      placeholder="i"
                      className="font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-2">
                      <Label htmlFor="start-value">Start</Label>
                      <Input
                        id="start-value"
                        type="number"
                        {...loopForm.register("startValue", {
                          valueAsNumber: true,
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="end-value">End</Label>
                      <Input
                        id="end-value"
                        type="number"
                        {...loopForm.register("endValue", {
                          valueAsNumber: true,
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="step-value">Step</Label>
                      <Input
                        id="step-value"
                        type="number"
                        {...loopForm.register("stepValue", {
                          valueAsNumber: true,
                        })}
                      />
                    </div>
                  </div>
                </div>
              )}

              {(watchLoopType === "while" || watchLoopType === "until") && (
                <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                  <h4 className="text-sm font-medium">
                    {watchLoopType === "while" ? "While" : "Until"}{" "}
                    Configuration
                  </h4>

                  <div className="space-y-2">
                    <Label htmlFor="while-condition">
                      Condition Expression
                    </Label>
                    <Textarea
                      id="while-condition"
                      {...loopForm.register("whileCondition")}
                      placeholder="{{counter}} < 10 && {{status}} === 'active'"
                      rows={3}
                      className="font-mono text-xs"
                    />
                    <p className="text-xs text-muted-foreground">
                      JavaScript expression that evaluates to true/false
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                <h4 className="text-sm font-medium">Iteration Settings</h4>

                <div className="space-y-2">
                  <Label htmlFor="max-iterations">
                    Max Iterations (Safety Limit)
                  </Label>
                  <Input
                    id="max-iterations"
                    type="number"
                    min={1}
                    max={1000}
                    {...loopForm.register("maxIterations", {
                      valueAsNumber: true,
                    })}
                  />
                  <p className="text-xs text-muted-foreground">
                    1-1000 iterations maximum
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="parallel-execution" className="text-sm">
                      Parallel Execution
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Run iterations simultaneously
                    </p>
                  </div>
                  <Switch
                    id="parallel-execution"
                    checked={loopForm.watch("parallelExecution")}
                    onCheckedChange={(checked) =>
                      loopForm.setValue("parallelExecution", checked)
                    }
                  />
                </div>

                {watchParallelExecution && (
                  <div className="space-y-2">
                    <Label htmlFor="batch-size">Batch Size</Label>
                    <Input
                      id="batch-size"
                      type="number"
                      min={1}
                      max={10}
                      {...loopForm.register("batchSize", {
                        valueAsNumber: true,
                      })}
                    />
                    <p className="text-xs text-muted-foreground">
                      1-10 concurrent iterations
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="delay-ms">
                    Delay Between Iterations (ms)
                  </Label>
                  <Input
                    id="delay-ms"
                    type="number"
                    min={0}
                    max={60000}
                    {...loopForm.register("delayMs", { valueAsNumber: true })}
                  />
                  <p className="text-xs text-muted-foreground">
                    0-60000 milliseconds (0 = no delay)
                  </p>
                </div>
              </div>

              <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <SkipForward className="h-4 w-4" />
                  Break Conditions
                </h4>

                <div className="space-y-2">
                  <Label htmlFor="break-condition">Break If (Optional)</Label>
                  <Input
                    id="break-condition"
                    {...loopForm.register("breakCondition")}
                    placeholder="{{item.status}} === 'complete'"
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    Exit loop early if condition met
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="continue-on-error" className="text-sm">
                      Continue on Error
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Skip failed iterations
                    </p>
                  </div>
                  <Switch
                    id="continue-on-error"
                    checked={loopForm.watch("continueOnError")}
                    onCheckedChange={(checked) =>
                      loopForm.setValue("continueOnError", checked)
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="collect-outputs" className="text-sm">
                      Collect Outputs
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Array of all iteration results
                    </p>
                  </div>
                  <Switch
                    id="collect-outputs"
                    checked={loopForm.watch("collectOutputs")}
                    onCheckedChange={(checked) =>
                      loopForm.setValue("collectOutputs", checked)
                    }
                  />
                </div>
              </div>

              <Separator className="my-4" />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Common Settings</h4>

                <div className="space-y-2">
                  <Label htmlFor="loop-description">Description</Label>
                  <Textarea
                    id="loop-description"
                    {...loopForm.register("description")}
                    placeholder="Describe what this loop does..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="loop-timeout">Timeout (seconds)</Label>
                  <Input
                    id="loop-timeout"
                    type="number"
                    min={5}
                    max={600}
                    {...loopForm.register("timeout", { valueAsNumber: true })}
                  />
                  <p className="text-xs text-muted-foreground">
                    5-600 seconds (loops may take longer)
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {selectedNode.type === "tool" && (
          <>
            <Separator className="my-4" />

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tool-select">Select Tool</Label>
                <Select
                  value={toolForm.watch("toolId")}
                  onValueChange={(value) => {
                    toolForm.setValue("toolId", value);
                    const selectedTool = userTools?.tools.find(t => t.id === value);
                    if (selectedTool && selectedTool.inputSchema) {
                      const fields = Object.keys(selectedTool.inputSchema as any);
                      const mappings = fields.map(fieldId => ({
                        fieldId,
                        value: "",
                      }));
                      toolForm.setValue("inputMappings", mappings);
                    }
                  }}
                >
                  <SelectTrigger id="tool-select">
                    <SelectValue placeholder="Choose a tool to execute" />
                  </SelectTrigger>
                  <SelectContent>
                    {userTools?.tools.map((tool) => (
                      <SelectItem key={tool.id} value={tool.id}>
                        <div className="flex items-center gap-2">
                          <Wrench className="h-4 w-4" />
                          <div>
                            <div className="font-medium">{tool.title}</div>
                            <div className="text-xs text-muted-foreground">
                              {tool.category}
                            </div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Select a tool from your created tools
                </p>
              </div>

              {toolForm.watch("toolId") && (() => {
                const selectedTool = userTools?.tools.find(
                  t => t.id === toolForm.watch("toolId")
                );
                const inputSchema = selectedTool?.inputSchema as any;
                const inputMappings = toolForm.watch("inputMappings");

                return (
                  <>
                    <Separator className="my-4" />
                    
                    <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                      <h4 className="text-sm font-medium flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        Input Field Mapping
                      </h4>

                      {inputSchema && Object.entries(inputSchema).map(([fieldId, spec]: [string, any], idx) => (
                        <div key={fieldId} className="space-y-2">
                          <Label htmlFor={`tool-input-${fieldId}`}>
                            {spec.label || fieldId}
                            {spec.required && <span className="text-red-500 ml-1">*</span>}
                          </Label>
                          <Input
                            id={`tool-input-${fieldId}`}
                            placeholder={`Enter value or use {{step.nodeId.field}}`}
                            value={(inputMappings[idx]?.value as string) || ""}
                            onChange={(e) => {
                              const newMappings = [...inputMappings];
                              newMappings[idx] = {
                                ...newMappings[idx],
                                fieldId,
                                value: e.target.value,
                              };
                              toolForm.setValue("inputMappings", newMappings);
                            }}
                            className="font-mono text-sm"
                          />
                          <p className="text-xs text-muted-foreground">
                            Type: {spec.type} {spec.description && `- ${spec.description}`}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-2 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                      <h4 className="text-sm font-medium flex items-center gap-2">
                        <Info className="h-4 w-4" />
                        Tool Information
                      </h4>
                      <div className="text-sm space-y-1">
                        <p><strong>Name:</strong> {selectedTool?.title}</p>
                        <p><strong>Category:</strong> {selectedTool?.category}</p>
                        <p><strong>Description:</strong> {selectedTool?.description}</p>
                      </div>
                    </div>
                  </>
                );
              })()}

              <Separator className="my-4" />

              <div className="space-y-2">
                <Label htmlFor="tool-description">Description</Label>
                <Textarea
                  id="tool-description"
                  {...toolForm.register("description")}
                  placeholder="Describe what this tool node does..."
                  rows={3}
                />
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
