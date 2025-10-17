# Production Security Headers Verification

This document describes the security headers implemented in the FXNS application and how to verify them in production.

## Security Headers Implemented

### 1. Content Security Policy (CSP)
**Header:** `Content-Security-Policy`

**Configuration:**
```
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com;
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com;
img-src 'self' data: https:;
connect-src 'self' https://api.stripe.com;
frame-src 'self' https://js.stripe.com https://hooks.stripe.com
```

**Purpose:** Protects against XSS attacks by specifying which sources are allowed to load content.

### 2. X-Frame-Options
**Header:** `X-Frame-Options: DENY`

**Purpose:** Prevents clickjacking attacks by disallowing the page from being embedded in frames.

### 3. X-Content-Type-Options
**Header:** `X-Content-Type-Options: nosniff`

**Purpose:** Prevents MIME type sniffing, reducing exposure to drive-by download attacks.

### 4. Referrer-Policy
**Header:** `Referrer-Policy: strict-origin-when-cross-origin`

**Purpose:** Controls how much referrer information is sent with requests, enhancing user privacy.

### 5. Permissions-Policy
**Header:** `Permissions-Policy: geolocation=(), microphone=(), camera=()`

**Purpose:** Controls which browser features and APIs can be used, blocking unnecessary permissions.

### 6. Strict-Transport-Security (HSTS)
**Header:** `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`

**Purpose:** Forces browsers to use HTTPS, preventing protocol downgrade attacks.
**Note:** Only applied when the connection is secure (HTTPS).

### 7. X-XSS-Protection
**Header:** `X-XSS-Protection: 1; mode=block`

**Purpose:** Enables browser XSS filtering (legacy browsers).

## Implementation Details

### Middleware Application
Security headers are applied via the `securityHeaders` middleware in `server/security-middleware.ts` and registered in `server/routes.ts`:

```typescript
app.use(securityHeaders);
app.use(helmet({
  contentSecurityPolicy: false,  // We use custom CSP
  crossOriginEmbedderPolicy: false
}));
```

### Stripe Integration
The CSP policy includes specific allowances for Stripe integration:
- `script-src` allows `https://js.stripe.com`
- `connect-src` allows `https://api.stripe.com`
- `frame-src` allows `https://js.stripe.com` and `https://hooks.stripe.com`

## Verification Methods

### 1. Automated Testing
Run the security middleware tests:
```bash
npm test -- server/__tests__/security-middleware.test.ts
```

The test suite includes:
- Individual tests for each security header
- A comprehensive production verification test that checks all headers together

### 2. Manual Browser Testing
1. Open browser DevTools (F12)
2. Navigate to the Network tab
3. Load any page from the application
4. Click on the first request (usually the document)
5. Check the Response Headers section

You should see all security headers listed above.

### 3. Command Line Testing (curl)
```bash
# Test production endpoint
curl -I https://www.fxns.ca

# Expected headers in response:
# x-frame-options: DENY
# x-content-type-options: nosniff
# referrer-policy: strict-origin-when-cross-origin
# permissions-policy: geolocation=(), microphone=(), camera=()
# content-security-policy: default-src 'self'; ...
# strict-transport-security: max-age=31536000; includeSubDomains; preload
```

### 4. Online Security Header Scanners
Test your production URL with these tools:
- [Security Headers](https://securityheaders.com/)
- [Mozilla Observatory](https://observatory.mozilla.org/)
- [SSL Labs](https://www.ssllabs.com/ssltest/)

## Troubleshooting

### Headers Not Appearing
1. Ensure middleware is registered before route handlers in `server/routes.ts`
2. Check that the application is running in production mode
3. Verify HTTPS is being used (HSTS only applies to secure connections)

### CSP Violations
If you see CSP errors in the browser console:
1. Check if new external resources have been added
2. Update the CSP policy in `server/security-middleware.ts`
3. Test thoroughly before deploying

### HSTS Not Working
HSTS header is only sent on HTTPS connections:
- Check `req.secure` or `X-Forwarded-Proto` header
- Ensure proxy/load balancer is properly forwarding the protocol

## Compliance

These security headers help meet compliance requirements for:
- OWASP Top 10 security risks
- PCI DSS (for payment processing)
- GDPR (privacy requirements)
- SOC 2 Type II

## Related Files
- Implementation: `server/security-middleware.ts`
- Tests: `server/__tests__/security-middleware.test.ts`
- Application: `server/routes.ts`
