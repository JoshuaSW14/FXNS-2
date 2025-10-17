# Content Security Policy (CSP) Implementation Guide

## Overview

This application implements a comprehensive Content Security Policy (CSP) to prevent Cross-Site Scripting (XSS) attacks and other code injection vulnerabilities. The CSP is configured to work with modern frameworks (React, Vite) and third-party services (Stripe).

## CSP Headers

The CSP headers are set in `server/security-middleware.ts` through the `securityHeaders` middleware function.

### Current CSP Configuration

```typescript
const csp = [
  "default-src 'self'",
  "script-src 'self' 'nonce-{random}' https://js.stripe.com https://m.stripe.network",
  "style-src 'self' 'nonce-{random}' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: https:",
  "connect-src 'self' https://api.stripe.com https://m.stripe.network",
  "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://m.stripe.network",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'"
].join('; ');
```

### Directive Explanations

- **`default-src 'self'`**: Default policy - only load resources from same origin
- **`script-src`**: Scripts can be loaded from:
  - Same origin (`'self'`)
  - Inline scripts with matching nonce (`'nonce-{random}'`)
  - Stripe JavaScript SDK (`https://js.stripe.com`)
  - Stripe monitoring (`https://m.stripe.network`)
- **`style-src`**: Styles can be loaded from:
  - Same origin (`'self'`)
  - Inline styles with matching nonce (`'nonce-{random}'`)
  - Inline styles without nonce (`'unsafe-inline'`) - fallback for older browsers
  - Google Fonts (`https://fonts.googleapis.com`)
- **`font-src`**: Fonts can be loaded from:
  - Same origin (`'self'`)
  - Data URIs (`data:`)
  - Google Fonts CDN (`https://fonts.gstatic.com`)
- **`img-src`**: Images can be loaded from:
  - Same origin (`'self'`)
  - Data URIs (`data:`)
  - Any HTTPS source (`https:`)
- **`connect-src`**: AJAX/fetch requests can be made to:
  - Same origin (`'self'`)
  - Stripe API (`https://api.stripe.com`)
  - Stripe monitoring (`https://m.stripe.network`)
- **`frame-src`**: Iframes can be embedded from:
  - Same origin (`'self'`)
  - Stripe Elements (`https://js.stripe.com`)
  - Stripe Connect onboarding (`https://hooks.stripe.com`)
  - Stripe monitoring (`https://m.stripe.network`)
- **`object-src 'none'`**: No plugins (Flash, Java, etc.) allowed
- **`base-uri 'self'`**: Base tag can only use same origin
- **`frame-ancestors 'none'`**: This page cannot be embedded in iframes (clickjacking protection)

## Nonce Implementation

### What is a Nonce?

A nonce (number used once) is a cryptographically random value generated per request. It allows specific inline scripts and styles while blocking others.

### How It Works

1. **Server generates nonce**: The `withNonce` middleware generates a unique nonce for each request
   ```typescript
   const nonce = crypto.randomBytes(16).toString('base64');
   res.locals.cspNonce = nonce;
   ```

2. **CSP header includes nonce**: The nonce is embedded in the CSP header
   ```typescript
   `script-src 'self' 'nonce-${nonce}' ...`
   ```

3. **HTML includes nonce**: Server injects the nonce into script/style tags
   ```html
   <script nonce="abc123..." src="/assets/index.js"></script>
   ```

### Implementation Details

**Development Mode** (`server/vite.ts`):
```typescript
// In development, Vite transforms HTML
const nonce = (res.locals as any).cspNonce;
if (nonce) {
  html = html.replace(
    '<script type="module" src="/src/main.tsx',
    `<script type="module" nonce="${nonce}" src="/src/main.tsx`
  );
}
```

**Production Mode** (`server/vite.ts`):
```typescript
// In production, inject nonce into all script tags
const nonce = (res.locals as any).cspNonce;
if (nonce) {
  html = html.replace(/<script /g, `<script nonce="${nonce}" `);
  html = html.replace(/<style>/g, `<style nonce="${nonce}">`);
}
```

## FOUC Prevention

Flash of Unstyled Content (FOUC) is prevented by:

1. **CSS preloading**: The main CSS file is preloaded in the HTML head
   ```html
   <link rel="preload" href="/assets/index.css" as="style">
   <link rel="stylesheet" href="/assets/index.css">
   ```

2. **Critical CSS in head**: All styles are loaded before body renders
3. **No JS-dependent layout**: Layout doesn't depend on JavaScript execution

## Safe Style Insertion

For dynamic style injection, use the `safeInsertRule` utility (`client/src/utils/safe-style-insert.ts`):

```typescript
import { safeInsertRule, createStyleElement } from '@/utils/safe-style-insert';

