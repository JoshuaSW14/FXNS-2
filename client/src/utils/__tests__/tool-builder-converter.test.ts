import { describe, it, expect } from 'vitest';
import { convertInputConfigToInputSpec } from '../tool-builder-converter';

describe('convertInputConfigToInputSpec', () => {
  it('should convert basic text field', () => {
    const input = [
      {
        id: 'textField',
        type: 'text',
        label: 'Text Input',
        placeholder: 'Enter text',
        required: true,
        defaultValue: 'default text'
      }
    ];

    const result = convertInputConfigToInputSpec(input);

    expect(result).toEqual({
      textField: {
        type: 'string',
        label: 'Text Input',
        placeholder: 'Enter text',
        required: true,
        default: 'default text'
      }
    });
  });

  it('should convert number field with constraints', () => {
    const input = [
      {
        id: 'numberField',
        type: 'number',
        label: 'Number Input',
        required: false,
        min: 0,
        max: 100,
        step: 5,
        defaultValue: 25
      }
    ];

    const result = convertInputConfigToInputSpec(input);

    expect(result).toEqual({
      numberField: {
        type: 'number',
        label: 'Number Input',
        required: false,
        default: 25,
        min: 0,
        max: 100,
        step: 5
      }
    });
  });

  it('should convert checkbox to boolean', () => {
    const input = [
      {
        id: 'checkboxField',
        type: 'checkbox',
        label: 'Checkbox Input',
        defaultValue: true
      }
    ];

    const result = convertInputConfigToInputSpec(input);

    expect(result).toEqual({
      checkboxField: {
        type: 'boolean',
        label: 'Checkbox Input',
        required: false,
        default: true
      }
    });
  });

  it('should convert boolean field', () => {
    const input = [
      {
        id: 'boolField',
        type: 'boolean',
        label: 'Boolean Input',
        required: true,
        defaultValue: false
      }
    ];

    const result = convertInputConfigToInputSpec(input);

    expect(result).toEqual({
      boolField: {
        type: 'boolean',
        label: 'Boolean Input',
        required: true,
        default: false
      }
    });
  });

  it('should convert select field with options', () => {
    const input = [
      {
        id: 'selectField',
        type: 'select',
        label: 'Select Input',
        options: [
          { value: 'option1', label: 'Option 1' },
          { value: 'option2', label: 'Option 2' },
          'option3'
        ],
        defaultValue: 'option1'
      }
    ];

    const result = convertInputConfigToInputSpec(input);

    expect(result).toEqual({
      selectField: {
        type: 'select',
        label: 'Select Input',
        required: false,
        default: 'option1',
        options: ['option1', 'option2', 'option3']
      }
    });
  });

  it('should convert radio to select with options', () => {
    const input = [
      {
        id: 'radioField',
        type: 'radio',
        label: 'Radio Input',
        options: [
          { value: 'choice1', label: 'Choice 1' },
          { value: 'choice2', label: 'Choice 2' }
        ],
        defaultValue: 'choice1'
      }
    ];

    const result = convertInputConfigToInputSpec(input);

    expect(result).toEqual({
      radioField: {
        type: 'select',
        label: 'Radio Input',
        required: false,
        default: 'choice1',
        options: ['choice1', 'choice2']
      }
    });
  });

  it('should convert textarea field', () => {
    const input = [
      {
        id: 'textareaField',
        type: 'textarea',
        label: 'Textarea Input',
        placeholder: 'Enter long text',
        defaultValue: 'Multi-line\ntext'
      }
    ];

    const result = convertInputConfigToInputSpec(input);

    expect(result).toEqual({
      textareaField: {
        type: 'textarea',
        label: 'Textarea Input',
        placeholder: 'Enter long text',
        required: false,
        default: 'Multi-line\ntext'
      }
    });
  });

  it('should convert various string field types', () => {
    const input = [
      {
        id: 'emailField',
        type: 'email',
        label: 'Email',
        defaultValue: 'test@example.com'
      },
      {
        id: 'urlField',
        type: 'url',
        label: 'URL',
        defaultValue: 'https://example.com'
      },
      {
        id: 'dateField',
        type: 'date',
        label: 'Date',
        defaultValue: '2023-01-01'
      },
      {
        id: 'telField',
        type: 'tel',
        label: 'Phone',
        defaultValue: '555-1234'
      }
    ];

    const result = convertInputConfigToInputSpec(input);

    expect(result).toEqual({
      emailField: {
        type: 'string',
        label: 'Email',
        required: false,
        default: 'test@example.com'
      },
      urlField: {
        type: 'string',
        label: 'URL',
        required: false,
        default: 'https://example.com'
      },
      dateField: {
        type: 'string',
        label: 'Date',
        required: false,
        default: '2023-01-01'
      },
      telField: {
        type: 'string',
        label: 'Phone',
        required: false,
        default: '555-1234'
      }
    });
  });

  it('should handle mixed field types', () => {
    const input = [
      {
        id: 'name',
        type: 'text',
        label: 'Name',
        required: true
      },
      {
        id: 'age',
        type: 'number',
        label: 'Age',
        min: 0,
        max: 120
      },
      {
        id: 'active',
        type: 'checkbox',
        label: 'Active',
        defaultValue: true
      },
      {
        id: 'category',
        type: 'select',
        label: 'Category',
        options: ['A', 'B', 'C']
      }
    ];

    const result = convertInputConfigToInputSpec(input);

    expect(result).toEqual({
      name: {
        type: 'string',
        label: 'Name',
        required: true,
        default: undefined
      },
      age: {
        type: 'number',
        label: 'Age',
        required: false,
        default: undefined,
        min: 0,
        max: 120
      },
      active: {
        type: 'boolean',
        label: 'Active',
        required: false,
        default: true
      },
      category: {
        type: 'select',
        label: 'Category',
        required: false,
        default: undefined,
        options: ['A', 'B', 'C']
      }
    });
  });

  it('should handle empty input array', () => {
    const result = convertInputConfigToInputSpec([]);
    expect(result).toEqual({});
  });

  it('should skip fields without id or type', () => {
    const input = [
      {
        id: 'validField',
        type: 'text',
        label: 'Valid Field'
      },
      {
        // Missing id
        type: 'text',
        label: 'Invalid Field'
      },
      {
        id: 'anotherInvalid',
        // Missing type
        label: 'Another Invalid'
      },
      {
        // Missing both
        label: 'Completely Invalid'
      }
    ];

    const result = convertInputConfigToInputSpec(input);

    expect(result).toEqual({
      validField: {
        type: 'string',
        label: 'Valid Field',
        required: false,
        default: undefined
      }
    });
  });

  it('should handle number field without constraints', () => {
    const input = [
      {
        id: 'simpleNumber',
        type: 'number',
        label: 'Simple Number'
      }
    ];

    const result = convertInputConfigToInputSpec(input);

    expect(result).toEqual({
      simpleNumber: {
        type: 'number',
        label: 'Simple Number',
        required: false,
        default: undefined
      }
    });
  });

  it('should handle select/radio fields without options', () => {
    const input = [
      {
        id: 'selectNoOptions',
        type: 'select',
        label: 'Select Without Options'
      },
      {
        id: 'radioNoOptions',
        type: 'radio',
        label: 'Radio Without Options'
      }
    ];

    const result = convertInputConfigToInputSpec(input);

    expect(result).toEqual({
      selectNoOptions: {
        type: 'select',
        label: 'Select Without Options',
        required: false,
        default: undefined
      },
      radioNoOptions: {
        type: 'select',
        label: 'Radio Without Options',
        required: false,
        default: undefined
      }
    });
  });

  it('should handle unknown field types', () => {
    const input = [
      {
        id: 'unknownField',
        type: 'unknownType' as any,
        label: 'Unknown Field Type'
      }
    ];

    const result = convertInputConfigToInputSpec(input);

    expect(result).toEqual({
      unknownField: {
        type: 'string',
        label: 'Unknown Field Type',
        required: false,
        default: undefined
      }
    });
  });

  it('should handle partial number constraints', () => {
    const input = [
      {
        id: 'minOnly',
        type: 'number',
        label: 'Min Only',
        min: 10
      },
      {
        id: 'maxOnly',
        type: 'number',
        label: 'Max Only',
        max: 100
      },
      {
        id: 'stepOnly',
        type: 'number',
        label: 'Step Only',
        step: 0.5
      }
    ];

    const result = convertInputConfigToInputSpec(input);

    expect(result).toEqual({
      minOnly: {
        type: 'number',
        label: 'Min Only',
        required: false,
        default: undefined,
        min: 10
      },
      maxOnly: {
        type: 'number',
        label: 'Max Only',
        required: false,
        default: undefined,
        max: 100
      },
      stepOnly: {
        type: 'number',
        label: 'Step Only',
        required: false,
        default: undefined,
        step: 0.5
      }
    });
  });
});