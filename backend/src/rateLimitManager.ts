/**
 * Rate Limit Manager
 * Prevents hitting API rate limits through intelligent request scheduling and caching
 */

export interface RateLimitConfig {
  maxRequestsPerMinute: number;
  maxRequestsPerHour?: number;
  maxRequestsPerDay?: number;
  burstLimit?: number;
  cooldownPeriod?: number; // milliseconds
}

export interface APIEndpoint {
  name: string;
  baseUrl: string;
  rateLimit: RateLimitConfig;
  priority: 'high' | 'medium' | 'low';
  fallbackEndpoints?: string[];
  cacheDuration: number; // milliseconds
  retryAttempts: number;
  retryDelay: number; // milliseconds
}

export interface RequestQueueItem {
  id: string;
  endpoint: string;
  priority: number;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  retryDelay: number;
  execute: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (error: any) => void;
}

export class RateLimitManager {
  private requestQueues: Map<string, RequestQueueItem[]> = new Map();
  private lastRequestTimes: Map<string, number[]> = new Map();
  private cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();
  private isProcessing: Map<string, boolean> = new Map();
  private processingIntervals: Map<string, NodeJS.Timeout> = new Map();

  // API endpoint configurations with conservative rate limits
  private readonly API_ENDPOINTS: Map<string, APIEndpoint> = new Map([
    ['finnhub', {
      name: 'Finnhub',
      baseUrl: 'https://finnhub.io/api/v1',
      rateLimit: {
        maxRequestsPerMinute: 45, // Conservative: 75% of 60 req/min limit
        maxRequestsPerHour: 3000,
        maxRequestsPerDay: 50000
      },
      priority: 'high',
      fallbackEndpoints: ['alphaVantage', 'twelveData'],
      cacheDuration: 5 * 60 * 1000, // 5 minutes
      retryAttempts: 3,
      retryDelay: 1000
    }],
    ['alphaVantage', {
      name: 'Alpha Vantage',
      baseUrl: 'https://www.alphavantage.co/query',
      rateLimit: {
        maxRequestsPerMinute: 4, // Conservative: 80% of 5 req/min limit
        maxRequestsPerHour: 200,
        maxRequestsPerDay: 1000
      },
      priority: 'medium',
      fallbackEndpoints: ['twelveData'],
      cacheDuration: 10 * 60 * 1000, // 10 minutes
      retryAttempts: 2,
      retryDelay: 2000
    }],
    ['twelveData', {
      name: 'Twelve Data',
      baseUrl: 'https://api.twelvedata.com',
      rateLimit: {
        maxRequestsPerMinute: 6, // Conservative: 75% of 8 req/min limit
        maxRequestsPerHour: 300,
        maxRequestsPerDay: 2000
      },
      priority: 'medium',
      fallbackEndpoints: ['alphaVantage'],
      cacheDuration: 8 * 60 * 1000, // 8 minutes
      retryAttempts: 2,
      retryDelay: 1500
    }],
    ['coinGecko', {
      name: 'CoinGecko',
      baseUrl: 'https://api.coingecko.com/api/v3',
      rateLimit: {
        maxRequestsPerMinute: 40, // Conservative: 80% of 50 req/min limit
        maxRequestsPerHour: 2000,
        maxRequestsPerDay: 30000
      },
      priority: 'high',
      fallbackEndpoints: ['coinMarketCap'],
      cacheDuration: 3 * 60 * 1000, // 3 minutes
      retryAttempts: 3,
      retryDelay: 1000
    }],
    ['coinMarketCap', {
      name: 'CoinMarketCap',
      baseUrl: 'https://pro-api.coinmarketcap.com/v1',
      rateLimit: {
        maxRequestsPerMinute: 8, // Conservative: 80% of 10 req/min limit
        maxRequestsPerHour: 400,
        maxRequestsPerDay: 5000
      },
      priority: 'medium',
      fallbackEndpoints: ['coinGecko'],
      cacheDuration: 5 * 60 * 1000, // 5 minutes
      retryAttempts: 2,
      retryDelay: 2000
    }],
    ['defiLlama', {
      name: 'DeFi Llama',
      baseUrl: 'https://api.llama.fi',
      rateLimit: {
        maxRequestsPerMinute: 80, // Conservative: 80% of 100 req/min limit
        maxRequestsPerHour: 4000,
        maxRequestsPerDay: 50000
      },
      priority: 'low',
      fallbackEndpoints: [],
      cacheDuration: 15 * 60 * 1000, // 15 minutes
      retryAttempts: 2,
      retryDelay: 3000
    }]
  ]);

