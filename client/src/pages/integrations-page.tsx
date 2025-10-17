import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  Check,
  X,
  Mail,
  Calendar,
  Music,
  Cloud,
  MessageSquare,
  Github,
  Play,
  Zap,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
// Keep refs to the current flow
import { useRef } from "react";

const POPUP_NAME = "fxns-oauth";

interface IntegrationConnection {
  id: string;
  provider: string;
  providerAccountId: string;
  authType: string;
  isActive: boolean;
  createdAt: string;
  metadata?: any;
}

const AVAILABLE_INTEGRATIONS = [
  {
    id: "gmail",
    name: "Gmail",
    description: "Send and receive emails, manage inbox",
    icon: Mail,
    color: "text-red-500",
    authType: "oauth2",
    scopes: [
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/gmail.readonly",
    ],
  },
  {
    id: "google_calendar",
    name: "Google Calendar",
    description: "Create events, check availability, get reminders",
    icon: Calendar,
    color: "text-blue-500",
    authType: "oauth2",
    scopes: [
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/calendar.events",
    ],
  },
  {
    id: "spotify",
    name: "Spotify",
    description: "Control playback, create playlists, get recommendations",
    icon: Music,
    color: "text-green-500",
    authType: "oauth2",
    scopes: [
      "user-read-playback-state",
      "user-modify-playback-state",
      "playlist-modify-public",
    ],
  },
  {
    id: "openweather",
    name: "OpenWeather",
    description: "Get weather forecasts and alerts",
    icon: Cloud,
    color: "text-sky-500",
    authType: "api_key",
  },
  {
    id: "twilio",
    name: "Twilio",
    description: "Send SMS messages and make calls",
    icon: MessageSquare,
    color: "text-purple-500",
    authType: "api_key",
  },
  {
    id: "github",
    name: "GitHub",
    description: "Manage repos, issues, pull requests",
    icon: Github,
    color: "text-gray-800",
    authType: "oauth2",
    scopes: ["repo", "user", "notifications"],
  },
];

