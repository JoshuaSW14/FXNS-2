import { LRUCache } from 'lru-cache';

// In-memory cache for frequently accessed data
interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  max?: number; // Maximum items
}

class CacheService {
  private cache: LRUCache<string, any>;
  
  constructor(options: CacheOptions = {}) {
    this.cache = new LRUCache({
      max: options.max || 1000,
      ttl: options.ttl || 5 * 60 * 1000, // 5 minutes default
    });
  }

  get<T>(key: string): T | undefined {
    return this.cache.get(key);
  }

  set(key: string, value: any, ttl?: number): void {
    this.cache.set(key, value, { ttl });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Cache keys for different data types
  keys = {
    plans: 'subscription:plans',
    publicFxns: (page: number) => `fxns:public:${page}`,
    fxnStats: (id: string) => `fxn:stats:${id}`,
    userUsage: (userId: string) => `user:usage:${userId}`,
    analytics: (userId: string) => `analytics:${userId}`,
    apiLimits: (userId: string) => `api:limits:${userId}`,
    // Discovery queries
    discoverySearch: (category?: string, search?: string, sort?: string, limit?: number, offset?: number, tags?: string) => 
      `discovery:search:${category || 'all'}:${search || ''}:${sort || 'relevance'}:${limit || 20}:${offset || 0}:${tags || ''}`,
    discoveryTrending: (limit?: number) => `discovery:trending:${limit || 10}`,
    discoveryPopular: (limit?: number) => `discovery:popular:${limit || 10}`,
    discoveryRecent: (limit?: number) => `discovery:recent:${limit || 10}`,
    fxnRatings: (fxnId: string) => `discovery:ratings:${fxnId}`,
    fxnReviews: (fxnId: string) => `discovery:reviews:${fxnId}`,
  };

  // Cache invalidation patterns
  invalidateUser(userId: string): void {
    this.delete(this.keys.userUsage(userId));
    this.delete(this.keys.analytics(userId));
    this.delete(this.keys.apiLimits(userId));
  }

  invalidateFxns(): void {
    // Clear all fxn-related cache entries
    for (const key of Array.from(this.cache.keys())) {
      if (key.startsWith('fxns:') || key.startsWith('fxn:')) {
        this.delete(key);
      }
    }
  }

  invalidatePlans(): void {
    this.delete(this.keys.plans);
  }

  // Invalidate all discovery caches when tools/ratings change
  invalidateDiscovery(): void {
    for (const key of Array.from(this.cache.keys())) {
      if (key.startsWith('discovery:')) {
        this.delete(key);
      }
    }
  }

  // Invalidate specific tool ratings/reviews
  invalidateToolRatings(fxnId: string): void {
    this.delete(this.keys.fxnRatings(fxnId));
    this.delete(this.keys.fxnReviews(fxnId));
    // Also invalidate discovery lists since they include ratings
    this.invalidateDiscovery();
  }

  // Invalidate marketplace caches
  invalidateMarketplace(): void {
    for (const key of Array.from(this.cache.keys())) {
      if (key.startsWith('marketplace:')) {
        this.delete(key);
      }
    }
  }

  // Invalidate featured tools cache
  // TODO: Call this when admin updates featuredTools (create/update/reorder/expire)
  invalidateFeaturedTools(): void {
    this.delete('marketplace:featured');
  }

  // Invalidate bestsellers cache (call when purchases are made)
  invalidateBestsellers(): void {
    this.delete('marketplace:bestsellers');
  }
}

// Create cache instances for different use cases with optimized TTLs
export const appCache = new CacheService({
  max: 1000,
  ttl: 10 * 60 * 1000, // 10 minutes for general app data (increased from 5)
});

export const userCache = new CacheService({
  max: 500,
  ttl: 5 * 60 * 1000, // 5 minutes for user-specific data (increased from 2)
});

export const analyticsCache = new CacheService({
  max: 200,
  ttl: 15 * 60 * 1000, // 15 minutes for analytics data (increased from 10)
});

export const staticCache = new CacheService({
  max: 100,
  ttl: 30 * 60 * 1000, // 30 minutes for static/config data
});

export const discoveryCache = new CacheService({
  max: 500, // Increased capacity for more cached queries
  ttl: 15 * 60 * 1000, // 15 minutes for discovery queries (increased from 3)
});

// Cache middleware for Express routes (only caches 2xx responses)
export function cacheMiddleware(cacheInstance: CacheService, keyFn: (req: any) => string, ttl?: number) {
  return (req: any, res: any, next: any) => {
    const key = keyFn(req);
    const cached = cacheInstance.get(key);
    
    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      return res.json(cached);
    }
    
    // Store original json method
    const originalJson = res.json;
    
    // Override json method to cache only successful responses
    res.json = function(data: any) {
      // Only cache 2xx status codes
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cacheInstance.set(key, data, ttl);
        res.setHeader('X-Cache', 'MISS');
      } else {
        res.setHeader('X-Cache', 'SKIP');
      }
      return originalJson.call(this, data);
    };
    
    next();
  };
}

// HTTP cache headers for static content
export function setStaticCacheHeaders(res: any, maxAge: number = 86400) {
  res.setHeader('Cache-Control', `public, max-age=${maxAge}, immutable`);
  res.setHeader('ETag', `"${Date.now()}"`);
}

// HTTP cache headers for API responses
export function setApiCacheHeaders(res: any, maxAge: number = 300) {
  res.setHeader('Cache-Control', `public, max-age=${maxAge}, must-revalidate`);
  res.setHeader('Vary', 'Authorization, Accept-Encoding');
}