import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import connectPg from "connect-pg-simple";
import { sendWelcomeEmail } from "./email-notifications";
import { rateLimiters, enhancedCSRFProtection } from "./security-middleware";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const PostgresSessionStore = connectPg(session);
  const sessionSettings: session.SessionOptions = {
    name: "fxns.sid",
    secret: process.env.SESSION_SECRET || "your-secret-key",
    resave: false,
    saveUninitialized: false,
    proxy: true,
    store: new PostgresSessionStore({
      conString: process.env.DATABASE_URL,
      tableName: "session",
      createTableIfMissing: false,
    }),
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7,
      domain: process.env.NODE_ENV === "production" ? ".fxns.ca" : undefined,
    },
  };

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      {
        usernameField: "email",
        passwordField: "password",
        passReqToCallback: false,
      },
      async (email, password, done) => {
        try {
          const emailNorm = (email || "").trim().toLowerCase();
          const user = await storage.getUserByEmail(emailNorm);
          if (!user)
            return done(null, false, { message: "Invalid email or password" });

          if (user.suspended) {
            return done(null, false, { message: "Your account has been suspended. Please contact support." });
          }

          const ok =
            !!user.passwordHash &&
            (await comparePasswords(password, user.passwordHash));
          if (!ok)
            return done(null, false, { message: "Invalid email or password" });

          return done(null, user);
        } catch (error) {
          return done(error as any);
        }
      }
    )
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id as any);
      if (!user) {
        return done(null, false);
      }
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Middleware to check if the session has been revoked
  // This runs after passport.session() deserializes the user
  app.use(async (req, res, next) => {
    // Only check for authenticated users
    if (req.isAuthenticated?.() && req.user && req.sessionID) {
      try {
        // Check if this session has been revoked in our sessions table
        const sessions = await storage.listSessions(req.user.id as any, req.sessionID);
        const currentSession = sessions.find(s => s.isCurrent);
        
        if (currentSession && currentSession.revokedAt) {
          // Session has been revoked - prevent access
          // Override isAuthenticated to return false
          req.isAuthenticated = (() => false) as any;
          // Clear the user from the request
          delete (req as any).user;
        }
      } catch (error) {
        // If we can't check the session, log the error but continue
        console.error('Error checking session revocation:', error);
      }
    }
    next();
  });

  app.post("/api/register", rateLimiters.auth, async (req, res, next) => {
    try {
      const { name, email, passwordHash } = req.body;
      const password = passwordHash; // Adjusted to match the expected field
      
      if (!email || !password) {
        return res
          .status(400)
          .json({ message: "Email and password are required" });
      }

      const emailNorm = String(email).trim().toLowerCase();
      const existingUser = await storage.getUserByEmail(emailNorm);

      if (existingUser) {
        return res.status(400).json({ message: "Email already exists" });
      }

      const user = await storage.createUser({
        role: "User",
        name: name,
        email: emailNorm,
        passwordHash: await hashPassword(password),
      });

      req.login(user, async (err) => {
        if (err) return next(err);
        // Record a row in our app's sessions table
        await storage.recordSession(
          user.id as any,
          req.sessionID,
          req.get("user-agent") || null,
          (req.headers["x-forwarded-for"] as string) ||
            req.socket.remoteAddress ||
            null,
          // approximate server-side expiry if you later set cookie.maxAge
          null
        );
        
        // Send welcome email
        sendWelcomeEmail(user.id, user.name || 'there', user.email);
        
        res.status(201).json(user);
      });
    } catch (error) {
      console.error("Registration error:", error);
      next(error);
    }
  });

  app.post("/api/login", rateLimiters.auth, (req, res, next) => {
    console.log("Login attempt for:", req.body.email);
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) {
        return res
          .status(401)
          .json({ message: info?.message || "Invalid email or password" });
      }
      req.login(user, async (err) => {
        if (err) return next(err);
        // Record a row in our app's sessions table
        await storage.recordSession(
          user.id as any,
          req.sessionID,
          req.get("user-agent") || null,
          (req.headers["x-forwarded-for"] as string) ||
            req.socket.remoteAddress ||
            null,
          null
        );
        res.status(200).json(user);
      });
    })(req, res, next);
  });

  // server/auth.ts — inside setupAuth(app)
  app.post("/api/logout", enhancedCSRFProtection, (req, res, next) => {
    // IMPORTANT: wait for logout to complete
    req.logout?.(async (err) => {
      if (err) return next(err);

      // (optional) mark this sid as revoked in your own sessions table
      try {
        await storage.revokeSessionByToken(req.sessionID);
      } catch {}

      const s = req.session as any;
      if (s && typeof s.destroy === "function") {
        s.destroy(() => {
          res.clearCookie("fxns.sid", {
            domain: process.env.NODE_ENV === "production" ? ".fxns.ca" : undefined,
          });
          res.status(200).json({ ok: true });
        });
      } else {
        res.clearCookie("fxns.sid", {
          domain: process.env.NODE_ENV === "production" ? ".fxns.ca" : undefined,
        });
        res.status(200).json({ ok: true });
      }
    });
  });

  // Optional browser-friendly route
  app.get("/logout", (req, res) => {
    try {
      req.logout?.(() => {});
    } catch {}
    const s = req.session as any;
    if (s && typeof s.destroy === "function") {
      s.destroy(() => {
        res.clearCookie("fxns.sid", {
          domain: process.env.NODE_ENV === "production" ? ".fxns.ca" : undefined,
        });
        res.redirect("/auth");
      });
    } else {
      res.clearCookie("fxns.sid", {
        domain: process.env.NODE_ENV === "production" ? ".fxns.ca" : undefined,
      });
      res.redirect("/auth");
    }
  });

  // --- Sessions API for settings page ---
  app.get("/api/me/sessions", async (req, res) => {
    if (!req.isAuthenticated())
      return res.status(401).json({ error: "Unauthorized" });
    const rows = await storage.listSessions(req.user.id as any, req.sessionID);
    res.json({ sessions: rows });
  });

  app.post("/api/me/sessions/:id/revoke", enhancedCSRFProtection, async (req, res) => {
    if (!req.isAuthenticated())
      return res.status(401).json({ error: "Unauthorized" });
    await storage.revokeSession(req.user.id as any, req.params.id);
    res.json({ ok: true });
  });

  app.post("/api/me/sessions/logout-all", enhancedCSRFProtection, async (req, res) => {
    if (!req.isAuthenticated())
      return res.status(401).json({ error: "Unauthorized" });
    await storage.revokeAllOtherSessions(req.user.id as any, req.sessionID);
    res.json({ ok: true });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });
}

export { hashPassword, comparePasswords };