// Safely insert a rule into an existing style element
const styleEl = document.getElementById('my-styles') as HTMLStyleElement;
safeInsertRule(styleEl, '.my-class { color: red; }');

// Or create a new style element with a rule
const newStyle = createStyleElement('.dynamic { display: none; }', 'dynamic-styles');
```

This utility:
- Waits for the stylesheet to be ready before inserting rules
- Falls back to text content if insertRule fails
- Handles browser compatibility issues

## Stripe Integration

Stripe requires specific CSP allowances:

- **`script-src`**: `https://js.stripe.com` for Stripe.js SDK
- **`connect-src`**: `https://api.stripe.com` for API calls
- **`frame-src`**: `https://js.stripe.com` for Stripe Elements iframes
- **`frame-src`**: `https://hooks.stripe.com` for Connect onboarding
- **Monitoring**: `https://m.stripe.network` in script-src, connect-src, and frame-src

### Stripe Cookie Notes

Stripe may set "Partitioned" cookies via `m.stripe.network`. This is informational and expected behavior - no action needed.

## Testing CSP

### Manual Testing

1. Open DevTools Console
2. Navigate to each route: `/`, `/explore`, `/tools`, `/workflows`, `/dashboard`, `/settings`
3. Check for CSP violations (red errors with "CSP" in the message)
4. Verify no FOUC (page should look styled immediately)
5. Test Stripe functionality (payment forms, subscriptions)

### Automated Testing

Create a test script to verify CSP headers:

```javascript
// scripts/verify-security-headers.js
const response = await fetch('https://yourapp.com');
const csp = response.headers.get('content-security-policy');
console.log('CSP:', csp);
// Verify nonce is present and unique
```

### Using Lighthouse

1. Open DevTools > Lighthouse
2. Run audit for Performance and Best Practices
3. Check CSP configuration
4. Verify no layout shifts (CLS score)

## Troubleshooting

### Issue: "Refused to execute inline script"

**Cause**: Inline script without nonce or not allowed by CSP

**Solution**: 
1. Move script to external file, OR
2. Ensure nonce is properly injected into the script tag

### Issue: "Refused to load stylesheet"

**Cause**: Stylesheet from disallowed origin

**Solution**: Add the origin to `style-src` directive

### Issue: "Refused to connect to..."

**Cause**: AJAX/fetch request to disallowed origin

**Solution**: Add the origin to `connect-src` directive

### Issue: FOUC on page load

**Cause**: CSS loading after initial render

**Solution**:
1. Verify CSS preload link is in HTML head
2. Check network tab - CSS should load before first paint
3. Ensure critical CSS is not lazy-loaded

### Issue: insertRule errors

**Cause**: Trying to insert rules before stylesheet is ready

**Solution**: Use `safeInsertRule` utility instead of direct `insertRule` calls

## Maintenance

### Adding New External Services

When adding a new external service (e.g., analytics, payments):

1. Identify required CSP directives (check service documentation)
2. Update `server/security-middleware.ts`
3. Test thoroughly in development
4. Deploy to staging and verify in production-like environment

### Monitoring CSP Violations

Consider implementing CSP reporting:

```typescript
// Add to CSP header
"report-uri /api/csp-report"
// Or use report-to directive with Reporting API
```

Then create an endpoint to log violations:

```typescript
app.post('/api/csp-report', express.json({ type: 'application/csp-report' }), (req, res) => {
  console.error('CSP Violation:', req.body);
  res.status(204).end();
});
```

## Best Practices

1. **Never use `'unsafe-eval'`**: Blocks unsafe dynamic code execution
2. **Minimize `'unsafe-inline'`**: Use nonces instead
3. **Be specific**: Prefer exact domains over wildcards
4. **Test thoroughly**: CSP violations can break functionality silently
5. **Monitor violations**: Set up CSP reporting in production
6. **Keep allowlist minimal**: Only add necessary domains
7. **Use HTTPS**: CSP works best with secure connections

## References

- [MDN: Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [CSP Evaluator](https://csp-evaluator.withgoogle.com/)
- [Stripe CSP Documentation](https://stripe.com/docs/security/guide#content-security-policy)
- [OWASP CSP Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)
