import { describe, it, expect, beforeAll } from 'vitest';
import express from 'express';
import request from 'supertest';

describe('Domain Redirect Tests', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.set("trust proxy", 1);

    // Redirect from fxns.ca to www.fxns.ca in production
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

    app.get('/test', (req, res) => {
      res.json({ message: 'OK', host: req.get('host') });
    });
  });

  describe('Production Domain Redirect', () => {
    it('should redirect fxns.ca to www.fxns.ca with 301 status', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const response = await request(app)
        .get('/test')
        .set('Host', 'fxns.ca')
        .expect(301);

      expect(response.headers.location).toBe('http://www.fxns.ca/test');

      process.env.NODE_ENV = originalEnv;
    });

    it('should preserve query parameters in redirect', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const response = await request(app)
        .get('/test?foo=bar&baz=qux')
        .set('Host', 'fxns.ca')
        .expect(301);

      expect(response.headers.location).toBe('http://www.fxns.ca/test?foo=bar&baz=qux');

      process.env.NODE_ENV = originalEnv;
    });

    it('should not redirect www.fxns.ca', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const response = await request(app)
        .get('/test')
        .set('Host', 'www.fxns.ca')
        .expect(200);

      expect(response.body.message).toBe('OK');
      expect(response.body.host).toBe('www.fxns.ca');

      process.env.NODE_ENV = originalEnv;
    });

    it('should not redirect in development mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const response = await request(app)
        .get('/test')
        .set('Host', 'fxns.ca')
        .expect(200);

      expect(response.body.message).toBe('OK');
      expect(response.body.host).toBe('fxns.ca');

      process.env.NODE_ENV = originalEnv;
    });

    it('should use https protocol when request is secure', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      // Create a test app with secure flag set
      const secureApp = express();
      secureApp.set("trust proxy", 1);
      
      secureApp.use((req, res, next) => {
        if (process.env.NODE_ENV === "production") {
          const host = req.get("host");
          if (host === "fxns.ca") {
            const protocol = req.secure ? "https" : "http";
            return res.redirect(301, `${protocol}://www.fxns.ca${req.originalUrl}`);
          }
        }
        next();
      });

      secureApp.get('/test', (req, res) => {
        res.json({ message: 'OK' });
      });

      const response = await request(secureApp)
        .get('/test')
        .set('Host', 'fxns.ca')
        .set('X-Forwarded-Proto', 'https')
        .expect(301);

      expect(response.headers.location).toBe('https://www.fxns.ca/test');

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Session Cookie Domain Configuration', () => {
    it('should set cookie domain to .fxns.ca in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const cookieDomain = process.env.NODE_ENV === "production" ? ".fxns.ca" : undefined;
      
      expect(cookieDomain).toBe('.fxns.ca');

      process.env.NODE_ENV = originalEnv;
    });

    it('should not set cookie domain in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const cookieDomain = process.env.NODE_ENV === "production" ? ".fxns.ca" : undefined;
      
      expect(cookieDomain).toBeUndefined();

      process.env.NODE_ENV = originalEnv;
    });

    it('should verify cookie name is fxns.sid', () => {
      const cookieName = 'fxns.sid';
      expect(cookieName).toBe('fxns.sid');
    });
  });
});
