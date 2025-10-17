import { ErrorCodes, type ApiErrorResponse, type ErrorCode } from '../../../shared/error-types.js';

// Enhanced client-side error class
export class ApiError extends Error {
  public readonly code: ErrorCode;
  public readonly status: number;
  public readonly statusText: string;
  public readonly details?: any;
  public readonly timestamp: string;
  public readonly requestId?: string;
  public readonly retryAfter?: number;
  public readonly retryable: boolean;

  constructor(
    code: ErrorCode,
    message: string,
    status: number,
    statusText: string,
    details?: any,
    timestamp?: string,
    requestId?: string,
    retryAfter?: number
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.statusText = statusText;
    this.details = details;
    this.timestamp = timestamp || new Date().toISOString();
    this.requestId = requestId;
    this.retryAfter = retryAfter;
    
    // Determine if error is retryable
    this.retryable = this.isRetryableError();
  }

  private isRetryableError(): boolean {
    // Network errors and 5xx errors are typically retryable
    if (this.status >= 500) return true;
    
    // Rate limiting is retryable with backoff
    if (this.status === 429) return true;
    
    // Timeout errors are retryable
    if (this.code === ErrorCodes.TIMEOUT_ERROR) return true;
    if (this.code === ErrorCodes.NETWORK_ERROR) return true;
    if (this.code === ErrorCodes.SERVICE_UNAVAILABLE) return true;
    
    // 4xx errors are generally not retryable
    return false;
  }

  static fromResponse(response: Response, errorData?: ApiErrorResponse): ApiError {
    if (errorData?.error) {
      return new ApiError(
        errorData.error.code,
        errorData.error.message,
        response.status,
        response.statusText,
        errorData.error.details,
        errorData.error.timestamp,
        errorData.error.requestId,
        errorData.error.retryAfter
      );
    }

    // Fallback for non-standardized errors
    return new ApiError(
      ErrorCodes.UNKNOWN_ERROR,
      `HTTP ${response.status}: ${response.statusText}`,
      response.status,
      response.statusText
    );
  }

  static fromNetworkError(originalError: Error): ApiError {
    return new ApiError(
      ErrorCodes.NETWORK_ERROR,
      `Network error: ${originalError.message}`,
      0,
      'Network Error',
      { originalError: originalError.message }
    );
  }

  static fromTimeoutError(): ApiError {
    return new ApiError(
      ErrorCodes.TIMEOUT_ERROR,
      'Request timeout',
      408,
      'Request Timeout'
    );
  }
}

// Retry configuration
export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  timeoutMs?: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffFactor: 2,
  timeoutMs: 30000 // 30 seconds
};

// Calculate exponential backoff delay
export function calculateBackoffDelay(attempt: number, config: RetryConfig): number {
  const delay = config.baseDelay * Math.pow(config.backoffFactor, attempt - 1);
  const jitter = Math.random() * 0.1 * delay; // Add 10% jitter
  return Math.min(delay + jitter, config.maxDelay);
}

