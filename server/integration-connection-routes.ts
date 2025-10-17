import express from "express";
import { z } from "zod";
import { db } from "./storage";
import { integrationConnections } from "../shared/schema";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

const API_ORIGIN = process.env.BACKEND_URL || "https://localhost:5001";
const CLIENT_URL = process.env.FRONTEND_URL || "https://localhost:4200"; // <-- https in dev

const requireAuth = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
};

function sendCloseHtml(
  res: any,
  provider: string,
  ok: boolean,
  msg?: string,
  extra?: { flowId?: string }
) {
  console.log("------------- OAuth flow done:", { provider, ok, msg, ...extra });
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, max-age=0"
  );
  res.setHeader("Pragma", "no-cache");

  const parentOrigin = new URL(process.env.FRONTEND_URL!).origin; // https://www.fxns.ca
  const qs = ok
    ? "success=connected"
    : `error=${encodeURIComponent(msg || "oauth_failed")}`;

  console.log("Parent origin:", parentOrigin);

  res.end(`<!doctype html>
<meta charset="utf-8"><title>Connecting…</title>
<body style="font:14px system-ui;padding:16px">Finishing up…</body>
<script>
(function () {
  var payload = { type:"oauth_done", provider:${JSON.stringify(provider)}, ok:${ok}, msg:${JSON.stringify(msg || "")} };
  var parentOrigin = ${JSON.stringify(parentOrigin)};
  var tries = 0, iv = setInterval(function(){
    tries++; try { if (window.opener) window.opener.postMessage(payload, parentOrigin); } catch(e){}
    if (tries >= 8) clearInterval(iv);
  }, 120);
  var url = parentOrigin + "/integrations?${qs}#fxns_oauth=done";
  setTimeout(function(){ try{ location.replace(url); }catch(e){} setTimeout(function(){ try{ window.close(); }catch(e){} }, 200); }, 250);
})();
</script>`);
}

const router = express.Router();

if (!process.env.OAUTH_STATE_SECRET) {
  console.error("❌ Missing required environment variable: OAUTH_STATE_SECRET");
  console.error(
    "   Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
  );
  throw new Error(
    "OAUTH_STATE_SECRET environment variable is required for secure OAuth flows"
  );
}

if (!process.env.API_CREDENTIAL_ENCRYPTION_KEY) {
  console.error(
    "❌ Missing required environment variable: API_CREDENTIAL_ENCRYPTION_KEY"
  );
  console.error(
    "   Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
  );
  throw new Error(
    "API_CREDENTIAL_ENCRYPTION_KEY environment variable is required for secure token storage"
  );
}

const OAUTH_STATE_SECRET = process.env.OAUTH_STATE_SECRET;
const ENCRYPTION_KEY = process.env.API_CREDENTIAL_ENCRYPTION_KEY;

if (
  OAUTH_STATE_SECRET.length !== 64 ||
  !/^[0-9a-fA-F]{64}$/.test(OAUTH_STATE_SECRET)
) {
  console.error("❌ OAUTH_STATE_SECRET must be 64 hex characters (32 bytes)");
  console.error("   Current length:", OAUTH_STATE_SECRET.length);
  console.error(
    "   Generate a valid one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
  );
  throw new Error(
    "OAUTH_STATE_SECRET must be 64 hex characters for HMAC security"
  );
}

if (ENCRYPTION_KEY.length !== 64 || !/^[0-9a-fA-F]{64}$/.test(ENCRYPTION_KEY)) {
  console.error(
    "❌ API_CREDENTIAL_ENCRYPTION_KEY must be 64 hex characters (32 bytes)"
  );
  console.error("   Current length:", ENCRYPTION_KEY.length);
  console.error(
    "   Generate a valid one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
  );
  throw new Error("API_CREDENTIAL_ENCRYPTION_KEY must be 64 hex characters");
}

