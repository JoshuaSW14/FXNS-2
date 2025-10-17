import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, AuthContext } from '@/hooks/use-auth';
import { User as SelectUser } from '@shared/schema';

// Create a test query client
export const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

// Mock user for testing
export const mockUser: SelectUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  username: 'testuser',
  displayName: 'Test User',
  subscriptionStatus: null,
  subscriptionTier: null,
  subscriptionPeriodEnd: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  proExpiresAt: null,
  isPro: false,
};

export const mockProUser: SelectUser = {
  ...mockUser,
  subscriptionStatus: 'active',
  subscriptionTier: 'pro',
  isPro: true,
};

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  user?: SelectUser | null;
  initialRoute?: string;
}

// Wrapper with AuthProvider
export function AllTheProviders({ 
  children, 
  user = mockUser 
}: { 
  children: React.ReactNode; 
  user?: SelectUser | null;
}) {
  const testQueryClient = createTestQueryClient();

  // If user is provided, set it in the query cache
  if (user) {
    testQueryClient.setQueryData(['/api/user'], user);
  }

  return (
    <QueryClientProvider client={testQueryClient}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </QueryClientProvider>
  );
}

// Custom render function with providers
export function renderWithProviders(
  ui: ReactElement,
  { user = mockUser, ...renderOptions }: CustomRenderOptions = {}
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <AllTheProviders user={user}>{children}</AllTheProviders>;
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

// Re-export everything from testing library
export * from '@testing-library/react';
export { renderWithProviders as render };
