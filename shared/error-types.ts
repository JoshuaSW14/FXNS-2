// Standardized error codes used across the application
export const ErrorCodes = {
  // Authentication & Authorization
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  
  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  
  // Resources
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  
  // Business Logic
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  OPERATION_NOT_ALLOWED: 'OPERATION_NOT_ALLOWED',
  
  // External Services
  STRIPE_ERROR: 'STRIPE_ERROR',
  OPENAI_ERROR: 'OPENAI_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  
  // Network & Infrastructure
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  RATE_LIMITED: 'RATE_LIMITED',
  
  // Generic
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
} as const;

export type ErrorCode = keyof typeof ErrorCodes;

// Standardized error response format
export interface ApiErrorResponse {
  error: {
    code: ErrorCode;
    message: string;
    details?: any;
    timestamp: string;
    requestId?: string;
    retryAfter?: number; // For rate limiting
  };
}

// Error severity levels for logging
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Error categories for monitoring
export enum ErrorCategory {
  CLIENT = 'client',
  SERVER = 'server',
  EXTERNAL = 'external',
  VALIDATION = 'validation',
  BUSINESS = 'business'
}

// Extended error interface for internal use
export interface ExtendedError extends Error {
  code?: ErrorCode;
  statusCode?: number;
  details?: any;
  severity?: ErrorSeverity;
  category?: ErrorCategory;
  retryable?: boolean;
}