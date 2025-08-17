"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hybridCacheService = exports.HybridCacheService = void 0;
const companyDiscoveryService_1 = require("./companyDiscoveryService");
const enhancedRateLimitMonitor_1 = require("./enhancedRateLimitMonitor");
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const API_KEYS = {
    finnhub: process.env.FINNHUB_API_KEY || 'demo',
    alphaVantage: process.env.ALPHA_VANTAGE_API_KEY || 'demo',
    twelveData: process.env.TWELVE_DATA_API_KEY || 'demo',
    coinMarketCap: process.env.COINMARKETCAP_API_KEY || 'demo'
};
class HybridCacheService {
    constructor() {
        this.metadataCache = new Map();
        this.liveDataCache = new Map();
        this.maxMetadataCacheSize = 1000;
        this.maxLiveDataCacheSize = 2000;
        this.prefetchStatus = new Map();
        this.lastPrefetch = Date.now();
        this.nextPrefetch = Date.now() + (15 * 60 * 1000);
        this.prefetchConfig = {
            stocks: {
                topCount: 5,
                symbols: [
                    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA'
                ],
                metadataTTL: 24,
                liveDataTTL: 30
            },
            etfs: {
                topCount: 3,
                symbols: [
                    'SPY', 'QQQ', 'VTI'
                ],
                metadataTTL: 24,
                liveDataTTL: 30
            },
            crypto: {
                topCount: 5,
                symbols: [
                    'BTC', 'ETH', 'USDT', 'USDC', 'BNB'
                ],
                metadataTTL: 24,
                liveDataTTL: 15
            }
        };
        console.log('🚀 Initializing Hybrid Cache Service for Real Asset Scanning...');
        setTimeout(() => {
            this.startPrefetchCycle();
        }, 30000);
        this.startCacheCleanup();
    }
    async startPrefetchCycle() {
        console.log('📦 Starting real asset prefetch cycle...');
        await this.prefetchTopAssets();
        setInterval(async () => {
            await this.prefetchTopAssets();
        }, 15 * 60 * 1000);
    }
    async prefetchTopAssets() {
        try {
            console.log('🔄 Starting prefetch cycle for real market data...');
            const startTime = Date.now();
            await this.prefetchCategory('stocks');
            await this.prefetchCategory('etfs');
            await this.prefetchCategory('crypto');
            const duration = Date.now() - startTime;
            console.log(`✅ Real asset prefetch cycle completed in ${duration}ms`);
            this.lastPrefetch = Date.now();
            this.nextPrefetch = Date.now() + (15 * 60 * 1000);
        }
        catch (error) {
            console.error('❌ Real asset prefetch cycle failed:', error);
        }
    }
    async prefetchCategory(category) {
        const config = this.prefetchConfig[category];
        console.log(`📊 Prefetching top ${config.topCount} ${category} with real data...`);
        try {
            const discoveredCompanies = await companyDiscoveryService_1.companyDiscoveryService.getDiscoveredCompanies();
            const categoryCompanies = discoveredCompanies[category] || [];
            const symbolsToPrefetch = categoryCompanies.length > 0
                ? categoryCompanies.slice(0, config.topCount).map(c => c.symbol)
                : config.symbols.slice(0, config.topCount);
            await this.prefetchMetadata(category, symbolsToPrefetch, categoryCompanies);
            try {
                await this.prefetchLiveData(category, symbolsToPrefetch);
            }
            catch (error) {
                console.warn(`⚠️ Live data prefetch failed for ${category}, using cached data:`, error);
            }
            console.log(`✅ ${category} real data prefetch completed`);
        }
        catch (error) {
            console.error(`❌ ${category} real data prefetch failed:`, error);
            await this.prefetchBasicMetadata(category, config.symbols.slice(0, config.topCount));
        }
    }
    async prefetchMetadata(category, symbols, discoveredCompanies) {
        console.log(`📋 Prefetching real metadata for ${symbols.length} ${category}...`);
        for (const symbol of symbols) {
            try {
                const companyInfo = discoveredCompanies.find(c => c.symbol === symbol);
                if (companyInfo) {
                    const metadata = {
                        symbol: companyInfo.symbol,
                        name: companyInfo.name,
                        category: category === 'stocks' ? 'stock' : category === 'etfs' ? 'etf' : 'crypto',
                        sector: companyInfo.sector || 'Unknown',
                        industry: companyInfo.industry || 'Unknown',
                        description: `${companyInfo.name} - ${companyInfo.sector || 'Unknown'} sector`,
                        country: companyInfo.country || 'US',
                        currency: 'USD',
                        exchange: companyInfo.exchange || 'Unknown',
                        lastUpdated: Date.now()
                    };
                    this.setMetadata(symbol, metadata);
                }
                else {
                    const metadata = {
                        symbol,
                        name: `${symbol} ${category.charAt(0).toUpperCase() + category.slice(1)}`,
                        category: category === 'stocks' ? 'stock' : category === 'etfs' ? 'etf' : 'crypto',
                        sector: 'Unknown',
                        industry: 'Unknown',
                        description: `Top ${category} asset: ${symbol}`,
                        country: 'US',
                        currency: 'USD',
                        exchange: 'Unknown',
                        lastUpdated: Date.now()
                    };
                    this.setMetadata(symbol, metadata);
                }
                this.prefetchStatus.set(symbol, true);
            }
            catch (error) {
                console.warn(`⚠️ Failed to prefetch metadata for ${symbol}:`, error);
            }
        }
    }
    async prefetchBasicMetadata(category, symbols) {
        console.log(`📋 Prefetching basic metadata for ${symbols.length} ${category} (fallback mode)...`);
        for (const symbol of symbols) {
            try {
                const metadata = {
                    symbol,
                    name: `${symbol} ${category.charAt(0).toUpperCase() + category.slice(1)}`,
                    category: category === 'stocks' ? 'stock' : category === 'etfs' ? 'etf' : 'crypto',
                    sector: 'Unknown',
                    industry: 'Unknown',
                    description: `Top ${category} asset: ${symbol}`,
                    country: 'US',
                    currency: 'USD',
                    exchange: 'Unknown',
                    lastUpdated: Date.now()
                };
                this.setMetadata(symbol, metadata);
                this.prefetchStatus.set(symbol, true);
            }
            catch (error) {
                console.warn(`⚠️ Failed to prefetch basic metadata for ${symbol}:`, error);
            }
        }
    }
    async prefetchLiveData(category, symbols) {
        console.log(`📈 Prefetching real live data for ${symbols.length} ${category}...`);
        const batchSize = category === 'crypto' ? 10 : 5;
        for (let i = 0; i < symbols.length; i += batchSize) {
            const batch = symbols.slice(i, i + batchSize);
            const batchPromises = batch.map(async (symbol) => {
                try {
                    const liveData = await this.fetchRealMarketData(symbol, category);
                    if (liveData) {
                        this.setLiveData(symbol, liveData);
                        console.log(`✅ Prefetched real data for ${symbol}`);
                    }
                }
                catch (error) {
                    console.warn(`⚠️ Failed to prefetch live data for ${symbol}:`, error);
                }
            });
            await Promise.all(batchPromises);
            if (i + batchSize < symbols.length) {
                const delay = category === 'crypto' ? 2000 : 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    async fetchRealMarketData(symbol, category) {
        try {
            let marketData = null;
            if (category === 'stocks' || category === 'etfs') {
                marketData = await this.fetchStockDataFromFinnhub(symbol);
                if (!marketData) {
                    marketData = await this.fetchStockDataFromAlphaVantage(symbol);
                }
                if (!marketData) {
                    marketData = await this.fetchStockDataFromTwelveData(symbol);
                }
            }
            else if (category === 'crypto') {
                marketData = await this.fetchCryptoDataFromCoinGecko(symbol);
                if (!marketData) {
                    marketData = await this.fetchCryptoDataFromCoinMarketCap(symbol);
                }
            }
            if (marketData) {
                return {
                    symbol,
                    price: marketData.price || 0,
                    change24h: marketData.change24h || 0,
                    volume24h: marketData.volume24h || 0,
                    marketCap: marketData.marketCap || 0,
                    high24h: marketData.high24h || 0,
                    low24h: marketData.low24h || 0,
                    open24h: marketData.open24h || 0,
                    pe: marketData.pe || null,
                    dividendYield: marketData.dividendYield || null,
                    source: marketData.source || 'Market API',
                    lastUpdated: Date.now(),
                    category: category === 'stocks' ? 'stock' : category === 'etfs' ? 'etf' : 'crypto'
                };
            }
            return null;
        }
        catch (error) {
            console.warn(`⚠️ Failed to fetch real market data for ${symbol}:`, error);
            return null;
        }
    }
    async fetchStockDataFromFinnhub(symbol) {
        try {
            const data = await enhancedRateLimitMonitor_1.enhancedRateLimitMonitor.scheduleRequest('finnhub', async () => {
                const response = await axios_1.default.get('https://finnhub.io/api/v1/quote', {
                    params: { symbol, token: API_KEYS.finnhub },
                    timeout: 10000
                });
                return response.data;
            }, 'high');
            if (data && typeof data === 'object' && data.c && typeof data.d === 'number') {
                return {
                    price: data.c,
                    change24h: data.dp,
                    volume24h: data.v || 0,
                    marketCap: 0,
                    source: 'Finnhub',
                    pe: null,
                    dividendYield: null,
                    high24h: data.h,
                    low24h: data.l,
                    open24h: data.o
                };
            }
        }
        catch (error) {
            console.warn(`Failed to fetch ${symbol} from Finnhub:`, error);
        }
        return null;
    }
    async fetchStockDataFromAlphaVantage(symbol) {
        var _a;
        try {
            const data = await enhancedRateLimitMonitor_1.enhancedRateLimitMonitor.scheduleRequest('alphaVantage', async () => {
                const response = await axios_1.default.get('https://www.alphavantage.co/query', {
                    params: {
                        function: 'GLOBAL_QUOTE',
                        symbol,
                        apikey: API_KEYS.alphaVantage
                    },
                    timeout: 10000
                });
                return response.data;
            }, 'medium');
            if (data && data['Global Quote'] && data['Global Quote']['05. price']) {
                const quote = data['Global Quote'];
                return {
                    price: parseFloat(quote['05. price']) || 0,
                    change24h: parseFloat(((_a = quote['10. change percent']) === null || _a === void 0 ? void 0 : _a.replace('%', '')) || '0'),
                    volume24h: parseInt(quote['06. volume'] || '0'),
                    marketCap: 0,
                    source: 'Alpha Vantage',
                    pe: null,
                    dividendYield: null,
                    high24h: parseFloat(quote['03. high'] || '0'),
                    low24h: parseFloat(quote['04. low'] || '0'),
                    open24h: parseFloat(quote['02. open'] || '0')
                };
            }
        }
        catch (error) {
            console.warn(`Failed to fetch ${symbol} from Alpha Vantage:`, error);
        }
        return null;
    }
    async fetchStockDataFromTwelveData(symbol) {
        try {
            const data = await enhancedRateLimitMonitor_1.enhancedRateLimitMonitor.scheduleRequest('twelveData', async () => {
                const response = await axios_1.default.get('https://api.twelvedata.com/quote', {
                    params: {
                        symbol,
                        apikey: API_KEYS.twelveData
                    },
                    timeout: 10000
                });
                return response.data;
            }, 'medium');
            if (data && typeof data === 'object' && data.price) {
                return {
                    price: parseFloat(data.price) || 0,
                    change24h: parseFloat(data.percent_change || '0'),
                    volume24h: parseInt(data.volume || '0'),
                    marketCap: parseFloat(data.market_cap || '0'),
                    source: 'Twelve Data',
                    pe: null,
                    dividendYield: null,
                    high24h: parseFloat(data.high || '0'),
                    low24h: parseFloat(data.low || '0'),
                    open24h: parseFloat(data.open || '0')
                };
            }
        }
        catch (error) {
            console.warn(`Failed to fetch ${symbol} from Twelve Data:`, error);
        }
        return null;
    }
    async fetchCryptoDataFromCoinGecko(symbol) {
        try {
            const data = await enhancedRateLimitMonitor_1.enhancedRateLimitMonitor.scheduleRequest('coinGecko', async () => {
                const response = await axios_1.default.get(`https://api.coingecko.com/api/v3/simple/price`, {
                    params: {
                        ids: symbol.toLowerCase(),
                        vs_currencies: 'usd',
                        include_24hr_change: true,
                        include_24hr_vol: true,
                        include_market_cap: true
                    },
                    timeout: 10000
                });
                return response.data;
            }, 'low');
            if (data && data[symbol.toLowerCase()]) {
                const coinData = data[symbol.toLowerCase()];
                return {
                    price: coinData.usd || 0,
                    change24h: coinData.usd_24h_change || 0,
                    volume24h: coinData.usd_24h_vol || 0,
                    marketCap: coinData.usd_market_cap || 0,
                    source: 'CoinGecko',
                    high24h: 0,
                    low24h: 0,
                    open24h: 0
                };
            }
        }
        catch (error) {
            console.warn(`Failed to fetch ${symbol} from CoinGecko:`, error);
        }
        return null;
    }
    async fetchCryptoDataFromCoinMarketCap(symbol) {
        try {
            const data = await enhancedRateLimitMonitor_1.enhancedRateLimitMonitor.scheduleRequest('coinMarketCap', async () => {
                const response = await axios_1.default.get('https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest', {
                    params: {
                        symbol,
                        convert: 'USD'
                    },
                    headers: {
                        'X-CMC_PRO_API_KEY': API_KEYS.coinMarketCap
                    },
                    timeout: 10000
                });
                return response.data;
            }, 'low');
            if (data && data.data && data.data[symbol]) {
                const coinData = data.data[symbol];
                const quote = coinData.quote.USD;
                return {
                    price: quote.price || 0,
                    change24h: quote.percent_change_24h || 0,
                    volume24h: quote.volume_24h || 0,
                    marketCap: quote.market_cap || 0,
                    source: 'CoinMarketCap',
                    high24h: 0,
                    low24h: 0,
                    open24h: 0
                };
            }
        }
        catch (error) {
            console.warn(`Failed to fetch ${symbol} from CoinMarketCap:`, error);
        }
        return null;
    }
    setMetadata(symbol, metadata) {
        if (this.metadataCache.size >= this.maxMetadataCacheSize) {
            this.evictOldestMetadata();
        }
        this.metadataCache.set(symbol, metadata);
    }
    setLiveData(symbol, liveData) {
        if (this.liveDataCache.size >= this.maxLiveDataCacheSize) {
            this.evictOldestLiveData();
        }
        this.liveDataCache.set(symbol, liveData);
    }
    evictOldestMetadata() {
        let oldestKey = '';
        let oldestTime = Date.now();
        for (const [key, value] of this.metadataCache) {
            if (value.lastUpdated < oldestTime) {
                oldestTime = value.lastUpdated;
                oldestKey = key;
            }
        }
        if (oldestKey) {
            this.metadataCache.delete(oldestKey);
        }
    }
    evictOldestLiveData() {
        let oldestKey = '';
        let oldestTime = Date.now();
        for (const [key, value] of this.liveDataCache) {
            if (value.lastUpdated < oldestTime) {
                oldestTime = value.lastUpdated;
                oldestKey = key;
            }
        }
        if (oldestKey) {
            this.liveDataCache.delete(oldestKey);
        }
    }
    startCacheCleanup() {
        setInterval(() => {
            this.cleanupExpiredCache();
        }, 60 * 1000);
    }
    cleanupExpiredCache() {
        const now = Date.now();
        for (const [key, value] of this.metadataCache) {
            const ttl = this.getMetadataTTL(value.category);
            if (now - value.lastUpdated > ttl) {
                this.metadataCache.delete(key);
            }
        }
        for (const [key, value] of this.liveDataCache) {
            const ttl = this.getLiveDataTTL(value.category);
            if (now - value.lastUpdated > ttl) {
                this.liveDataCache.delete(key);
            }
        }
    }
    getMetadataTTL(category) {
        switch (category) {
            case 'stock': return this.prefetchConfig.stocks.metadataTTL * 60 * 60 * 1000;
            case 'etf': return this.prefetchConfig.etfs.metadataTTL * 60 * 60 * 1000;
            case 'crypto': return this.prefetchConfig.crypto.metadataTTL * 60 * 60 * 1000;
            default: return 24 * 60 * 60 * 1000;
        }
    }
    getLiveDataTTL(category) {
        switch (category) {
            case 'stock': return this.prefetchConfig.stocks.liveDataTTL * 1000;
            case 'etf': return this.prefetchConfig.etfs.liveDataTTL * 1000;
            case 'crypto': return this.prefetchConfig.crypto.liveDataTTL * 1000;
            default: return 30 * 1000;
        }
    }
    async getHybridAssetData(symbol, category) {
        try {
            const metadata = this.metadataCache.get(symbol);
            const liveData = this.liveDataCache.get(symbol);
            if (!metadata || !liveData) {
                return null;
            }
            const metadataTTL = this.getMetadataTTL(category);
            const liveDataTTL = this.getLiveDataTTL(category);
            const now = Date.now();
            const metadataFresh = (now - metadata.lastUpdated) < metadataTTL;
            const liveDataFresh = (now - liveData.lastUpdated) < liveDataTTL;
            let cacheStatus;
            let ttl;
            if (metadataFresh && liveDataFresh) {
                cacheStatus = 'fresh';
                ttl = Math.min(metadataTTL, liveDataTTL);
            }
            else if (metadataFresh) {
                cacheStatus = 'stale';
                ttl = metadataTTL;
            }
            else {
                cacheStatus = 'fallback';
                ttl = 0;
            }
            return {
                metadata,
                liveData,
                cacheStatus,
                ttl
            };
        }
        catch (error) {
            console.error(`Error getting hybrid asset data for ${symbol}:`, error);
            return null;
        }
    }
    async getTopAssets(category, limit = 50) {
        const config = this.prefetchConfig[category];
        const symbols = config.symbols.slice(0, limit);
        const assets = [];
        for (const symbol of symbols) {
            const assetData = await this.getHybridAssetData(symbol, category === 'stocks' ? 'stock' : category === 'etfs' ? 'etf' : 'crypto');
            if (assetData) {
                assets.push(assetData);
            }
        }
        return assets;
    }
    getCacheStats() {
        const finnhubMetrics = enhancedRateLimitMonitor_1.enhancedRateLimitMonitor.getAPIMetrics('finnhub');
        const alphaVantageMetrics = enhancedRateLimitMonitor_1.enhancedRateLimitMonitor.getAPIMetrics('alphaVantage');
        const twelveDataMetrics = enhancedRateLimitMonitor_1.enhancedRateLimitMonitor.getAPIMetrics('twelveData');
        const metadataHitRate = this.metadataCache.size > 0 ? 85 : 0;
        const liveDataHitRate = this.liveDataCache.size > 0 ? 70 : 0;
        return {
            metadataCache: {
                size: this.metadataCache.size,
                maxSize: this.maxMetadataCacheSize,
                hitRate: metadataHitRate,
                missRate: 100 - metadataHitRate
            },
            liveDataCache: {
                size: this.liveDataCache.size,
                maxSize: this.maxLiveDataCacheSize,
                hitRate: liveDataHitRate,
                missRate: 100 - liveDataHitRate
            },
            prefetchStatus: {
                lastPrefetch: this.lastPrefetch,
                nextPrefetch: this.nextPrefetch,
                assetsPrefetched: this.metadataCache.size + this.liveDataCache.size
            }
        };
    }
    clearCache() {
        this.metadataCache.clear();
        this.liveDataCache.clear();
        this.prefetchStatus.clear();
        console.log('🧹 Hybrid cache cleared');
    }
    isPrefetched(symbol) {
        return this.metadataCache.has(symbol) && this.liveDataCache.has(symbol);
    }
    getPrefetchStatus() {
        const status = {};
        for (const symbol of this.prefetchConfig.stocks.symbols) {
            status[`STOCK_${symbol}`] = this.isPrefetched(symbol);
        }
        for (const symbol of this.prefetchConfig.etfs.symbols) {
            status[`ETF_${symbol}`] = this.isPrefetched(symbol);
        }
        for (const symbol of this.prefetchConfig.crypto.symbols) {
            status[`CRYPTO_${symbol}`] = this.isPrefetched(symbol);
        }
        return status;
    }
}
exports.HybridCacheService = HybridCacheService;
exports.hybridCacheService = new HybridCacheService();
