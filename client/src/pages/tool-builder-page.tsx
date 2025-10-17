import { useMemo, useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import NavigationHeader from "@/components/navigation-header";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Code,
  Eye,
  Save,
  Play,
  Puzzle,
  Wand2,
  Shuffle,
  Table as TableIcon,
  DollarSign
} from "lucide-react";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Fxn } from "@shared/schema";
import TemplateBrowser from "@/components/tool-builder/template-browser";
import TemplatePreviewModal from "@/components/tool-builder/template-preview-modal";
import { SIMPLE_TOOL_TEMPLATES, SimpleToolTemplate } from "@shared/simple-tool-templates";
import { ToolPricingModal } from "@/components/tool-pricing-modal";
// or use Collapsible if you prefer its API

const toolBuilderSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(100, "Title must be less than 100 characters"),
  description: z
    .string()
    .min(1, "Description is required")
    .max(500, "Description must be less than 500 characters"),
  category: z.string().min(1, "Category is required"),
  isPublic: z.boolean().default(false),
  inputSchema: z.string().min(1, "Input schema is required"),
  outputSchema: z.string().min(1, "Output schema is required"),
  code: z.string().min(1, "Function code is required"),
});

type ToolBuilderData = z.infer<typeof toolBuilderSchema>;

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

// ---------- Examples & Presets ----------
const exampleInputSchema = `{
  "name": { "type": "string", "required": true, "label": "Your Name" },
  "age": { "type": "number", "required": true, "label": "Your Age", "min": 0, "max": 150 }
}`;

const exampleOutputSchema = `{
  "greeting": { "type": "string", "label": "Personal Greeting", "renderer": "badge" },
  "category": { "type": "string", "label": "Age Category", "renderer": "text" }
}`;

const exampleCode = `function customTool(inputs) {
  const { name, age } = inputs;
  const category = age < 18 ? "Minor" : age < 65 ? "Adult" : "Senior";
  return { greeting: \`Hello \${name}! Nice to meet you.\`, category };
}`;

const wheelPreset = {
  title: "Wheel of Names",
  description:
    "Spin a wheel to pick a random name, optionally removing winners after each spin.",
  category: "productivity",
  inputSchema: `{
    "names": { "type": "list", "label": "Names (one per line)", "required": true, "placeholder": "Alice\\nBob\\nCharlie" },
    "removeWinner": { "type": "boolean", "label": "Remove winner after each spin", "required": false, "default": true },
    "history": { "type": "list", "label": "Winners so far (internal)", "required": false, "hidden": true }
  }`,
  outputSchema: `{
    "winner": { "type": "string", "label": "Winner", "renderer": "badge" },
    "remaining": { "type": "list", "label": "Remaining names", "renderer": "list" },
    "namesWheel": { "type": "list", "label": "Wheel", "renderer": "wheel" },
    "history": { "type": "list", "label": "Winners so far", "renderer": "list" }
  }`,
  code: `function customTool(inputs) {
    const { names, removeWinner = true, history = [] } = inputs;
    const pool = Array.isArray(names)
      ? names.slice()
      : (typeof names === "string"
          ? names.split(/\\r?\\n|,/).map(s => s.trim()).filter(Boolean)
          : []);
    if (pool.length === 0) return { winner: null, remaining: pool, history };
    const idx = Math.floor(Math.random() * pool.length);
    const winner = pool[idx];
    const remaining = removeWinner ? pool.filter((_,i)=>i!==idx) : pool;
    const newHistory = [...history, winner];
    return { winner, remaining, history: newHistory, namesWheel: pool };
  }`,
};

// another simple preset: Pick Random Item from list
const pickRandomPreset = {
  title: "Pick Random Item",
  description: "Pick a random item from a list.",
  category: "utility",
  inputSchema: `{
    "items": { "type": "list", "label": "Items (one per line)", "required": true, "placeholder": "red\\nblue\\ngreen" }
  }`,
  outputSchema: `{
    "choice": { "type": "string", "label": "Choice", "renderer": "badge" }
  }`,
  code: `function customTool(inputs) {
    const src = Array.isArray(inputs.items)
      ? inputs.items
      : String(inputs.items || "").split(/\\r?\\n|,/).map(s=>s.trim()).filter(Boolean);
    if (src.length === 0) return { choice: null };
    return { choice: src[Math.floor(Math.random()*src.length)] };
  }`,
};

