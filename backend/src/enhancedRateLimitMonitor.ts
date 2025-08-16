/**
 * Enhanced Rate Limit Monitor
 * Advanced rate limiting with Redis-like in-memory tracking, request queuing, and adaptive throttling
 */

// ============================================================================
// INTERFACES & TYPES
// ============================================================================

export interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  burstLimit: number;
  cooldownPeriod: number;
  retryAttempts: number;
  retryDelay: number;
  priority: 'high' | 'medium' | 'low';
}

export interface RequestMetrics {
  timestamp: number;
  success: boolean;
  responseTime: number;
  statusCode: number;
  rateLimitWarning: boolean;
  retryCount: number;
}

export interface RequestQueueItem {
  id: number;
  requestFn: () => Promise<any>;
  priority: number;
  timestamp: number;
  retryCount: number;
  retryDelay: number;
  resolve?: (value: any) => void;
  reject?: (error: Error) => void;
}

export interface APIHealthStatus {
  name: string;
  status: 'healthy' | 'degraded' | 'critical';
  lastCheck: number;
  uptime: number;
  responseTime: number;
  errorRate: number;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  category?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  metadata: {
    timestamp: string;
    dataSource: string;
    processingTime: number;
  };
}

// ============================================================================
// API-SPECIFIC RATE LIMIT CONFIGURATIONS
// ============================================================================

const API_SPECIFIC_LIMITS: Record<string, RateLimitConfig> = {
  finnhub: {
    requestsPerMinute: 60,      // Free tier: 60 requests per minute
    requestsPerHour: 3000,      // 60 * 50 minutes
    requestsPerDay: 72000,      // 60 * 60 * 20 hours
    burstLimit: 5,              // Allow 5 requests in quick succession
    cooldownPeriod: 1000,      // 1 second cooldown
    retryAttempts: 3,
    retryDelay: 2000,
    priority: 'high'            // High priority for stock data
  },
  alphaVantage: {
    requestsPerMinute: 5,       // Free tier: 5 requests per minute (very restrictive)
    requestsPerHour: 300,       // 5 * 60 minutes
    requestsPerDay: 7200,       // 5 * 60 * 24 hours
    burstLimit: 1,              // Only 1 request at a time
    cooldownPeriod: 13000,     // 13 seconds between requests (5 req/min = 1 req/12sec)
    retryAttempts: 2,
    retryDelay: 15000,         // 15 second retry delay
    priority: 'low'             // Low priority due to restrictions
  },
  twelveData: {
    requestsPerMinute: 33,      // 800 req/day = ~33 req/hour = ~0.55 req/min
    requestsPerHour: 800,       // Daily limit: 800 requests
    requestsPerDay: 800,        // Daily limit: 800 requests
    burstLimit: 3,              // Allow 3 requests in quick succession
    cooldownPeriod: 2000,      // 2 seconds between requests
    retryAttempts: 3,
    retryDelay: 5000,
    priority: 'medium'          // Medium priority
  },
  coinGecko: {
    requestsPerMinute: 50,      // Free tier: 50 requests per minute
    requestsPerHour: 3000,      // 50 * 60 minutes
    requestsPerDay: 72000,      // 50 * 60 * 24 hours
    burstLimit: 10,             // Allow 10 requests in quick succession
    cooldownPeriod: 1200,      // 1.2 seconds between requests
    retryAttempts: 3,
    retryDelay: 2000,
    priority: 'high'            // High priority for crypto data
  },
  coinMarketCap: {
    requestsPerMinute: 333,     // 10,000 req/month = ~333 req/day = ~0.46 req/min
    requestsPerHour: 10000,     // Very generous hourly limit
    requestsPerDay: 10000,      // Daily limit: 10,000 requests
    burstLimit: 20,             // Allow 20 requests in quick succession
    cooldownPeriod: 500,        // 0.5 seconds between requests
    retryAttempts: 5,
    retryDelay: 1000,
    priority: 'high'            // High priority for crypto data
  },
  defiLlama: {
    requestsPerMinute: 80,      // Free tier: 80 requests per minute
    requestsPerHour: 4800,      // 80 * 60 minutes
    requestsPerDay: 115200,     // 80 * 60 * 24 hours
    burstLimit: 15,             // Allow 15 requests in quick succession
    cooldownPeriod: 750,        // 0.75 seconds between requests
    retryAttempts: 3,
    retryDelay: 1500,
    priority: 'medium'          // Medium priority
  }
};

