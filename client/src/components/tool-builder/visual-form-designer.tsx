import { useState, useCallback } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
  DraggableProvided,
  DroppableProvided,
  DraggableStateSnapshot,
} from "react-beautiful-dnd";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ProBadge } from "@/components/ui/pro-badge";
import { ProUpgradeDialog } from "@/components/ui/pro-upgrade-dialog";
import { useAuth } from "@/hooks/use-auth";
import {
  Plus,
  Trash2,
  GripVertical,
  Type,
  Hash,
  ToggleLeft,
  Calendar,
  ListChecks,
  FileText,
  Mail,
  Phone,
  Link,
  Eye,
  EyeOff,
  Upload,
  CheckSquare,
  Sliders,
  Palette,
  Key,
  Clock,
  CalendarDays,
  // Advanced Field Type Icons
  FileEdit,
  MapPin,
  Star,
  PenTool,
  DollarSign,
  Code,
  QrCode,
} from "lucide-react";

import {
  FormField,
  FormFieldOption,
  migrateStringArrayToOptions,
  migrateOptionsToStringArray,
} from "@shared/tool-builder-schemas";
import { Slider } from "../ui/slider";

export type { FormField, FormFieldOption };

interface VisualFormDesignerProps {
  fields: FormField[];
  onChange: (fields: FormField[]) => void;
  onPreview: () => void;
  isPreviewMode: boolean;
}

const fieldTypes = [
  { value: "text", label: "Text Input", icon: Type, category: "basic" },
  { value: "number", label: "Number", icon: Hash, category: "basic" },
  { value: "boolean", label: "Toggle", icon: ToggleLeft, category: "basic" },
  { value: "select", label: "Dropdown", icon: ListChecks, category: "basic" },
  { value: "textarea", label: "Text Area", icon: FileText, category: "basic" },
  { value: "email", label: "Email", icon: Mail, category: "basic" },
  { value: "tel", label: "Phone", icon: Phone, category: "basic" },
  { value: "url", label: "URL", icon: Link, category: "basic" },
  { value: "date", label: "Date", icon: Calendar, category: "basic" },
  // Enhanced Field Types
  { value: "file", label: "File Upload", icon: Upload, category: "enhanced" },
  {
    value: "multiselect",
    label: "Multi-Select",
    icon: CheckSquare,
    category: "enhanced",
  },
  {
    value: "range",
    label: "Range Slider",
    icon: Sliders,
    category: "enhanced",
  },
  {
    value: "color",
    label: "Color Picker",
    icon: Palette,
    category: "enhanced",
  },
  { value: "password", label: "Password", icon: Key, category: "enhanced" },
  { value: "time", label: "Time", icon: Clock, category: "enhanced" },
  {
    value: "datetime",
    label: "Date & Time",
    icon: CalendarDays,
    category: "enhanced",
  },
  // Advanced Field Types
  {
    value: "rich_text",
    label: "Rich Text Editor",
    icon: FileEdit,
    category: "advanced",
  },
  { value: "location", label: "Location", icon: MapPin, category: "advanced" },
  { value: "rating", label: "Rating", icon: Star, category: "advanced" },
  {
    value: "signature",
    label: "Signature",
    icon: PenTool,
    category: "advanced",
  },
  {
    value: "currency",
    label: "Currency",
    icon: DollarSign,
    category: "advanced",
  },
  { value: "json", label: "JSON Editor", icon: Code, category: "advanced" },
  {
    value: "barcode",
    label: "Barcode/QR Code",
    icon: QrCode,
    category: "advanced",
  },
];