  constructor() {
    this.initializeProcessing();
  }

  private initializeProcessing() {
    // Start processing queues for each endpoint
    for (const [endpointName, config] of this.API_ENDPOINTS) {
      this.isProcessing.set(endpointName, false);
      this.requestQueues.set(endpointName, []);
      this.lastRequestTimes.set(endpointName, []);
      
      // Start processing interval
      this.startProcessing(endpointName);
    }
  }

  private startProcessing(endpointName: string) {
    const interval = setInterval(() => {
      this.processQueue(endpointName);
    }, 1000); // Check every second
    
    this.processingIntervals.set(endpointName, interval);
  }

  private async processQueue(endpointName: string) {
    if (this.isProcessing.get(endpointName)) return;
    
    const queue = this.requestQueues.get(endpointName);
    if (!queue || queue.length === 0) return;

    this.isProcessing.set(endpointName, true);
    
    try {
      while (queue.length > 0 && this.canMakeRequest(endpointName)) {
        const item = queue.shift();
        if (!item) break;

        try {
          const result = await item.execute();
          item.resolve(result);
          this.recordRequest(endpointName);
                 } catch (error) {
           if (item.retryCount < item.maxRetries) {
             // Retry with exponential backoff
             item.retryCount++;
             item.timestamp = Date.now() + (item.retryDelay * Math.pow(2, item.retryCount - 1));
             queue.push(item);
           } else {
             item.reject(error as Error);
           }
         }
      }
    } finally {
      this.isProcessing.set(endpointName, false);
    }
  }

  private canMakeRequest(endpointName: string): boolean {
    const config = this.API_ENDPOINTS.get(endpointName);
    if (!config) return false;

    const now = Date.now();
    const lastRequests = this.lastRequestTimes.get(endpointName) || [];
    
    // Clean old timestamps
    const recentRequests = lastRequests.filter(time => now - time < 60000); // Last minute
    
    // Check minute limit
    if (recentRequests.length >= config.rateLimit.maxRequestsPerMinute) {
      return false;
    }

    // Check hour limit
    const hourRequests = lastRequests.filter(time => now - time < 3600000); // Last hour
    if (config.rateLimit.maxRequestsPerHour && hourRequests.length >= config.rateLimit.maxRequestsPerHour) {
      return false;
    }

    // Check day limit
    const dayRequests = lastRequests.filter(time => now - time < 86400000); // Last day
    if (config.rateLimit.maxRequestsPerDay && dayRequests.length >= config.rateLimit.maxRequestsPerDay) {
      return false;
    }

    return true;
  }

  private recordRequest(endpointName: string) {
    const now = Date.now();
    const lastRequests = this.lastRequestTimes.get(endpointName) || [];
    lastRequests.push(now);
    
    // Keep only recent requests (last 24 hours)
    const recentRequests = lastRequests.filter(time => now - time < 86400000);
    this.lastRequestTimes.set(endpointName, recentRequests);
  }