export class EnhancedRateLimitMonitor {
  private requestHistory: Map<string, RequestMetrics[]> = new Map();
  private requestQueues: Map<string, RequestQueueItem[]> = new Map();
  private apiHealth: Map<string, APIHealthStatus> = new Map();
  private isProcessing: Map<string, boolean> = new Map();
  private adaptiveThrottling: Map<string, number> = new Map();
  private lastRequestTime: Map<string, number> = new Map();

  constructor() {
    this.initializeMonitoring();
  }

  private initializeMonitoring(): void {
    try {
      // Initialize monitoring for each API individually
      Object.keys(API_SPECIFIC_LIMITS).forEach(apiName => {
        this.requestHistory.set(apiName, []);
        this.requestQueues.set(apiName, []);
        this.isProcessing.set(apiName, false);
        this.adaptiveThrottling.set(apiName, 0);
        this.lastRequestTime.set(apiName, 0);
        
        this.apiHealth.set(apiName, {
          name: apiName,
          status: 'healthy',
          lastCheck: Date.now(),
          uptime: 100,
          responseTime: 0,
          errorRate: 0
        });
      });

      console.log('🔧 Individual API rate limit monitoring initialized');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Failed to initialize API monitoring:', errorMessage);
    }
  }

  async scheduleRequest<T>(
    apiName: string, 
    requestFn: () => Promise<T>, 
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): Promise<T> {
    try {
      // Check if this specific API can make a request
      if (!this.canMakeRequest(apiName)) {
        // Calculate optimal timing for next request
        const optimalTiming = this.calculateOptimalTiming(apiName);
        
        if (optimalTiming.shouldWait) {
          console.log(`⏱️ ${apiName} rate limit approaching. Waiting ${optimalTiming.waitTime}ms for optimal spacing.`);
          
          // Wait for optimal timing
          await new Promise(resolve => setTimeout(resolve, optimalTiming.waitTime));
          
          // Check again after waiting
          if (this.canMakeRequest(apiName)) {
            return await this.executeRequest(apiName, requestFn);
          }
        }
        
        // If we still can't make the request, use intelligent fallback
        const fallbackStrategy = this.getFallbackStrategy(apiName);
        console.log(`📦 ${apiName} using fallback strategy: ${fallbackStrategy.strategy}`);
        
        if (fallbackStrategy.strategy === 'wait') {
          // Wait and retry
          await new Promise(resolve => setTimeout(resolve, fallbackStrategy.waitTime));
          if (this.canMakeRequest(apiName)) {
            return await this.executeRequest(apiName, requestFn);
          }
        }
        
        // If all else fails, throw error for cached data fallback
        throw new Error(`API_UNAVAILABLE: Use cached data for ${apiName}. Next available in ${fallbackStrategy.waitTime}ms`);
      }

      // Make the request immediately
      return await this.executeRequest(apiName, requestFn);
    } catch (error: unknown) {
      const errorObj = error as any;
      const isRateLimitError = errorObj.response?.status === 429 || errorObj.response?.status === 403;
      
      // Record the failed request with API-specific metrics
      this.recordRequest(apiName, {
        timestamp: Date.now(),
        success: false,
        responseTime: 0,
        statusCode: errorObj.response?.status || 500,
        rateLimitWarning: isRateLimitError,
        retryCount: 0
      });

      // Apply API-specific adaptive throttling
      if (isRateLimitError) {
        this.applyAdaptiveThrottling(apiName);
      }

      throw error;
    }
  }

