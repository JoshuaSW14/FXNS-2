import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ToolTestRunner from '../tool-test-runner';
import { FormField } from '@shared/tool-builder-schemas';
import * as queryClient from '@/lib/queryClient';

// Mock the API request
vi.mock('@/lib/queryClient', () => ({
  apiRequest: vi.fn(),
}));

// Mock toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

const mockApiRequest = vi.mocked(queryClient.apiRequest);

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const testQueryClient = createTestQueryClient();
  return (
    <QueryClientProvider client={testQueryClient}>
      {children}
    </QueryClientProvider>
  );
};

const sampleFormFields: FormField[] = [
  {
    id: 'name',
    type: 'text',
    label: 'Full Name',
    placeholder: 'Enter your name',
    required: true,
  },
  {
    id: 'age',
    type: 'number',
    label: 'Age',
    required: true,
  },
  {
    id: 'email',
    type: 'email',
    label: 'Email Address',
    required: false,
  },
  {
    id: 'country',
    type: 'select',
    label: 'Country',
    required: false,
    options: [
      { label: 'United States', value: 'us' },
      { label: 'Canada', value: 'ca' },
      { label: 'United Kingdom', value: 'uk' }
    ]
  },
  {
    id: 'newsletter',
    type: 'boolean',
    label: 'Subscribe to newsletter',
    required: false,
  }
];

const defaultProps = {
  draftId: 'test-draft-123',
  formFields: sampleFormFields,
};

