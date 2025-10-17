import { describe, it, expect, beforeEach } from 'vitest';
import express, { Request, Response, NextFunction } from 'express';
import request from 'supertest';
import { httpsRedirect, securityHeaders, withNonce } from '../security-middleware';

describe('Security Middleware Tests', () => {
  describe('HTTPS Redirect Middleware', () => {
    let app: express.Application;

    beforeEach(() => {
      app = express();
    });

    it('should redirect HTTP to HTTPS with 301 status in production', async () => {
      process.env.NODE_ENV = 'production';
      
      app.use(httpsRedirect);
      app.get('/test', (req, res) => {
        res.json({ message: 'success' });
      });

      const response = await request(app)
        .get('/test')
        .expect(301);

      expect(response.headers.location).toMatch(/^https:\/\//);
      expect(response.headers.location).toContain('/test');
    });

    it('should allow HTTPS requests to pass through', async () => {
      process.env.NODE_ENV = 'production';
      
      app.use(httpsRedirect);
      app.get('/test', (req, res) => {
        res.json({ message: 'success' });
      });

      const response = await request(app)
        .get('/test')
        .set('X-Forwarded-Proto', 'https')
        .expect(200);

      expect(response.body.message).toBe('success');
    });

    it('should respect X-Forwarded-Proto header', async () => {
      process.env.NODE_ENV = 'production';
      
      app.use(httpsRedirect);
      app.get('/test', (req, res) => {
        res.json({ message: 'success' });
      });

      const response = await request(app)
        .get('/test')
        .set('X-Forwarded-Proto', 'https')
        .expect(200);

      expect(response.body.message).toBe('success');
    });

    it('should not redirect in development when DEV_SSL is false', async () => {
      process.env.NODE_ENV = 'development';
      process.env.DEV_SSL = 'false';
      
      app.use(httpsRedirect);
      app.get('/test', (req, res) => {
        res.json({ message: 'success' });
      });

      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.body.message).toBe('success');
    });
  });

  describe('Nonce Generation Middleware', () => {
    let app: express.Application;

    beforeEach(() => {
      app = express();
      app.use(withNonce);
      app.get('/test', (req, res) => {
        const nonce = (res.locals as any).cspNonce;
        res.json({ nonce });
      });
    });

    it('should generate a nonce for each request', async () => {
      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.body.nonce).toBeDefined();
      expect(typeof response.body.nonce).toBe('string');
      expect(response.body.nonce.length).toBeGreaterThan(0);
    });

    it('should generate different nonces for different requests', async () => {
      const response1 = await request(app)
        .get('/test')
        .expect(200);

      const response2 = await request(app)
        .get('/test')
        .expect(200);

      expect(response1.body.nonce).not.toBe(response2.body.nonce);
    });

    it('should generate cryptographically secure nonces', async () => {
      const response = await request(app)
        .get('/test')
        .expect(200);

      // Base64 string should be at least 16 bytes (22 base64 characters)
      expect(response.body.nonce.length).toBeGreaterThanOrEqual(22);
      // Should be valid base64
      expect(/^[A-Za-z0-9+/=]+$/.test(response.body.nonce)).toBe(true);
    });
  });

  describe('Security Headers Middleware', () => {
    let app: express.Application;

    beforeEach(() => {
      app = express();
      app.use(withNonce); // Add nonce middleware before security headers
      app.use(securityHeaders);
      app.get('/test', (req, res) => {
        res.json({ message: 'success' });
      });
    });

    it('should set HSTS header with preload for HTTPS requests', async () => {
      const response = await request(app)
        .get('/test')
        .set('X-Forwarded-Proto', 'https')
        .expect(200);

      expect(response.headers['strict-transport-security']).toBe(
        'max-age=31536000; includeSubDomains; preload'
      );
    });

    it('should set HSTS header when X-Forwarded-Proto is https', async () => {
      const response = await request(app)
        .get('/test')
        .set('X-Forwarded-Proto', 'https')
        .expect(200);

      expect(response.headers['strict-transport-security']).toBe(
        'max-age=31536000; includeSubDomains; preload'
      );
    });

    it('should not set HSTS header for HTTP requests', async () => {
      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.headers['strict-transport-security']).toBeUndefined();
    });

    it('should set X-Content-Type-Options header', async () => {
      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    it('should set X-Frame-Options header', async () => {
      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.headers['x-frame-options']).toBe('DENY');
    });

    it('should set Referrer-Policy header', async () => {
      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    });

    it('should set Permissions-Policy header', async () => {
      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.headers['permissions-policy']).toBe('geolocation=(), microphone=(), camera=()');
    });

    it('should set Content-Security-Policy header with nonce', async () => {
      const response = await request(app)
        .get('/test')
        .expect(200);

      const csp = response.headers['content-security-policy'];
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain('https://js.stripe.com');
      expect(csp).toContain("'nonce-"); // Should include nonce
    });

    it('should include Stripe domains in CSP for payment processing', async () => {
      const response = await request(app)
        .get('/test')
        .expect(200);

      const csp = response.headers['content-security-policy'];
      
      // Verify Stripe.js can be loaded
      expect(csp).toContain('script-src');
      expect(csp).toContain('https://js.stripe.com');
      expect(csp).toContain('https://m.stripe.network');
      
      // Verify Stripe API can be called
      expect(csp).toContain('connect-src');
      expect(csp).toContain('https://api.stripe.com');
      expect(csp).toContain('https://m.stripe.network');
      
      // Verify Stripe iframes can be embedded
      expect(csp).toContain('frame-src');
      expect(csp).toContain('https://js.stripe.com');
      expect(csp).toContain('https://hooks.stripe.com');
      expect(csp).toContain('https://m.stripe.network');
    });

    it('should NOT include unsafe-eval in CSP', async () => {
      const response = await request(app)
        .get('/test')
        .expect(200);

      const csp = response.headers['content-security-policy'];
      expect(csp).not.toContain('unsafe-eval');
    });

    it('should include necessary directives for fonts', async () => {
      const response = await request(app)
        .get('/test')
        .expect(200);

      const csp = response.headers['content-security-policy'];
      
      // Verify Google Fonts stylesheets can be loaded
      expect(csp).toContain('style-src');
      expect(csp).toContain('https://fonts.googleapis.com');
      
      // Verify Google Fonts files can be loaded
      expect(csp).toContain('font-src');
      expect(csp).toContain('https://fonts.gstatic.com');
    });

    it('should include security directives for frame and base', async () => {
      const response = await request(app)
        .get('/test')
        .expect(200);

      const csp = response.headers['content-security-policy'];
      
      // Verify base-uri is restricted
      expect(csp).toContain("base-uri 'self'");
      
      // Verify frame-ancestors is restricted
      expect(csp).toContain("frame-ancestors 'none'");
      
      // Verify object-src is restricted
      expect(csp).toContain("object-src 'none'");
    });

    it('should use nonce for script-src and style-src', async () => {
      const response = await request(app)
        .get('/test')
        .expect(200);

      const csp = response.headers['content-security-policy'];
      
      // Both script-src and style-src should include nonce
      expect(csp).toMatch(/script-src[^;]*'nonce-[A-Za-z0-9+/=]+'/);
      expect(csp).toMatch(/style-src[^;]*'nonce-[A-Za-z0-9+/=]+'/);
    });

    it('should include unsafe-inline as fallback in style-src for older browsers', async () => {
      const response = await request(app)
        .get('/test')
        .expect(200);

      const csp = response.headers['content-security-policy'];
      
      // style-src should include 'unsafe-inline' as fallback
      expect(csp).toMatch(/style-src[^;]*'unsafe-inline'/);
    });

    it('should NOT include unsafe-inline in script-src', async () => {
      const response = await request(app)
        .get('/test')
        .expect(200);

      const csp = response.headers['content-security-policy'];
      
      // Extract script-src directive
      const scriptSrcMatch = csp.match(/script-src[^;]*/);
      expect(scriptSrcMatch).toBeDefined();
      
      // script-src should NOT include 'unsafe-inline'
      expect(scriptSrcMatch![0]).not.toContain("'unsafe-inline'");
    });
  });
});
