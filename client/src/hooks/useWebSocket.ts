import { useEffect, useRef, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

interface WebSocketMessage {
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

interface UseWebSocketReturn {
  isConnected: boolean;
  lastMessage: WebSocketMessage | null;
  sendMessage: (message: any) => void;
  reconnect: () => void;
  connectionAttempts: number;
}

interface UseWebSocketOptions {
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  enabled?: boolean;
}

declare global {
  interface Window {
    __FXNS_WS__?: WebSocket | null;
    __FXNS_WS_MANUAL_CLOSE__?: boolean;
    __FXNS_WS_RECONNECT_TIMER__?: number | null;
  }
}

export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const {
    onMessage,
    onConnect,
    onDisconnect,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
    enabled = true,
  } = options;

  const queryClient = useQueryClient();

  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [connectionAttempts, setConnectionAttempts] = useState(0);

  // Single source of truth in the tab
  const getWS = () => window.__FXNS_WS__ ?? null;
  const setWS = (sock: WebSocket | null) => { window.__FXNS_WS__ = sock; };

  const clearReconnectTimer = () => {
    if (window.__FXNS_WS_RECONNECT_TIMER__ != null) {
      clearTimeout(window.__FXNS_WS_RECONNECT_TIMER__!);
      window.__FXNS_WS_RECONNECT_TIMER__ = null;
    }
  };

  const connect = useCallback(() => {
    if (!enabled) return;

    const existing = getWS();
    if (existing && (existing.readyState === WebSocket.OPEN || existing.readyState === WebSocket.CONNECTING || existing.readyState === WebSocket.CLOSING)) {
      // Already have a socket in flight or open
      ws.current = existing;
      return;
    }

    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/api/ws`;

      const sock = new WebSocket(wsUrl);
      setWS(sock);
      ws.current = sock;
      window.__FXNS_WS_MANUAL_CLOSE__ = false;

      sock.onopen = () => {
        console.log("✅ WebSocket connected");
        setIsConnected(true);
        setConnectionAttempts(0);
        onConnect?.();

        // Ask server to start analytics stream
        sock.send(JSON.stringify({
          type: "subscribe_analytics",
          timestamp: new Date().toISOString(),
        }));
      };

      sock.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setLastMessage(message);

          switch (message.type) {
            case "tool_run":
              queryClient.invalidateQueries({ queryKey: ["/api/analytics/dashboard"] });
              queryClient.invalidateQueries({ queryKey: ["/api/me/dashboard"] });
              break;
            case "dashboard_metrics":
              queryClient.invalidateQueries({ queryKey: ["/api/analytics/dashboard"] });
              queryClient.invalidateQueries({ queryKey: ["/api/analytics/engagement"] });
              break;
            case "connection_confirmed":
              console.log("🔗 WebSocket connection confirmed:", message.data);
              break;
            default:
              // If your server emits a JSON 'pong', you can handle it too.
              // Browser auto-responds to WS-level ping/pong. No JSON ping needed here.
              break;
          }

          onMessage?.(message);
        } catch (err) {
          console.warn("Failed to parse WebSocket message:", err);
        }
      };

      sock.onclose = (event) => {
        console.log("🔗 WebSocket disconnected:", event.code, event.reason);
        setIsConnected(false);
        onDisconnect?.();

        // if we manually closed, don't reconnect
        if (window.__FXNS_WS_MANUAL_CLOSE__) return;

        // normal close (1000) – don't auto-reconnect
        if (event.code === 1000) return;

        // exponential backoff; compute from next attempt value
        setConnectionAttempts((prev) => {
          const next = prev + 1;
          if (!enabled || next > maxReconnectAttempts) return prev;

          const delay = Math.min(reconnectInterval * Math.pow(2, prev), 30000);
          console.log(`🔄 Reconnect in ${delay}ms (attempt ${next}/${maxReconnectAttempts})`);

          clearReconnectTimer();
          window.__FXNS_WS_RECONNECT_TIMER__ = window.setTimeout(() => {
            connect();
          }, delay);

          return next;
        });
      };

      sock.onerror = (error) => {
        console.error("❌ WebSocket error:", error);
      };
    } catch (error) {
      console.error("Failed to create WebSocket connection:", error);
    }
  }, [enabled, onConnect, onDisconnect, onMessage, queryClient, reconnectInterval, maxReconnectAttempts]);

  const disconnect = useCallback(() => {
    clearReconnectTimer();
    const sock = getWS();
    if (sock && sock.readyState === WebSocket.OPEN) {
      window.__FXNS_WS_MANUAL_CLOSE__ = true;
      sock.close(1000, "Manual disconnect");
    } else if (sock && (sock.readyState === WebSocket.CONNECTING || sock.readyState === WebSocket.CLOSING)) {
      window.__FXNS_WS_MANUAL_CLOSE__ = true;
      try { sock.close(1000, "Manual disconnect"); } catch {}
    }
    setWS(null);
    ws.current = null;
  }, []);

  const sendMessage = useCallback((message: any) => {
    const sock = getWS();
    if (sock?.readyState === WebSocket.OPEN) {
      sock.send(JSON.stringify({ ...message, timestamp: new Date().toISOString() }));
    } else {
      console.warn("WebSocket is not connected");
    }
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    setConnectionAttempts(0);
    setTimeout(connect, 100);
  }, [disconnect, connect]);

  useEffect(() => {
    if (enabled) connect();
    return () => disconnect();
  }, [enabled, connect, disconnect]);

  return { isConnected, lastMessage, sendMessage, reconnect, connectionAttempts };
}