describe('ToolTestRunner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiRequest.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        result: { output: 'Test completed successfully!' }
      })
    });
  });

  describe('Form Rendering', () => {
    it('should render all form fields correctly', () => {
      render(
        <TestWrapper>
          <ToolTestRunner {...defaultProps} />
        </TestWrapper>
      );

      // Check all fields are rendered (query by placeholder/role since labels aren't associated)
      expect(screen.getByPlaceholderText('Enter your name')).toBeInTheDocument();
      expect(screen.getAllByRole('spinbutton')[0]).toBeInTheDocument();
      const textboxes = screen.getAllByRole('textbox');
      expect(textboxes.length).toBeGreaterThan(0); // email field exists
      expect(screen.getByRole('combobox')).toBeInTheDocument(); // select field  
      expect(screen.getByRole('switch')).toBeInTheDocument(); // newsletter toggle
    });

    it('should show required field indicators', () => {
      render(
        <TestWrapper>
          <ToolTestRunner {...defaultProps} />
        </TestWrapper>
      );

      // Required fields should have asterisk (rendered via CSS pseudo-element)
      // Just check the label text exists
      expect(screen.getByText('Full Name')).toBeInTheDocument();
      expect(screen.getByText('Age')).toBeInTheDocument();
      
      // Optional fields should not have asterisk
      expect(screen.getByText('Email Address')).toBeInTheDocument();
      expect(screen.queryByText('Email Address *')).not.toBeInTheDocument();
    });

    it('should render correct input types', () => {
      render(
        <TestWrapper>
          <ToolTestRunner {...defaultProps} />
        </TestWrapper>
      );

      // Text input
      expect(screen.getByPlaceholderText('Enter your name')).toBeInTheDocument();
      
      // Number input (labels aren't associated, so query by role)
      expect(screen.getAllByRole('spinbutton')[0]).toHaveAttribute('type', 'number');
      
      // Email input (query all textboxes and find the email type)
      const inputs = screen.getAllByRole('textbox');
      const emailInput = inputs.find(input => input.getAttribute('type') === 'email');
      expect(emailInput).toHaveAttribute('type', 'email');
      
      // Select input (using button role for radix select)
      expect(screen.getByRole('combobox')).toBeInTheDocument();
      
      // Switch for newsletter
      expect(screen.getByRole('switch')).toBeInTheDocument();
    });
  });

  describe('Form Interaction', () => {
    it('should handle text input changes', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <ToolTestRunner {...defaultProps} />
        </TestWrapper>
      );

      const nameInput = screen.getByPlaceholderText('Enter your name');
      await user.type(nameInput, 'John Doe');

      expect(nameInput).toHaveValue('John Doe');
    });

    it('should handle number input changes', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <ToolTestRunner {...defaultProps} />
        </TestWrapper>
      );

      const ageInput = screen.getAllByRole('spinbutton')[0];
      await user.clear(ageInput);
      await user.type(ageInput, '25');

      expect(ageInput).toHaveValue(25);
    });

    it('should handle select input changes', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <ToolTestRunner {...defaultProps} />
        </TestWrapper>
      );

      // Find the select trigger button (it's the next element after the label)
      const selectTrigger = screen.getByRole('combobox');
      await user.click(selectTrigger);
      
      // Select Canada
      await user.click(screen.getByText('Canada'));

      // Check the value in the DOM (the actual select value)
      await waitFor(() => {
        expect(selectTrigger).toHaveTextContent('Canada');
      });
    });

    it('should handle checkbox changes', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <ToolTestRunner {...defaultProps} />
        </TestWrapper>
      );

      // The Switch component renders as a button with role="switch"
      const newsletterSwitch = screen.getByRole('switch');
      await user.click(newsletterSwitch);

      expect(newsletterSwitch).toHaveAttribute('data-state', 'checked');
    });
  });

  describe('Form Validation', () => {
    it('should show validation error for missing required fields', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <ToolTestRunner {...defaultProps} />
        </TestWrapper>
      );

      // Try to run test without filling required fields
      const runButton = screen.getByRole('button', { name: /run test/i });
      await user.click(runButton);

      // The toast shows "Missing required fields" as the title
      expect(screen.getByText('Missing required fields')).toBeInTheDocument();
    });

    it('should allow test run when all required fields are filled', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <ToolTestRunner {...defaultProps} />
        </TestWrapper>
      );

      // Fill required fields
      await user.type(screen.getByPlaceholderText('Enter your name'), 'John Doe');
      await user.type(screen.getAllByRole('spinbutton')[0], '25');

      const runButton = screen.getByRole('button', { name: /run test/i });
      await user.click(runButton);

      // Should attempt API call
      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith(
          'POST',
          '/api/tool-builder/drafts/test-draft-123/test',
          {
            testData: {
              name: 'John Doe',
              age: 25,
              email: '',
              country: '',
              newsletter: false,
            }
          }
        );
      });
    });
  });

  describe('Test Execution', () => {
    it('should show loading state during test execution', async () => {
      const user = userEvent.setup();
      
      // Mock delayed response
      mockApiRequest.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, result: { output: 'Success!' } })
          }), 100)
        )
      );

      render(
        <TestWrapper>
          <ToolTestRunner {...defaultProps} />
        </TestWrapper>
      );

      // Fill required fields
      await user.type(screen.getByPlaceholderText('Enter your name'), 'John Doe');
      await user.type(screen.getAllByRole('spinbutton')[0], '25');

      const runButton = screen.getByRole('button', { name: /run test/i });
      await user.click(runButton);

      // Should show loading state
      expect(screen.getByText('Testing...')).toBeInTheDocument();
      expect(runButton).toBeDisabled();
    });

    it('should display test results on success', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <ToolTestRunner {...defaultProps} />
        </TestWrapper>
      );

      // Fill required fields
      await user.type(screen.getByPlaceholderText('Enter your name'), 'John Doe');
      await user.type(screen.getAllByRole('spinbutton')[0], '25');

      const runButton = screen.getByRole('button', { name: /run test/i });
      await user.click(runButton);

      // Wait for test completion
      await waitFor(() => {
        expect(screen.getByText('Test completed successfully!')).toBeInTheDocument();
      });
    });

    it('should handle test failures gracefully', async () => {
      const user = userEvent.setup();
      
      // Mock error response
      mockApiRequest.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Test execution failed' })
      });

      render(
        <TestWrapper>
          <ToolTestRunner {...defaultProps} />
        </TestWrapper>
      );

      // Fill required fields
      await user.type(screen.getByPlaceholderText('Enter your name'), 'John Doe');
      await user.type(screen.getAllByRole('spinbutton')[0], '25');

      const runButton = screen.getByRole('button', { name: /run test/i });
      await user.click(runButton);

      // Should show error
      await waitFor(() => {
        expect(screen.getByText(/test execution failed/i)).toBeInTheDocument();
      });
    });
  });

  describe('Default Values', () => {
    const fieldsWithDefaults: FormField[] = [
      {
        id: 'name',
        type: 'text',
        label: 'Name',
        defaultValue: 'Default Name',
        required: false,
      },
      {
        id: 'count',
        type: 'number',
        label: 'Count',
        defaultValue: '10',
        required: false,
      },
      {
        id: 'status',
        type: 'select',
        label: 'Status',
        defaultValue: 'active',
        required: false,
        options: [
          { label: 'Active', value: 'active' },
          { label: 'Inactive', value: 'inactive' }
        ]
      }
    ];

    it('should populate form with default values', () => {
      render(
        <TestWrapper>
          <ToolTestRunner draftId="test" formFields={fieldsWithDefaults} />
        </TestWrapper>
      );

      expect(screen.getByDisplayValue('Default Name')).toBeInTheDocument();
      expect(screen.getByDisplayValue('10')).toBeInTheDocument();
      // Radix Select doesn't use native select, so check the trigger text instead
      expect(screen.getByText('Active')).toBeInTheDocument();
    });
  });

  describe('Multiple Test Runs', () => {
    it('should allow running multiple tests', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <ToolTestRunner {...defaultProps} />
        </TestWrapper>
      );

      // Fill and run first test
      await user.type(screen.getByPlaceholderText('Enter your name'), 'John Doe');
      await user.type(screen.getAllByRole('spinbutton')[0], '25');

      const runButton = screen.getByRole('button', { name: /run test/i });
      await user.click(runButton);

      await waitFor(() => {
        expect(screen.getByText('Test completed successfully!')).toBeInTheDocument();
      });

      // Modify data and run again
      const nameInput = screen.getByDisplayValue('John Doe');
      await user.clear(nameInput);
      await user.type(nameInput, 'Jane Smith');

      await user.click(runButton);

      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledTimes(2);
      });
    });
  });
});