"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enhancedRateLimitMonitor = exports.EnhancedRateLimitMonitor = void 0;
const API_SPECIFIC_LIMITS = {
    finnhub: {
        requestsPerMinute: 60,
        requestsPerHour: 3000,
        requestsPerDay: 72000,
        burstLimit: 5,
        cooldownPeriod: 1000,
        retryAttempts: 3,
        retryDelay: 2000,
        priority: 'high'
    },
    alphaVantage: {
        requestsPerMinute: 5,
        requestsPerHour: 300,
        requestsPerDay: 7200,
        burstLimit: 1,
        cooldownPeriod: 13000,
        retryAttempts: 2,
        retryDelay: 15000,
        priority: 'low'
    },
    twelveData: {
        requestsPerMinute: 33,
        requestsPerHour: 800,
        requestsPerDay: 800,
        burstLimit: 3,
        cooldownPeriod: 2000,
        retryAttempts: 3,
        retryDelay: 5000,
        priority: 'medium'
    },
    coinGecko: {
        requestsPerMinute: 50,
        requestsPerHour: 3000,
        requestsPerDay: 72000,
        burstLimit: 10,
        cooldownPeriod: 1200,
        retryAttempts: 3,
        retryDelay: 2000,
        priority: 'high'
    },
    coinMarketCap: {
        requestsPerMinute: 333,
        requestsPerHour: 10000,
        requestsPerDay: 10000,
        burstLimit: 20,
        cooldownPeriod: 500,
        retryAttempts: 5,
        retryDelay: 1000,
        priority: 'high'
    },
    defiLlama: {
        requestsPerMinute: 80,
        requestsPerHour: 4800,
        requestsPerDay: 115200,
        burstLimit: 15,
        cooldownPeriod: 750,
        retryAttempts: 3,
        retryDelay: 1500,
        priority: 'medium'
    }
};
class EnhancedRateLimitMonitor {
    constructor() {
        this.requestHistory = new Map();
        this.requestQueues = new Map();
        this.apiHealth = new Map();
        this.isProcessing = new Map();
        this.adaptiveThrottling = new Map();
        this.lastRequestTime = new Map();
        this.initializeMonitoring();
    }
    initializeMonitoring() {
        try {
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
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('❌ Failed to initialize API monitoring:', errorMessage);
        }
    }
    async scheduleRequest(apiName, requestFn, priority = 'medium') {
        var _a, _b, _c;
        try {
            if (!this.canMakeRequest(apiName)) {
                const config = API_SPECIFIC_LIMITS[apiName];
                const queueItem = {
                    id: Date.now() + Math.random(),
                    requestFn,
                    priority: this.calculatePriority(priority, config.priority),
                    timestamp: Date.now(),
                    retryCount: 0,
                    retryDelay: config.retryDelay
                };
                this.requestQueues.get(apiName).push(queueItem);
                this.requestQueues.get(apiName).sort((a, b) => b.priority - a.priority);
                console.log(`⏳ Request queued for ${apiName} (priority: ${priority})`);
                return new Promise((resolve, reject) => {
                    queueItem.resolve = resolve;
                    queueItem.reject = reject;
                });
            }
            return await this.executeRequest(apiName, requestFn);
        }
        catch (error) {
            const errorObj = error;
            const isRateLimitError = ((_a = errorObj.response) === null || _a === void 0 ? void 0 : _a.status) === 429 || ((_b = errorObj.response) === null || _b === void 0 ? void 0 : _b.status) === 403;
            this.recordRequest(apiName, {
                timestamp: Date.now(),
                success: false,
                responseTime: 0,
                statusCode: ((_c = errorObj.response) === null || _c === void 0 ? void 0 : _c.status) || 500,
                rateLimitWarning: isRateLimitError,
                retryCount: 0
            });
            if (isRateLimitError) {
                this.applyAdaptiveThrottling(apiName);
            }
            throw error;
        }
    }
    canMakeRequest(apiName) {
        try {
            const config = API_SPECIFIC_LIMITS[apiName];
            if (!config) {
                console.warn(`⚠️ No rate limit config found for ${apiName}`);
                return false;
            }
            const now = Date.now();
            const history = this.requestHistory.get(apiName) || [];
            const lastRequest = this.lastRequestTime.get(apiName) || 0;
            if (now - lastRequest < config.cooldownPeriod) {
                return false;
            }
            const minuteAgo = now - 60 * 1000;
            const requestsThisMinute = history.filter(h => h.timestamp > minuteAgo).length;
            if (requestsThisMinute >= config.requestsPerMinute) {
                return false;
            }
            const hourAgo = now - 60 * 60 * 1000;
            const requestsThisHour = history.filter(h => h.timestamp > hourAgo).length;
            if (requestsThisHour >= config.requestsPerHour) {
                return false;
            }
            const dayAgo = now - 24 * 60 * 60 * 1000;
            const requestsThisDay = history.filter(h => h.timestamp > dayAgo).length;
            if (requestsThisDay >= config.requestsPerDay) {
                return false;
            }
            const throttleDelay = this.adaptiveThrottling.get(apiName) || 0;
            if (throttleDelay > 0) {
                return false;
            }
            return true;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(`❌ Error checking rate limits for ${apiName}:`, errorMessage);
            return false;
        }
    }
    calculatePriority(userPriority, apiPriority) {
        const priorityMap = { high: 3, medium: 2, low: 1 };
        const userScore = priorityMap[userPriority];
        const apiScore = priorityMap[apiPriority];
        return (apiScore * 10) + userScore;
    }
    async executeRequest(apiName, requestFn) {
        var _a, _b;
        try {
            const startTime = Date.now();
            const config = API_SPECIFIC_LIMITS[apiName];
            this.lastRequestTime.set(apiName, startTime);
            const result = await requestFn();
            const responseTime = Date.now() - startTime;
            this.recordRequest(apiName, {
                timestamp: startTime,
                success: true,
                responseTime,
                statusCode: 200,
                rateLimitWarning: false,
                retryCount: 0
            });
            this.updateAPIHealth(apiName, {
                timestamp: startTime,
                success: true,
                responseTime,
                statusCode: 200,
                rateLimitWarning: false,
                retryCount: 0
            });
            return result;
        }
        catch (error) {
            const errorObj = error;
            const responseTime = Date.now() - (this.lastRequestTime.get(apiName) || Date.now());
            this.recordRequest(apiName, {
                timestamp: Date.now(),
                success: false,
                responseTime,
                statusCode: ((_a = errorObj.response) === null || _a === void 0 ? void 0 : _a.status) || 500,
                rateLimitWarning: ((_b = errorObj.response) === null || _b === void 0 ? void 0 : _b.status) === 429,
                retryCount: 0
            });
            throw error;
        }
    }
    recordRequest(apiName, metrics) {
        try {
            const history = this.requestHistory.get(apiName) || [];
            const now = Date.now();
            if (!metrics.timestamp) {
                metrics.timestamp = now;
            }
            history.push(metrics);
            if (history.length > 1000) {
                history.splice(0, history.length - 1000);
            }
            this.requestHistory.set(apiName, history);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(`❌ Error recording request for ${apiName}:`, errorMessage);
        }
    }
    updateAPIHealth(apiName, metrics) {
        try {
            const health = this.apiHealth.get(apiName);
            if (!health)
                return;
            const history = this.requestHistory.get(apiName) || [];
            const recentRequests = history.filter(h => h.timestamp > Date.now() - 5 * 60 * 1000);
            if (recentRequests.length > 0) {
                const successRate = recentRequests.filter(r => r.success).length / recentRequests.length;
                const avgResponseTime = recentRequests.reduce((sum, r) => sum + r.responseTime, 0) / recentRequests.length;
                health.status = successRate > 0.8 ? 'healthy' : successRate > 0.5 ? 'degraded' : 'critical';
                health.responseTime = avgResponseTime;
                health.errorRate = 1 - successRate;
                health.lastCheck = Date.now();
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(`❌ Error updating API health for ${apiName}:`, errorMessage);
        }
    }
    applyAdaptiveThrottling(apiName) {
        try {
            const config = API_SPECIFIC_LIMITS[apiName];
            const currentThrottle = this.adaptiveThrottling.get(apiName) || 0;
            const newThrottle = Math.min(currentThrottle + config.cooldownPeriod * 2, config.cooldownPeriod * 10);
            this.adaptiveThrottling.set(apiName, newThrottle);
            console.log(`🚦 Adaptive throttling applied to ${apiName}: ${newThrottle}ms delay`);
            setTimeout(() => {
                this.adaptiveThrottling.set(apiName, 0);
                console.log(`✅ Throttling reset for ${apiName}`);
            }, newThrottle);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(`❌ Error applying adaptive throttling to ${apiName}:`, errorMessage);
        }
    }
    getHealthStatus() {
        try {
            return Array.from(this.apiHealth.values());
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('❌ Error getting health status:', errorMessage);
            return [];
        }
    }
    getAPIMetrics(apiName) {
        var _a;
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
                    queueLength: ((_a = this.requestQueues.get(apiName)) === null || _a === void 0 ? void 0 : _a.length) || 0
                },
                throttling: {
                    isThrottled: this.adaptiveThrottling.get(apiName) || 0 > 0,
                    throttleDelay: this.adaptiveThrottling.get(apiName) || 0
                }
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(`❌ Error getting metrics for ${apiName}:`, errorMessage);
            return { error: `Failed to get metrics for ${apiName}: ${errorMessage}` };
        }
    }
    getRateLimitStatus() {
        try {
            const status = {};
            Object.keys(API_SPECIFIC_LIMITS).forEach(apiName => {
                const metrics = this.getAPIMetrics(apiName);
                if (!('error' in metrics)) {
                    status[apiName] = {
                        name: apiName,
                        status: this.getAPIStatus(apiName, metrics),
                        queueLength: metrics.performance.queueLength,
                        currentUsage: metrics.utilization.minute,
                        maxCapacity: Math.floor(metrics.limits.minute * 0.8),
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
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('❌ Error getting rate limit status:', errorMessage);
            return {};
        }
    }
    getAPIStatus(apiName, metrics) {
        try {
            const utilization = metrics.utilization.minute;
            const successRate = metrics.performance.successRate;
            if (utilization > 90 || successRate < 50)
                return 'critical';
            if (utilization > 70 || successRate < 80)
                return 'degraded';
            return 'healthy';
        }
        catch (error) {
            return 'critical';
        }
    }
    clearHistory(apiName) {
        try {
            if (apiName) {
                this.requestHistory.set(apiName, []);
                console.log(`🧹 Cleared history for ${apiName}`);
            }
            else {
                this.requestHistory.clear();
                console.log('🧹 Cleared all API history');
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('❌ Error clearing history:', errorMessage);
        }
    }
    stop() {
        try {
            this.requestHistory.clear();
            this.requestQueues.clear();
            this.apiHealth.clear();
            this.isProcessing.clear();
            this.adaptiveThrottling.clear();
            this.lastRequestTime.clear();
            console.log('🛑 Enhanced Rate Limit Monitor stopped');
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('❌ Error stopping monitor:', errorMessage);
        }
    }
}
exports.EnhancedRateLimitMonitor = EnhancedRateLimitMonitor;
exports.enhancedRateLimitMonitor = new EnhancedRateLimitMonitor();
