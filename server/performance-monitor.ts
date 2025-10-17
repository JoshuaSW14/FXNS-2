import { performance } from 'perf_hooks';

interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  metadata?: any;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics = 1000;

  // Start timing an operation
  start(name: string): () => void {
    const startTime = performance.now();
    
    return (metadata?: any) => {
      const duration = performance.now() - startTime;
      this.addMetric(name, duration, metadata);
    };
  }

  // Add a metric
  private addMetric(name: string, duration: number, metadata?: any): void {
    this.metrics.push({
      name,
      duration,
      timestamp: Date.now(),
      metadata
    });

    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  // Get performance statistics
  getStats(name?: string): {
    count: number;
    avg: number;
    min: number;
    max: number;
    recent: number; // Last 5 minutes
  } {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    let filteredMetrics = this.metrics;

    if (name) {
      filteredMetrics = this.metrics.filter(m => m.name === name);
    }

    if (filteredMetrics.length === 0) {
      return { count: 0, avg: 0, min: 0, max: 0, recent: 0 };
    }

    const durations = filteredMetrics.map(m => m.duration);
    const recentMetrics = filteredMetrics.filter(m => m.timestamp > fiveMinutesAgo);

    return {
      count: filteredMetrics.length,
      avg: durations.reduce((a, b) => a + b, 0) / durations.length,
      min: Math.min(...durations),
      max: Math.max(...durations),
      recent: recentMetrics.length
    };
  }

  // Get all available metric names
  getMetricNames(): string[] {
    return Array.from(new Set(this.metrics.map(m => m.name)));
  }

  // Get slow operations (above threshold)
  getSlowOperations(thresholdMs: number = 1000): PerformanceMetric[] {
    return this.metrics
      .filter(m => m.duration > thresholdMs)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 50); // Top 50 slow operations
  }

  // Clear old metrics
  cleanup(): void {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    this.metrics = this.metrics.filter(m => m.timestamp > oneHourAgo);
  }

  // Get performance report
  getReport(): {
    summary: any;
    slowOperations: PerformanceMetric[];
    topOperations: Array<{ name: string; stats: any }>;
  } {
    const metricNames = this.getMetricNames();
    const topOperations = metricNames
      .map(name => ({ name, stats: this.getStats(name) }))
      .sort((a, b) => b.stats.recent - a.stats.recent)
      .slice(0, 10);

    return {
      summary: {
        totalMetrics: this.metrics.length,
        uniqueOperations: metricNames.length,
        timeRange: this.metrics.length > 0 ? {
          oldest: Math.min(...this.metrics.map(m => m.timestamp)),
          newest: Math.max(...this.metrics.map(m => m.timestamp))
        } : { oldest: 0, newest: 0 }
      },
      slowOperations: this.getSlowOperations(),
      topOperations
    };
  }
}

// Express middleware for automatic route performance monitoring
export function performanceMiddleware(monitor: PerformanceMonitor) {
  return (req: any, res: any, next: any) => {
    const routeName = `${req.method} ${req.route?.path || req.path}`;
    const endTimer = monitor.start(routeName);

    // Store original end method
    const originalEnd = res.end;
    
    res.end = function(chunk?: any, encoding?: any) {
      endTimer({
        status: res.statusCode,
        userId: req.user?.id,
        userAgent: req.get('User-Agent')
      });
      return originalEnd.call(this, chunk, encoding);
    };

    next();
  };
}

// Database query performance monitoring
export function dbQueryMonitor(monitor: PerformanceMonitor) {
  return {
    async time<T>(operation: string, query: () => Promise<T>): Promise<T> {
      const endTimer = monitor.start(`db:${operation}`);
      try {
        const result = await query();
        endTimer({ success: true, resultSize: Array.isArray(result) ? result.length : 1 });
        return result;
      } catch (error) {
        endTimer({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
        throw error;
      }
    }
  };
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// Cleanup task - run every hour
setInterval(() => {
  performanceMonitor.cleanup();
}, 60 * 60 * 1000);