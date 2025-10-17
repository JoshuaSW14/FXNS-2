import { fetchWithRetry, type RetryConfig } from './error-handler.js';

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown,
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
