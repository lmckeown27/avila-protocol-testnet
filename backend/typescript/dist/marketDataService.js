"use strict";
// Market Data Service for Mock Decentralized Options Platform
// Fetches and normalizes data from multiple free APIs with fallback logic
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stopMarketDataPolling = exports.startMarketDataPolling = exports.getDeFiData = exports.getTradFiData = exports.getMarketData = exports.marketDataService = exports.MarketDataService = void 0;
const axios_1 = __importDefault(require("axios"));
// ============================================================================
// API CONFIGURATION
// ============================================================================
const API_CONFIG = {
    // TradFi APIs
    finnhub: {
        baseUrl: 'https://finnhub.io/api/v1',
        token: process.env['FINNHUB_API_KEY'] || 'demo',
        rateLimit: 60 // requests per minute
    },
    polygon: {
        baseUrl: 'https://api.polygon.io/v2',
        token: process.env['POLYGON_API_KEY'] || 'demo',
        rateLimit: 5 // requests per minute
    },
    alphaVantage: {
        baseUrl: 'https://www.alphavantage.co/query',
        token: process.env['ALPHA_VANTAGE_API_KEY'] || 'demo',
        rateLimit: 5 // requests per minute
    },
    twelveData: {
        baseUrl: 'https://api.twelvedata.com',
        token: process.env['TWELVE_DATA_API_KEY'] || 'demo',
        rateLimit: 8 // requests per minute
    },
    // Crypto APIs
    coinGecko: {
        baseUrl: 'https://api.coingecko.com/api/v3',
        rateLimit: 50 // requests per minute
    },
    coinMarketCap: {
        baseUrl: 'https://pro-api.coinmarketcap.com/v1',
        token: process.env['COINMARKETCAP_API_KEY'] || 'demo',
        rateLimit: 10 // requests per minute
    },
    cryptoCompare: {
        baseUrl: 'https://min-api.cryptocompare.com/data',
        rateLimit: 100 // requests per minute
    },
    binance: {
        baseUrl: 'https://api.binance.com/api/v3',
        rateLimit: 1200 // requests per minute
    },
    // DeFi APIs
    defiLlama: {
        baseUrl: 'https://api.llama.fi',
        rateLimit: 100 // requests per minute
    },
    uniswap: {
        baseUrl: 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v2',
        rateLimit: 100 // requests per minute
    },
    // Sentiment APIs
    alternativeMe: {
        baseUrl: 'https://api.alternative.me',
        rateLimit: 100 // requests per minute
    }
};
// ============================================================================
// DEFAULT ASSET LISTS
// ============================================================================
const DEFAULT_TRADFI_SYMBOLS = [
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSFT', 'META', 'NVDA', 'NFLX',
    'SPY', 'QQQ', 'IWM', 'VTI', 'VEA', 'VWO', 'BND', 'GLD',
    '^GSPC', '^DJI', '^IXIC', '^RUT' // Major indices
];
const DEFAULT_CRYPTO_IDS = [
    'bitcoin', 'ethereum', 'binancecoin', 'cardano', 'solana',
    'ripple', 'polkadot', 'dogecoin', 'avalanche-2', 'chainlink'
];
const DEFAULT_DEFI_PROTOCOLS = [
    'uniswap', 'aave', 'compound', 'makerdao', 'curve',
    'synthetix', 'yearn-finance', 'balancer', 'sushi', '1inch'
];
// ============================================================================
// MAIN MARKET DATA SERVICE CLASS
// ============================================================================
class MarketDataService {
    constructor() {
        this.cache = new Map();
        this.POLLING_INTERVAL = 30000; // 30 seconds
        this.isPolling = false;
        this.pollingInterval = null;
        this.setupAxiosInterceptors();
    }
    // ============================================================================
    // PUBLIC METHODS
    // ============================================================================
    /**
     * Get all market data (TradFi + DeFi) in normalized format
     */
    async getAllMarketData() {
        try {
            console.log('🔄 Fetching all market data...');
            const [tradfiData, defiData] = await Promise.all([
                this.getTradFiData(),
                this.getDeFiData()
            ]);
            const response = {
                tradfi: tradfiData,
                defi: defiData,
                timestamp: Date.now(),
                dataSources: this.getActiveDataSources(),
                errors: []
            };
            console.log(`✅ Market data fetched: ${tradfiData.length} TradFi, ${defiData.length} DeFi assets`);
            return response;
        }
        catch (error) {
            console.error('❌ Failed to fetch all market data:', error);
            return this.getFallbackData();
        }
    }
    /**
     * Get TradFi market data from multiple sources
     */
    async getTradFiData() {
        try {
            const sources = [
                () => this.fetchFromFinnhub(),
                () => this.fetchFromPolygon(),
                () => this.fetchFromAlphaVantage(),
                () => this.fetchFromTwelveData()
            ];
            // Try sources in parallel, use first successful response
            const results = await Promise.allSettled(sources.map(source => source()));
            const successfulResults = results
                .filter((result) => result.status === 'fulfilled' && result.value.length > 0)
                .map(result => result.value);
            if (successfulResults.length > 0) {
                const data = successfulResults[0];
                if (data) {
                    this.cacheData('tradfi', data);
                    return data;
                }
            }
            throw new Error('All TradFi data sources failed');
        }
        catch (error) {
            console.error('❌ TradFi data fetch failed, using fallback:', error);
            return this.getTradFiFallbackData();
        }
    }
    /**
     * Get DeFi market data from multiple sources
     */
    async getDeFiData() {
        try {
            const sources = [
                () => this.fetchFromCoinGecko(),
                () => this.fetchFromDefiLlama(),
                () => this.fetchFromBinance()
            ];
            // Try sources in parallel, use first successful response
            const results = await Promise.allSettled(sources.map(source => source()));
            const successfulResults = results
                .filter((result) => result.status === 'fulfilled' && result.value.length > 0)
                .map(result => result.value);
            if (successfulResults.length > 0) {
                const data = successfulResults[0];
                if (data) {
                    this.cacheData('defi', data);
                    return data;
                }
            }
            throw new Error('All DeFi data sources failed');
        }
        catch (error) {
            console.error('❌ DeFi data fetch failed, using fallback:', error);
            return this.getDeFiFallbackData();
        }
    }
    /**
     * Start polling for real-time updates
     */
    startPolling(callback) {
        if (this.isPolling)
            return;
        this.isPolling = true;
        console.log('🔄 Starting market data polling...');
        this.pollingInterval = setInterval(async () => {
            try {
                const data = await this.getAllMarketData();
                if (callback)
                    callback(data);
            }
            catch (error) {
                console.error('❌ Polling error:', error);
            }
        }, this.POLLING_INTERVAL);
    }
    /**
     * Stop polling
     */
    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
        this.isPolling = false;
        console.log('⏹️ Stopped market data polling');
    }
    /**
     * Get cache statistics
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys()),
            hitRate: this.calculateCacheHitRate()
        };
    }
    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
        console.log('🗑️ Cache cleared');
    }
    // ============================================================================
    // TRADFI DATA SOURCES
    // ============================================================================
    async fetchFromFinnhub() {
        try {
            const symbols = DEFAULT_TRADFI_SYMBOLS.slice(0, 10); // Limit for free tier
            const promises = symbols.map(async (symbol) => {
                const response = await axios_1.default.get(`${API_CONFIG.finnhub.baseUrl}/quote`, {
                    params: { symbol, token: API_CONFIG.finnhub.token },
                    timeout: 5000
                });
                return response.data;
            });
            const results = await Promise.all(promises);
            return results
                .filter(quote => quote.c && quote.c > 0)
                .map(quote => ({
                asset: quote.symbol,
                symbol: quote.symbol,
                price: quote.c,
                change24h: quote.d,
                volume24h: quote.v || 0,
                marketCap: quote.marketCap || 0,
                source: 'Finnhub',
                lastUpdated: Date.now(),
                high24h: quote.h,
                low24h: quote.l,
                open24h: quote.o
            }));
        }
        catch (error) {
            console.warn('⚠️ Finnhub fetch failed:', error);
            return [];
        }
    }
    async fetchFromPolygon() {
        try {
            const symbols = DEFAULT_TRADFI_SYMBOLS.slice(0, 5); // Limit for free tier
            const promises = symbols.map(async (symbol) => {
                const response = await axios_1.default.get(`${API_CONFIG.polygon.baseUrl}/last/trade/${symbol}`, {
                    params: { apiKey: API_CONFIG.polygon.token },
                    timeout: 5000
                });
                return response.data;
            });
            const results = await Promise.all(promises);
            return results
                .filter(trade => trade.results && trade.results.price)
                .map(trade => ({
                asset: trade.results.T,
                symbol: trade.results.T,
                price: trade.results.price,
                change24h: 0,
                volume24h: trade.results.s || 0,
                marketCap: 0,
                source: 'Polygon',
                lastUpdated: trade.results.t,
                high24h: trade.results.price,
                low24h: trade.results.price,
                open24h: trade.results.price
            }));
        }
        catch (error) {
            console.warn('⚠️ Polygon fetch failed:', error);
            return [];
        }
    }
    async fetchFromAlphaVantage() {
        try {
            const symbols = DEFAULT_TRADFI_SYMBOLS.slice(0, 5); // Limit for free tier
            const promises = symbols.map(async (symbol) => {
                const response = await axios_1.default.get(API_CONFIG.alphaVantage.baseUrl, {
                    params: {
                        function: 'TIME_SERIES_INTRADAY',
                        symbol,
                        interval: '1min',
                        apikey: API_CONFIG.alphaVantage.token
                    },
                    timeout: 5000
                });
                return response.data;
            });
            const results = await Promise.all(promises);
            return results
                .filter(data => data['Time Series (1min)'])
                .map(data => {
                const timeSeries = data['Time Series (1min)'];
                const latestTime = Object.keys(timeSeries)[0];
                if (!latestTime)
                    return null;
                const latestData = timeSeries[latestTime];
                if (!latestData)
                    return null;
                return {
                    asset: data['Meta Data']['2. Symbol'],
                    symbol: data['Meta Data']['2. Symbol'],
                    price: parseFloat(latestData['4. close']),
                    change24h: 0,
                    volume24h: parseFloat(latestData['5. volume']),
                    marketCap: 0,
                    source: 'Alpha Vantage',
                    lastUpdated: Date.now(),
                    high24h: parseFloat(latestData['2. high']),
                    low24h: parseFloat(latestData['3. low']),
                    open24h: parseFloat(latestData['1. open'])
                };
            })
                .filter((item) => item !== null);
        }
        catch (error) {
            console.warn('⚠️ Alpha Vantage fetch failed:', error);
            return [];
        }
    }
    async fetchFromTwelveData() {
        try {
            const symbols = DEFAULT_TRADFI_SYMBOLS.slice(0, 5); // Limit for free tier
            const promises = symbols.map(async (symbol) => {
                const response = await axios_1.default.get(`${API_CONFIG.twelveData.baseUrl}/time_series`, {
                    params: {
                        symbol,
                        interval: '1min',
                        apikey: API_CONFIG.twelveData.token
                    },
                    timeout: 5000
                });
                return response.data;
            });
            const results = await Promise.all(promises);
            return results
                .filter(data => data.values && data.values.length > 0)
                .map(data => {
                const latest = data.values[0];
                return {
                    asset: data.meta.symbol,
                    symbol: data.meta.symbol,
                    price: parseFloat(latest.close),
                    change24h: 0,
                    volume24h: parseFloat(latest.volume),
                    marketCap: 0,
                    source: 'Twelve Data',
                    lastUpdated: Date.now(),
                    high24h: parseFloat(latest.high),
                    low24h: parseFloat(latest.low),
                    open24h: parseFloat(latest.open)
                };
            });
        }
        catch (error) {
            console.warn('⚠️ Twelve Data fetch failed:', error);
            return [];
        }
    }
    // ============================================================================
    // CRYPTO & DEFI DATA SOURCES
    // ============================================================================
    async fetchFromCoinGecko() {
        try {
            const response = await axios_1.default.get(`${API_CONFIG.coinGecko.baseUrl}/coins/markets`, {
                params: {
                    vs_currency: 'usd',
                    ids: DEFAULT_CRYPTO_IDS.join(','),
                    order: 'market_cap_desc',
                    per_page: 20,
                    page: 1,
                    sparkline: false
                },
                timeout: 10000
            });
            return response.data.map((coin) => ({
                asset: coin.name,
                symbol: coin.symbol.toUpperCase(),
                name: coin.name,
                price: coin.current_price,
                change24h: coin.price_change_24h,
                volume24h: coin.total_volume,
                marketCap: coin.market_cap,
                source: 'CoinGecko',
                lastUpdated: Date.now(),
                high24h: coin.high_24h,
                low24h: coin.low_24h
            }));
        }
        catch (error) {
            console.warn('⚠️ CoinGecko fetch failed:', error);
            return [];
        }
    }
    async fetchFromDefiLlama() {
        try {
            const response = await axios_1.default.get(`${API_CONFIG.defiLlama.baseUrl}/protocols`, {
                timeout: 10000
            });
            return response.data
                .filter((protocol) => DEFAULT_DEFI_PROTOCOLS.includes(protocol.name.toLowerCase()))
                .slice(0, 20)
                .map((protocol) => ({
                asset: protocol.name,
                symbol: protocol.symbol.toUpperCase(),
                name: protocol.name,
                price: protocol.tvl / 1000000,
                change24h: protocol.change_1d || 0,
                volume24h: protocol.volume_1d || 0,
                marketCap: protocol.market_cap || protocol.tvl,
                source: 'DefiLlama',
                lastUpdated: Date.now()
            }));
        }
        catch (error) {
            console.warn('⚠️ DefiLlama fetch failed:', error);
            return [];
        }
    }
    async fetchFromBinance() {
        try {
            const symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'SOLUSDT'];
            const promises = symbols.map(async (symbol) => {
                const response = await axios_1.default.get(`${API_CONFIG.binance.baseUrl}/ticker/24hr`, {
                    params: { symbol },
                    timeout: 5000
                });
                return response.data;
            });
            const results = await Promise.all(promises);
            return results.map(ticker => ({
                asset: ticker.symbol.replace('USDT', ''),
                symbol: ticker.symbol.replace('USDT', ''),
                name: ticker.symbol.replace('USDT', ''),
                price: parseFloat(ticker.lastPrice),
                change24h: parseFloat(ticker.priceChange),
                volume24h: parseFloat(ticker.volume),
                marketCap: 0,
                source: 'Binance',
                lastUpdated: Date.now(),
                high24h: parseFloat(ticker.highPrice),
                low24h: parseFloat(ticker.lowPrice)
            }));
        }
        catch (error) {
            console.warn('⚠️ Binance fetch failed:', error);
            return [];
        }
    }
    // ============================================================================
    // FALLBACK DATA METHODS
    // ============================================================================
    getFallbackData() {
        return {
            tradfi: this.getTradFiFallbackData(),
            defi: this.getDeFiFallbackData(),
            timestamp: Date.now(),
            dataSources: ['fallback'],
            errors: ['All API sources failed, using fallback data']
        };
    }
    getTradFiFallbackData() {
        return DEFAULT_TRADFI_SYMBOLS.map((symbol, index) => ({
            asset: symbol,
            symbol,
            name: this.getTradFiAssetName(symbol),
            price: 100 + (index * 50) + (Math.random() * 200),
            change24h: (Math.random() - 0.5) * 20,
            volume24h: Math.random() * 10000000 + 1000000,
            marketCap: Math.random() * 1000000000 + 100000000,
            source: 'Fallback',
            lastUpdated: Date.now(),
            high24h: 100 + (index * 50) + (Math.random() * 200) + 10,
            low24h: 100 + (index * 50) + (Math.random() * 200) - 10
        }));
    }
    getDeFiFallbackData() {
        return DEFAULT_CRYPTO_IDS.map((id, index) => ({
            asset: id,
            symbol: id.toUpperCase().slice(0, 4),
            name: id.charAt(0).toUpperCase() + id.slice(1),
            price: 10 + (index * 5) + (Math.random() * 100),
            change24h: (Math.random() - 0.5) * 15,
            volume24h: Math.random() * 50000000 + 10000000,
            marketCap: Math.random() * 500000000 + 100000000,
            source: 'Fallback',
            lastUpdated: Date.now()
        }));
    }
    // ============================================================================
    // HELPER METHODS
    // ============================================================================
    getTradFiAssetName(symbol) {
        const names = {
            'AAPL': 'Apple Inc.',
            'MSFT': 'Microsoft Corporation',
            'GOOGL': 'Alphabet Inc.',
            'AMZN': 'Amazon.com Inc.',
            'TSLA': 'Tesla Inc.',
            'META': 'Meta Platforms Inc.',
            'NVDA': 'NVIDIA Corporation',
            'NFLX': 'Netflix Inc.',
            'SPY': 'SPDR S&P 500 ETF',
            'QQQ': 'Invesco QQQ Trust',
            'IWM': 'iShares Russell 2000 ETF',
            'VTI': 'Vanguard Total Stock Market ETF',
            'VEA': 'Vanguard FTSE Developed Markets ETF',
            'VWO': 'Vanguard FTSE Emerging Markets ETF',
            'BND': 'Vanguard Total Bond Market ETF',
            'GLD': 'SPDR Gold Shares',
            '^GSPC': 'S&P 500 Index',
            '^DJI': 'Dow Jones Industrial Average',
            '^IXIC': 'NASDAQ Composite',
            '^RUT': 'Russell 2000 Index'
        };
        return names[symbol] || `${symbol} Corporation`;
    }
    getActiveDataSources() {
        const sources = [];
        if (this.cache.has('tradfi'))
            sources.push('TradFi APIs');
        if (this.cache.has('defi'))
            sources.push('DeFi APIs');
        if (sources.length === 0)
            sources.push('Fallback');
        return sources;
    }
    cacheData(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }
    calculateCacheHitRate() {
        // Simple cache hit rate calculation
        return this.cache.size > 0 ? 0.8 : 0; // Placeholder
    }
    setupAxiosInterceptors() {
        // Add request interceptor for rate limiting
        axios_1.default.interceptors.request.use((config) => {
            // Add custom headers
            config.headers['User-Agent'] = 'Avila-Protocol-Market-Data/1.0';
            return config;
        });
        // Add response interceptor for error handling
        axios_1.default.interceptors.response.use((response) => response, (error) => {
            if (error.response) {
                console.warn(`⚠️ API Error ${error.response.status}: ${error.response.statusText}`);
            }
            else if (error.request) {
                console.warn('⚠️ Network Error: No response received');
            }
            else {
                console.warn('⚠️ Request Error:', error.message);
            }
            return Promise.reject(error);
        });
    }
}
exports.MarketDataService = MarketDataService;
// ============================================================================
// EXPORTS
// ============================================================================
// Export singleton instance
exports.marketDataService = new MarketDataService();
// Export utility functions
const getMarketData = () => exports.marketDataService.getAllMarketData();
exports.getMarketData = getMarketData;
const getTradFiData = () => exports.marketDataService.getTradFiData();
exports.getTradFiData = getTradFiData;
const getDeFiData = () => exports.marketDataService.getDeFiData();
exports.getDeFiData = getDeFiData;
const startMarketDataPolling = (callback) => exports.marketDataService.startPolling(callback);
exports.startMarketDataPolling = startMarketDataPolling;
const stopMarketDataPolling = () => exports.marketDataService.stopPolling();
exports.stopMarketDataPolling = stopMarketDataPolling;
//# sourceMappingURL=marketDataService.js.map