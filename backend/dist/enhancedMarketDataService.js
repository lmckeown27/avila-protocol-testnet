"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.enhancedMarketDataService = exports.EnhancedMarketDataService = void 0;
const rateLimitManager_1 = require("./rateLimitManager");
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const API_KEYS = {
    finnhub: process.env.FINNHUB_API_KEY || 'demo',
    alphaVantage: process.env.ALPHA_VANTAGE_API_KEY || 'demo',
    twelveData: process.env.TWELVE_DATA_API_KEY || 'demo',
    coinMarketCap: process.env.COINMARKETCAP_API_KEY || 'demo'
};
const DEFAULT_STOCK_SYMBOLS = [
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX',
    'SPY', 'QQQ', 'IWM', 'VTI', 'VEA', 'VWO', 'BND', 'GLD',
    '^GSPC', '^DJI', '^IXIC', '^RUT'
];
const DEFAULT_CRYPTO_IDS = [
    'bitcoin', 'ethereum', 'chainlink', 'cardano', 'solana',
    'ripple', 'polkadot', 'dogecoin', 'avalanche-2', 'matic-network'
];
class EnhancedMarketDataService {
    constructor() {
        this.cache = new Map();
        this.CACHE_DURATION_MS = 10 * 60 * 1000;
        this.POLLING_INTERVAL = 30000;
        this.isPolling = false;
        this.pollingInterval = null;
        this.totalRequests = 0;
        this.cachedRequests = 0;
        setInterval(() => {
            this.cleanupExpiredCache();
            rateLimitManager_1.rateLimitManager.cleanupExpiredCache();
        }, 60000);
    }
    async getStockData() {
        try {
            const finnhubData = await this.getStockDataFromFinnhub();
            if (finnhubData && finnhubData.length > 0) {
                return finnhubData;
            }
        }
        catch (error) {
            console.warn('Finnhub failed, trying Alpha Vantage...');
        }
        try {
            const alphaVantageData = await this.getStockDataFromAlphaVantage();
            if (alphaVantageData && alphaVantageData.length > 0) {
                return alphaVantageData;
            }
        }
        catch (error) {
            console.warn('Alpha Vantage failed, trying Twelve Data...');
        }
        try {
            const twelveDataData = await this.getStockDataFromTwelveData();
            if (twelveDataData && twelveDataData.length > 0) {
                return twelveDataData;
            }
        }
        catch (error) {
            console.warn('Twelve Data failed');
        }
        return this.getEmptyStockData();
    }
    async getStockDataFromFinnhub() {
        const symbols = DEFAULT_STOCK_SYMBOLS.slice(0, 10);
        const results = [];
        for (const symbol of symbols) {
            try {
                const data = await rateLimitManager_1.rateLimitManager.scheduleRequest('finnhub', async () => {
                    const response = await axios_1.default.get('https://finnhub.io/api/v1/quote', {
                        params: { symbol, token: API_KEYS.finnhub },
                        timeout: 10000
                    });
                    return response.data;
                }, 'high');
                if (data && data.c && data.d) {
                    results.push({
                        asset: symbol,
                        symbol: symbol,
                        price: data.c,
                        change24h: data.dp,
                        volume24h: data.v || 0,
                        marketCap: 0,
                        source: 'Finnhub',
                        lastUpdated: Date.now(),
                        high24h: data.h,
                        low24h: data.l,
                        open24h: data.o
                    });
                }
            }
            catch (error) {
                console.warn(`Failed to fetch ${symbol} from Finnhub:`, error);
            }
        }
        return results;
    }
    async getStockDataFromAlphaVantage() {
        const symbols = DEFAULT_STOCK_SYMBOLS.slice(0, 4);
        const results = [];
        for (const symbol of symbols) {
            try {
                const data = await rateLimitManager_1.rateLimitManager.scheduleRequest('alphaVantage', async () => {
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
                    results.push({
                        asset: symbol,
                        symbol: symbol,
                        price: parseFloat(quote['05. price']),
                        change24h: parseFloat(quote['10. change percent'].replace('%', '')),
                        volume24h: parseInt(quote['06. volume']),
                        marketCap: 0,
                        source: 'Alpha Vantage',
                        lastUpdated: Date.now(),
                        high24h: parseFloat(quote['03. high']),
                        low24h: parseFloat(quote['04. low']),
                        open24h: parseFloat(quote['02. open'])
                    });
                }
            }
            catch (error) {
                console.warn(`Failed to fetch ${symbol} from Alpha Vantage:`, error);
            }
        }
        return results;
    }
    async getStockDataFromTwelveData() {
        const symbols = DEFAULT_STOCK_SYMBOLS.slice(0, 6);
        const results = [];
        for (const symbol of symbols) {
            try {
                const data = await rateLimitManager_1.rateLimitManager.scheduleRequest('twelveData', async () => {
                    const response = await axios_1.default.get('https://api.twelvedata.com/quote', {
                        params: {
                            symbol,
                            apikey: API_KEYS.twelveData
                        },
                        timeout: 10000
                    });
                    return response.data;
                }, 'medium');
                if (data && data.price) {
                    results.push({
                        asset: symbol,
                        symbol: symbol,
                        price: parseFloat(data.price),
                        change24h: parseFloat(data.percent_change || '0'),
                        volume24h: parseInt(data.volume || '0'),
                        marketCap: parseFloat(data.market_cap || '0'),
                        source: 'Twelve Data',
                        lastUpdated: Date.now(),
                        high24h: parseFloat(data.high || '0'),
                        low24h: parseFloat(data.low || '0'),
                        open24h: parseFloat(data.open || '0')
                    });
                }
            }
            catch (error) {
                console.warn(`Failed to fetch ${symbol} from Twelve Data:`, error);
            }
        }
        return results;
    }
    async getDigitalAssetsData() {
        try {
            const coinGeckoData = await this.getDigitalAssetsFromCoinGecko();
            if (coinGeckoData && coinGeckoData.length > 0) {
                return coinGeckoData;
            }
        }
        catch (error) {
            console.warn('CoinGecko failed, trying CoinMarketCap...');
        }
        try {
            const coinMarketCapData = await this.getDigitalAssetsFromCoinMarketCap();
            if (coinMarketCapData && coinMarketCapData.length > 0) {
                return coinMarketCapData;
            }
        }
        catch (error) {
            console.warn('CoinMarketCap failed');
        }
        return this.getEmptyDigitalAssetsData();
    }
    async getDigitalAssetsFromCoinGecko() {
        try {
            const data = await rateLimitManager_1.rateLimitManager.scheduleRequest('coinGecko', async () => {
                const response = await axios_1.default.get('https://api.coingecko.com/api/v3/coins/markets', {
                    params: {
                        vs_currency: 'usd',
                        order: 'market_cap_desc',
                        per_page: 20,
                        page: 1,
                        sparkline: false
                    },
                    timeout: 10000
                });
                return response.data;
            }, 'high');
            return data.map((coin) => ({
                asset: coin.symbol.toUpperCase(),
                symbol: coin.symbol.toUpperCase(),
                price: coin.current_price,
                change24h: coin.price_change_percentage_24h,
                volume24h: coin.total_volume,
                marketCap: coin.market_cap,
                source: 'CoinGecko',
                lastUpdated: Date.now(),
                high24h: coin.high_24h,
                low24h: coin.low_24h
            }));
        }
        catch (error) {
            console.error('Failed to fetch from CoinGecko:', error);
            return [];
        }
    }
    async getDigitalAssetsFromCoinMarketCap() {
        try {
            const data = await rateLimitManager_1.rateLimitManager.scheduleRequest('coinMarketCap', async () => {
                const response = await axios_1.default.get('https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest', {
                    params: {
                        start: 1,
                        limit: 20,
                        convert: 'USD'
                    },
                    headers: {
                        'X-CMC_PRO_API_KEY': API_KEYS.coinMarketCap
                    },
                    timeout: 10000
                });
                return response.data;
            }, 'medium');
            return data.data.map((coin) => ({
                asset: coin.symbol,
                symbol: coin.symbol,
                price: coin.quote.USD.price,
                change24h: coin.quote.USD.percent_change_24h,
                volume24h: coin.quote.USD.volume_24h,
                marketCap: coin.quote.USD.market_cap,
                source: 'CoinMarketCap',
                lastUpdated: Date.now()
            }));
        }
        catch (error) {
            console.error('Failed to fetch from CoinMarketCap:', error);
            return [];
        }
    }
    async getEnhancedStockData(symbol) {
        try {
            const peData = await rateLimitManager_1.rateLimitManager.scheduleRequest('alphaVantage', async () => {
                const response = await axios_1.default.get('https://www.alphavantage.co/query', {
                    params: {
                        function: 'OVERVIEW',
                        symbol,
                        apikey: API_KEYS.alphaVantage
                    },
                    timeout: 10000
                });
                return response.data;
            }, 'low');
            if (peData && peData.PERatio) {
                return {
                    pe: parseFloat(peData.PERatio),
                    marketCap: parseFloat(peData.MarketCapitalization || '0'),
                    dividendYield: peData.DividendYield ? parseFloat(peData.DividendYield) : null
                };
            }
        }
        catch (error) {
            console.warn(`Failed to get enhanced data for ${symbol}:`, error);
        }
        return { pe: null, marketCap: null, dividendYield: null };
    }
    async getAllMarketData() {
        this.totalRequests++;
        try {
            const [stockData, digitalAssetsData] = await Promise.all([
                this.getStockData(),
                this.getDigitalAssetsData()
            ]);
            const cacheStats = this.getCacheStats();
            return {
                stocks: stockData,
                digitalAssets: digitalAssetsData,
                timestamp: Date.now(),
                dataSources: this.getActiveDataSources(),
                errors: [],
                cacheInfo: {
                    hitRate: this.totalRequests > 0 ? (this.cachedRequests / this.totalRequests) * 100 : 0,
                    totalRequests: this.totalRequests,
                    cachedRequests: this.cachedRequests
                }
            };
        }
        catch (error) {
            console.error('Error fetching all market data:', error);
            return {
                stocks: this.getEmptyStockData(),
                digitalAssets: this.getEmptyDigitalAssetsData(),
                timestamp: Date.now(),
                dataSources: ['Fallback'],
                errors: [error instanceof Error ? error.message : 'Unknown error'],
                cacheInfo: {
                    hitRate: 0,
                    totalRequests: this.totalRequests,
                    cachedRequests: this.cachedRequests
                }
            };
        }
    }
    getEmptyStockData() {
        return DEFAULT_STOCK_SYMBOLS.map(symbol => ({
            asset: symbol,
            symbol: symbol,
            price: 0,
            change24h: 0,
            volume24h: 0,
            marketCap: 0,
            source: 'Fallback',
            lastUpdated: Date.now()
        }));
    }
    getEmptyDigitalAssetsData() {
        return DEFAULT_CRYPTO_IDS.map(id => ({
            asset: id.toUpperCase(),
            symbol: id.toUpperCase(),
            price: 0,
            change24h: 0,
            volume24h: 0,
            marketCap: 0,
            source: 'Fallback',
            lastUpdated: Date.now()
        }));
    }
    getActiveDataSources() {
        const sources = [];
        if (this.cache.has('stocks'))
            sources.push('Stock Market APIs');
        if (this.cache.has('digitalAssets'))
            sources.push('Digital Assets APIs');
        if (sources.length === 0)
            sources.push('Fallback');
        return sources;
    }
    getCacheStats() {
        return rateLimitManager_1.rateLimitManager.getCacheStats();
    }
    cleanupExpiredCache() {
        const now = Date.now();
        for (const [key, value] of this.cache) {
            if (now - value.timestamp >= this.CACHE_DURATION_MS) {
                this.cache.delete(key);
            }
        }
    }
    getRateLimitStatus() {
        return rateLimitManager_1.rateLimitManager.getQueueStatus();
    }
    clearCache() {
        this.cache.clear();
        rateLimitManager_1.rateLimitManager.clearCache();
    }
}
exports.EnhancedMarketDataService = EnhancedMarketDataService;
exports.enhancedMarketDataService = new EnhancedMarketDataService();
