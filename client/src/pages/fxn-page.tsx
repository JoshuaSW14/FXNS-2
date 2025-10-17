import { useState, useEffect, useMemo, memo, useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/api";
import NavigationHeader from "@/components/navigation-header";
import Footer from "@/components/footer";
import DynamicForm from "@/components/dynamic-form";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Calculator,
  ArrowRightLeft,
  Code,
  Dumbbell,
  Palette,
  TrendingUp,
  Heart,
  Share2,
  Copy,
  RotateCcw,
  Clock,
  Play,
  Trash,
  Pencil,
  Trash2,
  DollarSign,
  Flag,
  MoreVertical,
  ShoppingCart,
  Lock,
} from "lucide-react";
import { Fxn } from "@shared/schema";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { convertInputConfigToInputSpec } from "@/utils/tool-builder-converter";
import { ReportToolDialog } from "@/components/report-tool-dialog";
import { RatingsAndReviews } from "@/components/ratings-and-reviews";
import { SEO } from "@/components/seo";
import { StructuredData } from "@/components/structured-data";
import { PurchaseToolModal } from "@/components/purchase-tool-modal";
import { ToolPricingModal } from "@/components/tool-pricing-modal";
import TagBadge from "@/components/tag-badge";

/*
Implement features:
- Clone a tool (creates a new custom tool based on the current one so you can customize it)
- Share a tool (copy link to clipboard)
- Edit a tool (if owner)
- Delete a tool (if owner)
- Show related tools (based on category)
*/

const nf = new Intl.NumberFormat();

interface FormField {
  name: string;
  type: "string" | "number" | "boolean" | "enum" | "textarea";
  label: string;
  placeholder?: string;
  required?: boolean;
  min?: number;
  max?: number;
  options?: string[];
  defaultValue?: any;
}

type BaseSpec = {
  label?: string;
  required?: boolean;
  hidden?: boolean; // ← add this
};

type InputSpec =
  | (BaseSpec & {
      type: "string" | "textarea";
      label?: string;
      required?: boolean;
      placeholder?: string;
      default?: string;
    })
  | (BaseSpec & {
      type: "number";
      label?: string;
      required?: boolean;
      min?: number;
      max?: number;
      step?: number;
      default?: number;
    })
  | (BaseSpec & {
      type: "boolean";
      label?: string;
      required?: boolean;
      default?: boolean;
    })
  | (BaseSpec & {
      type: "select" | "multiselect";
      label?: string;
      required?: boolean;
      options: string[];
      default?: any;
    })
  | (BaseSpec & {
      type: "list";
      label?: string;
      required?: boolean;
      placeholder?: string;
      default?: string[];
    })
  | (BaseSpec & { type: string; [k: string]: any });

function ListTextarea({
  value,
  onCommit,
  placeholder,
}: {
  value: string | string[];
  onCommit: (text: string) => void;
  placeholder?: string;
}) {
  const initial =
    typeof value === "string"
      ? value
      : Array.isArray(value)
      ? value.join("\n")
      : "";
  const [text, setText] = useState(initial);
  // sync down only when parent value actually changes (e.g., switching tools)
  useEffect(() => {
    setText(initial); /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [initial]);
  return (
    <Textarea
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => onCommit(text)}
      placeholder={placeholder ?? "One per line"}
      aria-multiline="true"
    />
  );
}

