# Session Cookie Domain Unification - Implementation Guide

## Problem Statement

The application was experiencing session drops when users switched between `fxns.ca` and `www.fxns.ca` because session cookies were scoped to the specific subdomain they were set on. This resulted in users losing their authentication state when navigating between the two domains.

## Solution

This implementation addresses the issue by:

1. **Setting Cookie Domain to Apex Domain**: The session cookie domain is now set to `.fxns.ca` (with leading dot) in production, which makes the cookie available across all subdomains including both `fxns.ca` and `www.fxns.ca`.

2. **301 Permanent Redirect**: Added middleware to redirect all traffic from `fxns.ca` to `www.fxns.ca` with a 301 (permanent redirect) status code. This ensures consistency and helps with SEO.

## Changes Made

### 1. Session Cookie Configuration (`server/auth.ts`)

```typescript
cookie: {
  httpOnly: true,
  secure: true,
  sameSite: "lax",
  maxAge: 1000 * 60 * 60 * 24 * 7,
  domain: process.env.NODE_ENV === "production" ? ".fxns.ca" : undefined,
}
```

**Why the leading dot?**
- `.fxns.ca` - Cookie available on `fxns.ca`, `www.fxns.ca`, and all other subdomains
- `fxns.ca` - Cookie only available on `fxns.ca` (no subdomains)
- `undefined` - Cookie scoped to the exact domain that set it (default behavior, used in dev)

### 2. Cookie Clearing Updates (`server/auth.ts`)

Updated all `clearCookie` calls to:
- Use the correct cookie name (`fxns.sid` instead of `connect.sid`)
- Include the domain parameter to ensure proper cookie deletion

```typescript
res.clearCookie("fxns.sid", {
  domain: process.env.NODE_ENV === "production" ? ".fxns.ca" : undefined,
});
```

### 3. Domain Redirect Middleware (`server/index.ts`)

Added middleware at the beginning of the request pipeline:

```typescript
app.use((req, res, next) => {
  if (process.env.NODE_ENV === "production") {
    const host = req.get("host");
    // Redirect fxns.ca to www.fxns.ca (301 permanent redirect)
    if (host === "fxns.ca") {
      const protocol = req.secure ? "https" : "http";
      return res.redirect(301, `${protocol}://www.fxns.ca${req.originalUrl}`);
    }
  }
  next();
});
```

**Key Points:**
- Only runs in production (development can use any domain)
- Preserves the original URL path and query parameters
- Uses 301 status code (permanent redirect) for SEO benefits
- Respects the protocol (http/https) from the original request

### 4. Test Updates

Updated existing auth integration tests to check for the correct cookie name:
- Changed `connect.sid` references to `fxns.sid`

Added new comprehensive tests (`tests/domain-redirect.test.ts`):
- Verifies 301 redirect from `fxns.ca` to `www.fxns.ca`
- Ensures query parameters are preserved
- Confirms no redirect occurs for `www.fxns.ca`
- Validates development mode behavior (no redirect)
- Tests HTTPS protocol handling
- Verifies cookie domain configuration

## Benefits

1. **Session Persistence**: Users maintain their session when switching between `fxns.ca` and `www.fxns.ca`
2. **SEO Improvement**: 301 redirects consolidate link equity to the canonical domain
3. **Consistent User Experience**: All users land on the same domain (`www.fxns.ca`)
4. **Security**: Maintains secure cookie settings (httpOnly, secure, sameSite)
5. **Development Friendly**: No impact on local development environments

## Environment Behavior

### Production (`NODE_ENV === "production"`)
- Cookie domain: `.fxns.ca` (works across subdomains)
- Redirect: `fxns.ca` → `www.fxns.ca` (301 permanent)

### Development/Testing
- Cookie domain: `undefined` (scoped to exact domain)
- Redirect: Disabled (allows testing on localhost, etc.)

## Testing

Run the test suite to verify the implementation:

```bash
# Run all tests
npm test

# Run domain redirect tests specifically
npm test -- tests/domain-redirect.test.ts

# Run auth integration tests
npm test -- server/__tests__/auth-integration.test.ts
```

## Deployment Notes

1. **DNS Configuration**: Ensure both `fxns.ca` and `www.fxns.ca` point to the application
2. **SSL Certificates**: Both domains should be covered by the SSL certificate
3. **Monitoring**: Watch for any issues with session persistence after deployment
4. **Rollback Plan**: If issues occur, remove the `domain` property from cookie configuration

## Related Files

- `FXNS/server/auth.ts` - Session configuration and auth routes
- `FXNS/server/index.ts` - Domain redirect middleware
- `FXNS/server/__tests__/auth-integration.test.ts` - Auth tests
- `FXNS/tests/domain-redirect.test.ts` - Domain redirect tests

## References

- [Express Session Documentation](https://github.com/expressjs/session)
- [HTTP Cookies - MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies)
- [301 Redirect Best Practices](https://developers.google.com/search/docs/crawling-indexing/301-redirects)
