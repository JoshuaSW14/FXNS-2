import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { db } from '../db';
import { users, sessions } from '../../shared/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { setupAuth } from '../auth';
import { storage } from '../storage';
import cookieParser from 'cookie-parser';

describe('Authentication Integration Tests', () => {
  let app: express.Application;
  let testUserEmail: string;
  let testUserId: string;
  let sessionCookie: string;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.use(cookieParser());
    setupAuth(app as any);

    app.get('/api/protected', (req, res) => {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      res.json({ message: 'Protected data', user: req.user });
    });
  });

  beforeEach(() => {
    testUserEmail = `test-${Date.now()}@example.com`;
  });

  afterAll(async () => {
    try {
      const testUsers = await db
        .select()
        .from(users)
        .where(eq(users.email, testUserEmail));
      
      for (const user of testUsers) {
        await db.delete(sessions).where(eq(sessions.userId, user.id));
        await db.delete(users).where(eq(users.id, user.id));
      }
    } catch (error) {
      console.log('Test cleanup error:', error);
    }
  });

  describe('Registration Flow', () => {
    it('should successfully register a new user with valid data', async () => {
      const response = await request(app)
        .post('/api/register')
        .send({
          name: 'Test User',
          email: testUserEmail,
          password: 'SecurePassword123!',
        })
        .expect(201);

      expect(response.body).toBeDefined();
      expect(response.body.email).toBe(testUserEmail);
      expect(response.body.name).toBe('Test User');
      expect(response.headers['set-cookie']).toBeDefined();

      testUserId = response.body.id;

      const user = await storage.getUserByEmail(testUserEmail);
      expect(user).toBeDefined();
      expect(user?.email).toBe(testUserEmail);
      expect(user?.passwordHash).toBeDefined();
    });

    it('should reject registration with duplicate email', async () => {
      await request(app)
        .post('/api/register')
        .send({
          name: 'First User',
          email: testUserEmail,
          password: 'Password123!',
        })
        .expect(201);

      const response = await request(app)
        .post('/api/register')
        .send({
          name: 'Second User',
          email: testUserEmail,
          password: 'DifferentPass123!',
        })
        .expect(400);

      expect(response.body.message).toBe('Email already exists');
    });

    it('should reject registration with missing email', async () => {
      const response = await request(app)
        .post('/api/register')
        .send({
          name: 'Test User',
          password: 'Password123!',
        })
        .expect(400);

      expect(response.body.message).toBe('Email and password are required');
    });

    it('should reject registration with missing password', async () => {
      const response = await request(app)
        .post('/api/register')
        .send({
          name: 'Test User',
          email: testUserEmail,
        })
        .expect(400);

      expect(response.body.message).toBe('Email and password are required');
    });

    it('should normalize email addresses to lowercase', async () => {
      const upperCaseEmail = `TEST-${Date.now()}@EXAMPLE.COM`;
      const response = await request(app)
        .post('/api/register')
        .send({
          name: 'Test User',
          email: upperCaseEmail,
          password: 'Password123!',
        })
        .expect(201);

      expect(response.body.email).toBe(upperCaseEmail.toLowerCase());
      
      const user = await storage.getUserByEmail(upperCaseEmail);
      expect(user).toBeDefined();
      expect(user?.email).toBe(upperCaseEmail.toLowerCase());

      testUserEmail = upperCaseEmail.toLowerCase();
      testUserId = response.body.id;
    });

    it('should automatically log in user after successful registration', async () => {
      const response = await request(app)
        .post('/api/register')
        .send({
          name: 'Auto Login User',
          email: testUserEmail,
          password: 'Password123!',
        })
        .expect(201);

      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toContain('fxns.sid');

      testUserId = response.body.id;

      const protectedResponse = await request(app)
        .get('/api/protected')
        .set('Cookie', cookies)
        .expect(200);

      expect(protectedResponse.body.user.email).toBe(testUserEmail);
    });
  });

  describe('Login Flow', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/register')
        .send({
          name: 'Login Test User',
          email: testUserEmail,
          password: 'CorrectPassword123!',
        })
        .expect(201);
    });

    it('should successfully login with correct credentials', async () => {
      const response = await request(app)
        .post('/api/login')
        .send({
          email: testUserEmail,
          password: 'CorrectPassword123!',
        })
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.email).toBe(testUserEmail);
      expect(response.headers['set-cookie']).toBeDefined();

      sessionCookie = response.headers['set-cookie'][0];
    });

    it('should fail login with wrong password', async () => {
      const response = await request(app)
        .post('/api/login')
        .send({
          email: testUserEmail,
          password: 'WrongPassword123!',
        })
        .expect(401);

      expect(response.body.message).toBe('Invalid email or password');
      expect(response.headers['set-cookie']).toBeUndefined();
    });

    it('should fail login with non-existent user', async () => {
      const response = await request(app)
        .post('/api/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'AnyPassword123!',
        })
        .expect(401);

      expect(response.body.message).toBe('Invalid email or password');
    });

    it('should fail login for suspended users', async () => {
      const user = await storage.getUserByEmail(testUserEmail);
      if (user) {
        await storage.updateUser(user.id as any, { 
          suspended: true,
          suspendedAt: new Date(),
        });
      }

      const response = await request(app)
        .post('/api/login')
        .send({
          email: testUserEmail,
          password: 'CorrectPassword123!',
        })
        .expect(401);

      expect(response.body.message).toContain('suspended');
    });

    it('should normalize email on login', async () => {
      const response = await request(app)
        .post('/api/login')
        .send({
          email: testUserEmail.toUpperCase(),
          password: 'CorrectPassword123!',
        })
        .expect(200);

      expect(response.body.email).toBe(testUserEmail);
    });
  });

  describe('Session Management', () => {
    beforeEach(async () => {
      const regResponse = await request(app)
        .post('/api/register')
        .send({
          name: 'Session Test User',
          email: testUserEmail,
          password: 'Password123!',
        })
        .expect(201);

      sessionCookie = regResponse.headers['set-cookie'][0];
      testUserId = regResponse.body.id;
    });

    it('should create a session on login', async () => {
      const loginResponse = await request(app)
        .post('/api/login')
        .send({
          email: testUserEmail,
          password: 'Password123!',
        })
        .expect(200);

      expect(loginResponse.headers['set-cookie']).toBeDefined();

      const userSessions = await db
        .select()
        .from(sessions)
        .where(eq(sessions.userId, testUserId as any));

      expect(userSessions.length).toBeGreaterThan(0);
    });

    it('should persist session across requests', async () => {
      const firstResponse = await request(app)
        .get('/api/protected')
        .set('Cookie', sessionCookie)
        .expect(200);

      expect(firstResponse.body.user.email).toBe(testUserEmail);

      const secondResponse = await request(app)
        .get('/api/protected')
        .set('Cookie', sessionCookie)
        .expect(200);

      expect(secondResponse.body.user.email).toBe(testUserEmail);
    });

    it('should list user sessions', async () => {
      const response = await request(app)
        .get('/api/me/sessions')
        .set('Cookie', sessionCookie)
        .expect(200);

      expect(response.body.sessions).toBeDefined();
      expect(Array.isArray(response.body.sessions)).toBe(true);
      expect(response.body.sessions.length).toBeGreaterThan(0);
      
      const currentSession = response.body.sessions.find((s: any) => s.isCurrent);
      expect(currentSession).toBeDefined();
      expect(currentSession.isActive).toBe(true);
    });

    it('should cleanup session on logout', async () => {
      const logoutResponse = await request(app)
        .post('/api/logout')
        .set('Cookie', sessionCookie)
        .expect(200);

      expect(logoutResponse.body.ok).toBe(true);

      const protectedResponse = await request(app)
        .get('/api/protected')
        .set('Cookie', sessionCookie)
        .expect(401);

      expect(protectedResponse.body.error).toBe('Unauthorized');
    });

    it('should revoke specific session', async () => {
      const sessionsResponse = await request(app)
        .get('/api/me/sessions')
        .set('Cookie', sessionCookie)
        .expect(200);

      const sessionsList = sessionsResponse.body.sessions;
      expect(sessionsList.length).toBeGreaterThan(0);

      const sessionToRevoke = sessionsList.find((s: any) => s.isCurrent);
      
      await request(app)
        .post(`/api/me/sessions/${sessionToRevoke.id}/revoke`)
        .set('Cookie', sessionCookie)
        .expect(200);

      const updatedSession = await db
        .select()
        .from(sessions)
        .where(eq(sessions.id, sessionToRevoke.id as any))
        .limit(1);

      expect(updatedSession[0].revokedAt).toBeDefined();
    });

    it('should revoke all other sessions except current', async () => {
      const loginResponse1 = await request(app)
        .post('/api/login')
        .send({
          email: testUserEmail,
          password: 'Password123!',
        })
        .expect(200);

      const session1Cookie = loginResponse1.headers['set-cookie'][0];

      const loginResponse2 = await request(app)
        .post('/api/login')
        .send({
          email: testUserEmail,
          password: 'Password123!',
        })
        .expect(200);

      const session2Cookie = loginResponse2.headers['set-cookie'][0];

      const beforeLogout = await db
        .select()
        .from(sessions)
        .where(
          and(
            eq(sessions.userId, testUserId as any),
            isNull(sessions.revokedAt)
          )
        );

      await request(app)
        .post('/api/me/sessions/logout-all')
        .set('Cookie', session2Cookie)
        .expect(200);

      const afterLogout = await db
        .select()
        .from(sessions)
        .where(
          and(
            eq(sessions.userId, testUserId as any),
            isNull(sessions.revokedAt)
          )
        );

      expect(beforeLogout.length).toBeGreaterThan(0);
      expect(afterLogout.length).toBeLessThan(beforeLogout.length);

      // Note: Session revocation in the database doesn't immediately invalidate
      // express-session cookies. The session store still has the session data.
      // In production, middleware would need to check the revokedAt field.
      // For now, we verify the database state is correct.

      // Current session (session2) should still be active
      const session2StillActive = await request(app)
        .get('/api/protected')
        .set('Cookie', session2Cookie)
        .expect(200);

      expect(session2StillActive.body.user.email).toBe(testUserEmail);
    });
  });

  describe('Protected Routes', () => {
    it('should reject unauthenticated requests to protected routes', async () => {
      const response = await request(app)
        .get('/api/protected')
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
    });

    it('should allow authenticated requests to protected routes', async () => {
      const loginResponse = await request(app)
        .post('/api/register')
        .send({
          name: 'Protected Route User',
          email: testUserEmail,
          password: 'Password123!',
        })
        .expect(201);

      testUserId = loginResponse.body.id;
      const cookies = loginResponse.headers['set-cookie'];

      const response = await request(app)
        .get('/api/protected')
        .set('Cookie', cookies)
        .expect(200);

      expect(response.body.message).toBe('Protected data');
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe(testUserEmail);
    });

    it('should reject requests with invalid session cookies', async () => {
      const response = await request(app)
        .get('/api/protected')
        .set('Cookie', 'fxns.sid=invalid-session-id')
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
    });

    it('should allow access to /api/user endpoint for authenticated users', async () => {
      const loginResponse = await request(app)
        .post('/api/register')
        .send({
          name: 'User Endpoint Test',
          email: testUserEmail,
          password: 'Password123!',
        })
        .expect(201);

      testUserId = loginResponse.body.id;
      const cookies = loginResponse.headers['set-cookie'];

      const response = await request(app)
        .get('/api/user')
        .set('Cookie', cookies)
        .expect(200);

      expect(response.body.email).toBe(testUserEmail);
      expect(response.body.name).toBe('User Endpoint Test');
    });

    it('should reject unauthenticated requests to /api/user', async () => {
      await request(app)
        .get('/api/user')
        .expect(401);
    });
  });

  describe('Password Security', () => {
    it('should hash passwords before storing', async () => {
      const password = 'MySecurePassword123!';
      const response = await request(app)
        .post('/api/register')
        .send({
          name: 'Password Test User',
          email: testUserEmail,
          password: password,
        })
        .expect(201);

      testUserId = response.body.id;

      const user = await storage.getUserByEmail(testUserEmail);
      expect(user?.passwordHash).toBeDefined();
      expect(user?.passwordHash).not.toBe(password);
      expect(user?.passwordHash).toContain('.');
      expect(user?.passwordHash?.length).toBeGreaterThan(50);
    });

    it('should not expose plain text password in API responses', async () => {
      const response = await request(app)
        .post('/api/register')
        .send({
          name: 'Hash Exposure Test',
          email: testUserEmail,
          password: 'Password123!',
        })
        .expect(201);

      testUserId = response.body.id;

      // Note: Current implementation returns passwordHash in response
      // This is a security concern that should be addressed by sanitizing the response
      expect(response.body.password).toBeUndefined();

      const cookies = response.headers['set-cookie'];
      const userResponse = await request(app)
        .get('/api/user')
        .set('Cookie', cookies)
        .expect(200);

      expect(userResponse.body.password).toBeUndefined();
    });
  });

  describe('Session Revocation Enforcement (CRITICAL SECURITY)', () => {
    beforeEach(async () => {
      const regResponse = await request(app)
        .post('/api/register')
        .send({
          name: 'Revocation Test User',
          email: testUserEmail,
          password: 'Password123!',
        })
        .expect(201);

      sessionCookie = regResponse.headers['set-cookie'][0];
      testUserId = regResponse.body.id;
    });

    it('CRITICAL: should reject access to protected routes with revoked session', async () => {
      const sessionsResponse = await request(app)
        .get('/api/me/sessions')
        .set('Cookie', sessionCookie)
        .expect(200);

      const currentSession = sessionsResponse.body.sessions.find((s: any) => s.isCurrent);
      expect(currentSession).toBeDefined();

      const initialProtectedResponse = await request(app)
        .get('/api/protected')
        .set('Cookie', sessionCookie)
        .expect(200);

      expect(initialProtectedResponse.body.user.email).toBe(testUserEmail);

      await request(app)
        .post(`/api/me/sessions/${currentSession.id}/revoke`)
        .set('Cookie', sessionCookie)
        .expect(200);

      const revokedSession = await db
        .select()
        .from(sessions)
        .where(eq(sessions.id, currentSession.id as any))
        .limit(1);

      expect(revokedSession[0].revokedAt).toBeDefined();

      const protectedAfterRevoke = await request(app)
        .get('/api/protected')
        .set('Cookie', sessionCookie)
        .expect(401);

      expect(protectedAfterRevoke.body.error).toBe('Unauthorized');
    });

    it('CRITICAL: should reject multiple revoked sessions from accessing protected routes', async () => {
      const session1Response = await request(app)
        .post('/api/login')
        .send({
          email: testUserEmail,
          password: 'Password123!',
        })
        .expect(200);

      const session1Cookie = session1Response.headers['set-cookie'][0];

      const session2Response = await request(app)
        .post('/api/login')
        .send({
          email: testUserEmail,
          password: 'Password123!',
        })
        .expect(200);

      const session2Cookie = session2Response.headers['set-cookie'][0];

      const session1Works = await request(app)
        .get('/api/protected')
        .set('Cookie', session1Cookie)
        .expect(200);

      expect(session1Works.body.user.email).toBe(testUserEmail);

      const session2Works = await request(app)
        .get('/api/protected')
        .set('Cookie', session2Cookie)
        .expect(200);

      expect(session2Works.body.user.email).toBe(testUserEmail);

      const sessionsListResponse = await request(app)
        .get('/api/me/sessions')
        .set('Cookie', session1Cookie)
        .expect(200);

      const session1Id = sessionsListResponse.body.sessions.find(
        (s: any) => s.isCurrent
      )?.id;

      await request(app)
        .post(`/api/me/sessions/${session1Id}/revoke`)
        .set('Cookie', session1Cookie)
        .expect(200);

      const session1AfterRevoke = await request(app)
        .get('/api/protected')
        .set('Cookie', session1Cookie)
        .expect(401);

      expect(session1AfterRevoke.body.error).toBe('Unauthorized');

      const session2StillWorks = await request(app)
        .get('/api/protected')
        .set('Cookie', session2Cookie)
        .expect(200);

      expect(session2StillWorks.body.user.email).toBe(testUserEmail);
    });

    it('CRITICAL: should reject all other sessions after logout-all, but keep current session active', async () => {
      const session1Response = await request(app)
        .post('/api/login')
        .send({
          email: testUserEmail,
          password: 'Password123!',
        })
        .expect(200);

      const session1Cookie = session1Response.headers['set-cookie'][0];

      const session2Response = await request(app)
        .post('/api/login')
        .send({
          email: testUserEmail,
          password: 'Password123!',
        })
        .expect(200);

      const session2Cookie = session2Response.headers['set-cookie'][0];

      const session3Response = await request(app)
        .post('/api/login')
        .send({
          email: testUserEmail,
          password: 'Password123!',
        })
        .expect(200);

      const session3Cookie = session3Response.headers['set-cookie'][0];

      const allSessionsWork = await Promise.all([
        request(app).get('/api/protected').set('Cookie', session1Cookie).expect(200),
        request(app).get('/api/protected').set('Cookie', session2Cookie).expect(200),
        request(app).get('/api/protected').set('Cookie', session3Cookie).expect(200),
      ]);

      expect(allSessionsWork.every(r => r.body.user.email === testUserEmail)).toBe(true);

      await request(app)
        .post('/api/me/sessions/logout-all')
        .set('Cookie', session2Cookie)
        .expect(200);

      const session1AfterLogoutAll = await request(app)
        .get('/api/protected')
        .set('Cookie', session1Cookie)
        .expect(401);

      expect(session1AfterLogoutAll.body.error).toBe('Unauthorized');

      const session3AfterLogoutAll = await request(app)
        .get('/api/protected')
        .set('Cookie', session3Cookie)
        .expect(401);

      expect(session3AfterLogoutAll.body.error).toBe('Unauthorized');

      const session2StillActive = await request(app)
        .get('/api/protected')
        .set('Cookie', session2Cookie)
        .expect(200);

      expect(session2StillActive.body.user.email).toBe(testUserEmail);
    });

    it('CRITICAL: should reject revoked session from accessing user profile endpoint', async () => {
      const sessionsResponse = await request(app)
        .get('/api/me/sessions')
        .set('Cookie', sessionCookie)
        .expect(200);

      const currentSession = sessionsResponse.body.sessions.find((s: any) => s.isCurrent);

      const userBeforeRevoke = await request(app)
        .get('/api/user')
        .set('Cookie', sessionCookie)
        .expect(200);

      expect(userBeforeRevoke.body.email).toBe(testUserEmail);

      await request(app)
        .post(`/api/me/sessions/${currentSession.id}/revoke`)
        .set('Cookie', sessionCookie)
        .expect(200);

      const userAfterRevoke = await request(app)
        .get('/api/user')
        .set('Cookie', sessionCookie)
        .expect(401);

      expect(userAfterRevoke.body).toBeDefined();
    });

    it('CRITICAL: should prevent revoked session from performing authenticated actions', async () => {
      const loginResponse = await request(app)
        .post('/api/login')
        .send({
          email: testUserEmail,
          password: 'Password123!',
        })
        .expect(200);

      const loginCookie = loginResponse.headers['set-cookie'][0];

      const sessionsResponse = await request(app)
        .get('/api/me/sessions')
        .set('Cookie', loginCookie)
        .expect(200);

      const sessionToRevoke = sessionsResponse.body.sessions.find((s: any) => s.isCurrent);

      await request(app)
        .post(`/api/me/sessions/${sessionToRevoke.id}/revoke`)
        .set('Cookie', loginCookie)
        .expect(200);

      const attemptSessionList = await request(app)
        .get('/api/me/sessions')
        .set('Cookie', loginCookie)
        .expect(401);

      expect(attemptSessionList.body).toBeDefined();
    });

    it('CRITICAL: should verify revoked sessions cannot be used after server restart simulation', async () => {
      const sessionsResponse = await request(app)
        .get('/api/me/sessions')
        .set('Cookie', sessionCookie)
        .expect(200);

      const currentSession = sessionsResponse.body.sessions.find((s: any) => s.isCurrent);

      await request(app)
        .post(`/api/me/sessions/${currentSession.id}/revoke`)
        .set('Cookie', sessionCookie)
        .expect(200);

      const sessionInDb = await db
        .select()
        .from(sessions)
        .where(eq(sessions.id, currentSession.id as any))
        .limit(1);

      expect(sessionInDb[0].revokedAt).toBeDefined();

      const protectedAfterRevoke = await request(app)
        .get('/api/protected')
        .set('Cookie', sessionCookie)
        .expect(401);

      expect(protectedAfterRevoke.body.error).toBe('Unauthorized');
    });
  });
});
