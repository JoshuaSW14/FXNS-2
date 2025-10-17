import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { fetchWithRetry, ApiError, type RetryConfig } from './error-handler.js';

// Enhanced API request function using the new error handling
export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  retryConfig?: Partial<RetryConfig>
): Promise<Response> {
  return await fetchWithRetry(url, {
    method,
    headers: {
      'X-Requested-With': 'XMLHttpRequest',
      ...(data ? { "Content-Type": "application/json" } : {}),
    },
    body: data ? JSON.stringify(data) : undefined,
  }, retryConfig);
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    try {
      const res = await fetchWithRetry(queryKey.join("/") as string, {
        credentials: "include",
      });

      return await res.json();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401 && unauthorizedBehavior === "returnNull") {
        return null;
      }
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: (failureCount, error) => {
        // Let our custom retry logic handle retries
        if (error instanceof ApiError && error.retryable) {
          return false; // Don't retry here since fetchWithRetry handles it
        }
        return false;
      },
    },
    mutations: {
      retry: (failureCount, error) => {
        // Let our custom retry logic handle retries
        if (error instanceof ApiError && error.retryable) {
          return false; // Don't retry here since fetchWithRetry handles it
        }
        return false;
      },
    },
  },
});