const tableFromCsvPreset = {
  title: "Table from CSV",
  description: "Paste CSV text and preview it as a table.",
  category: "utility",
  inputSchema: `{
    "csv": { "type": "textarea", "label": "CSV Text", "required": true, "placeholder": "name,age\\nAlice,30\\nBob,28" },
    "hasHeader": { "type": "boolean", "label": "First row is header", "default": true }
  }`,
  outputSchema: `{
    "rows": { "type": "list", "label": "Rows", "renderer": "table" }
  }`,
  code: `function customTool(inputs) {
    const text = String(inputs.csv || "");
    const lines = text.split(/\\r?\\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return { rows: [] };
    const split = (s) => s.split(",").map(x => x.trim());
    let rows = lines.map(split);
    if (inputs.hasHeader) {
      const header = rows.shift();
      const objs = rows.map(r => {
        const o = {};
        header.forEach((h,i)=> o[h || ("col"+(i+1))] = r[i] ?? "");
        return o;
      });
      return { rows: objs };
    } else {
      const maxLen = Math.max(...rows.map(r=>r.length));
      const header = Array.from({length:maxLen}, (_,i)=>"col"+(i+1));
      const objs = rows.map(r => {
        const o = {};
        header.forEach((h,i)=> o[h] = r[i] ?? "");
        return o;
      });
      return { rows: objs };
    }
  }`,
};

// ---------- Utilities for safe JSON + schema-driven UI ----------
function safeParse<T = any>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

type InputSpec =
  | {
      type: "string" | "textarea";
      label?: string;
      required?: boolean;
      placeholder?: string;
      default?: string;
    }
  | {
      type: "number";
      label?: string;
      required?: boolean;
      min?: number;
      max?: number;
      step?: number;
      default?: number;
    }
  | { type: "boolean"; label?: string; required?: boolean; default?: boolean }
  | {
      type: "select" | "multiselect";
      label?: string;
      required?: boolean;
      options: string[];
      default?: any;
    }
  | {
      type: "list";
      label?: string;
      required?: boolean;
      placeholder?: string;
      default?: string[];
    }
  | { type: string; [k: string]: any }; // forward-compat

type OutputSpec = {
  type: "string" | "number" | "list" | "table" | "json";
  label?: string;
  renderer?: "text" | "badge" | "list" | "table" | "json";
};

type OutputRendererKind =
  | "text"
  | "badge"
  | "list"
  | "table"
  | "json"
  | "wheel";
type OutputSpecEx = Omit<OutputSpec, "renderer"> & {
  renderer?: OutputRendererKind;
};

