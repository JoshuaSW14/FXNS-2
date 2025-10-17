import { describe, it, expect, beforeAll } from 'vitest';
import express from 'express';
import request from 'supertest';
import { enhancedCSRFProtection } from '../server/security-middleware';

describe('Global CSRF Protection Integration Tests', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.set('trust proxy', 1);

    // Simulate the route structure in routes.ts
    // Routes registered BEFORE CSRF protection
    app.post('/api/stripe/webhook', (req, res) => {
      res.json({ message: 'Stripe webhook received' });
    });

    app.post('/api/integrations/webhooks/test-webhook', (req, res) => {
      res.json({ message: 'Public webhook received' });
    });

    // Apply global CSRF protection
    app.use(enhancedCSRFProtection);

    // Routes registered AFTER CSRF protection
    app.post('/api/subscription/upgrade', (req, res) => {
      res.json({ message: 'Subscription upgraded' });
    });

    app.post('/api/tool-builder/drafts', (req, res) => {
      res.json({ message: 'Draft created' });
    });

    app.post('/api/integrations/configurations', (req, res) => {
      res.json({ message: 'Configuration created' });
    });

    app.get('/api/subscription/plans', (req, res) => {
      res.json({ message: 'Plans retrieved' });
    });
  });

  describe('Public Webhook Endpoints (Before CSRF)', () => {
    it('should allow Stripe webhook without X-Requested-With header', async () => {
      const response = await request(app)
        .post('/api/stripe/webhook')
        .send({ type: 'payment_intent.succeeded' })
        .expect(200);

      expect(response.body.message).toBe('Stripe webhook received');
    });

    it('should allow public integration webhooks without X-Requested-With header', async () => {
      const response = await request(app)
        .post('/api/integrations/webhooks/test-webhook')
        .send({ data: 'test' })
        .expect(200);

      expect(response.body.message).toBe('Public webhook received');
    });
  });

  describe('Protected Routes (After CSRF)', () => {
    it('should block subscription routes without X-Requested-With header', async () => {
      const response = await request(app)
        .post('/api/subscription/upgrade')
        .send({ plan: 'pro' })
        .expect(403);

      expect(response.body.error).toBe('CSRF protection: Missing or invalid X-Requested-With header');
    });

    it('should allow subscription routes with X-Requested-With header', async () => {
      const response = await request(app)
        .post('/api/subscription/upgrade')
        .set('X-Requested-With', 'XMLHttpRequest')
        .send({ plan: 'pro' })
        .expect(200);

      expect(response.body.message).toBe('Subscription upgraded');
    });

    it('should block tool-builder routes without X-Requested-With header', async () => {
      const response = await request(app)
        .post('/api/tool-builder/drafts')
        .send({ name: 'Test Tool' })
        .expect(403);

      expect(response.body.error).toBe('CSRF protection: Missing or invalid X-Requested-With header');
    });

    it('should allow tool-builder routes with X-Requested-With header', async () => {
      const response = await request(app)
        .post('/api/tool-builder/drafts')
        .set('X-Requested-With', 'fetch')
        .send({ name: 'Test Tool' })
        .expect(200);

      expect(response.body.message).toBe('Draft created');
    });

    it('should block integration configuration routes without X-Requested-With header', async () => {
      const response = await request(app)
        .post('/api/integrations/configurations')
        .send({ name: 'Test Config' })
        .expect(403);

      expect(response.body.error).toBe('CSRF protection: Missing or invalid X-Requested-With header');
    });

    it('should allow integration configuration routes with X-Requested-With header', async () => {
      const response = await request(app)
        .post('/api/integrations/configurations')
        .set('X-Requested-With', 'XMLHttpRequest')
        .send({ name: 'Test Config' })
        .expect(200);

      expect(response.body.message).toBe('Configuration created');
    });

    it('should allow GET requests without X-Requested-With header', async () => {
      const response = await request(app)
        .get('/api/subscription/plans')
        .expect(200);

      expect(response.body.message).toBe('Plans retrieved');
    });
  });

  describe('Mixed Endpoint Testing', () => {
    it('should enforce CSRF on all POST routes except webhooks', async () => {
      // Test protected routes fail without header
      await request(app)
        .post('/api/subscription/upgrade')
        .send({})
        .expect(403);

      await request(app)
        .post('/api/tool-builder/drafts')
        .send({})
        .expect(403);

      // Test webhook routes succeed without header
      await request(app)
        .post('/api/stripe/webhook')
        .send({})
        .expect(200);

      await request(app)
        .post('/api/integrations/webhooks/test-webhook')
        .send({})
        .expect(200);
    });

    it('should enforce CSRF with both valid and invalid X-Requested-With values', async () => {
      // Valid values should work
      await request(app)
        .post('/api/subscription/upgrade')
        .set('X-Requested-With', 'XMLHttpRequest')
        .send({})
        .expect(200);

      await request(app)
        .post('/api/subscription/upgrade')
        .set('X-Requested-With', 'fetch')
        .send({})
        .expect(200);

      // Invalid values should be blocked
      await request(app)
        .post('/api/subscription/upgrade')
        .set('X-Requested-With', 'custom-value')
        .send({})
        .expect(403);

      await request(app)
        .post('/api/subscription/upgrade')
        .set('X-Requested-With', '')
        .send({})
        .expect(403);
    });
  });
});