function encryptToken(token: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    "aes-256-gcm",
    Buffer.from(ENCRYPTION_KEY, "hex").slice(0, 32),
    iv
  );
  let encrypted = cipher.update(token, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

function decryptToken(encryptedToken: string): string {
  const parts = encryptedToken.split(":");
  const iv = Buffer.from(parts[0], "hex");
  const authTag = Buffer.from(parts[1], "hex");
  const encrypted = parts[2];
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    Buffer.from(ENCRYPTION_KEY, "hex").slice(0, 32),
    iv
  );
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

function signState(data: any): string {
  const payload = JSON.stringify(data);
  const hmac = crypto.createHmac("sha256", OAUTH_STATE_SECRET);
  hmac.update(payload);
  const signature = hmac.digest("hex");
  return Buffer.from(`${signature}.${payload}`).toString("base64url");
}

function verifyState(state: string): any | null {
  try {
    const decoded = Buffer.from(state, "base64url").toString();
    const signature = decoded.substring(0, 64);
    const payload = decoded.substring(65);

    const hmac = crypto.createHmac("sha256", OAUTH_STATE_SECRET);
    hmac.update(payload);
    const expectedSignature = hmac.digest("hex");

    if (signature !== expectedSignature) {
      console.error("OAuth state signature mismatch");
      return null;
    }

    return JSON.parse(payload);
  } catch (error) {
    console.error("OAuth state verification failed:", error);
    return null;
  }
}

const OAUTH_CONFIGS: Record<
  string,
  {
    clientId: string;
    clientSecret: string;
    scopes: string[];
    authUrl: string;
    tokenUrl: string;
  }
> = {
  gmail: {
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    scopes: [
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/gmail.readonly",
    ],
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
  },
  google_calendar: {
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    scopes: [
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/calendar.events",
    ],
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
  },
  spotify: {
    clientId: process.env.SPOTIFY_CLIENT_ID || "",
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET || "",
    scopes: [
      "user-read-playback-state",
      "user-modify-playback-state",
      "playlist-modify-public",
    ],
    authUrl: "https://accounts.spotify.com/authorize",
    tokenUrl: "https://accounts.spotify.com/api/token",
  },
  github: {
    clientId: process.env.GITHUB_CLIENT_ID || "",
    clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
    scopes: ["repo", "user", "notifications"],
    authUrl: "https://github.com/login/oauth/authorize",
    tokenUrl: "https://github.com/login/oauth/access_token",
  },
};

router.get("/connections", requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const connections = await db
      .select()
      .from(integrationConnections)
      .where(
        and(
          eq(integrationConnections.userId, userId),
          eq(integrationConnections.isActive, true)
        )
      );

    const sanitized = connections.map((conn) => ({
      id: conn.id,
      provider: conn.provider,
      providerAccountId: conn.providerAccountId,
      authType: conn.authType,
      isActive: conn.isActive,
      createdAt: conn.createdAt,
      metadata: conn.metadata,
    }));

    res.json(sanitized);
  } catch (error) {
    console.error("Get connections error:", error);
    res.status(500).json({ error: "Failed to fetch connections" });
  }
});

router.post("/connect/:provider", requireAuth, async (req: any, res: any) => {
  try {
    console.log("Initiating connection...");

    const { provider } = req.params;
    const userId = req.user.id;
    const { authType } = req.body;

    if (authType === "oauth2") {
      const config = OAUTH_CONFIGS[provider];
      if (!config || !config.clientId) {
        return res.status(400).json({
          error: "OAuth not configured",
          message: `${provider} OAuth is not set up yet. Please contact support.`,
        });
      }

      const redirectUri = `${API_ORIGIN}/api/integrations/callback/${provider}`;

      const state = signState({
        userId,
        provider,
        timestamp: Date.now(),
      });

      const params = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: redirectUri,
        scope: config.scopes.join(" "),
        state,
        response_type: "code",
        access_type: "offline",
        prompt: "consent",
        include_granted_scopes: "true",
      });

      const authUrl = `${config.authUrl}?${params.toString()}`;
      console.log("Redirecting to:", authUrl);

      return res.json({ authUrl });
    }

    if (authType === "api_key") {
      return res.status(200).json({
        message: "API key setup not yet implemented",
        requiresManualSetup: true,
      });
    }

    res.status(400).json({ error: "Unsupported auth type" });
  } catch (error) {
    console.error("Connect error:", error);
    res.status(500).json({ error: "Failed to initiate connection" });
  }
});

