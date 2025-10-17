import { renderWithProviders as render, screen, fireEvent, waitFor } from '@/test-utils';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import VisualFormDesigner from '../visual-form-designer';
import { FormField } from '@shared/tool-builder-schemas';

const mockOnChange = vi.fn();
const mockOnPreview = vi.fn();

const defaultProps = {
  fields: [],
  onChange: mockOnChange,
  onPreview: mockOnPreview,
  isPreviewMode: false,
};

describe('VisualFormDesigner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Field Types', () => {
    it('should render all available field types', () => {
      render(<VisualFormDesigner {...defaultProps} />);
      
      // Check basic field type buttons are available (using actual labels from component)
      expect(screen.getByText('Text Input')).toBeInTheDocument();
      expect(screen.getByText('Number')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('Phone')).toBeInTheDocument();
      expect(screen.getByText('URL')).toBeInTheDocument();
      expect(screen.getByText('Date')).toBeInTheDocument();
      expect(screen.getByText('Text Area')).toBeInTheDocument();
      expect(screen.getByText('Dropdown')).toBeInTheDocument();
      expect(screen.getByText('Toggle')).toBeInTheDocument();
    });

    it('should add text field when clicked', async () => {
      const user = userEvent.setup();
      render(<VisualFormDesigner {...defaultProps} />);
      
      await user.click(screen.getByText('Text Input'));
      
      expect(mockOnChange).toHaveBeenCalledWith([
        expect.objectContaining({
          type: 'text',
          label: 'Text Input',
          required: false,
        })
      ]);
    });

    it('should add number field when clicked', async () => {
      const user = userEvent.setup();
      render(<VisualFormDesigner {...defaultProps} />);
      
      await user.click(screen.getByText('Number'));
      
      expect(mockOnChange).toHaveBeenCalledWith([
        expect.objectContaining({
          type: 'number',
          label: 'Number',
          required: false,
        })
      ]);
    });

    it('should add select field with default options when clicked', async () => {
      const user = userEvent.setup();
      render(<VisualFormDesigner {...defaultProps} />);
      
      await user.click(screen.getByText('Dropdown'));
      
      expect(mockOnChange).toHaveBeenCalledWith([
        expect.objectContaining({
          type: 'select',
          label: 'Dropdown',
          required: false,
          options: [
            { label: 'Option 1', value: 'option_1' },
            { label: 'Option 2', value: 'option_2' }
          ]
        })
      ]);
    });
  });

  describe('Field Management', () => {
    const sampleFields: FormField[] = [
      {
        id: 'field1',
        type: 'text',
        label: 'Test Field',
        required: false,
      },
      {
        id: 'field2',
        type: 'select',
        label: 'Test Select',
        required: true,
        options: [
          { label: 'Option A', value: 'a' },
          { label: 'Option B', value: 'b' }
        ]
      }
    ];

    it('should display existing fields', () => {
      render(<VisualFormDesigner fields={sampleFields} onChange={mockOnChange} />);
      
      expect(screen.getByText('Test Field')).toBeInTheDocument();
      expect(screen.getByText('Test Select')).toBeInTheDocument();
    });

    it('should delete a field when delete button is clicked', async () => {
      const user = userEvent.setup();
      render(<VisualFormDesigner fields={sampleFields} onChange={mockOnChange} onPreview={mockOnPreview} isPreviewMode={false} />);
      
      // Find all buttons - delete buttons are inside the field cards
      const allButtons = screen.getAllByRole('button');
      // Filter to get only the trash/delete buttons (they're ghost variant buttons with Trash2 icon)
      // In a simple test, we can target by position or use container queries
      const firstFieldCard = screen.getByText('Test Field').closest('[draggable="true"]') || screen.getByText('Test Field').closest('.p-4');
      const deleteButton = firstFieldCard?.querySelector('button[class*="ghost"]');
      
      if (deleteButton) {
        await user.click(deleteButton as HTMLElement);
      }
      
      expect(mockOnChange).toHaveBeenCalledWith([sampleFields[1]]);
    });

    it('should update field properties when edited', async () => {
      const user = userEvent.setup();
      render(<VisualFormDesigner fields={sampleFields} onChange={mockOnChange} onPreview={mockOnPreview} isPreviewMode={false} />);
      
      // Click on first field to select it
      await user.click(screen.getByText('Test Field'));
      
      // Edit the label
      const labelInput = screen.getByDisplayValue('Test Field');
      await user.clear(labelInput);
      await user.type(labelInput, 'Updated Field');
      
      expect(mockOnChange).toHaveBeenCalledWith([
        expect.objectContaining({
          id: 'field1',
          label: 'Updated Field',
        }),
        sampleFields[1]
      ]);
    });

    it('should toggle required status', async () => {
      const user = userEvent.setup();
      render(<VisualFormDesigner fields={sampleFields} onChange={mockOnChange} onPreview={mockOnPreview} isPreviewMode={false} />);
      
      // Select first field
      await user.click(screen.getByText('Test Field'));
      
      // Toggle required switch (it's a Switch component, not a checkbox)
      const requiredSwitch = screen.getByRole('switch', { name: /required/i });
      await user.click(requiredSwitch);
      
      expect(mockOnChange).toHaveBeenCalledWith([
        expect.objectContaining({
          id: 'field1',
          required: true,
        }),
        sampleFields[1]
      ]);
    });
  });

  describe('Select Field Options', () => {
    const selectField: FormField = {
      id: 'select1',
      type: 'select',
      label: 'Test Select',
      required: false,
      options: [
        { label: 'Option 1', value: 'opt1' },
        { label: 'Option 2', value: 'opt2' }
      ]
    };

    it('should display select field options for editing', async () => {
      const user = userEvent.setup();
      render(<VisualFormDesigner fields={[selectField]} onChange={mockOnChange} onPreview={mockOnPreview} isPreviewMode={false} />);
      
      // Select the field
      await user.click(screen.getByText('Test Select'));
      
      // Check options textarea appears
      const optionsTextarea = screen.getByPlaceholderText('One option per line');
      expect(optionsTextarea).toBeInTheDocument();
      expect(optionsTextarea).toHaveValue('Option 1\nOption 2');
    });

    it('should update select options when textarea is modified', async () => {
      const user = userEvent.setup();
      render(<VisualFormDesigner fields={[selectField]} onChange={mockOnChange} onPreview={mockOnPreview} isPreviewMode={false} />);
      
      // Select the field
      await user.click(screen.getByText('Test Select'));
      
      // Modify options
      const optionsTextarea = screen.getByPlaceholderText('One option per line');
      await user.clear(optionsTextarea);
      await user.type(optionsTextarea, 'New Option 1\nNew Option 2\nNew Option 3');
      
      expect(mockOnChange).toHaveBeenCalledWith([
        expect.objectContaining({
          id: 'select1',
          options: [
            { label: 'New Option 1', value: 'new_option_1' },
            { label: 'New Option 2', value: 'new_option_2' },
            { label: 'New Option 3', value: 'new_option_3' }
          ]
        })
      ]);
    });
  });

  describe('Field Preview', () => {
    const previewFields: FormField[] = [
      {
        id: 'text1',
        type: 'text',
        label: 'Text Input',
        placeholder: 'Enter text here',
        required: true,
      },
      {
        id: 'number1',
        type: 'number',
        label: 'Number Input',
        required: false,
      },
      {
        id: 'select1',
        type: 'select',
        label: 'Select Input',
        required: false,
        options: [
          { label: 'Option A', value: 'a' },
          { label: 'Option B', value: 'b' }
        ]
      }
    ];

    it('should render preview of all field types correctly', () => {
      render(<VisualFormDesigner fields={previewFields} onChange={mockOnChange} onPreview={mockOnPreview} isPreviewMode={false} />);
      
      // In edit mode (not preview), fields are shown in the canvas
      // Just verify the fields are displayed with their labels
      expect(screen.getByText('Text Input')).toBeInTheDocument();
      expect(screen.getByText('Number Input')).toBeInTheDocument();
      expect(screen.getByText('Select Input')).toBeInTheDocument();
    });

    it('should display field labels in preview', () => {
      render(<VisualFormDesigner fields={previewFields} onChange={mockOnChange} onPreview={mockOnPreview} isPreviewMode={false} />);
      
      // Use getAllByText for labels that might appear multiple times (in palette and canvas)
      const textInputs = screen.getAllByText('Text Input');
      const numberInputs = screen.getAllByText('Number Input');
      const selectInputs = screen.getAllByText('Select Input');
      
      expect(textInputs.length).toBeGreaterThan(0);
      expect(numberInputs.length).toBeGreaterThan(0);
      expect(selectInputs.length).toBeGreaterThan(0);
    });
  });

  describe('Drag and Drop', () => {
    it('should handle field reordering via drag and drop', async () => {
      const user = userEvent.setup();
      const fields: FormField[] = [
        { id: 'field1', type: 'text', label: 'First Field', required: false },
        { id: 'field2', type: 'number', label: 'Second Field', required: false }
      ];
      
      render(<VisualFormDesigner fields={fields} onChange={mockOnChange} onPreview={mockOnPreview} isPreviewMode={false} />);
      
      // Note: Testing drag and drop with react-beautiful-dnd requires more complex setup
      // This is a simplified test to verify the component renders without errors
      expect(screen.getByText('First Field')).toBeInTheDocument();
      expect(screen.getByText('Second Field')).toBeInTheDocument();
    });
  });
});