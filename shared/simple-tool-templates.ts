import { FormField, LogicStep, OutputConfig } from "./tool-builder-schemas";

export interface SimpleToolTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  inputConfig: FormField[];
  logicConfig: LogicStep[];
  outputConfig: OutputConfig;
  useCases?: string[];
  estimatedTime?: string;
  tutorials?: {
    title: string;
    steps: string[];
  };
}

export const SIMPLE_TOOL_TEMPLATES: SimpleToolTemplate[] = [
  {
    id: 'simple-tip-calculator',
    name: 'Tip Calculator',
    description: 'Calculate tips and split bills among friends',
    category: 'calculator',
    icon: '💰',
    tags: ['finance', 'restaurant', 'calculator'],
    difficulty: 'beginner',
    estimatedTime: '5 min',
    useCases: [
      'Calculate restaurant tips',
      'Split bills between friends',
      'Figure out group payment amounts',
      'Add gratuity to service bills'
    ],
    tutorials: {
      title: 'How to use the Tip Calculator',
      steps: [
        'Enter the total bill amount',
        'Select your desired tip percentage',
        'Choose how many people are splitting the bill',
        'View the calculated tip and per-person amounts'
      ]
    },
    inputConfig: [
      {
        id: 'bill_amount',
        type: 'number',
        label: 'Bill Amount',
        placeholder: '25.50',
        required: true,
        min: 0.01,
      },
      {
        id: 'tip_percentage',
        type: 'range',
        label: 'Tip Percentage',
        required: true,
        min: 0,
        max: 30,
        step: 1,
        showValue: true,
        defaultValue: 18,
      },
      {
        id: 'people_count',
        type: 'number',
        label: 'Number of People',
        placeholder: '2',
        required: true,
        min: 1,
        defaultValue: 1,
      }
    ],
    logicConfig: [
      {
        id: 'tip_amount',
        type: 'calculation',
        name: 'Calculate Tip Amount',
        config: {
          calculation: {
            formula: 'bill_amount * (tip_percentage / 100)',
            variables: [
              { name: 'bill_amount', fieldId: 'bill_amount' },
              { name: 'tip_percentage', fieldId: 'tip_percentage' }
            ]
          }
        }
      },
      {
        id: 'total_amount',
        type: 'calculation', 
        name: 'Calculate Total Amount',
        config: {
          calculation: {
            formula: 'bill_amount + step_tip_amount',
            variables: [
              { name: 'bill_amount', fieldId: 'bill_amount' },
              { name: 'step_tip_amount', fieldId: 'step_tip_amount' }
            ]
          }
        }
      },
      {
        id: 'per_person',
        type: 'calculation',
        name: 'Calculate Per Person',
        config: {
          calculation: {
            formula: 'step_total_amount / people_count',
            variables: [
              { name: 'step_total_amount', fieldId: 'step_total_amount' },
              { name: 'people_count', fieldId: 'people_count' }
            ]
          }
        }
      }
    ],
    outputConfig: {
      format: 'text',
      sections: [
        {
          type: 'result',
          title: '💰 Bill Summary',
          content: 'Bill Amount: ${bill_amount}\nTip ({tip_percentage}%): ${step_tip_amount}\nTotal: ${step_total_amount}',
          visible: true
        },
        {
          type: 'result',
          title: '👥 Per Person',
          content: 'Each person pays: ${step_per_person}',
          visible: true
        }
      ]
    }
  },

  {
    id: 'text-formatter',
    name: 'Text Formatter',
    description: 'Transform and format text in various ways',
    category: 'productivity',
    icon: '📝',
    tags: ['text', 'formatting', 'utility'],
    difficulty: 'beginner',
    estimatedTime: '3 min',
    useCases: [
      'Convert text to uppercase/lowercase',
      'Clean up messy text formatting',
      'Prepare text for different platforms',
      'Format names and titles consistently'
    ],
    tutorials: {
      title: 'How to format text',
      steps: [
        'Enter or paste your text in the input field',
        'Choose your desired formatting option',
        'View the formatted result',
        'Copy the result for use elsewhere'
      ]
    },
    inputConfig: [
      {
        id: 'input_text',
        type: 'textarea',
        label: 'Text to Format',
        placeholder: 'Enter your text here...',
        required: true,
        rows: 4
      },
      {
        id: 'format_type',
        type: 'select',
        label: 'Format Type',
        required: true,
        options: [
          { label: 'Uppercase', value: 'uppercase' },
          { label: 'Lowercase', value: 'lowercase' },
          { label: 'Trim Spaces', value: 'trim' }
        ]
      }
    ],
    logicConfig: [
      {
        id: 'format_text',
        type: 'transform',
        name: 'Format Text',
        config: {
          transform: {
            inputFieldId: 'input_text',
            transformType: 'uppercase'
          }
        }
      }
    ],
    outputConfig: {
      format: 'text',
      sections: [
        {
          type: 'result',
          title: '✨ Formatted Text',
          content: '{step_format_text}',
          visible: true
        }
      ]
    }
  },

  {
    id: 'business-card-builder',
    name: 'Business Card Builder',
    description: 'Create professional business card information',
    category: 'productivity',
    icon: '💼',
    tags: ['business', 'professional', 'contact'],
    difficulty: 'beginner',
    estimatedTime: '5 min',
    useCases: [
      'Create business card layouts',
      'Format contact information professionally',
      'Generate vCard data',
      'Prepare information for printing'
    ],
    tutorials: {
      title: 'Creating your business card',
      steps: [
        'Fill in your personal information',
        'Add your company details',
        'Include contact information',
        'Review the formatted business card'
      ]
    },
    inputConfig: [
      {
        id: 'full_name',
        type: 'text',
        label: 'Full Name',
        placeholder: 'John Smith',
        required: true,
      },
      {
        id: 'job_title',
        type: 'text',
        label: 'Job Title',
        placeholder: 'Software Engineer',
        required: true,
      },
      {
        id: 'company',
        type: 'text',
        label: 'Company',
        placeholder: 'Tech Corp',
        required: true,
      },
      {
        id: 'email',
        type: 'email',
        label: 'Email',
        placeholder: 'john@example.com',
        required: true,
      },
      {
        id: 'phone',
        type: 'tel',
        label: 'Phone',
        placeholder: '(555) 123-4567',
        required: false,
      }
    ],
    logicConfig: [
      {
        id: 'format_card',
        type: 'transform',
        name: 'Format Business Card',
        config: {
          transform: {
            inputFieldId: 'full_name',
            transformType: 'trim'
          }
        }
      }
    ],
    outputConfig: {
      format: 'text',
      sections: [
        {
          type: 'result',
          title: '💼 Business Card',
          content: '{full_name}\n{job_title}\n{company}\n\n📧 {email}\n📞 {phone}',
          visible: true
        }
      ]
    }
  },

  {
    id: 'password-strength-checker',
    name: 'Password Strength Checker',
    description: 'Analyze password strength and security',
    category: 'security',
    icon: '🔐',
    tags: ['security', 'password', 'analysis'],
    difficulty: 'intermediate',
    estimatedTime: '3 min',
    useCases: [
      'Check password security level',
      'Get password improvement suggestions',
      'Validate password requirements',
      'Ensure account security'
    ],
    tutorials: {
      title: 'How to check password strength',
      steps: [
        'Enter your password in the secure field',
        'View the strength analysis',
        'Read the security recommendations',
        'Improve your password based on suggestions'
      ]
    },
    inputConfig: [
      {
        id: 'password',
        type: 'text',
        label: 'Password to Check',
        placeholder: 'Enter your password...',
        required: true,
      }
    ],
    logicConfig: [
      {
        id: 'analyze_password',
        type: 'custom',
        name: 'Analyze Password Strength',
        config: {
          custom: {
            code: `
const password = password;
let score = 0;
let feedback = [];

// Length check
if (password.length >= 12) score += 2;
else if (password.length >= 8) score += 1;
else feedback.push('Use at least 8 characters');

// Character variety
if (/[a-z]/.test(password)) score += 1;
else feedback.push('Add lowercase letters');

if (/[A-Z]/.test(password)) score += 1;
else feedback.push('Add uppercase letters');

if (/[0-9]/.test(password)) score += 1;
else feedback.push('Add numbers');

if (/[^A-Za-z0-9]/.test(password)) score += 2;
else feedback.push('Add special characters');

const strength = score >= 6 ? 'Strong' : score >= 4 ? 'Medium' : 'Weak';

return JSON.stringify({
  strength: strength,
  score: score,
  feedback: feedback
});
            `,
            description: 'Analyze password strength using security criteria'
          }
        }
      }
    ],
    outputConfig: {
      format: 'text',
      sections: [
        {
          type: 'result',
          title: '🔐 Password Analysis',
          content: '{step_analyze_password}',
          visible: true
        }
      ]
    }
  }
];

