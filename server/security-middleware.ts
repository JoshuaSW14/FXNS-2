import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';
import crypto from 'crypto';

// Nonce middleware - generates a unique nonce per request for CSP
export function withNonce(req: Request, res: Response, next: NextFunction) {
  const nonce = crypto.randomBytes(16).toString('base64');
  (res.locals as any).cspNonce = nonce;
  next();
}

// Enhanced rate limiting configurations
export const rateLimiters = {
  // Authentication endpoints - very strict
  auth: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    message: { error: 'Too many authentication attempts, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      // Rate limit by IP and potentially by user email if provided
      const identifier = req.body?.email || ipKeyGenerator(req.ip || '127.0.0.1');
      return `auth:${identifier}`;
    }
  }),

  // API integration endpoints - moderate limits
  apiIntegration: rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 20, // 20 requests per window
    message: { error: 'API integration rate limit exceeded.' },
    keyGenerator: (req) => `api:${req.user?.id || ipKeyGenerator(req.ip || '127.0.0.1')}`
  }),

  // AI features - strict due to cost
  ai: rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 10, // 10 AI requests per window
    message: { error: 'AI feature rate limit exceeded.' },
    keyGenerator: (req) => `ai:${req.user?.id || ipKeyGenerator(req.ip || '127.0.0.1')}`
  }),

  // Tool execution - moderate
  toolExecution: rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30, // 30 executions per minute
    message: { error: 'Tool execution rate limit exceeded.' },
    keyGenerator: (req) => `tool:${req.user?.id || ipKeyGenerator(req.ip || '127.0.0.1')}`
  }),

  // General API - liberal
  general: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: { error: 'Rate limit exceeded.' },
    keyGenerator: (req) => `general:${req.user?.id || ipKeyGenerator(req.ip || '127.0.0.1')}`
  }),

  // File uploads - strict
  upload: rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 5, // 5 uploads per window
    message: { error: 'File upload rate limit exceeded.' },
    keyGenerator: (req) => `upload:${req.user?.id || ipKeyGenerator(req.ip || '127.0.0.1')}`
  })
};

// Enhanced CSRF protection
export function enhancedCSRFProtection(req: Request, res: Response, next: NextFunction) {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }

  const requestedWith = req.get('X-Requested-With');
  const origin = req.get('Origin');
  const referer = req.get('Referer');

  // Check for required headers
  if (!requestedWith || (requestedWith !== 'XMLHttpRequest' && requestedWith !== 'fetch')) {
    return res.status(403).json({ 
      error: 'CSRF protection: Missing or invalid X-Requested-With header' 
    });
  }

  // Validate origin/referer for additional protection
  if (origin || referer) {
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'https://localhost:5000',
      'http://localhost:5000', 'http://127.0.0.1:5000', 'http://127.0.0.1:5001', 'http://localhost:5001', 'https://localhost:5001',
      'https://localhost:5000', 'http://localhost:4200', 'https://localhost:4200', 
      'https://fxns.ca', 'https://www.fxns.ca'
    ];
    //TODO: Clean up allowed origins list

    const requestOrigin = origin || (referer ? new URL(referer).origin : null);
    if (requestOrigin && !allowedOrigins.includes(requestOrigin)) {
      return res.status(403).json({ 
        error: 'CSRF protection: Invalid origin' 
      });
    }
  }

  next();
}

// Input sanitization middleware
export function sanitizeInput(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate and sanitize request body
      if (req.body) {
        req.body = schema.parse(req.body);
      }
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Invalid input data',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      }
      next(error);
    }
  };
}

// SQL injection protection for search queries
export function sanitizeSearchQuery(query: string): string {
  if (typeof query !== 'string') return '';
  
  // Remove potentially dangerous characters and limit length
  return query
    .replace(/['"\\;]/g, '') // Remove quotes and semicolons
    .replace(/--/g, '') // Remove SQL comments
    .replace(/\/\*/g, '') // Remove block comment start
    .replace(/\*\//g, '') // Remove block comment end
    .trim()
    .slice(0, 100); // Limit length
}

// XSS protection for user content using DOMPurify
export function sanitizeUserContent(content: string): string {
  if (typeof content !== 'string') return '';
  
  // Use DOMPurify for robust XSS protection
  // Allows safe HTML tags while removing all potentially dangerous content
  return DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a', 'code', 'pre', 'blockquote'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    ALLOW_DATA_ATTR: false,
  }).trim();
}

// Request size limitation
export function requestSizeLimit(maxSizeKB: number = 100) {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.get('Content-Length') || '0');
    const maxSizeBytes = maxSizeKB * 1024;
    
    if (contentLength > maxSizeBytes) {
      return res.status(413).json({
        error: `Request too large. Maximum size: ${maxSizeKB}KB`
      });
    }
    
    next();
  };
}

