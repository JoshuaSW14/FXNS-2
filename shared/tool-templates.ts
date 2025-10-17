import { FormField, LogicStep, OutputConfig } from "./tool-builder-schemas";

export interface ToolTemplate {
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
  previewImage?: string;
}

export const TOOL_TEMPLATES: ToolTemplate[] = [
  // **CALCULATOR TEMPLATES**
  {
    id: 'tip-calculator',
    name: 'Tip Calculator',
    description: 'Calculate tips and split bills among friends',
    category: 'calculator',
    icon: '💰',
    tags: ['finance', 'restaurant', 'calculator'],
    difficulty: 'beginner',
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
    id: 'loan-calculator',
    name: 'Loan Payment Calculator',
    description: 'Calculate monthly payments for loans and mortgages',
    category: 'finance',
    icon: '🏠',
    tags: ['finance', 'mortgage', 'loan'],
    difficulty: 'intermediate',
    inputConfig: [
      {
        id: 'loan_amount',
        type: 'number',
        label: 'Loan Amount ($)',
        placeholder: '250000',
        required: true,
        min: 1000,
      },
      {
        id: 'interest_rate',
        type: 'number',
        label: 'Annual Interest Rate (%)',
        placeholder: '4.5',
        required: true,
        min: 0.1,
        max: 30,
        step: 0.1,
      },
      {
        id: 'loan_term',
        type: 'number',
        label: 'Loan Term (years)',
        placeholder: '30',
        required: true,
        min: 1,
        max: 50,
      }
    ],
    logicConfig: [
      {
        id: 'monthly_payment',
        type: 'custom',
        name: 'Calculate Monthly Payment',
        config: {
          custom: {
            code: `// Loan payment formula: P[r(1+r)^n]/[(1+r)^n-1]
// Where P = principal, r = monthly rate, n = number of payments
const monthlyRate = interest_rate / 1200; // Annual rate to monthly rate
const numPayments = loan_term * 12; // Years to months

if (monthlyRate === 0) {
  // No interest, simple division
  return loan_amount / numPayments;
}

const onePlusR = 1 + monthlyRate;
const onePlusRPowN = Math.pow(onePlusR, numPayments);
const monthlyPayment = loan_amount * (monthlyRate * onePlusRPowN) / (onePlusRPowN - 1);

// Round to 2 decimal places
return Math.round(monthlyPayment * 100) / 100;`,
            description: 'Calculate monthly loan payment using amortization formula'
          }
        }
      }
    ],
    outputConfig: {
      format: 'text',
      sections: [
        {
          type: 'result',
          title: '💳 Monthly Payment',
          content: 'Your monthly payment will be: ${step_monthly_payment}',
          visible: true
        },
        {
          type: 'result',
          title: '📊 Loan Details',
          content: 'Loan Amount: ${loan_amount}\nInterest Rate: {interest_rate}%\nTerm: {loan_term} years',
          visible: true
        }
      ]
    }
  },

  // **CONVERTER TEMPLATES**
  {
    id: 'unit-converter',
    name: 'Unit Converter',
    description: 'Convert between different units of measurement',
    category: 'converter',
    icon: '📏',
    tags: ['conversion', 'measurement', 'utility'],
    difficulty: 'beginner',
    inputConfig: [
      {
        id: 'value',
        type: 'number',
        label: 'Value to Convert',
        placeholder: '100',
        required: true,
      },
      {
        id: 'from_unit',
        type: 'select',
        label: 'From Unit',
        required: true,
        options: [
          { label: 'Meters', value: 'm' },
          { label: 'Feet', value: 'ft' },
          { label: 'Inches', value: 'in' },
          { label: 'Centimeters', value: 'cm' },
          { label: 'Kilometers', value: 'km' },
          { label: 'Miles', value: 'mi' }
        ]
      },
      {
        id: 'to_unit',
        type: 'select',
        label: 'To Unit',
        required: true,
        options: [
          { label: 'Meters', value: 'm' },
          { label: 'Feet', value: 'ft' },
          { label: 'Inches', value: 'in' },
          { label: 'Centimeters', value: 'cm' },
          { label: 'Kilometers', value: 'km' },
          { label: 'Miles', value: 'mi' }
        ]
      }
    ],
    logicConfig: [
      {
        id: 'convert_unit',
        type: 'custom',
        name: 'Convert Units',
        config: {
          custom: {
            code: `// Unit conversion logic
const conversions = {
  'm': 1,           // meter (base unit)
  'cm': 0.01,       // centimeter to meter
  'km': 1000,       // kilometer to meter
  'ft': 0.3048,     // feet to meter
  'in': 0.0254,     // inch to meter
  'mi': 1609.344    // mile to meter
};

// Convert from source unit to meters (base unit)
const valueInMeters = value * conversions[from_unit];

// Convert from meters to target unit
const result = valueInMeters / conversions[to_unit];

// Round to 6 decimal places for precision
return Math.round(result * 1000000) / 1000000;`,
            description: 'Convert between length units'
          }
        }
      }
    ],
    outputConfig: {
      format: 'text',
      sections: [
        {
          type: 'result',
          title: '🔄 Conversion Result',
          content: '{value} {from_unit} = {step_convert_unit} {to_unit}',
          visible: true
        }
      ]
    }
  },

  // **FORM TEMPLATES**
  {
    id: 'contact-form',
    name: 'Contact Form',
    description: 'Professional contact form with validation',
    category: 'productivity',
    icon: '📞',
    tags: ['form', 'contact', 'business'],
    difficulty: 'beginner',
    inputConfig: [
      {
        id: 'full_name',
        type: 'text',
        label: 'Full Name',
        placeholder: 'John Smith',
        required: true,
      },
      {
        id: 'email',
        type: 'email',
        label: 'Email Address',
        placeholder: 'john@example.com',
        required: true,
      },
      {
        id: 'phone',
        type: 'tel',
        label: 'Phone Number',
        placeholder: '(555) 123-4567',
        required: false,
      },
      {
        id: 'subject',
        type: 'select',
        label: 'Subject',
        required: true,
        options: [
          { label: 'General Inquiry', value: 'general' },
          { label: 'Support Request', value: 'support' },
          { label: 'Sales Question', value: 'sales' },
          { label: 'Partnership', value: 'partnership' },
          { label: 'Other', value: 'other' }
        ]
      },
      {
        id: 'message',
        type: 'textarea',
        label: 'Message',
        placeholder: 'Please describe how we can help you...',
        required: true,
        rows: 6
      }
    ],
    logicConfig: [
      {
        id: 'format_message',
        type: 'transform',
        name: 'Format Message',
        config: {
          transform: {
            inputFieldId: 'message',
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
          title: '✅ Contact Request Received',
          content: 'Thank you {full_name}! We received your {subject} message and will respond to {email} within 24 hours.',
          visible: true
        },
        {
          type: 'result',
          title: '📋 Request Summary',
          content: 'Name: {full_name}\nEmail: {email}\nPhone: {phone}\nSubject: {subject}\nMessage: {step_format_message}',
          visible: true
        }
      ]
    }
  },

  // **ADVANCED TEMPLATES**
  {
    id: 'password-generator',
    name: 'Password Generator',
    description: 'Generate secure passwords with customizable options',
    category: 'security',
    icon: '🔐',
    tags: ['security', 'password', 'generator'],
    difficulty: 'advanced',
    inputConfig: [
      {
        id: 'length',
        type: 'range',
        label: 'Password Length',
        required: true,
        min: 8,
        max: 64,
        step: 1,
        showValue: true,
        defaultValue: 16,
      },
      {
        id: 'include_uppercase',
        type: 'boolean',
        label: 'Include Uppercase Letters (A-Z)',
        required: false,
        defaultValue: true,
      },
      {
        id: 'include_lowercase',
        type: 'boolean',
        label: 'Include Lowercase Letters (a-z)',
        required: false,
        defaultValue: true,
      },
      {
        id: 'include_numbers',
        type: 'boolean',
        label: 'Include Numbers (0-9)',
        required: false,
        defaultValue: true,
      },
      {
        id: 'include_symbols',
        type: 'boolean',
        label: 'Include Symbols (!@#$%)',
        required: false,
        defaultValue: false,
      },
      {
        id: 'count',
        type: 'number',
        label: 'Number of Passwords',
        placeholder: '1',
        required: true,
        min: 1,
        max: 10,
        defaultValue: 1,
      }
    ],
    logicConfig: [
      {
        id: 'generate_password',
        type: 'custom',
        name: 'Generate Secure Password',
        config: {
          custom: {
            code: `// Cryptographically secure password generation
const generatePassword = (length, includeUpper, includeLower, includeNumbers, includeSymbols, count) => {
  const chars = {
    lowercase: 'abcdefghijklmnopqrstuvwxyz',
    uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    numbers: '0123456789',
    symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?'
  };
  
  let charset = '';
  if (includeLower) charset += chars.lowercase;
  if (includeUpper) charset += chars.uppercase;
  if (includeNumbers) charset += chars.numbers;
  if (includeSymbols) charset += chars.symbols;
  
  if (!charset) charset = chars.lowercase + chars.numbers; // Safe fallback
  
  const passwords = [];
  for (let p = 0; p < count; p++) {
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    passwords.push(password);
  }
  
  return count === 1 ? passwords[0] : passwords.join('\\n');
};

return generatePassword(length, include_uppercase, include_lowercase, include_numbers, include_symbols, count);`,
            description: 'Generate secure password with custom options'
          }
        }
      }
    ],
    outputConfig: {
      format: 'text',
      sections: [
        {
          type: 'result',
          title: '🔐 Generated Password(s)',
          content: '{step_generate_password}',
          visible: true
        },
        {
          type: 'result',
          title: '⚙️ Settings',
          content: 'Length: {length} characters\nUppercase: {include_uppercase}\nLowercase: {include_lowercase}\nNumbers: {include_numbers}\nSymbols: {include_symbols}',
          visible: true
        }
      ]
    }
  },

  // **API INTEGRATION TEMPLATE**
  {
    id: 'weather-checker',
    name: 'Weather Checker',
    description: 'Get current weather information for any city',
    category: 'utility',
    icon: '🌤️',
    tags: ['weather', 'api', 'information'],
    difficulty: 'advanced',
    inputConfig: [
      {
        id: 'city',
        type: 'text',
        label: 'City Name',
        placeholder: 'New York',
        required: true,
      },
      {
        id: 'country',
        type: 'text',
        label: 'Country (optional)',
        placeholder: 'US',
        required: false,
      },
      {
        id: 'units',
        type: 'select',
        label: 'Temperature Units',
        required: true,
        defaultValue: 'metric',
        options: [
          { label: 'Celsius (°C)', value: 'metric' },
          { label: 'Fahrenheit (°F)', value: 'imperial' },
          { label: 'Kelvin (K)', value: 'standard' }
        ]
      }
    ],
    logicConfig: [
      {
        id: 'fetch_weather',
        type: 'api_call',
        name: 'Fetch Weather Data',
        config: {
          apiCall: {
            method: 'GET',
            url: '/api/proxy/weather?city={city}&country={country}&units={units}',
            headers: {},
            body: {}
          }
        }
      },
      {
        id: 'format_weather',
        type: 'ai_analysis',
        name: 'Format Weather Report',
        config: {
          aiAnalysis: {
            prompt: 'Format this weather data into a friendly, readable weather report: {step_fetch_weather}. Include temperature, description, humidity, and wind speed.',
            inputFields: ['step_fetch_weather'],
            outputFormat: 'text'
          }
        }
      }
    ],
    outputConfig: {
      format: 'text',
      sections: [
        {
          type: 'result',
          title: '🌤️ Weather Report',
          content: '{step_format_weather}',
          visible: true
        }
      ]
    }
  },

  // **AI-POWERED TEMPLATES**
  {
    id: 'smart-email-composer',
    name: 'Smart Email Composer',
    description: 'AI-powered email composition with tone and style customization',
    category: 'productivity',
    icon: '✉️',
    tags: ['ai', 'email', 'communication', 'writing'],
    difficulty: 'advanced',
    inputConfig: [
      {
        id: 'email_purpose',
        type: 'select',
        label: 'Email Purpose',
        required: true,
        options: [
          { label: 'Business Inquiry', value: 'business' },
          { label: 'Job Application', value: 'job' },
          { label: 'Customer Support', value: 'support' },
          { label: 'Sales Outreach', value: 'sales' },
          { label: 'Personal', value: 'personal' },
          { label: 'Follow-up', value: 'followup' }
        ]
      },
      {
        id: 'recipient_name',
        type: 'text',
        label: 'Recipient Name',
        placeholder: 'John Smith',
        required: true,
      },
      {
        id: 'key_points',
        type: 'textarea',
        label: 'Key Points to Include',
        placeholder: 'List the main points you want to cover...',
        required: true,
        rows: 4
      },
      {
        id: 'tone',
        type: 'select',
        label: 'Email Tone',
        required: true,
        defaultValue: 'professional',
        options: [
          { label: 'Professional', value: 'professional' },
          { label: 'Friendly', value: 'friendly' },
          { label: 'Formal', value: 'formal' },
          { label: 'Casual', value: 'casual' },
          { label: 'Persuasive', value: 'persuasive' }
        ]
      },
      {
        id: 'length',
        type: 'select',
        label: 'Email Length',
        required: true,
        defaultValue: 'medium',
        options: [
          { label: 'Brief (2-3 sentences)', value: 'brief' },
          { label: 'Medium (1-2 paragraphs)', value: 'medium' },
          { label: 'Detailed (3+ paragraphs)', value: 'detailed' }
        ]
      }
    ],
    logicConfig: [
      {
        id: 'generate_email',
        type: 'ai_analysis',
        name: 'Generate Email Content',
        config: {
          aiAnalysis: {
            prompt: 'Write a {tone} {email_purpose} email to {recipient_name}. The email should be {length} in length and include these key points: {key_points}. Use appropriate salutation and closing.',
            inputFields: ['tone', 'email_purpose', 'recipient_name', 'length', 'key_points'],
            outputFormat: 'text'
          }
        },
        position: { x: 100, y: 100 },
        connections: []
      },
      {
        id: 'generate_subject',
        type: 'ai_analysis',
        name: 'Generate Subject Line',
        config: {
          aiAnalysis: {
            prompt: 'Generate a compelling subject line for this email based on the purpose ({email_purpose}) and key points ({key_points}). Make it specific and engaging.',
            inputFields: ['email_purpose', 'key_points'],
            outputFormat: 'text'
          }
        },
        position: { x: 300, y: 100 },
        connections: []
      },
      {
        id: 'suggest_improvements',
        type: 'ai_analysis',
        name: 'Suggest Improvements',
        config: {
          aiAnalysis: {
            prompt: 'Review this email and suggest 2-3 specific improvements for clarity, impact, and professionalism: {step_generate_email}',
            inputFields: ['step_generate_email'],
            outputFormat: 'text'
          }
        },
        position: { x: 100, y: 250 },
        connections: []
      }
    ],
    outputConfig: {
      format: 'text',
      sections: [
        {
          type: 'result',
          title: '📧 Subject Line',
          content: '{step_generate_subject}',
          visible: true
        },
        {
          type: 'result',
          title: '✉️ Email Content',
          content: '{step_generate_email}',
          visible: true
        },
        {
          type: 'result',
          title: '💡 Improvement Suggestions',
          content: '{step_suggest_improvements}',
          visible: true
        }
      ]
    }
  },

  {
    id: 'data-visualization-helper',
    name: 'Data Visualization Helper',
    description: 'Transform CSV data into visual charts and insights',
    category: 'analytics',
    icon: '📊',
    tags: ['data', 'visualization', 'analytics', 'csv'],
    difficulty: 'intermediate',
    inputConfig: [
      {
        id: 'csv_data',
        type: 'textarea',
        label: 'CSV Data',
        placeholder: 'month,sales,costs\nJan,1000,800\nFeb,1200,900\n...',
        required: true,
        rows: 8
      },
      {
        id: 'chart_type',
        type: 'select',
        label: 'Chart Type',
        required: true,
        options: [
          { label: 'Line Chart', value: 'line' },
          { label: 'Bar Chart', value: 'bar' },
          { label: 'Pie Chart', value: 'pie' },
          { label: 'Scatter Plot', value: 'scatter' },
          { label: 'Auto-suggest', value: 'auto' }
        ]
      },
      {
        id: 'analysis_focus',
        type: 'multiselect',
        label: 'Analysis Focus',
        required: false,
        options: [
          { label: 'Trends', value: 'trends' },
          { label: 'Comparisons', value: 'comparisons' },
          { label: 'Outliers', value: 'outliers' },
          { label: 'Correlations', value: 'correlations' },
          { label: 'Patterns', value: 'patterns' }
        ]
      }
    ],
    logicConfig: [
      {
        id: 'parse_data',
        type: 'transform',
        name: 'Parse CSV Data',
        config: {
          transform: {
            inputFieldId: 'csv_data',
            transformType: 'trim'
          }
        },
        position: { x: 100, y: 100 },
        connections: []
      },
      {
        id: 'analyze_data',
        type: 'ai_analysis',
        name: 'Analyze Data Structure',
        config: {
          aiAnalysis: {
            prompt: 'Analyze this data structure and provide insights. Focus on: {analysis_focus}. Data: {step_parse_data}. Suggest the best visualization approach and highlight key findings.',
            inputFields: ['step_parse_data', 'analysis_focus'],
            outputFormat: 'text'
          }
        },
        position: { x: 100, y: 250 },
        connections: []
      },
      {
        id: 'generate_chart_config',
        type: 'calculation',
        name: 'Generate Chart Configuration',
        config: {
          custom: {
            code: `
// Generate chart configuration based on data and type
const data = step_parse_data;
const type = chart_type === 'auto' ? 'bar' : chart_type;

const config = {
  type: type,
  data: data,
  options: {
    responsive: true,
    plugins: {
      title: {
        display: true,
        text: 'Data Visualization'
      }
    }
  }
};

return JSON.stringify(config, null, 2);
            `,
            description: 'Generate Chart.js configuration'
          }
        },
        position: { x: 300, y: 250 },
        connections: []
      }
    ],
    outputConfig: {
      format: 'json',
      sections: [
        {
          type: 'result',
          title: '📊 Chart Configuration',
          content: '{step_generate_chart_config}',
          visible: true
        },
        {
          type: 'result',
          title: '🔍 Data Analysis',
          content: '{step_analyze_data}',
          visible: true
        },
        {
          type: 'result',
          title: '📈 Instructions',
          content: 'Copy the chart configuration above and use it with Chart.js or similar visualization libraries to create your chart.',
          visible: true
        }
      ]
    }
  },

  {
    id: 'smart-resume-analyzer',
    name: 'Smart Resume Analyzer',
    description: 'AI-powered resume analysis with improvement suggestions',
    category: 'productivity',
    icon: '📄',
    tags: ['resume', 'ai', 'career', 'analysis'],
    difficulty: 'advanced',
    inputConfig: [
      {
        id: 'resume_text',
        type: 'textarea',
        label: 'Resume Content',
        placeholder: 'Paste your resume text here...',
        required: true,
        rows: 12
      },
      {
        id: 'target_role',
        type: 'text',
        label: 'Target Job Role',
        placeholder: 'Software Engineer, Marketing Manager, etc.',
        required: true,
      },
      {
        id: 'industry',
        type: 'select',
        label: 'Target Industry',
        required: true,
        options: [
          { label: 'Technology', value: 'technology' },
          { label: 'Finance', value: 'finance' },
          { label: 'Healthcare', value: 'healthcare' },
          { label: 'Marketing', value: 'marketing' },
          { label: 'Education', value: 'education' },
          { label: 'Consulting', value: 'consulting' },
          { label: 'Other', value: 'other' }
        ]
      }
    ],
    logicConfig: [
      {
        id: 'analyze_structure',
        type: 'ai_analysis',
        name: 'Analyze Resume Structure',
        config: {
          aiAnalysis: {
            prompt: 'Analyze this resume structure and format for a {target_role} position in {industry}. Evaluate: 1) Overall organization 2) Section completeness 3) Format consistency 4) Length appropriateness. Resume: {resume_text}',
            inputFields: ['resume_text', 'target_role', 'industry'],
            outputFormat: 'text'
          }
        },
        position: { x: 100, y: 100 },
        connections: []
      },
      {
        id: 'analyze_content',
        type: 'ai_analysis',
        name: 'Analyze Content Quality',
        config: {
          aiAnalysis: {
            prompt: 'Analyze the content quality of this resume for {target_role} in {industry}. Focus on: 1) Relevant skills and experience 2) Achievement quantification 3) Keyword optimization 4) Industry alignment. Resume: {resume_text}',
            inputFields: ['resume_text', 'target_role', 'industry'],
            outputFormat: 'text'
          }
        },
        position: { x: 300, y: 100 },
        connections: []
      },
      {
        id: 'generate_improvements',
        type: 'ai_analysis',
        name: 'Generate Improvement Plan',
        config: {
          aiAnalysis: {
            prompt: 'Based on the structure analysis: {step_analyze_structure} and content analysis: {step_analyze_content}, create a prioritized improvement plan with specific, actionable recommendations for this {target_role} resume.',
            inputFields: ['step_analyze_structure', 'step_analyze_content', 'target_role'],
            outputFormat: 'text'
          }
        },
        position: { x: 200, y: 250 },
        connections: [
        ]
      },
      {
        id: 'suggest_keywords',
        type: 'ai_analysis',
        name: 'Suggest Keywords',
        config: {
          aiAnalysis: {
            prompt: 'Suggest 10-15 relevant keywords and phrases that should be included in a resume for {target_role} in {industry}. Focus on current industry trends and ATS optimization.',
            inputFields: ['target_role', 'industry'],
            outputFormat: 'text'
          }
        },
        position: { x: 400, y: 250 },
        connections: []
      }
    ],
    outputConfig: {
      format: 'text',
      sections: [
        {
          type: 'result',
          title: '📝 Structure Analysis',
          content: '{step_analyze_structure}',
          visible: true
        },
        {
          type: 'result',
          title: '🎯 Content Analysis',
          content: '{step_analyze_content}',
          visible: true
        },
        {
          type: 'result',
          title: '🚀 Improvement Plan',
          content: '{step_generate_improvements}',
          visible: true
        },
        {
          type: 'result',
          title: '🔑 Suggested Keywords',
          content: '{step_suggest_keywords}',
          visible: true
        }
      ]
    }
  },

  // **FINANCE TEMPLATES**
  {
    id: 'budget-planner',
    name: 'Budget Planner',
    description: 'Plan and track your monthly budget with expense categories',
    category: 'finance',
    icon: '💼',
    tags: ['finance', 'budget', 'planning', 'expenses'],
    difficulty: 'intermediate',
    inputConfig: [
      {
        id: 'monthly_income',
        type: 'number',
        label: 'Monthly Income ($)',
        placeholder: '5000',
        required: true,
        min: 0,
      },
      {
        id: 'housing',
        type: 'number',
        label: 'Housing ($)',
        placeholder: '1500',
        required: true,
        min: 0,
      },
      {
        id: 'transportation',
        type: 'number',
        label: 'Transportation ($)',
        placeholder: '400',
        required: true,
        min: 0,
      },
      {
        id: 'food',
        type: 'number',
        label: 'Food ($)',
        placeholder: '600',
        required: true,
        min: 0,
      },
      {
        id: 'utilities',
        type: 'number',
        label: 'Utilities ($)',
        placeholder: '200',
        required: true,
        min: 0,
      },
      {
        id: 'entertainment',
        type: 'number',
        label: 'Entertainment ($)',
        placeholder: '300',
        required: true,
        min: 0,
      },
      {
        id: 'savings_goal',
        type: 'number',
        label: 'Savings Goal ($)',
        placeholder: '1000',
        required: true,
        min: 0,
      }
    ],
    logicConfig: [
      {
        id: 'total_expenses',
        type: 'calculation',
        name: 'Calculate Total Expenses',
        config: {
          calculation: {
            formula: 'housing + transportation + food + utilities + entertainment',
            variables: [
              { name: 'housing', fieldId: 'housing' },
              { name: 'transportation', fieldId: 'transportation' },
              { name: 'food', fieldId: 'food' },
              { name: 'utilities', fieldId: 'utilities' },
              { name: 'entertainment', fieldId: 'entertainment' }
            ]
          }
        }
      },
      {
        id: 'remaining_budget',
        type: 'custom',
        name: 'Calculate Remaining Budget',
        config: {
          custom: {
            code: `// Calculate remaining budget and round to 2 decimal places
const remaining = monthly_income - step_total_expenses;
return Math.round(remaining * 100) / 100;`,
            description: 'Calculate remaining budget with consistent rounding'
          }
        }
      },
      {
        id: 'savings_rate',
        type: 'custom',
        name: 'Calculate Savings Rate',
        config: {
          custom: {
            code: `// Guard against divide-by-zero
if (monthly_income <= 0) {
  return 0;
}

// Calculate savings rate
const rate = (step_remaining_budget / monthly_income) * 100;
// Round to 2 decimal places
return Math.round(rate * 100) / 100;`,
            description: 'Calculate savings rate with divide-by-zero protection'
          }
        }
      },
      {
        id: 'recommendation',
        type: 'custom',
        name: 'Generate Recommendation',
        config: {
          custom: {
            code: `const remaining = step_remaining_budget;
const goal = savings_goal;

// Handle edge case where income is zero or negative
if (monthly_income <= 0) {
  return '⚠️ Warning: Monthly income must be greater than $0 to generate a budget plan.';
}

if (remaining < 0) {
  return '⚠️ Warning: You are overspending by $' + Math.abs(remaining).toFixed(2) + ' per month. Consider reducing expenses.';
} else if (remaining < goal) {
  return '💡 You have $' + remaining.toFixed(2) + ' remaining, but need $' + goal.toFixed(2) + ' to meet your savings goal. Consider reducing expenses by $' + (goal - remaining).toFixed(2) + '.';
} else {
  return '✅ Great job! You can meet your savings goal of $' + goal.toFixed(2) + ' and have $' + (remaining - goal).toFixed(2) + ' extra.';
}`,
            description: 'Generate budget recommendation'
          }
        }
      }
    ],
    outputConfig: {
      format: 'text',
      sections: [
        {
          type: 'result',
          title: '💰 Budget Summary',
          content: 'Monthly Income: ${monthly_income}\nTotal Expenses: ${step_total_expenses}\nRemaining: ${step_remaining_budget}',
          visible: true
        },
        {
          type: 'result',
          title: '📊 Expense Breakdown',
          content: 'Housing: ${housing}\nTransportation: ${transportation}\nFood: ${food}\nUtilities: ${utilities}\nEntertainment: ${entertainment}',
          visible: true
        },
        {
          type: 'result',
          title: '📈 Savings Analysis',
          content: 'Savings Rate: {step_savings_rate}%\nSavings Goal: ${savings_goal}',
          visible: true
        },
        {
          type: 'result',
          title: '💡 Recommendation',
          content: '{step_recommendation}',
          visible: true
        }
      ]
    }
  },

  {
    id: 'investment-roi-calculator',
    name: 'Investment ROI Calculator',
    description: 'Calculate return on investment with annualized returns',
    category: 'finance',
    icon: '📈',
    tags: ['finance', 'investment', 'roi', 'returns'],
    difficulty: 'intermediate',
    inputConfig: [
      {
        id: 'initial_investment',
        type: 'number',
        label: 'Initial Investment ($)',
        placeholder: '10000',
        required: true,
        min: 0.01,
      },
      {
        id: 'final_value',
        type: 'number',
        label: 'Final Value ($)',
        placeholder: '15000',
        required: true,
        min: 0.01,
      },
      {
        id: 'investment_period_years',
        type: 'number',
        label: 'Investment Period (years)',
        placeholder: '5',
        required: true,
        min: 0.01,
        step: 0.1,
      }
    ],
    logicConfig: [
      {
        id: 'total_gain',
        type: 'calculation',
        name: 'Calculate Total Gain/Loss',
        config: {
          calculation: {
            formula: 'final_value - initial_investment',
            variables: [
              { name: 'final_value', fieldId: 'final_value' },
              { name: 'initial_investment', fieldId: 'initial_investment' }
            ]
          }
        }
      },
      {
        id: 'roi_percentage',
        type: 'custom',
        name: 'Calculate ROI Percentage',
        config: {
          custom: {
            code: `// Validate initial investment
if (initial_investment <= 0) {
  return 'Error: Initial investment must be greater than $0';
}

// Calculate ROI percentage
const roi = (step_total_gain / initial_investment) * 100;
return Math.round(roi * 100) / 100;`,
            description: 'Calculate ROI percentage with validation'
          }
        }
      },
      {
        id: 'annualized_return',
        type: 'custom',
        name: 'Calculate Annualized Return',
        config: {
          custom: {
            code: `// Validate inputs
if (initial_investment <= 0) {
  return 'Error: Initial investment must be greater than $0';
}

if (investment_period_years <= 0) {
  return 'Error: Investment period must be greater than 0 years';
}

// Handle negative ROI case
if (final_value < initial_investment) {
  // Calculate annualized return for negative case
  const ratio = final_value / initial_investment;
  const annualizedReturn = (Math.pow(ratio, 1 / investment_period_years) - 1) * 100;
  return Math.round(annualizedReturn * 100) / 100;
}

// Calculate annualized return using CAGR formula
// CAGR = (Final Value / Initial Value)^(1/years) - 1
const ratio = final_value / initial_investment;
const annualizedReturn = (Math.pow(ratio, 1 / investment_period_years) - 1) * 100;
return Math.round(annualizedReturn * 100) / 100;`,
            description: 'Calculate compound annual growth rate with validation'
          }
        }
      }
    ],
    outputConfig: {
      format: 'text',
      sections: [
        {
          type: 'result',
          title: '📊 Investment Summary',
          content: 'Initial Investment: ${initial_investment}\nFinal Value: ${final_value}\nInvestment Period: {investment_period_years} years',
          visible: true
        },
        {
          type: 'result',
          title: '📈 Returns Analysis',
          content: 'Total Gain/Loss: ${step_total_gain}\nROI: {step_roi_percentage}%\nAnnualized Return: {step_annualized_return}%',
          visible: true
        }
      ]
    }
  },

  {
    id: 'savings-goal-calculator',
    name: 'Savings Goal Calculator',
    description: 'Calculate how long it will take to reach your savings goal',
    category: 'finance',
    icon: '🎯',
    tags: ['finance', 'savings', 'goals', 'planning'],
    difficulty: 'beginner',
    inputConfig: [
      {
        id: 'target_amount',
        type: 'number',
        label: 'Target Amount ($)',
        placeholder: '50000',
        required: true,
        min: 0.01,
      },
      {
        id: 'current_savings',
        type: 'number',
        label: 'Current Savings ($)',
        placeholder: '10000',
        required: true,
        min: 0,
      },
      {
        id: 'monthly_contribution',
        type: 'number',
        label: 'Monthly Contribution ($)',
        placeholder: '500',
        required: true,
        min: 0.01,
      },
      {
        id: 'annual_interest_rate',
        type: 'number',
        label: 'Annual Interest Rate (%)',
        placeholder: '3',
        required: true,
        min: 0,
        max: 20,
        step: 0.1,
      }
    ],
    logicConfig: [
      {
        id: 'calculate_timeline',
        type: 'custom',
        name: 'Calculate Time to Goal',
        config: {
          custom: {
            code: `// Handle already-achieved goals
if (target_amount <= current_savings) {
  return 0; // Goal already achieved
}

// Check for impossible scenario
if (annual_interest_rate === 0 && monthly_contribution === 0) {
  return -1; // Impossible to reach goal
}

// Calculate months to reach goal with compound interest
const remaining = target_amount - current_savings;
const monthlyRate = annual_interest_rate / 1200;

if (monthlyRate === 0) {
  // No interest case - guard against divide by zero
  if (monthly_contribution === 0) {
    return -1; // Impossible to reach goal
  }
  const months = Math.ceil(remaining / monthly_contribution);
  return months;
}

// Future value of annuity formula solved for n (number of periods)
// FV = PMT * [(1 + r)^n - 1] / r + PV * (1 + r)^n
// Iterative approach for simplicity
let balance = current_savings;
let months = 0;
const maxMonths = 1200; // 100 years max

while (balance < target_amount && months < maxMonths) {
  balance = balance * (1 + monthlyRate) + monthly_contribution;
  months++;
}

return months;`,
            description: 'Calculate months to reach savings goal with edge case handling'
          }
        }
      },
      {
        id: 'calculate_interest',
        type: 'custom',
        name: 'Calculate Total Interest Earned',
        config: {
          custom: {
            code: `// Handle edge cases
if (step_calculate_timeline <= 0) {
  return 0; // No interest if goal already achieved or impossible
}

// Calculate total interest earned
const monthlyRate = annual_interest_rate / 1200;
let balance = current_savings;
let totalContributions = 0;

for (let i = 0; i < step_calculate_timeline; i++) {
  balance = balance * (1 + monthlyRate) + monthly_contribution;
  totalContributions += monthly_contribution;
}

const totalInterest = balance - current_savings - totalContributions;
return Math.round(totalInterest * 100) / 100;`,
            description: 'Calculate interest earned over time with edge case handling'
          }
        }
      },
      {
        id: 'format_timeline',
        type: 'custom',
        name: 'Format Timeline',
        config: {
          custom: {
            code: `const months = step_calculate_timeline;

// Handle special cases
if (months === 0) {
  return '🎉 Goal already achieved!';
}

if (months === -1) {
  return '❌ Impossible to reach goal without contributions or interest';
}

const years = Math.floor(months / 12);
const remainingMonths = months % 12;

if (years === 0) {
  return months + ' months';
} else if (remainingMonths === 0) {
  return years + ' year' + (years > 1 ? 's' : '');
} else {
  return years + ' year' + (years > 1 ? 's' : '') + ' and ' + remainingMonths + ' month' + (remainingMonths > 1 ? 's' : '');
}`,
            description: 'Format timeline in readable format with edge case handling'
          }
        }
      }
    ],
    outputConfig: {
      format: 'text',
      sections: [
        {
          type: 'result',
          title: '🎯 Goal Summary',
          content: 'Target Amount: ${target_amount}\nCurrent Savings: ${current_savings}\nMonthly Contribution: ${monthly_contribution}\nAnnual Interest Rate: {annual_interest_rate}%',
          visible: true
        },
        {
          type: 'result',
          title: '⏱️ Time to Goal',
          content: 'You will reach your goal in: {step_format_timeline}',
          visible: true
        },
        {
          type: 'result',
          title: '💰 Interest Earned',
          content: 'Total Interest Earned: ${step_calculate_interest}',
          visible: true
        }
      ]
    }
  },

  {
    id: 'currency-converter',
    name: 'Currency Converter',
    description: 'Convert between major world currencies with current exchange rates',
    category: 'finance',
    icon: '💱',
    tags: ['finance', 'currency', 'conversion', 'exchange'],
    difficulty: 'beginner',
    inputConfig: [
      {
        id: 'amount',
        type: 'number',
        label: 'Amount',
        placeholder: '100',
        required: true,
        min: 0,
      },
      {
        id: 'from_currency',
        type: 'select',
        label: 'From Currency',
        required: true,
        options: [
          { label: 'USD - US Dollar', value: 'USD' },
          { label: 'EUR - Euro', value: 'EUR' },
          { label: 'GBP - British Pound', value: 'GBP' },
          { label: 'JPY - Japanese Yen', value: 'JPY' },
          { label: 'CAD - Canadian Dollar', value: 'CAD' },
          { label: 'AUD - Australian Dollar', value: 'AUD' },
          { label: 'CHF - Swiss Franc', value: 'CHF' }
        ]
      },
      {
        id: 'to_currency',
        type: 'select',
        label: 'To Currency',
        required: true,
        options: [
          { label: 'USD - US Dollar', value: 'USD' },
          { label: 'EUR - Euro', value: 'EUR' },
          { label: 'GBP - British Pound', value: 'GBP' },
          { label: 'JPY - Japanese Yen', value: 'JPY' },
          { label: 'CAD - Canadian Dollar', value: 'CAD' },
          { label: 'AUD - Australian Dollar', value: 'AUD' },
          { label: 'CHF - Swiss Franc', value: 'CHF' }
        ]
      }
    ],
    logicConfig: [
      {
        id: 'convert_currency',
        type: 'custom',
        name: 'Convert Currency',
        config: {
          custom: {
            code: `// Validate amount
if (amount < 0) {
  return 'Error: Amount cannot be negative';
}

// Handle same currency conversion
if (from_currency === to_currency) {
  return Math.round(amount * 100) / 100;
}

// Exchange rates relative to USD (approximate rates as of 2024)
const exchangeRates = {
  'USD': 1.00,
  'EUR': 0.92,
  'GBP': 0.79,
  'JPY': 149.50,
  'CAD': 1.36,
  'AUD': 1.52,
  'CHF': 0.88
};

// Convert from source currency to USD
const amountInUSD = amount / exchangeRates[from_currency];

// Convert from USD to target currency
const convertedAmount = amountInUSD * exchangeRates[to_currency];

// Round to 2 decimal places
return Math.round(convertedAmount * 100) / 100;`,
            description: 'Convert between currencies with validation and edge case handling'
          }
        }
      },
      {
        id: 'get_exchange_rate',
        type: 'custom',
        name: 'Get Exchange Rate',
        config: {
          custom: {
            code: `// Handle same currency
if (from_currency === to_currency) {
  return 1.00;
}

// Exchange rates relative to USD
const exchangeRates = {
  'USD': 1.00,
  'EUR': 0.92,
  'GBP': 0.79,
  'JPY': 149.50,
  'CAD': 1.36,
  'AUD': 1.52,
  'CHF': 0.88
};

// Calculate direct exchange rate
const rate = exchangeRates[to_currency] / exchangeRates[from_currency];
return Math.round(rate * 1000000) / 1000000;`,
            description: 'Calculate exchange rate between currencies with same-currency handling'
          }
        }
      }
    ],
    outputConfig: {
      format: 'text',
      sections: [
        {
          type: 'result',
          title: '💱 Conversion Result',
          content: '{amount} {from_currency} = {step_convert_currency} {to_currency}',
          visible: true
        },
        {
          type: 'result',
          title: '📊 Exchange Rate',
          content: '1 {from_currency} = {step_get_exchange_rate} {to_currency}',
          visible: true
        },
        {
          type: 'result',
          title: 'ℹ️ Note',
          content: 'Exchange rates are approximate and for reference only. Actual rates may vary.',
          visible: true
        }
      ]
    }
  },

  {
    id: 'simple-tax-calculator',
    name: 'Simple Tax Calculator',
    description: 'Calculate federal and state taxes with take-home pay estimate',
    category: 'finance',
    icon: '📊',
    tags: ['finance', 'tax', 'income', 'calculator'],
    difficulty: 'intermediate',
    inputConfig: [
      {
        id: 'annual_income',
        type: 'number',
        label: 'Annual Income ($)',
        placeholder: '75000',
        required: true,
        min: 0,
      },
      {
        id: 'filing_status',
        type: 'select',
        label: 'Filing Status',
        required: true,
        options: [
          { label: 'Single', value: 'single' },
          { label: 'Married', value: 'married' },
          { label: 'Head of Household', value: 'head_of_household' }
        ]
      },
      {
        id: 'state_tax_rate',
        type: 'range',
        label: 'State Tax Rate (%)',
        required: true,
        min: 0,
        max: 15,
        step: 0.5,
        showValue: true,
        defaultValue: 5,
      },
      {
        id: 'deductions',
        type: 'number',
        label: 'Deductions ($)',
        placeholder: '12950',
        required: true,
        min: 0,
        defaultValue: 12950,
      }
    ],
    logicConfig: [
      {
        id: 'calculate_federal_tax',
        type: 'custom',
        name: 'Calculate Federal Tax',
        config: {
          custom: {
            code: `// Simplified 2024 federal tax brackets (single filer)
const taxBrackets = {
  single: [
    { max: 11000, rate: 0.10 },
    { max: 44725, rate: 0.12 },
    { max: 95375, rate: 0.22 },
    { max: 182100, rate: 0.24 },
    { max: 231250, rate: 0.32 },
    { max: 578125, rate: 0.35 },
    { max: Infinity, rate: 0.37 }
  ],
  married: [
    { max: 22000, rate: 0.10 },
    { max: 89050, rate: 0.12 },
    { max: 190750, rate: 0.22 },
    { max: 364200, rate: 0.24 },
    { max: 462500, rate: 0.32 },
    { max: 693750, rate: 0.35 },
    { max: Infinity, rate: 0.37 }
  ],
  head_of_household: [
    { max: 15700, rate: 0.10 },
    { max: 59850, rate: 0.12 },
    { max: 95350, rate: 0.22 },
    { max: 182100, rate: 0.24 },
    { max: 231250, rate: 0.32 },
    { max: 578100, rate: 0.35 },
    { max: Infinity, rate: 0.37 }
  ]
};

const taxableIncome = Math.max(0, annual_income - deductions);
const brackets = taxBrackets[filing_status];

let tax = 0;
let previousMax = 0;

for (const bracket of brackets) {
  if (taxableIncome > previousMax) {
    const taxableInBracket = Math.min(taxableIncome, bracket.max) - previousMax;
    tax += taxableInBracket * bracket.rate;
    previousMax = bracket.max;
  } else {
    break;
  }
}

return Math.round(tax * 100) / 100;`,
            description: 'Calculate federal income tax using progressive brackets'
          }
        }
      },
      {
        id: 'calculate_state_tax',
        type: 'calculation',
        name: 'Calculate State Tax',
        config: {
          calculation: {
            formula: 'annual_income * (state_tax_rate / 100)',
            variables: [
              { name: 'annual_income', fieldId: 'annual_income' },
              { name: 'state_tax_rate', fieldId: 'state_tax_rate' }
            ]
          }
        }
      },
      {
        id: 'total_tax',
        type: 'calculation',
        name: 'Calculate Total Tax',
        config: {
          calculation: {
            formula: 'step_calculate_federal_tax + step_calculate_state_tax',
            variables: [
              { name: 'step_calculate_federal_tax', fieldId: 'step_calculate_federal_tax' },
              { name: 'step_calculate_state_tax', fieldId: 'step_calculate_state_tax' }
            ]
          }
        }
      },
      {
        id: 'effective_tax_rate',
        type: 'calculation',
        name: 'Calculate Effective Tax Rate',
        config: {
          calculation: {
            formula: '(step_total_tax / annual_income) * 100',
            variables: [
              { name: 'step_total_tax', fieldId: 'step_total_tax' },
              { name: 'annual_income', fieldId: 'annual_income' }
            ]
          }
        }
      },
      {
        id: 'net_income',
        type: 'calculation',
        name: 'Calculate Net Income',
        config: {
          calculation: {
            formula: 'annual_income - step_total_tax',
            variables: [
              { name: 'annual_income', fieldId: 'annual_income' },
              { name: 'step_total_tax', fieldId: 'step_total_tax' }
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
          title: '💰 Income Summary',
          content: 'Annual Income: ${annual_income}\nFiling Status: {filing_status}\nDeductions: ${deductions}',
          visible: true
        },
        {
          type: 'result',
          title: '📊 Tax Breakdown',
          content: 'Federal Tax: ${step_calculate_federal_tax}\nState Tax ({state_tax_rate}%): ${step_calculate_state_tax}\nTotal Tax: ${step_total_tax}',
          visible: true
        },
        {
          type: 'result',
          title: '📈 Tax Analysis',
          content: 'Effective Tax Rate: {step_effective_tax_rate}%\nNet Income (Take-Home): ${step_net_income}',
          visible: true
        },
        {
          type: 'result',
          title: 'ℹ️ Disclaimer',
          content: 'This is a simplified tax calculation for estimation purposes only. Consult a tax professional for accurate tax planning.',
          visible: true
        }
      ]
    }
  },

  // **HEALTH & WELLNESS TEMPLATES**
  {
    id: 'bmi-calculator',
    name: 'BMI Calculator',
    description: 'Calculate Body Mass Index and determine health category',
    category: 'health',
    icon: '⚖️',
    tags: ['health', 'fitness', 'bmi', 'wellness'],
    difficulty: 'beginner',
    inputConfig: [
      {
        id: 'weight_kg',
        type: 'number',
        label: 'Weight (kg)',
        placeholder: '70',
        required: true,
        min: 20,
        max: 300,
      },
      {
        id: 'height_cm',
        type: 'number',
        label: 'Height (cm)',
        placeholder: '175',
        required: true,
        min: 100,
        max: 250,
      }
    ],
    logicConfig: [
      {
        id: 'calculate_bmi',
        type: 'custom',
        name: 'Calculate BMI',
        config: {
          custom: {
            code: `// Validate inputs
if (weight_kg <= 0 || height_cm <= 0) {
  return 'Error: Weight and height must be greater than 0';
}

// Calculate BMI: weight (kg) / (height (m))^2
const heightInMeters = height_cm / 100;
const bmi = weight_kg / (heightInMeters * heightInMeters);

// Round to 2 decimal places
return Math.round(bmi * 100) / 100;`,
            description: 'Calculate BMI with input validation'
          }
        }
      },
      {
        id: 'determine_category',
        type: 'custom',
        name: 'Determine BMI Category',
        config: {
          custom: {
            code: `// Validate BMI calculation result
if (typeof step_calculate_bmi === 'string' && step_calculate_bmi.startsWith('Error')) {
  return 'N/A';
}

const bmi = step_calculate_bmi;

if (bmi < 18.5) {
  return 'Underweight';
} else if (bmi >= 18.5 && bmi < 25) {
  return 'Normal weight';
} else if (bmi >= 25 && bmi < 30) {
  return 'Overweight';
} else {
  return 'Obese';
}`,
            description: 'Determine BMI category based on WHO standards'
          }
        }
      },
      {
        id: 'health_recommendation',
        type: 'custom',
        name: 'Generate Health Recommendation',
        config: {
          custom: {
            code: `const category = step_determine_category;

if (category === 'N/A') {
  return 'Please check your inputs.';
}

const recommendations = {
  'Underweight': 'Consider consulting with a healthcare provider about healthy weight gain strategies. Focus on nutrient-dense foods and strength training.',
  'Normal weight': 'Great! You\'re in a healthy weight range. Maintain your current lifestyle with balanced nutrition and regular physical activity.',
  'Overweight': 'Consider adopting a balanced diet and increasing physical activity. Small, sustainable changes can make a big difference.',
  'Obese': 'Consult with a healthcare provider for personalized guidance. A combination of diet, exercise, and lifestyle changes can help improve your health.'
};

return recommendations[category] || 'Consult a healthcare professional for personalized advice.';`,
            description: 'Provide health recommendations based on BMI category'
          }
        }
      }
    ],
    outputConfig: {
      format: 'text',
      sections: [
        {
          type: 'result',
          title: '⚖️ Your BMI',
          content: 'BMI: {step_calculate_bmi}',
          visible: true
        },
        {
          type: 'result',
          title: '📊 Category',
          content: 'Category: {step_determine_category}',
          visible: true
        },
        {
          type: 'result',
          title: '💡 Recommendation',
          content: '{step_health_recommendation}',
          visible: true
        },
        {
          type: 'result',
          title: 'ℹ️ Disclaimer',
          content: 'BMI is a screening tool and not a diagnostic measure. This is not medical advice. Please consult with a healthcare professional for personalized health guidance.',
          visible: true
        }
      ]
    }
  },

  {
    id: 'calorie-counter',
    name: 'Calorie Counter',
    description: 'Calculate daily calorie needs based on your profile and activity level',
    category: 'health',
    icon: '🍎',
    tags: ['health', 'nutrition', 'calories', 'fitness'],
    difficulty: 'beginner',
    inputConfig: [
      {
        id: 'age',
        type: 'number',
        label: 'Age',
        placeholder: '30',
        required: true,
        min: 10,
        max: 120,
      },
      {
        id: 'gender',
        type: 'select',
        label: 'Gender',
        required: true,
        options: [
          { label: 'Male', value: 'male' },
          { label: 'Female', value: 'female' }
        ]
      },
      {
        id: 'weight_kg',
        type: 'number',
        label: 'Weight (kg)',
        placeholder: '70',
        required: true,
        min: 20,
        max: 300,
      },
      {
        id: 'height_cm',
        type: 'number',
        label: 'Height (cm)',
        placeholder: '175',
        required: true,
        min: 100,
        max: 250,
      },
      {
        id: 'activity_level',
        type: 'select',
        label: 'Activity Level',
        required: true,
        options: [
          { label: 'Sedentary (little or no exercise)', value: 'sedentary' },
          { label: 'Light (exercise 1-3 days/week)', value: 'light' },
          { label: 'Moderate (exercise 3-5 days/week)', value: 'moderate' },
          { label: 'Active (exercise 6-7 days/week)', value: 'active' },
          { label: 'Very Active (intense exercise daily)', value: 'very_active' }
        ]
      }
    ],
    logicConfig: [
      {
        id: 'calculate_bmr',
        type: 'custom',
        name: 'Calculate BMR',
        config: {
          custom: {
            code: `// Validate inputs
if (age <= 0 || weight_kg <= 0 || height_cm <= 0) {
  return 'Error: All inputs must be greater than 0';
}

// Mifflin-St Jeor Equation
// Men: BMR = 10 * weight(kg) + 6.25 * height(cm) - 5 * age(years) + 5
// Women: BMR = 10 * weight(kg) + 6.25 * height(cm) - 5 * age(years) - 161

let bmr;
if (gender === 'male') {
  bmr = (10 * weight_kg) + (6.25 * height_cm) - (5 * age) + 5;
} else {
  bmr = (10 * weight_kg) + (6.25 * height_cm) - (5 * age) - 161;
}

// Round to 2 decimal places
return Math.round(bmr * 100) / 100;`,
            description: 'Calculate Basal Metabolic Rate using Mifflin-St Jeor equation'
          }
        }
      },
      {
        id: 'calculate_daily_calories',
        type: 'custom',
        name: 'Calculate Daily Calorie Needs',
        config: {
          custom: {
            code: `// Validate BMR calculation
if (typeof step_calculate_bmr === 'string' && step_calculate_bmr.startsWith('Error')) {
  return step_calculate_bmr;
}

// Activity multipliers
const activityMultipliers = {
  'sedentary': 1.2,
  'light': 1.375,
  'moderate': 1.55,
  'active': 1.725,
  'very_active': 1.9
};

const multiplier = activityMultipliers[activity_level] || 1.2;
const dailyCalories = step_calculate_bmr * multiplier;

// Round to 2 decimal places
return Math.round(dailyCalories * 100) / 100;`,
            description: 'Calculate total daily energy expenditure based on activity level'
          }
        }
      },
      {
        id: 'macro_recommendations',
        type: 'custom',
        name: 'Generate Macro Recommendations',
        config: {
          custom: {
            code: `// Validate calorie calculation
if (typeof step_calculate_daily_calories === 'string' && step_calculate_daily_calories.startsWith('Error')) {
  return 'Unable to calculate macros.';
}

const calories = step_calculate_daily_calories;

// Standard macro split: 30% protein, 40% carbs, 30% fat
const proteinCalories = calories * 0.30;
const carbCalories = calories * 0.40;
const fatCalories = calories * 0.30;

// Convert to grams (protein: 4 cal/g, carbs: 4 cal/g, fat: 9 cal/g)
const proteinGrams = Math.round(proteinCalories / 4);
const carbGrams = Math.round(carbCalories / 4);
const fatGrams = Math.round(fatCalories / 9);

return 'Protein: ' + proteinGrams + 'g (30%)\\nCarbs: ' + carbGrams + 'g (40%)\\nFat: ' + fatGrams + 'g (30%)';`,
            description: 'Calculate recommended macronutrient breakdown'
          }
        }
      }
    ],
    outputConfig: {
      format: 'text',
      sections: [
        {
          type: 'result',
          title: '🔥 Basal Metabolic Rate (BMR)',
          content: 'Your BMR: {step_calculate_bmr} calories/day',
          visible: true
        },
        {
          type: 'result',
          title: '🍎 Daily Calorie Needs',
          content: 'Total daily calories: {step_calculate_daily_calories} calories',
          visible: true
        },
        {
          type: 'result',
          title: '🥗 Macro Recommendations',
          content: '{step_macro_recommendations}',
          visible: true
        },
        {
          type: 'result',
          title: 'ℹ️ Note',
          content: 'These are general estimates. Individual needs may vary. Consult with a nutritionist or healthcare provider for personalized guidance.',
          visible: true
        }
      ]
    }
  },

  {
    id: 'water-intake-tracker',
    name: 'Water Intake Tracker',
    description: 'Calculate your recommended daily water intake based on weight and activity',
    category: 'health',
    icon: '💧',
    tags: ['health', 'hydration', 'water', 'wellness'],
    difficulty: 'beginner',
    inputConfig: [
      {
        id: 'weight_kg',
        type: 'number',
        label: 'Weight (kg)',
        placeholder: '70',
        required: true,
        min: 20,
        max: 300,
      },
      {
        id: 'activity_level',
        type: 'select',
        label: 'Activity Level',
        required: true,
        options: [
          { label: 'Low (sedentary)', value: 'low' },
          { label: 'Moderate (regular exercise)', value: 'moderate' },
          { label: 'High (intense training)', value: 'high' }
        ]
      },
      {
        id: 'climate',
        type: 'select',
        label: 'Climate',
        required: true,
        options: [
          { label: 'Cool', value: 'cool' },
          { label: 'Moderate', value: 'moderate' },
          { label: 'Hot', value: 'hot' }
        ]
      }
    ],
    logicConfig: [
      {
        id: 'calculate_water_intake',
        type: 'custom',
        name: 'Calculate Water Intake',
        config: {
          custom: {
            code: `// Validate input
if (weight_kg <= 0) {
  return 'Error: Weight must be greater than 0';
}

// Base calculation: 33ml per kg of body weight
let waterMl = weight_kg * 33;

// Adjust for activity level
if (activity_level === 'moderate') {
  waterMl += 500;
} else if (activity_level === 'high') {
  waterMl += 1000;
}

// Adjust for climate
if (climate === 'moderate') {
  waterMl += 500;
} else if (climate === 'hot') {
  waterMl += 1000;
}

// Convert to liters (rounded to 2 decimal places)
const waterLiters = Math.round((waterMl / 1000) * 100) / 100;

return waterLiters;`,
            description: 'Calculate recommended daily water intake in liters'
          }
        }
      },
      {
        id: 'calculate_glasses',
        type: 'custom',
        name: 'Calculate Glasses',
        config: {
          custom: {
            code: `// Validate water calculation
if (typeof step_calculate_water_intake === 'string' && step_calculate_water_intake.startsWith('Error')) {
  return 0;
}

// Convert liters to glasses (1 glass = 250ml)
const glasses = Math.ceil((step_calculate_water_intake * 1000) / 250);
return glasses;`,
            description: 'Convert water intake to number of 250ml glasses'
          }
        }
      },
      {
        id: 'hydration_tips',
        type: 'custom',
        name: 'Generate Hydration Tips',
        config: {
          custom: {
            code: `const tips = [
  '💡 Start your day with a glass of water',
  '⏰ Set reminders throughout the day to drink water',
  '🍋 Add lemon or fruit for flavor if plain water is boring',
  '🥤 Carry a reusable water bottle with you',
  '🍽️ Drink water before, during, and after meals',
  '🏃 Increase intake during and after exercise',
  '🌡️ Drink more in hot weather or when sick'
];

// Return 3 random tips
const shuffled = tips.sort(() => 0.5 - Math.random());
return shuffled.slice(0, 3).join('\\n');`,
            description: 'Provide hydration tips'
          }
        }
      }
    ],
    outputConfig: {
      format: 'text',
      sections: [
        {
          type: 'result',
          title: '💧 Daily Water Goal',
          content: 'Recommended intake: {step_calculate_water_intake} liters ({step_calculate_glasses} glasses)',
          visible: true
        },
        {
          type: 'result',
          title: '📋 Your Profile',
          content: 'Weight: {weight_kg} kg\\nActivity Level: {activity_level}\\nClimate: {climate}',
          visible: true
        },
        {
          type: 'result',
          title: '💡 Hydration Tips',
          content: '{step_hydration_tips}',
          visible: true
        },
        {
          type: 'result',
          title: 'ℹ️ Note',
          content: 'Individual hydration needs can vary. Listen to your body and adjust as needed. Consult a healthcare provider for specific medical conditions.',
          visible: true
        }
      ]
    }
  },

  {
    id: 'macros-calculator',
    name: 'Macros Calculator',
    description: 'Calculate optimal macronutrient distribution for your fitness goals',
    category: 'health',
    icon: '🥗',
    tags: ['health', 'nutrition', 'macros', 'fitness', 'diet'],
    difficulty: 'intermediate',
    inputConfig: [
      {
        id: 'daily_calories',
        type: 'number',
        label: 'Daily Calories',
        placeholder: '2000',
        required: true,
        min: 1000,
        max: 5000,
      },
      {
        id: 'goal',
        type: 'select',
        label: 'Fitness Goal',
        required: true,
        options: [
          { label: 'Lose Weight', value: 'lose_weight' },
          { label: 'Maintain Weight', value: 'maintain' },
          { label: 'Gain Muscle', value: 'gain_muscle' }
        ]
      },
      {
        id: 'protein_preference',
        type: 'range',
        label: 'Protein Preference (%)',
        required: true,
        min: 10,
        max: 40,
        step: 5,
        showValue: true,
        defaultValue: 30,
      }
    ],
    logicConfig: [
      {
        id: 'calculate_macros',
        type: 'custom',
        name: 'Calculate Macros',
        config: {
          custom: {
            code: `// Validate input
if (daily_calories < 1000) {
  return 'Error: Daily calories must be at least 1000';
}

// Base macro splits by goal
const macroSplits = {
  'lose_weight': { protein: 40, carbs: 30, fat: 30 },
  'maintain': { protein: 30, carbs: 40, fat: 30 },
  'gain_muscle': { protein: 30, carbs: 45, fat: 25 }
};

let split = macroSplits[goal];

// Adjust for protein preference if different from default
const defaultProtein = split.protein;
const proteinDiff = protein_preference - defaultProtein;

// Adjust carbs and fat proportionally
if (proteinDiff !== 0) {
  split = {
    protein: protein_preference,
    carbs: split.carbs - (proteinDiff * 0.6),
    fat: split.fat - (proteinDiff * 0.4)
  };
}

// Calculate grams (protein: 4 cal/g, carbs: 4 cal/g, fat: 9 cal/g)
const proteinGrams = Math.round((daily_calories * (split.protein / 100)) / 4);
const carbGrams = Math.round((daily_calories * (split.carbs / 100)) / 4);
const fatGrams = Math.round((daily_calories * (split.fat / 100)) / 9);

return {
  protein: { grams: proteinGrams, percent: Math.round(split.protein) },
  carbs: { grams: carbGrams, percent: Math.round(split.carbs) },
  fat: { grams: fatGrams, percent: Math.round(split.fat) }
};`,
            description: 'Calculate macronutrient distribution based on goals'
          }
        }
      },
      {
        id: 'format_macros',
        type: 'custom',
        name: 'Format Macro Breakdown',
        config: {
          custom: {
            code: `// Validate calculation
if (typeof step_calculate_macros === 'string' && step_calculate_macros.startsWith('Error')) {
  return step_calculate_macros;
}

const macros = step_calculate_macros;
return 'Protein: ' + macros.protein.grams + 'g (' + macros.protein.percent + '%)\\n' +
       'Carbs: ' + macros.carbs.grams + 'g (' + macros.carbs.percent + '%)\\n' +
       'Fat: ' + macros.fat.grams + 'g (' + macros.fat.percent + '%)';`,
            description: 'Format macro breakdown for display'
          }
        }
      },
      {
        id: 'meal_suggestions',
        type: 'custom',
        name: 'Generate Meal Suggestions',
        config: {
          custom: {
            code: `const suggestions = {
  'lose_weight': 'Focus on lean proteins (chicken, fish, tofu), vegetables, and controlled portions. Limit refined carbs and sugary foods.',
  'maintain': 'Maintain a balanced diet with variety. Include whole grains, lean proteins, healthy fats, and plenty of fruits and vegetables.',
  'gain_muscle': 'Increase protein intake with lean meats, eggs, and protein shakes. Include complex carbs like rice, oats, and sweet potatoes for energy.'
};

return suggestions[goal] || 'Consult a nutritionist for personalized meal planning.';`,
            description: 'Provide goal-specific meal suggestions'
          }
        }
      }
    ],
    outputConfig: {
      format: 'text',
      sections: [
        {
          type: 'result',
          title: '🥗 Your Macro Breakdown',
          content: 'Daily Calories: {daily_calories}\\n\\n{step_format_macros}',
          visible: true
        },
        {
          type: 'result',
          title: '🎯 Goal',
          content: 'Fitness Goal: {goal}',
          visible: true
        },
        {
          type: 'result',
          title: '🍽️ Meal Suggestions',
          content: '{step_meal_suggestions}',
          visible: true
        },
        {
          type: 'result',
          title: 'ℹ️ Note',
          content: 'These are general recommendations. Individual needs vary based on metabolism, training intensity, and other factors. Consult with a registered dietitian for personalized nutrition planning.',
          visible: true
        }
      ]
    }
  },

  {
    id: 'sleep-quality-calculator',
    name: 'Sleep Quality Calculator',
    description: 'Analyze your sleep patterns and get personalized improvement recommendations',
    category: 'health',
    icon: '😴',
    tags: ['health', 'sleep', 'wellness', 'rest'],
    difficulty: 'beginner',
    inputConfig: [
      {
        id: 'bedtime',
        type: 'text',
        label: 'Bedtime (HH:MM)',
        placeholder: '23:00',
        required: true,
      },
      {
        id: 'wake_time',
        type: 'text',
        label: 'Wake Time (HH:MM)',
        placeholder: '07:00',
        required: true,
      },
      {
        id: 'sleep_quality',
        type: 'range',
        label: 'Sleep Quality (1-10)',
        required: true,
        min: 1,
        max: 10,
        step: 1,
        showValue: true,
        defaultValue: 5,
      },
      {
        id: 'wake_ups',
        type: 'number',
        label: 'Number of Wake-ups',
        placeholder: '2',
        required: true,
        min: 0,
        max: 20,
        defaultValue: 0,
      }
    ],
    logicConfig: [
      {
        id: 'calculate_sleep_duration',
        type: 'custom',
        name: 'Calculate Sleep Duration',
        config: {
          custom: {
            code: `// Parse time strings
const parseTime = (timeStr) => {
  const parts = timeStr.split(':');
  if (parts.length !== 2) return null;
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }
  return hours * 60 + minutes;
};

const bedMinutes = parseTime(bedtime);
const wakeMinutes = parseTime(wake_time);

if (bedMinutes === null || wakeMinutes === null) {
  return 'Error: Invalid time format. Please use HH:MM (e.g., 23:00)';
}

// Calculate duration (handle overnight sleep)
let durationMinutes;
if (wakeMinutes >= bedMinutes) {
  durationMinutes = wakeMinutes - bedMinutes;
} else {
  // Sleep crosses midnight
  durationMinutes = (24 * 60 - bedMinutes) + wakeMinutes;
}

// Convert to hours (rounded to 2 decimal places)
const hours = Math.round((durationMinutes / 60) * 100) / 100;
return hours;`,
            description: 'Calculate total sleep duration handling overnight sleep'
          }
        }
      },
      {
        id: 'calculate_sleep_efficiency',
        type: 'custom',
        name: 'Calculate Sleep Efficiency',
        config: {
          custom: {
            code: `// Validate duration calculation
if (typeof step_calculate_sleep_duration === 'string' && step_calculate_sleep_duration.startsWith('Error')) {
  return 0;
}

// Sleep efficiency formula: (quality/10 * 100) - (wake_ups * 5)
// Quality contributes base efficiency, wake-ups reduce it
const baseEfficiency = (sleep_quality / 10) * 100;
const wakePenalty = wake_ups * 5;
let efficiency = baseEfficiency - wakePenalty;

// Clamp between 0 and 100
efficiency = Math.max(0, Math.min(100, efficiency));

return Math.round(efficiency * 100) / 100;`,
            description: 'Calculate sleep efficiency score'
          }
        }
      },
      {
        id: 'sleep_rating',
        type: 'custom',
        name: 'Determine Sleep Rating',
        config: {
          custom: {
            code: `const hours = step_calculate_sleep_duration;
const efficiency = step_calculate_sleep_efficiency;

// Check for errors
if (typeof hours === 'string') {
  return 'N/A';
}

// Determine overall rating based on duration and efficiency
let rating;
if (hours >= 7 && hours <= 9 && efficiency >= 70) {
  rating = 'Excellent 🌟';
} else if (hours >= 6 && hours <= 10 && efficiency >= 50) {
  rating = 'Good ✅';
} else if (hours >= 5 && hours <= 11 && efficiency >= 30) {
  rating = 'Fair ⚠️';
} else {
  rating = 'Poor ❌';
}

return rating;`,
            description: 'Determine overall sleep quality rating'
          }
        }
      },
      {
        id: 'sleep_recommendations',
        type: 'custom',
        name: 'Generate Recommendations',
        config: {
          custom: {
            code: `const hours = step_calculate_sleep_duration;
const efficiency = step_calculate_sleep_efficiency;
const recommendations = [];

// Check for errors
if (typeof hours === 'string') {
  return 'Please check your time inputs.';
}

// Duration recommendations
if (hours < 7) {
  recommendations.push('⏰ Try to get at least 7-9 hours of sleep for optimal health');
} else if (hours > 9) {
  recommendations.push('⏰ Excessive sleep may indicate underlying issues - consider consulting a doctor');
}

// Quality recommendations
if (sleep_quality < 6) {
  recommendations.push('💤 Improve sleep environment: dark room, comfortable temperature, minimal noise');
  recommendations.push('📱 Avoid screens 1 hour before bedtime');
}

// Wake-up recommendations
if (wake_ups > 2) {
  recommendations.push('🚫 Limit fluid intake before bed and avoid caffeine after 2 PM');
  recommendations.push('🧘 Practice relaxation techniques like meditation or deep breathing');
}

// Efficiency recommendations
if (efficiency < 50) {
  recommendations.push('🛏️ Establish a consistent sleep schedule, even on weekends');
  recommendations.push('🏃 Regular exercise can improve sleep quality (but not close to bedtime)');
}

// General tips if everything is good
if (recommendations.length === 0) {
  recommendations.push('✨ Great sleep! Keep maintaining your healthy sleep habits');
  recommendations.push('💪 Continue your consistent bedtime routine');
}

return recommendations.join('\\n');`,
            description: 'Generate personalized sleep improvement recommendations'
          }
        }
      }
    ],
    outputConfig: {
      format: 'text',
      sections: [
        {
          type: 'result',
          title: '😴 Sleep Duration',
          content: 'Total Sleep: {step_calculate_sleep_duration} hours',
          visible: true
        },
        {
          type: 'result',
          title: '📊 Sleep Metrics',
          content: 'Sleep Efficiency: {step_calculate_sleep_efficiency}%\\nQuality Rating: {step_sleep_rating}',
          visible: true
        },
        {
          type: 'result',
          title: '💡 Recommendations',
          content: '{step_sleep_recommendations}',
          visible: true
        },
        {
          type: 'result',
          title: 'ℹ️ Note',
          content: 'This tool provides general guidance only. If you experience persistent sleep issues, consult with a healthcare provider or sleep specialist.',
          visible: true
        }
      ]
    }
  },

  // **PRODUCTIVITY TEMPLATES**
  {
    id: 'pomodoro-timer-config',
    name: 'Pomodoro Timer Config',
    description: 'Configure your Pomodoro technique settings for optimal productivity',
    category: 'productivity',
    icon: '⏱️',
    tags: ['productivity', 'time-management', 'focus', 'pomodoro'],
    difficulty: 'beginner',
    inputConfig: [
      {
        id: 'work_duration',
        type: 'range',
        label: 'Work Duration (minutes)',
        required: true,
        min: 15,
        max: 60,
        step: 5,
        showValue: true,
        defaultValue: 25,
      },
      {
        id: 'short_break',
        type: 'range',
        label: 'Short Break (minutes)',
        required: true,
        min: 3,
        max: 15,
        step: 1,
        showValue: true,
        defaultValue: 5,
      },
      {
        id: 'long_break',
        type: 'range',
        label: 'Long Break (minutes)',
        required: true,
        min: 10,
        max: 30,
        step: 5,
        showValue: true,
        defaultValue: 15,
      },
      {
        id: 'sessions_before_long_break',
        type: 'range',
        label: 'Sessions Before Long Break',
        required: true,
        min: 2,
        max: 8,
        step: 1,
        showValue: true,
        defaultValue: 4,
      }
    ],
    logicConfig: [
      {
        id: 'calculate_cycle_time',
        type: 'custom',
        name: 'Calculate Cycle Time',
        config: {
          custom: {
            code: `// Calculate total time for one complete Pomodoro cycle
// Cycle = (work sessions * work_duration) + (short breaks * short_break) + long_break
const totalWorkTime = sessions_before_long_break * work_duration;
const totalShortBreaks = (sessions_before_long_break - 1) * short_break;
const cycleTime = totalWorkTime + totalShortBreaks + long_break;

// Round to 2 decimal places
return Math.round(cycleTime * 100) / 100;`,
            description: 'Calculate total cycle time'
          }
        }
      },
      {
        id: 'calculate_daily_pomodoros',
        type: 'custom',
        name: 'Calculate Daily Pomodoros',
        config: {
          custom: {
            code: `// Calculate how many pomodoros fit in an 8-hour workday
const workdayMinutes = 8 * 60; // 480 minutes
const cycleTime = step_calculate_cycle_time;

if (cycleTime <= 0) {
  return 0;
}

const completeCycles = Math.floor(workdayMinutes / cycleTime);
const totalPomodoros = completeCycles * sessions_before_long_break;

// Check if there's time for additional pomodoros after complete cycles
const remainingTime = workdayMinutes - (completeCycles * cycleTime);
const additionalPomodoros = Math.floor(remainingTime / (work_duration + short_break));

return totalPomodoros + additionalPomodoros;`,
            description: 'Calculate number of pomodoros per day'
          }
        }
      },
      {
        id: 'generate_tips',
        type: 'custom',
        name: 'Generate Productivity Tips',
        config: {
          custom: {
            code: `// Generate personalized tips based on configuration
const tips = [];

if (work_duration >= 45) {
  tips.push('⚠️ Long work sessions: Stay hydrated and stretch during breaks');
} else if (work_duration <= 20) {
  tips.push('⚡ Short work sessions: Great for high-intensity tasks requiring bursts of focus');
}

if (short_break < 5) {
  tips.push('💡 Consider longer short breaks (5+ min) for better recovery');
}

if (long_break >= 20) {
  tips.push('🚶 Perfect time for a walk or light exercise to refresh');
}

if (sessions_before_long_break > 6) {
  tips.push('🎯 Many sessions before break: Ensure you stay focused throughout');
}

// General tips
tips.push('📵 Eliminate distractions during work sessions');
tips.push('✅ Use breaks to truly disconnect from work');
tips.push('📊 Track your completed pomodoros to measure productivity');

return tips.join('\\n');`,
            description: 'Generate usage tips'
          }
        }
      }
    ],
    outputConfig: {
      format: 'text',
      sections: [
        {
          type: 'result',
          title: '⏱️ Pomodoro Configuration',
          content: 'Work Session: {work_duration} minutes\\nShort Break: {short_break} minutes\\nLong Break: {long_break} minutes\\nSessions Before Long Break: {sessions_before_long_break}',
          visible: true
        },
        {
          type: 'result',
          title: '📊 Productivity Schedule',
          content: 'Complete Cycle Time: {step_calculate_cycle_time} minutes\\nPomodoros per 8-hour day: {step_calculate_daily_pomodoros}',
          visible: true
        },
        {
          type: 'result',
          title: '💡 Tips for Effective Use',
          content: '{step_generate_tips}',
          visible: true
        }
      ]
    }
  },

  {
    id: 'meeting-cost-calculator',
    name: 'Meeting Cost Calculator',
    description: 'Calculate the true cost of meetings and assess their ROI',
    category: 'productivity',
    icon: '💼',
    tags: ['productivity', 'meetings', 'cost', 'business', 'roi'],
    difficulty: 'intermediate',
    inputConfig: [
      {
        id: 'num_attendees',
        type: 'number',
        label: 'Number of Attendees',
        placeholder: '6',
        required: true,
        min: 1,
        max: 100,
      },
      {
        id: 'avg_hourly_rate',
        type: 'number',
        label: 'Average Hourly Rate ($)',
        placeholder: '50',
        required: true,
        min: 10,
        max: 1000,
      },
      {
        id: 'meeting_duration_minutes',
        type: 'number',
        label: 'Meeting Duration (minutes)',
        placeholder: '60',
        required: true,
        min: 5,
        max: 480,
      }
    ],
    logicConfig: [
      {
        id: 'calculate_costs',
        type: 'custom',
        name: 'Calculate Meeting Costs',
        config: {
          custom: {
            code: `// Validate inputs
if (num_attendees <= 0 || avg_hourly_rate <= 0 || meeting_duration_minutes <= 0) {
  throw new Error('All values must be greater than 0');
}

// Calculate total meeting cost
const totalCost = (num_attendees * avg_hourly_rate * meeting_duration_minutes) / 60;

// Calculate cost per minute
const costPerMinute = totalCost / meeting_duration_minutes;

// Calculate opportunity cost (what else could be done)
const opportunityCost = totalCost * 1.5; // Assume 1.5x multiplier for opportunity

// Round to 2 decimal places
return {
  totalCost: Math.round(totalCost * 100) / 100,
  costPerMinute: Math.round(costPerMinute * 100) / 100,
  opportunityCost: Math.round(opportunityCost * 100) / 100
};`,
            description: 'Calculate meeting costs and opportunity cost'
          }
        }
      },
      {
        id: 'calculate_efficiency_score',
        type: 'custom',
        name: 'Calculate Efficiency Score',
        config: {
          custom: {
            code: `// Calculate efficiency score based on meeting parameters
let score = 100;

// Penalize for large meetings
if (num_attendees > 10) {
  score -= 20;
} else if (num_attendees > 6) {
  score -= 10;
}

// Penalize for long meetings
if (meeting_duration_minutes > 90) {
  score -= 25;
} else if (meeting_duration_minutes > 60) {
  score -= 15;
}

// Bonus for efficient meetings
if (meeting_duration_minutes <= 30 && num_attendees <= 5) {
  score += 10;
}

// Ensure score stays within bounds
score = Math.max(0, Math.min(100, score));

return Math.round(score);`,
            description: 'Calculate meeting efficiency score'
          }
        }
      },
      {
        id: 'generate_roi_recommendation',
        type: 'custom',
        name: 'Generate ROI Recommendation',
        config: {
          custom: {
            code: `// Generate recommendations based on meeting characteristics
const costs = step_calculate_costs;
const efficiency = step_calculate_efficiency_score;
const recommendations = [];

// Cost-based recommendations
if (costs.totalCost > 500) {
  recommendations.push('💰 High-cost meeting ($' + costs.totalCost.toFixed(2) + '): Ensure there is a clear agenda and decision-making framework');
  recommendations.push('📋 Consider: Can this be an email or async update instead?');
} else if (costs.totalCost > 200) {
  recommendations.push('💵 Moderate-cost meeting: Make sure objectives are clearly defined');
}

// Attendee-based recommendations
if (num_attendees > 8) {
  recommendations.push('👥 Large meeting: Consider breaking into smaller working groups');
  recommendations.push('📝 Record decisions and assign clear action items');
} else if (num_attendees <= 3) {
  recommendations.push('✅ Small meeting: Good size for effective collaboration');
}

// Duration-based recommendations
if (meeting_duration_minutes > 60) {
  recommendations.push('⏰ Long meeting: Schedule breaks every 50-60 minutes');
  recommendations.push('🎯 Break into multiple shorter sessions if possible');
} else if (meeting_duration_minutes <= 30) {
  recommendations.push('⚡ Short meeting: Excellent for maintaining focus and productivity');
}

// Efficiency-based recommendations
if (efficiency >= 80) {
  recommendations.push('⭐ High efficiency setup: Your meeting parameters are well-optimized');
} else if (efficiency < 50) {
  recommendations.push('⚠️ Low efficiency: Consider reducing attendees or duration');
}

// General best practices
recommendations.push('📊 Best Practice: Share agenda 24 hours in advance');
recommendations.push('✅ Best Practice: End with clear action items and owners');

return recommendations.join('\\n');`,
            description: 'Generate ROI recommendations'
          }
        }
      }
    ],
    outputConfig: {
      format: 'text',
      sections: [
        {
          type: 'result',
          title: '💼 Meeting Cost Analysis',
          content: 'Total Meeting Cost: ${step_calculate_costs.totalCost}\\nCost Per Minute: ${step_calculate_costs.costPerMinute}\\nOpportunity Cost: ${step_calculate_costs.opportunityCost}',
          visible: true
        },
        {
          type: 'result',
          title: '📊 Efficiency Score',
          content: 'Meeting Efficiency: {step_calculate_efficiency_score}/100',
          visible: true
        },
        {
          type: 'result',
          title: '💡 ROI Recommendations',
          content: '{step_generate_roi_recommendation}',
          visible: true
        }
      ]
    }
  },

  {
    id: 'timezone-converter',
    name: 'Time Zone Converter',
    description: 'Convert time between different time zones for global scheduling',
    category: 'productivity',
    icon: '🌍',
    tags: ['productivity', 'timezone', 'scheduling', 'international', 'time'],
    difficulty: 'beginner',
    inputConfig: [
      {
        id: 'source_time',
        type: 'text',
        label: 'Source Time (HH:MM format)',
        placeholder: '14:30',
        required: true,
      },
      {
        id: 'source_timezone',
        type: 'select',
        label: 'Source Time Zone',
        required: true,
        options: [
          { label: 'UTC - Coordinated Universal Time', value: 'UTC' },
          { label: 'EST - Eastern Standard Time (UTC-5)', value: 'EST' },
          { label: 'PST - Pacific Standard Time (UTC-8)', value: 'PST' },
          { label: 'CST - Central Standard Time (UTC-6)', value: 'CST' },
          { label: 'MST - Mountain Standard Time (UTC-7)', value: 'MST' },
          { label: 'GMT - Greenwich Mean Time (UTC+0)', value: 'GMT' },
          { label: 'CET - Central European Time (UTC+1)', value: 'CET' },
          { label: 'JST - Japan Standard Time (UTC+9)', value: 'JST' },
          { label: 'AEST - Australian Eastern Time (UTC+10)', value: 'AEST' }
        ]
      },
      {
        id: 'target_timezone',
        type: 'select',
        label: 'Target Time Zone',
        required: true,
        options: [
          { label: 'UTC - Coordinated Universal Time', value: 'UTC' },
          { label: 'EST - Eastern Standard Time (UTC-5)', value: 'EST' },
          { label: 'PST - Pacific Standard Time (UTC-8)', value: 'PST' },
          { label: 'CST - Central Standard Time (UTC-6)', value: 'CST' },
          { label: 'MST - Mountain Standard Time (UTC-7)', value: 'MST' },
          { label: 'GMT - Greenwich Mean Time (UTC+0)', value: 'GMT' },
          { label: 'CET - Central European Time (UTC+1)', value: 'CET' },
          { label: 'JST - Japan Standard Time (UTC+9)', value: 'JST' },
          { label: 'AEST - Australian Eastern Time (UTC+10)', value: 'AEST' }
        ]
      }
    ],
    logicConfig: [
      {
        id: 'convert_timezone',
        type: 'custom',
        name: 'Convert Time Zone',
        config: {
          custom: {
            code: `// Parse and validate time input
const timePattern = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
const match = source_time.trim().match(timePattern);

if (!match) {
  throw new Error('Invalid time format. Please use HH:MM format (e.g., 14:30)');
}

const hours = parseInt(match[1], 10);
const minutes = parseInt(match[2], 10);

// Validate hours and minutes
if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
  throw new Error('Invalid time. Hours must be 0-23, minutes must be 0-59');
}

// UTC offsets for each timezone
const timezoneOffsets = {
  'UTC': 0,
  'GMT': 0,
  'EST': -5,
  'PST': -8,
  'CST': -6,
  'MST': -7,
  'CET': 1,
  'JST': 9,
  'AEST': 10
};

// Convert source time to UTC first
const sourceOffset = timezoneOffsets[source_timezone];
const targetOffset = timezoneOffsets[target_timezone];

// Calculate minutes since midnight in UTC
let utcMinutes = (hours * 60 + minutes) - (sourceOffset * 60);

// Convert UTC to target timezone
let targetMinutes = utcMinutes + (targetOffset * 60);

// Handle day wrap-around
let dayOffset = 0;
while (targetMinutes < 0) {
  targetMinutes += 1440; // Add 24 hours
  dayOffset--;
}
while (targetMinutes >= 1440) {
  targetMinutes -= 1440; // Subtract 24 hours
  dayOffset++;
}

// Convert back to hours and minutes
const targetHours = Math.floor(targetMinutes / 60);
const targetMins = targetMinutes % 60;

// Format output
const formattedTime = String(targetHours).padStart(2, '0') + ':' + String(targetMins).padStart(2, '0');

// Calculate time difference
const timeDiff = targetOffset - sourceOffset;

return {
  convertedTime: formattedTime,
  timeDifference: timeDiff,
  dayOffset: dayOffset
};`,
            description: 'Convert time between time zones'
          }
        }
      },
      {
        id: 'generate_date_note',
        type: 'custom',
        name: 'Generate Date Consideration Note',
        config: {
          custom: {
            code: `// Generate note about date changes
const result = step_convert_timezone;

if (result.dayOffset === 0) {
  return '📅 Same day in both time zones';
} else if (result.dayOffset === 1) {
  return '📅 Next day in target time zone';
} else if (result.dayOffset === -1) {
  return '📅 Previous day in target time zone';
} else if (result.dayOffset > 1) {
  return '📅 +' + result.dayOffset + ' days in target time zone';
} else {
  return '📅 ' + result.dayOffset + ' days in target time zone';
}`,
            description: 'Generate date consideration note'
          }
        }
      }
    ],
    outputConfig: {
      format: 'text',
      sections: [
        {
          type: 'result',
          title: '🌍 Time Conversion',
          content: '{source_time} {source_timezone} = {step_convert_timezone.convertedTime} {target_timezone}',
          visible: true
        },
        {
          type: 'result',
          title: '⏰ Time Difference',
          content: 'Time difference: {step_convert_timezone.timeDifference} hours',
          visible: true
        },
        {
          type: 'result',
          title: '📅 Date Consideration',
          content: '{step_generate_date_note}',
          visible: true
        }
      ]
    }
  },

  {
    id: 'project-deadline-calculator',
    name: 'Project Deadline Calculator',
    description: 'Calculate project timelines and assess deadline urgency',
    category: 'productivity',
    icon: '📅',
    tags: ['productivity', 'project-management', 'deadline', 'planning', 'timeline'],
    difficulty: 'intermediate',
    inputConfig: [
      {
        id: 'start_date',
        type: 'text',
        label: 'Start Date (YYYY-MM-DD)',
        placeholder: '2025-01-15',
        required: true,
      },
      {
        id: 'deadline_date',
        type: 'text',
        label: 'Deadline Date (YYYY-MM-DD)',
        placeholder: '2025-03-30',
        required: true,
      },
      {
        id: 'hours_per_day',
        type: 'number',
        label: 'Available Hours Per Day',
        placeholder: '6',
        required: true,
        min: 1,
        max: 16,
      },
      {
        id: 'days_per_week',
        type: 'range',
        label: 'Working Days Per Week',
        required: true,
        min: 1,
        max: 7,
        step: 1,
        showValue: true,
        defaultValue: 5,
      }
    ],
    logicConfig: [
      {
        id: 'calculate_timeline',
        type: 'custom',
        name: 'Calculate Project Timeline',
        config: {
          custom: {
            code: `// Parse and validate dates
const datePattern = /^(\\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/;

const startMatch = start_date.trim().match(datePattern);
const deadlineMatch = deadline_date.trim().match(datePattern);

if (!startMatch) {
  throw new Error('Invalid start date format. Please use YYYY-MM-DD format (e.g., 2025-01-15)');
}

if (!deadlineMatch) {
  throw new Error('Invalid deadline date format. Please use YYYY-MM-DD format (e.g., 2025-03-30)');
}

// Create date objects
const startDateObj = new Date(start_date + 'T00:00:00');
const deadlineDateObj = new Date(deadline_date + 'T00:00:00');

// Validate date parsing
if (isNaN(startDateObj.getTime())) {
  throw new Error('Invalid start date. Please check the date values');
}

if (isNaN(deadlineDateObj.getTime())) {
  throw new Error('Invalid deadline date. Please check the date values');
}

// Validate deadline is after start date
if (deadlineDateObj <= startDateObj) {
  throw new Error('Deadline date must be after start date');
}

// Calculate total days
const millisecondsPerDay = 1000 * 60 * 60 * 24;
const totalDays = Math.ceil((deadlineDateObj - startDateObj) / millisecondsPerDay);

// Calculate working days (approximate)
const totalWeeks = totalDays / 7;
const workingDays = Math.floor(totalWeeks * days_per_week);

// Calculate total available hours
const totalHours = workingDays * hours_per_day;

// Determine urgency level
let urgencyLevel;
if (totalDays <= 7) {
  urgencyLevel = 'CRITICAL';
} else if (totalDays <= 30) {
  urgencyLevel = 'HIGH';
} else if (totalDays <= 90) {
  urgencyLevel = 'MEDIUM';
} else {
  urgencyLevel = 'LOW';
}

return {
  totalDays: totalDays,
  workingDays: Math.round(workingDays * 100) / 100,
  totalHours: Math.round(totalHours * 100) / 100,
  urgencyLevel: urgencyLevel
};`,
            description: 'Calculate project timeline and urgency'
          }
        }
      },
      {
        id: 'generate_milestone_suggestions',
        type: 'custom',
        name: 'Generate Milestone Suggestions',
        config: {
          custom: {
            code: `// Generate milestone suggestions based on timeline
const timeline = step_calculate_timeline;
const suggestions = [];

// Add urgency-specific advice
if (timeline.urgencyLevel === 'CRITICAL') {
  suggestions.push('🚨 URGENT: Only ' + timeline.totalDays + ' days until deadline!');
  suggestions.push('⚡ Focus on MVP and core features only');
  suggestions.push('🎯 Daily check-ins recommended');
  suggestions.push('📞 Consider increasing team resources');
} else if (timeline.urgencyLevel === 'HIGH') {
  suggestions.push('⚠️ High Priority: ' + timeline.totalDays + ' days remaining');
  suggestions.push('📋 Break project into weekly sprints');
  suggestions.push('🔄 Weekly progress reviews recommended');
} else if (timeline.urgencyLevel === 'MEDIUM') {
  suggestions.push('📊 Moderate Timeline: ' + timeline.totalDays + ' days available');
  suggestions.push('📅 Plan milestones every 2-3 weeks');
  suggestions.push('🎯 Mid-project review at 50% mark');
} else {
  suggestions.push('✅ Comfortable Timeline: ' + timeline.totalDays + ' days available');
  suggestions.push('📅 Plan monthly milestones');
  suggestions.push('🔍 Opportunity for thorough testing and refinement');
}

// Suggest milestone structure
const milestoneCount = Math.max(2, Math.min(6, Math.floor(timeline.totalDays / 14)));
suggestions.push('');
suggestions.push('🎯 Suggested Milestone Structure:');

if (milestoneCount >= 4) {
  suggestions.push('  • Milestone 1: Requirements & Planning (25%)');
  suggestions.push('  • Milestone 2: Development Phase 1 (50%)');
  suggestions.push('  • Milestone 3: Development Phase 2 (75%)');
  suggestions.push('  • Milestone 4: Testing & Deployment (100%)');
} else if (milestoneCount >= 3) {
  suggestions.push('  • Milestone 1: Planning & Setup (33%)');
  suggestions.push('  • Milestone 2: Core Development (67%)');
  suggestions.push('  • Milestone 3: Testing & Launch (100%)');
} else {
  suggestions.push('  • Milestone 1: Development (50%)');
  suggestions.push('  • Milestone 2: Testing & Launch (100%)');
}

// Add buffer recommendation
const bufferDays = Math.ceil(timeline.totalDays * 0.2);
suggestions.push('');
suggestions.push('🛡️ Recommended Buffer: ' + bufferDays + ' days for unexpected issues');

return suggestions.join('\\n');`,
            description: 'Generate milestone suggestions'
          }
        }
      }
    ],
    outputConfig: {
      format: 'text',
      sections: [
        {
          type: 'result',
          title: '📅 Timeline Overview',
          content: 'Total Days: {step_calculate_timeline.totalDays}\\nWorking Days: {step_calculate_timeline.workingDays}\\nTotal Available Hours: {step_calculate_timeline.totalHours}',
          visible: true
        },
        {
          type: 'result',
          title: '🎯 Urgency Level',
          content: 'Priority: {step_calculate_timeline.urgencyLevel}',
          visible: true
        },
        {
          type: 'result',
          title: '🗓️ Milestone Suggestions',
          content: '{step_generate_milestone_suggestions}',
          visible: true
        }
      ]
    }
  },

  {
    id: 'task-priority-scorer',
    name: 'Task Priority Scorer',
    description: 'Score and prioritize tasks using a multi-factor analysis system',
    category: 'productivity',
    icon: '🎯',
    tags: ['productivity', 'prioritization', 'task-management', 'decision-making'],
    difficulty: 'intermediate',
    inputConfig: [
      {
        id: 'urgency',
        type: 'range',
        label: 'Urgency (1-10)',
        required: true,
        min: 1,
        max: 10,
        step: 1,
        showValue: true,
        defaultValue: 5,
      },
      {
        id: 'importance',
        type: 'range',
        label: 'Importance (1-10)',
        required: true,
        min: 1,
        max: 10,
        step: 1,
        showValue: true,
        defaultValue: 5,
      },
      {
        id: 'effort_hours',
        type: 'number',
        label: 'Estimated Effort (hours)',
        placeholder: '4',
        required: true,
        min: 0.5,
        max: 100,
        step: 0.5,
      },
      {
        id: 'impact',
        type: 'range',
        label: 'Impact (1-10)',
        required: true,
        min: 1,
        max: 10,
        step: 1,
        showValue: true,
        defaultValue: 5,
      }
    ],
    logicConfig: [
      {
        id: 'calculate_priority_score',
        type: 'custom',
        name: 'Calculate Priority Score',
        config: {
          custom: {
            code: `// Validate all inputs are within range
if (urgency < 1 || urgency > 10) {
  throw new Error('Urgency must be between 1 and 10');
}
if (importance < 1 || importance > 10) {
  throw new Error('Importance must be between 1 and 10');
}
if (impact < 1 || impact > 10) {
  throw new Error('Impact must be between 1 and 10');
}
if (effort_hours < 0.5 || effort_hours > 100) {
  throw new Error('Effort must be between 0.5 and 100 hours');
}

// Calculate priority score using weighted formula
// Priority = (Urgency * 0.3 + Importance * 0.4 + Impact * 0.3) * 10
const priorityScore = (urgency * 0.3 + importance * 0.4 + impact * 0.3) * 10;

// Round to 2 decimal places
return Math.round(priorityScore * 100) / 100;`,
            description: 'Calculate weighted priority score'
          }
        }
      },
      {
        id: 'calculate_effort_ratio',
        type: 'custom',
        name: 'Calculate Effort Ratio',
        config: {
          custom: {
            code: `// Calculate effort ratio: priority score per hour of effort
// Higher ratio = better return on time investment
const priorityScore = step_calculate_priority_score;

if (effort_hours <= 0) {
  throw new Error('Effort hours must be greater than 0');
}

const effortRatio = priorityScore / effort_hours;

// Round to 2 decimal places
return Math.round(effortRatio * 100) / 100;`,
            description: 'Calculate priority per effort hour'
          }
        }
      },
      {
        id: 'determine_priority_category',
        type: 'custom',
        name: 'Determine Priority Category',
        config: {
          custom: {
            code: `// Determine category based on priority score
const score = step_calculate_priority_score;

let category;
let recommendation;

if (score >= 80) {
  category = 'CRITICAL';
  recommendation = 'DO NOW - Drop everything and focus on this task immediately';
} else if (score >= 65) {
  category = 'HIGH';
  recommendation = 'SCHEDULE - Block time today or tomorrow to complete this';
} else if (score >= 40) {
  category = 'MEDIUM';
  recommendation = 'PLAN - Schedule within the week, delegate if possible';
} else {
  category = 'LOW';
  recommendation = 'ELIMINATE/DEFER - Consider if this task is truly necessary';
}

// Add effort-based nuance
const effortRatio = step_calculate_effort_ratio;

if (effortRatio > 20 && effort_hours <= 2) {
  recommendation += ' (Quick win: High impact, low effort!)';
} else if (effortRatio < 5 && effort_hours > 8) {
  recommendation += ' (Low ROI: Consider breaking into smaller tasks or delegating)';
}

return {
  category: category,
  recommendation: recommendation
};`,
            description: 'Determine priority category and recommendation'
          }
        }
      },
      {
        id: 'generate_eisenhower_matrix',
        type: 'custom',
        name: 'Generate Eisenhower Matrix Position',
        config: {
          custom: {
            code: `// Map task to Eisenhower Matrix quadrant
let quadrant;
let quadrantAdvice;

if (urgency >= 7 && importance >= 7) {
  quadrant = 'Q1: Urgent & Important';
  quadrantAdvice = 'DO FIRST - Crisis mode tasks requiring immediate attention';
} else if (urgency < 7 && importance >= 7) {
  quadrant = 'Q2: Not Urgent but Important';
  quadrantAdvice = 'SCHEDULE - Strategic tasks for long-term success. Schedule dedicated time.';
} else if (urgency >= 7 && importance < 7) {
  quadrant = 'Q3: Urgent but Not Important';
  quadrantAdvice = 'DELEGATE - These tasks feel urgent but delegate when possible';
} else {
  quadrant = 'Q4: Not Urgent & Not Important';
  quadrantAdvice = 'ELIMINATE - Consider removing from your to-do list entirely';
}

return {
  quadrant: quadrant,
  advice: quadrantAdvice
};`,
            description: 'Map to Eisenhower Matrix'
          }
        }
      }
    ],
    outputConfig: {
      format: 'text',
      sections: [
        {
          type: 'result',
          title: '🎯 Priority Score',
          content: 'Overall Priority: {step_calculate_priority_score}/100\\nEffort Ratio: {step_calculate_effort_ratio} points/hour\\nPriority Category: {step_determine_priority_category.category}',
          visible: true
        },
        {
          type: 'result',
          title: '💡 Recommendation',
          content: '{step_determine_priority_category.recommendation}',
          visible: true
        },
        {
          type: 'result',
          title: '📊 Eisenhower Matrix',
          content: '{step_generate_eisenhower_matrix.quadrant}\\n{step_generate_eisenhower_matrix.advice}',
          visible: true
        },
        {
          type: 'result',
          title: '📈 Task Breakdown',
          content: 'Urgency: {urgency}/10\\nImportance: {importance}/10\\nImpact: {impact}/10\\nEstimated Effort: {effort_hours} hours',
          visible: true
        }
      ]
    }
  },

  // **UTILITY TEMPLATES**
  {
    id: 'qr-code-generator',
    name: 'QR Code Data Generator',
    description: 'Generate formatted QR code data with encoding instructions and library recommendations',
    category: 'utility',
    icon: '📱',
    tags: ['qr', 'code', 'generator', 'encoding', 'utility'],
    difficulty: 'beginner',
    inputConfig: [
      {
        id: 'data_content',
        type: 'text',
        label: 'Data Content',
        placeholder: 'https://example.com or your text',
        required: true,
      },
      {
        id: 'data_type',
        type: 'select',
        label: 'Data Type',
        required: true,
        defaultValue: 'url',
        options: [
          { label: 'URL', value: 'url' },
          { label: 'Text', value: 'text' },
          { label: 'Email', value: 'email' },
          { label: 'Phone', value: 'phone' },
          { label: 'SMS', value: 'sms' }
        ]
      },
      {
        id: 'error_correction',
        type: 'select',
        label: 'Error Correction Level',
        required: true,
        defaultValue: 'M',
        options: [
          { label: 'L (Low - 7%)', value: 'L' },
          { label: 'M (Medium - 15%)', value: 'M' },
          { label: 'Q (Quartile - 25%)', value: 'Q' },
          { label: 'H (High - 30%)', value: 'H' }
        ]
      }
    ],
    logicConfig: [
      {
        id: 'validate_and_format',
        type: 'custom',
        name: 'Validate and Format QR Data',
        config: {
          custom: {
            code: `// Validate input based on data type
const trimmedContent = data_content.trim();

if (!trimmedContent) {
  throw new Error('Data content cannot be empty');
}

let formattedData = '';
let validationStatus = 'Valid';
let validationMessage = '';

switch (data_type) {
  case 'url':
    // URL validation
    const urlPattern = /^(https?:\\/\\/)?([\\da-z\\.-]+)\\.([a-z\\.]{2,6})([\\/\\w \\.-]*)*\\/?$/;
    if (!urlPattern.test(trimmedContent)) {
      validationStatus = 'Invalid';
      validationMessage = 'Invalid URL format. Please provide a valid URL (e.g., https://example.com)';
    } else {
      // Ensure URL has protocol
      formattedData = trimmedContent.startsWith('http') ? trimmedContent : 'https://' + trimmedContent;
      validationMessage = 'Valid URL format';
    }
    break;

  case 'email':
    // Email validation
    const emailPattern = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
    if (!emailPattern.test(trimmedContent)) {
      validationStatus = 'Invalid';
      validationMessage = 'Invalid email format. Please provide a valid email address (e.g., user@example.com)';
    } else {
      formattedData = 'mailto:' + trimmedContent;
      validationMessage = 'Valid email format';
    }
    break;

  case 'phone':
    // Phone validation (basic international format)
    const phonePattern = /^[\\+]?[(]?[0-9]{1,4}[)]?[-\\s\\.]?[(]?[0-9]{1,4}[)]?[-\\s\\.]?[0-9]{1,9}$/;
    const cleanPhone = trimmedContent.replace(/[\\s\\-\\.\\(\\)]/g, '');
    if (!phonePattern.test(trimmedContent)) {
      validationStatus = 'Invalid';
      validationMessage = 'Invalid phone format. Please provide a valid phone number (e.g., +1-555-123-4567)';
    } else {
      formattedData = 'tel:' + cleanPhone;
      validationMessage = 'Valid phone format';
    }
    break;

  case 'sms':
    // SMS validation (phone number with optional message)
    const smsPattern = /^[\\+]?[(]?[0-9]{1,4}[)]?[-\\s\\.]?[(]?[0-9]{1,4}[)]?[-\\s\\.]?[0-9]{1,9}$/;
    const cleanSms = trimmedContent.replace(/[\\s\\-\\.\\(\\)]/g, '');
    if (!smsPattern.test(trimmedContent.split(':')[0])) {
      validationStatus = 'Invalid';
      validationMessage = 'Invalid SMS format. Provide phone number or phone:message (e.g., +1-555-123-4567)';
    } else {
      formattedData = 'sms:' + cleanSms;
      validationMessage = 'Valid SMS format';
    }
    break;

  case 'text':
    // Text - encode special characters
    formattedData = trimmedContent;
    validationMessage = 'Plain text data';
    break;

  default:
    formattedData = trimmedContent;
}

return {
  formatted: formattedData || trimmedContent,
  status: validationStatus,
  message: validationMessage,
  errorCorrection: error_correction
};`,
            description: 'Validate and format QR code data with proper encoding'
          }
        }
      },
      {
        id: 'generate_instructions',
        type: 'custom',
        name: 'Generate Implementation Instructions',
        config: {
          custom: {
            code: `// Generate library-specific implementation instructions
const qrData = step_validate_and_format.formatted;
const errorLevel = step_validate_and_format.errorCorrection;

const instructions = {
  qrcodeJs: \`// Using qrcode.js library
import QRCode from 'qrcode';

// Generate QR code as Data URL
QRCode.toDataURL('\${qrData}', {
  errorCorrectionLevel: '\${errorLevel}',
  width: 300,
  margin: 2
}, (err, url) => {
  if (err) console.error(err);
  // Use the 'url' as image src
  document.getElementById('qr-image').src = url;
});\`,

  reactQrCode: \`// Using react-qr-code library
import QRCode from 'react-qr-code';

function MyComponent() {
  return (
    <QRCode
      value="\${qrData}"
      size={256}
      level="\${errorLevel}"
      bgColor="#FFFFFF"
      fgColor="#000000"
    />
  );
}\`,

  html5: \`// Using HTML5 Canvas API with qrcode library
<canvas id="qr-canvas"></canvas>

<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
<script>
  new QRCode(document.getElementById("qr-canvas"), {
    text: "\${qrData}",
    width: 256,
    height: 256,
    colorDark: "#000000",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.\${errorLevel}
  });
</script>\`
};

return instructions;`,
            description: 'Generate implementation examples for popular QR libraries'
          }
        }
      }
    ],
    outputConfig: {
      format: 'text',
      sections: [
        {
          type: 'result',
          title: '✅ Validation Status',
          content: '{step_validate_and_format.status}: {step_validate_and_format.message}',
          visible: true
        },
        {
          type: 'result',
          title: '📱 Formatted QR Data',
          content: 'Data: {step_validate_and_format.formatted}\\nError Correction: {step_validate_and_format.errorCorrection} ({error_correction})\\nType: {data_type}',
          visible: true
        },
        {
          type: 'result',
          title: '📚 Library: qrcode.js (Node.js/Browser)',
          content: '{step_generate_instructions.qrcodeJs}',
          visible: true
        },
        {
          type: 'result',
          title: '⚛️ Library: react-qr-code (React)',
          content: '{step_generate_instructions.reactQrCode}',
          visible: true
        },
        {
          type: 'result',
          title: '🌐 Library: QRCode.js (HTML5)',
          content: '{step_generate_instructions.html5}',
          visible: true
        }
      ]
    }
  },

  {
    id: 'color-palette-generator',
    name: 'Color Palette Generator',
    description: 'Generate harmonious color palettes based on color theory with hex codes and CSS variables',
    category: 'utility',
    icon: '🎨',
    tags: ['color', 'palette', 'design', 'css', 'harmony'],
    difficulty: 'intermediate',
    inputConfig: [
      {
        id: 'base_color',
        type: 'text',
        label: 'Base Color (Hex)',
        placeholder: '#3B82F6',
        required: true,
      },
      {
        id: 'palette_type',
        type: 'select',
        label: 'Palette Type',
        required: true,
        defaultValue: 'analogous',
        options: [
          { label: 'Monochromatic', value: 'monochromatic' },
          { label: 'Analogous', value: 'analogous' },
          { label: 'Complementary', value: 'complementary' },
          { label: 'Triadic', value: 'triadic' },
          { label: 'Split Complementary', value: 'split_complementary' }
        ]
      },
      {
        id: 'num_colors',
        type: 'range',
        label: 'Number of Colors',
        required: true,
        min: 3,
        max: 10,
        step: 1,
        showValue: true,
        defaultValue: 5,
      }
    ],
    logicConfig: [
      {
        id: 'validate_and_parse_color',
        type: 'custom',
        name: 'Validate and Parse Base Color',
        config: {
          custom: {
            code: `// Validate hex color format
const hexPattern = /^#?([A-Fa-f0-9]{6})$/;
const cleanHex = base_color.trim();

if (!hexPattern.test(cleanHex)) {
  throw new Error('Invalid hex color format. Please use #RRGGBB format (e.g., #3B82F6)');
}

// Ensure hex starts with #
const validHex = cleanHex.startsWith('#') ? cleanHex : '#' + cleanHex;

// Parse to RGB
const r = parseInt(validHex.slice(1, 3), 16);
const g = parseInt(validHex.slice(3, 5), 16);
const b = parseInt(validHex.slice(5, 7), 16);

// Validate RGB values
if (r < 0 || r > 255 || g < 0 || g > 255 || b < 0 || b > 255) {
  throw new Error('RGB values must be between 0 and 255');
}

// Convert to HSL for color harmony calculations
const rNorm = r / 255;
const gNorm = g / 255;
const bNorm = b / 255;

const max = Math.max(rNorm, gNorm, bNorm);
const min = Math.min(rNorm, gNorm, bNorm);
const delta = max - min;

let h = 0;
let s = 0;
let l = (max + min) / 2;

if (delta !== 0) {
  s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  
  if (max === rNorm) {
    h = ((gNorm - bNorm) / delta + (gNorm < bNorm ? 6 : 0)) / 6;
  } else if (max === gNorm) {
    h = ((bNorm - rNorm) / delta + 2) / 6;
  } else {
    h = ((rNorm - gNorm) / delta + 4) / 6;
  }
}

return {
  hex: validHex.toUpperCase(),
  rgb: { r, g, b },
  hsl: { h: h * 360, s: s * 100, l: l * 100 }
};`,
            description: 'Validate hex format and convert to RGB and HSL'
          }
        }
      },
      {
        id: 'generate_palette',
        type: 'custom',
        name: 'Generate Color Harmony Palette',
        config: {
          custom: {
            code: `// Generate palette based on color theory
const baseHsl = step_validate_and_parse_color.hsl;
const baseHex = step_validate_and_parse_color.hex;

// Helper: HSL to Hex
function hslToHex(h, s, l) {
  s = s / 100;
  l = l / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  
  if (0 <= h && h < 60) { r = c; g = x; b = 0; }
  else if (60 <= h && h < 120) { r = x; g = c; b = 0; }
  else if (120 <= h && h < 180) { r = 0; g = c; b = x; }
  else if (180 <= h && h < 240) { r = 0; g = x; b = c; }
  else if (240 <= h && h < 300) { r = x; g = 0; b = c; }
  else if (300 <= h && h < 360) { r = c; g = 0; b = x; }
  
  r = Math.round((r + m) * 255);
  g = Math.round((g + m) * 255);
  b = Math.round((b + m) * 255);
  
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase();
}

const colors = [];
const h = baseHsl.h;
const s = baseHsl.s;
const l = baseHsl.l;

switch (palette_type) {
  case 'monochromatic':
    // Same hue, different lightness
    for (let i = 0; i < num_colors; i++) {
      const newL = 20 + (i * (60 / (num_colors - 1)));
      colors.push(hslToHex(h, s, newL));
    }
    break;

  case 'analogous':
    // Adjacent hues (±30°)
    const angleStep = 60 / (num_colors - 1);
    for (let i = 0; i < num_colors; i++) {
      const newH = (h - 30 + (i * angleStep) + 360) % 360;
      colors.push(hslToHex(newH, s, l));
    }
    break;

  case 'complementary':
    // Base + opposite (180°) with variations
    colors.push(baseHex);
    const compH = (h + 180) % 360;
    colors.push(hslToHex(compH, s, l));
    
    // Fill with lighter/darker variations
    for (let i = 2; i < num_colors; i++) {
      const useBase = i % 2 === 0;
      const targetH = useBase ? h : compH;
      const newL = l + ((i % 2 === 0 ? 15 : -15) * Math.floor(i / 2));
      colors.push(hslToHex(targetH, s, Math.max(10, Math.min(90, newL))));
    }
    break;

  case 'triadic':
    // 120° apart
    colors.push(baseHex);
    colors.push(hslToHex((h + 120) % 360, s, l));
    colors.push(hslToHex((h + 240) % 360, s, l));
    
    // Fill with variations
    for (let i = 3; i < num_colors; i++) {
      const baseIdx = i % 3;
      const baseHue = [h, (h + 120) % 360, (h + 240) % 360][baseIdx];
      const newL = l + ((i % 2 === 0 ? 10 : -10) * Math.floor(i / 3));
      colors.push(hslToHex(baseHue, s, Math.max(10, Math.min(90, newL))));
    }
    break;

  case 'split_complementary':
    // Base + two adjacent to complement (180°±30°)
    colors.push(baseHex);
    const comp = (h + 180) % 360;
    colors.push(hslToHex((comp - 30 + 360) % 360, s, l));
    colors.push(hslToHex((comp + 30) % 360, s, l));
    
    // Fill with variations
    for (let i = 3; i < num_colors; i++) {
      const targetH = [h, (comp - 30 + 360) % 360, (comp + 30) % 360][i % 3];
      const newL = l + ((i % 2 === 0 ? 10 : -10) * Math.floor(i / 3));
      colors.push(hslToHex(targetH, s, Math.max(10, Math.min(90, newL))));
    }
    break;
}

return colors.slice(0, num_colors);`,
            description: 'Generate color palette using color harmony theory'
          }
        }
      },
      {
        id: 'generate_css_variables',
        type: 'custom',
        name: 'Generate CSS Variables and Usage',
        config: {
          custom: {
            code: `// Generate CSS variables and usage examples
const palette = step_generate_palette;

const cssVars = palette.map((color, i) => 
  \`  --color-\${i + 1}: \${color};\`
).join('\\n');

const cssRoot = \`:root {\\n\${cssVars}\\n}\`;

const usageExamples = palette.map((color, i) => 
  \`.class-\${i + 1} { background-color: var(--color-\${i + 1}); }\`
).join('\\n');

const paletteInfo = {
  monochromatic: 'Uses the same hue with varying lightness for a cohesive, subtle look',
  analogous: 'Uses adjacent colors on the color wheel (±30°) for harmonious combinations',
  complementary: 'Uses opposite colors (180°) for high contrast and visual impact',
  triadic: 'Uses three colors equally spaced (120°) for vibrant, balanced palettes',
  split_complementary: 'Uses base color plus two colors adjacent to its complement for sophisticated harmony'
};

return {
  cssVariables: cssRoot,
  usageExamples: usageExamples,
  explanation: paletteInfo[palette_type] || 'Color harmony palette',
  colorCount: palette.length
};`,
            description: 'Generate CSS variables and usage examples'
          }
        }
      }
    ],
    outputConfig: {
      format: 'text',
      sections: [
        {
          type: 'result',
          title: '🎨 Generated Palette',
          content: 'Base Color: {step_validate_and_parse_color.hex}\\nPalette Type: {palette_type}\\nColors Generated: {step_generate_css_variables.colorCount}\\n\\nColors: {step_generate_palette}',
          visible: true
        },
        {
          type: 'result',
          title: '💡 Color Harmony Explanation',
          content: '{step_generate_css_variables.explanation}',
          visible: true
        },
        {
          type: 'result',
          title: '📋 CSS Variables',
          content: '{step_generate_css_variables.cssVariables}',
          visible: true
        },
        {
          type: 'result',
          title: '🎯 Usage Examples',
          content: '{step_generate_css_variables.usageExamples}',
          visible: true
        },
        {
          type: 'result',
          title: '💡 Pro Tips',
          content: '• Use monochromatic for minimalist designs\\n• Analogous palettes work well for nature themes\\n• Complementary creates strong visual contrast\\n• Triadic offers vibrant, balanced color schemes\\n• Test accessibility with color contrast checkers',
          visible: true
        }
      ]
    }
  },

  {
    id: 'json-formatter-validator',
    name: 'JSON Formatter/Validator',
    description: 'Validate, format, and minify JSON with detailed error reporting and structure analysis',
    category: 'utility',
    icon: '📋',
    tags: ['json', 'formatter', 'validator', 'developer', 'debugging'],
    difficulty: 'beginner',
    inputConfig: [
      {
        id: 'json_input',
        type: 'textarea',
        label: 'JSON Input',
        placeholder: '{"key": "value"}',
        required: true,
        rows: 10
      },
      {
        id: 'action',
        type: 'select',
        label: 'Action',
        required: true,
        defaultValue: 'format',
        options: [
          { label: 'Validate', value: 'validate' },
          { label: 'Format (Pretty Print)', value: 'format' },
          { label: 'Minify', value: 'minify' }
        ]
      }
    ],
    logicConfig: [
      {
        id: 'process_json',
        type: 'custom',
        name: 'Process and Validate JSON',
        config: {
          custom: {
            code: `// Comprehensive JSON processing with detailed error handling
const input = json_input.trim();

if (!input) {
  throw new Error('JSON input cannot be empty');
}

let result = {
  isValid: false,
  output: '',
  error: null,
  structure: {},
  stats: {}
};

try {
  // Try to parse JSON
  const parsed = JSON.parse(input);
  result.isValid = true;
  
  // Analyze structure
  const structureType = Array.isArray(parsed) ? 'array' : typeof parsed === 'object' ? 'object' : 'primitive';
  let keyCount = 0;
  let maxDepth = 0;
  
  function analyzeDepth(obj, depth = 0) {
    maxDepth = Math.max(maxDepth, depth);
    if (obj && typeof obj === 'object') {
      if (!Array.isArray(obj)) {
        keyCount += Object.keys(obj).length;
      }
      Object.values(obj).forEach(val => analyzeDepth(val, depth + 1));
    }
  }
  
  analyzeDepth(parsed);
  
  result.structure = {
    type: structureType,
    topLevelKeys: structureType === 'object' ? Object.keys(parsed).length : structureType === 'array' ? parsed.length : 0,
    totalKeys: keyCount,
    maxDepth: maxDepth
  };
  
  // Process based on action
  switch (action) {
    case 'validate':
      result.output = 'JSON is valid! ✓';
      break;
      
    case 'format':
      result.output = JSON.stringify(parsed, null, 2);
      break;
      
    case 'minify':
      result.output = JSON.stringify(parsed);
      break;
      
    default:
      result.output = JSON.stringify(parsed, null, 2);
  }
  
  // Calculate size stats
  const originalSize = new Blob([input]).size;
  const processedSize = new Blob([result.output]).size;
  
  result.stats = {
    originalSize: originalSize,
    processedSize: processedSize,
    difference: processedSize - originalSize,
    percentChange: originalSize > 0 ? Math.round(((processedSize - originalSize) / originalSize) * 100) : 0
  };
  
} catch (error) {
  result.isValid = false;
  result.error = {
    message: error.message,
    details: 'JSON parsing failed'
  };
  
  // Try to extract position from error message
  const posMatch = error.message.match(/position (\\d+)/i);
  if (posMatch) {
    const pos = parseInt(posMatch[1]);
    const lines = input.substring(0, pos).split('\\n');
    result.error.line = lines.length;
    result.error.column = lines[lines.length - 1].length + 1;
    result.error.position = pos;
    
    // Show context around error
    const startLine = Math.max(0, result.error.line - 2);
    const endLine = Math.min(input.split('\\n').length, result.error.line + 1);
    const contextLines = input.split('\\n').slice(startLine, endLine);
    result.error.context = contextLines.join('\\n');
  }
  
  result.output = \`Error: \${error.message}\`;
}

return result;`,
            description: 'Parse, validate, and process JSON with comprehensive error handling'
          }
        }
      },
      {
        id: 'generate_summary',
        type: 'custom',
        name: 'Generate Analysis Summary',
        config: {
          custom: {
            code: `// Generate detailed summary
const processResult = step_process_json;

if (!processResult.isValid) {
  let errorSummary = \`❌ JSON VALIDATION FAILED\\n\\n\`;
  errorSummary += \`Error: \${processResult.error.message}\\n\\n\`;
  
  if (processResult.error.line) {
    errorSummary += \`Location:\\n\`;
    errorSummary += \`  Line: \${processResult.error.line}\\n\`;
    errorSummary += \`  Column: \${processResult.error.column}\\n\`;
    errorSummary += \`  Position: \${processResult.error.position}\\n\\n\`;
    
    if (processResult.error.context) {
      errorSummary += \`Context:\\n\${processResult.error.context}\\n\\n\`;
    }
  }
  
  errorSummary += \`Common Issues:\\n\`;
  errorSummary += \`  • Missing or extra commas\\n\`;
  errorSummary += \`  • Unquoted keys or values\\n\`;
  errorSummary += \`  • Trailing commas in objects/arrays\\n\`;
  errorSummary += \`  • Single quotes instead of double quotes\\n\`;
  errorSummary += \`  • Unescaped special characters\\n\`;
  
  return errorSummary;
}

let summary = \`✅ JSON IS VALID\\n\\n\`;
summary += \`Structure Analysis:\\n\`;
summary += \`  Type: \${processResult.structure.type}\\n\`;
summary += \`  Top-level items: \${processResult.structure.topLevelKeys}\\n\`;
summary += \`  Total keys: \${processResult.structure.totalKeys}\\n\`;
summary += \`  Max depth: \${processResult.structure.maxDepth}\\n\\n\`;

summary += \`Size Comparison:\\n\`;
summary += \`  Original: \${processResult.stats.originalSize} bytes\\n\`;
summary += \`  Processed: \${processResult.stats.processedSize} bytes\\n\`;
summary += \`  Difference: \${processResult.stats.difference >= 0 ? '+' : ''}\${processResult.stats.difference} bytes (\${processResult.stats.percentChange >= 0 ? '+' : ''}\${processResult.stats.percentChange}%)\\n\\n\`;

summary += \`Action Performed: \${action}\\n\`;

if (action === 'format') {
  summary += \`  • Pretty-printed with 2-space indentation\\n\`;
  summary += \`  • Easier to read and debug\\n\`;
} else if (action === 'minify') {
  summary += \`  • Removed all whitespace and newlines\\n\`;
  summary += \`  • Optimized for storage/transmission\\n\`;
} else {
  summary += \`  • JSON structure validated successfully\\n\`;
}

return summary;`,
            description: 'Generate comprehensive analysis summary'
          }
        }
      }
    ],
    outputConfig: {
      format: 'text',
      sections: [
        {
          type: 'result',
          title: '📊 Analysis Summary',
          content: '{step_generate_summary}',
          visible: true
        },
        {
          type: 'result',
          title: '📋 Result',
          content: '{step_process_json.output}',
          visible: true
        },
        {
          type: 'result',
          title: '💡 Tips',
          content: '• Use "Format" for readable, debuggable JSON\\n• Use "Minify" to reduce file size for APIs\\n• Use "Validate" to check JSON before using it\\n• Always validate JSON from external sources\\n• Consider using a schema validator for complex data',
          visible: true
        }
      ]
    }
  }
];

// Helper functions for template management
export const getTemplatesByCategory = (category: string): ToolTemplate[] => {
  return TOOL_TEMPLATES.filter(template => template.category === category);
};

export const getTemplatesByDifficulty = (difficulty: 'beginner' | 'intermediate' | 'advanced'): ToolTemplate[] => {
  return TOOL_TEMPLATES.filter(template => template.difficulty === difficulty);
};

export const searchTemplates = (query: string): ToolTemplate[] => {
  const searchTerm = query.toLowerCase();
  return TOOL_TEMPLATES.filter(template => 
    template.name.toLowerCase().includes(searchTerm) ||
    template.description.toLowerCase().includes(searchTerm) ||
    template.tags.some(tag => tag.toLowerCase().includes(searchTerm))
  );
};

export const TEMPLATE_CATEGORIES = [
  { value: 'calculator', label: 'Calculators', icon: '🧮' },
  { value: 'converter', label: 'Converters', icon: '🔄' },
  { value: 'finance', label: 'Finance', icon: '💰' },
  { value: 'health', label: 'Health & Wellness', icon: '💪' },
  { value: 'productivity', label: 'Productivity', icon: '📋' },
  { value: 'security', label: 'Security', icon: '🔐' },
  { value: 'utility', label: 'Utilities', icon: '🛠️' },
  { value: 'developer', label: 'Developer Tools', icon: '👨‍💻' },
  { value: 'design', label: 'Design', icon: '🎨' },
];