// Helper functions for template management
export const getSimpleTemplatesByCategory = (category: string): SimpleToolTemplate[] => {
  return SIMPLE_TOOL_TEMPLATES.filter(template => template.category === category);
};

export const getSimpleTemplatesByDifficulty = (difficulty: 'beginner' | 'intermediate' | 'advanced'): SimpleToolTemplate[] => {
  return SIMPLE_TOOL_TEMPLATES.filter(template => template.difficulty === difficulty);
};

export const searchSimpleTemplates = (query: string): SimpleToolTemplate[] => {
  const searchTerm = query.toLowerCase();
  return SIMPLE_TOOL_TEMPLATES.filter(template => 
    template.name.toLowerCase().includes(searchTerm) ||
    template.description.toLowerCase().includes(searchTerm) ||
    template.tags.some(tag => tag.toLowerCase().includes(searchTerm))
  );
};

export const SIMPLE_TEMPLATE_CATEGORIES = [
  { value: 'calculator', label: 'Calculators', icon: '🧮' },
  { value: 'converter', label: 'Converters', icon: '🔄' },
  { value: 'finance', label: 'Finance', icon: '💰' },
  { value: 'productivity', label: 'Productivity', icon: '📋' },
  { value: 'security', label: 'Security', icon: '🔐' },
  { value: 'utility', label: 'Utilities', icon: '🛠️' },
];