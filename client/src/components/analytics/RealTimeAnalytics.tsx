import React, { useEffect, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wifi, WifiOff, RefreshCw, Activity } from 'lucide-react';
import { useWebSocket } from '@/hooks/useWebSocket';

interface RealTimeAnalyticsProps {
  onUpdate?: (data: any) => void;
  enableAutoRefresh?: boolean;
  refreshInterval?: number; // milliseconds
}

interface ConnectionStatus {
  connected: boolean;
  lastUpdate: Date | null;
  attempts: number;
  liveUpdates: number;
}

export default function RealTimeAnalytics({
  onUpdate,
  enableAutoRefresh = true,
  refreshInterval = 30000 // 30 seconds
}: RealTimeAnalyticsProps) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<ConnectionStatus>({
    connected: false,
    lastUpdate: null,
    attempts: 0,
    liveUpdates: 0
  });

  // WebSocket connection for real-time updates
  const { isConnected, lastMessage, sendMessage, reconnect, connectionAttempts } = useWebSocket({
    enabled: enableAutoRefresh,
    onMessage: (message) => {
      if (message.type === 'tool_run' || message.type === 'dashboard_metrics') {
        setStatus(prev => ({
          ...prev,
          lastUpdate: new Date(),
          liveUpdates: prev.liveUpdates + 1
        }));

        // Call callback if provided
        if (onUpdate && message.data) {
          onUpdate(message.data);
        }
      }
    },
    onConnect: () => {
      setStatus(prev => ({
        ...prev,
        connected: true,
        attempts: 0
      }));
    },
    onDisconnect: () => {
      setStatus(prev => ({
        ...prev,
        connected: false,
        attempts: connectionAttempts
      }));
    },
    maxReconnectAttempts: 5,
    reconnectInterval: 3000
  });

  // Fallback polling for when WebSocket is not available
  const updateAnalyticsData = useCallback(async () => {
    try {
      // Refresh analytics queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['/api/analytics/dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/analytics/engagement'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/me/dashboard'] })
      ]);

      if (!isConnected) {
        setStatus(prev => ({
          ...prev,
          lastUpdate: new Date(),
          attempts: 0
        }));
      }

      if (onUpdate && !isConnected) {
        // Only fetch if WebSocket is not connected (fallback)
        const response = await fetch('/api/analytics/dashboard', {
          credentials: 'include',
          headers: { 'X-Requested-With': 'fetch' }
        });
        if (response.ok) {
          const data = await response.json();
          onUpdate(data);
        }
      }
    } catch (error) {
      console.warn('Failed to update analytics data:', error);
      if (!isConnected) {
        setStatus(prev => ({
          ...prev,
          attempts: prev.attempts + 1
        }));
      }
    }
  }, [queryClient, onUpdate, isConnected]);

  // Update status based on WebSocket connection
  useEffect(() => {
    setStatus(prev => ({
      ...prev,
      connected: isConnected,
      attempts: connectionAttempts
    }));
  }, [isConnected, connectionAttempts]);

  // Fallback polling when WebSocket is disconnected
  useEffect(() => {
    if (!enableAutoRefresh || isConnected) return;

    const interval = setInterval(() => {
      updateAnalyticsData();
    }, refreshInterval);

    // Initial update if WebSocket is not connected
    if (!isConnected) {
      updateAnalyticsData();
    }

    return () => clearInterval(interval);
  }, [enableAutoRefresh, refreshInterval, updateAnalyticsData, isConnected]);

  const handleManualRefresh = () => {
    if (isConnected) {
      // Send a request to refresh data via WebSocket
      sendMessage({ type: 'refresh_analytics' });
    } else {
      // Fallback to HTTP refresh
      updateAnalyticsData();
    }
    
    // Also try to reconnect WebSocket if disconnected
    if (!isConnected) {
      reconnect();
    }
  };

  const getStatusColor = () => {
    if (isConnected) return 'bg-green-100 text-green-800 border-green-200';
    if (status.attempts > 0) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getStatusIcon = () => {
    if (isConnected) return <Wifi className="h-3 w-3" />;
    if (status.attempts > 0) return <WifiOff className="h-3 w-3" />;
    return <Activity className="h-3 w-3 animate-pulse" />;
  };

  const getStatusText = () => {
    if (isConnected) {
      const updates = status.liveUpdates > 0 ? ` (${status.liveUpdates} live)` : '';
      return status.lastUpdate 
        ? `Live ${status.lastUpdate.toLocaleTimeString()}${updates}`
        : 'Real-time connected';
    }
    if (status.attempts > 0) {
      return `Reconnecting... (${status.attempts}/5)`;
    }
    return 'Connecting...';
  };

  return (
    <div className="flex items-center gap-3">
      <Badge variant="outline" className={`flex items-center gap-1 ${getStatusColor()}`}>
        {getStatusIcon()}
        <span className="text-xs">
          {getStatusText()}
        </span>
      </Badge>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={handleManualRefresh}
        className="h-8 px-2"
        title="Refresh analytics data"
      >
        <RefreshCw className="h-4 w-4" />
      </Button>
      
      {enableAutoRefresh && (
        <span className="text-xs text-muted-foreground">
          {isConnected 
            ? 'Real-time updates' 
            : `Polling every ${Math.round(refreshInterval / 1000)}s`
          }
        </span>
      )}
    </div>
  );
}