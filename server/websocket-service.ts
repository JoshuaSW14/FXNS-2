import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";
import { parse as parseCookie } from "cookie";
import { storage } from "./storage";
import connectPg from "connect-pg-simple";
import session from "express-session";
import signature from "cookie-signature";

declare global {
  // eslint-disable-next-line no-var
  var __FXNS_WSS__: WebSocketServer | undefined;
}

export function getOrCreateWss(server: Server) {
  if (!global.__FXNS_WSS__) {
    global.__FXNS_WSS__ = new WebSocketServer({
      server,
      path: "/api/ws",
      clientTracking: true,
      perMessageDeflate: false, // avoid extra complexity in dev
    });
    // attach handlers ONCE here
  }
  return global.__FXNS_WSS__;
}

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  userEmail?: string;
  isAlive?: boolean;
}

interface AnalyticsUpdate {
  type:
    | "tool_run"
    | "tool_view"
    | "user_registration"
    | "dashboard_metrics"
    | "connection_confirmed"
    | "pong"
    | "analytics_subscription_confirmed";
  data: any;
  userId?: string;
  timestamp: string;
}

class WebSocketService {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, Set<AuthenticatedWebSocket>> = new Map();
  private pingInterval: NodeJS.Timeout | null = null;

  // add next to your existing fields
  private heartbeatTimer: NodeJS.Timeout | null = null;

  // helper to iterate every client once
  private *clientsFlat(): Iterable<AuthenticatedWebSocket> {
    for (const set of this.clients.values()) {
      for (const ws of set) {
        yield ws;
      }
    }
  }

  initialize(server: Server): void {
    console.log("🔗 Initializing WebSocket server...");
    this.wss = getOrCreateWss(server); // ✅ reuse one instance in dev

    // Only attach handlers once (guard with a symbol or check a flag)
    this.wss.removeAllListeners("connection");
    this.wss.on("connection", (ws: AuthenticatedWebSocket, req) => {
      ws.isAlive = true;
      ws.on("pong", () => {
        ws.isAlive = true;
      });
      this.handleConnection(ws, req);
    });

    this.startHeartbeat();
    console.log("✅ WebSocket server initialized on /api/ws");
  }

  // websocket-service.ts
  private async verifyClient(info: any): Promise<boolean> {
    try {
      const cookies = info.req.headers.cookie;
      if (!cookies) return false;

      const parsedCookies = parseCookie(cookies);
      const raw = parsedCookies["connect.sid"];
      if (!raw) return false;

      // Unsign the cookie to get the real sid
      let sid = raw;
      if (raw.startsWith("s:")) {
        const unsigned = signature.unsign(
          raw.slice(2),
          process.env.SESSION_SECRET!
        );
        if (!unsigned) {
          console.log("🔒 WebSocket rejected: bad session signature");
          return false;
        }
        sid = unsigned;
      }

      const sessionData = await this.getSessionFromDatabase(sid);
      if (!sessionData || !sessionData.passport?.user) {
        console.log("🔒 WebSocket rejected: invalid session");
        return false;
      }

      // 🔧 Normalize the user
      const passportUser = sessionData.passport.user as unknown;
      let normalized: { id: string; email?: string } | null = null;

      if (typeof passportUser === "string") {
        normalized = { id: passportUser };
      } else if (passportUser && typeof (passportUser as any).id === "string") {
        const u = passportUser as { id: string; email?: string };
        normalized = { id: u.id, email: u.email };
      }

      if (!normalized?.id) {
        console.log("🔒 WebSocket rejected: session user missing id");
        return false;
      }

      // (Optional) enrich email if missing:
      // try { const dbUser = await storage.getUserById(normalized.id); normalized.email = dbUser?.email ?? normalized.email; } catch {}

      info.req.authenticatedUser = normalized;
      return true;
    } catch (err) {
      console.warn("🔒 WebSocket auth error", err);
      return false;
    }
  }

