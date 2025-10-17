import { describe, it, expect, beforeAll } from 'vitest';
import express from 'express';
import request from 'supertest';
import { enhancedCSRFProtection } from '../server/security-middleware';

describe('Enhanced CSRF Protection Tests', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.set('trust proxy', 1);

    // Apply CSRF protection middleware
    app.use(enhancedCSRFProtection);

    // Test routes for different HTTP methods
    app.get('/test', (req, res) => {
      res.json({ message: 'GET OK' });
    });

    app.post('/test', (req, res) => {
      res.json({ message: 'POST OK' });
    });

    app.put('/test', (req, res) => {
      res.json({ message: 'PUT OK' });
    });

    app.patch('/test', (req, res) => {
      res.json({ message: 'PATCH OK' });
    });

    app.delete('/test', (req, res) => {
      res.json({ message: 'DELETE OK' });
    });

    app.head('/test', (req, res) => {
      res.status(200).end();
    });

    app.options('/test', (req, res) => {
      res.status(200).end();
    });
  });

  describe('Safe HTTP Methods (GET, HEAD, OPTIONS)', () => {
    it('should allow GET requests without X-Requested-With header', async () => {
      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.body.message).toBe('GET OK');
    });

    it('should allow HEAD requests without X-Requested-With header', async () => {
      await request(app)
        .head('/test')
        .expect(200);
    });

    it('should allow OPTIONS requests without X-Requested-With header', async () => {
      await request(app)
        .options('/test')
        .expect(200);
    });
  });

  describe('State-Changing Methods - POST', () => {
    it('should block POST requests without X-Requested-With header', async () => {
      const response = await request(app)
        .post('/test')
        .send({ data: 'test' })
        .expect(403);

      expect(response.body.error).toBe('CSRF protection: Missing or invalid X-Requested-With header');
    });

    it('should allow POST requests with X-Requested-With: XMLHttpRequest', async () => {
      const response = await request(app)
        .post('/test')
        .set('X-Requested-With', 'XMLHttpRequest')
        .send({ data: 'test' })
        .expect(200);

      expect(response.body.message).toBe('POST OK');
    });

    it('should allow POST requests with X-Requested-With: fetch', async () => {
      const response = await request(app)
        .post('/test')
        .set('X-Requested-With', 'fetch')
        .send({ data: 'test' })
        .expect(200);

      expect(response.body.message).toBe('POST OK');
    });

    it('should block POST requests with invalid X-Requested-With value', async () => {
      const response = await request(app)
        .post('/test')
        .set('X-Requested-With', 'invalid-value')
        .send({ data: 'test' })
        .expect(403);

      expect(response.body.error).toBe('CSRF protection: Missing or invalid X-Requested-With header');
    });
  });

  describe('State-Changing Methods - PUT', () => {
    it('should block PUT requests without X-Requested-With header', async () => {
      const response = await request(app)
        .put('/test')
        .send({ data: 'test' })
        .expect(403);

      expect(response.body.error).toBe('CSRF protection: Missing or invalid X-Requested-With header');
    });

    it('should allow PUT requests with X-Requested-With: XMLHttpRequest', async () => {
      const response = await request(app)
        .put('/test')
        .set('X-Requested-With', 'XMLHttpRequest')
        .send({ data: 'test' })
        .expect(200);

      expect(response.body.message).toBe('PUT OK');
    });

    it('should allow PUT requests with X-Requested-With: fetch', async () => {
      const response = await request(app)
        .put('/test')
        .set('X-Requested-With', 'fetch')
        .send({ data: 'test' })
        .expect(200);

      expect(response.body.message).toBe('PUT OK');
    });
  });

  describe('State-Changing Methods - PATCH', () => {
    it('should block PATCH requests without X-Requested-With header', async () => {
      const response = await request(app)
        .patch('/test')
        .send({ data: 'test' })
        .expect(403);

      expect(response.body.error).toBe('CSRF protection: Missing or invalid X-Requested-With header');
    });

    it('should allow PATCH requests with X-Requested-With: XMLHttpRequest', async () => {
      const response = await request(app)
        .patch('/test')
        .set('X-Requested-With', 'XMLHttpRequest')
        .send({ data: 'test' })
        .expect(200);

      expect(response.body.message).toBe('PATCH OK');
    });

    it('should allow PATCH requests with X-Requested-With: fetch', async () => {
      const response = await request(app)
        .patch('/test')
        .set('X-Requested-With', 'fetch')
        .send({ data: 'test' })
        .expect(200);

      expect(response.body.message).toBe('PATCH OK');
    });
  });

  describe('State-Changing Methods - DELETE', () => {
    it('should block DELETE requests without X-Requested-With header', async () => {
      const response = await request(app)
        .delete('/test')
        .expect(403);

      expect(response.body.error).toBe('CSRF protection: Missing or invalid X-Requested-With header');
    });

    it('should allow DELETE requests with X-Requested-With: XMLHttpRequest', async () => {
      const response = await request(app)
        .delete('/test')
        .set('X-Requested-With', 'XMLHttpRequest')
        .expect(200);

      expect(response.body.message).toBe('DELETE OK');
    });

    it('should allow DELETE requests with X-Requested-With: fetch', async () => {
      const response = await request(app)
        .delete('/test')
        .set('X-Requested-With', 'fetch')
        .expect(200);

      expect(response.body.message).toBe('DELETE OK');
    });
  });

  describe('Origin Validation', () => {
    it('should allow requests from allowed origins', async () => {
      const allowedOrigins = [
        'http://localhost:5000',
        'https://localhost:5000',
        'http://localhost:5001',
        'https://localhost:5001',
        'http://localhost:4200',
        'https://localhost:4200',
        'http://127.0.0.1:5000',
        'http://127.0.0.1:5001',
        'https://fxns.ca',
        'https://www.fxns.ca',
      ];

      for (const origin of allowedOrigins) {
        const response = await request(app)
          .post('/test')
          .set('X-Requested-With', 'XMLHttpRequest')
          .set('Origin', origin)
          .send({ data: 'test' })
          .expect(200);

        expect(response.body.message).toBe('POST OK');
      }
    });

    it('should block requests from non-allowed origins', async () => {
      const response = await request(app)
        .post('/test')
        .set('X-Requested-With', 'XMLHttpRequest')
        .set('Origin', 'https://malicious-site.com')
        .send({ data: 'test' })
        .expect(403);

      expect(response.body.error).toBe('CSRF protection: Invalid origin');
    });

    it('should allow requests from allowed referer', async () => {
      const response = await request(app)
        .post('/test')
        .set('X-Requested-With', 'XMLHttpRequest')
        .set('Referer', 'https://localhost:5000/some/path')
        .send({ data: 'test' })
        .expect(200);

      expect(response.body.message).toBe('POST OK');
    });

    it('should block requests from non-allowed referer', async () => {
      const response = await request(app)
        .post('/test')
        .set('X-Requested-With', 'XMLHttpRequest')
        .set('Referer', 'https://malicious-site.com/attack')
        .send({ data: 'test' })
        .expect(403);

      expect(response.body.error).toBe('CSRF protection: Invalid origin');
    });

    it('should allow requests without origin or referer headers', async () => {
      // When no origin/referer is provided, only X-Requested-With is checked
      const response = await request(app)
        .post('/test')
        .set('X-Requested-With', 'XMLHttpRequest')
        .send({ data: 'test' })
        .expect(200);

      expect(response.body.message).toBe('POST OK');
    });
  });

  describe('Edge Cases', () => {
    it('should handle case-sensitive header names correctly', async () => {
      const response = await request(app)
        .post('/test')
        .set('x-requested-with', 'XMLHttpRequest') // lowercase
        .send({ data: 'test' })
        .expect(200);

      expect(response.body.message).toBe('POST OK');
    });

    it('should block empty X-Requested-With header', async () => {
      const response = await request(app)
        .post('/test')
        .set('X-Requested-With', '')
        .send({ data: 'test' })
        .expect(403);

      expect(response.body.error).toBe('CSRF protection: Missing or invalid X-Requested-With header');
    });

    it('should allow POST with both Origin and Referer from allowed sources', async () => {
      const response = await request(app)
        .post('/test')
        .set('X-Requested-With', 'fetch')
        .set('Origin', 'https://localhost:5000')
        .set('Referer', 'https://localhost:5000/page')
        .send({ data: 'test' })
        .expect(200);

      expect(response.body.message).toBe('POST OK');
    });
  });
});