// IP whitelist/blacklist middleware
export function ipFilter(options: {
  whitelist?: string[];
  blacklist?: string[];
}) {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientIP = req.ip || req.connection.remoteAddress;
    
    if (!clientIP) {
      return res.status(400).json({ error: 'Unable to determine client IP' });
    }
    
    // Check blacklist first
    if (options.blacklist && options.blacklist.includes(clientIP)) {
      return res.status(403).json({ error: 'Access denied from this IP' });
    }
    
    // Check whitelist if provided
    if (options.whitelist && !options.whitelist.includes(clientIP)) {
      return res.status(403).json({ error: 'IP not in whitelist' });
    }
    
    next();
  };
}

// HTTP to HTTPS redirect middleware
export function httpsRedirect(req: Request, res: Response, next: NextFunction) {
  // Skip redirect in development if DEV_SSL is false or for localhost HTTP requests
  const isProd = process.env.NODE_ENV === 'production';
  const devSsl = process.env.DEV_SSL !== 'false';
  
  // Only redirect in production or when DEV_SSL is explicitly enabled
  if (isProd || devSsl) {
    // Check if the request is not secure
    const isSecure = req.secure || req.get('X-Forwarded-Proto') === 'https';
    
    if (!isSecure) {
      // Build the HTTPS URL
      const host = req.get('host') || 'localhost';
      const httpsUrl = `https://${host}${req.originalUrl}`;
      
      // Perform 301 redirect to HTTPS
      return res.redirect(301, httpsUrl);
    }
  }
  
  next();
}

// Security headers middleware (enhanced helmet alternative)
export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  const nonce = (res.locals as any).cspNonce;

  // Set comprehensive security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // HSTS for HTTPS
  if (req.secure || req.get('X-Forwarded-Proto') === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  
  // Content Security Policy for XSS protection with nonce support
  const csp = [
    "default-src 'self'",
    
    // script-src: 'self' for our scripts, nonce for inline scripts, Stripe domains
    // https://js.stripe.com - Stripe.js SDK
    // https://m.stripe.network - Stripe monitoring and analytics
    `script-src 'self' 'nonce-${nonce}' https://js.stripe.com https://m.stripe.network`,
    
    // style-src: 'nonce-<value>' for inline styles we control, Google Fonts
    // 'unsafe-inline' as fallback for older browsers that don't support nonces
    `style-src 'self' 'nonce-${nonce}' 'unsafe-inline' https://fonts.googleapis.com`,
    
    // font-src: Google Fonts and data URIs
    "font-src 'self' data: https://fonts.gstatic.com",
    
    // img-src: Allow all HTTPS images and data URIs (for tool icons, avatars, etc.)
    "img-src 'self' data: https:",
    
    // connect-src: API endpoints including Stripe API for payment processing
    // https://api.stripe.com - Required for Stripe payment processing
    // https://m.stripe.network - Stripe monitoring and analytics
    "connect-src 'self' https://api.stripe.com https://m.stripe.network",
    
    // frame-src: Required for Stripe Elements (payment forms) and Connect onboarding
    // https://js.stripe.com - Stripe Elements iframe
    // https://hooks.stripe.com - Stripe Connect onboarding iframe
    // https://m.stripe.network - Stripe monitoring
    "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://m.stripe.network",
    
    // Additional security directives
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'self'"
  ].join('; ');
  
  res.setHeader('Content-Security-Policy', csp);
  
  next();
}

// Audit logging for sensitive operations
export function auditLog(operation: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const auditData = {
      timestamp: new Date().toISOString(),
      operation,
      userId: (req as any).user?.id,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      method: req.method,
      path: req.path,
      query: req.query,
      sessionId: (req as any).sessionID
    };
    
    // Store original end method
    const originalEnd = res.end;
    
    res.end = function(chunk?: any, encoding?: any) {
      // Log the operation result
      console.log('🔒 AUDIT LOG:', JSON.stringify({
        ...auditData,
        statusCode: res.statusCode,
        duration: Date.now() - new Date(auditData.timestamp).getTime()
      }));
      
      return originalEnd.call(this, chunk, encoding);
    };
    
    next();
  };
}