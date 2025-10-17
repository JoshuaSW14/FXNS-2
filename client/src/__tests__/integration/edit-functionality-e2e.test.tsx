import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderWithProviders as render, screen, fireEvent, waitFor } from '@/test-utils';
// Using wouter instead of react-router-dom
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

// Mock tool builder components
vi.mock('@/components/tool-builder/visual-form-designer', () => ({
  default: ({ fields, onChange }: any) => (
    <div data-testid="visual-form-designer">
      <div>Fields count: {fields.length}</div>
      <button 
        onClick={() => onChange([...fields, { 
          id: 'test-field', 
          type: 'text', 
          label: 'Test Field',
          required: false 
        }])}
        data-testid="add-field-btn"
      >
        Add Field
      </button>
      {fields.map((field: any) => (
        <div key={field.id} data-testid={`field-${field.id}`}>
          {field.label} ({field.type})
        </div>
      ))}
    </div>
  )
}));

vi.mock('@/components/tool-builder/logic-flow-builder', () => ({
  default: ({ steps, onChange }: any) => (
    <div data-testid="logic-flow-builder">
      <div>Logic steps: {steps.length}</div>
      <button 
        onClick={() => onChange([...steps, { 
          id: 'test-logic', 
          type: 'calculation',
          config: { calculation: { formula: 'inputNumber * 2', variables: [] } }
        }])}
        data-testid="add-logic-btn"
      >
        Add Logic
      </button>
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

describe('Edit Functionality E2E Tests', () => {
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
    
    // Mock window.location.search for edit mode
    Object.defineProperty(window, 'location', {
      value: {
        search: '?draft=test-draft-123'
      },
      writable: true
    });
  });

  it('should load and display existing draft data when editing', async () => {
    const mockDraftData = {
      success: true,
      data: {
        id: 'test-draft-123',
        name: 'Test Calculator',
        description: 'A test calculator that doubles numbers',
        category: 'calculator',
        status: 'draft',
        inputConfig: [
          {
            id: 'inputNumber',
            type: 'number',
            label: 'Number Input',
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
          type: 'single_value',
          config: { sourceStepId: 'double-calc' }
        },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      }
    };

    // Mock the API call to load draft
    mockApiRequest.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockDraftData)
    });

    const user = userEvent.setup();

    render(
      
        <VisualToolBuilderPage />
      
    );

    // Wait for the component to load and the API call to complete
    await waitFor(() => {
      expect(mockApiRequest).toHaveBeenCalledWith('GET', '/api/tool-builder/drafts/test-draft-123');
    });

    // Check that form fields are populated with existing data
    await waitFor(() => {
      const nameInput = screen.getByDisplayValue('Test Calculator');
      expect(nameInput).toBeInTheDocument();
    });

    const descriptionTextarea = screen.getByDisplayValue('A test calculator that doubles numbers');
    expect(descriptionTextarea).toBeInTheDocument();

    // Check that the URL was updated to include the draft ID
    expect(window.history.replaceState).not.toHaveBeenCalled(); // Should not replace since it's already there

    // Navigate to form design step
    const formStepButton = screen.getByText('Design Input Form');
    await user.click(formStepButton);

    // Check that existing fields are loaded in the form designer
    await waitFor(() => {
      expect(screen.getByText('Fields count: 1')).toBeInTheDocument();
      expect(screen.getByTestId('field-inputNumber')).toBeInTheDocument();
      expect(screen.getByText('Number Input (number)')).toBeInTheDocument();
    });
  });

  it('should handle edit mode when no draft parameter is provided', async () => {
    // Mock window.location.search for create mode (no draft parameter)
    Object.defineProperty(window, 'location', {
      value: {
        search: ''
      },
      writable: true
    });

    render(
      
        <VisualToolBuilderPage />
      
    );

    // Should not make API call when no draft parameter
    await waitFor(() => {
      expect(mockApiRequest).not.toHaveBeenCalled();
    });

    // Form fields should be empty
    const nameInput = screen.getByPlaceholderText('e.g., Tip Calculator, Unit Converter');
    expect(nameInput).toHaveValue('');
  });

  it('should update existing draft when saving changes', async () => {
    const mockDraftData = {
      success: true,
      data: {
        id: 'test-draft-123',
        name: 'Test Calculator',
        description: 'A test calculator',
        category: 'calculator',
        status: 'draft',
        inputConfig: [],
        logicConfig: [],
        outputConfig: { type: 'single_value', config: { sourceStepId: '' } },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      }
    };

    // Mock the initial load
    mockApiRequest.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockDraftData)
    });

    // Mock the save response
    mockApiRequest.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, data: { id: 'test-draft-123' } })
    });

    const user = userEvent.setup();

    render(
      
        <VisualToolBuilderPage />
      
    );

    // Wait for initial load
    await waitFor(() => {
      expect(mockApiRequest).toHaveBeenCalledWith('GET', '/api/tool-builder/drafts/test-draft-123');
    });

    // Update the name
    const nameInput = await screen.findByDisplayValue('Test Calculator');
    await user.clear(nameInput);
    await user.type(nameInput, 'Updated Calculator');

    // Click save draft
    const saveButton = screen.getByText('Save Draft');
    await user.click(saveButton);

    // Should make PUT request to update existing draft
    await waitFor(() => {
      expect(mockApiRequest).toHaveBeenCalledWith('PUT', '/api/tool-builder/drafts/test-draft-123', 
        expect.objectContaining({
          name: 'Updated Calculator',
          description: 'A test calculator',
          category: 'calculator'
        })
      );
    });
  });

  it('should handle API errors gracefully', async () => {
    // Mock API error
    mockApiRequest.mockRejectedValueOnce(new Error('Failed to load draft'));

    render(
      
        <VisualToolBuilderPage />
      
    );

    // Should still render the page even if draft loading fails
    expect(screen.getByText('Visual Tool Builder')).toBeInTheDocument();
    
    // Form should remain empty/default state
    const nameInput = screen.getByPlaceholderText('e.g., Tip Calculator, Unit Converter');
    expect(nameInput).toHaveValue('');
  });

  it('should complete the full create→edit→update workflow', async () => {
    // Step 1: Start in create mode
    Object.defineProperty(window, 'location', {
      value: { search: '' },
      writable: true
    });

    const { rerender } = render(
      
        <VisualToolBuilderPage />
      
    );

    const user = userEvent.setup();

    // Fill out basic info
    const nameInput = screen.getByPlaceholderText('e.g., Tip Calculator, Unit Converter');
    await user.type(nameInput, 'New Calculator');

    const descriptionInput = screen.getByPlaceholderText('Describe what your tool does and how it helps users');
    await user.type(descriptionInput, 'This is a new calculator');

    // Select category
    const categorySelect = screen.getByText('Select a category');
    await user.click(categorySelect);
    const calculatorOption = screen.getByText('Calculator');
    await user.click(calculatorOption);

    // Mock save response for new draft
    mockApiRequest.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ 
        success: true, 
        data: { id: 'new-draft-456' } 
      })
    });

    // Save as draft
    const saveButton = screen.getByText('Save Draft');
    await user.click(saveButton);

    // Should create new draft
    await waitFor(() => {
      expect(mockApiRequest).toHaveBeenCalledWith('POST', '/api/tool-builder/drafts', 
        expect.objectContaining({
          name: 'New Calculator',
          description: 'This is a new calculator',
          category: 'calculator'
        })
      );
    });

    // Step 2: Now simulate editing the draft
    Object.defineProperty(window, 'location', {
      value: { search: '?draft=new-draft-456' },
      writable: true
    });

    // Mock load draft for edit
    mockApiRequest.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: {
          id: 'new-draft-456',
          name: 'New Calculator',
          description: 'This is a new calculator',
          category: 'calculator',
          inputConfig: [],
          logicConfig: [],
          outputConfig: { type: 'single_value', config: { sourceStepId: '' } }
        }
      })
    });

    // Re-render in edit mode
    rerender(
      
        <VisualToolBuilderPage />
      
    );

    // Step 3: Verify edit mode loads correctly
    await waitFor(() => {
      expect(screen.getByDisplayValue('New Calculator')).toBeInTheDocument();
    });

    // Update the name
    const editNameInput = screen.getByDisplayValue('New Calculator');
    await user.clear(editNameInput);
    await user.type(editNameInput, 'Edited Calculator');

    // Mock update response
    mockApiRequest.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ 
        success: true, 
        data: { id: 'new-draft-456' } 
      })
    });

    // Save changes
    const updateButton = screen.getByText('Save Draft');
    await user.click(updateButton);

    // Should make PUT request to update
    await waitFor(() => {
      expect(mockApiRequest).toHaveBeenCalledWith('PUT', '/api/tool-builder/drafts/new-draft-456', 
        expect.objectContaining({
          name: 'Edited Calculator'
        })
      );
    });
  });
});