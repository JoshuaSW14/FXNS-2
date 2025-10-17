import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VisualToolBuilderPage from '@/pages/visual-tool-builder-page';
import { useAuth } from '@/hooks/use-auth';

// Mock the auth hook
vi.mock('@/hooks/use-auth');

// Mock the apiRequest function
const mockApiRequest = vi.fn();
vi.mock('@/lib/queryClient', () => ({
  apiRequest: mockApiRequest,
  queryClient: new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })
}));

// Mock navigation components
vi.mock('@/components/navigation-header', () => ({
  default: () => <div data-testid="navigation-header">Navigation</div>
}));

// Mock tool builder components with more realistic behavior
vi.mock('@/components/tool-builder/visual-form-designer', () => ({
  default: ({ fields, onChange }: any) => (
    <div data-testid="visual-form-designer">
      <div data-testid="field-count">Fields: {fields.length}</div>
      {fields.map((field: any) => (
        <div key={field.id} data-testid={`field-${field.id}`}>
          <span data-testid={`field-${field.id}-label`}>{field.label}</span>
          <span data-testid={`field-${field.id}-type`}>({field.type})</span>
        </div>
      ))}
    </div>
  )
}));

vi.mock('@/components/tool-builder/logic-flow-builder', () => ({
  default: ({ steps }: any) => (
    <div data-testid="logic-flow-builder">
      <div data-testid="logic-count">Logic steps: {steps.length}</div>
      {steps.map((step: any) => (
        <div key={step.id} data-testid={`logic-${step.id}`}>
          {step.type}: {step.config.calculation?.formula || 'no formula'}
        </div>
      ))}
    </div>
  )
}));

