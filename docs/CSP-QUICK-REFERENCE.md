# CSP Quick Reference

## For Developers

### Adding Inline Scripts

❌ **Don't do this:**
```html
<script>
  console.log('This will be blocked by CSP');
</script>
```

✅ **Do this instead:**
1. Move to external file:
```html
<script src="/assets/my-script.js"></script>
```

2. Or ensure nonce is added (handled automatically in our setup)

### Adding Inline Styles

❌ **Don't do this:**
```html
<style>
  .my-class { color: red; }
</style>
```

✅ **Do this instead:**
1. Use external stylesheet:
```html
<link rel="stylesheet" href="/assets/styles.css">
```

2. Use React inline styles (these work with CSP):
```tsx
<div style={{ color: 'red' }}>Text</div>
```

### Adding Third-Party Scripts

To add a new third-party script (e.g., analytics):

1. Update CSP in `server/security-middleware.ts`:
```typescript
"script-src 'self' 'nonce-${nonce}' https://js.stripe.com https://analytics.example.com"
```

2. Add the script tag in HTML:
```html
<script src="https://analytics.example.com/tracker.js"></script>
```

### Dynamic Style Injection

❌ **Don't do this:**
```typescript
const style = document.createElement('style');
document.head.appendChild(style);
style.sheet.insertRule('.my-class { color: red; }');
```

✅ **Do this instead:**
```typescript
import { createStyleElement } from '@/utils/safe-style-insert';

const style = createStyleElement('.my-class { color: red; }', 'my-styles');
```

### Loading External Images

Images from any HTTPS source are allowed:
```tsx
<img src="https://example.com/image.jpg" alt="Example" />
```

### Making API Calls

Only calls to same origin and approved domains are allowed:

✅ **Allowed:**
```typescript
fetch('/api/data'); // Same origin
fetch('https://api.stripe.com/v1/...'); // Approved domain
```

❌ **Blocked:**
```typescript
fetch('https://random-api.com/data'); // Not in CSP
```

To allow a new API:
1. Update `connect-src` in `server/security-middleware.ts`

### Embedding Iframes

Only approved domains can be embedded:

✅ **Allowed:**
```tsx
<iframe src="https://js.stripe.com/..." /> {/* Stripe Elements */}
```

❌ **Blocked:**
```tsx
<iframe src="https://youtube.com/embed/..." /> {/* Not in CSP */}
```

To allow embedding:
1. Update `frame-src` in `server/security-middleware.ts`

## Common CSP Errors

### "Refused to execute inline script because it violates CSP"

**Fix:** Use external script file or ensure nonce is properly injected

### "Refused to load the stylesheet because it violates CSP"

**Fix:** Add the stylesheet origin to `style-src` directive

### "Refused to connect to 'X' because it violates CSP"

**Fix:** Add the API endpoint to `connect-src` directive

### "Refused to frame 'X' because it violates CSP"

**Fix:** Add the iframe source to `frame-src` directive

## Testing Your Changes

1. **Build the app:**
   ```bash
   npm run build
   ```

2. **Start the server:**
   ```bash
   npm start
   ```

3. **Open DevTools Console:**
   - Check for red CSP violation errors
   - Navigate through all pages

4. **Test in different browsers:**
   - Chrome/Edge
   - Firefox
   - Safari

## Need Help?

- Check the full [CSP Implementation Guide](./CSP-IMPLEMENTATION.md)
- Review [MDN CSP Documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- Ask in team chat/Slack

## CSP Violation Examples

### Before Fix
```
Refused to execute inline script because it violates the following 
Content Security Policy directive: "script-src 'self' 'nonce-abc123...'".
Either the 'unsafe-inline' keyword, a hash ('sha256-...'), or a nonce 
('nonce-...') is required to enable inline execution.
```

### After Fix
No CSP errors in console ✅
