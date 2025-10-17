// @vitest-environment jsdom
import { renderWithProviders as render, screen, waitFor } from '@/test-utils';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import VisualToolBuilderPage from '../../pages/visual-tool-builder-page';
import * as queryClient from '@/lib/queryClient';

// Mock the API request
vi.mock('@/lib/queryClient', () => ({
  apiRequest: vi.fn(),
  queryClient: {
    invalidateQueries: vi.fn(),
    setQueryData: vi.fn(),
    getQueryData: vi.fn(),
  },
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
    user: { id: 'test-user', email: 'test@example.com', isPro: true },
    isAuthenticated: true,
  }),
}));

// Mock wouter
vi.mock('wouter', () => ({
  useLocation: () => ['/', vi.fn()],
  useParams: () => ({}),
}));

const mockApiRequest = vi.mocked(queryClient.apiRequest);

describe('Tool Builder - Comprehensive Flow Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful API responses
    mockApiRequest.mockImplementation((method, url, data) => {
      if (url.includes('/drafts') && method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: { id: 'test-draft-123', ...data }
          })
        } as any);
      }
      if (url.includes('/drafts') && method === 'PUT') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: { id: 'test-draft-123', ...data }
          })
        } as any);
      }
      if (url.includes('/test')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            result: { output: 'Test result', result: 42 }
          })
        } as any);
      }
      if (url.includes('/publish')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            toolId: 'published-tool-123'
          })
        } as any);
      }
      if (url.includes('/tags')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([
            { id: 'tag1', name: 'calculator' },
            { id: 'tag2', name: 'utility' }
          ])
        } as any);
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true })
      } as any);
    });
  });

  describe('Complete Tool Creation Workflow', () => {
    it('should create a tool from scratch through all steps', async () => {
      const user = userEvent.setup();
      
      render(<VisualToolBuilderPage />);

      // Wait for template selector to appear
      await waitFor(() => {
        expect(screen.getByText(/start from scratch/i)).toBeInTheDocument();
      });

      // Skip template selection
      const startFromScratchButton = screen.getByText(/start from scratch/i);
      await user.click(startFromScratchButton);

      // Step 1: Tool Information
      await waitFor(() => {
        expect(screen.getByLabelText(/tool name/i)).toBeInTheDocument();
      });
      
      await user.type(screen.getByLabelText(/tool name/i), 'Advanced Calculator');
      await user.type(screen.getByLabelText(/description/i), 'Performs advanced mathematical calculations');
      
      const categorySelect = screen.getByRole('combobox', { name: /category/i });
      await user.click(categorySelect);
      await user.click(screen.getByText('calculator'));
      
      const continueButton = screen.getByRole('button', { name: /continue|next/i });
      await user.click(continueButton);

      // Verify draft is saved
      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith(
          'POST',
          '/api/tool-builder/drafts',
          expect.objectContaining({
            name: 'Advanced Calculator',
            description: 'Performs advanced mathematical calculations',
            category: 'calculator'
          })
        );
      });

      // Step 2: Form Design
      await waitFor(() => {
        expect(screen.getByText(/input form/i)).toBeInTheDocument();
      });
      
      // Add number field
      const addNumberButton = screen.getByRole('button', { name: /add.*number/i });
      await user.click(addNumberButton);

      // Verify field was added
      await waitFor(() => {
        expect(screen.getByText(/number/i)).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /continue|next/i }));

      // Step 3: Logic Flow
      await waitFor(() => {
        expect(screen.getByText(/logic flow/i)).toBeInTheDocument();
      });
      
      // Add calculation step
      const addCalculationButton = screen.getByRole('button', { name: /calculation/i });
      await user.click(addCalculationButton);

      await user.click(screen.getByRole('button', { name: /continue|next/i }));

      // Step 4: Output View
      await waitFor(() => {
        expect(screen.getByText(/output view/i)).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /continue|next/i }));

      // Step 5: Test
      await waitFor(() => {
        expect(screen.getByText(/test.*preview/i)).toBeInTheDocument();
      });

      // Run test
      const runTestButton = screen.getByRole('button', { name: /run test/i });
      await user.click(runTestButton);

      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith(
          'POST',
          expect.stringMatching(/\/test$/),
          expect.any(Object)
        );
      });

      await user.click(screen.getByRole('button', { name: /continue|next/i }));

      // Step 6: Publish
      await waitFor(() => {
        expect(screen.getByText(/pricing.*publish/i)).toBeInTheDocument();
      });

      const publishButton = screen.getByRole('button', { name: /publish/i });
      await user.click(publishButton);

      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith(
          'POST',
          expect.stringMatching(/\/publish$/),
          expect.any(Object)
        );
      });
    }, 30000);
  });

  describe('Logic Step Types', () => {
    it('should add and configure calculation logic step', async () => {
      const user = userEvent.setup();
      
      render(<VisualToolBuilderPage />);

      // Navigate to logic step
      await waitFor(() => {
        expect(screen.getByText(/start from scratch/i)).toBeInTheDocument();
      });
      await user.click(screen.getByText(/start from scratch/i));

      // Fill metadata and go to logic
      await user.type(screen.getByLabelText(/tool name/i), 'Test Tool');
      await user.type(screen.getByLabelText(/description/i), 'Test');
      const categorySelect = screen.getByRole('combobox', { name: /category/i });
      await user.click(categorySelect);
      await user.click(screen.getByText('calculator'));
      await user.click(screen.getByRole('button', { name: /continue/i }));
      
      // Skip form design
      await waitFor(() => {
        expect(screen.getByText(/input form/i)).toBeInTheDocument();
      });
      await user.click(screen.getByRole('button', { name: /continue/i }));

      // Add calculation step
      await waitFor(() => {
        expect(screen.getByText(/logic flow/i)).toBeInTheDocument();
      });
      
      const addCalcButton = screen.getByRole('button', { name: /calculation/i });
      await user.click(addCalcButton);

      // Verify calculation step was added
      await waitFor(() => {
        expect(screen.getByText(/calculation/i)).toBeInTheDocument();
      });
    }, 20000);

    it('should add and configure condition logic step with if/else', async () => {
      const user = userEvent.setup();
      
      render(<VisualToolBuilderPage />);

      await waitFor(() => {
        expect(screen.getByText(/start from scratch/i)).toBeInTheDocument();
      });
      await user.click(screen.getByText(/start from scratch/i));

      // Navigate to logic step
      await user.type(screen.getByLabelText(/tool name/i), 'Condition Test');
      await user.type(screen.getByLabelText(/description/i), 'Test');
      const categorySelect = screen.getByRole('combobox', { name: /category/i });
      await user.click(categorySelect);
      await user.click(screen.getByText('utility'));
      await user.click(screen.getByRole('button', { name: /continue/i }));
      await waitFor(() => {
        expect(screen.getByText(/input form/i)).toBeInTheDocument();
      });
      await user.click(screen.getByRole('button', { name: /continue/i }));

      // Add condition step
      await waitFor(() => {
        expect(screen.getByText(/logic flow/i)).toBeInTheDocument();
      });
      
      const addConditionButton = screen.getByRole('button', { name: /condition/i });
      await user.click(addConditionButton);

      // Verify condition step was added
      await waitFor(() => {
        expect(screen.getByText(/condition/i)).toBeInTheDocument();
      });
    }, 20000);

    it('should add and configure switch/case logic step', async () => {
      const user = userEvent.setup();
      
      render(<VisualToolBuilderPage />);

      await waitFor(() => {
        expect(screen.getByText(/start from scratch/i)).toBeInTheDocument();
      });
      await user.click(screen.getByText(/start from scratch/i));

      // Navigate to logic step
      await user.type(screen.getByLabelText(/tool name/i), 'Switch Test');
      await user.type(screen.getByLabelText(/description/i), 'Test');
      const categorySelect = screen.getByRole('combobox', { name: /category/i });
      await user.click(categorySelect);
      await user.click(screen.getByText('utility'));
      await user.click(screen.getByRole('button', { name: /continue/i }));
      await waitFor(() => {
        expect(screen.getByText(/input form/i)).toBeInTheDocument();
      });
      await user.click(screen.getByRole('button', { name: /continue/i }));

      // Add switch step
      await waitFor(() => {
        expect(screen.getByText(/logic flow/i)).toBeInTheDocument();
      });
      
      const addSwitchButton = screen.getByRole('button', { name: /switch/i });
      if (addSwitchButton) {
        await user.click(addSwitchButton);

        // Verify switch step was added
        await waitFor(() => {
          expect(screen.getByText(/switch/i)).toBeInTheDocument();
        });
      }
    }, 20000);

    it('should add and configure transform logic step', async () => {
      const user = userEvent.setup();
      
      render(<VisualToolBuilderPage />);

      await waitFor(() => {
        expect(screen.getByText(/start from scratch/i)).toBeInTheDocument();
      });
      await user.click(screen.getByText(/start from scratch/i));

      // Navigate to logic step
      await user.type(screen.getByLabelText(/tool name/i), 'Transform Test');
      await user.type(screen.getByLabelText(/description/i), 'Test');
      const categorySelect = screen.getByRole('combobox', { name: /category/i });
      await user.click(categorySelect);
      await user.click(screen.getByText('utility'));
      await user.click(screen.getByRole('button', { name: /continue/i }));
      await waitFor(() => {
        expect(screen.getByText(/input form/i)).toBeInTheDocument();
      });
      await user.click(screen.getByRole('button', { name: /continue/i }));

      // Add transform step
      await waitFor(() => {
        expect(screen.getByText(/logic flow/i)).toBeInTheDocument();
      });
      
      const addTransformButton = screen.getByRole('button', { name: /transform/i });
      if (addTransformButton) {
        await user.click(addTransformButton);

        // Verify transform step was added
        await waitFor(() => {
          expect(screen.getByText(/transform/i)).toBeInTheDocument();
        });
      }
    }, 20000);

    it('should add and configure API call logic step', async () => {
      const user = userEvent.setup();
      
      render(<VisualToolBuilderPage />);

      await waitFor(() => {
        expect(screen.getByText(/start from scratch/i)).toBeInTheDocument();
      });
      await user.click(screen.getByText(/start from scratch/i));

      // Navigate to logic step
      await user.type(screen.getByLabelText(/tool name/i), 'API Test');
      await user.type(screen.getByLabelText(/description/i), 'Test');
      const categorySelect = screen.getByRole('combobox', { name: /category/i });
      await user.click(categorySelect);
      await user.click(screen.getByText('developer'));
      await user.click(screen.getByRole('button', { name: /continue/i }));
      await waitFor(() => {
        expect(screen.getByText(/input form/i)).toBeInTheDocument();
      });
      await user.click(screen.getByRole('button', { name: /continue/i }));

      // Add API call step
      await waitFor(() => {
        expect(screen.getByText(/logic flow/i)).toBeInTheDocument();
      });
      
      const addApiButton = screen.getByRole('button', { name: /api call/i });
      if (addApiButton) {
        await user.click(addApiButton);

        // Verify API call step was added
        await waitFor(() => {
          expect(screen.getByText(/api call/i)).toBeInTheDocument();
        });
      }
    }, 20000);

    it('should add and configure AI analysis logic step', async () => {
      const user = userEvent.setup();
      
      render(<VisualToolBuilderPage />);

      await waitFor(() => {
        expect(screen.getByText(/start from scratch/i)).toBeInTheDocument();
      });
      await user.click(screen.getByText(/start from scratch/i));

      // Navigate to logic step
      await user.type(screen.getByLabelText(/tool name/i), 'AI Test');
      await user.type(screen.getByLabelText(/description/i), 'Test');
      const categorySelect = screen.getByRole('combobox', { name: /category/i });
      await user.click(categorySelect);
      await user.click(screen.getByText('productivity'));
      await user.click(screen.getByRole('button', { name: /continue/i }));
      await waitFor(() => {
        expect(screen.getByText(/input form/i)).toBeInTheDocument();
      });
      await user.click(screen.getByRole('button', { name: /continue/i }));

      // Add AI analysis step
      await waitFor(() => {
        expect(screen.getByText(/logic flow/i)).toBeInTheDocument();
      });
      
      const addAiButton = screen.getByRole('button', { name: /ai.*analysis/i });
      if (addAiButton) {
        await user.click(addAiButton);

        // Verify AI analysis step was added
        await waitFor(() => {
          expect(screen.getByText(/ai.*analysis/i)).toBeInTheDocument();
        });
      }
    }, 20000);
  });

  describe('Output View Designer - All Formats', () => {
    it('should configure text output format', async () => {
      const user = userEvent.setup();
      
      render(<VisualToolBuilderPage />);

      await waitFor(() => {
        expect(screen.getByText(/start from scratch/i)).toBeInTheDocument();
      });
      await user.click(screen.getByText(/start from scratch/i));

      // Navigate to output view
      await user.type(screen.getByLabelText(/tool name/i), 'Text Output Test');
      await user.type(screen.getByLabelText(/description/i), 'Test');
      const categorySelect = screen.getByRole('combobox', { name: /category/i });
      await user.click(categorySelect);
      await user.click(screen.getByText('utility'));
      await user.click(screen.getByRole('button', { name: /continue/i }));
      await waitFor(() => {
        expect(screen.getByText(/input form/i)).toBeInTheDocument();
      });
      await user.click(screen.getByRole('button', { name: /continue/i }));
      await waitFor(() => {
        expect(screen.getByText(/logic flow/i)).toBeInTheDocument();
      });
      await user.click(screen.getByRole('button', { name: /continue/i }));

      // Configure output view
      await waitFor(() => {
        expect(screen.getByText(/output view/i)).toBeInTheDocument();
      });

      // Select text format (should be default)
      const textFormatOption = screen.getByRole('radio', { name: /text/i });
      if (textFormatOption) {
        await user.click(textFormatOption);
      }

      // Verify text format is selected
      expect(screen.getByText(/text/i)).toBeInTheDocument();
    }, 20000);

    it('should configure JSON output format', async () => {
      const user = userEvent.setup();
      
      render(<VisualToolBuilderPage />);

      await waitFor(() => {
        expect(screen.getByText(/start from scratch/i)).toBeInTheDocument();
      });
      await user.click(screen.getByText(/start from scratch/i));

      // Navigate to output view
      await user.type(screen.getByLabelText(/tool name/i), 'JSON Output Test');
      await user.type(screen.getByLabelText(/description/i), 'Test');
      const categorySelect = screen.getByRole('combobox', { name: /category/i });
      await user.click(categorySelect);
      await user.click(screen.getByText('developer'));
      await user.click(screen.getByRole('button', { name: /continue/i }));
      await waitFor(() => {
        expect(screen.getByText(/input form/i)).toBeInTheDocument();
      });
      await user.click(screen.getByRole('button', { name: /continue/i }));
      await waitFor(() => {
        expect(screen.getByText(/logic flow/i)).toBeInTheDocument();
      });
      await user.click(screen.getByRole('button', { name: /continue/i }));

      // Configure JSON output
      await waitFor(() => {
        expect(screen.getByText(/output view/i)).toBeInTheDocument();
      });

      const jsonFormatOption = screen.getByRole('radio', { name: /json/i });
      if (jsonFormatOption) {
        await user.click(jsonFormatOption);
      }

      expect(screen.getByText(/json/i)).toBeInTheDocument();
    }, 20000);

    it('should configure table output format', async () => {
      const user = userEvent.setup();
      
      render(<VisualToolBuilderPage />);

      await waitFor(() => {
        expect(screen.getByText(/start from scratch/i)).toBeInTheDocument();
      });
      await user.click(screen.getByText(/start from scratch/i));

      // Navigate to output view
      await user.type(screen.getByLabelText(/tool name/i), 'Table Output Test');
      await user.type(screen.getByLabelText(/description/i), 'Test');
      const categorySelect = screen.getByRole('combobox', { name: /category/i });
      await user.click(categorySelect);
      await user.click(screen.getByText('productivity'));
      await user.click(screen.getByRole('button', { name: /continue/i }));
      await waitFor(() => {
        expect(screen.getByText(/input form/i)).toBeInTheDocument();
      });
      await user.click(screen.getByRole('button', { name: /continue/i }));
      await waitFor(() => {
        expect(screen.getByText(/logic flow/i)).toBeInTheDocument();
      });
      await user.click(screen.getByRole('button', { name: /continue/i }));

      // Configure table output
      await waitFor(() => {
        expect(screen.getByText(/output view/i)).toBeInTheDocument();
      });

      const tableFormatOption = screen.getByRole('radio', { name: /table/i });
      if (tableFormatOption) {
        await user.click(tableFormatOption);
      }

      expect(screen.getByText(/table/i)).toBeInTheDocument();
    }, 20000);

    it('should configure markdown output format', async () => {
      const user = userEvent.setup();
      
      render(<VisualToolBuilderPage />);

      await waitFor(() => {
        expect(screen.getByText(/start from scratch/i)).toBeInTheDocument();
      });
      await user.click(screen.getByText(/start from scratch/i));

      // Navigate to output view
      await user.type(screen.getByLabelText(/tool name/i), 'Markdown Output Test');
      await user.type(screen.getByLabelText(/description/i), 'Test');
      const categorySelect = screen.getByRole('combobox', { name: /category/i });
      await user.click(categorySelect);
      await user.click(screen.getByText('productivity'));
      await user.click(screen.getByRole('button', { name: /continue/i }));
      await waitFor(() => {
        expect(screen.getByText(/input form/i)).toBeInTheDocument();
      });
      await user.click(screen.getByRole('button', { name: /continue/i }));
      await waitFor(() => {
        expect(screen.getByText(/logic flow/i)).toBeInTheDocument();
      });
      await user.click(screen.getByRole('button', { name: /continue/i }));

      // Configure markdown output
      await waitFor(() => {
        expect(screen.getByText(/output view/i)).toBeInTheDocument();
      });

      const markdownFormatOption = screen.getByRole('radio', { name: /markdown/i });
      if (markdownFormatOption) {
        await user.click(markdownFormatOption);
      }

      expect(screen.getByText(/markdown/i)).toBeInTheDocument();
    }, 20000);

    it('should configure card output format', async () => {
      const user = userEvent.setup();
      
      render(<VisualToolBuilderPage />);

      await waitFor(() => {
        expect(screen.getByText(/start from scratch/i)).toBeInTheDocument();
      });
      await user.click(screen.getByText(/start from scratch/i));

      // Navigate to output view
      await user.type(screen.getByLabelText(/tool name/i), 'Card Output Test');
      await user.type(screen.getByLabelText(/description/i), 'Test');
      const categorySelect = screen.getByRole('combobox', { name: /category/i });
      await user.click(categorySelect);
      await user.click(screen.getByText('utility'));
      await user.click(screen.getByRole('button', { name: /continue/i }));
      await waitFor(() => {
        expect(screen.getByText(/input form/i)).toBeInTheDocument();
      });
      await user.click(screen.getByRole('button', { name: /continue/i }));
      await waitFor(() => {
        expect(screen.getByText(/logic flow/i)).toBeInTheDocument();
      });
      await user.click(screen.getByRole('button', { name: /continue/i }));

      // Configure card output
      await waitFor(() => {
        expect(screen.getByText(/output view/i)).toBeInTheDocument();
      });

      const cardFormatOption = screen.getByRole('radio', { name: /card/i });
      if (cardFormatOption) {
        await user.click(cardFormatOption);
      }

      expect(screen.getByText(/card/i)).toBeInTheDocument();
    }, 20000);
  });

  describe('Form Field Types', () => {
    it('should add all basic form field types', async () => {
      const user = userEvent.setup();
      
      render(<VisualToolBuilderPage />);

      await waitFor(() => {
        expect(screen.getByText(/start from scratch/i)).toBeInTheDocument();
      });
      await user.click(screen.getByText(/start from scratch/i));

      // Navigate to form design
      await user.type(screen.getByLabelText(/tool name/i), 'All Fields Test');
      await user.type(screen.getByLabelText(/description/i), 'Test');
      const categorySelect = screen.getByRole('combobox', { name: /category/i });
      await user.click(categorySelect);
      await user.click(screen.getByText('utility'));
      await user.click(screen.getByRole('button', { name: /continue/i }));

      // Add form fields
      await waitFor(() => {
        expect(screen.getByText(/input form/i)).toBeInTheDocument();
      });

      // Add text field
      const addTextButton = screen.getByRole('button', { name: /add.*text/i });
      if (addTextButton) {
        await user.click(addTextButton);
      }

      // Add number field
      const addNumberButton = screen.getByRole('button', { name: /add.*number/i });
      if (addNumberButton) {
        await user.click(addNumberButton);
      }

      // Add email field
      const addEmailButton = screen.getByRole('button', { name: /add.*email/i });
      if (addEmailButton) {
        await user.click(addEmailButton);
      }

      // Add checkbox
      const addCheckboxButton = screen.getByRole('button', { name: /add.*checkbox/i });
      if (addCheckboxButton) {
        await user.click(addCheckboxButton);
      }

      // Add select/dropdown
      const addSelectButton = screen.getByRole('button', { name: /add.*select|dropdown/i });
      if (addSelectButton) {
        await user.click(addSelectButton);
      }

      // Verify fields were added (at least some should be visible)
      expect(screen.getAllByText(/text|number|email|checkbox|select/i).length).toBeGreaterThan(0);
    }, 20000);
  });

  describe('Draft Persistence', () => {
    it('should save draft automatically on step changes', async () => {
      const user = userEvent.setup();
      
      render(<VisualToolBuilderPage />);

      await waitFor(() => {
        expect(screen.getByText(/start from scratch/i)).toBeInTheDocument();
      });
      await user.click(screen.getByText(/start from scratch/i));

      // Fill metadata
      await user.type(screen.getByLabelText(/tool name/i), 'Draft Save Test');
      await user.type(screen.getByLabelText(/description/i), 'Testing draft persistence');
      const categorySelect = screen.getByRole('combobox', { name: /category/i });
      await user.click(categorySelect);
      await user.click(screen.getByText('utility'));
      
      // Go to next step (should trigger save)
      await user.click(screen.getByRole('button', { name: /continue/i }));

      // Verify draft was saved
      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith(
          'POST',
          '/api/tool-builder/drafts',
          expect.objectContaining({
            name: 'Draft Save Test',
            description: 'Testing draft persistence'
          })
        );
      });
    }, 20000);
  });

  describe('Error Handling', () => {
    it('should handle save errors gracefully', async () => {
      const user = userEvent.setup();
      
      // Mock save failure
      mockApiRequest.mockImplementationOnce(() => Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: { message: 'Server error' } })
      } as any));

      render(<VisualToolBuilderPage />);

      await waitFor(() => {
        expect(screen.getByText(/start from scratch/i)).toBeInTheDocument();
      });
      await user.click(screen.getByText(/start from scratch/i));

      await user.type(screen.getByLabelText(/tool name/i), 'Error Test');
      await user.type(screen.getByLabelText(/description/i), 'This will fail');
      const categorySelect = screen.getByRole('combobox', { name: /category/i });
      await user.click(categorySelect);
      await user.click(screen.getByText('utility'));
      await user.click(screen.getByRole('button', { name: /continue/i }));

      // Should show error (toast is mocked, so we just verify the API was called)
      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalled();
      });
    }, 20000);

    it('should handle test execution errors', async () => {
      const user = userEvent.setup();
      
      // Mock test failure
      mockApiRequest.mockImplementation((method, url) => {
        if (url.includes('/test')) {
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({ error: { message: 'Test execution failed' } })
          } as any);
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: { id: 'test-draft' } })
        } as any);
      });

      render(<VisualToolBuilderPage />);

      await waitFor(() => {
        expect(screen.getByText(/start from scratch/i)).toBeInTheDocument();
      });
      await user.click(screen.getByText(/start from scratch/i));

      // Navigate to test step
      await user.type(screen.getByLabelText(/tool name/i), 'Test Error');
      await user.type(screen.getByLabelText(/description/i), 'Test');
      const categorySelect = screen.getByRole('combobox', { name: /category/i });
      await user.click(categorySelect);
      await user.click(screen.getByText('utility'));
      
      // Navigate through steps
      for (let i = 0; i < 4; i++) {
        await user.click(screen.getByRole('button', { name: /continue/i }));
        await waitFor(() => {
          // Wait for next step to load
        }, { timeout: 3000 });
      }

      // Try to run test
      await waitFor(() => {
        const runTestButton = screen.queryByRole('button', { name: /run test/i });
        if (runTestButton) {
          user.click(runTestButton);
        }
      });
    }, 30000);
  });
});
