import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { ErrorCodes, ErrorSeverity, ErrorCategory, type ApiErrorResponse, type ExtendedError } from '../../shared/error-types.js';
import { nanoid } from 'nanoid';

// Enhanced error class for server-side use
export class AppError extends Error implements ExtendedError {
  public readonly code: typeof ErrorCodes[keyof typeof ErrorCodes];
  public readonly statusCode: number;
  public readonly details?: any;
  public readonly severity: ErrorSeverity;
  public readonly category: ErrorCategory;
  public readonly retryable: boolean;

  constructor(
    code: typeof ErrorCodes[keyof typeof ErrorCodes],
    message: string,
    statusCode: number = 500,
    details?: any,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    category: ErrorCategory = ErrorCategory.SERVER,
    retryable: boolean = false
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.severity = severity;
    this.category = category;
    this.retryable = retryable;

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, AppError);
  }
}

// Helper functions to create common errors
export const createValidationError = (message: string, details?: any) =>
  new AppError(ErrorCodes.VALIDATION_ERROR, message, 400, details, ErrorSeverity.LOW, ErrorCategory.VALIDATION);

export const createNotFoundError = (resource: string) =>
  new AppError(ErrorCodes.NOT_FOUND, `${resource} not found`, 404, null, ErrorSeverity.LOW, ErrorCategory.CLIENT);

export const createUnauthorizedError = (message: string = 'Authentication required') =>
  new AppError(ErrorCodes.UNAUTHORIZED, message, 401, null, ErrorSeverity.MEDIUM, ErrorCategory.CLIENT);

export const createForbiddenError = (message: string = 'Insufficient permissions') =>
  new AppError(ErrorCodes.FORBIDDEN, message, 403, null, ErrorSeverity.MEDIUM, ErrorCategory.CLIENT);

export const createRateLimitError = (retryAfter: number = 60) =>
  new AppError(ErrorCodes.RATE_LIMITED, 'Rate limit exceeded', 429, { retryAfter }, ErrorSeverity.LOW, ErrorCategory.CLIENT);

export const createInternalError = (message: string = 'Internal server error', details?: any) =>
  new AppError(ErrorCodes.INTERNAL_ERROR, message, 500, details, ErrorSeverity.HIGH, ErrorCategory.SERVER);

// Error logging utility
const logError = (error: ExtendedError, requestId: string, req: Request) => {
  const logData = {
    timestamp: new Date().toISOString(),
    requestId,
    error: {
      name: error.name,
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      severity: error.severity,
      category: error.category,
      stack: error.stack,
      details: error.details
    },
    request: {
      method: req.method,
      url: req.url,
      userAgent: req.get('user-agent'),
      ip: req.ip || req.connection.remoteAddress,
      userId: (req as any).user?.id
    }
  };

  // Log based on severity
  switch (error.severity) {
    case ErrorSeverity.CRITICAL:
      console.error('🔴 CRITICAL ERROR:', JSON.stringify(logData, null, 2));
      break;
    case ErrorSeverity.HIGH:
      console.error('🟠 HIGH SEVERITY ERROR:', JSON.stringify(logData, null, 2));
      break;
    case ErrorSeverity.MEDIUM:
      console.warn('🟡 MEDIUM SEVERITY ERROR:', JSON.stringify(logData, null, 2));
      break;
    case ErrorSeverity.LOW:
      console.info('🟢 LOW SEVERITY ERROR:', JSON.stringify(logData, null, 2));
      break;
    default:
      console.error('❓ UNKNOWN SEVERITY ERROR:', JSON.stringify(logData, null, 2));
  }
};

// Main error handling middleware
export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  const requestId = nanoid();
  let error: ExtendedError;

  // Convert different error types to our standardized format
  if (err instanceof AppError) {
    error = err;
  } else if (err instanceof ZodError) {
    error = new AppError(
      ErrorCodes.VALIDATION_ERROR,
      'Invalid input data',
      400,
      err.errors,
      ErrorSeverity.LOW,
      ErrorCategory.VALIDATION
    );
  } else if (err.name === 'UnauthorizedError' || err.status === 401) {
    error = createUnauthorizedError(err.message);
  } else if (err.code === 'EBADCSRFTOKEN') {
    error = createForbiddenError('Invalid CSRF token');
  } else if (err.type === 'entity.too.large') {
    error = createValidationError('Request payload too large');
  } else {
    // Generic error fallback
    error = new AppError(
      ErrorCodes.INTERNAL_ERROR,
      process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
      err.statusCode || err.status || 500,
      process.env.NODE_ENV === 'development' ? { originalError: err.message, stack: err.stack } : undefined,
      ErrorSeverity.HIGH,
      ErrorCategory.SERVER
    );
  }

  // Log the error
  logError(error, requestId, req);

  // Create standardized response
  const response: ApiErrorResponse = {
    error: {
      code: error.code,
      message: error.message,
      timestamp: new Date().toISOString(),
      requestId,
      ...(error.details && { details: error.details }),
      ...(error.code === ErrorCodes.RATE_LIMITED && typeof error.details?.retryAfter === 'number' && { 
        retryAfter: error.details.retryAfter 
      })
    }
  };

  // Set retry-after header for rate limiting
  if (error.code === ErrorCodes.RATE_LIMITED && typeof error.details?.retryAfter === 'number') {
    res.set('Retry-After', String(error.details.retryAfter));
  }

  res.status(error.statusCode || 500).json(response);
};

// Async error wrapper to catch async route handler errors
export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};