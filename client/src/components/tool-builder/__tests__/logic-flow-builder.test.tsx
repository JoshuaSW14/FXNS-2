import { renderWithProviders as render, screen, fireEvent, waitFor } from '@/test-utils';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LogicFlowBuilder from '../logic-flow-builder';
import { FormField, LogicStep } from '@shared/tool-builder-schemas';

const mockOnChange = vi.fn();

const sampleFormFields: FormField[] = [
  { id: 'field1', type: 'number', label: 'Price', required: true },
  { id: 'field2', type: 'number', label: 'Quantity', required: true },
  { id: 'field3', type: 'text', label: 'Name', required: false }
];

const defaultProps = {
  steps: [],
  formFields: sampleFormFields,
  onChange: mockOnChange,
};

describe('LogicFlowBuilder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Step Types', () => {
    it('should render all available step types', () => {
      render(<LogicFlowBuilder {...defaultProps} />);
      
      expect(screen.getByText('Calculation')).toBeInTheDocument();
      expect(screen.getByText('Condition')).toBeInTheDocument();
      expect(screen.getByText('Transform')).toBeInTheDocument();
    });

    it('should add calculation step when clicked', async () => {
      const user = userEvent.setup();
      render(<LogicFlowBuilder {...defaultProps} />);
      
      await user.click(screen.getByText('Calculation'));
      
      expect(mockOnChange).toHaveBeenCalledWith([
        expect.objectContaining({
          type: 'calculation',
          position: { x: 0, y: 0 },
          config: {
            calculation: {
              formula: '',
              variables: []
            }
          }
        })
      ]);
    });

    it('should add condition step when clicked', async () => {
      const user = userEvent.setup();
      render(<LogicFlowBuilder {...defaultProps} />);
      
      await user.click(screen.getByText('Condition'));
      
      expect(mockOnChange).toHaveBeenCalledWith([
        expect.objectContaining({
          type: 'condition',
          config: {
            condition: {
              if: {
                fieldId: 'field1',
                operator: 'equals',
                value: ''
              },
              then: [],
              else: []
            }
          }
        })
      ]);
    });

    it('should add transform step when clicked', async () => {
      const user = userEvent.setup();
      render(<LogicFlowBuilder {...defaultProps} />);
      
      await user.click(screen.getByText('Transform'));
      
      expect(mockOnChange).toHaveBeenCalledWith([
        expect.objectContaining({
          type: 'transform',
          config: {
            transform: {
              inputFieldId: 'field1',
              transformType: 'uppercase'
            }
          }
        })
      ]);
    });
  });

  describe('Calculation Steps', () => {
    const calculationStep: LogicStep = {
      id: 'calc1',
      type: 'calculation',
      position: { x: 0, y: 0 },
      config: {
        calculation: {
          formula: 'price * quantity',
          variables: [
            { name: 'price', fieldId: 'field1' },
            { name: 'quantity', fieldId: 'field2' }
          ]
        }
      }
    };

    it('should display calculation step correctly', () => {
      render(<LogicFlowBuilder steps={[calculationStep]} formFields={sampleFormFields} onChange={mockOnChange} />);
      
      expect(screen.getByText('Calculation')).toBeInTheDocument();
      expect(screen.getByText('price * quantity')).toBeInTheDocument();
    });

    it('should allow editing calculation formula', async () => {
      const user = userEvent.setup();
      render(<LogicFlowBuilder steps={[calculationStep]} formFields={sampleFormFields} onChange={mockOnChange} />);
      
      // Click on the step to select it
      await user.click(screen.getByText('Calculation'));
      
      // Find and edit the formula input
      const formulaInput = screen.getByPlaceholderText(/enter formula/i);
      await user.clear(formulaInput);
      await user.type(formulaInput, 'price * quantity * 1.1');
      
      expect(mockOnChange).toHaveBeenCalledWith([
        expect.objectContaining({
          config: {
            calculation: {
              formula: 'price * quantity * 1.1',
              variables: expect.any(Array)
            }
          }
        })
      ]);
    });

    it('should show available variables for calculation', async () => {
      const user = userEvent.setup();
      render(<LogicFlowBuilder steps={[calculationStep]} formFields={sampleFormFields} onChange={mockOnChange} />);
      
      // Click on the step to select it
      await user.click(screen.getByText('Calculation'));
      
      // Check that number fields are shown as available variables
      expect(screen.getByText('Price')).toBeInTheDocument();
      expect(screen.getByText('Quantity')).toBeInTheDocument();
      // Text field should not be shown for calculations
      expect(screen.queryByText('Name')).not.toBeInTheDocument();
    });
  });

  describe('Condition Steps', () => {
    const conditionStep: LogicStep = {
      id: 'cond1',
      type: 'condition',
      position: { x: 0, y: 100 },
      config: {
        condition: {
          if: {
            fieldId: 'field1',
            operator: 'greater_than',
            value: '100'
          },
          then: [],
          else: []
        }
      }
    };

    it('should display condition step correctly', () => {
      render(<LogicFlowBuilder steps={[conditionStep]} formFields={sampleFormFields} onChange={mockOnChange} />);
      
      expect(screen.getByText('Condition')).toBeInTheDocument();
      expect(screen.getByText('If field1 greater_than 100')).toBeInTheDocument();
    });

    it('should allow editing condition parameters', async () => {
      const user = userEvent.setup();
      render(<LogicFlowBuilder steps={[conditionStep]} formFields={sampleFormFields} onChange={mockOnChange} />);
      
      // Click on the step to select it
      await user.click(screen.getByText('Condition'));
      
      // Change the comparison value
      const valueInput = screen.getByDisplayValue('100');
      await user.clear(valueInput);
      await user.type(valueInput, '200');
      
      expect(mockOnChange).toHaveBeenCalledWith([
        expect.objectContaining({
          config: {
            condition: {
              if: {
                fieldId: 'field1',
                operator: 'greater_than',
                value: '200'
              },
              then: [],
              else: []
            }
          }
        })
      ]);
    });

    it('should show all form fields for condition selection', async () => {
      const user = userEvent.setup();
      render(<LogicFlowBuilder steps={[conditionStep]} formFields={sampleFormFields} onChange={mockOnChange} />);
      
      // Click on the step to select it
      await user.click(screen.getByText('Condition'));
      
      // Should be able to select any field for condition
      const fieldSelect = screen.getByDisplayValue('field1');
      await user.click(fieldSelect);
      
      // All fields should be available as options
      expect(screen.getByText('Price')).toBeInTheDocument();
      expect(screen.getByText('Quantity')).toBeInTheDocument();
      expect(screen.getByText('Name')).toBeInTheDocument();
    });
  });

  describe('Transform Steps', () => {
    const transformStep: LogicStep = {
      id: 'trans1',
      type: 'transform',
      position: { x: 0, y: 200 },
      config: {
        transform: {
          inputFieldId: 'field3',
          transformType: 'uppercase'
        }
      }
    };

    it('should display transform step correctly', () => {
      render(<LogicFlowBuilder steps={[transformStep]} formFields={sampleFormFields} onChange={mockOnChange} />);
      
      expect(screen.getByText('Transform')).toBeInTheDocument();
      expect(screen.getByText('uppercase field3')).toBeInTheDocument();
    });

    it('should allow changing transform type', async () => {
      const user = userEvent.setup();
      render(<LogicFlowBuilder steps={[transformStep]} formFields={sampleFormFields} onChange={mockOnChange} />);
      
      // Click on the step to select it
      await user.click(screen.getByText('Transform'));
      
      // Change transform type
      const transformSelect = screen.getByDisplayValue('uppercase');
      await user.selectOptions(transformSelect, 'lowercase');
      
      expect(mockOnChange).toHaveBeenCalledWith([
        expect.objectContaining({
          config: {
            transform: {
              inputFieldId: 'field3',
              transformType: 'lowercase'
            }
          }
        })
      ]);
    });

    it('should show all transform types', async () => {
      const user = userEvent.setup();
      render(<LogicFlowBuilder steps={[transformStep]} formFields={sampleFormFields} onChange={mockOnChange} />);
      
      // Click on the step to select it
      await user.click(screen.getByText('Transform'));
      
      // Check all transform options are available
      const transformSelect = screen.getByDisplayValue('uppercase');
      expect(transformSelect).toBeInTheDocument();
      
      const options = transformSelect.querySelectorAll('option');
      const optionValues = Array.from(options).map(opt => opt.getAttribute('value'));
      
      expect(optionValues).toContain('uppercase');
      expect(optionValues).toContain('lowercase');
      expect(optionValues).toContain('trim');
      expect(optionValues).toContain('reverse');
    });
  });

  describe('Step Management', () => {
    const multipleSteps: LogicStep[] = [
      {
        id: 'step1',
        type: 'calculation',
        position: { x: 0, y: 0 },
        config: { calculation: { formula: 'a + b', variables: [] } }
      },
      {
        id: 'step2',
        type: 'condition',
        position: { x: 0, y: 100 },
        config: { 
          condition: { 
            if: { fieldId: 'field1', operator: 'equals', value: '10' },
            then: [],
            else: []
          }
        }
      }
    ];

    it('should display multiple steps', () => {
      render(<LogicFlowBuilder steps={multipleSteps} formFields={sampleFormFields} onChange={mockOnChange} />);
      
      expect(screen.getByText('a + b')).toBeInTheDocument();
      expect(screen.getByText('If field1 equals 10')).toBeInTheDocument();
    });

    it('should allow deleting steps', async () => {
      const user = userEvent.setup();
      render(<LogicFlowBuilder steps={multipleSteps} formFields={sampleFormFields} onChange={mockOnChange} />);
      
      // Find and click delete button for first step
      const deleteButtons = screen.getAllByLabelText(/delete step/i);
      await user.click(deleteButtons[0]);
      
      expect(mockOnChange).toHaveBeenCalledWith([multipleSteps[1]]);
    });

    it('should allow step selection', async () => {
      const user = userEvent.setup();
      render(<LogicFlowBuilder steps={multipleSteps} formFields={sampleFormFields} onChange={mockOnChange} />);
      
      // Click on second step
      await user.click(screen.getByText('If field1 equals 10'));
      
      // Should show step details in sidebar
      expect(screen.getByText('Condition Details')).toBeInTheDocument();
    });
  });

  describe('Flow Visualization', () => {
    it('should render empty state when no steps', () => {
      render(<LogicFlowBuilder {...defaultProps} />);
      
      expect(screen.getByText('No logic steps yet')).toBeInTheDocument();
      expect(screen.getByText('Add your first step to begin building the logic flow')).toBeInTheDocument();
    });

    it('should show step connections visually', () => {
      const steps: LogicStep[] = [
        {
          id: 'step1',
          type: 'calculation',
          position: { x: 0, y: 0 },
          config: { calculation: { formula: 'price * quantity', variables: [] } }
        },
        {
          id: 'step2',
          type: 'transform',
          position: { x: 0, y: 100 },
          config: { transform: { inputFieldId: 'field1', transformType: 'uppercase' } }
        }
      ];
      
      render(<LogicFlowBuilder steps={steps} formFields={sampleFormFields} onChange={mockOnChange} />);
      
      // Check that both steps are rendered
      expect(screen.getByText('price * quantity')).toBeInTheDocument();
      expect(screen.getByText('uppercase field1')).toBeInTheDocument();
    });
  });
});