  private async getSessionFromDatabase(sessionId: string): Promise<any> {
    try {
      const { pool } = await import("./db");
      console.log("WS lookup sid len:", sessionId.length);
      // Query the express session table created by connect-pg-simple
      const result = await pool.query({
        text: "SELECT sess FROM session WHERE sid = $1",
        values: [sessionId],
      });

      console.log("WS session rows:", result.rows.length);

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0].sess;
    } catch (error) {
      console.warn("Failed to query session from database:", error);
      return null;
    }
  }

  private handleConnection(ws: AuthenticatedWebSocket, req: any): void {
    const user = req.authenticatedUser as
      | { id?: string; email?: string }
      | undefined;

    if (!user?.id) {
      console.warn("🔒 WebSocket connection without valid user id");
      ws.close(1008, "Authentication required");
      return;
    }

    const userId = user.id!;
    const userEmail = user.email;

    ws.userId = userId;
    ws.userEmail = userEmail;
    ws.isAlive = true;

    console.log(
      `🔗 WebSocket client connected: ${userEmail ?? "no-email"} (${userId})`
    );

    if (!this.clients.has(userId)) this.clients.set(userId, new Set());
    this.clients.get(userId)!.add(ws);

    // Handle client messages
    ws.on("message", (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString());
        this.handleClientMessage(ws, data);
      } catch (error) {
        console.warn("⚠️ Invalid WebSocket message:", error);
      }
    });

    // Handle client disconnect
    ws.on("close", (code, reason) => {
      const msg = reason?.toString() || "";
      console.warn(
        `🔗 WebSocket client disconnected: ${ws.userId} code=${code} reason="${msg}"`
      );
      this.removeClient(ws.userId, ws);
    });

    ws.on("error", (err) => {
      console.error(`🧨 WS error for ${ws.userId}:`, err);
    });

    // Handle pong responses
    ws.on("pong", () => {
      ws.isAlive = true;
      console.debug(`PONG from ${ws.userEmail ?? ws.userId}`);
    });

    // Send initial connection confirmation
    this.sendToClient(ws, {
      type: "connection_confirmed",
      data: { userId, timestamp: new Date().toISOString() },
      timestamp: new Date().toISOString(),
    });
  }

  private async handleClientMessage(
    ws: AuthenticatedWebSocket,
    message: any
  ): Promise<void> {
    switch (message.type) {
      case "ping":
        this.sendToClient(ws, {
          type: "pong",
          data: { timestamp: new Date().toISOString() },
          timestamp: new Date().toISOString(),
        });
        break;

      case "subscribe_analytics":
        // Client is requesting to subscribe to analytics updates
        this.sendToClient(ws, {
          type: "analytics_subscription_confirmed",
          data: { subscribed: true },
          timestamp: new Date().toISOString(),
        });
        break;

      case "refresh_analytics":
        // Client requesting fresh analytics data
        try {
          await this.handleAnalyticsRefresh(ws);
        } catch (error) {
          console.warn(
            `Failed to refresh analytics for user ${ws.userId}:`,
            error
          );
        }
        break;

      default:
        console.warn(`⚠️ Unknown WebSocket message type: ${message.type}`);
    }
  }

  private removeClient(
    userId: string | undefined,
    ws: AuthenticatedWebSocket
  ): void {
    if (!userId) return;
    const userClients = this.clients.get(userId);
    if (userClients) {
      userClients.delete(ws);
      if (userClients.size === 0) this.clients.delete(userId);
    }
  }

  private sendToClient(
    ws: AuthenticatedWebSocket,
    data: AnalyticsUpdate
  ): void {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(data));
      } catch (error) {
        console.warn("⚠️ Failed to send WebSocket message:", error);
      }
    }
  }

  // Broadcast analytics update to specific user
  broadcastToUser(userId: string | undefined, update: AnalyticsUpdate): void {
    if (!userId) return;
    const userClients = this.clients.get(userId);
    if (userClients && userClients.size > 0) {
      userClients.forEach((ws) => {
        this.sendToClient(ws, update);
      });
      console.log(
        `📡 Broadcasted ${update.type} to ${userClients.size} client(s) for user ${userId}`
      );
    }
  }

  // Broadcast to all connected clients (for global events)
  broadcastToAll(update: AnalyticsUpdate): void {
    let totalClients = 0;
    this.clients.forEach((userClients) => {
      userClients.forEach((ws) => {
        this.sendToClient(ws, update);
        totalClients++;
      });
    });
    if (totalClients > 0) {
      console.log(`📡 Broadcasted ${update.type} to ${totalClients} client(s)`);
    }
  }

  // Broadcast tool usage event
  broadcastToolUsage(
    userId: string,
    toolId: string,
    executionTime: number,
    success: boolean
  ): void {
    const update: AnalyticsUpdate = {
      type: "tool_run",
      data: {
        toolId,
        executionTime,
        success,
        userId,
      },
      userId,
      timestamp: new Date().toISOString(),
    };

    // Send to the user who ran the tool
    this.broadcastToUser(userId, update);
  }

  // Broadcast dashboard metrics update
  broadcastDashboardMetrics(userId: string, metrics: any): void {
    const update: AnalyticsUpdate = {
      type: "dashboard_metrics",
      data: metrics,
      userId,
      timestamp: new Date().toISOString(),
    };

    this.broadcastToUser(userId, update);
  }

  // Handle analytics refresh request from client
  private async handleAnalyticsRefresh(
    ws: AuthenticatedWebSocket
  ): Promise<void> {
    if (!ws.userId || ws.userId === "anonymous") {
      console.warn("Cannot refresh analytics for anonymous user");
      return;
    }

    try {
      // Fetch fresh analytics data for the user
      const analyticsResponse = await fetch(
        `${process.env.BACKEND_URL || 'https://localhost:5001'}/api/analytics/dashboard`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-Requested-With": "fetch",
            // Note: In a real scenario, you'd need to handle authentication here
          },
          credentials: "include",
        }
      );

      if (analyticsResponse.ok) {
        const analyticsData = await analyticsResponse.json();

        // Send fresh dashboard metrics to the client
        this.sendToClient(ws, {
          type: "dashboard_metrics",
          data: analyticsData.data,
          userId: ws.userId,
          timestamp: new Date().toISOString(),
        });

        console.log(`📊 Sent fresh analytics data to user ${ws.userId}`);
      } else {
        console.warn(
          `Failed to fetch analytics data: ${analyticsResponse.status}`
        );
      }
    } catch (error) {
      console.warn("Error fetching analytics data for refresh:", error);
    }
  }

  // Start heartbeat to keep connections alive
  private startHeartbeat() {
    const intervalMs = 30000; // 30s is a sweet spot
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = setInterval(() => {
      for (const ws of this.clientsFlat()) {
        if (ws.isAlive === false) {
          console.warn("💔 Terminating stale WS", ws.userId);
          ws.terminate(); // triggers 'close' with 1006
          continue;
        }
        ws.isAlive = false;
        try {
          ws.ping();
        } catch {}
      }
    }, intervalMs);
  }

  // Get connection statistics
  getStats(): { totalConnections: number; uniqueUsers: number } {
    let totalConnections = 0;
    this.clients.forEach((userClients) => {
      totalConnections += userClients.size;
    });

    return {
      totalConnections,
      uniqueUsers: this.clients.size,
    };
  }

  // Cleanup on server shutdown
  shutdown(): void {
    console.log("🛑 Shutting down WebSocket service...");

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    // Close all client connections
    this.clients.forEach((userClients) => {
      userClients.forEach((ws) => {
        ws.close(1000, "Server shutdown");
      });
    });

    if (this.wss) {
      this.wss.close(() => {
        console.log("✅ WebSocket server closed");
      });
    }

    this.clients.clear();
  }
}

export const websocketService = new WebSocketService();