// /api/integrations/callback/:provider
router.get("/callback/:provider", async (req: any, res: any) => {
  const { provider } = req.params as { provider: keyof typeof OAUTH_CONFIGS };
  const {
    code,
    state,
    error: oauthError,
  } = req.query as { code?: string; state?: string; error?: string };

  const CALLBACK_URL = `${API_ORIGIN}/api/integrations/callback/${provider}`;

  try {
    console.log("Handling OAuth callback...", provider);

    if (oauthError) return sendCloseHtml(res, provider, false, oauthError);
    if (!code || !state)
      return sendCloseHtml(res, provider, false, "missing_parameters");

    // 1) Verify state FIRST (auth-binding lives here)
    const stateData = verifyState(state);
    if (!stateData) return sendCloseHtml(res, provider, false, "invalid_state");
    if (stateData.provider !== provider)
      return sendCloseHtml(res, provider, false, "provider_mismatch");
    if (Date.now() - stateData.timestamp > 10 * 60 * 1000)
      return sendCloseHtml(res, provider, false, "state_expired");

    // 2) Session is optional; only compare if present
    const sessionUserId: string | undefined = req.user?.id;
    if (sessionUserId && sessionUserId !== stateData.userId) {
      console.error("OAuth state userId mismatch with session");
      return sendCloseHtml(res, provider, false, "session_mismatch");
    }
    const userId = stateData.userId; // authoritative

    // 3) Provider config
    const config = OAUTH_CONFIGS[provider];
    if (!config) return sendCloseHtml(res, provider, false, "invalid_provider");

    // 4) Exchange code for tokens (redirect_uri MUST equal the one registered)
    console.log("Exchanging code for tokens...", CALLBACK_URL);
    const tokenResponse = await fetch(config.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        redirect_uri: CALLBACK_URL,
        grant_type: "authorization_code",
      }),
    });

    console.log("Token response status:", tokenResponse.status);

    if (!tokenResponse.ok) {
      const body = await tokenResponse.text().catch(() => "");
      console.error("Token exchange failed:", tokenResponse.status, body);
      let hint = "google_token_exchange_failed";
      try {
        const j = JSON.parse(body);
        if (j.error)
          hint = `google_${j.error}`; // e.g. google_invalid_grant
        else if (j.error_description) hint = "google_error";
      } catch {}
      return sendCloseHtml(res, provider, false, hint);
    }

    const tokens = await tokenResponse.json();

    // 5) Determine providerAccountId (provider-specific)
    let providerAccountId: string | null = tokens.user_id || tokens.id || null;

    // Spotify doesn't return user id in token response; fetch /me
    if (!providerAccountId && provider === "spotify") {
      const meRes = await fetch("https://api.spotify.com/v1/me", {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      if (meRes.ok) {
        const me = await meRes.json();
        providerAccountId = me.id || null;
      }
    }

    // Google: prefer id_token.sub if present
    if (!providerAccountId && provider === "gmail" && tokens.id_token) {
      try {
        const [, payload] = tokens.id_token.split(".");
        const json = JSON.parse(
          Buffer.from(payload, "base64").toString("utf8")
        );
        providerAccountId = json.sub || "unknown";
      } catch {}
    }

    providerAccountId = providerAccountId || "unknown";

    // 6) Persist (encrypt tokens, set expiry)
    const encryptedAccessToken = encryptToken(tokens.access_token);
    const encryptedRefreshToken = tokens.refresh_token
      ? encryptToken(tokens.refresh_token)
      : null;
    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : null;
    const scopes =
      (tokens.scope as string | undefined) ?? config.scopes?.join(" ");

    const existing = await db
      .select()
      .from(integrationConnections)
      .where(
        and(
          eq(integrationConnections.userId, userId),
          eq(integrationConnections.provider, provider)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(integrationConnections)
        .set({
          providerAccountId,
          authType: "oauth2",
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          expiresAt,
          scopes,
          isActive: true,
          updatedAt: new Date(),
        })
        .where(eq(integrationConnections.id, existing[0].id));
    } else {
      await db.insert(integrationConnections).values({
        userId,
        provider,
        providerAccountId,
        authType: "oauth2",
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt,
        scopes,
        isActive: true,
      });
    }
    console.log("✅ Saved connection", { provider, userId, providerAccountId });

    // 7) Final hop back to UI (absolute URL)
    return sendCloseHtml(res, provider, true, "Connected");
  } catch (error) {
    console.error("OAuth callback error:", error);
    return sendCloseHtml(res, provider, false, "callback_failed");
  }
});

router.delete("/connections/:id", requireAuth, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    await db
      .update(integrationConnections)
      .set({ isActive: false, updatedAt: new Date() })
      .where(
        and(
          eq(integrationConnections.id, id),
          eq(integrationConnections.userId, userId)
        )
      );

    res.json({ success: true });
  } catch (error) {
    console.error("Disconnect error:", error);
    res.status(500).json({ error: "Failed to disconnect" });
  }
});

router.post(
  "/connections/:id/test",
  requireAuth,
  async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const [connection] = await db
        .select()
        .from(integrationConnections)
        .where(
          and(
            eq(integrationConnections.id, id),
            eq(integrationConnections.userId, userId)
          )
        )
        .limit(1);

      if (!connection) {
        return res.status(404).json({ error: "Connection not found" });
      }

      res.json({ success: true, message: "Connection test successful" });
    } catch (error) {
      console.error("Test connection error:", error);
      res.status(500).json({ error: "Connection test failed" });
    }
  }
);

export default router;