const InputForm = memo(function InputForm({
  schemaObj,
  value,
  onChange,
}: {
  schemaObj: Record<string, InputSpec>;
  value: Record<string, any>;
  onChange: React.Dispatch<React.SetStateAction<Record<string, any>>>;
}) {
  const setField = useCallback(
    (name: string, next: any) => {
      onChange((prev) => ({ ...prev, [name]: next }));
    },
    [onChange]
  );

  return (
    <div className="space-y-4">
      {Object.entries(schemaObj).map(([name, spec]) => {
        if (spec.hidden) return null;
        const label = (spec as any).label ?? name;
        const help = (spec as any).placeholder;
        const val = value[name];
        const set = (next: any) => setField(name, next);

        switch (spec.type) {
          case "string":
            return (
              <div key={name}>
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
              <div key={name}>
                <label className="text-sm font-medium">{label}</label>
                <Textarea
                  value={val ?? ""}
                  onChange={(e) => set(e.target.value)}
                  placeholder={help}
                />
              </div>
            );
          case "number":
            // Keep as string while typing; coerce later when running.
            return (
              <div key={name}>
                <label className="text-sm font-medium">{label}</label>
                <Input
                  inputMode="decimal"
                  value={val ?? ""} // keep as string
                  onChange={(e) => set(e.target.value)}
                  placeholder={help}
                />
              </div>
            );
          case "boolean":
            return (
              <div
                key={name}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="space-y-0.5">
                  <span className="text-sm font-medium">{label}</span>
                  {help && <p className="text-xs text-gray-500">{help}</p>}
                </div>
                <Switch checked={!!val} onCheckedChange={set} />
              </div>
            );
          case "select":
            return (
              <div key={name}>
                <label className="text-sm font-medium">{label}</label>
                <Select value={val} onValueChange={set}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select…" />
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
          case "list":
            return (
              <div key={name}>
                <label className="text-sm font-medium">{label}</label>
                <ListTextarea
                  value={val}
                  onCommit={(text) => set(text)}
                  placeholder={help ?? "One per line"}
                />
              </div>
            );
          default:
            return (
              <div
                key={name}
                className="text-xs text-amber-700 bg-amber-50 p-2 rounded"
              >
                Unknown field type: <strong>{(spec as any).type}</strong>
              </div>
            );
        }
      })}
    </div>
  );
});

function ActionsBar({
  isOwner,
  isFavorited,
  onFavorite,
  onShare,
  onClone,
  onEdit,
  onDelete,
  onManagePricing,
  fxnId,
  pending = false,
}: {
  isOwner: boolean;
  isFavorited: boolean;
  onFavorite: () => void;
  onShare: () => void;
  onClone: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onManagePricing: () => void;
  fxnId: string;
  pending?: boolean;
}) {
  return (
    <>
      {/* Mobile Layout: Icon buttons + Dropdown */}
      <div className="flex items-center gap-2 w-full">
        {/* Primary actions - icon only */}
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={onFavorite}
          className="h-9 w-9 p-0"
          title={isFavorited ? "Favorited" : "Favorite"}
        >
          <Heart
            className={`h-4 w-4 ${
              isFavorited ? "fill-current text-red-500" : ""
            }`}
          />
        </Button>

        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={onShare}
          className="h-9 w-9 p-0"
          title="Share"
        >
          <Share2 className="h-4 w-4" />
        </Button>

        {/* More menu for additional actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-9 w-9 p-0"
              title="More actions"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <ReportToolDialog
              fxnId={fxnId}
              triggerButton={
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <Flag className="mr-2 h-4 w-4" />
                  Report
                </DropdownMenuItem>
              }
            />
            
            <DropdownMenuItem onClick={onClone} disabled={pending}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Clone
            </DropdownMenuItem>

            {isOwner && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onEdit} disabled={pending}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                
                <DropdownMenuItem onClick={onManagePricing} disabled={pending}>
                  <DollarSign className="mr-2 h-4 w-4" />
                  Manage Pricing
                </DropdownMenuItem>

                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={onDelete} 
                  disabled={pending}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}

export default function FxnPage() {
  const [, paramsById] = useRoute("/fxn/:id");
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [results, setResults] = useState<any>(null);
  const [isFavorited, setIsFavorited] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);
  const [related, setRelated] = useState<Fxn[]>([]);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const key = paramsById?.id;

  // Fetch fxn details
  const { data: fxnData, isLoading } = useQuery<{ fxn: Fxn }>({
    queryKey: ["/api/tools", key],
    queryFn: async () => {
      const url = `/api/tools/${key}`;
      const res = await fetch(url, { credentials: "include", headers: { 'X-Requested-With': 'fetch' } });
      if (!res.ok) throw new Error("Failed to fetch tool");
      return res.json();
    },
    enabled: !!key,
  });

  const fxn = fxnData?.fxn;

  // Fetch tags for this tool (use fxn.id, not slug)
  const { data: tagsData } = useQuery<{ tags: Array<{ id: string; name: string; slug: string; color: string | null }> }>({
    queryKey: [`/api/tags/for-tool/${fxn?.id}`],
    queryFn: async () => {
      const res = await fetch(`/api/tags/for-tool/${fxn?.id}`, { credentials: 'include', headers: { 'X-Requested-With': 'fetch' } });
      if (!res.ok) throw new Error('Failed to fetch tags');
      return res.json();
    },
    enabled: !!fxn?.id,
  });

  const tags = tagsData?.tags || [];

  const handleTagClick = (tagSlug: string) => {
    setLocation(`/explore?tags=${tagSlug}`);
  };

  // ---------------- Schema helpers for CUSTOM tools ----------------

  type OutputRendererKind =
    | "text"
    | "badge"
    | "list"
    | "table"
    | "json"
    | "wheel";
  type OutputSpec = {
    type: "string" | "number" | "list" | "table" | "json";
    label?: string;
    renderer?: OutputRendererKind;
  };
  const safeParse = <T,>(raw: any, fb: T): T => {
    try {
      return typeof raw === "string" ? JSON.parse(raw) : raw ?? fb;
    } catch {
      return fb;
    }
  };

  const coerceList = (v: any) =>
    Array.isArray(v)
      ? v.map(String).filter(Boolean)
      : String(v ?? "")
          .split(/\r?\n|,/)
          .map((s) => s.trim())
          .filter(Boolean);

  const buildInitial = (schemaObj: Record<string, InputSpec>) => {
    const init: Record<string, any> = {};
    for (const [k, spec] of Object.entries(schemaObj)) {
      if (spec.hidden) continue;
      switch (spec.type) {
        case "string":
        case "textarea":
          init[k] = spec.default ?? "";
          break;
        case "number":
          init[k] = spec.default ?? 0;
          break;
        case "boolean":
          init[k] = spec.default ?? false;
          break;
        case "select":
          init[k] = spec.default ?? spec.options?.[0] ?? "";
          break;
        case "multiselect":
          init[k] = Array.isArray(spec.default)
            ? spec.default.join("\n")
            : typeof spec.default === "string"
            ? spec.default
            : "";
          break;
        case "list":
          init[k] = Array.isArray(spec.default)
            ? spec.default.join("\n")
            : typeof spec.default === "string"
            ? spec.default
            : "";
          break;
        default:
          init[k] = "";
      }
    }
    return init;
  };

  function Wheel({
    names,
    highlight,
  }: {
    names: string[];
    highlight?: string;
  }) {
    const n = Math.max(1, names.length);
    const stops = names
      .map((_, i) => {
        const start = (i / n) * 360;
        const end = ((i + 1) / n) * 360;
        const hue = Math.round((i / n) * 360);
        return `${`hsl(${hue} 70% 60%)`} ${start}deg ${end}deg`;
      })
      .join(", ");
    const style: React.CSSProperties = {
      background: `conic-gradient(${stops})`,
    };
    return (
      <div className="flex items-center gap-4">
        <div
          className="relative w-44 h-44 rounded-full shadow border overflow-hidden"
          style={style}
        >
          <div className="absolute left-1/2 -translate-x-1/2 -top-2 w-0 h-0 border-l-8 border-r-8 border-b-[14px] border-l-transparent border-r-transparent border-b-black" />
        </div>
        <ul className="list-disc pl-5 max-h-44 overflow-auto text-sm">
          {names.map((nm, i) => (
            <li key={i} className={nm === highlight ? "font-semibold" : ""}>
              {nm}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  function OutputRenderer({
    schemaObj,
    data,
  }: {
    schemaObj: Record<string, OutputSpec>;
    data: any;
  }) {
    const rows = Object.entries(schemaObj);
    if (rows.length === 0) return null;
    return (
      <div className="space-y-4">
        {rows.map(([key, spec]) => {
          const label = spec.label ?? key;
          const v = data?.[key];
          const r = (spec.renderer ?? "text") as OutputRendererKind;
          if (r === "badge")
            return (
              <div key={key}>
                <div className="text-sm text-gray-600">{label}</div>
                <Badge variant="secondary">{String(v ?? "—")}</Badge>
              </div>
            );
          if (r === "list") {
            const list = Array.isArray(v) ? v : coerceList(v);
            return (
              <div key={key}>
                <div className="text-sm font-medium">{label}</div>
                <ul className="list-disc pl-5 text-sm">
                  {list.map((it, i) => (
                    <li key={i}>{String(it)}</li>
                  ))}
                </ul>
              </div>
            );
          }
          if (r === "table") {
            const arr = Array.isArray(v) ? v : [];
            const cols = Object.keys(arr[0] ?? {});
            return (
              <div key={key} className="space-y-1">
                <div className="text-sm font-medium">{label}</div>
                <div className="overflow-x-auto border rounded">
                  <table className="min-w-full text-xs sm:text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        {cols.map((c) => (
                          <th key={c} className="text-left px-2 sm:px-3 py-2 whitespace-nowrap">
                            {c}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {arr.map((row, i) => (
                        <tr key={i} className="border-t">
                          {cols.map((c) => (
                            <td key={c} className="px-2 sm:px-3 py-2 whitespace-nowrap">
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
                <pre className="bg-gray-50 p-2 sm:p-3 rounded border text-xs overflow-x-auto break-words">
                  {JSON.stringify(v, null, 2)}
                </pre>
              </div>
            );
          }
          if (r === "wheel") {
            const names = Array.isArray(v) ? v.map(String) : coerceList(v);
            return (
              <div key={key}>
                <div className="text-sm font-medium">{label}</div>
                <Wheel names={names} />
              </div>
            );
          }
          return (
            <div key={key}>
              <div className="text-sm text-gray-600">{label}</div>
              <div className="text-base">{String(v ?? "—")}</div>
            </div>
          );
        })}
      </div>
    );
  }

  // Keep just this ONE definition in fxn-page.tsx

  // ---------------- Run mutation (works for builtin & custom) ----------------

  // Check access for paid tools
  const { data: accessData, isError, isLoading: isLoadingAccess } = useQuery({
    queryKey: ['tool-access', fxn?.id],
    queryFn: async () => {
      if (!fxn?.id) return null;
      const res = await apiRequest('GET', `/api/marketplace/check-access/${fxn.id}`);
      if (!res.ok) throw new Error('Failed to check access');
      return res.json();
    },
    enabled: !!fxn?.id,
  });

  // Default to false when error occurs or access check fails
  const hasAccess = isError ? false : (accessData?.hasAccess ?? false);
  const accessReason = accessData?.reason;
  const toolPricing = accessData?.pricing;

  const [showPurchaseModal, setShowPurchaseModal] = useState(false);

  const runMutation = useMutation({
    mutationFn: async (inputs: any) => {
      // Check access before running
      if (!hasAccess) {
        setShowPurchaseModal(true);
        throw new Error('You need to purchase this tool to use it');
      }

      const res = await fetch(`/api/tools/${key}/run`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(user ? { Authorization: `Bearer ${user.id}` } : {}),
          'X-Requested-With': 'fetch',
        },
        body: JSON.stringify(inputs),
        credentials: "include",
      });
      const json = await res.json();
      
      // Handle Pro tier required error from server
      if (!res.ok && json?.error?.code === 'PRO_REQUIRED') {
        toast({
          title: 'Pro Subscription Required',
          description: (
            <div>
              <p className="mb-2">This tool requires a Pro subscription to use.</p>
              <Button
                size="sm"
                onClick={() => setLocation('/pricing')}
                className="mt-2"
              >
                Upgrade to Pro
              </Button>
            </div>
          ),
          variant: 'default',
        });
        throw new Error(json.error.message);
      }
      
      // Handle purchase required error from server
      if (!res.ok && json?.error?.code === 'PURCHASE_REQUIRED') {
        setShowPurchaseModal(true);
        throw new Error(json.error.message);
      }
      
      if (!res.ok) throw new Error(json?.error?.message || "Failed to run fxn");
      return json;
    },
    onSuccess: (data: any) => {
      setResults(data.outputs);
      setDuration(data.durationMs);
      toast({
        title: "Success!",
        description: "Function executed successfully",
      });
    },
    onError: (error: Error) => {
      setResults({ error: error.message });
      toast({
        title: "Execution failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Favorite mutation
  const favoriteMutation = useMutation({
    mutationFn: async (action: "add" | "remove") => {
      if (!user) throw new Error("You must be logged in to favorite tools");

      const method = action === "add" ? "POST" : "DELETE";
      await apiRequest(method, `/api/tools/${fxn?.id}/favorite`);
    },
    onSuccess: (_: any, action: any) => {
      setIsFavorited(action === "add");
      toast({
        title:
          action === "add" ? "Added to favorites" : "Removed from favorites",
        description:
          action === "add"
            ? "Tool has been added to your favorites"
            : "Tool has been removed from your favorites",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update favorites",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getIcon = (category: string) => {
    switch (category) {
      case "calculator":
        return Calculator;
      case "converter":
        return ArrowRightLeft;
      case "developer":
        return Code;
      case "health":
        return Dumbbell;
      case "design":
        return Palette;
      case "finance":
        return TrendingUp;
      default:
        return Calculator;
    }
  };

  const getIconColor = (category: string) => {
    switch (category) {
      case "calculator":
        return "bg-primary-100 text-primary-600";
      case "converter":
        return "bg-violet-100 text-violet-600";
      case "developer":
        return "bg-emerald-100 text-emerald-600";
      case "health":
        return "bg-orange-100 text-orange-600";
      case "design":
        return "bg-pink-100 text-pink-600";
      case "finance":
        return "bg-indigo-100 text-indigo-600";
      default:
        return "bg-primary-100 text-primary-600";
    }
  };

  // Build form fields.  First try to parse `fxn.inputSchema` and map each entry
  // onto our FormField type.  If parsing fails or returns nothing, fall back
  // to a hard‑coded mapping for legacy tools.
  const getFormFields = (): FormField[] => {
    if (!fxn) return [];
    try {
      const schemaObj: Record<string, any> = safeParse<any>(
        (fxn as any).inputSchema ?? "",
        {}
      );
      const dynamicFields: FormField[] = [];
      for (const [name, spec] of Object.entries(schemaObj)) {
        if (!spec || (spec as any).hidden) continue;
        const field: FormField = {
          name,
          type: "string",
          label: (spec as any).label ?? name,
          placeholder: (spec as any).placeholder,
          required: (spec as any).required,
        };
        switch ((spec as any).type) {
          case "string":
            field.type = "string";
            field.defaultValue = (spec as any).default;
            break;
          case "textarea":
            field.type = "textarea";
            field.defaultValue = (spec as any).default;
            break;
          case "number":
            field.type = "number";
            field.min = (spec as any).min;
            field.max = (spec as any).max;
            field.defaultValue = (spec as any).default;
            break;
          case "boolean":
            field.type = "boolean";
            field.defaultValue = (spec as any).default;
            break;
          case "list":
            field.type = "textarea";
            field.defaultValue = Array.isArray((spec as any).default)
              ? (spec as any).default.join("\n")
              : (spec as any).default;
            break;
          case "select":
          case "multiselect":
          case "enum":
            field.type = "enum";
            field.options = (spec as any).options;
            field.defaultValue = (spec as any).default;
            break;
          default:
            field.type = "string";
        }
        dynamicFields.push(field);
      }
      if (dynamicFields.length > 0) {
        return dynamicFields;
      }
    } catch {
      // ignore parse errors and fall through
    }
    // fall back to the legacy switch for older built‑in fxns
    switch (fxn.slug) {
      case "tip-calculator":
        return [
          {
            name: "subtotal",
            type: "number",
            label: "Bill Subtotal ($)",
            placeholder: "0.00",
            required: true,
            min: 0,
          },
          {
            name: "tipPercentage",
            type: "number",
            label: "Tip Percentage (%)",
            placeholder: "20",
            required: true,
            min: 0,
            max: 100,
            defaultValue: 20,
          },
          {
            name: "taxPercentage",
            type: "number",
            label: "Tax Percentage (%)",
            placeholder: "8.25",
            min: 0,
            max: 100,
            defaultValue: 0,
          },
          {
            name: "numberOfPeople",
            type: "number",
            label: "Number of People",
            placeholder: "1",
            min: 1,
            defaultValue: 1,
          },
        ];
      case "unit-converter":
        return [
          {
            name: "value",
            type: "number",
            label: "Value",
            placeholder: "100",
            required: true,
          },
          {
            name: "unitType",
            type: "enum",
            label: "Unit Type",
            required: true,
            options: [
              "length",
              "mass",
              "temperature",
              "volume",
              "area",
              "time",
            ],
          },
          {
            name: "fromUnit",
            type: "string",
            label: "From Unit",
            placeholder: "ft",
            required: true,
          },
          {
            name: "toUnit",
            type: "string",
            label: "To Unit",
            placeholder: "m",
            required: true,
          },
        ];
      case "json-formatter":
        return [
          {
            name: "jsonString",
            type: "textarea",
            label: "JSON String",
            placeholder: "Paste your JSON here...",
            required: true,
          },
          {
            name: "action",
            type: "enum",
            label: "Action",
            options: ["format", "minify", "validate"],
            defaultValue: "format",
          },
          {
            name: "indentSize",
            type: "number",
            label: "Indent Size",
            min: 1,
            max: 8,
            defaultValue: 2,
          },
        ];
      case "regex-tester":
        return [
          {
            name: "pattern",
            type: "string",
            label: "Regex Pattern",
            placeholder: "[a-zA-Z0-9]+",
            required: true,
          },
          {
            name: "flags",
            type: "string",
            label: "Flags",
            placeholder: "g",
            defaultValue: "g",
          },
          {
            name: "testString",
            type: "textarea",
            label: "Test String",
            placeholder: "Enter text to test...",
            required: true,
          },
          {
            name: "operation",
            type: "enum",
            label: "Operation",
            options: ["test", "match", "replace"],
            defaultValue: "match",
          },
          {
            name: "replacement",
            type: "string",
            label: "Replacement (for replace operation)",
            placeholder: "replacement text",
          },
        ];
      case "loan-payment":
        return [
          {
            name: "principal",
            type: "number",
            label: "Principal ($)",
            placeholder: "250000",
            required: true,
            min: 0,
          },
          {
            name: "annualInterestRate",
            type: "number",
            label: "Annual Interest Rate (%)",
            placeholder: "4.5",
            required: true,
            min: 0,
            max: 100,
          },
          {
            name: "termYears",
            type: "number",
            label: "Term (Years)",
            placeholder: "30",
            required: true,
            min: 1,
          },
          {
            name: "paymentFrequency",
            type: "enum",
            label: "Payment Frequency",
            options: ["monthly", "weekly", "biweekly"],
            defaultValue: "monthly",
          },
        ];
      case "workout-generator":
        return [
          {
            name: "daysPerWeek",
            type: "number",
            label: "Days Per Week",
            placeholder: "3",
            required: true,
            min: 1,
            max: 7,
          },
          {
            name: "level",
            type: "enum",
            label: "Fitness Level",
            options: ["beginner", "intermediate", "advanced"],
            required: true,
          },
          {
            name: "focusArea",
            type: "enum",
            label: "Focus Area",
            options: ["strength", "cardio", "flexibility", "full-body"],
            defaultValue: "full-body",
          },
          {
            name: "duration",
            type: "number",
            label: "Duration (minutes)",
            placeholder: "30",
            min: 15,
            max: 120,
            defaultValue: 30,
          },
          {
            name: "equipment",
            type: "enum",
            label: "Equipment",
            options: ["none", "basic", "gym"],
            defaultValue: "none",
          },
        ];
      default:
        return [];
    }
  };

  // Check if this is a custom tool (legacy or tool builder)
  const isCustom = !!fxn && ((fxn as any).codeKind === "custom" || (fxn as any).codeKind === "config");
  
  // Memoize parsed schemas so the form doesn't rebuild each keystroke
  // Handle both legacy inputSchema and new tool builder inputConfig formats
  const inputSchemaObj = useMemo(() => {
    if (!isCustom) return {};
    
    // Try to get inputConfig first (tool builder format)
    const inputConfigStr = (fxn as any)?.inputConfig ?? "";
    if (inputConfigStr) {
      const inputConfig = safeParse<any[]>(inputConfigStr, []);
      if (Array.isArray(inputConfig) && inputConfig.length > 0) {
        return convertInputConfigToInputSpec(inputConfig);
      }
    }
    
    // Fall back to legacy inputSchema format
    return safeParse<Record<string, InputSpec>>(fxn?.inputSchema, {});
  }, [isCustom, fxn?.inputSchema, (fxn as any)?.inputConfig]);
  const outputSchemaObj = useMemo(
    () =>
      isCustom
        ? safeParse<Record<string, OutputSpec>>(fxn?.outputSchema, {})
        : {},
    [isCustom, fxn?.outputSchema]
  );
  const [customValues, setCustomValues] = useState<Record<string, any>>(() =>
    isCustom ? buildInitial(inputSchemaObj) : {}
  );
  useEffect(() => {
    if (isCustom) setCustomValues(buildInitial(inputSchemaObj));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCustom, fxn?.id]); // ← runs once per tool; not on every keystroke

  useEffect(() => {
    if (!fxn) return;
    (async () => {
      // Track view
      try {
        await fetch(`/api/discovery/views/${fxn.id}`, {
          method: 'POST',
          headers: { 'X-Requested-With': 'XMLHttpRequest' },
          credentials: 'include',
        });
      } catch (error) {
        // Silently fail view tracking
      }

      // Load related tools
      const res = await apiRequest("GET", `/api/tools/${fxn.id}/related`);
      const json = await res.json();

      const list: Fxn[] = (json.fxns ?? [])
        .filter((x: Fxn) => x.id !== fxn.id)
        .slice(0, 6);
      setRelated(list);
    })();
  }, [fxn?.id, fxn?.category]);

  const handleFavorite = () => {
    if (!user) {
      setLocation("/auth");
      return;
    }
    favoriteMutation.mutate(isFavorited ? "remove" : "add");
  };

  const handleCopyResults = () => {
    if (results) {
      navigator.clipboard.writeText(JSON.stringify(results, null, 2));
      toast({
        title: "Copied to clipboard",
        description: "Results have been copied to your clipboard",
      });
    }
  };

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast({
      title: "Link copied",
      description: "Share link has been copied to your clipboard",
    });
  };

  const cloneMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("You must be logged in to clone tools");
      const res = await apiRequest("POST", `/api/tools/${fxn?.id}/clone`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? "Clone failed");
      return json.fxn as Fxn;
    },
    onSuccess: (newFxn) => {
      toast({ title: "Cloned", description: `Created "${newFxn.title}"` });
      setLocation(`/fxn/${newFxn.id}`);
    },
    onError: (e: Error) =>
      toast({
        title: "Clone failed",
        description: e.message,
        variant: "destructive",
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("You must be logged in");
      const res = await apiRequest("DELETE", `/api/tools/${fxn?.id}`);
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j?.error?.message ?? "Delete failed");
      }
    },
    onSuccess: () => {
      toast({ title: "Deleted", description: "Tool removed" });
      setLocation("/dashboard");
    },
    onError: (e: Error) =>
      toast({
        title: "Delete failed",
        description: e.message,
        variant: "destructive",
      }),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50">
        {/* <NavigationHeader /> */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="animate-pulse">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="p-8">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-16 h-16 bg-gray-200 rounded-xl"></div>
                    <div>
                      <div className="h-6 bg-gray-200 rounded mb-2 w-48"></div>
                      <div className="h-4 bg-gray-200 rounded mb-2 w-64"></div>
                      <div className="h-3 bg-gray-200 rounded w-32"></div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="h-64 bg-gray-200 rounded"></div>
                  <div className="h-64 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!fxn) {
    return (
      <div className="min-h-screen bg-neutral-50">
        {/* <NavigationHeader /> */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Tool Not Found
          </h1>
          <p className="text-gray-600 mb-8">
            The requested tool could not be found.
          </p>
          <Button
            onClick={() => setLocation("/explore")}
            data-testid="button-back-to-discover"
          >
            Back to Explore
          </Button>
        </div>
      </div>
    );
  }

  const runs = (fxn as any).runCount ?? 0;
  const Icon = getIcon(fxn.category);
  const formFields = getFormFields();

  return (
    <>
      <SEO
        title={fxn.title}
        description={fxn.description || `Try ${fxn.title} - a powerful micro-tool for ${fxn.category} tasks`}
        canonicalUrl={`https://www.fxns.ca/fxn/${fxn.slug || fxn.id}`}
        ogType="article"
      />
      <StructuredData
        type="SoftwareApplication"
        name={fxn.title}
        description={fxn.description || ''}
        url={`https://www.fxns.ca/fxn/${fxn.slug || fxn.id}`}
        category={fxn.category}
        ratingValue={(fxn as any).avgRating}
        ratingCount={(fxn as any).ratingCount}
      />
      <div className="min-h-screen bg-neutral-50">
        {/* <NavigationHeader /> */}
      <div>
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Card className="shadow-lg border border-gray-200 overflow-hidden">
              <CardContent className="p-4 sm:p-8">
                {/* Mobile Layout: Stack everything vertically */}
                <div className="flex flex-col gap-4">
                  {/* Tool Icon + Title Section */}
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    {/* Icon and Title Group */}
                    <div className="flex items-start gap-3 sm:gap-4 flex-1">
                      <div
                        className={`w-12 h-12 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center flex-shrink-0 ${getIconColor(
                          fxn.category
                        )}`}
                      >
                        <Icon className="h-6 w-6 sm:h-8 sm:w-8" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 sm:gap-3 mb-2 flex-wrap">
                          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                            {fxn.title}
                          </h1>
                          {fxn.accessTier === 'pro' && (
                            <Badge className="bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 dark:from-purple-900/20 dark:to-pink-900/20 dark:text-purple-300">
                              PRO
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm sm:text-base text-gray-600 mb-3">{fxn.description}</p>
                        
                        {tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {tags.map((tag) => (
                              <TagBadge
                                key={tag.id}
                                name={tag.name}
                                color={tag.color || undefined}
                                onClick={() => handleTagClick(tag.slug)}
                                className="text-xs"
                              />
                            ))}
                          </div>
                        )}
                        
                        <div className="flex items-center flex-wrap gap-x-4 gap-y-2 text-xs sm:text-sm text-gray-500">
                          <span className="flex items-center">
                            <Play className="mr-1 h-3 w-3" />
                            {nf.format(runs)} runs
                          </span>
                          {duration != null && (
                            <span className="flex items-center">
                              <Clock className="mr-1 h-3 w-3" />
                              {duration}ms
                            </span>
                          )}
                          <Badge className="capitalize text-xs">{fxn.category}</Badge>
                        </div>
                      </div>
                    </div>

                    {/* Desktop Actions Bar - shown on desktop only, aligned to top */}
                    <div className="hidden sm:block">
                      <ActionsBar
                        isOwner={user?.id === fxn?.createdBy}
                        isFavorited={isFavorited}
                        pending={
                          favoriteMutation.isPending
                        }
                        onFavorite={handleFavorite}
                        onShare={handleShare}
                        onClone={() => cloneMutation.mutate()}
                        onEdit={() =>
                          setLocation(`/create-tool?draft=${fxn.id}`)
                        }
                        onManagePricing={() => setShowPricingModal(true)}
                        fxnId={fxn.id}
                        onDelete={() => deleteMutation.mutate()}
                      />
                    </div>
                  </div>

                  {/* Mobile Actions Bar - shown on mobile only, below description */}
                  <div className="sm:hidden">
                    <ActionsBar
                      isOwner={user?.id === fxn?.createdBy}
                      isFavorited={isFavorited}
                      pending={
                        favoriteMutation.isPending
                      }
                      onFavorite={handleFavorite}
                      onShare={handleShare}
                      onClone={() => cloneMutation.mutate()}
                      onEdit={() =>
                        setLocation(`/create-tool?draft=${fxn.id}`)
                      }
                      onManagePricing={() => setShowPricingModal(true)}
                      fxnId={fxn.id}
                      onDelete={() => deleteMutation.mutate()}
                    />
                  </div>
                </div>

                <Separator className="my-6 sm:my-8" />

                {/* Purchase Section - Show if tool requires purchase and user doesn't have access */}
                {toolPricing && toolPricing.pricingModel !== 'free' && !hasAccess && user && user.id !== fxn.createdBy && (
                  <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 mb-6">
                    <CardContent className="p-6">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                            <Lock className="h-6 w-6 text-green-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-semibold text-gray-900 mb-1">
                              Purchase Required
                            </h3>
                            <p className="text-sm text-gray-600 mb-2">
                              This tool requires a one-time purchase to unlock full access.
                            </p>
                            <div className="flex items-center gap-2 text-2xl font-bold text-green-700">
                              <DollarSign className="h-6 w-6" />
                              {(toolPricing.price / 100).toFixed(2)}
                              <span className="text-sm font-normal text-gray-600">one-time payment</span>
                            </div>
                          </div>
                        </div>
                        <Button 
                          size="lg"
                          className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
                          onClick={() => setShowPurchaseModal(true)}
                        >
                          <ShoppingCart className="mr-2 h-5 w-5" />
                          Purchase Now
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Login prompt - Show if not logged in and tool requires purchase */}
                {toolPricing && toolPricing.pricingModel !== 'free' && !user && (
                  <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50 mb-6">
                    <CardContent className="p-6">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <Lock className="h-6 w-6 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-semibold text-gray-900 mb-1">
                              Premium Tool
                            </h3>
                            <p className="text-sm text-gray-600 mb-2">
                              Sign in to purchase this tool for ${(toolPricing.price / 100).toFixed(2)}
                            </p>
                          </div>
                        </div>
                        <Button 
                          size="lg"
                          className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto"
                          onClick={() => setLocation('/login?redirect=' + encodeURIComponent(window.location.pathname))}
                        >
                          Sign In to Purchase
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
                  {/* Input Form */}
                  <div className="min-w-0">
                    {isCustom ? (
                      <Card className="border border-gray-200">
                        <CardContent className="p-4 sm:p-6 space-y-4">
                          <h3 className="text-lg font-semibold text-gray-900">
                            Input Parameters
                          </h3>
                          {Object.keys(inputSchemaObj).length === 0 ? (
                            <div className="text-sm text-gray-500">
                              No input schema defined
                            </div>
                          ) : (
                            <InputForm
                              schemaObj={inputSchemaObj}
                              value={customValues}
                              onChange={setCustomValues}
                            />
                          )}
                          <Button
                            onClick={() => {
                              // coerce 'list' to arrays before sending
                              const coerced: Record<string, any> = {};
                              for (const [k, spec] of Object.entries(
                                inputSchemaObj
                              )) {
                                const raw = customValues[k];
                                if (
                                  spec.type === "list" ||
                                  spec.type === "multiselect"
                                ) {
                                  coerced[k] = coerceList(raw);
                                } else if (spec.type === "number") {
                                  const n =
                                    typeof raw === "string" ? Number(raw) : raw;
                                  coerced[k] = Number.isFinite(n)
                                    ? n
                                    : undefined;
                                } else {
                                  coerced[k] = raw;
                                }
                              }
                              runMutation.mutate(coerced);
                            }}
                            disabled={runMutation.isPending}
                            className="flex items-center gap-2"
                          >
                            <Play className="h-4 w-4" />
                            {runMutation.isPending ? "Running…" : "Run"}
                          </Button>
                        </CardContent>
                      </Card>
                    ) : (
                      <DynamicForm
                        fields={formFields}
                        onSubmit={(data) => runMutation.mutate(data)}
                        isLoading={runMutation.isPending}
                        title="Input Parameters"
                        submitText="Run"
                      />
                    )}
                  </div>

                  {/* Results Panel */}
                  <div className="min-w-0">
                    <Card className="border border-gray-200">
                      <CardContent className="p-4 sm:p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-6">
                          Results
                        </h3>
                        {results ? (
                          <div>
                            {/* Check for formatted output sections from visual builder tools */}
                            {results.sections && Array.isArray(results.sections) ? (
                              <div className="space-y-4 mb-4">
                                {results.sections
                                  .filter((section: any) => section.visible !== false)
                                  .map((section: any, idx: number) => (
                                    <div key={idx} className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-lg p-4 sm:p-5 overflow-x-auto">
                                      {section.title && (
                                        <h4 className="text-sm sm:text-base font-semibold text-gray-900 mb-3">
                                          {section.title}
                                        </h4>
                                      )}
                                      <div className="text-gray-700 whitespace-pre-wrap font-mono text-xs sm:text-sm break-words">
                                        {section.content}
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            ) : isCustom &&
                            Object.keys(outputSchemaObj).length > 0 ? (
                              <OutputRenderer
                                schemaObj={outputSchemaObj}
                                data={results}
                              />
                            ) : (
                              <div className="bg-gray-50 rounded-lg p-4 sm:p-6 mb-4 overflow-x-auto">
                                <pre className="text-xs sm:text-sm text-gray-800 whitespace-pre-wrap break-words">
                                  {JSON.stringify(results, null, 2)}
                                </pre>
                              </div>
                            )}
                            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handleCopyResults}
                                className="flex-1"
                                data-testid="button-copy"
                              >
                                <Copy className="mr-2 h-4 w-4" />
                                Copy
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handleShare}
                                className="flex-1"
                                data-testid="button-share"
                              >
                                <Share2 className="mr-2 h-4 w-4" />
                                Share
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setResults(null)}
                                className="flex-1"
                                data-testid="button-reset"
                              >
                                <RotateCcw className="mr-2 h-4 w-4" />
                                Reset
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-12">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                              <Play className="h-8 w-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                              Ready to run
                            </h3>
                            <p className="text-gray-600">
                              Fill out the form on the left and click "Run" to
                              see your results here.
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
                {related.length > 0 && (
                  <section className="mt-10">
                    <h2 className="text-lg font-semibold mb-3">
                      Related tools
                    </h2>
                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                      {related.map((t) => {
                        const Icon = getIcon(t.category);
                        const color = getIconColor(t.category);
                        return (
                          <Card
                            key={t.id}
                            onClick={() => setLocation(`/fxn/${t.id}`)}
                            className="cursor-pointer hover:shadow"
                          >
                            <CardContent className="p-4 space-y-2">
                              <div
                                className={`inline-flex items-center justify-center rounded-md px-2 py-1 text-xs ${color}`}
                              >
                                <Icon className="h-4 w-4 mr-1" /> {t.category}
                              </div>
                              <div className="font-medium">{t.title}</div>
                              <p className="text-sm text-gray-600 line-clamp-2">
                                {t.description}
                              </p>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* Ratings and Reviews */}
                <RatingsAndReviews fxnId={fxn.id} />
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
      
      {/* Purchase Modal */}
      {toolPricing && (
        <PurchaseToolModal
          open={showPurchaseModal}
          onOpenChange={setShowPurchaseModal}
          fxnId={fxn.id}
          fxnTitle={fxn.title}
          pricing={toolPricing}
          onSuccess={() => {
            // Refetch access data
            window.location.reload();
          }}
        />
      )}
      
      {/* Pricing Modal for Owners */}
      {user?.id === fxn?.createdBy && (
        <ToolPricingModal
          open={showPricingModal}
          onOpenChange={setShowPricingModal}
          fxnId={fxn.id}
        />
      )}
      </div>
    </>
  );
}
