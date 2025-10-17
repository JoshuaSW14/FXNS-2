import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import VisualToolBuilderPage from '../../pages/visual-tool-builder-page';
import FxnPage from '../../pages/fxn-page';

// Mock API
vi.mock('@/lib/api', () => ({
  apiRequest: vi.fn(),
}));

// Mock hooks
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    user: { id: 'test-user-123', email: 'test@example.com' },
    isAuthenticated: true,
  }),
}));


describe('Tool Builder Complete Flow E2E', () => {
  let mockApiRequest: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const { apiRequest } = await import('@/lib/api');
    mockApiRequest = vi.mocked(apiRequest);
    
    // Setup mock responses with proper Response structure
    mockApiRequest.mockImplementation((method: string, url: string, data?: any) => {
      const createMockResponse = (body: any, ok = true) => 
        Promise.resolve({
          ok,
          status: ok ? 200 : 400,
          json: () => Promise.resolve(body),
          text: () => Promise.resolve(JSON.stringify(body)),
          headers: new Headers(),
          redirected: false,
          statusText: ok ? 'OK' : 'Bad Request',
          type: 'basic' as ResponseType,
          url,
          clone: () => ({}),
          body: null,
          bodyUsed: false,
        } as Response);

      // Draft creation
      if (url.includes('/tool-builder/drafts') && method === 'POST') {
        return createMockResponse({
          success: true,
          data: { id: 'test-draft-123' }
        });
      }

      // Draft updates  
      if (url.includes('/tool-builder/drafts') && method === 'PUT') {
        return createMockResponse({
          success: true,
          data: { id: 'test-draft-123' }
        });
      }

      // Draft fetching
      if (url.includes('/tool-builder/drafts/test-draft-123') && method === 'GET') {
        return createMockResponse({
          success: true,
          data: {
            id: 'test-draft-123',
            name: 'Simple Calculator',
            description: 'A basic calculator tool',
            category: 'utility',
            inputConfig: [],
            logicBlocks: []
          }
        });
      }

      // Testing
      if (url.includes('/test')) {
        return createMockResponse({
          success: true,
          result: { output: 'Test successful' }
        });
      }

      // Publishing
      if (url.includes('/publish')) {
        return createMockResponse({
          success: true,
          data: {
            toolId: 'published-tool-456',
            message: 'Tool published successfully!',
            publishedAt: new Date().toISOString()
          }
        });
      }

      // Published tool fetching
      if (url.includes('/tools/published-tool-456') && method === 'GET') {
        return createMockResponse({
          fxn: {
            id: 'published-tool-456',
            slug: 'simple-calculator',
            title: 'Simple Calculator',
            description: 'A basic calculator tool',
            category: 'utility',
            codeKind: 'config',
            inputConfig: JSON.stringify([
              {
                id: 'amount',
                type: 'number',
                label: 'Amount',
                required: true,
                defaultValue: 100
              }
            ]),
            isPublic: true,
            createdBy: 'test-user-123'
          }
        });
      }

      // Related tools
      if (url.includes('/related')) {
        return createMockResponse({ fxns: [] });
      }

      // Running tool
      if (url.includes('/run') && method === 'POST') {
        return createMockResponse({
          success: true,
          outputs: { result: 'Calculation complete' },
          durationMs: 100
        });
      }

      // Default response
      return createMockResponse({ success: true });
    });
  });

  describe('Core Flow Testing', () => {
    it('should create a basic tool and verify it works', async () => {
      const user = userEvent.setup();
      
      // Step 1: Create tool
      render(
        
          <VisualToolBuilderPage />
        
      );

      // Fill basic info
      const nameInput = screen.getByLabelText(/tool name/i);
      const descInput = screen.getByLabelText(/description/i);
      const categorySelect = screen.getByLabelText(/category/i);

      await user.type(nameInput, 'Simple Calculator');
      await user.type(descInput, 'A basic calculator tool');
      await user.selectOptions(categorySelect, 'utility');

      const continueButton = screen.getByRole('button', { name: /continue/i });
      await user.click(continueButton);

      // Verify draft was created
      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith(
          'POST',
          '/api/tool-builder/drafts',
          expect.objectContaining({
            name: 'Simple Calculator'
          })
        );
      });

      // Step 2: Skip form building for simplicity
      await waitFor(() => {
        expect(screen.getByText('Form Builder')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /continue/i }));

      // Step 3: Skip logic building
      await waitFor(() => {
        expect(screen.getByText('Logic & Workflow')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /continue/i }));

      // Step 4: Skip testing
      await waitFor(() => {
        expect(screen.getByText('Test & Preview')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /continue/i }));

      // Step 5: Publish
      await waitFor(() => {
        expect(screen.getByText('Publish Tool')).toBeInTheDocument();
      });

      const publishButton = screen.getByRole('button', { name: /publish tool/i });
      await user.click(publishButton);

      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith(
          'POST',
          expect.stringMatching(/\/publish$/),
          expect.anything()
        );
      });
    });

    it('should display published tool correctly', async () => {
      // Test viewing published tool
      const { rerender } = render(
        
          <FxnPage />
        
      );

      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith(
          'GET',
          '/api/tools/published-tool-456'
        );
      });

      // Verify tool details appear
      await waitFor(() => {
        expect(screen.getByText('Simple Calculator')).toBeInTheDocument();
        expect(screen.getByText('A basic calculator tool')).toBeInTheDocument();
      });
    });

    it('should handle field type conversion correctly', async () => {
      // Mock tool with various field types
      mockApiRequest.mockImplementation((method: string, url: string) => {
        if (url.includes('/tools/field-test-tool') && method === 'GET') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              fxn: {
                id: 'field-test-tool',
                title: 'Field Test Tool',
                description: 'Tests various field types',
                codeKind: 'config',
                inputConfig: JSON.stringify([
                  { id: 'textField', type: 'text', label: 'Text', required: true },
                  { id: 'numberField', type: 'number', label: 'Number', min: 0, max: 100 },
                  { id: 'checkboxField', type: 'checkbox', label: 'Checkbox', defaultValue: false },
                  { id: 'selectField', type: 'select', label: 'Select', options: ['A', 'B', 'C'] },
                  { id: 'radioField', type: 'radio', label: 'Radio', options: ['X', 'Y', 'Z'] }
                ]),
                isPublic: true
              }
            })
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ fxns: [] })
        } as Response);
      });

      render(
        
          <FxnPage />
        
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/text/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/number/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/checkbox/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/select/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/radio/i)).toBeInTheDocument();
      });

      // Verify field types are correct
      const textField = screen.getByLabelText(/text/i) as HTMLInputElement;
      const numberField = screen.getByLabelText(/number/i) as HTMLInputElement;
      const checkboxField = screen.getByLabelText(/checkbox/i) as HTMLInputElement;

      expect(textField.type).toBe('text');
      expect(numberField.type).toBe('number');
      expect(checkboxField.type).toBe('checkbox');
    });

    it('should run published tool successfully', async () => {
      const user = userEvent.setup();

      render(
        
          <FxnPage />
        
      );

      await waitFor(() => {
        expect(screen.getByText('Simple Calculator')).toBeInTheDocument();
      });

      // Find and fill the amount field
      const amountField = screen.getByLabelText(/amount/i);
      await user.clear(amountField);
      await user.type(amountField, '150');

      // Run the tool
      const runButton = screen.getByRole('button', { name: /run/i });
      await user.click(runButton);

      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith(
          'POST',
          '/api/tools/published-tool-456/run',
          expect.objectContaining({
            amount: 150
          })
        );
      });

      // Verify results appear
      await waitFor(() => {
        expect(screen.getByText(/calculation complete/i)).toBeInTheDocument();
      });
    });
  });
});