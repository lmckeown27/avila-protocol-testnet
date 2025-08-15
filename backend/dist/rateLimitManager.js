"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimitManager = exports.RateLimitManager = void 0;
class RateLimitManager {
    constructor() {
        this.requestQueues = new Map();
        this.lastRequestTimes = new Map();
        this.cache = new Map();
        this.isProcessing = new Map();
        this.processingIntervals = new Map();
        this.API_ENDPOINTS = new Map([
            ['finnhub', {
                    name: 'Finnhub',
                    baseUrl: 'https://finnhub.io/api/v1',
                    rateLimit: {
                        maxRequestsPerMinute: 45,
                        maxRequestsPerHour: 3000,
                        maxRequestsPerDay: 50000
                    },
                    priority: 'high',
                    fallbackEndpoints: ['alphaVantage', 'twelveData'],
                    cacheDuration: 5 * 60 * 1000,
                    retryAttempts: 3,
                    retryDelay: 1000
                }],
            ['alphaVantage', {
                    name: 'Alpha Vantage',
                    baseUrl: 'https://www.alphavantage.co/query',
                    rateLimit: {
                        maxRequestsPerMinute: 4,
                        maxRequestsPerHour: 200,
                        maxRequestsPerDay: 1000
                    },
                    priority: 'medium',
                    fallbackEndpoints: ['twelveData'],
                    cacheDuration: 10 * 60 * 1000,
                    retryAttempts: 2,
                    retryDelay: 2000
                }],
            ['twelveData', {
                    name: 'Twelve Data',
                    baseUrl: 'https://api.twelvedata.com',
                    rateLimit: {
                        maxRequestsPerMinute: 6,
                        maxRequestsPerHour: 300,
                        maxRequestsPerDay: 2000
                    },
                    priority: 'medium',
                    fallbackEndpoints: ['alphaVantage'],
                    cacheDuration: 8 * 60 * 1000,
                    retryAttempts: 2,
                    retryDelay: 1500
                }],
            ['coinGecko', {
                    name: 'CoinGecko',
                    baseUrl: 'https://api.coingecko.com/api/v3',
                    rateLimit: {
                        maxRequestsPerMinute: 40,
                        maxRequestsPerHour: 2000,
                        maxRequestsPerDay: 30000
                    },
                    priority: 'high',
                    fallbackEndpoints: ['coinMarketCap'],
                    cacheDuration: 3 * 60 * 1000,
                    retryAttempts: 3,
                    retryDelay: 1000
                }],
            ['coinMarketCap', {
                    name: 'CoinMarketCap',
                    baseUrl: 'https://pro-api.coinmarketcap.com/v1',
                    rateLimit: {
                        maxRequestsPerMinute: 8,
                        maxRequestsPerHour: 400,
                        maxRequestsPerDay: 5000
                    },
                    priority: 'medium',
                    fallbackEndpoints: ['coinGecko'],
                    cacheDuration: 5 * 60 * 1000,
                    retryAttempts: 2,
                    retryDelay: 2000
                }],
            ['defiLlama', {
                    name: 'DeFi Llama',
                    baseUrl: 'https://api.llama.fi',
                    rateLimit: {
                        maxRequestsPerMinute: 80,
                        maxRequestsPerHour: 4000,
                        maxRequestsPerDay: 50000
                    },
                    priority: 'low',
                    fallbackEndpoints: [],
                    cacheDuration: 15 * 60 * 1000,
                    retryAttempts: 2,
                    retryDelay: 3000
                }]
        ]);
        this.initializeProcessing();
    }
    initializeProcessing() {
        for (const [endpointName, config] of this.API_ENDPOINTS) {
            this.isProcessing.set(endpointName, false);
            this.requestQueues.set(endpointName, []);
            this.lastRequestTimes.set(endpointName, []);
            this.startProcessing(endpointName);
        }
    }
    startProcessing(endpointName) {
        const interval = setInterval(() => {
            this.processQueue(endpointName);
        }, 1000);
        this.processingIntervals.set(endpointName, interval);
    }
    async processQueue(endpointName) {
        if (this.isProcessing.get(endpointName))
            return;
        const queue = this.requestQueues.get(endpointName);
        if (!queue || queue.length === 0)
            return;
        this.isProcessing.set(endpointName, true);
        try {
            while (queue.length > 0 && this.canMakeRequest(endpointName)) {
                const item = queue.shift();
                if (!item)
                    break;
                try {
                    const result = await item.execute();
                    item.resolve(result);
                    this.recordRequest(endpointName);
                }
                catch (error) {
                    if (item.retryCount < item.maxRetries) {
                        item.retryCount++;
                        item.timestamp = Date.now() + (item.retryDelay * Math.pow(2, item.retryCount - 1));
                        queue.push(item);
                    }
                    else {
                        item.reject(error);
                    }
                }
            }
        }
        finally {
            this.isProcessing.set(endpointName, false);
        }
    }
    canMakeRequest(endpointName) {
        const config = this.API_ENDPOINTS.get(endpointName);
        if (!config)
            return false;
        const now = Date.now();
        const lastRequests = this.lastRequestTimes.get(endpointName) || [];
        const recentRequests = lastRequests.filter(time => now - time < 60000);
        if (recentRequests.length >= config.rateLimit.maxRequestsPerMinute) {
            return false;
        }
        const hourRequests = lastRequests.filter(time => now - time < 3600000);
        if (config.rateLimit.maxRequestsPerHour && hourRequests.length >= config.rateLimit.maxRequestsPerHour) {
            return false;
        }
        const dayRequests = lastRequests.filter(time => now - time < 86400000);
        if (config.rateLimit.maxRequestsPerDay && dayRequests.length >= config.rateLimit.maxRequestsPerDay) {
            return false;
        }
        return true;
    }
    recordRequest(endpointName) {
        const now = Date.now();
        const lastRequests = this.lastRequestTimes.get(endpointName) || [];
        lastRequests.push(now);
        const recentRequests = lastRequests.filter(time => now - time < 86400000);
        this.lastRequestTimes.set(endpointName, recentRequests);
    }
    async scheduleRequest(endpointName, requestFn, priority = 'medium') {
        const config = this.API_ENDPOINTS.get(endpointName);
        if (!config) {
            throw new Error(`Unknown endpoint: ${endpointName}`);
        }
        const cacheKey = `${endpointName}_${requestFn.toString().slice(0, 50)}`;
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < cached.ttl) {
            return cached.data;
        }
        if (this.canMakeRequest(endpointName)) {
            try {
                const result = await requestFn();
                this.recordRequest(endpointName);
                this.cache.set(cacheKey, {
                    data: result,
                    timestamp: Date.now(),
                    ttl: config.cacheDuration
                });
                return result;
            }
            catch (error) {
                return this.tryFallbackEndpoints(endpointName, requestFn, priority);
            }
        }
        return new Promise((resolve, reject) => {
            const priorityScore = this.getPriorityScore(priority);
            const item = {
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
            queue.sort((a, b) => b.priority - a.priority);
            this.requestQueues.set(endpointName, queue);
        });
    }
    async tryFallbackEndpoints(originalEndpoint, requestFn, priority) {
        const config = this.API_ENDPOINTS.get(originalEndpoint);
        if (!(config === null || config === void 0 ? void 0 : config.fallbackEndpoints) || config.fallbackEndpoints.length === 0) {
            throw new Error(`No fallback endpoints available for ${originalEndpoint}`);
        }
        for (const fallbackName of config.fallbackEndpoints) {
            try {
                return await this.scheduleRequest(fallbackName, requestFn, priority);
            }
            catch (error) {
                console.warn(`Fallback endpoint ${fallbackName} failed:`, error instanceof Error ? error.message : 'Unknown error');
                continue;
            }
        }
        throw new Error(`All endpoints failed for ${originalEndpoint}`);
    }
    getPriorityScore(priority) {
        switch (priority) {
            case 'high': return 3;
            case 'medium': return 2;
            case 'low': return 1;
            default: return 2;
        }
    }
    getQueueStatus() {
        const status = {};
        for (const [endpointName, queue] of this.requestQueues) {
            const config = this.API_ENDPOINTS.get(endpointName);
            const lastRequests = this.lastRequestTimes.get(endpointName) || [];
            const now = Date.now();
            status[endpointName] = {
                name: (config === null || config === void 0 ? void 0 : config.name) || endpointName,
                queueLength: queue.length,
                requestsLastMinute: lastRequests.filter(time => now - time < 60000).length,
                requestsLastHour: lastRequests.filter(time => now - time < 3600000).length,
                rateLimit: config === null || config === void 0 ? void 0 : config.rateLimit,
                isProcessing: this.isProcessing.get(endpointName)
            };
        }
        return status;
    }
    clearCache(endpointName) {
        if (endpointName) {
            for (const [key] of this.cache) {
                if (key.startsWith(`${endpointName}_`)) {
                    this.cache.delete(key);
                }
            }
        }
        else {
            this.cache.clear();
        }
    }
    getCacheStats() {
        const now = Date.now();
        let totalItems = 0;
        let expiredItems = 0;
        let validItems = 0;
        for (const [key, value] of this.cache) {
            totalItems++;
            if (now - value.timestamp < value.ttl) {
                validItems++;
            }
            else {
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
    cleanupExpiredCache() {
        const now = Date.now();
        for (const [key, value] of this.cache) {
            if (now - value.timestamp >= value.ttl) {
                this.cache.delete(key);
            }
        }
    }
    stop() {
        for (const [endpointName, interval] of this.processingIntervals) {
            clearInterval(interval);
            this.isProcessing.set(endpointName, false);
        }
        this.processingIntervals.clear();
    }
}
exports.RateLimitManager = RateLimitManager;
exports.rateLimitManager = new RateLimitManager();
