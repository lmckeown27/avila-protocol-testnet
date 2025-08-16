"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.paginatedMarketDataService = exports.PaginatedMarketDataService = void 0;
const enhancedRateLimitMonitor_1 = require("./enhancedRateLimitMonitor");
const companyDiscoveryService_1 = require("./companyDiscoveryService");
const hybridCacheService_1 = require("./hybridCacheService");
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const API_KEYS = {
    finnhub: process.env.FINNHUB_API_KEY || 'demo',
    alphaVantage: process.env.ALPHA_VANTAGE_API_KEY || 'demo',
    twelveData: process.env.TWELVE_DATA_API_KEY || 'demo',
    coinMarketCap: process.env.COINMARKETCAP_API_KEY || 'demo'
};
class PaginatedMarketDataService {
    constructor() {
        this.cache = new Map();
        this.CACHE_DURATION_MS = 5 * 60 * 1000;
        this.DEFAULT_PAGE_SIZE = 50;
        this.MAX_PAGE_SIZE = 100;
        setInterval(() => this.cleanupExpiredCache(), 60000);
    }
    async getStocks(options = { page: 1, limit: 25 }) {
        const startTime = Date.now();
        const page = options.page || 1;
        const limit = options.limit || 25;
        const search = options.search;
        const category = options.category;
        const sortBy = options.sortBy || 'symbol';
        const sortOrder = options.sortOrder || 'asc';
        try {
            console.log(`📈 Fetching stocks page ${page}, limit ${limit}, search: ${search || 'none'}, category: ${category || 'all'}`);
            const discoveredCompanies = await companyDiscoveryService_1.companyDiscoveryService.getDiscoveredCompanies();
            let availableStocks = discoveredCompanies.stocks;
            if (search) {
                availableStocks = availableStocks.filter(stock => stock.symbol.toLowerCase().includes(search.toLowerCase()) ||
                    stock.name.toLowerCase().includes(search.toLowerCase()));
            }
            if (category && category !== 'all') {
                availableStocks = availableStocks.filter(stock => stock.sector === category);
            }
            availableStocks.sort((a, b) => {
                let aValue, bValue;
                switch (sortBy) {
                    case 'symbol':
                        aValue = a.symbol;
                        bValue = b.symbol;
                        break;
                    case 'name':
                        aValue = a.name;
                        bValue = b.name;
                        break;
                    case 'sector':
                        aValue = a.sector;
                        bValue = b.sector;
                        break;
                    default:
                        aValue = a.symbol;
                        bValue = b.symbol;
                }
                if (sortOrder === 'desc') {
                    [aValue, bValue] = [bValue, aValue];
                }
                return aValue.localeCompare(bValue);
            });
            const total = availableStocks.length;
            const validatedLimit = Math.min(limit, this.MAX_PAGE_SIZE);
            const totalPages = Math.ceil(total / validatedLimit);
            const startIndex = (page - 1) * validatedLimit;
            const endIndex = startIndex + validatedLimit;
            const paginatedStocks = availableStocks.slice(startIndex, endIndex);
            const stocksWithMarketData = await this.fetchStockMarketData(paginatedStocks);
            const processingTime = Date.now() - startTime;
            return {
                data: stocksWithMarketData,
                pagination: {
                    page,
                    limit: validatedLimit,
                    total,
                    totalPages,
                    hasNext: page < totalPages,
                    hasPrev: page > 1
                },
                metadata: {
                    timestamp: new Date().toISOString(),
                    dataSource: 'Multiple APIs - Optimized',
                    processingTime
                }
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('❌ Error fetching stocks:', errorMessage);
            throw new Error(`Failed to fetch stocks: ${errorMessage}`);
        }
    }
    async fetchStockMarketData(companies) {
        const stocksWithData = [];
        const batchSize = 10;
        for (let i = 0; i < companies.length; i += batchSize) {
            const batch = companies.slice(i, i + batchSize);
            const batchPromises = batch.map(async (company) => {
                try {
                    const marketData = await this.fetchSingleStockData(company.symbol);
                    if (marketData) {
                        return {
                            id: company.symbol,
                            symbol: company.symbol,
                            name: company.name,
                            price: marketData.price,
                            change24h: marketData.change24h,
                            volume24h: marketData.volume24h,
                            marketCap: marketData.marketCap,
                            source: marketData.source,
                            lastUpdated: Date.now(),
                            category: 'stock',
                            sector: company.sector || 'Unknown',
                            industry: company.industry || 'Unknown',
                            pe: marketData.pe,
                            dividendYield: marketData.dividendYield,
                            high24h: marketData.high24h,
                            low24h: marketData.low24h,
                            open24h: marketData.open24h
                        };
                    }
                }
                catch (error) {
                    console.warn(`Failed to fetch market data for ${company.symbol}:`, error);
                }
                return null;
            });
            const batchResults = await Promise.all(batchPromises);
            stocksWithData.push(...batchResults.filter(Boolean));
            if (i + batchSize < companies.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        return stocksWithData;
    }
    async fetchSingleStockData(symbol) {
        try {
            const hybridData = await hybridCacheService_1.hybridCacheService.getHybridAssetData(symbol, 'stock');
            if (hybridData && hybridData.cacheStatus === 'fresh') {
                console.log(`📋 Using hybrid cache for ${symbol} (${hybridData.cacheStatus})`);
                return {
                    price: hybridData.liveData.price,
                    change24h: hybridData.liveData.change24h,
                    volume24h: hybridData.liveData.volume24h,
                    marketCap: hybridData.liveData.marketCap,
                    source: hybridData.liveData.source,
                    pe: hybridData.liveData.pe,
                    dividendYield: hybridData.liveData.dividendYield,
                    high24h: hybridData.liveData.high24h,
                    low24h: hybridData.liveData.low24h,
                    open24h: hybridData.liveData.open24h
                };
            }
            console.log(`🌐 Fetching fresh data for ${symbol} from external APIs...`);
            try {
                const finnhubData = await this.fetchStockDataFromFinnhub(symbol);
                if (finnhubData)
                    return finnhubData;
            }
            catch (error) {
                console.warn(`Finnhub failed for ${symbol}, trying Alpha Vantage...`);
            }
            try {
                const alphaVantageData = await this.fetchStockDataFromAlphaVantage(symbol);
                if (alphaVantageData)
                    return alphaVantageData;
            }
            catch (error) {
                console.warn(`Alpha Vantage failed for ${symbol}, trying Twelve Data...`);
            }
            try {
                const twelveDataData = await this.fetchStockDataFromTwelveData(symbol);
                if (twelveDataData)
                    return twelveDataData;
            }
            catch (error) {
                console.warn(`Twelve Data failed for ${symbol}`);
            }
            if (hybridData && hybridData.cacheStatus === 'stale') {
                console.log(`📋 Using stale cache data for ${symbol} as fallback`);
                return {
                    price: hybridData.liveData.price,
                    change24h: hybridData.liveData.change24h,
                    volume24h: hybridData.liveData.volume24h,
                    marketCap: hybridData.liveData.marketCap,
                    source: `${hybridData.liveData.source} (Stale)`,
                    pe: hybridData.liveData.pe,
                    dividendYield: hybridData.liveData.dividendYield,
                    high24h: hybridData.liveData.high24h,
                    low24h: hybridData.liveData.low24h,
                    open24h: hybridData.liveData.open24h
                };
            }
            return null;
        }
        catch (error) {
            console.error(`Error fetching data for ${symbol}:`, error);
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
    async getETFs(options = { page: 1, limit: 25 }) {
        const startTime = Date.now();
        const page = options.page || 1;
        const limit = options.limit || 25;
        const search = options.search;
        const category = options.category;
        const sortBy = options.sortBy || 'symbol';
        const sortOrder = options.sortOrder || 'asc';
        try {
            console.log(`📊 Fetching ETFs page ${page}, limit ${limit}, search: ${search || 'none'}, category: ${category || 'all'}`);
            const discoveredCompanies = await companyDiscoveryService_1.companyDiscoveryService.getDiscoveredCompanies();
            let availableETFs = discoveredCompanies.etfs;
            if (search) {
                availableETFs = availableETFs.filter(etf => etf.symbol.toLowerCase().includes(search.toLowerCase()) ||
                    etf.name.toLowerCase().includes(search.toLowerCase()));
            }
            if (category && category !== 'all') {
                availableETFs = availableETFs.filter(etf => etf.sector === category);
            }
            availableETFs.sort((a, b) => {
                let aValue, bValue;
                switch (sortBy) {
                    case 'symbol':
                        aValue = a.symbol;
                        bValue = b.symbol;
                        break;
                    case 'name':
                        aValue = a.name;
                        bValue = b.name;
                        break;
                    case 'sector':
                        aValue = a.sector;
                        bValue = b.sector;
                        break;
                    default:
                        aValue = a.symbol;
                        bValue = b.symbol;
                }
                if (sortOrder === 'desc') {
                    [aValue, bValue] = [bValue, aValue];
                }
                return aValue.localeCompare(bValue);
            });
            const total = availableETFs.length;
            const validatedLimit = Math.min(limit, this.MAX_PAGE_SIZE);
            const totalPages = Math.ceil(total / validatedLimit);
            const startIndex = (page - 1) * validatedLimit;
            const endIndex = startIndex + validatedLimit;
            const paginatedETFs = availableETFs.slice(startIndex, endIndex);
            const etfsWithMarketData = await this.fetchETFMarketData(paginatedETFs);
            const processingTime = Date.now() - startTime;
            return {
                data: etfsWithMarketData,
                pagination: {
                    page,
                    limit: validatedLimit,
                    total,
                    totalPages,
                    hasNext: page < totalPages,
                    hasPrev: page > 1
                },
                metadata: {
                    timestamp: new Date().toISOString(),
                    dataSource: 'Multiple APIs - Optimized',
                    processingTime
                }
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('❌ Error fetching ETFs:', errorMessage);
            throw new Error(`Failed to fetch ETFs: ${errorMessage}`);
        }
    }
    async fetchETFMarketData(etfs) {
        const etfAssets = await this.fetchStockMarketData(etfs);
        return etfAssets.map(stock => ({
            ...stock,
            category: 'etf',
            sector: stock.sector,
            expenseRatio: undefined,
            holdings: undefined
        }));
    }
    async getCrypto(options = { page: 1, limit: 25 }) {
        const startTime = Date.now();
        const page = options.page || 1;
        const limit = options.limit || 25;
        const search = options.search;
        const category = options.category;
        const sortBy = options.sortBy || 'symbol';
        const sortOrder = options.sortOrder || 'asc';
        try {
            console.log(`🪙 Fetching crypto page ${page}, limit ${limit}, search: ${search || 'none'}, category: ${category || 'all'}`);
            const discoveredCompanies = await companyDiscoveryService_1.companyDiscoveryService.getDiscoveredCompanies();
            let availableCrypto = discoveredCompanies.crypto;
            if (search) {
                availableCrypto = availableCrypto.filter(crypto => crypto.symbol.toLowerCase().includes(search.toLowerCase()) ||
                    crypto.name.toLowerCase().includes(search.toLowerCase()));
            }
            if (category && category !== 'all') {
                availableCrypto = availableCrypto.filter(crypto => crypto.sector === category);
            }
            availableCrypto.sort((a, b) => {
                let aValue, bValue;
                switch (sortBy) {
                    case 'symbol':
                        aValue = a.symbol;
                        bValue = b.symbol;
                        break;
                    case 'name':
                        aValue = a.name;
                        bValue = b.name;
                        break;
                    case 'sector':
                        aValue = a.sector;
                        bValue = b.sector;
                        break;
                    default:
                        aValue = a.symbol;
                        bValue = b.symbol;
                }
                if (sortOrder === 'desc') {
                    [aValue, bValue] = [bValue, aValue];
                }
                return aValue.localeCompare(bValue);
            });
            const total = availableCrypto.length;
            const validatedLimit = Math.min(limit, this.MAX_PAGE_SIZE);
            const totalPages = Math.ceil(total / validatedLimit);
            const startIndex = (page - 1) * validatedLimit;
            const endIndex = startIndex + validatedLimit;
            const paginatedCrypto = availableCrypto.slice(startIndex, endIndex);
            const cryptoWithMarketData = await this.fetchCryptoMarketData(paginatedCrypto);
            const processingTime = Date.now() - startTime;
            return {
                data: cryptoWithMarketData,
                pagination: {
                    page,
                    limit: validatedLimit,
                    total,
                    totalPages,
                    hasNext: page < totalPages,
                    hasPrev: page > 1
                },
                metadata: {
                    timestamp: new Date().toISOString(),
                    dataSource: 'Multiple APIs - Optimized',
                    processingTime
                }
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('❌ Error fetching crypto:', errorMessage);
            throw new Error(`Failed to fetch crypto: ${errorMessage}`);
        }
    }
    async fetchCryptoMarketData(cryptoList) {
        try {
            const coinGeckoCrypto = await this.fetchCryptoFromCoinGecko(cryptoList);
            if (coinGeckoCrypto.length > 0) {
                return coinGeckoCrypto;
            }
        }
        catch (error) {
            console.warn('CoinGecko failed, trying CoinMarketCap...');
        }
        try {
            const coinMarketCapCrypto = await this.fetchCryptoFromCoinMarketCap(cryptoList);
            if (coinMarketCapCrypto.length > 0) {
                return coinMarketCapCrypto;
            }
        }
        catch (error) {
            console.warn('CoinMarketCap failed');
        }
        return [];
    }
    async fetchCryptoFromCoinGecko(cryptoList) {
        try {
            const cachedAssets = [];
            const uncachedSymbols = [];
            for (const crypto of cryptoList) {
                const hybridData = await hybridCacheService_1.hybridCacheService.getHybridAssetData(crypto.symbol, 'crypto');
                if (hybridData && hybridData.cacheStatus === 'fresh') {
                    console.log(`📋 Using hybrid cache for ${crypto.symbol} (${hybridData.cacheStatus})`);
                    cachedAssets.push({
                        id: crypto.symbol.toLowerCase(),
                        symbol: hybridData.metadata.symbol,
                        name: hybridData.metadata.name,
                        price: hybridData.liveData.price,
                        change24h: hybridData.liveData.change24h,
                        volume24h: hybridData.liveData.volume24h,
                        marketCap: hybridData.liveData.marketCap,
                        source: hybridData.liveData.source,
                        lastUpdated: hybridData.liveData.lastUpdated,
                        category: 'crypto',
                        high24h: hybridData.liveData.high24h,
                        low24h: hybridData.liveData.low24h,
                        open24h: hybridData.liveData.open24h,
                        circulatingSupply: undefined,
                        maxSupply: undefined,
                        rank: undefined
                    });
                }
                else {
                    uncachedSymbols.push(crypto);
                }
            }
            if (cachedAssets.length === cryptoList.length) {
                console.log(`📋 All ${cachedAssets.length} crypto assets served from hybrid cache`);
                return cachedAssets;
            }
            if (uncachedSymbols.length > 0) {
                console.log(`🌐 Fetching ${uncachedSymbols.length} uncached crypto assets from CoinGecko...`);
                const cryptoIds = uncachedSymbols.map(crypto => crypto.symbol.toLowerCase()).join(',');
                if (!cryptoIds) {
                    return cachedAssets;
                }
                const data = await enhancedRateLimitMonitor_1.enhancedRateLimitMonitor.scheduleRequest('coinGecko', async () => {
                    const response = await axios_1.default.get('https://api.coingecko.com/api/v3/coins/markets', {
                        params: {
                            vs_currency: 'usd',
                            ids: cryptoIds,
                            order: 'market_cap_desc',
                            per_page: 250,
                            page: 1,
                            sparkline: false
                        },
                        timeout: 10000
                    });
                    return response.data;
                }, 'high');
                if (!Array.isArray(data)) {
                    console.warn('CoinGecko returned non-array data:', data);
                    return cachedAssets;
                }
                const apiAssets = data.map((coin) => ({
                    id: coin.id,
                    symbol: coin.symbol.toUpperCase(),
                    name: coin.name,
                    price: coin.current_price,
                    change24h: coin.price_change_percentage_24h,
                    volume24h: coin.total_volume,
                    marketCap: coin.market_cap,
                    source: 'CoinGecko',
                    lastUpdated: Date.now(),
                    category: 'crypto',
                    high24h: coin.high_24h,
                    low24h: coin.low_24h,
                    open24h: undefined,
                    circulatingSupply: coin.circulating_supply,
                    maxSupply: coin.max_supply,
                    rank: coin.market_cap_rank
                }));
                return [...cachedAssets, ...apiAssets];
            }
            return cachedAssets;
        }
        catch (error) {
            console.error('Failed to fetch from CoinGecko:', error);
            const fallbackAssets = [];
            for (const crypto of cryptoList) {
                const hybridData = await hybridCacheService_1.hybridCacheService.getHybridAssetData(crypto.symbol, 'crypto');
                if (hybridData && hybridData.cacheStatus === 'stale') {
                    console.log(`📋 Using stale cache data for ${crypto.symbol} as fallback`);
                    fallbackAssets.push({
                        id: crypto.symbol.toLowerCase(),
                        symbol: hybridData.metadata.symbol,
                        name: hybridData.metadata.name,
                        price: hybridData.liveData.price,
                        change24h: hybridData.liveData.change24h,
                        volume24h: hybridData.liveData.volume24h,
                        marketCap: hybridData.liveData.marketCap,
                        source: `${hybridData.liveData.source} (Stale)`,
                        lastUpdated: hybridData.liveData.lastUpdated,
                        category: 'crypto',
                        high24h: hybridData.liveData.high24h,
                        low24h: hybridData.liveData.low24h,
                        open24h: hybridData.liveData.open24h,
                        circulatingSupply: undefined,
                        maxSupply: undefined,
                        rank: undefined
                    });
                }
            }
            return fallbackAssets;
        }
    }
    async fetchCryptoFromCoinMarketCap(cryptoList) {
        try {
            if (!cryptoList || cryptoList.length === 0) {
                return [];
            }
            const data = await enhancedRateLimitMonitor_1.enhancedRateLimitMonitor.scheduleRequest('coinMarketCap', async () => {
                const response = await axios_1.default.get('https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest', {
                    params: {
                        start: 1,
                        limit: 250,
                        convert: 'USD'
                    },
                    headers: {
                        'X-CMC_PRO_API_KEY': API_KEYS.coinMarketCap
                    },
                    timeout: 10000
                });
                return response.data;
            }, 'medium');
            if (!data || !data.data || !Array.isArray(data.data)) {
                console.warn('CoinMarketCap returned invalid data structure:', data);
                return [];
            }
            const requestedSymbols = new Set(cryptoList.map(c => c.symbol.toUpperCase()));
            return data.data
                .filter((coin) => requestedSymbols.has(coin.symbol))
                .map((coin) => {
                var _a, _b, _c, _d, _e, _f, _g, _h;
                return ({
                    id: coin.slug,
                    symbol: coin.symbol,
                    name: coin.name,
                    price: ((_b = (_a = coin.quote) === null || _a === void 0 ? void 0 : _a.USD) === null || _b === void 0 ? void 0 : _b.price) || 0,
                    change24h: ((_d = (_c = coin.quote) === null || _c === void 0 ? void 0 : _c.USD) === null || _d === void 0 ? void 0 : _d.percent_change_24h) || 0,
                    volume24h: ((_f = (_e = coin.quote) === null || _e === void 0 ? void 0 : _e.USD) === null || _f === void 0 ? void 0 : _f.volume_24h) || 0,
                    marketCap: ((_h = (_g = coin.quote) === null || _g === void 0 ? void 0 : _g.USD) === null || _h === void 0 ? void 0 : _h.market_cap) || 0,
                    source: 'CoinMarketCap',
                    lastUpdated: Date.now(),
                    category: 'crypto',
                    high24h: undefined,
                    low24h: undefined,
                    open24h: undefined,
                    circulatingSupply: coin.circulating_supply,
                    maxSupply: coin.max_supply,
                    rank: coin.cmc_rank
                });
            });
        }
        catch (error) {
            console.error('Failed to fetch from CoinMarketCap:', error);
            return [];
        }
    }
    async searchAssets(query, category) {
        const startTime = Date.now();
        try {
            let results = [];
            let dataSource = '';
            if (!category || category === 'stock') {
                const stocks = await this.getStocks({ page: 1, limit: 100, search: query });
                results.push(...stocks.data);
                dataSource = stocks.metadata.dataSource;
            }
            if (!category || category === 'etf') {
                const etfs = await this.getETFs({ page: 1, limit: 100, search: query });
                results.push(...etfs.data);
                dataSource = dataSource ? `${dataSource}, ${etfs.metadata.dataSource}` : etfs.metadata.dataSource;
            }
            if (!category || category === 'crypto') {
                const crypto = await this.getCrypto({ page: 1, limit: 100, search: query });
                results.push(...crypto.data);
                dataSource = dataSource ? `${dataSource}, ${crypto.metadata.dataSource}` : crypto.metadata.dataSource;
            }
            const uniqueResults = this.removeDuplicates(results);
            const sortedResults = this.sortByRelevance(uniqueResults, query);
            return {
                assets: sortedResults.slice(0, 50),
                total: sortedResults.length,
                dataSource,
                cacheStatus: 'miss',
                searchTime: Date.now() - startTime
            };
        }
        catch (error) {
            console.error('Search error:', error);
            throw error;
        }
    }
    sortAssets(assets, sortBy, sortOrder) {
        return [...assets].sort((a, b) => {
            let aValue = a[sortBy];
            let bValue = b[sortBy];
            if (aValue === null || aValue === undefined)
                aValue = 0;
            if (bValue === null || bValue === undefined)
                bValue = 0;
            if (sortOrder === 'asc') {
                return aValue > bValue ? 1 : -1;
            }
            else {
                return aValue < bValue ? 1 : -1;
            }
        });
    }
    sortByRelevance(assets, query) {
        const queryLower = query.toLowerCase();
        return assets.sort((a, b) => {
            const aScore = this.calculateRelevanceScore(a, queryLower);
            const bScore = this.calculateRelevanceScore(b, queryLower);
            return bScore - aScore;
        });
    }
    calculateRelevanceScore(asset, query) {
        let score = 0;
        if (asset.symbol.toLowerCase() === query)
            score += 100;
        else if (asset.symbol.toLowerCase().startsWith(query))
            score += 50;
        else if (asset.symbol.toLowerCase().includes(query))
            score += 25;
        if (asset.name.toLowerCase().includes(query))
            score += 20;
        score += Math.log10(asset.marketCap + 1) * 0.1;
        return score;
    }
    removeDuplicates(assets) {
        const seen = new Set();
        return assets.filter(asset => {
            const key = `${asset.symbol}_${asset.category}`;
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }
    getDataSourceInfo(assetType) {
        const sources = enhancedRateLimitMonitor_1.enhancedRateLimitMonitor.getHealthStatus()
            .filter(api => api.status === 'healthy')
            .map(api => api.name);
        return sources.length > 0 ? sources.join(', ') : 'Fallback';
    }
    cleanupExpiredCache() {
        const now = Date.now();
        for (const [key, value] of this.cache) {
            if (now - value.timestamp >= value.ttl) {
                this.cache.delete(key);
            }
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
    clearCache() {
        this.cache.clear();
    }
    getRateLimitStatus() {
        return enhancedRateLimitMonitor_1.enhancedRateLimitMonitor.getRateLimitStatus();
    }
    async getCompanyDiscoveryStats() {
        return companyDiscoveryService_1.companyDiscoveryService.getDiscoveryStats();
    }
}
exports.PaginatedMarketDataService = PaginatedMarketDataService;
exports.paginatedMarketDataService = new PaginatedMarketDataService();