  async scheduleRequest<T>(
    endpointName: string,
    requestFn: () => Promise<T>,
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): Promise<T> {
    const config = this.API_ENDPOINTS.get(endpointName);
    if (!config) {
      throw new Error(`Unknown endpoint: ${endpointName}`);
    }

    // Check cache first
    const cacheKey = `${endpointName}_${requestFn.toString().slice(0, 50)}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }

    // Check if we can make the request immediately
    if (this.canMakeRequest(endpointName)) {
      try {
        const result = await requestFn();
        this.recordRequest(endpointName);
        
        // Cache the result
        this.cache.set(cacheKey, {
          data: result,
          timestamp: Date.now(),
          ttl: config.cacheDuration
        });
        
        return result;
      } catch (error) {
        // Try fallback endpoints
        return this.tryFallbackEndpoints(endpointName, requestFn, priority);
      }
    }

    // Queue the request
    return new Promise<T>((resolve, reject) => {
      const priorityScore = this.getPriorityScore(priority);
             const item: RequestQueueItem = {
         id: `${endpointName}_${Date.now()}_${Math.random()}`,
         endpoint: endpointName,
         priority: priorityScore,
         timestamp: Date.now(),
         retryCount: 0,
         maxRetries: config.retryAttempts,
         retryDelay: config.retryDelay,
         execute: requestFn,
         resolve,
         reject
       };

      const queue = this.requestQueues.get(endpointName) || [];
      queue.push(item);
      
      // Sort by priority (higher priority first)
      queue.sort((a, b) => b.priority - a.priority);
      
      this.requestQueues.set(endpointName, queue);
    });
  }

  private async tryFallbackEndpoints<T>(
    originalEndpoint: string,
    requestFn: () => Promise<T>,
    priority: 'high' | 'medium' | 'low'
  ): Promise<T> {
    const config = this.API_ENDPOINTS.get(originalEndpoint);
    if (!config?.fallbackEndpoints || config.fallbackEndpoints.length === 0) {
      throw new Error(`No fallback endpoints available for ${originalEndpoint}`);
    }

    for (const fallbackName of config.fallbackEndpoints) {
      try {
        return await this.scheduleRequest(fallbackName, requestFn, priority);
               } catch (error) {
           console.warn(`Fallback endpoint ${fallbackName} failed:`, error instanceof Error ? error.message : 'Unknown error');
           continue;
         }
    }

    throw new Error(`All endpoints failed for ${originalEndpoint}`);
  }

  private getPriorityScore(priority: 'high' | 'medium' | 'low'): number {
    switch (priority) {
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 2;
    }
  }

  // Get current queue status
  getQueueStatus() {
    const status: Record<string, any> = {};
    
    for (const [endpointName, queue] of this.requestQueues) {
      const config = this.API_ENDPOINTS.get(endpointName);
      const lastRequests = this.lastRequestTimes.get(endpointName) || [];
      const now = Date.now();
      
      status[endpointName] = {
        name: config?.name || endpointName,
        queueLength: queue.length,
        requestsLastMinute: lastRequests.filter(time => now - time < 60000).length,
        requestsLastHour: lastRequests.filter(time => now - time < 3600000).length,
        rateLimit: config?.rateLimit,
        isProcessing: this.isProcessing.get(endpointName)
      };
    }
    
    return status;
  }

  // Clear cache for specific endpoint or all
  clearCache(endpointName?: string) {
    if (endpointName) {
      for (const [key] of this.cache) {
        if (key.startsWith(`${endpointName}_`)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  // Get cache statistics
  getCacheStats() {
    const now = Date.now();
    let totalItems = 0;
    let expiredItems = 0;
    let validItems = 0;
    
    for (const [key, value] of this.cache) {
      totalItems++;
      if (now - value.timestamp < value.ttl) {
        validItems++;
      } else {
        expiredItems++;
      }
    }
    
    return {
      totalItems,
      validItems,
      expiredItems,
      cacheSize: this.cache.size
    };
  }

  // Cleanup expired cache entries
  cleanupExpiredCache() {
    const now = Date.now();
    for (const [key, value] of this.cache) {
      if (now - value.timestamp >= value.ttl) {
        this.cache.delete(key);
      }
    }
  }

  // Stop all processing
  stop() {
    for (const [endpointName, interval] of this.processingIntervals) {
      clearInterval(interval);
      this.isProcessing.set(endpointName, false);
    }
    this.processingIntervals.clear();
  }
}

// Export singleton instance
export const rateLimitManager = new RateLimitManager(); 