import { renderWithProviders as render, screen, fireEvent, waitFor } from '@/test-utils';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import VisualToolBuilderPage from '../visual-tool-builder-page';
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


describe('VisualToolBuilderPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful API responses
    mockApiRequest.mockImplementation((method, url) => {
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

  describe('Step Navigation', () => {
    it('should render step 1 (Tool Information) by default', () => {
      render(
        
          <VisualToolBuilderPage />
        
      );

      expect(screen.getByText('Tool Information')).toBeInTheDocument();
      expect(screen.getByLabelText(/tool name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
    });

    it('should show progress indicators for all steps', () => {
      render(
        
          <VisualToolBuilderPage />
        
      );

      // Check step indicators
      expect(screen.getByText('Tool Info')).toBeInTheDocument();
      expect(screen.getByText('Form Design')).toBeInTheDocument();
      expect(screen.getByText('Logic Flow')).toBeInTheDocument();
      expect(screen.getByText('Test Tool')).toBeInTheDocument();
      expect(screen.getByText('Publish')).toBeInTheDocument();
    });

    it('should advance to next step when "Continue" is clicked', async () => {
      const user = userEvent.setup();
      render(
        
          <VisualToolBuilderPage />
        
      );

      // Fill required fields in step 1
      await user.type(screen.getByLabelText(/tool name/i), 'Test Calculator');
      await user.type(screen.getByLabelText(/description/i), 'A simple test calculator');
      await user.selectOptions(screen.getByLabelText(/category/i), 'productivity');

      // Click continue
      await user.click(screen.getByRole('button', { name: /continue/i }));

      // Should advance to step 2
      expect(screen.getByText('Form Design')).toBeInTheDocument();
      expect(screen.getByText('Design your tool\'s input form')).toBeInTheDocument();
    });

    it('should not advance without required fields', async () => {
      const user = userEvent.setup();
      render(
        
          <VisualToolBuilderPage />
        
      );

      // Try to continue without filling fields
      await user.click(screen.getByRole('button', { name: /continue/i }));

      // Should show validation error and stay on step 1
      expect(screen.getByText(/please fill in all required fields/i)).toBeInTheDocument();
      expect(screen.getByText('Tool Information')).toBeInTheDocument();
    });

    it('should allow navigation backwards', async () => {
      const user = userEvent.setup();
      render(
        
          <VisualToolBuilderPage />
        
      );

      // Complete step 1
      await user.type(screen.getByLabelText(/tool name/i), 'Test Tool');
      await user.type(screen.getByLabelText(/description/i), 'Test description');
      await user.selectOptions(screen.getByLabelText(/category/i), 'productivity');
      await user.click(screen.getByRole('button', { name: /continue/i }));

      // Now on step 2, go back
      await user.click(screen.getByRole('button', { name: /back/i }));

      // Should be back on step 1
      expect(screen.getByText('Tool Information')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test Tool')).toBeInTheDocument();
    });
  });

  describe('Form Design Step', () => {
    it('should render form designer in step 2', async () => {
      const user = userEvent.setup();
      render(
        
          <VisualToolBuilderPage />
        
      );

      // Navigate to step 2
      await user.type(screen.getByLabelText(/tool name/i), 'Test Tool');
      await user.type(screen.getByLabelText(/description/i), 'Test description');
      await user.selectOptions(screen.getByLabelText(/category/i), 'productivity');
      await user.click(screen.getByRole('button', { name: /continue/i }));

      // Should show form designer
      expect(screen.getByText('Form Design')).toBeInTheDocument();
      expect(screen.getByText('Available Field Types')).toBeInTheDocument();
      expect(screen.getByText('Text')).toBeInTheDocument();
      expect(screen.getByText('Number')).toBeInTheDocument();
    });

    it('should allow adding form fields', async () => {
      const user = userEvent.setup();
      render(
        
          <VisualToolBuilderPage />
        
      );

      // Navigate to step 2
      await user.type(screen.getByLabelText(/tool name/i), 'Test Tool');
      await user.type(screen.getByLabelText(/description/i), 'Test description');
      await user.selectOptions(screen.getByLabelText(/category/i), 'productivity');
      await user.click(screen.getByRole('button', { name: /continue/i }));

      // Add a text field
      await user.click(screen.getByText('Text'));

      // Should see the field in preview
      expect(screen.getByText('Text')).toBeInTheDocument();
      expect(screen.getByText('Field Preview')).toBeInTheDocument();
    });
  });

  describe('Logic Flow Step', () => {
    it('should render logic flow builder in step 3', async () => {
      const user = userEvent.setup();
      render(
        
          <VisualToolBuilderPage />
        
      );

      // Navigate to step 3
      await user.type(screen.getByLabelText(/tool name/i), 'Test Tool');
      await user.type(screen.getByLabelText(/description/i), 'Test description');
      await user.selectOptions(screen.getByLabelText(/category/i), 'productivity');
      await user.click(screen.getByRole('button', { name: /continue/i }));
      await user.click(screen.getByRole('button', { name: /continue/i }));

      // Should show logic flow builder
      expect(screen.getByText('Logic Flow')).toBeInTheDocument();
      expect(screen.getByText('Calculation')).toBeInTheDocument();
      expect(screen.getByText('Condition')).toBeInTheDocument();
      expect(screen.getByText('Transform')).toBeInTheDocument();
    });
  });

  describe('Draft Management', () => {
    it('should save draft automatically when progressing', async () => {
      const user = userEvent.setup();
      render(
        
          <VisualToolBuilderPage />
        
      );

      // Fill step 1 and continue
      await user.type(screen.getByLabelText(/tool name/i), 'Draft Tool');
      await user.type(screen.getByLabelText(/description/i), 'Draft description');
      await user.selectOptions(screen.getByLabelText(/category/i), 'productivity');
      await user.click(screen.getByRole('button', { name: /continue/i }));

      // Should attempt to save draft
      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith(
          'POST',
          '/api/tool-builder/drafts',
          expect.objectContaining({
            name: 'Draft Tool',
            description: 'Draft description',
            category: 'productivity',
            status: 'draft'
          })
        );
      });
    });

    it('should handle save errors gracefully', async () => {
      const user = userEvent.setup();
      
      // Mock save failure
      mockApiRequest.mockImplementationOnce(() => Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: 'Save failed' })
      }));

      render(
        
          <VisualToolBuilderPage />
        
      );

      await user.type(screen.getByLabelText(/tool name/i), 'Test Tool');
      await user.type(screen.getByLabelText(/description/i), 'Test description');
      await user.selectOptions(screen.getByLabelText(/category/i), 'productivity');
      await user.click(screen.getByRole('button', { name: /continue/i }));

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/failed to save/i)).toBeInTheDocument();
      });
    });
  });

  describe('Testing Step', () => {
    it('should render test runner in step 4', async () => {
      const user = userEvent.setup();
      render(
        
          <VisualToolBuilderPage />
        
      );

      // Navigate through steps to testing
      await user.type(screen.getByLabelText(/tool name/i), 'Test Tool');
      await user.type(screen.getByLabelText(/description/i), 'Test description');
      await user.selectOptions(screen.getByLabelText(/category/i), 'productivity');
      await user.click(screen.getByRole('button', { name: /continue/i }));
      await user.click(screen.getByRole('button', { name: /continue/i }));
      await user.click(screen.getByRole('button', { name: /continue/i }));

      // Should show test runner
      expect(screen.getByText('Test Tool')).toBeInTheDocument();
      expect(screen.getByText('Test your tool with sample data')).toBeInTheDocument();
    });
  });

  describe('Publishing Step', () => {
    it('should render publish step', async () => {
      const user = userEvent.setup();
      render(
        
          <VisualToolBuilderPage />
        
      );

      // Navigate to publishing step
      await user.type(screen.getByLabelText(/tool name/i), 'Test Tool');
      await user.type(screen.getByLabelText(/description/i), 'Test description');
      await user.selectOptions(screen.getByLabelText(/category/i), 'productivity');
      
      // Navigate through all steps
      for (let i = 0; i < 4; i++) {
        await user.click(screen.getByRole('button', { name: /continue/i }));
      }

      // Should show publish step
      expect(screen.getByText('Publish Tool')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /publish tool/i })).toBeInTheDocument();
    });

    it('should handle publishing', async () => {
      const user = userEvent.setup();
      render(
        
          <VisualToolBuilderPage />
        
      );

      // Complete all steps and publish
      await user.type(screen.getByLabelText(/tool name/i), 'Publish Tool');
      await user.type(screen.getByLabelText(/description/i), 'Ready to publish');
      await user.selectOptions(screen.getByLabelText(/category/i), 'productivity');
      
      // Navigate to publish step
      for (let i = 0; i < 4; i++) {
        await user.click(screen.getByRole('button', { name: /continue/i }));
      }

      // Publish the tool
      await user.click(screen.getByRole('button', { name: /publish tool/i }));

      // Should attempt to publish
      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith(
          'POST',
          expect.stringMatching(/\/publish$/),
          undefined
        );
      });
    });
  });

  describe('Draft Loading', () => {
    it('should load existing draft from URL parameter', async () => {
      // Mock draft data response
      mockApiRequest.mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          draft: {
            id: 'existing-draft',
            name: 'Existing Tool',
            description: 'Loaded from draft',
            category: 'finance',
            inputConfig: [],
            logicConfig: [],
            outputConfig: { format: 'text' }
          }
        })
      }));

      render(
        
          <VisualToolBuilderPage />
        
      );

      // Should load draft data
      await waitFor(() => {
        expect(screen.getByDisplayValue('Existing Tool')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Loaded from draft')).toBeInTheDocument();
      });
    });
  });

  describe('Preview Mode', () => {
    it('should toggle preview mode', async () => {
      const user = userEvent.setup();
      render(
        
          <VisualToolBuilderPage />
        
      );

      // Navigate to form design step
      await user.type(screen.getByLabelText(/tool name/i), 'Test Tool');
      await user.type(screen.getByLabelText(/description/i), 'Test description');
      await user.selectOptions(screen.getByLabelText(/category/i), 'productivity');
      await user.click(screen.getByRole('button', { name: /continue/i }));

      // Toggle preview mode
      const previewButton = screen.getByRole('button', { name: /preview/i });
      await user.click(previewButton);

      // Should show preview mode
      expect(screen.getByText(/preview mode/i)).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should validate tool name is required', async () => {
      const user = userEvent.setup();
      render(
        
          <VisualToolBuilderPage />
        
      );

      // Try to continue without name
      await user.type(screen.getByLabelText(/description/i), 'Test description');
      await user.selectOptions(screen.getByLabelText(/category/i), 'productivity');
      await user.click(screen.getByRole('button', { name: /continue/i }));

      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
    });

    it('should validate description is required', async () => {
      const user = userEvent.setup();
      render(
        
          <VisualToolBuilderPage />
        
      );

      // Try to continue without description
      await user.type(screen.getByLabelText(/tool name/i), 'Test Tool');
      await user.selectOptions(screen.getByLabelText(/category/i), 'productivity');
      await user.click(screen.getByRole('button', { name: /continue/i }));

      expect(screen.getByText(/description is required/i)).toBeInTheDocument();
    });

    it('should validate category is required', async () => {
      const user = userEvent.setup();
      render(
        
          <VisualToolBuilderPage />
        
      );

      // Try to continue without category
      await user.type(screen.getByLabelText(/tool name/i), 'Test Tool');
      await user.type(screen.getByLabelText(/description/i), 'Test description');
      await user.click(screen.getByRole('button', { name: /continue/i }));

      expect(screen.getByText(/category is required/i)).toBeInTheDocument();
    });
  });
});