// Sleep utility for delays
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Enhanced fetch with retry logic and timeout
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retryConfig: Partial<RetryConfig> = {}
): Promise<Response> {
  const config = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  let lastError: ApiError | undefined;

  for (let attempt = 1; attempt <= config.maxRetries + 1; attempt++) {
    let timeoutId: NodeJS.Timeout | null = null;
    
    try {
      // Create AbortController for timeout
      const controller = new AbortController();
      timeoutId = config.timeoutMs 
        ? setTimeout(() => controller.abort(), config.timeoutMs)
        : null;

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        credentials: 'include',
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          ...options.headers,
        }
      });

      if (timeoutId) clearTimeout(timeoutId);

      // Parse error response if not ok
      if (!response.ok) {
        let errorData: ApiErrorResponse | undefined;
        
        try {
          const text = await response.text();
          if (text) {
            errorData = JSON.parse(text);
          }
        } catch (e) {
          // Ignore JSON parse errors, use default error
        }

        const apiError = ApiError.fromResponse(response, errorData);
        
        // Don't retry if error is not retryable or this is the last attempt
        if (!apiError.retryable || attempt > config.maxRetries) {
          throw apiError;
        }

        lastError = apiError;
        
        // Wait before retrying (respect Retry-After header for 429s)
        const retryDelay = apiError.retryAfter 
          ? apiError.retryAfter * 1000 
          : calculateBackoffDelay(attempt, config);
          
        console.warn(`🔄 Retrying request (attempt ${attempt}/${config.maxRetries}) after ${retryDelay}ms:`, {
          url,
          error: apiError.message,
          code: apiError.code
        });
        
        await sleep(retryDelay);
        continue;
      }

      return response;

    } catch (error: any) {
      if (timeoutId) clearTimeout(timeoutId);

      // Handle different error types
      if (error.name === 'AbortError') {
        const timeoutError = ApiError.fromTimeoutError();
        if (attempt > config.maxRetries) throw timeoutError;
        lastError = timeoutError;
      } else if (error instanceof ApiError) {
        if (!error.retryable || attempt > config.maxRetries) throw error;
        lastError = error;
      } else {
        const networkError = ApiError.fromNetworkError(error);
        if (attempt > config.maxRetries) throw networkError;
        lastError = networkError;
      }

      // Wait before retrying
      const retryDelay = calculateBackoffDelay(attempt, config);
      console.warn(`🔄 Retrying request (attempt ${attempt}/${config.maxRetries}) after ${retryDelay}ms:`, {
        url,
        error: lastError.message
      });
      
      await sleep(retryDelay);
    }
  }

  // This should never be reached, but just in case
  throw lastError || new ApiError(ErrorCodes.UNKNOWN_ERROR, 'Unknown error occurred', 500, 'Internal Server Error');
}

// User-friendly error messages
export function getErrorMessage(error: ApiError): string {
  const friendlyMessages: Record<ErrorCode, string> = {
    [ErrorCodes.UNAUTHORIZED]: 'Please sign in to continue',
    [ErrorCodes.FORBIDDEN]: 'You don\'t have permission to perform this action',
    [ErrorCodes.NOT_FOUND]: 'The requested item could not be found',
    [ErrorCodes.VALIDATION_ERROR]: 'Please check your input and try again',
    [ErrorCodes.RATE_LIMITED]: 'Too many requests. Please wait a moment and try again',
    [ErrorCodes.NETWORK_ERROR]: 'Connection problem. Please check your internet and try again',
    [ErrorCodes.TIMEOUT_ERROR]: 'Request timed out. Please try again',
    [ErrorCodes.SERVICE_UNAVAILABLE]: 'Service is temporarily unavailable. Please try again later',
    [ErrorCodes.INTERNAL_ERROR]: 'Something went wrong on our end. Please try again',
    [ErrorCodes.INVALID_CREDENTIALS]: 'Invalid email or password',
    [ErrorCodes.SESSION_EXPIRED]: 'Your session has expired. Please sign in again',
    [ErrorCodes.ALREADY_EXISTS]: 'This item already exists',
    [ErrorCodes.DUPLICATE_ENTRY]: 'This entry already exists',
    [ErrorCodes.INSUFFICIENT_PERMISSIONS]: 'You don\'t have permission to perform this action',
    [ErrorCodes.QUOTA_EXCEEDED]: 'You\'ve reached your usage limit',
    [ErrorCodes.OPERATION_NOT_ALLOWED]: 'This operation is not allowed',
    [ErrorCodes.STRIPE_ERROR]: 'Payment processing error. Please try again',
    [ErrorCodes.OPENAI_ERROR]: 'AI service is temporarily unavailable',
    [ErrorCodes.DATABASE_ERROR]: 'Database error. Please try again',
    [ErrorCodes.INVALID_INPUT]: 'Invalid input provided',
    [ErrorCodes.MISSING_REQUIRED_FIELD]: 'Please fill in all required fields',
    [ErrorCodes.UNKNOWN_ERROR]: 'An unexpected error occurred'
  };

  return friendlyMessages[error.code] || error.message || 'An unexpected error occurred';
}