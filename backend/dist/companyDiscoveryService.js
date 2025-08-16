"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.companyDiscoveryService = exports.CompanyDiscoveryService = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const API_KEYS = {
    finnhub: process.env.FINNHUB_API_KEY || 'demo',
    alphaVantage: process.env.ALPHA_VANTAGE_API_KEY || 'demo',
    twelveData: process.env.TWELVE_DATA_API_KEY || 'demo',
    coinMarketCap: process.env.COINMARKETCAP_API_KEY || 'demo'
};
class EnhancedCache {
    constructor(maxSize = 1000, ttl = 24 * 60 * 60 * 1000, cleanupInterval = 60 * 60 * 1000) {
        this.cache = new Map();
        this.maxSize = maxSize;
        this.ttl = ttl;
        this.cleanupInterval = cleanupInterval;
        setInterval(() => this.cleanup(), this.cleanupInterval);
    }
    set(key, data, source) {
        if (this.cache.size >= this.maxSize) {
            this.evictOldest();
        }
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            lastAccessed: Date.now(),
            accessCount: 1,
            source
        });
    }
    get(key) {
        const entry = this.cache.get(key);
        if (!entry)
            return null;
        if (Date.now() - entry.timestamp > this.ttl) {
            this.cache.delete(key);
            return null;
        }
        entry.lastAccessed = Date.now();
        entry.accessCount++;
        return entry.data;
    }
    has(key) {
        return this.cache.has(key) && !this.isExpired(key);
    }
    isExpired(key) {
        const entry = this.cache.get(key);
        if (!entry)
            return true;
        return Date.now() - entry.timestamp > this.ttl;
    }
    evictOldest() {
        let oldestKey = null;
        let oldestTime = Date.now();
        for (const [key, entry] of this.cache) {
            if (entry.lastAccessed < oldestTime) {
                oldestTime = entry.lastAccessed;
                oldestKey = key;
            }
        }
        if (oldestKey) {
            this.cache.delete(oldestKey);
        }
    }
    cleanup() {
        const now = Date.now();
        for (const [key, entry] of this.cache) {
            if (now - entry.timestamp > this.ttl) {
                this.cache.delete(key);
            }
        }
    }
    getStats() {
        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            hitRate: 0,
            sources: new Set([...this.cache.values()].map(entry => entry.source))
        };
    }
    clear() {
        this.cache.clear();
    }
}
class CompanyDiscoveryService {
    constructor() {
        this.discoveredCompanies = {
            stocks: [],
            etfs: [],
            crypto: [],
            timestamp: Date.now(),
            dataSource: 'Enhanced Discovery System'
        };
        this.companyCache = new EnhancedCache(1000, 24 * 60 * 60 * 1000);
        this.discoveryCache = new EnhancedCache(500, 6 * 60 * 60 * 1000);
        this.apiResponseCache = new EnhancedCache(2000, 30 * 60 * 1000);
        this.loadingState = {
            stocks: { discovered: 0, target: 500, lastUpdate: 0 },
            etfs: { discovered: 0, target: 300, lastUpdate: 0 },
            crypto: { discovered: 0, target: 800, lastUpdate: 0 }
        };
        this.apiUsageTracker = new Map();
        setInterval(() => this.refreshDiscovery(), 2 * 60 * 60 * 1000);
        setInterval(() => this.cleanupCaches(), 30 * 60 * 1000);
    }
    generateCacheKey(options) {
        const key = JSON.stringify(options);
        return `discovery_${Buffer.from(key).toString('base64').substring(0, 16)}`;
    }
    generateAPICacheKey(api, endpoint, params) {
        const paramString = JSON.stringify(params);
        return `api_${api}_${endpoint}_${Buffer.from(paramString).toString('base64').substring(0, 16)}`;
    }
    isAPIAvailable(api) {
        const tracker = this.apiUsageTracker.get(api);
        if (!tracker)
            return true;
        const now = Date.now();
        if (now > tracker.resetTime) {
            this.apiUsageTracker.delete(api);
            return true;
        }
        const limits = {
            finnhub: 60,
            alphaVantage: 5,
            twelveData: 800,
            coinMarketCap: 10000
        };
        const limit = limits[api] || 100;
        return tracker.requests < limit;
    }
    trackAPIUsage(api) {
        const now = Date.now();
        const tracker = this.apiUsageTracker.get(api) || { requests: 0, resetTime: now + 60000 };
        tracker.requests++;
        if (api === 'twelveData') {
            tracker.resetTime = now + 24 * 60 * 60 * 1000;
        }
        else if (api === 'coinMarketCap') {
            tracker.resetTime = now + 30 * 24 * 60 * 60 * 1000;
        }
        else {
            tracker.resetTime = now + 60 * 1000;
        }
        this.apiUsageTracker.set(api, tracker);
    }
    async getDiscoveredCompanies(options = {}) {
        const cacheKey = this.generateCacheKey(options);
        if (this.discoveryCache.has(cacheKey)) {
            console.log('📋 Using cached discovery data');
            return this.discoveryCache.get(cacheKey);
        }
        const cachedStocks = this.companyCache.get('stocks') || [];
        const cachedETFs = this.companyCache.get('etfs') || [];
        const cachedCrypto = this.companyCache.get('crypto') || [];
        if (cachedStocks.length >= 200 && cachedETFs.length >= 100 && cachedCrypto.length >= 300) {
            console.log('📋 Using cached company data');
            const result = {
                stocks: cachedStocks,
                etfs: cachedETFs,
                crypto: cachedCrypto,
                timestamp: Date.now(),
                dataSource: 'Enhanced Cache System'
            };
            this.discoveryCache.set(cacheKey, result, 'Enhanced Cache System');
            return result;
        }
        console.log('🚀 Starting enhanced company discovery...');
        const result = await this.discoverCompaniesEnhanced(options);
        this.discoveryCache.set(cacheKey, result, 'Enhanced Discovery System');
        return result;
    }
    async discoverCompaniesEnhanced(options) {
        const result = {
            stocks: [],
            etfs: [],
            crypto: [],
            timestamp: Date.now(),
            dataSource: 'Enhanced Discovery System'
        };
        result.stocks = await this.discoverStocksEnhanced(options);
        result.etfs = await this.discoverETFsEnhanced(options);
        result.crypto = await this.discoverCryptoEnhanced(options);
        console.log(`✅ Enhanced discovery completed: ${result.stocks.length} stocks, ${result.etfs.length} ETFs, ${result.crypto.length} crypto`);
        return result;
    }
    async discoverStocksEnhanced(options = {}) {
        const cacheKey = 'stocks';
        const cached = this.companyCache.get(cacheKey);
        if (cached && cached.length >= 200) {
            console.log(`📋 Using cached stocks data: ${cached.length} stocks`);
            return cached;
        }
        console.log('📈 Discovering stocks with enhanced caching...');
        const stocks = [];
        if (this.isAPIAvailable('finnhub')) {
            try {
                const finnhubStocks = await this.discoverStocksFromFinnhubCached();
                stocks.push(...finnhubStocks);
                console.log(`✅ Finnhub: ${finnhubStocks.length} stocks discovered`);
            }
            catch (error) {
                console.warn('⚠️ Finnhub stock discovery failed:', error);
            }
        }
        if (stocks.length < 150 && this.isAPIAvailable('twelveData')) {
            try {
                const twelveDataStocks = await this.discoverStocksFromTwelveDataCached();
                stocks.push(...twelveDataStocks);
                console.log(`✅ Twelve Data: ${twelveDataStocks.length} stocks discovered`);
            }
            catch (error) {
                console.warn('⚠️ Twelve Data stock discovery failed:', error);
            }
        }
        const uniqueStocks = this.removeDuplicates(stocks);
        const maxAssets = options.maxAssets || 500;
        const finalStocks = uniqueStocks.slice(0, maxAssets);
        this.companyCache.set(cacheKey, finalStocks, 'Enhanced Discovery');
        this.loadingState.stocks.discovered = finalStocks.length;
        this.loadingState.stocks.lastUpdate = Date.now();
        return finalStocks;
    }
    async discoverStocksFromFinnhubCached() {
        const cacheKey = this.generateAPICacheKey('finnhub', 'stocks', { exchange: 'US' });
        const cached = this.apiResponseCache.get(cacheKey);
        if (cached) {
            console.log('📋 Using cached Finnhub stocks data');
            return cached;
        }
        const stocks = [];
        const exchanges = ['US', 'NASDAQ', 'NYSE', 'AMEX'];
        for (const exchange of exchanges) {
            if (!this.isAPIAvailable('finnhub'))
                break;
            try {
                const response = await fetch(`https://finnhub.io/api/v1/stock/symbol?exchange=${exchange}&token=${process.env.FINNHUB_API_KEY}`);
                if (response.ok) {
                    const data = await response.json();
                    if (Array.isArray(data)) {
                        const batch = data.slice(0, 150).map((stock) => ({
                            symbol: stock.symbol,
                            name: stock.description || stock.symbol,
                            sector: stock.primarySic || 'Unknown',
                            industry: stock.primarySic || 'Unknown',
                            exchange: stock.primaryExchange || exchange
                        }));
                        stocks.push(...batch);
                    }
                }
                this.trackAPIUsage('finnhub');
                await new Promise(resolve => setTimeout(resolve, 1200));
            }
            catch (error) {
                console.warn(`⚠️ Finnhub exchange ${exchange} failed:`, error);
            }
        }
        this.apiResponseCache.set(cacheKey, stocks, 'Finnhub');
        return stocks;
    }
    async discoverStocksFromTwelveDataCached() {
        const cacheKey = this.generateAPICacheKey('twelveData', 'stocks', { country: 'US' });
        const cached = this.apiResponseCache.get(cacheKey);
        if (cached) {
            console.log('📋 Using cached Twelve Data stocks data');
            return cached;
        }
        try {
            const response = await fetch(`https://api.twelvedata.com/stocks?country=US&apikey=${process.env.TWELVE_DATA_API_KEY}`);
            if (response.ok) {
                const data = await response.json();
                if (data.status === 'ok' && Array.isArray(data.data)) {
                    const stocks = data.data.slice(0, 300).map((stock) => ({
                        symbol: stock.symbol,
                        name: stock.name || stock.symbol,
                        sector: stock.sector || 'Unknown',
                        industry: stock.industry || 'Unknown',
                        exchange: stock.exchange || 'Unknown'
                    }));
                    this.apiResponseCache.set(cacheKey, stocks, 'Twelve Data');
                    this.trackAPIUsage('twelveData');
                    return stocks;
                }
            }
        }
        catch (error) {
            console.warn('⚠️ Twelve Data discovery failed:', error);
        }
        return [];
    }
    async discoverETFsEnhanced(options = {}) {
        const cacheKey = 'etfs';
        const cached = this.companyCache.get(cacheKey);
        if (cached && cached.length >= 100) {
            console.log(`📋 Using cached ETFs data: ${cached.length} ETFs`);
            return cached;
        }
        console.log('📊 Discovering ETFs with enhanced caching...');
        const etfs = [];
        if (this.isAPIAvailable('twelveData')) {
            try {
                const twelveDataETFs = await this.discoverETFsFromTwelveDataCached();
                etfs.push(...twelveDataETFs);
                console.log(`✅ Twelve Data: ${twelveDataETFs.length} ETFs discovered`);
            }
            catch (error) {
                console.warn('⚠️ Twelve Data ETF discovery failed:', error);
            }
        }
        if (etfs.length < 100 && this.isAPIAvailable('finnhub')) {
            try {
                const finnhubETFs = await this.discoverETFsFromFinnhubCached();
                etfs.push(...finnhubETFs);
                console.log(`✅ Finnhub: ${finnhubETFs.length} ETFs discovered`);
            }
            catch (error) {
                console.warn('⚠️ Finnhub ETF discovery failed:', error);
            }
        }
        const uniqueETFs = this.removeDuplicates(etfs);
        const maxAssets = options.maxAssets || 300;
        const finalETFs = uniqueETFs.slice(0, maxAssets);
        this.companyCache.set(cacheKey, finalETFs, 'Enhanced Discovery');
        this.loadingState.etfs.discovered = finalETFs.length;
        this.loadingState.etfs.lastUpdate = Date.now();
        return finalETFs;
    }
    async discoverETFsFromTwelveDataCached() {
        const cacheKey = this.generateAPICacheKey('twelveData', 'etfs', { country: 'US' });
        const cached = this.apiResponseCache.get(cacheKey);
        if (cached) {
            console.log('📋 Using cached Twelve Data ETFs data');
            return cached;
        }
        try {
            const response = await fetch(`https://api.twelvedata.com/etfs?country=US&apikey=${process.env.TWELVE_DATA_API_KEY}`);
            if (response.ok) {
                const data = await response.json();
                if (data.status === 'ok' && Array.isArray(data.data)) {
                    const etfs = data.data.slice(0, 200).map((etf) => ({
                        symbol: etf.symbol,
                        name: etf.name || etf.symbol,
                        sector: 'ETF',
                        industry: etf.category || 'Exchange Traded Fund',
                        exchange: etf.exchange || 'ETF'
                    }));
                    this.apiResponseCache.set(cacheKey, etfs, 'Twelve Data');
                    this.trackAPIUsage('twelveData');
                    return etfs;
                }
            }
        }
        catch (error) {
            console.warn('⚠️ Twelve Data ETF discovery failed:', error);
        }
        return [];
    }
    async discoverETFsFromFinnhubCached() {
        const cacheKey = this.generateAPICacheKey('finnhub', 'etfs', {});
        const cached = this.apiResponseCache.get(cacheKey);
        if (cached) {
            console.log('📋 Using cached Finnhub ETFs data');
            return cached;
        }
        try {
            const response = await fetch(`https://finnhub.io/api/v1/etf/list?token=${process.env.FINNHUB_API_KEY}`);
            if (response.ok) {
                const data = await response.json();
                if (Array.isArray(data)) {
                    const etfs = data.slice(0, 150).map((etf) => ({
                        symbol: etf.symbol,
                        name: etf.name || etf.symbol,
                        sector: 'ETF',
                        industry: etf.category || 'Exchange Traded Fund',
                        exchange: etf.exchange || 'ETF'
                    }));
                    this.apiResponseCache.set(cacheKey, etfs, 'Finnhub');
                    this.trackAPIUsage('finnhub');
                    return etfs;
                }
            }
        }
        catch (error) {
            console.warn('⚠️ Finnhub ETF discovery failed:', error);
        }
        return [];
    }
    async discoverCryptoEnhanced(options = {}) {
        const cacheKey = 'crypto';
        const cached = this.companyCache.get(cacheKey);
        if (cached && cached.length >= 300) {
            console.log(`📋 Using cached crypto data: ${cached.length} crypto`);
            return cached;
        }
        console.log('🪙 Discovering crypto with enhanced caching...');
        const crypto = [];
        if (this.isAPIAvailable('coinGecko')) {
            try {
                const coinGeckoCrypto = await this.discoverCryptoFromCoinGeckoCached();
                crypto.push(...coinGeckoCrypto);
                console.log(`✅ CoinGecko: ${coinGeckoCrypto.length} crypto discovered`);
            }
            catch (error) {
                console.warn('⚠️ CoinGecko discovery failed:', error);
            }
        }
        if (crypto.length < 400) {
            try {
                const defiLlamaCrypto = await this.discoverCryptoFromDeFiLlamaCached();
                crypto.push(...defiLlamaCrypto);
                console.log(`✅ DeFi Llama: ${defiLlamaCrypto.length} crypto discovered`);
            }
            catch (error) {
                console.warn('⚠️ DeFi Llama discovery failed:', error);
            }
        }
        const uniqueCrypto = this.removeDuplicates(crypto);
        const maxAssets = options.maxAssets || 800;
        const finalCrypto = uniqueCrypto.slice(0, maxAssets);
        this.companyCache.set(cacheKey, finalCrypto, 'Enhanced Discovery');
        this.loadingState.crypto.discovered = finalCrypto.length;
        this.loadingState.crypto.lastUpdate = Date.now();
        return finalCrypto;
    }
    async discoverCryptoFromCoinGeckoCached() {
        const cacheKey = this.generateAPICacheKey('coinGecko', 'crypto', { page: 1 });
        const cached = this.apiResponseCache.get(cacheKey);
        if (cached) {
            console.log('📋 Using cached CoinGecko crypto data');
            return cached;
        }
        const crypto = [];
        try {
            for (let page = 1; page <= 2; page++) {
                const response = await fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=${page}&sparkline=false`);
                if (response.ok) {
                    const data = await response.json();
                    if (Array.isArray(data)) {
                        const batch = data.map((coin) => {
                            var _a, _b, _c, _d;
                            return ({
                                symbol: ((_a = coin.symbol) === null || _a === void 0 ? void 0 : _a.toUpperCase()) || ((_b = coin.id) === null || _b === void 0 ? void 0 : _b.toUpperCase()),
                                name: coin.name || ((_c = coin.symbol) === null || _c === void 0 ? void 0 : _c.toUpperCase()),
                                sector: 'Cryptocurrency',
                                industry: ((_d = coin.categories) === null || _d === void 0 ? void 0 : _d[0]) || 'Digital Asset',
                                exchange: 'Crypto Exchange'
                            });
                        });
                        crypto.push(...batch);
                    }
                }
                if (page < 2) {
                    await new Promise(resolve => setTimeout(resolve, 1500));
                }
            }
            this.apiResponseCache.set(cacheKey, crypto, 'CoinGecko');
            return crypto;
        }
        catch (error) {
            console.warn('⚠️ CoinGecko discovery failed:', error);
        }
        return [];
    }
    async discoverCryptoFromDeFiLlamaCached() {
        const cacheKey = this.generateAPICacheKey('defiLlama', 'crypto', {});
        const cached = this.apiResponseCache.get(cacheKey);
        if (cached) {
            console.log('📋 Using cached DeFi Llama crypto data');
            return cached;
        }
        const crypto = [];
        try {
            const protocolsResponse = await fetch('https://api.llama.fi/protocols');
            if (protocolsResponse.ok) {
                const protocolsData = await protocolsResponse.json();
                if (Array.isArray(protocolsData)) {
                    const batch = protocolsData.slice(0, 300).map((protocol) => {
                        var _a, _b, _c;
                        return ({
                            symbol: ((_a = protocol.symbol) === null || _a === void 0 ? void 0 : _a.toUpperCase()) || ((_b = protocol.name) === null || _b === void 0 ? void 0 : _b.substring(0, 5).toUpperCase()),
                            name: protocol.name || ((_c = protocol.symbol) === null || _c === void 0 ? void 0 : _c.toUpperCase()),
                            sector: 'DeFi Protocol',
                            industry: protocol.category || 'Decentralized Finance',
                            exchange: 'DeFi Protocol'
                        });
                    });
                    crypto.push(...batch);
                }
            }
            const chainsResponse = await fetch('https://api.llama.fi/chains');
            if (chainsResponse.ok) {
                const chainsData = await chainsResponse.json();
                if (Array.isArray(chainsData)) {
                    const batch = chainsData.slice(0, 100).map((chain) => {
                        var _a, _b, _c;
                        return ({
                            symbol: ((_a = chain.tokenSymbol) === null || _a === void 0 ? void 0 : _a.toUpperCase()) || ((_b = chain.name) === null || _b === void 0 ? void 0 : _b.substring(0, 5).toUpperCase()),
                            name: chain.name || ((_c = chain.tokenSymbol) === null || _c === void 0 ? void 0 : _c.toUpperCase()),
                            sector: 'Blockchain',
                            industry: 'Layer 1 Protocol',
                            exchange: 'Blockchain Network'
                        });
                    });
                    crypto.push(...batch);
                }
            }
            this.apiResponseCache.set(cacheKey, crypto, 'DeFi Llama');
            return crypto;
        }
        catch (error) {
            console.warn('⚠️ DeFi Llama discovery failed:', error);
        }
        return [];
    }
    removeDuplicates(companies) {
        const seen = new Set();
        return companies.filter(company => {
            const key = `${company.symbol}-${company.sector}`;
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }
    cleanupCaches() {
        console.log('🧹 Cleaning up caches...');
    }
    async refreshDiscovery() {
        console.log('🔄 Refreshing company discovery data...');
        try {
            this.discoveryCache.clear();
            await this.discoverCompaniesEnhanced({});
            console.log('✅ Company discovery refresh completed');
        }
        catch (error) {
            console.error('❌ Company discovery refresh failed:', error);
        }
    }
    getLoadingStatus() {
        return {
            stocks: { ...this.loadingState.stocks, target: this.loadingState.stocks.target },
            etfs: { ...this.loadingState.etfs, target: this.loadingState.etfs.target },
            crypto: { ...this.loadingState.crypto, target: this.loadingState.crypto.target }
        };
    }
    getCacheStats() {
        return {
            companyCache: this.companyCache.getStats(),
            discoveryCache: this.discoveryCache.getStats(),
            apiResponseCache: this.apiResponseCache.getStats(),
            apiUsage: Object.fromEntries(this.apiUsageTracker.entries())
        };
    }
    async refreshCompanies() {
        this.companyCache.clear();
        this.discoveryCache.clear();
        this.apiResponseCache.clear();
        this.loadingState.stocks.discovered = 0;
        this.loadingState.etfs.discovered = 0;
        this.loadingState.crypto.discovered = 0;
        return await this.getDiscoveredCompanies();
    }
    async searchCompanies(query, category) {
        const companies = await this.getDiscoveredCompanies();
        let searchPool = [];
        if (!category || category === 'stock') {
            searchPool.push(...companies.stocks);
        }
        if (!category || category === 'etf') {
            searchPool.push(...companies.etfs);
        }
        if (!category || category === 'crypto') {
            searchPool.push(...companies.crypto);
        }
        const queryLower = query.toLowerCase();
        return searchPool.filter(company => company.symbol.toLowerCase().includes(queryLower) ||
            company.name.toLowerCase().includes(queryLower) ||
            (company.sector && company.sector.toLowerCase().includes(queryLower)) ||
            (company.industry && company.industry.toLowerCase().includes(queryLower)));
    }
    async getCompaniesBySector(sector, category) {
        const companies = await this.getDiscoveredCompanies();
        let searchPool = [];
        if (!category || category === 'stock') {
            searchPool.push(...companies.stocks);
        }
        if (!category || category === 'etf') {
            searchPool.push(...companies.etfs);
        }
        if (!category || category === 'crypto') {
            searchPool.push(...companies.crypto);
        }
        const sectorLower = sector.toLowerCase();
        return searchPool.filter(company => company.sector && company.sector.toLowerCase().includes(sectorLower));
    }
    getDiscoveryStats() {
        const companies = this.discoveredCompanies;
        const sectors = new Set();
        const industries = new Set();
        [...companies.stocks, ...companies.etfs, ...companies.crypto].forEach(company => {
            if (company.sector)
                sectors.add(company.sector);
            if (company.industry)
                industries.add(company.industry);
        });
        return {
            totalCompanies: companies.stocks.length + companies.etfs.length + companies.crypto.length,
            stocks: companies.stocks.length,
            etfs: companies.etfs.length,
            crypto: companies.crypto.length,
            uniqueSectors: sectors.size,
            uniqueIndustries: industries.size,
            lastDiscovery: new Date(companies.timestamp || Date.now()).toISOString(),
            cacheStatus: 'active',
            loadingStatus: this.getLoadingStatus(),
            cacheStats: this.getCacheStats()
        };
    }
}
exports.CompanyDiscoveryService = CompanyDiscoveryService;
exports.companyDiscoveryService = new CompanyDiscoveryService();