export default function IntegrationsPage() {
  const currentFlowId = useRef<string | null>(null);
  const currentPopup = useRef<Window | null>(null);
  const currentCleanup = useRef<(() => void) | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [connectingProvider, setConnectingProvider] = useState<string | null>(
    null
  );

  const { data: connections, isLoading } = useQuery<IntegrationConnection[]>({
    queryKey: ["/api/integrations/connections"],
  });

  // Allow callback messages from these origins.
  // Add/remove entries to match where your callback is hosted.
  const ALLOWED_MESSAGE_ORIGINS = new Set([
    window.location.origin, // e.g. https://localhost:4200
    "https://localhost:4200", // explicit
    "http://localhost:4200", // just in case
    "http://localhost:5001",
    "https://localhost:5001",
    "https://www.fxns.ca",
  ]);

  function startNewFlow(provider: string) {
    // Cancel any previous watcher/popup silently
    if (currentCleanup.current) {
      try {
        currentCleanup.current();
      } catch {}
    }
    if (currentPopup.current && !currentPopup.current.closed) {
      try {
        currentPopup.current.close();
      } catch {}
    }
    const flowId = `${provider}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
    currentFlowId.current = flowId;
    return flowId;
  }

  function openPopup(title: string) {
    const W = 520,
      H = 640;
    const topWin = window.top || window;
    const y = Math.max(0, (topWin.outerHeight - H) / 2 + (topWin.screenY || 0));
    const x = Math.max(0, (topWin.outerWidth - W) / 2 + (topWin.screenX || 0));
    const features = `width=${W},height=${H},left=${x},top=${y},resizable,scrollbars`;
    const popup = window.open("about:blank", POPUP_NAME, features);
    if (popup) {
      try {
        popup.focus();
        popup.document.open();
        popup.document.write(
          '<title>Connecting…</title><body style="font:14px system-ui;padding:16px">Connecting…</body>'
        );
        popup.document.close();
      } catch {}
    }
    return popup;
  }

  function waitForPopupCompletion(
    popup: Window,
    provider: string,
    flowId: string
  ) {
    return new Promise<{
      status: "success" | "error" | "closed";
      message?: string;
    }>((resolve) => {
      const START = Date.now(),
        MAX = 3 * 60 * 1000,
        TICK = 400;
      let resolved = false;

      const finish = (payload: {
        status: "success" | "error" | "closed";
        message?: string;
      }) => {
        if (resolved) return;
        resolved = true;
        cleanup();
        try {
          popup.close();
        } catch {}
        resolve(payload);
      };

      const onMsg = (ev: MessageEvent) => {
        console.log("Received postMessage", ev);
        if (!ALLOWED_MESSAGE_ORIGINS.has(ev.origin)) return;
        const d = ev.data || {};
        if (d.type !== "oauth_done") return;
        if (d.provider && d.provider !== provider) return;
        // Ignore messages from a previous flow
        if (flowId !== currentFlowId.current) return;
        finish({ status: d.ok ? "success" : "error", message: d.msg });
      };
      window.addEventListener("message", onMsg);

      const timer = window.setInterval(() => {
        // If a newer flow started, stop listening
        if (flowId !== currentFlowId.current) {
          console.log("A newer OAuth flow started; abandoning this one");
          finish({ status: "closed" });
          return;
        }

        try {
          const { origin, pathname, search, hash } = popup.location;
          if (
            origin === window.location.origin &&
            pathname.startsWith("/integrations")
          ) {
            const qs = new URLSearchParams(search);
            const ok = qs.get("success") === "connected";
            const err = qs.get("error");
            const marker = (hash || "").includes("fxns_oauth=done");
            if (ok || err || marker) {
              finish({ status: ok ? "success" : "error", message: err || undefined });
            }
            // else: landed on /integrations without params; keep polling
            return;
          }
          if (popup.closed) {
            console.log("Popup was closed by user");
            // give a 150ms grace for a late postMessage event that already went out
            setTimeout(() => {
              if (!resolved) finish({ status: "closed" });
              console.log("Popup closed");
            }, 150);
            return;
          }
        } catch {
          // still cross-origin; keep polling
        }

        if (Date.now() - START > MAX)
          finish({ status: "error", message: "timeout" });
      }, TICK);

      function cleanup() {
        window.removeEventListener("message", onMsg);
        window.clearInterval(timer);
        if (currentCleanup.current === cleanup) currentCleanup.current = null;
      }

      // register cleanup so a new flow can cancel this one
      currentCleanup.current = cleanup;
    });
  }

  const connectMutation = useMutation({
    mutationFn: async ({
      provider,
      popup,
      flowId,
    }: {
      provider: string;
      popup: Window | null;
      flowId: string;
    }) => {
      const integration = AVAILABLE_INTEGRATIONS.find(
        (i) => i.id === provider
      )!;

      const r = await fetch(`/api/integrations/connect/${provider}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "fetch",
        },
        credentials: "include",
        body: JSON.stringify({
          authType: integration.authType,
          scopes: integration.scopes,
        }),
      });
      if (!r.ok) {
        let msg = "Failed to connect";
        try {
          const e = await r.json();
          msg = e.message || msg;
        } catch {}
        throw new Error(msg);
      }

      const { authUrl } = await r.json();

      console.log("Opening auth URL:", authUrl);
      console.log("Popup window:", popup);

      if (flowId !== currentFlowId.current) {
        console.log("A newer OAuth flow started; abandoning this one (2)");
        // A newer attempt started; ignore this one
        return { status: "closed" as const };
      }

      if (popup) {
        popup.location.href = authUrl;
        const { status, message } = await waitForPopupCompletion(
          popup,
          provider,
          flowId
        );
        console.log("Popup completion result:", { status, message });
        return { status, message };
      } else {
        window.location.assign(authUrl);
        return { status: "success" as const };
      }
    },
    onSuccess: async ({ status, message }, { provider, flowId }) => {
      console.log("OAuth flow result:", { status, message });
      if (flowId !== currentFlowId.current) return; // ignore stale completion

      console.log("Current flow ID matches:", flowId);
      if (status === "success") {
        await queryClient.invalidateQueries({
          queryKey: ["/api/integrations/connections"],
        });
        toast({
          title: "Connected!",
          description: `Successfully connected to ${AVAILABLE_INTEGRATIONS.find((i) => i.id === provider)?.name}`,
        });
      } else if (status === "closed") {
        toast({
          title: "Popup closed",
          description: "OAuth window was closed before completion.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Connection failed",
          description: message || "OAuth did not complete successfully.",
          variant: "destructive",
        });
      }

      // clear only if still the current flow
      if (flowId === currentFlowId.current) {
        currentFlowId.current = null;
        currentPopup.current = null;
        setConnectingProvider(null);
      }
    },
    onError: (error: Error, { flowId }) => {
      console.error("Connection error:", error);
      if (flowId !== currentFlowId.current) return; // ignore stale
      toast({
        title: "Connection failed",
        description: error.message,
        variant: "destructive",
      });
      currentFlowId.current = null;
      currentPopup.current = null;
      setConnectingProvider(null);
    },
    onSettled: (_d, _e, { flowId }) => {
      // if something else already started, don't touch; otherwise, clean up
      if (flowId === currentFlowId.current) {
        console.log("Cleaning up after OAuth flow");
        currentFlowId.current = null;
        currentPopup.current = null;
        setConnectingProvider(null);
      }
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async (connectionId: string) => {
      const response = await fetch(
        `/api/integrations/connections/${connectionId}`,
        {
          method: "DELETE",
          credentials: "include",
          headers: { "X-Requested-With": "fetch" },
        }
      );
      if (!response.ok) {
        let msg = "Failed to disconnect";
        try {
          const e = await response.json();
          msg = e.message || msg;
        } catch {}
        throw new Error(msg);
      }
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["/api/integrations/connections"],
      });
      toast({
        title: "Disconnected",
        description: "Integration connection removed",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Disconnect failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const testMutation = useMutation({
    mutationFn: async (connectionId: string) => {
      const response = await fetch(
        `/api/integrations/connections/${connectionId}/test`,
        {
          method: "POST",
          credentials: "include",
          headers: { "X-Requested-With": "fetch" },
        }
      );
      if (!response.ok) {
        let msg = "Connection test failed";
        try {
          const e = await response.json();
          msg = e.message || msg;
        } catch {}
        throw new Error(msg);
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Connection works!",
        description: "Successfully tested the integration",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Connection test failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getConnectionForProvider = (providerId: string) =>
    connections?.find((c) => c.provider === providerId && c.isActive);

  const handleConnect = (provider: string) => {
    // ⬇️ single-flight guard
    if (currentFlowId.current) {
      // focus existing popup if it exists
      if (currentPopup.current && !currentPopup.current.closed) {
        try {
          currentPopup.current.focus();
        } catch {}
      }
      return;
    }

    setConnectingProvider(provider);
    const flowId = startNewFlow(provider); // (your helper)
    const integration = AVAILABLE_INTEGRATIONS.find((i) => i.id === provider);
    const popup = openPopup(integration?.name ?? provider) || null;
    (currentPopup as any).currentRef = popup;
    currentPopup.current = popup;
    connectMutation.mutate({ provider, popup, flowId });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Integrations
          </h1>
          <p className="text-gray-600">
            Connect your favorite services to automate your workflows
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {AVAILABLE_INTEGRATIONS.map((integration) => {
              const connection = getConnectionForProvider(integration.id);
              const isConnected = !!connection;
              const Icon = integration.icon;

              return (
                <Card
                  key={integration.id}
                  className="hover:shadow-lg transition-shadow"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center ${integration.color}`}
                        >
                          <Icon className="w-6 h-6" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">
                            {integration.name}
                          </CardTitle>
                          {isConnected && (
                            <Badge variant="secondary" className="mt-1">
                              <Check className="w-3 h-3 mr-1" />
                              Connected
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="mb-4">
                      {integration.description}
                    </CardDescription>

                    <div className="flex flex-col gap-2">
                      {isConnected ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              connection && testMutation.mutate(connection.id)
                            }
                            disabled={testMutation.isPending}
                          >
                            {testMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <Play className="h-4 w-4 mr-2" />
                            )}
                            Test Connection
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              connection &&
                              disconnectMutation.mutate(connection.id)
                            }
                            disabled={disconnectMutation.isPending}
                            className="text-red-600 hover:text-red-700"
                          >
                            {disconnectMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <X className="h-4 w-4 mr-2" />
                            )}
                            Disconnect
                          </Button>
                        </>
                      ) : (
                        <Button
                          type="button" // ⬅️ prevent implicit form submit
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleConnect(integration.id);
                          }}
                          disabled={
                            connectingProvider === integration.id ||
                            !!currentFlowId.current
                          } // ⬅️ also disable if flow running
                          className="w-full"
                        >
                          {connectingProvider === integration.id ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Zap className="h-4 w-4 mr-2" />
                          )}
                          Connect
                        </Button>
                      )}
                    </div>

                    {connection && (
                      <div className="mt-3 text-xs text-gray-500">
                        Connected{" "}
                        {new Date(connection.createdAt).toLocaleDateString()}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <Alert className="mt-8">
          <AlertDescription>
            <strong>Need help?</strong> Each integration requires specific
            permissions. Click Connect to authorize fxns to access your account
            securely.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