function coerceList(v: any): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x)).filter(Boolean);
  return String(v ?? "")
    .split(/\r?\n|,/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function buildInitialValues(schemaObj: Record<string, InputSpec>) {
  const init: Record<string, any> = {};
  for (const [key, spec] of Object.entries(schemaObj)) {
    // @ts-expect-error - duck typing
    if (spec.hidden) continue;
    switch (spec.type) {
      case "string":
      case "textarea":
        init[key] = spec.default ?? "";
        break;
      case "number":
        init[key] = spec.default ?? "";
        break;
      case "boolean":
        init[key] = spec.default ?? false;
        break;
      case "select":
        init[key] = spec.default ?? spec.options?.[0] ?? "";
        break;
      case "multiselect":
        init[key] = Array.isArray(spec.default)
          ? spec.default.join("\n")
          : typeof spec.default === "string"
          ? spec.default
          : "";
        break;
      case "list":
        init[key] = Array.isArray(spec.default)
          ? spec.default.join("\n")
          : typeof spec.default === "string"
          ? spec.default
          : "";
        break;
      default:
        init[key] = "";
    }
  }
  return init;
}

function InputForm({
  schemaObj,
  value,
  onChange,
}: {
  schemaObj: Record<string, InputSpec>;
  value: Record<string, any>;
  onChange: (v: Record<string, any>) => void;
}) {
  return (
    <div className="space-y-4">
      {Object.entries(schemaObj).map(([key, spec]) => {
        // @ts-expect-error - allow hidden
        if (spec.hidden) return null;
        const label = (spec as any).label ?? key;
        const help = (spec as any).placeholder;
        const val = value[key];
        const set = (next: any) => onChange({ ...value, [key]: next });
        switch (spec.type) {
          case "string":
            return (
              <div key={key}>
                <label className="text-sm font-medium">{label}</label>
                <Input
                  value={val ?? ""}
                  onChange={(e) => set(e.target.value)}
                  placeholder={help}
                />
              </div>
            );
          case "textarea":
            return (
              <div key={key}>
                <label className="text-sm font-medium">{label}</label>
                <Textarea
                  value={val ?? ""}
                  onChange={(e) => set(e.target.value)}
                  placeholder={help}
                  aria-multiline="true"
                />
              </div>
            );
          case "number":
            return (
              <div key={key}>
                <label className="text-sm font-medium">{label}</label>
                <Input
                  type="number"
                  value={val ?? ""}
                  onChange={(e) => set(e.target.value)}
                  inputMode="numeric"
                />
              </div>
            );
          case "boolean":
            return (
              <div
                key={key}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="space-y-0.5">
                  <span className="text-sm font-medium">{label}</span>
                  {help && <p className="text-xs text-gray-500">{help}</p>}
                </div>
                <Switch
                  checked={!!val}
                  onCheckedChange={(checked) => set(checked)}
                />
              </div>
            );
          case "select":
            return (
              <div key={key}>
                <label className="text-sm font-medium">{label}</label>
                <Select value={val} onValueChange={set}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select�" />
                  </SelectTrigger>
                  <SelectContent>
                    {(spec as any).options?.map((opt: string) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );
          case "multiselect":
            return (
              <div key={key}>
                <label className="text-sm font-medium">{label}</label>
                <Textarea
                  value={
                    typeof val === "string"
                      ? val
                      : Array.isArray(val)
                      ? val.join("\n")
                      : ""
                  }
                  onChange={(e) => set(e.target.value)}
                  placeholder="One per line or comma-separated"
                  aria-multiline="true"
                />
              </div>
            );
          case "list":
            return (
              <div key={key}>
                <label className="text-sm font-medium">{label}</label>
                <Textarea
                  value={
                    typeof val === "string"
                      ? val
                      : Array.isArray(val)
                      ? val.join("\n")
                      : ""
                  }
                  onChange={(e) => set(e.target.value)}
                  placeholder={help ?? "One per line"}
                  aria-multiline="true"
                />
              </div>
            );
          default:
            return (
              <div
                key={key}
                className="text-xs text-amber-700 bg-amber-50 p-2 rounded"
              >
                Unknown field type: <strong>{(spec as any).type}</strong>
              </div>
            );
        }
      })}
    </div>
  );
}

function Wheel({ names, highlight }: { names: string[]; highlight?: string }) {
  const n = Math.max(1, names.length);
  const stops = names
    .map((_, i) => {
      const start = (i / n) * 360;
      const end = ((i + 1) / n) * 360;
      const hue = Math.round((i / n) * 360);
      return `${`hsl(${hue} 70% 60%)`} ${start}deg ${end}deg`;
    })
    .join(", ");
  const style: React.CSSProperties = { background: `conic-gradient(${stops})` };
  return (
    <div className="flex items-center gap-4">
      <div
        className="relative w-40 h-40 rounded-full shadow border overflow-hidden"
        style={style}
      >
        <div className="absolute left-1/2 -translate-x-1/2 -top-2 w-0 h-0 border-l-8 border-r-8 border-b-[14px] border-l-transparent border-r-transparent border-b-black" />
      </div>
      <div className="text-sm">
        <div className="text-gray-600 mb-1">Entries</div>
        <ul className="list-disc pl-5 max-h-36 overflow-auto">
          {names.map((nm, i) => (
            <li key={i} className={nm === highlight ? "font-semibold" : ""}>
              {nm}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function OutputRenderer({
  schemaObj,
  data,
}: {
  schemaObj: Record<string, OutputSpecEx>;
  data: any;
}) {
  const rows = Object.entries(schemaObj);
  if (rows.length === 0) return null;
  return (
    <div className="space-y-4">
      {rows.map(([key, spec]) => {
        const label = spec.label ?? key;
        const v = data?.[key];
        const r = spec.renderer ?? "text";
        if (r === "badge") {
          return (
            <div key={key} className="space-y-1">
              <div className="text-sm text-gray-600">{label}</div>
              <Badge variant="secondary">{String(v ?? "�")}</Badge>
            </div>
          );
        }
        if (r === "list") {
          const list = Array.isArray(v) ? v : coerceList(v);
          return (
            <div key={key}>
              <div className="text-sm font-medium">{label}</div>
              <ul className="list-disc pl-5 text-sm">
                {list.map((item, i) => (
                  <li key={i}>{String(item)}</li>
                ))}
              </ul>
            </div>
          );
        }
        if (r === "table") {
          const arr = Array.isArray(v) ? v : [];
          if (arr.length === 0) {
            return (
              <div key={key} className="text-sm text-gray-500">
                {label}: (empty)
              </div>
            );
          }
          const cols = Object.keys(arr[0] ?? {});
          return (
            <div key={key} className="space-y-1">
              <div className="text-sm font-medium">{label}</div>
              <div className="overflow-auto border rounded">
                <table className="min-w-[400px] text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      {cols.map((c) => (
                        <th key={c} className="text-left px-3 py-2">
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {arr.map((row, i) => (
                      <tr key={i} className="border-t">
                        {cols.map((c) => (
                          <td key={c} className="px-3 py-2">
                            {String(row[c])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        }
        if (r === "json") {
          return (
            <div key={key}>
              <div className="text-sm font-medium">{label}</div>
              <pre className="bg-gray-50 p-3 rounded border text-xs overflow-auto">
                {JSON.stringify(v, null, 2)}
              </pre>
            </div>
          );
        }
        if (r === "wheel") {
          const names = Array.isArray(v) ? v.map(String) : coerceList(v);
          return (
            <div key={key} className="space-y-1">
              <div className="text-sm font-medium">{label}</div>
              <Wheel names={names} />
            </div>
          );
        }
        // text (default)
        return (
          <div key={key}>
            <div className="text-sm text-gray-600">{label}</div>
            <div className="text-base">{String(v ?? "�")}</div>
          </div>
        );
      })}
    </div>
  );
}

export default function ToolBuilderPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("builder");
  const [testInputs, setTestInputs] = useState("{}");
  const [testResults, setTestResults] = useState<any>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<SimpleToolTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<SimpleToolTemplate | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const form = useForm<ToolBuilderData>({
    resolver: zodResolver(toolBuilderSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
      isPublic: false,
      inputSchema: exampleInputSchema,
      outputSchema: exampleOutputSchema,
      code: exampleCode,
    },
  });
  const search = new URLSearchParams(window.location.search);
  const editId = search.get("edit");

  useEffect(() => {
    if (!editId) return;
    (async () => {
      const res = await apiRequest("GET", `/api/tools/${editId}`);
      const json = await res.json();
      if (!res.ok)
        throw new Error(json?.error?.message ?? "Failed to load tool");
      const fxn = json.fxn;
      form.setValue("title", fxn.title);
      form.setValue("description", fxn.description);
      form.setValue("category", fxn.category);
      form.setValue("isPublic", fxn.isPublic);
      setInputSchemaText(JSON.stringify(fxn.inputSchema ?? {}, null, 2));
      setOutputSchemaText(JSON.stringify(fxn.outputSchema ?? {}, null, 2));
      form.setValue("code", fxn.codeRef ?? "");
    })().catch((e) =>
      toast({
        title: "Load failed",
        description: String(e.message),
        variant: "destructive",
      })
    );
  }, [editId]);

  // Keep raw textarea text stable; parse only on save
  const [inputSchemaText, setInputSchemaText] = useState(exampleInputSchema);
  const [outputSchemaText, setOutputSchemaText] = useState(exampleOutputSchema);

  // preview state derived from current input schema
  const inputSchemaObj = useMemo(
    () => safeParse<Record<string, InputSpec>>(inputSchemaText, {}),
    [inputSchemaText]
  );
  const outputSchemaObj = useMemo(
    () => safeParse<Record<string, OutputSpec>>(outputSchemaText, {}),
    [outputSchemaText]
  );
  const [previewValues, setPreviewValues] = useState<Record<string, any>>({});

  // refresh initial preview values when schema changes
  useEffect(() => {
    setPreviewValues(buildInitialValues(inputSchemaObj));
  }, [inputSchemaObj]);

  const createToolMutation = useMutation({
    mutationFn: async (data: ToolBuilderData) => {
      const res = await apiRequest("POST", "/api/tools", data);
      const json = await res.json();
      if (!res.ok) {
        // Give the user a meaningful message from server
        const msg =
          json?.error?.message ??
          (Array.isArray(json?.error?.details)
            ? json.error.details[0]?.message
            : null) ??
          "Failed to create tool.";
        throw new Error(msg);
      }
      return json as {
        fxn: {
          id: string;
          createdAt: Date;
          updatedAt: Date;
          title: string;
          description: string;
          category: string;
          isPublic: boolean;
          inputSchema: unknown;
          outputSchema: unknown;
          slug: string;
          codeKind: string;
          codeRef: string;
          createdBy: string | null;
        };
      };
    },
    onSuccess: ({ fxn }) => {
      toast({
        title: "Tool created!",
        description: `Your tool �${fxn.title}� is ready.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tools"] });
      setLocation(`/fxn/${fxn.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Couldn�t create tool",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Template selection handler
  const handleSelectTemplate = (template: SimpleToolTemplate) => {
    setSelectedTemplate(template);
    // Convert template to form values
    form.setValue("title", template.name);
    form.setValue("description", template.description);
    form.setValue("category", template.category);
    
    // Convert template structure to the existing format
    const inputSchema = template.inputConfig.reduce((acc, field) => {
      acc[field.id] = {
        type: field.type,
        label: field.label,
        required: field.required,
        placeholder: field.placeholder,
        defaultValue: field.defaultValue,
        ...(field.type === 'number' && { min: field.min, max: field.max, step: field.step }),
        ...(field.type === 'select' && { options: field.options?.map(opt => opt.value) }),
        ...(field.type === 'range' && { min: field.min, max: field.max, step: field.step, showValue: field.showValue }),
        ...(field.type === 'textarea' && { rows: field.rows })
      };
      return acc;
    }, {} as any);
    
    setInputSchemaText(JSON.stringify(inputSchema, null, 2));
    
    // Simple output schema
    const outputSchema = template.outputConfig.sections.reduce((acc, section) => {
      acc[section.title.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()] = {
        type: "string",
        label: section.title,
        renderer: section.type === 'result' ? 'text' : 'text'
      };
      return acc;
    }, {} as any);
    
    setOutputSchemaText(JSON.stringify(outputSchema, null, 2));
    
    // Generate simple code
    const code = `function customTool(inputs) {
  // Template: ${template.name}
  // Add your logic here based on the template structure
  
  const result = {};
  
  // Example processing based on inputs
  ${template.inputConfig.map(field => 
    `  // Process ${field.label}: inputs.${field.id}`
  ).join('\n')}
  
  return result;
}`;
    
    form.setValue("code", code);
    
    // Switch to builder tab
    setActiveTab("builder");
    
    toast({
      title: "Template applied!",
      description: `${template.name} template has been loaded. Customize it in the builder.`,
    });
  };

  const handlePreviewTemplate = (template: SimpleToolTemplate) => {
    setPreviewTemplate(template);
    setIsPreviewOpen(true);
  };

  const testToolMutation = useMutation({
    mutationFn: async (data: { code: string; inputs: any }) => {
      const res = await apiRequest("POST", "/api/tools/test", data);
      const json = await res.json();
      if (!res.ok) {
        const msg = json?.error?.message ?? "Test failed.";
        throw new Error(msg);
      }
      return json;
    },
    onSuccess: (result) => {
      setTestResults(result);
    },
    onError: (error: any) => {
      toast({
        title: "Test failed",
        description:
          error.message || "An error occurred while testing the tool.",
        variant: "destructive",
      });
      setTestResults({ error: error.message });
    },
  });

  const updateToolMutation = useMutation({
    mutationFn: async (data: ToolBuilderData) => {
      const res = await apiRequest("PATCH", `/api/tools/${editId}`, data);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? "Update failed");
      return json.fxn as Fxn;
    },
    onSuccess: (fxn) => {
      toast({ title: "Tool updated", description: `Saved “${fxn.title}”` });
      setLocation(`/fxn/${fxn.id}`);
    },
    onError: (e: Error) =>
      toast({
        title: "Update failed",
        description: e.message,
        variant: "destructive",
      }),
  });

  const onSubmit = (values: ToolBuilderData) => {
    try {
      const payload = {
        ...values,
        inputSchema: inputSchemaText,
        outputSchema: outputSchemaText,
      };
      if (editId) {
        // PATCH existing
        updateToolMutation.mutate(payload);
      } else {
        createToolMutation.mutate(payload);
      }
    } catch (error) {
      toast({
        title: "Invalid JSON",
        description:
          "Please check your input and output schemas for valid JSON format.",
        variant: "destructive",
      });
    }
  };

  const handleTestTool = () => {
    try {
      const inputs = JSON.parse(testInputs);
      const code = form.getValues("code");
      testToolMutation.mutate({ code, inputs });
    } catch (error) {
      toast({
        title: "Invalid test inputs",
        description: "Please provide valid JSON for test inputs.",
        variant: "destructive",
      });
    }
  };

  if (!user) {
    setLocation("/auth");
    return <div>Redirecting...</div>;
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* <NavigationHeader /> */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Tool Builder
          </h1>
          <p className="text-gray-600">
            Create your own custom micro-tools and share them with the community
          </p>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <Puzzle className="h-4 w-4" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="builder" className="flex items-center gap-2">
              <Code className="h-4 w-4" />
              Builder
            </TabsTrigger>
            <TabsTrigger value="test" className="flex items-center gap-2">
              <Play className="h-4 w-4" />
              Test
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Preview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="space-y-6">
            <TemplateBrowser
              onSelectTemplate={handleSelectTemplate}
              onPreviewTemplate={handlePreviewTemplate}
              selectedTemplateId={selectedTemplate?.id}
            />
          </TabsContent>

          <TabsContent value="builder" className="space-y-6">
            {/* Presets */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wand2 className="h-4 w-4" />
                  Presets
                </CardTitle>
                <CardDescription>
                  Start from a template, then customize anything.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    form.setValue("title", wheelPreset.title);
                    form.setValue("description", wheelPreset.description);
                    form.setValue("category", wheelPreset.category);
                    form.setValue("inputSchema", wheelPreset.inputSchema);
                    form.setValue("outputSchema", wheelPreset.outputSchema);
                    form.setValue("code", wheelPreset.code);
                    setActiveTab("preview");
                  }}
                >
                  <Shuffle className="h-4 w-4 mr-2" /> Wheel of Names
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    form.setValue("title", pickRandomPreset.title);
                    form.setValue("description", pickRandomPreset.description);
                    form.setValue("category", pickRandomPreset.category);
                    form.setValue("inputSchema", pickRandomPreset.inputSchema);
                    form.setValue(
                      "outputSchema",
                      pickRandomPreset.outputSchema
                    );
                    form.setValue("code", pickRandomPreset.code);
                    setActiveTab("preview");
                  }}
                >
                  <Puzzle className="h-4 w-4 mr-2" /> Pick Random Item
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    form.setValue("title", tableFromCsvPreset.title);
                    form.setValue(
                      "description",
                      tableFromCsvPreset.description
                    );
                    form.setValue("category", tableFromCsvPreset.category);
                    form.setValue(
                      "inputSchema",
                      tableFromCsvPreset.inputSchema
                    );
                    form.setValue(
                      "outputSchema",
                      tableFromCsvPreset.outputSchema
                    );
                    form.setValue("code", tableFromCsvPreset.code);
                    setActiveTab("preview");
                  }}
                >
                  <TableIcon className="h-4 w-4 mr-2" /> Table from CSV
                </Button>
              </CardContent>
            </Card>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Basic Information</CardTitle>
                    <CardDescription>
                      Provide basic details about your tool
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="My Awesome Tool"
                              {...field}
                              data-testid="input-tool-title"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Describe what your tool does and how it helps users"
                              {...field}
                              data-testid="input-tool-description"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Category</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger data-testid="select-tool-category">
                                  <SelectValue placeholder="Select a category" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {categories.map((cat) => (
                                  <SelectItem key={cat} value={cat}>
                                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="isPublic"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">
                                Public Tool
                              </FormLabel>
                              <FormDescription>
                                Make this tool available to all users
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="switch-tool-public"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Input Schema</CardTitle>
                    <CardDescription>
                      Define the form fields that users will fill out
                    </CardDescription>
                    <Accordion type="single" collapsible>
                      <AccordionItem value="input-info">
                        <AccordionTrigger className="text-sm font-semibold">
                          What goes in the input schema?
                        </AccordionTrigger>
                        <AccordionContent className="space-y-2 text-sm text-gray-700">
                          <p>
                            The input schema is a JSON object where each key
                            becomes an input field on your tool. Each value must
                            include a <code>type</code>, and can include flags
                            like <code>label</code>, <code>required</code>,
                            <code>placeholder</code> and <code>default</code>.
                          </p>
                          <ul className="list-disc pl-5 space-y-1">
                            <li>
                              <strong>string</strong> – single‑line text input
                              (supports <code>label</code>,{" "}
                              <code>required</code>, <code>placeholder</code>,{" "}
                              <code>default</code>).
                            </li>
                            <li>
                              <strong>textarea</strong> – multi‑line text area
                              (same options as string).
                            </li>
                            <li>
                              <strong>number</strong> – numeric input (supports{" "}
                              <code>min</code>, <code>max</code>,{" "}
                              <code>step</code>, and <code>default</code>).
                            </li>
                            <li>
                              <strong>boolean</strong> – toggle switch (supports{" "}
                              <code>default</code>).
                            </li>
                            <li>
                              <strong>select</strong> – dropdown (requires an{" "}
                              <code>options</code> array and optional{" "}
                              <code>default</code>).
                            </li>
                            <li>
                              <strong>multiselect</strong> – comma‑ or
                              newline‑separated multiple values.
                            </li>
                            <li>
                              <strong>list</strong> – multi‑line list of items;
                              each line becomes a list entry.
                            </li>
                          </ul>
                          <p>Example:</p>
                          <pre className="bg-gray-50 p-2 rounded text-xs overflow-auto">{`{
                            "name": { "type": "string", "required": true, "label": "Your Name" },
                            "age": { "type": "number", "required": true, "label": "Your Age", "min": 0, "max": 120 }
                            }`}</pre>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </CardHeader>

                  <CardContent>
                    <FormField
                      control={form.control}
                      name="inputSchema"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Input schema (JSON)</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              // display your local state
                              value={inputSchemaText}
                              // update local state *and* form state when typing
                              onChange={(e) => {
                                setInputSchemaText(e.target.value);
                                field.onChange(e.target.value);
                              }}
                              rows={12}
                              spellCheck={false}
                              data-testid="textarea-input-schema"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Output Schema</CardTitle>
                    <CardDescription>
                      Define the structure of the results your tool will return
                    </CardDescription>
                    <Accordion type="single" collapsible>
                      <AccordionItem value="output-info">
                        <AccordionTrigger className="text-sm font-semibold">
                          What goes in the output schema?
                        </AccordionTrigger>
                        <AccordionContent className="space-y-2 text-sm text-gray-700">
                          <p>
                            Your function must return an object with keys that
                            match this schema. Each field describes how to
                            display its value:
                          </p>
                          <ul className="list-disc pl-5 space-y-1">
                            <li>
                              <strong>type</strong> – one of <code>string</code>
                              , <code>number</code>, <code>list</code>,{" "}
                              <code>table</code>, or <code>json</code>.
                            </li>
                            <li>
                              <strong>label</strong> – human‑readable label for
                              the field.
                            </li>
                            <li>
                              <strong>renderer</strong> – optional; controls the
                              UI. Use <code>text</code> for plain values,{" "}
                              <code>badge</code> for pill‑style labels,{" "}
                              <code>list</code> for arrays, <code>table</code>{" "}
                              for array‑of‑objects, <code>json</code> for raw
                              JSON, and <code>wheel</code> for the wheel
                              component.
                            </li>
                          </ul>
                          <p>Example:</p>
                          <pre className="bg-gray-50 p-2 rounded text-xs overflow-auto">{`{
                                        "greeting": { "type": "string", "label": "Personal Greeting", "renderer": "badge" },
                                        "category": { "type": "string", "label": "Age Category", "renderer": "text" }
                                        }`}</pre>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </CardHeader>

                  <CardContent>
                    <FormField
                      control={form.control}
                      name="outputSchema"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Output schema (JSON)</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              value={outputSchemaText}
                              onChange={(e) => {
                                setOutputSchemaText(e.target.value);
                                field.onChange(e.target.value);
                              }}
                              rows={10}
                              spellCheck={false}
                              data-testid="textarea-output-schema"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Function Code</CardTitle>
                    <CardDescription>
                      Write the JavaScript that processes your inputs
                    </CardDescription>
                    <Accordion type="single" collapsible>
                      <AccordionItem value="code-info">
                        <AccordionTrigger className="text-sm font-semibold">
                          How do I write my tool’s function?
                        </AccordionTrigger>
                        <AccordionContent className="space-y-2 text-sm text-gray-700">
                          <p>
                            Define a function named <code>customTool</code> that
                            accepts an
                            <code>inputs</code> parameter matching your input
                            schema and returns an object matching your output
                            schema. You can use any synchronous JavaScript; for
                            example:
                          </p>
                          <pre className="bg-gray-50 p-2 rounded text-xs overflow-auto">{`function customTool(inputs) {
                                // Destructure inputs
                                const { name, age } = inputs;
                                // Compute a random number between 1 and 100
                                const randomNumber = Math.floor(Math.random() * 100) + 1;
                                // Decide if the user is a minor or adult
                                const category = age < 18 ? "Minor" : "Adult";
                                return {
                                    greeting: \`Hello \${name}! Your random number is \${randomNumber}.\`,
                                    category,
                                };
                                }`}</pre>
                          <p>Useful tricks:</p>
                          <ul className="list-disc pl-5 space-y-1">
                            <li>
                              Generate random numbers with{" "}
                              <code>Math.random()</code> and{" "}
                              <code>Math.floor()</code>.
                            </li>
                            <li>
                              Select a random item from a list:{" "}
                              <code>
                                arr[Math.floor(Math.random() * arr.length)]
                              </code>
                              .
                            </li>
                            <li>
                              Parse CSV into objects by splitting on newline and
                              comma (see the built‑in “Table from CSV” preset
                              for an example).
                            </li>
                            <li>
                              Create wheels or lists by returning arrays; the UI
                              will automatically display them according to your
                              output schema.
                            </li>
                          </ul>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </CardHeader>

                  <CardContent>
                    <FormField
                      control={form.control}
                      name="code"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Textarea
                              className="font-mono text-sm min-h-48"
                              placeholder="Enter your function code"
                              {...field}
                              data-testid="input-tool-code"
                            />
                          </FormControl>
                          <FormDescription>
                            Function should accept 'inputs' parameter and return
                            an object matching your output schema
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
 
                <div className="flex gap-4">
                  <Button
                    type="submit"
                    disabled={createToolMutation.isPending}
                    className="flex items-center gap-2"
                    data-testid="button-create-tool"
                  >
                    <Save className="h-4 w-4" />
                    {createToolMutation.isPending && editId != null ? "Saving..." :
                      !createToolMutation.isPending && editId != null ? "Update Tool" : createToolMutation.isPending && editId == null ? "Creating..."
                      : "Create Tool"}
                  </Button>
                  {editId && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowPricingModal(true)}
                      className="flex items-center gap-2"
                    >
                      <DollarSign className="h-4 w-4" />
                      Pricing
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setLocation("/dashboard")}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="test" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Test Your Tool</CardTitle>
                <CardDescription>
                  Test your function with sample inputs before creating the tool
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Test Inputs (JSON)
                  </label>
                  <Textarea
                    value={testInputs}
                    onChange={(e) => setTestInputs(e.target.value)}
                    className="font-mono text-sm min-h-24"
                    placeholder='{"name": "John", "age": 25}'
                    data-testid="input-test-inputs"
                  />
                </div>
                <Button
                  onClick={handleTestTool}
                  disabled={testToolMutation.isPending}
                  className="flex items-center gap-2"
                  data-testid="button-test-tool"
                >
                  <Play className="h-4 w-4" />
                  {testToolMutation.isPending ? "Testing..." : "Run Test"}
                </Button>
                {testResults && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Test Results
                    </label>
                    <pre className="bg-gray-100 p-4 rounded-md text-sm overflow-auto">
                      {JSON.stringify(testResults, null, 2)}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {form.watch("title") || "Tool Preview"}
                  {form.watch("isPublic") && (
                    <Badge variant="secondary">Public</Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  {form.watch("description") ||
                    "Tool description will appear here"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <span className="text-sm font-medium">Category: </span>
                  <Badge variant="outline">
                    {form.watch("category") || "No category"}
                  </Badge>
                </div>
                {/* Render actual inputs from schema */}
                {Object.keys(inputSchemaObj).length === 0 ? (
                  <div className="text-sm text-gray-500">
                    No input schema defined
                  </div>
                ) : (
                  <InputForm
                    schemaObj={inputSchemaObj}
                    value={previewValues}
                    onChange={setPreviewValues}
                  />
                )}
                <div className="flex gap-3">
                  <Button
                    onClick={() => {
                      const code = form.getValues("code");
                      // coerce 'list' textarea lines into arrays before test
                      const coerced: Record<string, any> = {};
                      for (const [k, spec] of Object.entries(inputSchemaObj)) {
                        const v = previewValues[k];
                        // @ts-ignore
                        coerced[k] =
                          spec.type === "list" || spec.type === "multiselect"
                            ? coerceList(v)
                            : v;
                      }
                      testToolMutation.mutate({ code, inputs: coerced });
                    }}
                    disabled={testToolMutation.isPending}
                    className="flex items-center gap-2"
                  >
                    <Play className="h-4 w-4" />
                    {testToolMutation.isPending ? "Running�" : "Run Preview"}
                  </Button>
                </div>
                {testResults && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Results</div>
                    {Object.keys(outputSchemaObj).length > 0 ? (
                      <OutputRenderer
                        schemaObj={outputSchemaObj}
                        data={testResults}
                      />
                    ) : (
                      <pre className="bg-gray-50 p-3 rounded border text-xs overflow-auto">
                        {JSON.stringify(testResults, null, 2)}
                      </pre>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      <TemplatePreviewModal
        template={previewTemplate}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        onUseTemplate={handleSelectTemplate}
      />
      
      {editId && (
        <ToolPricingModal
          open={showPricingModal}
          onOpenChange={setShowPricingModal}
          fxnId={editId}
        />
      )}
    </div>
  );
}
