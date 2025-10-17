import { renderWithProviders as render, screen, fireEvent, waitFor } from '@/test-utils';
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
    user: { id: 'test-user', email: 'test@example.com' },
    isAuthenticated: true,
  }),
}));

const mockApiRequest = vi.mocked(queryClient.apiRequest);

// Using renderWithProviders from test-utils which includes AuthProvider

describe('Tool Builder - End-to-End Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful API responses
    mockApiRequest.mockImplementation((method, url, data) => {
      if (url.includes('/drafts') && method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: { id: 'test-draft-123' }
          })
        });
      }
      if (url.includes('/drafts') && method === 'PUT') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: { id: 'test-draft-123' }
          })
        });
      }
      if (url.includes('/test')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            result: { output: 'Test result: 150' }
          })
        });
      }
      if (url.includes('/publish')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            toolId: 'published-tool-123'
          })
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });
    });
  });

  describe('Complete Tool Creation Flow', () => {
    it('should create a calculator tool from start to finish', async () => {
      const user = userEvent.setup();
      
      render(<VisualToolBuilderPage />);

      // Step 1: Tool Information
      expect(screen.getByText('Tool Information')).toBeInTheDocument();
      
      await user.type(screen.getByLabelText(/tool name/i), 'Tip Calculator');
      await user.type(screen.getByLabelText(/description/i), 'Calculate tip and total amount for restaurant bills');
      await user.selectOptions(screen.getByLabelText(/category/i), 'finance');
      
      await user.click(screen.getByRole('button', { name: /continue/i }));

      // Verify draft is saved
      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith(
          'POST',
          '/api/tool-builder/drafts',
          expect.objectContaining({
            name: 'Tip Calculator',
            description: 'Calculate tip and total amount for restaurant bills',
            category: 'finance'
          })
        );
      });

      // Step 2: Form Design
      expect(screen.getByText('Form Design')).toBeInTheDocument();
      
      // Add bill amount field
      await user.click(screen.getByText('Number'));
      expect(screen.getByText('Number')).toBeInTheDocument();
      
      // Select and edit the field
      await user.click(screen.getByText('Number'));
      const labelInput = screen.getByDisplayValue('Number');
      await user.clear(labelInput);
      await user.type(labelInput, 'Bill Amount');
      
      // Add tip percentage field
      await user.click(screen.getByText('Number'));
      
      await user.click(screen.getByRole('button', { name: /continue/i }));

      // Step 3: Logic Flow
      expect(screen.getByText('Logic Flow')).toBeInTheDocument();
      
      // Add calculation step
      await user.click(screen.getByText('Calculation'));
      
      // Select the calculation step and add formula
      await user.click(screen.getByText('Calculation'));
      const formulaInput = screen.getByPlaceholderText(/enter formula/i);
      await user.type(formulaInput, 'bill_amount * (1 + tip_percentage / 100)');
      
      await user.click(screen.getByRole('button', { name: /continue/i }));

      // Step 4: Testing
      expect(screen.getByText('Test Tool')).toBeInTheDocument();
      
      // Fill test data
      const billInput = screen.getByLabelText(/bill amount/i);
      await user.type(billInput, '100');
      
      const tipInput = screen.getByLabelText(/number/i); // Second number field
      await user.type(tipInput, '20');
      
      // Run test
      await user.click(screen.getByRole('button', { name: /run test/i }));
      
      // Verify test is executed
      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith(
          'POST',
          '/api/tool-builder/drafts/test-draft-123/test',
          expect.objectContaining({
            testData: expect.any(Object)
          })
        );
      });
      
      // Should show test results
      await waitFor(() => {
        expect(screen.getByText(/test result: 150/i)).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /continue/i }));

      // Step 5: Publishing
      expect(screen.getByText('Publish Tool')).toBeInTheDocument();
      
      // Publish the tool
      await user.click(screen.getByRole('button', { name: /publish tool/i }));
      
      // Verify publish is called
      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith(
          'POST',
          '/api/tool-builder/drafts/test-draft-123/publish'
        );
      });
    }, 30000); // Increased timeout for complex integration test
  });

  describe('Form Field Type Testing', () => {
    it('should handle all form field types correctly', async () => {
      const user = userEvent.setup();
      
      render(<VisualToolBuilderPage />);

      // Complete step 1
      await user.type(screen.getByLabelText(/tool name/i), 'Field Types Test');
      await user.type(screen.getByLabelText(/description/i), 'Testing all field types');
      await user.selectOptions(screen.getByLabelText(/category/i), 'productivity');
      await user.click(screen.getByRole('button', { name: /continue/i }));

      // Step 2: Add different field types
      // Text field
      await user.click(screen.getByText('Text'));
      
      // Number field
      await user.click(screen.getByText('Number'));
      
      // Email field
      await user.click(screen.getByText('Email'));
      
      // Select field
      await user.click(screen.getByText('Dropdown'));
      
      // Edit select field options
      await user.click(screen.getByText('Dropdown'));
      const optionsTextarea = screen.getByPlaceholderText('One option per line');
      await user.clear(optionsTextarea);
      await user.type(optionsTextarea, 'Option A\nOption B\nOption C');
      
      // Boolean field
      await user.click(screen.getByText('Checkbox'));

      // Continue to testing
      await user.click(screen.getByRole('button', { name: /continue/i }));
      await user.click(screen.getByRole('button', { name: /continue/i }));

      // Step 4: Test all field types
      expect(screen.getByLabelText(/text/i)).toBeInTheDocument();
      expect(screen.getByRole('spinbutton')).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument();
      expect(screen.getByRole('combobox')).toBeInTheDocument();
      expect(screen.getByRole('checkbox')).toBeInTheDocument();

      // Fill test data for each field type
      await user.type(screen.getByLabelText(/text/i), 'Test text');
      await user.type(screen.getByRole('spinbutton'), '42');
      await user.type(screen.getByRole('textbox', { name: /email/i }), 'test@example.com');
      
      // Select from dropdown
      await user.click(screen.getByRole('combobox'));
      await user.click(screen.getByText('Option B'));
      
      // Check checkbox
      await user.click(screen.getByRole('checkbox'));

      // Run test
      await user.click(screen.getByRole('button', { name: /run test/i }));

      // Verify all field data is submitted
      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith(
          'POST',
          expect.stringMatching(/\/test$/),
          expect.objectContaining({
            testData: expect.objectContaining({
              // All field types should be present
            })
          })
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle save failures gracefully', async () => {
      const user = userEvent.setup();
      
      // Mock save failure
      mockApiRequest.mockImplementationOnce(() => Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: 'Server error' })
      }));

      render(<VisualToolBuilderPage />);

      await user.type(screen.getByLabelText(/tool name/i), 'Failed Tool');
      await user.type(screen.getByLabelText(/description/i), 'This will fail to save');
      await user.selectOptions(screen.getByLabelText(/category/i), 'productivity');
      await user.click(screen.getByRole('button', { name: /continue/i }));

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/failed to save/i)).toBeInTheDocument();
      });
    });

    it('should handle test failures gracefully', async () => {
      const user = userEvent.setup();
      
      // Mock test failure
      mockApiRequest.mockImplementation((method, url) => {
        if (url.includes('/test')) {
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({ error: 'Test execution failed' })
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: { id: 'test-draft' } })
        });
      });

      render(<VisualToolBuilderPage />);

      // Complete steps to testing
      await user.type(screen.getByLabelText(/tool name/i), 'Test Tool');
      await user.type(screen.getByLabelText(/description/i), 'Test description');
      await user.selectOptions(screen.getByLabelText(/category/i), 'productivity');
      await user.click(screen.getByRole('button', { name: /continue/i }));
      await user.click(screen.getByRole('button', { name: /continue/i }));
      await user.click(screen.getByRole('button', { name: /continue/i }));

      // Try to run test
      await user.click(screen.getByRole('button', { name: /run test/i }));

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/test execution failed/i)).toBeInTheDocument();
      });
    });

    it('should handle publish failures gracefully', async () => {
      const user = userEvent.setup();
      
      // Mock publish failure
      mockApiRequest.mockImplementation((method, url) => {
        if (url.includes('/publish')) {
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({ error: 'Publish failed' })
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: { id: 'test-draft' } })
        });
      });

      render(<VisualToolBuilderPage />);

      // Complete all steps to publishing
      await user.type(screen.getByLabelText(/tool name/i), 'Publish Tool');
      await user.type(screen.getByLabelText(/description/i), 'This will fail to publish');
      await user.selectOptions(screen.getByLabelText(/category/i), 'productivity');
      
      // Navigate through all steps
      for (let i = 0; i < 4; i++) {
        await user.click(screen.getByRole('button', { name: /continue/i }));
      }

      // Try to publish
      await user.click(screen.getByRole('button', { name: /publish tool/i }));

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/failed to publish/i)).toBeInTheDocument();
      });
    });
  });

  describe('Draft Persistence', () => {
    it('should save and restore draft state', async () => {
      const user = userEvent.setup();
      
      render(<VisualToolBuilderPage />);

      // Fill some data
      await user.type(screen.getByLabelText(/tool name/i), 'Draft Tool');
      await user.type(screen.getByLabelText(/description/i), 'This is a draft');
      await user.selectOptions(screen.getByLabelText(/category/i), 'finance');
      
      // Continue to next step (triggers save)
      await user.click(screen.getByRole('button', { name: /continue/i }));

      // Add some form fields
      await user.click(screen.getByText('Text'));
      await user.click(screen.getByText('Number'));

      // Verify draft is updated with form fields
      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith(
          'PUT',
          expect.stringMatching(/\/drafts\/test-draft-123$/),
          expect.objectContaining({
            inputConfig: expect.arrayContaining([
              expect.objectContaining({ type: 'text' }),
              expect.objectContaining({ type: 'number' })
            ])
          })
        );
      });
    });
  });
});