vi.mock('@/components/tool-builder/tool-test-runner', () => ({
  default: ({ draftId }: any) => (
    <div data-testid="tool-test-runner">
      Test Runner for draft: {draftId}
    </div>
  )
}));

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('Complete Edit Workflow E2E Test', () => {
  const mockUser = {
    id: 'test-user-123',
    name: 'Test User',
    email: 'test@example.com'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({
      user: mockUser,
      isAuthenticated: true
    });
  });

  it('should complete the entire edit workflow: published tool → draft conversion → field population → validation', async () => {
    // Mock window.location.search for edit mode with published tool ID
    Object.defineProperty(window, 'location', {
      value: {
        search: '?draft=published-tool-123'
      },
      writable: true
    });

    const user = userEvent.setup();

    // Step 1: Mock 404 response for draft (published tool doesn't exist as draft)
    mockApiRequest.mockRejectedValueOnce(new Error('Failed to load draft'));

    // Step 2: Mock successful conversion of published tool to draft
    const mockConvertedDraft = {
      success: true,
      data: {
        id: 'new-draft-456',
        name: 'Calculator Tool (Edit)',
        description: 'A calculator that doubles numbers',
        category: 'calculator',
        status: 'draft',
        inputConfig: [
          {
            id: 'inputNumber',
            type: 'number',
            label: 'Number to Double',
            required: true
          }
        ],
        logicConfig: [
          {
            id: 'double-calc',
            type: 'calculation',
            config: {
              calculation: {
                formula: 'inputNumber * 2',
                variables: [{ name: 'inputNumber', fieldId: 'inputNumber' }]
              }
            }
          }
        ],
        outputConfig: {
          format: 'text',
          sections: [{
            type: 'result',
            title: 'Result',
            content: 'Your result will appear here...',
            visible: true
          }]
        },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      }
    };

    mockApiRequest.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockConvertedDraft)
    });

    render(
      
        <VisualToolBuilderPage />
      
    );

    // Verify conversion API call was made
    await waitFor(() => {
      expect(mockApiRequest).toHaveBeenCalledWith('POST', '/api/tool-builder/drafts/from-published/published-tool-123');
    }, { timeout: 5000 });

    // Step 3: Verify form is populated with converted data
    await waitFor(() => {
      const nameInput = screen.getByDisplayValue('Calculator Tool (Edit)');
      expect(nameInput).toBeInTheDocument();
    });

    const descriptionInput = screen.getByDisplayValue('A calculator that doubles numbers');
    expect(descriptionInput).toBeInTheDocument();

    // Step 4: Navigate to form design step to verify fields loaded
    const nextButton = screen.getByText('Next: Design Form');
    await user.click(nextButton);

    // Verify input fields are loaded
    await waitFor(() => {
      expect(screen.getByTestId('field-count')).toHaveTextContent('Fields: 1');
      expect(screen.getByTestId('field-inputNumber')).toBeInTheDocument();
      expect(screen.getByTestId('field-inputNumber-label')).toHaveTextContent('Number to Double');
      expect(screen.getByTestId('field-inputNumber-type')).toHaveTextContent('(number)');
    });

    // Step 5: Navigate to logic step to verify logic loaded
    const nextToLogicButton = screen.getByText('Next: Add Logic');
    await user.click(nextToLogicButton);

    await waitFor(() => {
      expect(screen.getByTestId('logic-count')).toHaveTextContent('Logic steps: 1');
      expect(screen.getByTestId('logic-double-calc')).toBeInTheDocument();
      expect(screen.getByTestId('logic-double-calc')).toHaveTextContent('calculation: inputNumber * 2');
    });

    // Step 6: Test validation by trying to navigate to test step
    // Mock save operation for moving to testing
    mockApiRequest.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, data: { id: 'new-draft-456' } })
    });

    const moveToTestButton = screen.getByText('Next: Test Tool');
    await user.click(moveToTestButton);

    // Verify save operation was called with correct data
    await waitFor(() => {
      expect(mockApiRequest).toHaveBeenCalledWith('PUT', '/api/tool-builder/drafts/new-draft-456', 
        expect.objectContaining({
          name: 'Calculator Tool (Edit)',
          description: 'A calculator that doubles numbers',
          category: 'calculator',
          status: 'testing'
        })
      );
    });

    // Step 7: Verify we're now on the test step
    await waitFor(() => {
      expect(screen.getByTestId('tool-test-runner')).toBeInTheDocument();
      expect(screen.getByTestId('tool-test-runner')).toHaveTextContent('Test Runner for draft: new-draft-456');
    });

    console.log('✅ Complete edit workflow test passed');
  }, 30000);

  it('should show loading indicator during conversion', async () => {
    Object.defineProperty(window, 'location', {
      value: { search: '?draft=published-tool-123' },
      writable: true
    });

    // Mock 404 for draft
    mockApiRequest.mockRejectedValueOnce(new Error('Failed to load draft'));

    // Mock slow conversion (never resolves to keep loading state)
    mockApiRequest.mockImplementationOnce(() => new Promise(() => {}));

    render(
      
        <VisualToolBuilderPage />
      
    );

    // Should show loading indicator
    await waitFor(() => {
      expect(screen.getByText('Converting tool for editing...')).toBeInTheDocument();
    });

    // Should disable save button during conversion
    const saveButton = screen.getByText('Save Draft');
    expect(saveButton).toBeDisabled();
  });

  it('should handle conversion errors gracefully', async () => {
    Object.defineProperty(window, 'location', {
      value: { search: '?draft=non-existent-tool' },
      writable: true
    });

    // Mock 404 for draft
    mockApiRequest.mockRejectedValueOnce(new Error('Failed to load draft'));

    // Mock conversion error
    mockApiRequest.mockRejectedValueOnce(new Error('This tool type cannot be edited with the visual builder'));

    render(
      
        <VisualToolBuilderPage />
      
    );

    // Should show error message in toast (we can't easily test toast but the mutation should be called)
    await waitFor(() => {
      expect(mockApiRequest).toHaveBeenCalledWith('POST', '/api/tool-builder/drafts/from-published/non-existent-tool');
    });

    // Form should remain empty/default state
    const nameInput = screen.getByPlaceholderText('e.g., Tip Calculator, Unit Converter');
    expect(nameInput).toHaveValue('');
  });
});