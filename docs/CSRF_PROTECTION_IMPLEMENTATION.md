# Global CSRF Header Enforcement - Implementation Summary

## Overview
This document summarizes the changes made to ensure enhanced CSRF middleware is globally applied to all state-changing routes with X-Requested-With header checks.

## Changes Made

### 1. Added X-Requested-With to CORS Headers
**File:** `FXNS/server/routes.ts`
- Added `"X-Requested-With"` to the `allowedHeaders` array in CORS configuration (line 585)
- This allows the browser to send the X-Requested-With header with cross-origin requests

### 2. Removed Redundant Local CSRF Middleware
**File:** `FXNS/server/subscription-routes.ts`
- Removed the local `requireCSRFHeader` middleware function (previously lines 14-24)
- Removed `requireCSRFHeader` from 4 route handlers:
  - `/upgrade` (POST)
  - `/cancel` (POST)
  - `/resume` (POST)
  - `/create-portal-session` (POST)
- Added comment explaining that CSRF protection is now handled globally

**Rationale:** The global `enhancedCSRFProtection` middleware already provides CSRF protection for all routes registered after line 675 in `routes.ts`. Having a local middleware was redundant and could lead to inconsistencies.

### 3. Separated Public Webhook Endpoints
**File:** `FXNS/server/api-integration-routes.ts`
- Created a new `publicWebhookRouter` for public webhook endpoints
- Moved the `/webhooks/*` route to the public router
- Exported `publicWebhookRouter` separately from the default router

**File:** `FXNS/server/routes.ts`
- Imported `publicWebhookRouter` from `api-integration-routes.ts`
- Registered `publicWebhookRouter` BEFORE the global CSRF protection (line 672)
- This ensures external webhooks (which don't send X-Requested-With headers) can still reach the endpoint

### 4. Comprehensive Test Coverage
Created two comprehensive test suites:

**File:** `FXNS/tests/csrf-protection.test.ts`
- 24 tests covering CSRF middleware behavior
- Tests for all HTTP methods (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS)
- Tests for valid X-Requested-With values (XMLHttpRequest, fetch)
- Tests for invalid X-Requested-With values
- Tests for origin/referer validation
- Edge case testing

**File:** `FXNS/tests/global-csrf-integration.test.ts`
- 11 integration tests covering the complete route structure
- Tests that webhook endpoints bypass CSRF protection
- Tests that protected routes require X-Requested-With header
- Tests mixed endpoint scenarios

**Test Results:** All 35 new tests pass ✓

## Architecture

### CSRF Protection Flow
```
1. HTTP to HTTPS redirect
2. Performance monitoring
3. Security headers
4. Helmet (CSP disabled)
5. CORS configuration (with X-Requested-With in allowedHeaders)
6. Rate limiting
7. Authentication routes
8. ⚠️ WEBHOOK ENDPOINTS (before CSRF) ⚠️
   - /api/stripe/webhook
   - /api/integrations/webhooks/*
9. 🛡️ GLOBAL CSRF PROTECTION 🛡️ (line 675)
10. 🔒 ALL OTHER ROUTES (protected by CSRF) 🔒
    - /api/subscription/*
    - /api/tool-builder/*
    - /api/integrations/* (except webhooks)
    - /api/payouts/*
    - /api/tags/*
    - /api/billing/*
    - /api/* (all other routes)
```

### CSRF Protection Rules
The `enhancedCSRFProtection` middleware enforces:

1. **Safe methods bypass CSRF:** GET, HEAD, OPTIONS requests are allowed without checks
2. **X-Requested-With required:** All state-changing methods (POST, PUT, PATCH, DELETE) must include:
   - `X-Requested-With: XMLHttpRequest` OR
   - `X-Requested-With: fetch`
3. **Origin validation:** If Origin or Referer headers are present, they must match allowed origins:
   - localhost variants (5000, 5001, 4200)
   - 127.0.0.1 variants
   - fxns.ca
   - www.fxns.ca
   - Environment-configured FRONTEND_URL

### Webhook Exemptions
Two types of webhook endpoints are exempt from CSRF protection:

1. **Stripe webhooks** (`/api/stripe/webhook`)
   - External webhooks from Stripe
   - Protected by signature verification

2. **API Integration webhooks** (`/api/integrations/webhooks/*`)
   - User-created webhook endpoints for external services
   - Protected by optional signature verification
   - Registered before CSRF middleware to accept external requests

## Security Benefits

1. **Global Protection:** All state-changing routes are automatically protected without needing to remember to add middleware
2. **Consistent Enforcement:** One central implementation reduces the risk of inconsistencies
3. **Defense in Depth:** Multiple layers of protection:
   - X-Requested-With header check
   - Origin/Referer validation
   - Rate limiting
   - Authentication requirements
4. **Webhook Security:** Public webhooks use signature verification instead of CSRF tokens

## Migration Notes

### For Developers
- All new state-changing routes (POST/PUT/PATCH/DELETE) are automatically protected
- Frontend requests must include `X-Requested-With` header
- GET requests don't need the header

### Frontend Requirements
All state-changing API calls must include:
```javascript
fetch('/api/endpoint', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest' // or 'fetch'
  },
  body: JSON.stringify(data)
})
```

Or with axios:
```javascript
axios.post('/api/endpoint', data, {
  headers: {
    'X-Requested-With': 'XMLHttpRequest'
  }
})
```

## Verification

Run the test suite to verify CSRF protection:
```bash
npm run test:run
```

Expected results:
- `tests/csrf-protection.test.ts`: 24 tests ✓
- `tests/global-csrf-integration.test.ts`: 11 tests ✓

## Future Improvements

1. Consider adding CSRF token generation for additional security
2. Add metrics/monitoring for CSRF violations
3. Consider adding a whitelist for specific routes that should bypass CSRF
4. Add integration tests with actual frontend components
