import { renderWithProviders as render, screen, fireEvent, waitFor } from '@/test-utils';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import VisualToolBuilderPage from '../../pages/visual-tool-builder-page';
import FxnPage from '../../pages/fxn-page';
import * as api from '@/lib/api';

// Mock the API request
vi.mock('@/lib/api', () => ({
  apiRequest: vi.fn(),
}));

// Mock toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock auth hook
vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    user: { id: 'test-user-123', email: 'test@example.com' },
    isAuthenticated: true,
  }),
}));

const mockApiRequest = vi.mocked(api.apiRequest);


describe('Complete Tool Builder E2E Flow', () => {
  const mockDraftId = 'test-draft-123';
  const mockPublishedToolId = 'published-tool-456';
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful API responses for tool builder
    mockApiRequest.mockImplementation((method, url, data) => {
      // Draft creation
      if (url.includes('/drafts') && method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: { id: mockDraftId }
          })
        });
      }
      
      // Draft updates
      if (url.includes('/drafts') && method === 'PUT') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: { id: mockDraftId }
          })
        });
      }
      
      // Draft fetching
      if (url.includes(`/drafts/${mockDraftId}`) && method === 'GET') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: {
              id: mockDraftId,
              name: 'Advanced Calculator',
              description: 'A comprehensive calculator with multiple field types',
              category: 'utility',
              inputConfig: [
                {
                  id: 'amount',
                  type: 'number',
                  label: 'Amount',
                  required: true,
                  min: 0,
                  defaultValue: 100
                },
                {
                  id: 'percentage',
                  type: 'number',
                  label: 'Percentage',
                  required: true,
                  min: 0,
                  max: 100,
                  defaultValue: 15
                },
                {
                  id: 'roundUp',
                  type: 'checkbox',
                  label: 'Round Up',
                  defaultValue: false
                },
                {
                  id: 'currency',
                  type: 'select',
                  label: 'Currency',
                  options: [
                    { value: 'USD', label: 'US Dollar' },
                    { value: 'EUR', label: 'Euro' },
                    { value: 'GBP', label: 'British Pound' }
                  ],
                  defaultValue: 'USD'
                }
              ],
              logicBlocks: [
                {
                  id: 'calc-1',
                  type: 'calculate',
                  formula: 'amount * (percentage / 100)',
                  outputVariable: 'calculatedValue'
                }
              ]
            }
          })
        });
      }
      
      // Testing tool
      if (url.includes('/test')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            result: { 
              calculatedValue: 15,
              output: 'Calculation successful: $115.00' 
            }
          })
        });
      }
      
      // Publishing tool
      if (url.includes('/publish')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            toolId: mockPublishedToolId
          })
        });
      }
      
      // Published tool fetching
      if (url.includes(`/tools/${mockPublishedToolId}`) && method === 'GET') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            fxn: {
              id: mockPublishedToolId,
              slug: 'advanced-calculator',
              title: 'Advanced Calculator',
              description: 'A comprehensive calculator with multiple field types',
              category: 'utility',
              codeKind: 'config',
              inputConfig: JSON.stringify([
                {
                  id: 'amount',
                  type: 'number',
                  label: 'Amount',
                  required: true,
                  min: 0,
                  defaultValue: 100
                },
                {
                  id: 'percentage',
                  type: 'number',
                  label: 'Percentage',
                  required: true,
                  min: 0,
                  max: 100,
                  defaultValue: 15
                },
                {
                  id: 'roundUp',
                  type: 'checkbox',
                  label: 'Round Up',
                  defaultValue: false
                },
                {
                  id: 'currency',
                  type: 'select',
                  label: 'Currency',
                  options: [
                    { value: 'USD', label: 'US Dollar' },
                    { value: 'EUR', label: 'Euro' },
                    { value: 'GBP', label: 'British Pound' }
                  ],
                  defaultValue: 'USD'
                }
              ]),
              isPublic: true,
              createdBy: 'test-user-123',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          })
        });
      }
      
      // Related tools
      if (url.includes('/related')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            fxns: []
          })
        });
      }
      
      // Running published tool
      if (url.includes(`/tools/${mockPublishedToolId}/run`) && method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            outputs: {
              result: 'Calculation result: $115.00',
              calculatedValue: 15
            },
            durationMs: 123
          })
        });
      }
      
      // User data
      if (url.includes('/user') || url.includes('/me')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 'test-user-123',
            name: 'Test User',
            email: 'test@example.com'
          })
        });
      }
      
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });
    });
  });

  describe('Complete Flow: Create → Test → Publish → View → Run', () => {
    it('should complete the entire tool creation and usage flow', async () => {
      const user = userEvent.setup();
      
      // ===============================
      // STEP 1: CREATE TOOL
      // ===============================
      
      const { rerender } = render(
        
          <VisualToolBuilderPage />
        
      );

      // Fill out tool information
      expect(screen.getByText('Tool Information')).toBeInTheDocument();
      
      await user.type(screen.getByLabelText(/tool name/i), 'Advanced Calculator');
      await user.type(screen.getByLabelText(/description/i), 'A comprehensive calculator with multiple field types');
      await user.selectOptions(screen.getByLabelText(/category/i), 'utility');
      
      await user.click(screen.getByRole('button', { name: /continue/i }));

      // Verify draft creation
      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith(
          'POST',
          '/api/tool-builder/drafts',
          expect.objectContaining({
            name: 'Advanced Calculator',
            description: 'A comprehensive calculator with multiple field types',
            category: 'utility'
          })
        );
      });

      // ===============================
      // STEP 2: BUILD FORM
      // ===============================
      
      await waitFor(() => {
        expect(screen.getByText('Form Builder')).toBeInTheDocument();
      });

      // Add number field for amount
      await user.click(screen.getByText('Number'));
      await user.type(screen.getByDisplayValue('Untitled Field'), 'Amount');
      await user.type(screen.getByLabelText(/minimum value/i), '0');
      await user.type(screen.getByLabelText(/default value/i), '100');
      await user.click(screen.getByLabelText(/required/i));
      await user.click(screen.getByRole('button', { name: /add field/i }));

      // Add percentage field
      await user.click(screen.getByText('Number'));
      await user.clear(screen.getByDisplayValue('Untitled Field'));
      await user.type(screen.getByDisplayValue(''), 'Percentage');
      await user.type(screen.getByLabelText(/minimum value/i), '0');
      await user.type(screen.getByLabelText(/maximum value/i), '100');
      await user.type(screen.getByLabelText(/default value/i), '15');
      await user.click(screen.getByRole('button', { name: /add field/i }));

      // Add checkbox field
      await user.click(screen.getByText('Checkbox'));
      await user.clear(screen.getByDisplayValue('Untitled Field'));
      await user.type(screen.getByDisplayValue(''), 'Round Up');
      await user.click(screen.getByRole('button', { name: /add field/i }));

      // Add select field for currency
      await user.click(screen.getByText('Select'));
      await user.clear(screen.getByDisplayValue('Untitled Field'));
      await user.type(screen.getByDisplayValue(''), 'Currency');
      
      // Add options
      const addOptionButton = screen.getByRole('button', { name: /add option/i });
      await user.click(addOptionButton);
      await user.type(screen.getAllByPlaceholderText(/option text/i)[0], 'US Dollar');
      await user.type(screen.getAllByPlaceholderText(/option value/i)[0], 'USD');
      
      await user.click(addOptionButton);
      await user.type(screen.getAllByPlaceholderText(/option text/i)[1], 'Euro');
      await user.type(screen.getAllByPlaceholderText(/option value/i)[1], 'EUR');
      
      await user.click(screen.getByRole('button', { name: /add field/i }));

      await user.click(screen.getByRole('button', { name: /continue/i }));

      // ===============================
      // STEP 3: BUILD LOGIC
      // ===============================
      
      await waitFor(() => {
        expect(screen.getByText('Logic & Workflow')).toBeInTheDocument();
      });

      // Add calculation logic
      await user.click(screen.getByText('Calculate'));
      await user.type(screen.getByLabelText(/formula/i), 'amount * (percentage / 100)');
      await user.type(screen.getByLabelText(/output variable/i), 'calculatedValue');
      await user.click(screen.getByRole('button', { name: /add logic/i }));

      await user.click(screen.getByRole('button', { name: /continue/i }));

      // ===============================
      // STEP 4: TEST TOOL
      // ===============================
      
      await waitFor(() => {
        expect(screen.getByText('Test & Preview')).toBeInTheDocument();
      });

      // Fill in test values
      await user.type(screen.getByLabelText(/amount/i), '100');
      await user.type(screen.getByLabelText(/percentage/i), '15');
      await user.click(screen.getByLabelText(/round up/i));
      await user.selectOptions(screen.getByLabelText(/currency/i), 'USD');

      // Run test
      await user.click(screen.getByRole('button', { name: /test tool/i }));

      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith(
          'POST',
          expect.stringMatching(/\/test$/),
          expect.objectContaining({
            inputs: expect.objectContaining({
              amount: 100,
              percentage: 15,
              roundUp: true,
              currency: 'USD'
            })
          })
        );
      });

      // Verify test results appear
      await waitFor(() => {
        expect(screen.getByText(/calculation successful/i)).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /continue/i }));

      // ===============================
      // STEP 5: PUBLISH TOOL
      // ===============================
      
      await waitFor(() => {
        expect(screen.getByText('Publish Tool')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /publish tool/i }));

      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith(
          'POST',
          expect.stringMatching(/\/publish$/),
          expect.objectContaining({
            isPublic: true
          })
        );
      });

      // Verify success message
      await waitFor(() => {
        expect(screen.getByText(/tool published successfully/i)).toBeInTheDocument();
      });

      // ===============================
      // STEP 6: VIEW PUBLISHED TOOL
      // ===============================
      
      // Navigate to published tool page
      rerender(
        
          <FxnPage />
        
      );

      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith(
          'GET',
          `/api/tools/${mockPublishedToolId}`
        );
      });

      // Verify tool details are displayed
      await waitFor(() => {
        expect(screen.getByText('Advanced Calculator')).toBeInTheDocument();
        expect(screen.getByText('A comprehensive calculator with multiple field types')).toBeInTheDocument();
      });

      // Verify form fields are rendered correctly
      expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/percentage/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/round up/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/currency/i)).toBeInTheDocument();

      // ===============================
      // STEP 7: RUN PUBLISHED TOOL
      // ===============================
      
      // Fill in values and run the tool
      await user.clear(screen.getByLabelText(/amount/i));
      await user.type(screen.getByLabelText(/amount/i), '100');
      await user.clear(screen.getByLabelText(/percentage/i));
      await user.type(screen.getByLabelText(/percentage/i), '15');
      await user.click(screen.getByLabelText(/round up/i));
      await user.selectOptions(screen.getByLabelText(/currency/i), 'USD');

      await user.click(screen.getByRole('button', { name: /run/i }));

      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith(
          'POST',
          `/api/tools/${mockPublishedToolId}/run`,
          expect.objectContaining({
            amount: 100,
            percentage: 15,
            roundUp: true,
            currency: 'USD'
          })
        );
      });

      // Verify results are displayed
      await waitFor(() => {
        expect(screen.getByText(/calculation result/i)).toBeInTheDocument();
      });
    });

    it('should handle errors gracefully during the flow', async () => {
      const user = userEvent.setup();
      
      // Mock API failure for publishing
      mockApiRequest.mockImplementation((method, url) => {
        if (url.includes('/publish')) {
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({
              success: false,
              error: 'Publishing failed'
            })
          });
        }
        // Return successful responses for other calls
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: { id: mockDraftId } })
        });
      });

      render(
        
          <VisualToolBuilderPage />
        
      );

      // Go through the flow quickly to publishing step
      await user.type(screen.getByLabelText(/tool name/i), 'Test Tool');
      await user.type(screen.getByLabelText(/description/i), 'Test Description');
      await user.selectOptions(screen.getByLabelText(/category/i), 'utility');
      await user.click(screen.getByRole('button', { name: /continue/i }));

      // Skip form building
      await waitFor(() => screen.getByText('Form Builder'));
      await user.click(screen.getByRole('button', { name: /continue/i }));

      // Skip logic building
      await waitFor(() => screen.getByText('Logic & Workflow'));
      await user.click(screen.getByRole('button', { name: /continue/i }));

      // Skip testing
      await waitFor(() => screen.getByText('Test & Preview'));
      await user.click(screen.getByRole('button', { name: /continue/i }));

      // Try to publish (should fail)
      await waitFor(() => screen.getByText('Publish Tool'));
      await user.click(screen.getByRole('button', { name: /publish tool/i }));

      // Verify error handling
      await waitFor(() => {
        expect(screen.getByText(/publishing failed/i)).toBeInTheDocument();
      });
    });
  });

  describe('Field Type Compatibility', () => {
    it('should correctly render and handle all field types from tool builder', async () => {
      // Test specific to our converter functionality
      render(
        
          <FxnPage />
        
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/percentage/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/round up/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/currency/i)).toBeInTheDocument();
      });

      // Verify field types are correctly mapped
      const amountField = screen.getByLabelText(/amount/i) as HTMLInputElement;
      const percentageField = screen.getByLabelText(/percentage/i) as HTMLInputElement;
      const roundUpField = screen.getByLabelText(/round up/i) as HTMLInputElement;
      const currencyField = screen.getByLabelText(/currency/i) as HTMLSelectElement;

      expect(amountField.type).toBe('number');
      expect(percentageField.type).toBe('number');
      expect(roundUpField.type).toBe('checkbox');
      expect(currencyField.tagName.toLowerCase()).toBe('select');

      // Verify default values
      expect(amountField.value).toBe('100');
      expect(percentageField.value).toBe('15');
      expect(roundUpField.checked).toBe(false);
      expect(currencyField.value).toBe('USD');
    });
  });
});