export default function VisualFormDesigner({
  fields,
  onChange,
  onPreview,
  isPreviewMode,
}: VisualFormDesignerProps) {
  const { user } = useAuth();
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [draggedItem, setDraggedItem] = useState<any>(null);
  const [showProUpgrade, setShowProUpgrade] = useState(false);
  const [pendingProFeature, setPendingProFeature] = useState<string>("");

  // Check if user has Pro subscription
  const isPro = user?.subscriptionStatus === "active";

  // Advanced field types that require Pro
  const proFieldTypes = new Set([
    "rich_text",
    "location",
    "rating",
    "signature",
    "currency",
    "json",
    "barcode",
  ]);

  const handleProFeatureClick = (fieldType: string, fieldLabel: string) => {
    if (isPro || !proFieldTypes.has(fieldType)) {
      addField(fieldType as FormField["type"]);
    } else {
      setPendingProFeature(fieldLabel);
      setShowProUpgrade(true);
    }
  };

  const generateId = () =>
    `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const addField = useCallback(
    (type: FormField["type"]) => {
      let newField: FormField;

      const baseProps = {
        id: generateId(),
        label: `${fieldTypes.find((ft) => ft.value === type)?.label || "Field"}`,
        required: false,
      };

      switch (type) {
        case "select":
          newField = {
            ...baseProps,
            type: "select",
            options: [
              { label: "Option 1", value: "option_1" },
              { label: "Option 2", value: "option_2" },
            ],
          } as FormField;
          break;
        case "number":
          newField = {
            ...baseProps,
            type: "number",
          };
          break;
        case "boolean":
          newField = {
            ...baseProps,
            type: "boolean",
          };
          break;
        case "textarea":
          newField = {
            ...baseProps,
            type: "textarea",
          };
          break;
        case "email":
          newField = {
            ...baseProps,
            type: "email",
          };
          break;
        case "tel":
          newField = {
            ...baseProps,
            type: "tel",
          };
          break;
        case "url":
          newField = {
            ...baseProps,
            type: "url",
          };
          break;
        case "date":
          newField = {
            ...baseProps,
            type: "date",
          };
          break;
        case "file":
          newField = {
            ...baseProps,
            type: "file",
            maxSize: 5,
            acceptedTypes: ["*/*"],
            multiple: false,
          };
          break;
        case "multiselect":
          newField = {
            ...baseProps,
            type: "multiselect",
            options: [
              { label: "Option 1", value: "option_1" },
              { label: "Option 2", value: "option_2" },
            ],
          };
          break;
        case "range":
          newField = {
            ...baseProps,
            type: "range",
            min: 0,
            max: 100,
            step: 1,
            showValue: true,
          };
          break;
        case "color":
          newField = {
            ...baseProps,
            type: "color",
          };
          break;
        case "password":
          newField = {
            ...baseProps,
            type: "password",
            minLength: 8,
            requireSpecialChar: false,
            requireNumber: false,
            confirmPassword: false,
          };
          break;
        case "time":
          newField = {
            ...baseProps,
            type: "time",
          };
          break;
        case "datetime":
          newField = {
            ...baseProps,
            type: "datetime",
          };
          break;
        case "rich_text":
          newField = {
            ...baseProps,
            type: "rich_text",
            enabledFeatures: ["bold", "italic", "underline", "link", "list"],
          };
          break;
        case "location":
          newField = {
            ...baseProps,
            type: "location",
            enableGeolocation: true,
            enableMap: true,
            defaultZoom: 10,
          };
          break;
        case "rating":
          newField = {
            ...baseProps,
            type: "rating",
            maxRating: 5,
            ratingType: "stars",
            allowHalfRatings: false,
            showLabels: true,
          };
          break;
        case "signature":
          newField = {
            ...baseProps,
            type: "signature",
            width: 400,
            height: 200,
            penColor: "#000000",
            backgroundColor: "#ffffff",
            lineWidth: 2,
          };
          break;
        case "currency":
          newField = {
            ...baseProps,
            type: "currency",
            currencyCode: "USD",
            locale: "en-US",
            allowDecimals: true,
            showSymbol: true,
          };
          break;
        case "json":
          newField = {
            ...baseProps,
            type: "json",
            maxDepth: 10,
            enableValidation: true,
            enableFormatting: true,
          };
          break;
        case "barcode":
          newField = {
            ...baseProps,
            type: "barcode",
            barcodeType: "qr",
            enableCamera: true,
            enableManualEntry: true,
            width: 200,
            height: 200,
          };
          break;
        default:
          newField = {
            ...baseProps,
            type: "text",
          };
      }

      onChange([...fields, newField]);
      setSelectedField(newField.id);
    },
    [fields, onChange]
  );

  const updateField = useCallback(
    (id: string, updates: Partial<FormField>) => {
      onChange(
        fields.map((field) => {
          if (field.id === id) {
            const updated = { ...field, ...updates } as FormField;
            // Ensure select fields always have options
            if (updated.type === "select" && !updated.options) {
              (updated as any).options = [
                { label: "Option 1", value: "option_1" },
                { label: "Option 2", value: "option_2" },
              ];
            }
            if (updated.type === "multiselect" && !updated.options) {
              (updated as any).options = [
                { label: "Option 1", value: "option_1" },
                { label: "Option 2", value: "option_2" },
              ];
            }
            return updated;
          }
          return field;
        })
      );
    },
    [fields, onChange]
  );

  const removeField = useCallback(
    (id: string) => {
      onChange(fields.filter((field) => field.id !== id));
      if (selectedField === id) {
        setSelectedField(null);
      }
    },
    [fields, onChange, selectedField]
  );

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      if (!result.destination) return;

      const items = Array.from(fields);
      const [reorderedItem] = items.splice(result.source.index, 1);
      items.splice(result.destination.index, 0, reorderedItem);

      onChange(items);
    },
    [fields, onChange]
  );

  const selectedFieldData = selectedField
    ? fields.find((f) => f.id === selectedField)
    : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Field Types Palette */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Field Types</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={onPreview}
            className="flex items-center gap-2"
          >
            {isPreviewMode ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
            {isPreviewMode ? "Edit" : "Preview"}
          </Button>
        </div>

        {!isPreviewMode && (
          <div className="space-y-6">
            {/* Basic Field Types */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">
                Basic Fields
              </h4>
              <div className="grid grid-cols-1 gap-2">
                {fieldTypes
                  .filter((fieldType) => fieldType.category === "basic")
                  .map((fieldType) => {
                    const Icon = fieldType.icon;
                    return (
                      <Button
                        key={fieldType.value}
                        variant="outline"
                        className="justify-start h-auto p-3 hover:bg-blue-50 hover:border-blue-300"
                        onClick={() =>
                          addField(fieldType.value as FormField["type"])
                        }
                      >
                        <Icon className="h-4 w-4 mr-2" />
                        <span className="text-sm">{fieldType.label}</span>
                      </Button>
                    );
                  })}
              </div>
            </div>

            {/* Enhanced Field Types */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">
                Enhanced Fields
                <Badge variant="secondary" className="ml-2 text-xs">
                  New
                </Badge>
              </h4>
              <div className="grid grid-cols-1 gap-2">
                {fieldTypes
                  .filter((fieldType) => fieldType.category === "enhanced")
                  .map((fieldType) => {
                    const Icon = fieldType.icon;
                    return (
                      <Button
                        key={fieldType.value}
                        variant="outline"
                        className="justify-start h-auto p-3 hover:bg-purple-50 hover:border-purple-300 border-dashed"
                        onClick={() =>
                          addField(fieldType.value as FormField["type"])
                        }
                      >
                        <Icon className="h-4 w-4 mr-2 text-purple-600" />
                        <span className="text-sm">{fieldType.label}</span>
                      </Button>
                    );
                  })}
              </div>
            </div>

            {/* Advanced Field Types */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h4 className="text-sm font-medium text-gray-700">
                  Advanced Fields
                </h4>
                <ProBadge />
              </div>
              <div className="grid grid-cols-1 gap-2">
                {fieldTypes
                  .filter((fieldType) => fieldType.category === "advanced")
                  .map((fieldType) => {
                    const Icon = fieldType.icon;
                    const isProField = proFieldTypes.has(fieldType.value);
                    const isDisabled = isProField && !isPro;

                    return (
                      <Button
                        key={fieldType.value}
                        variant="outline"
                        className={`justify-between h-auto p-3 border-dashed ${
                          isDisabled
                            ? "opacity-75 hover:bg-orange-50 hover:border-orange-300"
                            : "hover:bg-orange-50 hover:border-orange-300"
                        }`}
                        onClick={() =>
                          handleProFeatureClick(
                            fieldType.value,
                            fieldType.label
                          )
                        }
                      >
                        <div className="flex items-center">
                          <Icon
                            className={`h-4 w-4 mr-2 ${isDisabled ? "text-gray-400" : "text-orange-600"}`}
                          />
                          <span className="text-sm">{fieldType.label}</span>
                        </div>
                        {isProField && !isPro && <ProBadge size="sm" />}
                      </Button>
                    );
                  })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Form Builder Canvas */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Form Fields</h3>

        {isPreviewMode ? (
          <FormPreview fields={fields} />
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="form-fields">
              {(provided: DroppableProvided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="min-h-[400px] space-y-2"
                >
                  {fields.length === 0 ? (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                      <p className="text-gray-500">
                        Click field types on the left to add them to your form
                      </p>
                    </div>
                  ) : (
                    fields.map((field, index) => (
                      <Draggable
                        key={field.id}
                        draggableId={field.id}
                        index={index}
                      >
                        {(
                          provided: DraggableProvided,
                          snapshot: DraggableStateSnapshot
                        ) => (
                          <Card
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`${
                              selectedField === field.id
                                ? "ring-2 ring-blue-500"
                                : ""
                            } ${snapshot.isDragging ? "shadow-lg" : ""}`}
                            onClick={() => setSelectedField(field.id)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-center gap-3">
                                <div
                                  {...provided.dragHandleProps}
                                  className="cursor-grab"
                                >
                                  <GripVertical className="h-4 w-4 text-gray-400" />
                                </div>

                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">
                                      {field.label}
                                    </span>
                                    <Badge
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      {
                                        fieldTypes.find(
                                          (ft) => ft.value === field.type
                                        )?.label
                                      }
                                    </Badge>
                                    {field.required && (
                                      <Badge
                                        variant="destructive"
                                        className="text-xs"
                                      >
                                        Required
                                      </Badge>
                                    )}
                                  </div>
                                  {field.placeholder && (
                                    <p className="text-sm text-gray-500 mt-1">
                                      {field.placeholder}
                                    </p>
                                  )}
                                </div>

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeField(field.id);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </Draggable>
                    ))
                  )}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </div>

      {/* Field Properties Panel */}
      {!isPreviewMode && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Field Properties</h3>

          {selectedFieldData ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Edit{" "}
                  {
                    fieldTypes.find((ft) => ft.value === selectedFieldData.type)
                      ?.label
                  }
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="field-label">Label</Label>
                  <Input
                    id="field-label"
                    value={selectedFieldData.label}
                    onChange={(e) =>
                      updateField(selectedFieldData.id, {
                        label: e.target.value,
                      })
                    }
                    placeholder="Field label"
                  />
                </div>

                <div>
                  <Label htmlFor="field-placeholder">Placeholder</Label>
                  <Input
                    id="field-placeholder"
                    value={selectedFieldData.placeholder || ""}
                    onChange={(e) =>
                      updateField(selectedFieldData.id, {
                        placeholder: e.target.value,
                      })
                    }
                    placeholder="Placeholder text"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="field-required">Required</Label>
                  <Switch
                    id="field-required"
                    checked={selectedFieldData.required}
                    onCheckedChange={(checked) =>
                      updateField(selectedFieldData.id, { required: checked })
                    }
                  />
                </div>

                {/* Basic Field Type Configurations */}
                {selectedFieldData.type === "select" && (
                  <div>
                    <Label>Options</Label>
                    <Textarea
                      value={migrateOptionsToStringArray(
                        selectedFieldData.options
                      ).join("\n")}
                      onChange={(e) => {
                        const stringOptions = e.target.value
                          .split("\n")
                          .filter((o) => o.trim());
                        updateField(selectedFieldData.id, {
                          options: migrateStringArrayToOptions(stringOptions),
                        });
                      }}
                      placeholder="One option per line"
                      rows={4}
                    />
                  </div>
                )}

                {selectedFieldData.type === "number" && (
                  <>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label htmlFor="field-min">Min</Label>
                        <Input
                          id="field-min"
                          type="number"
                          value={selectedFieldData.min || ""}
                          onChange={(e) =>
                            updateField(selectedFieldData.id, {
                              min: e.target.value
                                ? Number(e.target.value)
                                : undefined,
                            })
                          }
                          placeholder="Min"
                        />
                      </div>
                      <div>
                        <Label htmlFor="field-max">Max</Label>
                        <Input
                          id="field-max"
                          type="number"
                          value={selectedFieldData.max || ""}
                          onChange={(e) =>
                            updateField(selectedFieldData.id, {
                              max: e.target.value
                                ? Number(e.target.value)
                                : undefined,
                            })
                          }
                          placeholder="Max"
                        />
                      </div>
                      <div>
                        <Label htmlFor="field-step">Step</Label>
                        <Input
                          id="field-step"
                          type="number"
                          value={selectedFieldData.step || ""}
                          onChange={(e) =>
                            updateField(selectedFieldData.id, {
                              step: e.target.value
                                ? Number(e.target.value)
                                : undefined,
                            })
                          }
                          placeholder="Step"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Enhanced Field Type Configurations */}
                {selectedFieldData.type === "file" && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor="field-max-size">Max Size (MB)</Label>
                        <Input
                          id="field-max-size"
                          type="number"
                          value={selectedFieldData.maxSize || 5}
                          onChange={(e) =>
                            updateField(selectedFieldData.id, {
                              maxSize: Number(e.target.value),
                            })
                          }
                          min="1"
                          max="100"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="field-multiple">Allow Multiple</Label>
                        <Switch
                          id="field-multiple"
                          checked={selectedFieldData.multiple || false}
                          onCheckedChange={(checked) =>
                            updateField(selectedFieldData.id, {
                              multiple: checked,
                            })
                          }
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="field-accepted-types">
                        Accepted File Types
                      </Label>
                      <Input
                        id="field-accepted-types"
                        value={
                          selectedFieldData.acceptedTypes?.join(", ") || "*/*"
                        }
                        onChange={(e) =>
                          updateField(selectedFieldData.id, {
                            acceptedTypes: e.target.value
                              .split(",")
                              .map((t) => t.trim())
                              .filter(Boolean),
                          })
                        }
                        placeholder=".jpg, .png, .pdf or */* for all"
                      />
                    </div>
                  </>
                )}

                {selectedFieldData.type === "multiselect" && (
                  <>
                    <div>
                      <Label>Options</Label>
                      <Textarea
                        value={migrateOptionsToStringArray(
                          selectedFieldData.options
                        ).join("\n")}
                        onChange={(e) => {
                          const stringOptions = e.target.value
                            .split("\n")
                            .filter((o) => o.trim());
                          updateField(selectedFieldData.id, {
                            options: migrateStringArrayToOptions(stringOptions),
                          });
                        }}
                        placeholder="One option per line"
                        rows={4}
                      />
                    </div>
                    <div>
                      <Label htmlFor="field-max-selections">
                        Max Selections
                      </Label>
                      <Input
                        id="field-max-selections"
                        type="number"
                        value={selectedFieldData.maxSelections || ""}
                        onChange={(e) =>
                          updateField(selectedFieldData.id, {
                            maxSelections: e.target.value
                              ? Number(e.target.value)
                              : undefined,
                          })
                        }
                        placeholder="Leave blank for no limit"
                      />
                    </div>
                  </>
                )}

                {selectedFieldData.type === "range" && (
                  <>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label htmlFor="field-range-min">Min</Label>
                        <Input
                          id="field-range-min"
                          type="number"
                          value={selectedFieldData.min || 0}
                          onChange={(e) =>
                            updateField(selectedFieldData.id, {
                              min: Number(e.target.value),
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="field-range-max">Max</Label>
                        <Input
                          id="field-range-max"
                          type="number"
                          value={selectedFieldData.max || 100}
                          onChange={(e) =>
                            updateField(selectedFieldData.id, {
                              max: Number(e.target.value),
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="field-range-step">Step</Label>
                        <Input
                          id="field-range-step"
                          type="number"
                          value={selectedFieldData.step || 1}
                          onChange={(e) =>
                            updateField(selectedFieldData.id, {
                              step: Number(e.target.value),
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="field-show-value">Show Value</Label>
                      <Switch
                        id="field-show-value"
                        checked={selectedFieldData.showValue !== false}
                        onCheckedChange={(checked) =>
                          updateField(selectedFieldData.id, {
                            showValue: checked,
                          })
                        }
                      />
                    </div>
                  </>
                )}

                {selectedFieldData.type === "password" && (
                  <>
                    <div>
                      <Label htmlFor="field-min-length">Minimum Length</Label>
                      <Input
                        id="field-min-length"
                        type="number"
                        value={selectedFieldData.minLength || 8}
                        onChange={(e) =>
                          updateField(selectedFieldData.id, {
                            minLength: Number(e.target.value),
                          })
                        }
                        min="1"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="field-require-special">
                          Require Special Character
                        </Label>
                        <Switch
                          id="field-require-special"
                          checked={
                            selectedFieldData.requireSpecialChar || false
                          }
                          onCheckedChange={(checked) =>
                            updateField(selectedFieldData.id, {
                              requireSpecialChar: checked,
                            })
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="field-require-number">
                          Require Number
                        </Label>
                        <Switch
                          id="field-require-number"
                          checked={selectedFieldData.requireNumber || false}
                          onCheckedChange={(checked) =>
                            updateField(selectedFieldData.id, {
                              requireNumber: checked,
                            })
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="field-confirm-password">
                          Confirm Password
                        </Label>
                        <Switch
                          id="field-confirm-password"
                          checked={selectedFieldData.confirmPassword || false}
                          onCheckedChange={(checked) =>
                            updateField(selectedFieldData.id, {
                              confirmPassword: checked,
                            })
                          }
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Advanced Field Type Configurations */}
                {selectedFieldData.type === "rich_text" && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor="field-min-length">Min Length</Label>
                        <Input
                          id="field-min-length"
                          type="number"
                          value={selectedFieldData.minLength || ""}
                          onChange={(e) =>
                            updateField(selectedFieldData.id, {
                              minLength: e.target.value
                                ? Number(e.target.value)
                                : undefined,
                            })
                          }
                          placeholder="Min characters"
                        />
                      </div>
                      <div>
                        <Label htmlFor="field-max-length">Max Length</Label>
                        <Input
                          id="field-max-length"
                          type="number"
                          value={selectedFieldData.maxLength || ""}
                          onChange={(e) =>
                            updateField(selectedFieldData.id, {
                              maxLength: e.target.value
                                ? Number(e.target.value)
                                : undefined,
                            })
                          }
                          placeholder="Max characters"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Enabled Features</Label>
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        {(
                          [
                            "bold",
                            "italic",
                            "underline",
                            "link",
                            "list",
                            "code",
                          ] as const
                        ).map((feature) => (
                          <div
                            key={feature}
                            className="flex items-center space-x-2"
                          >
                            <Switch
                              checked={
                                selectedFieldData.enabledFeatures?.includes(
                                  feature
                                ) || false
                              }
                              onCheckedChange={(checked) => {
                                const currentFeatures =
                                  selectedFieldData.enabledFeatures || [];
                                const newFeatures = checked
                                  ? [...currentFeatures, feature]
                                  : currentFeatures.filter(
                                      (f) => f !== feature
                                    );
                                updateField(selectedFieldData.id, {
                                  enabledFeatures: newFeatures,
                                });
                              }}
                            />
                            <Label className="text-xs capitalize">
                              {feature}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {selectedFieldData.type === "location" && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="field-enable-geolocation">
                          Enable GPS
                        </Label>
                        <Switch
                          id="field-enable-geolocation"
                          checked={selectedFieldData.enableGeolocation || true}
                          onCheckedChange={(checked) =>
                            updateField(selectedFieldData.id, {
                              enableGeolocation: checked,
                            })
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="field-enable-map">Show Map</Label>
                        <Switch
                          id="field-enable-map"
                          checked={selectedFieldData.enableMap || true}
                          onCheckedChange={(checked) =>
                            updateField(selectedFieldData.id, {
                              enableMap: checked,
                            })
                          }
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="field-default-zoom">
                        Default Zoom Level
                      </Label>
                      <Input
                        id="field-default-zoom"
                        type="number"
                        value={selectedFieldData.defaultZoom || 10}
                        onChange={(e) =>
                          updateField(selectedFieldData.id, {
                            defaultZoom: Number(e.target.value),
                          })
                        }
                        min="1"
                        max="20"
                      />
                    </div>
                    <div>
                      <Label htmlFor="field-restrict-countries">
                        Restrict to Countries (comma-separated codes)
                      </Label>
                      <Input
                        id="field-restrict-countries"
                        value={
                          selectedFieldData.restrictToCountries?.join(", ") ||
                          ""
                        }
                        onChange={(e) =>
                          updateField(selectedFieldData.id, {
                            restrictToCountries: e.target.value
                              ? e.target.value
                                  .split(",")
                                  .map((c) => c.trim())
                                  .filter(Boolean)
                              : undefined,
                          })
                        }
                        placeholder="US, CA, GB (leave blank for all)"
                      />
                    </div>
                  </>
                )}

                {selectedFieldData.type === "rating" && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor="field-max-rating">Max Rating</Label>
                        <Input
                          id="field-max-rating"
                          type="number"
                          value={selectedFieldData.maxRating || 5}
                          onChange={(e) =>
                            updateField(selectedFieldData.id, {
                              maxRating: Number(e.target.value),
                            })
                          }
                          min="3"
                          max="10"
                        />
                      </div>
                      <div>
                        <Label htmlFor="field-rating-type">Rating Type</Label>
                        <Select
                          value={selectedFieldData.ratingType || "stars"}
                          onValueChange={(
                            value: "stars" | "hearts" | "thumbs" | "numbers"
                          ) =>
                            updateField(selectedFieldData.id, {
                              ratingType: value,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="stars">Stars</SelectItem>
                            <SelectItem value="hearts">Hearts</SelectItem>
                            <SelectItem value="thumbs">Thumbs</SelectItem>
                            <SelectItem value="numbers">Numbers</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="field-allow-half">
                          Allow Half Ratings
                        </Label>
                        <Switch
                          id="field-allow-half"
                          checked={selectedFieldData.allowHalfRatings || false}
                          onCheckedChange={(checked) =>
                            updateField(selectedFieldData.id, {
                              allowHalfRatings: checked,
                            })
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="field-show-labels">Show Labels</Label>
                        <Switch
                          id="field-show-labels"
                          checked={selectedFieldData.showLabels || true}
                          onCheckedChange={(checked) =>
                            updateField(selectedFieldData.id, {
                              showLabels: checked,
                            })
                          }
                        />
                      </div>
                    </div>
                  </>
                )}

                {selectedFieldData.type === "signature" && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor="field-signature-width">
                          Width (px)
                        </Label>
                        <Input
                          id="field-signature-width"
                          type="number"
                          value={selectedFieldData.width || 400}
                          onChange={(e) =>
                            updateField(selectedFieldData.id, {
                              width: Number(e.target.value),
                            })
                          }
                          min="200"
                          max="800"
                        />
                      </div>
                      <div>
                        <Label htmlFor="field-signature-height">
                          Height (px)
                        </Label>
                        <Input
                          id="field-signature-height"
                          type="number"
                          value={selectedFieldData.height || 200}
                          onChange={(e) =>
                            updateField(selectedFieldData.id, {
                              height: Number(e.target.value),
                            })
                          }
                          min="100"
                          max="400"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label htmlFor="field-pen-color">Pen Color</Label>
                        <Input
                          id="field-pen-color"
                          type="color"
                          value={selectedFieldData.penColor || "#000000"}
                          onChange={(e) =>
                            updateField(selectedFieldData.id, {
                              penColor: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="field-bg-color">Background</Label>
                        <Input
                          id="field-bg-color"
                          type="color"
                          value={selectedFieldData.backgroundColor || "#ffffff"}
                          onChange={(e) =>
                            updateField(selectedFieldData.id, {
                              backgroundColor: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="field-line-width">Line Width</Label>
                        <Input
                          id="field-line-width"
                          type="number"
                          value={selectedFieldData.lineWidth || 2}
                          onChange={(e) =>
                            updateField(selectedFieldData.id, {
                              lineWidth: Number(e.target.value),
                            })
                          }
                          min="1"
                          max="10"
                        />
                      </div>
                    </div>
                  </>
                )}

                {selectedFieldData.type === "currency" && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor="field-currency-code">
                          Currency Code
                        </Label>
                        <Input
                          id="field-currency-code"
                          value={selectedFieldData.currencyCode || "USD"}
                          onChange={(e) =>
                            updateField(selectedFieldData.id, {
                              currencyCode: e.target.value.toUpperCase(),
                            })
                          }
                          placeholder="USD, EUR, GBP"
                          maxLength={3}
                        />
                      </div>
                      <div>
                        <Label htmlFor="field-locale">Locale</Label>
                        <Input
                          id="field-locale"
                          value={selectedFieldData.locale || "en-US"}
                          onChange={(e) =>
                            updateField(selectedFieldData.id, {
                              locale: e.target.value,
                            })
                          }
                          placeholder="en-US, de-DE, fr-FR"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor="field-currency-min">Min Value</Label>
                        <Input
                          id="field-currency-min"
                          type="number"
                          step="0.01"
                          value={selectedFieldData.min || ""}
                          onChange={(e) =>
                            updateField(selectedFieldData.id, {
                              min: e.target.value
                                ? Number(e.target.value)
                                : undefined,
                            })
                          }
                          placeholder="Minimum amount"
                        />
                      </div>
                      <div>
                        <Label htmlFor="field-currency-max">Max Value</Label>
                        <Input
                          id="field-currency-max"
                          type="number"
                          step="0.01"
                          value={selectedFieldData.max || ""}
                          onChange={(e) =>
                            updateField(selectedFieldData.id, {
                              max: e.target.value
                                ? Number(e.target.value)
                                : undefined,
                            })
                          }
                          placeholder="Maximum amount"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="field-allow-decimals">
                          Allow Decimals
                        </Label>
                        <Switch
                          id="field-allow-decimals"
                          checked={selectedFieldData.allowDecimals || true}
                          onCheckedChange={(checked) =>
                            updateField(selectedFieldData.id, {
                              allowDecimals: checked,
                            })
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="field-show-symbol">Show Symbol</Label>
                        <Switch
                          id="field-show-symbol"
                          checked={selectedFieldData.showSymbol || true}
                          onCheckedChange={(checked) =>
                            updateField(selectedFieldData.id, {
                              showSymbol: checked,
                            })
                          }
                        />
                      </div>
                    </div>
                  </>
                )}

                {selectedFieldData.type === "json" && (
                  <>
                    <div>
                      <Label htmlFor="field-max-depth">Max Depth</Label>
                      <Input
                        id="field-max-depth"
                        type="number"
                        value={selectedFieldData.maxDepth || 10}
                        onChange={(e) =>
                          updateField(selectedFieldData.id, {
                            maxDepth: Number(e.target.value),
                          })
                        }
                        min="1"
                        max="50"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="field-enable-validation">
                          Enable Validation
                        </Label>
                        <Switch
                          id="field-enable-validation"
                          checked={selectedFieldData.enableValidation || true}
                          onCheckedChange={(checked) =>
                            updateField(selectedFieldData.id, {
                              enableValidation: checked,
                            })
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="field-enable-formatting">
                          Auto Format
                        </Label>
                        <Switch
                          id="field-enable-formatting"
                          checked={selectedFieldData.enableFormatting || true}
                          onCheckedChange={(checked) =>
                            updateField(selectedFieldData.id, {
                              enableFormatting: checked,
                            })
                          }
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="field-schema-template">
                        JSON Schema Template (optional)
                      </Label>
                      <Textarea
                        id="field-schema-template"
                        value={selectedFieldData.schemaTemplate || ""}
                        onChange={(e) =>
                          updateField(selectedFieldData.id, {
                            schemaTemplate: e.target.value,
                          })
                        }
                        placeholder='{"type": "object", "properties": {...}}'
                        rows={4}
                      />
                    </div>
                  </>
                )}

                {selectedFieldData.type === "barcode" && (
                  <>
                    <div>
                      <Label htmlFor="field-barcode-type">Barcode Type</Label>
                      <Select
                        value={selectedFieldData.barcodeType || "qr"}
                        onValueChange={(
                          value: "qr" | "code128" | "ean13" | "upca" | "code39"
                        ) =>
                          updateField(selectedFieldData.id, {
                            barcodeType: value,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="qr">QR Code</SelectItem>
                          <SelectItem value="code128">Code 128</SelectItem>
                          <SelectItem value="ean13">EAN-13</SelectItem>
                          <SelectItem value="upca">UPC-A</SelectItem>
                          <SelectItem value="code39">Code 39</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor="field-barcode-width">Width (px)</Label>
                        <Input
                          id="field-barcode-width"
                          type="number"
                          value={selectedFieldData.width || 200}
                          onChange={(e) =>
                            updateField(selectedFieldData.id, {
                              width: Number(e.target.value),
                            })
                          }
                          min="100"
                          max="500"
                        />
                      </div>
                      <div>
                        <Label htmlFor="field-barcode-height">
                          Height (px)
                        </Label>
                        <Input
                          id="field-barcode-height"
                          type="number"
                          value={selectedFieldData.height || 200}
                          onChange={(e) =>
                            updateField(selectedFieldData.id, {
                              height: Number(e.target.value),
                            })
                          }
                          min="100"
                          max="500"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="field-enable-camera">
                          Enable Camera
                        </Label>
                        <Switch
                          id="field-enable-camera"
                          checked={selectedFieldData.enableCamera || true}
                          onCheckedChange={(checked) =>
                            updateField(selectedFieldData.id, {
                              enableCamera: checked,
                            })
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="field-enable-manual">
                          Manual Entry
                        </Label>
                        <Switch
                          id="field-enable-manual"
                          checked={selectedFieldData.enableManualEntry || true}
                          onCheckedChange={(checked) =>
                            updateField(selectedFieldData.id, {
                              enableManualEntry: checked,
                            })
                          }
                        />
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-gray-500">
                  Select a field to edit its properties
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Pro Upgrade Dialog */}
      <ProUpgradeDialog
        open={showProUpgrade}
        onOpenChange={setShowProUpgrade}
        feature={pendingProFeature}
        description="Advanced field types require a Pro subscription to unlock powerful form building capabilities."
      />
    </div>
  );
}

function FormPreview({ fields }: { fields: FormField[] }) {
  const [values, setValues] = useState<Record<string, any>>({});

  const handleChange = (fieldId: string, value: any) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
  };

  const getCurrencySymbol = (currencyCode: string) => {
    const symbols: Record<string, string> = {
      USD: "$",
      EUR: "€",
      GBP: "£",
      JPY: "¥",
      CAD: "C$",
      AUD: "A$",
    };
    return symbols[currencyCode] || currencyCode;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Form Preview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {fields.map((field) => (
          <div key={field.id}>
            <Label
              className={
                field.required ? "after:content-['*'] after:text-red-500" : ""
              }
            >
              {field.label}
            </Label>

            {field.type === "text" && (
              <Input
                placeholder={field.placeholder}
                value={values[field.id] || ""}
                onChange={(e) => handleChange(field.id, e.target.value)}
              />
            )}

            {field.type === "number" && (
              <Input
                type="number"
                placeholder={field.placeholder}
                value={values[field.id] || ""}
                onChange={(e) => handleChange(field.id, e.target.value)}
              />
            )}

            {field.type === "textarea" && (
              <Textarea
                placeholder={field.placeholder}
                value={values[field.id] || ""}
                onChange={(e) => handleChange(field.id, e.target.value)}
              />
            )}

            {field.type === "range" && (
              <div className="flex items-center space-x-4">
                <Slider
                  min={Number(field.min ?? 0)}
                  max={Number(field.max ?? 100)}
                  step={Number(field.step ?? 1)}
                  value={[Number(values[field.id] ?? field.min ?? 0)]}
                  onValueChange={(arr) => handleChange(field.id, arr[0])}
                  // optional: make it keyboard/focus friendly
                  aria-label={field.label ?? field.id}
                />
              </div>
            )}

            {field.type === "boolean" && (
              <div className="flex items-center space-x-2">
                <Switch
                  checked={values[field.id] || false}
                  onCheckedChange={(checked) => handleChange(field.id, checked)}
                />
              </div>
            )}

            {field.type === "select" && (
              <Select
                value={values[field.id] || ""}
                onValueChange={(value) => handleChange(field.id, value)}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={field.placeholder || "Select an option"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {(field.type === "select" ? field.options || [] : []).map(
                    (option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            )}

            {(field.type === "email" ||
              field.type === "tel" ||
              field.type === "url" ||
              field.type === "date" ||
              field.type === "time" ||
              field.type === "datetime") && (
              <Input
                type={field.type === "datetime" ? "datetime-local" : field.type}
                placeholder={field.placeholder}
                value={values[field.id] || ""}
                onChange={(e) => handleChange(field.id, e.target.value)}
              />
            )}

            {/* Advanced Field Type Previews */}
            {field.type === "rich_text" && (
              <div className="border rounded-md p-3 min-h-[100px] bg-gray-50">
                <div className="flex gap-2 mb-2 border-b pb-2">
                  {field.enabledFeatures?.includes("bold") && (
                    <button className="px-2 py-1 bg-gray-200 rounded text-xs">
                      B
                    </button>
                  )}
                  {field.enabledFeatures?.includes("italic") && (
                    <button className="px-2 py-1 bg-gray-200 rounded text-xs">
                      I
                    </button>
                  )}
                  {field.enabledFeatures?.includes("underline") && (
                    <button className="px-2 py-1 bg-gray-200 rounded text-xs">
                      U
                    </button>
                  )}
                  {field.enabledFeatures?.includes("link") && (
                    <button className="px-2 py-1 bg-gray-200 rounded text-xs">
                      🔗
                    </button>
                  )}
                  {field.enabledFeatures?.includes("list") && (
                    <button className="px-2 py-1 bg-gray-200 rounded text-xs">
                      📝
                    </button>
                  )}
                  {field.enabledFeatures?.includes("code") && (
                    <button className="px-2 py-1 bg-gray-200 rounded text-xs">
                      &lt;/&gt;
                    </button>
                  )}
                </div>
                <div className="text-gray-500 text-sm">
                  Rich text editor preview...
                </div>
              </div>
            )}

            {field.type === "location" && (
              <div className="space-y-2">
                <Input
                  placeholder="Enter address or place name"
                  value={values[field.id] || ""}
                  onChange={(e) => handleChange(field.id, e.target.value)}
                />
                {field.enableMap && (
                  <div className="h-32 bg-gray-100 border rounded flex items-center justify-center">
                    <span className="text-gray-500 text-sm">
                      🗺️ Map Preview (Zoom: {field.defaultZoom})
                    </span>
                  </div>
                )}
                {field.enableGeolocation && (
                  <Button variant="outline" size="sm" className="text-xs">
                    📍 Use Current Location
                  </Button>
                )}
              </div>
            )}

            {field.type === "rating" && (
              <div className="flex items-center gap-2">
                {Array.from({ length: field.maxRating || 5 }, (_, i) => {
                  const ratingValue = i + 1;
                  const isSelected = values[field.id] >= ratingValue;
                  const symbol =
                    field.ratingType === "hearts"
                      ? "❤️"
                      : field.ratingType === "thumbs"
                        ? "👍"
                        : field.ratingType === "numbers"
                          ? ratingValue.toString()
                          : "⭐";

                  return (
                    <button
                      key={i}
                      onClick={() => handleChange(field.id, ratingValue)}
                      className={`text-lg ${isSelected ? "opacity-100" : "opacity-30"} hover:opacity-75`}
                    >
                      {symbol}
                    </button>
                  );
                })}
                {field.showLabels && (
                  <span className="text-sm text-gray-500 ml-2">
                    {values[field.id] || 0} / {field.maxRating || 5}
                  </span>
                )}
              </div>
            )}

            {field.type === "signature" && (
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50"
                style={{
                  width: field.width || 400,
                  height: field.height || 200,
                }}
              >
                <div className="text-center text-gray-500">
                  <PenTool className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm">Signature pad preview</p>
                  <p className="text-xs">Pen: {field.penColor || "#000000"}</p>
                </div>
              </div>
            )}

            {field.type === "currency" && (
              <div className="relative">
                {field.showSymbol && (
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                    {getCurrencySymbol(field.currencyCode || "USD")}
                  </span>
                )}
                <Input
                  type={field.allowDecimals ? "number" : "text"}
                  step={field.allowDecimals ? "0.01" : "1"}
                  className={field.showSymbol ? "pl-8" : ""}
                  placeholder={
                    field.placeholder ||
                    `Enter amount in ${field.currencyCode || "USD"}`
                  }
                  value={values[field.id] || ""}
                  onChange={(e) => handleChange(field.id, e.target.value)}
                />
              </div>
            )}

            {field.type === "json" && (
              <div className="space-y-2">
                <Textarea
                  placeholder='{"key": "value"}'
                  value={values[field.id] || ""}
                  onChange={(e) => handleChange(field.id, e.target.value)}
                  rows={6}
                  className="font-mono text-sm"
                />
                {field.enableValidation && (
                  <div className="text-xs text-gray-500 flex items-center gap-2">
                    <Code className="h-3 w-3" />
                    JSON validation {field.enableFormatting &&
                      "& formatting"}{" "}
                    enabled
                  </div>
                )}
              </div>
            )}

            {field.type === "barcode" && (
              <div className="space-y-3">
                {field.enableManualEntry && (
                  <Input
                    placeholder={`Enter ${field.barcodeType?.toUpperCase()} code manually`}
                    value={values[field.id] || ""}
                    onChange={(e) => handleChange(field.id, e.target.value)}
                  />
                )}
                <div
                  className="border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50"
                  style={{
                    width: field.width || 200,
                    height: field.height || 200,
                  }}
                >
                  <div className="text-center text-gray-500">
                    <QrCode className="h-8 w-8 mx-auto mb-2" />
                    <p className="text-sm">
                      {field.barcodeType?.toUpperCase()} Preview
                    </p>
                    {field.enableCamera && (
                      <p className="text-xs">📷 Camera scan enabled</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {fields.length === 0 && (
          <p className="text-center text-gray-500 py-8">
            Add some fields to see the preview
          </p>
        )}
      </CardContent>
    </Card>
  );
}
