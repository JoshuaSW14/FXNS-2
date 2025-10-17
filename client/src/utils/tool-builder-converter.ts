// InputSpec type definition (matching fxn-page.tsx)
type BaseSpec = {
  label?: string;
  required?: boolean;
  hidden?: boolean;
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

/**
 * Converts tool builder inputConfig (FormField array) to legacy inputSchema format
 * for compatibility with function view page
 */
export function convertInputConfigToInputSpec(inputConfig: any[]): Record<string, InputSpec> {
  const converted: Record<string, InputSpec> = {};
  
  inputConfig.forEach((field: any) => {
    if (!field.id || !field.type) return;
    
    // Map tool builder field types to InputSpec types
    let specType: InputSpec['type'];
    switch (field.type) {
      case 'number':
      case 'range':     // range maps to number
        specType = 'number';
        break;
      case 'boolean':
      case 'checkbox':  // checkbox maps to boolean
        specType = 'boolean';
        break;
      case 'select':
      case 'radio':     // radio maps to select
        specType = 'select';
        break;
      case 'textarea':
        specType = 'textarea';
        break;
      case 'text':
      case 'email':
      case 'password':
      case 'url':
      case 'date':
      case 'file':
      case 'tel':
      default:
        specType = 'string';
    }
    
    const spec: InputSpec = {
      type: specType,
      label: field.label,
      required: field.required || false,
      placeholder: field.placeholder,
      default: field.defaultValue,
    };
    
    // Add type-specific properties
    if (field.type === 'number') {
      // Check both top-level and validation nested properties for robustness
      if (field.min !== undefined) spec.min = field.min;
      else if (field.validation?.min !== undefined) spec.min = field.validation.min;
      
      if (field.max !== undefined) spec.max = field.max;
      else if (field.validation?.max !== undefined) spec.max = field.validation.max;
      
      if (field.step !== undefined) spec.step = field.step;
      else if (field.validation?.step !== undefined) spec.step = field.validation.step;
    }
    
    if ((field.type === 'select' || field.type === 'radio') && field.options) {
      spec.options = field.options.map((opt: any) => opt.value || opt.label || opt);
    }
    
    converted[field.id] = spec;
  });
  
  return converted;
}