  private canMakeRequest(apiName: string): boolean {
    try {
      const config = API_SPECIFIC_LIMITS[apiName];
      if (!config) {
        console.warn(`⚠️ No rate limit config found for ${apiName}`);
        return false;
      }

      const now = Date.now();
      const history = this.requestHistory.get(apiName) || [];
      const lastRequest = this.lastRequestTime.get(apiName) || 0;

      // Check cooldown period for this specific API
      if (now - lastRequest < config.cooldownPeriod) {
        return false;
      }

      // Check minute limit for this specific API
      const minuteAgo = now - 60 * 1000;
      const requestsThisMinute = history.filter(h => h.timestamp > minuteAgo).length;
      if (requestsThisMinute >= config.requestsPerMinute) {
        return false;
      }

      // Check hour limit for this specific API
      const hourAgo = now - 60 * 60 * 1000;
      const requestsThisHour = history.filter(h => h.timestamp > hourAgo).length;
      if (requestsThisHour >= config.requestsPerHour) {
        return false;
      }

      // Check day limit for this specific API
      const dayAgo = now - 24 * 60 * 60 * 1000;
      const requestsThisDay = history.filter(h => h.timestamp > dayAgo).length;
      if (requestsThisDay >= config.requestsPerDay) {
        return false;
      }

      // Check if API is currently throttled
      const throttleDelay = this.adaptiveThrottling.get(apiName) || 0;
      if (throttleDelay > 0) {
        return false;
      }

      return true;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Error checking rate limits for ${apiName}:`, errorMessage);
      return false;
    }
  }

  private calculatePriority(userPriority: 'high' | 'medium' | 'low', apiPriority: 'high' | 'medium' | 'low'): number {
    const priorityMap = { high: 3, medium: 2, low: 1 };
    const userScore = priorityMap[userPriority];
    const apiScore = priorityMap[apiPriority];
    
    // Combine user priority with API priority (API priority has higher weight)
    return (apiScore * 10) + userScore;
  }

  /**
   * Get the current rate limit status for an API
   * Returns information about current usage vs limits
   */
  getLimitStatus(apiName: string): {
    currentUsage: number;
    limit: number;
    isApproachingLimit: boolean;
    isAtLimit: boolean;
    timeUntilReset: number;
    usagePercentage: number;
  } {
    try {
      const config = API_SPECIFIC_LIMITS[apiName];
      if (!config) {
        return {
          currentUsage: 0,
          limit: 0,
          isApproachingLimit: false,
          isAtLimit: false,
          timeUntilReset: 0,
          usagePercentage: 0
        };
      }

      const now = Date.now();
      const history = this.requestHistory.get(apiName) || [];
      
      // Check minute usage (most restrictive)
      const minuteAgo = now - 60 * 1000;
      const requestsThisMinute = history.filter(h => h.timestamp > minuteAgo).length;
      
      // Check hour usage
      const hourAgo = now - 60 * 60 * 1000;
      const requestsThisHour = history.filter(h => h.timestamp > hourAgo).length;
      
      // Check day usage
      const dayAgo = now - 24 * 60 * 60 * 1000;
      const requestsThisDay = history.filter(h => h.timestamp > dayAgo).length;
      
      // Use the most restrictive limit
      const currentUsage = Math.max(requestsThisMinute, requestsThisHour, requestsThisDay);
      const limit = Math.min(config.requestsPerMinute, config.requestsPerHour, config.requestsPerDay);
      
      // Calculate usage percentage
      const usagePercentage = (currentUsage / limit) * 100;
      
      // Determine if approaching or at limit (80% threshold for approaching)
      const isApproachingLimit = usagePercentage >= 80 && usagePercentage < 100;
      const isAtLimit = usagePercentage >= 100;
      
      // Calculate time until reset (next minute boundary)
      const timeUntilReset = 60000 - (now % 60000);
      
      return {
        currentUsage,
        limit,
        isApproachingLimit,
        isAtLimit,
        timeUntilReset,
        usagePercentage: Math.round(usagePercentage)
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Error getting limit status for ${apiName}:`, errorMessage);
      return {
        currentUsage: 0,
        limit: 0,
        isApproachingLimit: false,
        isAtLimit: false,
        timeUntilReset: 0,
        usagePercentage: 0
      };
    }
  }

  /**
   * Get comprehensive rate limit status for all APIs
   * Useful for monitoring and debugging
   */
  getAllAPILimitStatus(): Record<string, {
    currentUsage: number;
    limit: number;
    isApproachingLimit: boolean;
    isAtLimit: boolean;
    timeUntilReset: number;
    usagePercentage: number;
    status: 'healthy' | 'warning' | 'critical';
  }> {
    const status: Record<string, any> = {};
    
    Object.keys(API_SPECIFIC_LIMITS).forEach(apiName => {
      const limitStatus = this.getLimitStatus(apiName);
      
      // Determine overall status
      let statusLevel: 'healthy' | 'warning' | 'critical' = 'healthy';
      if (limitStatus.isAtLimit) {
        statusLevel = 'critical';
      } else if (limitStatus.isApproachingLimit) {
        statusLevel = 'warning';
      }
      
      status[apiName] = {
        ...limitStatus,
        status: statusLevel
      };
    });
    
    return status;
  }

  /**
   * Get current optimal timing information for all APIs
   * Shows when next requests can be made for constant updates
   */
  getAllAPIOptimalTiming(): Record<string, {
    canMakeRequest: boolean;
    waitTime: number;
    nextOptimalTime: number;
    currentRate: string;
    optimalRate: string;
    reason: string;
  }> {
    const timing: Record<string, any> = {};
    
    Object.keys(API_SPECIFIC_LIMITS).forEach(apiName => {
      const canMakeRequest = this.canMakeRequest(apiName);
      const optimalTiming = this.calculateOptimalTiming(apiName);
      const limitStatus = this.getLimitStatus(apiName);
      
      // Calculate current and optimal rates
      const config = API_SPECIFIC_LIMITS[apiName];
      const optimalMinuteSpacing = (60 * 1000) / config.requestsPerMinute;
      const currentRate = canMakeRequest ? 'Ready' : 'Waiting';
      const optimalRate = `${Math.round(1000/optimalMinuteSpacing)} req/min`;
      
      timing[apiName] = {
        canMakeRequest,
        waitTime: optimalTiming.waitTime,
        nextOptimalTime: optimalTiming.nextOptimalTime,
        currentRate,
        optimalRate,
        reason: optimalTiming.reason,
        usage: `${limitStatus.currentUsage}/${limitStatus.limit} (${limitStatus.usagePercentage}%)`
      };
    });
    
    return timing;
  }

  /**
   * API Rotation Manager - Coordinates multiple APIs to work in tandem
   * Provides constant updates by cycling through APIs while respecting rate limits
   */
  async scheduleRequestWithRotation<T>(
    requestType: 'stocks' | 'etfs' | 'crypto',
    requestFn: (apiName: string) => Promise<T>,
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): Promise<{ data: T; apiUsed: string; rotationInfo: string }> {
    try {
      // Get available APIs for this request type
      const availableAPIs = this.getAvailableAPIsForType(requestType);
      
      if (availableAPIs.length === 0) {
        throw new Error(`No APIs available for ${requestType} requests. All APIs are in cooldown.`);
      }

      // Find the best available API (lowest usage, ready to make request)
      const bestAPI = this.selectBestAPI(availableAPIs, priority);
      
      if (!bestAPI) {
        // All APIs need cooldown - calculate when next API will be ready
        const nextAvailableTime = this.getNextAvailableAPITime(availableAPIs);
        throw new Error(`All APIs for ${requestType} are in cooldown. Next available in ${Math.round(nextAvailableTime/1000)}s`);
      }

      console.log(`🔄 API Rotation: Using ${bestAPI.name} for ${requestType} (${bestAPI.usagePercentage}% usage, ${bestAPI.waitTime}ms until next request)`);
      
      // Make the request through the selected API
      const result = await this.executeRequest(bestAPI.name, () => requestFn(bestAPI.name));
      
      // Update rotation tracking
      this.updateAPIRotationTracking(bestAPI.name, requestType);
      
      return {
        data: result,
        apiUsed: bestAPI.name,
        rotationInfo: `Rotated to ${bestAPI.name} (${bestAPI.usagePercentage}% usage)`
      };
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Error in API rotation for ${requestType}:`, errorMessage);
      throw error;
    }
  }

  /**
   * Get available APIs for a specific request type
   */
  getAvailableAPIsForType(requestType: 'stocks' | 'etfs' | 'crypto'): Array<{
    name: string;
    canMakeRequest: boolean;
    usagePercentage: number;
    waitTime: number;
    priority: number;
    lastUsed: number;
  }> {
    const availableAPIs: Array<{
      name: string;
      canMakeRequest: boolean;
      usagePercentage: number;
      waitTime: number;
      priority: number;
      lastUsed: number;
    }> = [];

    // Define which APIs can handle which request types
    const apiCapabilities: Record<string, string[]> = {
      finnhub: ['stocks', 'etfs'],
      alphaVantage: ['stocks'],
      twelveData: ['stocks', 'etfs'],
      coingecko: ['crypto'],
      coinmarketcap: ['crypto'],
      defillama: ['crypto']
    };

    Object.keys(API_SPECIFIC_LIMITS).forEach(apiName => {
      // Check if this API can handle the request type
      if (apiCapabilities[apiName]?.includes(requestType)) {
        const canMakeRequest = this.canMakeRequest(apiName);
        const limitStatus = this.getLimitStatus(apiName);
        const optimalTiming = this.calculateOptimalTiming(apiName);
        const lastUsed = this.lastRequestTime.get(apiName) || 0;
        
        // Calculate priority based on usage and last used time
        const priority = this.calculateRotationPriority(apiName, limitStatus, lastUsed);
        
        availableAPIs.push({
          name: apiName,
          canMakeRequest,
          usagePercentage: limitStatus.usagePercentage,
          waitTime: optimalTiming.waitTime,
          priority,
          lastUsed
        });
      }
    });

    return availableAPIs;
  }

  /**
   * Select the best API from available options
   */
  private selectBestAPI(
    availableAPIs: Array<{
      name: string;
      canMakeRequest: boolean;
      usagePercentage: number;
      waitTime: number;
      priority: number;
      lastUsed: number;
    }>,
    userPriority: 'high' | 'medium' | 'low'
  ): {
    name: string;
    usagePercentage: number;
    waitTime: number;
  } | null {
    // Filter APIs that can make requests immediately
    const readyAPIs = availableAPIs.filter(api => api.canMakeRequest);
    
    if (readyAPIs.length === 0) {
      return null; // No APIs are ready
    }

    // Sort by priority (highest first) and then by usage (lowest first)
    readyAPIs.sort((a, b) => {
      // First priority: user priority
      const userPriorityScore = this.getUserPriorityScore(userPriority);
      
      // Second priority: API priority
      const apiPriorityScore = b.priority - a.priority;
      
      // Third priority: usage percentage (lower is better)
      const usageScore = a.usagePercentage - b.usagePercentage;
      
      // Fourth priority: time since last use (longer is better for rotation)
      const timeScore = Date.now() - a.lastUsed - (Date.now() - b.lastUsed);
      
      return (userPriorityScore * 1000) + (apiPriorityScore * 100) + usageScore + timeScore;
    });

    const bestAPI = readyAPIs[0];
    return {
      name: bestAPI.name,
      usagePercentage: bestAPI.usagePercentage,
      waitTime: bestAPI.waitTime
    };
  }

  /**
   * Calculate rotation priority for an API
   */
  private calculateRotationPriority(
    apiName: string,
    limitStatus: any,
    lastUsed: number
  ): number {
    const config = API_SPECIFIC_LIMITS[apiName];
    const timeSinceLastUse = Date.now() - lastUsed;
    
    // Base priority from API config
    let priority = this.getPriorityScore(config.priority);
    
    // Boost priority for APIs that haven't been used recently
    if (timeSinceLastUse > 60000) { // > 1 minute
      priority += 10;
    }
    if (timeSinceLastUse > 300000) { // > 5 minutes
      priority += 20;
    }
    
    // Boost priority for APIs with lower usage
    if (limitStatus.usagePercentage < 50) {
      priority += 15;
    }
    if (limitStatus.usagePercentage < 25) {
      priority += 25;
    }
    
    // Reduce priority for APIs approaching limits
    if (limitStatus.isApproachingLimit) {
      priority -= 30;
    }
    
    return priority;
  }

  /**
   * Get priority score for user priority levels
   */
  private getUserPriorityScore(priority: 'high' | 'medium' | 'low'): number {
    const priorityMap = { high: 3, medium: 2, low: 1 };
    return priorityMap[priority];
  }

  /**
   * Get priority score for API priority levels
   */
  private getPriorityScore(priority: 'high' | 'medium' | 'low'): number {
    const priorityMap = { high: 3, medium: 2, low: 1 };
    return priorityMap[priority];
  }

  /**
   * Get time until next API will be available
   */
  private getNextAvailableAPITime(availableAPIs: Array<{
    name: string;
    canMakeRequest: boolean;
    usagePercentage: number;
    waitTime: number;
    priority: number;
    lastUsed: number;
  }>): number {
    const waitTimes = availableAPIs
      .filter(api => !api.canMakeRequest)
      .map(api => api.waitTime);
    
    return waitTimes.length > 0 ? Math.min(...waitTimes) : 0;
  }

  /**
   * Update API rotation tracking
   */
  private updateAPIRotationTracking(apiName: string, requestType: string): void {
    // Track which API was used for which request type
    const rotationKey = `${apiName}_${requestType}`;
    this.lastRequestTime.set(rotationKey, Date.now());
    
    console.log(`📊 API Rotation Update: ${apiName} used for ${requestType} at ${new Date().toISOString()}`);
  }

  private async executeRequest<T>(apiName: string, requestFn: () => Promise<T>): Promise<T> {
    try {
      const startTime = Date.now();
      const config = API_SPECIFIC_LIMITS[apiName];
      
      // Update last request time for this specific API
      this.lastRequestTime.set(apiName, startTime);
      
      const result = await requestFn();
      const responseTime = Date.now() - startTime;
      
      // Record successful request with API-specific metrics
      this.recordRequest(apiName, {
        timestamp: startTime,
        success: true,
        responseTime,
        statusCode: 200,
        rateLimitWarning: false,
        retryCount: 0
      });

      // Update API health for this specific API
      this.updateAPIHealth(apiName, {
        timestamp: startTime,
        success: true,
        responseTime,
        statusCode: 200,
        rateLimitWarning: false,
        retryCount: 0
      });

      return result;
    } catch (error: unknown) {
      const errorObj = error as any;
      const responseTime = Date.now() - (this.lastRequestTime.get(apiName) || Date.now());
      
      // Record failed request with API-specific metrics
      this.recordRequest(apiName, {
        timestamp: Date.now(),
        success: false,
        responseTime,
        statusCode: errorObj.response?.status || 500,
        rateLimitWarning: errorObj.response?.status === 429,
        retryCount: 0
      });

      throw error;
    }
  }

  private recordRequest(apiName: string, metrics: RequestMetrics): void {
    try {
      const history = this.requestHistory.get(apiName) || [];
      const now = Date.now();
      
      // Add timestamp if not present
      if (!metrics.timestamp) {
        metrics.timestamp = now;
      }
      
      history.push(metrics);
      
      // Keep only last 1000 requests for this specific API
      if (history.length > 1000) {
        history.splice(0, history.length - 1000);
      }
      
      this.requestHistory.set(apiName, history);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Error recording request for ${apiName}:`, errorMessage);
    }
  }

  private updateAPIHealth(apiName: string, metrics: RequestMetrics): void {
    try {
      const health = this.apiHealth.get(apiName);
      if (!health) return;

      const history = this.requestHistory.get(apiName) || [];
      const recentRequests = history.filter(h => h.timestamp > Date.now() - 5 * 60 * 1000); // Last 5 minutes
      
      if (recentRequests.length > 0) {
        const successRate = recentRequests.filter(r => r.success).length / recentRequests.length;
        const avgResponseTime = recentRequests.reduce((sum, r) => sum + r.responseTime, 0) / recentRequests.length;
        
        health.status = successRate > 0.8 ? 'healthy' : successRate > 0.5 ? 'degraded' : 'critical';
        health.responseTime = avgResponseTime;
        health.errorRate = 1 - successRate;
        health.lastCheck = Date.now();
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Error updating API health for ${apiName}:`, errorMessage);
    }
  }

  private applyAdaptiveThrottling(apiName: string): void {
    try {
      const config = API_SPECIFIC_LIMITS[apiName];
      const currentThrottle = this.adaptiveThrottling.get(apiName) || 0;
      
      // Increase throttle delay for this specific API
      const newThrottle = Math.min(currentThrottle + config.cooldownPeriod * 2, config.cooldownPeriod * 10);
      this.adaptiveThrottling.set(apiName, newThrottle);
      
      console.log(`🚦 Adaptive throttling applied to ${apiName}: ${newThrottle}ms delay`);
      
      // Reset throttle after delay
      setTimeout(() => {
        this.adaptiveThrottling.set(apiName, 0);
        console.log(`✅ Throttling reset for ${apiName}`);
      }, newThrottle);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Error applying adaptive throttling to ${apiName}:`, errorMessage);
    }
  }

  /**
   * Calculate optimal timing for the next request to maintain constant updates
   * while staying within rate limits
   */
  private calculateOptimalTiming(apiName: string): {
    shouldWait: boolean;
    waitTime: number;
    nextOptimalTime: number;
    reason: string;
  } {
    try {
      const config = API_SPECIFIC_LIMITS[apiName];
      if (!config) {
        return { shouldWait: false, waitTime: 0, nextOptimalTime: Date.now(), reason: 'No config' };
      }

      const now = Date.now();
      const history = this.requestHistory.get(apiName) || [];
      const lastRequest = this.lastRequestTime.get(apiName) || 0;
      
      // Calculate time since last request
      const timeSinceLastRequest = now - lastRequest;
      
      // Calculate optimal spacing based on rate limits
      const optimalMinuteSpacing = (60 * 1000) / config.requestsPerMinute; // Time between requests for minute limit
      const optimalHourSpacing = (60 * 60 * 1000) / config.requestsPerHour; // Time between requests for hour limit
      const optimalDaySpacing = (24 * 60 * 60 * 1000) / config.requestsPerDay; // Time between requests for day limit
      
      // Use the most restrictive spacing requirement
      const requiredSpacing = Math.max(optimalMinuteSpacing, optimalHourSpacing, optimalDaySpacing, config.cooldownPeriod);
      
      // Check if we need to wait
      if (timeSinceLastRequest < requiredSpacing) {
        const waitTime = requiredSpacing - timeSinceLastRequest;
        const nextOptimalTime = now + waitTime;
        
        return {
          shouldWait: true,
          waitTime,
          nextOptimalTime,
          reason: `Optimal spacing: ${Math.round(waitTime)}ms to maintain ${Math.round(1000/requiredSpacing)} req/sec`
        };
      }
      
      // Check if we're approaching limits and need to slow down
      const limitStatus = this.getLimitStatus(apiName);
      if (limitStatus.isApproachingLimit) {
        // Slow down to 80% of normal speed when approaching limits
        const slowdownFactor = 1.25; // 25% slower
        const adjustedSpacing = requiredSpacing * slowdownFactor;
        const waitTime = Math.max(0, adjustedSpacing - timeSinceLastRequest);
        
        return {
          shouldWait: waitTime > 0,
          waitTime,
          nextOptimalTime: now + waitTime,
          reason: `Approaching limit (${limitStatus.usagePercentage}%). Slowing down to ${Math.round(1000/adjustedSpacing)} req/sec`
        };
      }
      
      return { shouldWait: false, waitTime: 0, nextOptimalTime: now, reason: 'Ready for request' };
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Error calculating optimal timing for ${apiName}:`, errorMessage);
      return { shouldWait: false, waitTime: 0, nextOptimalTime: Date.now(), reason: 'Error in calculation' };
    }
  }

  /**
   * Get fallback strategy when API is temporarily unavailable
   */
  private getFallbackStrategy(apiName: string): {
    strategy: 'wait' | 'use_cache' | 'retry';
    waitTime: number;
    reason: string;
  } {
    try {
      const config = API_SPECIFIC_LIMITS[apiName];
      const limitStatus = this.getLimitStatus(apiName);
      
      if (limitStatus.isAtLimit) {
        // At limit - wait for reset
        return {
          strategy: 'wait',
          waitTime: limitStatus.timeUntilReset,
          reason: `At rate limit. Resets in ${Math.round(limitStatus.timeUntilReset/1000)}s`
        };
      }
      
      if (limitStatus.isApproachingLimit) {
        // Approaching limit - wait for optimal spacing
        const optimalTiming = this.calculateOptimalTiming(apiName);
        return {
          strategy: 'wait',
          waitTime: optimalTiming.waitTime,
          reason: `Approaching limit. Optimal spacing in ${Math.round(optimalTiming.waitTime)}ms`
        };
      }
      
      // Check cooldown
      const lastRequest = this.lastRequestTime.get(apiName) || 0;
      const timeSinceLastRequest = Date.now() - lastRequest;
      const remainingCooldown = config.cooldownPeriod - timeSinceLastRequest;
      
      if (remainingCooldown > 0) {
        return {
          strategy: 'wait',
          waitTime: remainingCooldown,
          reason: `In cooldown. Available in ${Math.round(remainingCooldown)}ms`
        };
      }
      
      // Default fallback
      return {
        strategy: 'use_cache',
        waitTime: 0,
        reason: 'Use cached data temporarily'
      };
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Error getting fallback strategy for ${apiName}:`, errorMessage);
      return {
        strategy: 'use_cache',
        waitTime: 0,
        reason: 'Error in strategy calculation'
      };
    }
  }

  getHealthStatus(): APIHealthStatus[] {
    try {
      return Array.from(this.apiHealth.values());
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Error getting health status:', errorMessage);
      return [];
    }
  }

  getAPIMetrics(apiName: string) {
    try {
      const history = this.requestHistory.get(apiName) || [];
      const config = API_SPECIFIC_LIMITS[apiName];
      
      if (!config) {
        return { error: `No config found for ${apiName}` };
      }

      const now = Date.now();
      const minuteAgo = now - 60 * 1000;
      const hourAgo = now - 60 * 60 * 1000;
      const dayAgo = now - 24 * 60 * 60 * 1000;

      const requestsThisMinute = history.filter(h => h.timestamp > minuteAgo).length;
      const requestsThisHour = history.filter(h => h.timestamp > hourAgo).length;
      const requestsThisDay = history.filter(h => h.timestamp > dayAgo).length;

      const recentRequests = history.filter(h => h.timestamp > now - 5 * 60 * 1000);
      const successRate = recentRequests.length > 0 ? recentRequests.filter(r => r.success).length / recentRequests.length : 0;
      const avgResponseTime = recentRequests.length > 0 ? recentRequests.reduce((sum, r) => sum + r.responseTime, 0) / recentRequests.length : 0;

      return {
        apiName,
        config,
        currentUsage: {
          minute: requestsThisMinute,
          hour: requestsThisHour,
          day: requestsThisDay
        },
        limits: {
          minute: config.requestsPerMinute,
          hour: config.requestsPerHour,
          day: config.requestsPerDay
        },
        utilization: {
          minute: (requestsThisMinute / config.requestsPerMinute) * 100,
          hour: (requestsThisHour / config.requestsPerHour) * 100,
          day: (requestsThisDay / config.requestsPerDay) * 100
        },
        performance: {
          successRate: successRate * 100,
          averageResponseTime: avgResponseTime,
          queueLength: this.requestQueues.get(apiName)?.length || 0
        },
        throttling: {
          isThrottled: this.adaptiveThrottling.get(apiName) || 0 > 0,
          throttleDelay: this.adaptiveThrottling.get(apiName) || 0
        }
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Error getting metrics for ${apiName}:`, errorMessage);
      return { error: `Failed to get metrics for ${apiName}: ${errorMessage}` };
    }
  }

  getRateLimitStatus() {
    try {
      const status: Record<string, any> = {};
      
      Object.keys(API_SPECIFIC_LIMITS).forEach(apiName => {
        const metrics = this.getAPIMetrics(apiName);
        if (!('error' in metrics)) {
          status[apiName] = {
            name: apiName,
            status: this.getAPIStatus(apiName, metrics),
            queueLength: metrics.performance.queueLength,
            currentUsage: metrics.utilization.minute,
            maxCapacity: Math.floor(metrics.limits.minute * 0.8), // 80% of limit
            utilizationPercentage: metrics.utilization.minute,
            averageResponseTime: metrics.performance.averageResponseTime,
            errorRate: 100 - metrics.performance.successRate,
            rateLimitWarnings: 0,
            isThrottled: metrics.throttling.isThrottled,
            throttleDelay: metrics.throttling.throttleDelay,
            lastRequestTime: this.lastRequestTime.get(apiName) || 0,
            isProcessing: this.isProcessing.get(apiName) || false
          };
        }
      });
      
      return status;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Error getting rate limit status:', errorMessage);
      return {};
    }
  }

  private getAPIStatus(apiName: string, metrics: any): 'healthy' | 'degraded' | 'critical' {
    try {
      const utilization = metrics.utilization.minute;
      const successRate = metrics.performance.successRate;
      
      if (utilization > 90 || successRate < 50) return 'critical';
      if (utilization > 70 || successRate < 80) return 'degraded';
      return 'healthy';
    } catch (error: unknown) {
      return 'critical';
    }
  }

  clearHistory(apiName?: string): void {
    try {
      if (apiName) {
        this.requestHistory.set(apiName, []);
        console.log(`🧹 Cleared history for ${apiName}`);
      } else {
        this.requestHistory.clear();
        console.log('🧹 Cleared all API history');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Error clearing history:', errorMessage);
    }
  }

  stop(): void {
    try {
      this.requestHistory.clear();
      this.requestQueues.clear();
      this.apiHealth.clear();
      this.isProcessing.clear();
      this.adaptiveThrottling.clear();
      this.lastRequestTime.clear();
      console.log('🛑 Enhanced Rate Limit Monitor stopped');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Error stopping monitor:', errorMessage);
    }
  }
}

// Export singleton instance
export const enhancedRateLimitMonitor = new EnhancedRateLimitMonitor(); 