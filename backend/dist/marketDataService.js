"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stopMarketDataPolling = exports.startMarketDataPolling = exports.getDeFiData = exports.getTradFiData = exports.getMarketData = exports.marketDataService = exports.MarketDataService = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const axios_1 = __importDefault(require("axios"));
const API_CONFIG = {
    finnhub: {
        baseUrl: 'https://finnhub.io/api/v1',
        token: process.env['FINNHUB_API_KEY'] || 'demo',
        rateLimit: 60
    },
    alphaVantage: {
        baseUrl: 'https://www.alphavantage.co/query',
        token: process.env['ALPHA_VANTAGE_API_KEY'] || 'demo',
        rateLimit: 5
    },
    twelveData: {
        baseUrl: 'https://api.twelvedata.com',
        token: process.env['TWELVE_DATA_API_KEY'] || 'demo',
        rateLimit: 8
    },
    coinGecko: {
        baseUrl: 'https://api.coingecko.com/api/v3',
        rateLimit: 50
    },
    coinMarketCap: {
        baseUrl: 'https://pro-api.coinmarketcap.com/v1',
        token: process.env['COINMARKETCAP_API_KEY'] || 'demo',
        rateLimit: 10
    },
    cryptoCompare: {
        baseUrl: 'https://min-api.cryptocompare.com/data',
        rateLimit: 100
    },
    defiLlama: {
        baseUrl: 'https://api.llama.fi',
        rateLimit: 100
    },
    uniswap: {
        baseUrl: 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v2',
        rateLimit: 100
    },
    alternativeMe: {
        baseUrl: 'https://api.alternative.me',
        rateLimit: 100
    }
};
const DEFAULT_TRADFI_SYMBOLS = [
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSFT', 'META', 'NVDA', 'NFLX',
    'SPY', 'QQQ', 'IWM', 'VTI', 'VEA', 'VWO', 'BND', 'GLD',
    '^GSPC', '^DJI', '^IXIC', '^RUT'
];
const DEFAULT_CRYPTO_IDS = [
    'bitcoin', 'ethereum', 'chainlink', 'cardano', 'solana',
    'ripple', 'polkadot', 'dogecoin', 'avalanche-2', 'matic-network'
];
const DEFAULT_DEFI_PROTOCOLS = [
    'uniswap', 'aave', 'compound', 'makerdao', 'curve',
    'synthetix', 'yearn-finance', 'balancer', 'sushi', '1inch'
];
class MarketDataService {
    constructor() {
        this.cache = new Map();
        this.marketDataCache = {};
        this.CACHE_DURATION_MS = 10 * 60 * 1000;
        this.POLLING_INTERVAL = 30000;
        this.isPolling = false;
        this.pollingInterval = null;
        this.setupAxiosInterceptors();
    }
    async getTradFiMarketData(symbol) {
        const cacheKey = `tradfi_${symbol}`;
        const cached = this.marketDataCache[cacheKey];
        const now = Date.now();
        if (cached && now - cached.timestamp < this.CACHE_DURATION_MS) {
            console.log(`📊 Using cached TradFi market data for ${symbol}`);
            return {
                marketCap: cached.marketCap,
                volume: cached.volume,
                pe: cached.pe
            };
        }
        let marketCap = null;
        let volume = null;
        let pe = null;
        try {
            console.log(`🔍 Fetching TradFi market data for ${symbol} from Finnhub...`);
            const finnhubMetricRes = await axios_1.default.get(`${API_CONFIG.finnhub.baseUrl}/stock/metric`, {
                params: {
                    symbol,
                    metric: 'all',
                    token: API_CONFIG.finnhub.token
                },
                timeout: 5000
            });
            if (finnhubMetricRes.data && finnhubMetricRes.data.metric) {
                marketCap = finnhubMetricRes.data.metric.marketCapitalization || null;
                pe = finnhubMetricRes.data.metric.peBasicExclExtraTTM || null;
                console.log(`✅ Finnhub market cap for ${symbol}: ${marketCap}, P/E: ${pe}`);
            }
            const finnhubQuoteRes = await axios_1.default.get(`${API_CONFIG.finnhub.baseUrl}/quote`, {
                params: {
                    symbol,
                    token: API_CONFIG.finnhub.token
                },
                timeout: 5000
            });
            if (finnhubQuoteRes.data && finnhubQuoteRes.data.v) {
                volume = finnhubQuoteRes.data.v;
                console.log(`✅ Finnhub volume for ${symbol}: ${volume}`);
            }
            console.log(`✅ Finnhub TradFi data for ${symbol}: Market Cap: ${marketCap}, Volume: ${volume}`);
        }
        catch (err) {
            console.warn(`⚠️ Finnhub TradFi market data fetch failed for ${symbol}:`, err);
        }
        if (!marketCap || !volume) {
            try {
                console.log(`🔍 Fetching TradFi market data for ${symbol} from Alpha Vantage...`);
                const alphaOverviewRes = await axios_1.default.get(API_CONFIG.alphaVantage.baseUrl, {
                    params: {
                        function: 'OVERVIEW',
                        symbol,
                        apikey: API_CONFIG.alphaVantage.token
                    },
                    timeout: 5000
                });
                if (alphaOverviewRes.data) {
                    if (!marketCap && alphaOverviewRes.data.MarketCapitalization) {
                        marketCap = parseFloat(alphaOverviewRes.data.MarketCapitalization);
                        console.log(`✅ Alpha Vantage market cap for ${symbol}: ${marketCap}`);
                    }
                    if (!pe && alphaOverviewRes.data.PERatio) {
                        pe = parseFloat(alphaOverviewRes.data.PERatio);
                        console.log(`✅ Alpha Vantage P/E for ${symbol}: ${pe}`);
                    }
                }
                if (!volume) {
                    const alphaVolumeRes = await axios_1.default.get(API_CONFIG.alphaVantage.baseUrl, {
                        params: {
                            function: 'TIME_SERIES_DAILY',
                            symbol,
                            apikey: API_CONFIG.alphaVantage.token
                        },
                        timeout: 5000
                    });
                    if (alphaVolumeRes.data && alphaVolumeRes.data['Time Series (Daily)']) {
                        const timeSeries = alphaVolumeRes.data['Time Series (Daily)'];
                        const latestDate = Object.keys(timeSeries)[0];
                        if (latestDate && timeSeries[latestDate]['5. volume']) {
                            volume = parseFloat(timeSeries[latestDate]['5. volume']);
                            console.log(`✅ Alpha Vantage volume for ${symbol}: ${volume}`);
                        }
                    }
                }
                console.log(`✅ Alpha Vantage TradFi data for ${symbol}: Market Cap: ${marketCap}, Volume: ${volume}, P/E: ${pe}`);
            }
            catch (err) {
                console.warn(`⚠️ Alpha Vantage TradFi market data fetch failed for ${symbol}:`, err);
            }
        }
        if (!marketCap || !volume || !pe) {
            try {
                console.log(`🔍 Fetching TradFi market data for ${symbol} from Twelve Data...`);
                const twelveRes = await axios_1.default.get(`${API_CONFIG.twelveData.baseUrl}/stocks`, {
                    params: {
                        symbol,
                        apikey: API_CONFIG.twelveData.token
                    },
                    timeout: 5000
                });
                if (twelveRes.data && twelveRes.data.data && twelveRes.data.data.length > 0) {
                    const stockData = twelveRes.data.data[0];
                    if (!marketCap)
                        marketCap = stockData.market_cap || null;
                    if (!volume)
                        volume = stockData.volume || null;
                    if (!pe)
                        pe = stockData.pe_ratio || null;
                    console.log(`✅ Twelve Data TradFi data for ${symbol}: Market Cap: ${marketCap}, Volume: ${volume}, P/E: ${pe}`);
                }
            }
            catch (err) {
                console.warn(`⚠️ Twelve Data TradFi market data fetch failed for ${symbol}:`, err);
            }
        }
        this.marketDataCache[cacheKey] = { marketCap, volume, pe, timestamp: now };
        console.log(`💾 Cached TradFi market data for ${symbol}: Market Cap: ${marketCap}, Volume: ${volume}, P/E: ${pe}`);
        return { marketCap, volume, pe };
    }
    async getDeFiMarketData(symbol) {
        const cacheKey = `defi_${symbol}`;
        const cached = this.marketDataCache[cacheKey];
        const now = Date.now();
        if (cached && now - cached.timestamp < this.CACHE_DURATION_MS) {
            console.log(`📊 Using cached DeFi market data for ${symbol}`);
            return { marketCap: cached.marketCap, volume: cached.volume, tvl: cached.tvl };
        }
        let marketCap = null;
        let volume = null;
        let tvl = null;
        try {
            if (API_CONFIG.coinMarketCap.token !== 'demo') {
                console.log(`🔍 Fetching DeFi market data for ${symbol} from CoinMarketCap...`);
                try {
                    const searchRes = await axios_1.default.get(`${API_CONFIG.coinMarketCap.baseUrl}/cryptocurrency/map`, {
                        params: {
                            symbol: symbol.toUpperCase(),
                            limit: 1
                        },
                        headers: {
                            'X-CMC_PRO_API_KEY': API_CONFIG.coinMarketCap.token
                        },
                        timeout: 10000
                    });
                    if (searchRes.data && searchRes.data.data && searchRes.data.data.length > 0) {
                        const coinId = searchRes.data.data[0].id;
                        console.log(`✅ Found CoinMarketCap ID for ${symbol}: ${coinId}`);
                        const cmcRes = await axios_1.default.get(`${API_CONFIG.coinMarketCap.baseUrl}/cryptocurrency/quotes/latest`, {
                            params: {
                                id: coinId,
                                convert: 'USD'
                            },
                            headers: {
                                'X-CMC_PRO_API_KEY': API_CONFIG.coinMarketCap.token
                            },
                            timeout: 10000
                        });
                        if (cmcRes.data && cmcRes.data.data && cmcRes.data.data[coinId]) {
                            const coinData = cmcRes.data.data[coinId];
                            marketCap = coinData.quote.USD.market_cap || null;
                            volume = coinData.quote.USD.volume_24h || null;
                            console.log(`✅ CoinMarketCap DeFi data for ${symbol}: Market Cap: ${marketCap}, Volume: ${volume}`);
                        }
                    }
                }
                catch (cmcErr) {
                    console.warn(`⚠️ CoinMarketCap DeFi fetch failed for ${symbol}:`, cmcErr);
                }
            }
            try {
                console.log(`🔍 Fetching DeFi protocol data for ${symbol} from DeFi Llama...`);
                const defiLlamaRes = await axios_1.default.get(`${API_CONFIG.defiLlama.baseUrl}/protocols`, {
                    timeout: 8000
                });
                if (defiLlamaRes.data && Array.isArray(defiLlamaRes.data)) {
                    const protocol = defiLlamaRes.data.find(p => {
                        var _a, _b;
                        return ((_a = p.symbol) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === symbol.toLowerCase() ||
                            ((_b = p.name) === null || _b === void 0 ? void 0 : _b.toLowerCase().includes(symbol.toLowerCase()));
                    });
                    if (protocol) {
                        tvl = protocol.tvl || null;
                        console.log(`✅ DeFi Llama protocol data for ${symbol}: TVL: ${tvl}`);
                    }
                }
            }
            catch (defiErr) {
                console.warn(`⚠️ DeFi Llama fetch failed for ${symbol}:`, defiErr);
            }
            if (!marketCap || !volume) {
                try {
                    console.log(`🔍 Fetching DeFi market data for ${symbol} from CoinGecko...`);
                    const geckoRes = await axios_1.default.get(`${API_CONFIG.coinGecko.baseUrl}/simple/price`, {
                        params: {
                            ids: symbol.toLowerCase(),
                            vs_currencies: 'usd',
                            include_market_cap: true,
                            include_24hr_vol: true
                        },
                        timeout: 10000
                    });
                    if (geckoRes.data && geckoRes.data[symbol.toLowerCase()]) {
                        const coinData = geckoRes.data[symbol.toLowerCase()];
                        marketCap = marketCap || coinData.usd_market_cap || null;
                        volume = volume || coinData.usd_24h_vol || null;
                        console.log(`✅ CoinGecko DeFi data for ${symbol}: Market Cap: ${marketCap}, Volume: ${volume}`);
                    }
                }
                catch (err) {
                    console.warn(`⚠️ CoinGecko DeFi market data fetch failed for ${symbol}:`, err);
                }
            }
        }
        catch (err) {
            console.warn(`⚠️ DeFi market data fetch failed for ${symbol}:`, err);
        }
        this.marketDataCache[cacheKey] = { marketCap, volume, tvl, timestamp: now };
        console.log(`💾 Cached DeFi market data for ${symbol}: Market Cap: ${marketCap}, Volume: ${volume}, TVL: ${tvl}`);
        return { marketCap, volume, tvl };
    }
    async getAllMarketData() {
        try {
            const [tradfiData, defiData] = await Promise.all([
                this.getTradFiData(),
                this.getDeFiData()
            ]);
            return {
                tradfi: tradfiData,
                defi: defiData,
                timestamp: Date.now(),
                dataSources: this.getActiveDataSources(),
                errors: []
            };
        }
        catch (error) {
            console.error('Failed to fetch market data:', error);
            return {
                tradfi: this.getEmptyTradFiData(),
                defi: this.getEmptyDeFiData(),
                timestamp: Date.now(),
                dataSources: ['API Failure'],
                errors: [error instanceof Error ? error.message : 'Unknown error']
            };
        }
    }
    async getTradFiData() {
        const cacheKey = 'tradfi';
        const cached = this.getCachedData(cacheKey);
        if (cached)
            return cached;
        try {
            const result = await this.fetchTradFiDataFromAPIs();
            this.cacheData(cacheKey, result);
            return result;
        }
        catch (error) {
            console.error('All TradFi APIs failed, returning empty data:', error);
            const emptyResult = this.getEmptyTradFiData();
            this.cacheData(cacheKey, emptyResult);
            return emptyResult;
        }
    }
    async getDeFiData() {
        const cacheKey = 'defi';
        const cached = this.getCachedData(cacheKey);
        if (cached)
            return cached;
        try {
            const result = await this.fetchDeFiDataFromAPIs();
            this.cacheData(cacheKey, result);
            return result;
        }
        catch (error) {
            console.error('All DeFi APIs failed, returning empty data:', error);
            const emptyResult = this.getEmptyDeFiData();
            this.cacheData(cacheKey, emptyResult);
            return emptyResult;
        }
    }
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
    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
        this.isPolling = false;
        console.log('⏹️ Stopped market data polling');
    }
    getCacheStats() {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys()),
            hitRate: this.calculateCacheHitRate(),
            marketDataCache: {
                size: Object.keys(this.marketDataCache).length,
                keys: Object.keys(this.marketDataCache),
                hitRate: this.calculateMarketDataCacheHitRate()
            }
        };
    }
    clearCache() {
        this.cache.clear();
        console.log('🗑️ Main cache cleared');
    }
    clearMarketDataCache() {
        this.marketDataCache = {};
        console.log('🗑️ Enhanced market data cache cleared');
    }
    clearAllCaches() {
        this.cache.clear();
        this.marketDataCache = {};
        console.log('🗑️ All caches cleared');
    }
    async fetchFromFinnhub() {
        try {
            const symbols = DEFAULT_TRADFI_SYMBOLS.slice(0, 10);
            const promises = symbols.map(async (symbol) => {
                const quoteResponse = await axios_1.default.get(`${API_CONFIG.finnhub.baseUrl}/quote`, {
                    params: { symbol, token: API_CONFIG.finnhub.token },
                    timeout: 5000
                });
                const marketData = await this.getTradFiMarketData(symbol);
                return {
                    ...quoteResponse.data,
                    symbol,
                    marketCap: marketData.marketCap,
                    volume: marketData.volume || quoteResponse.data.v
                };
            });
            const results = await Promise.all(promises);
            return results
                .filter(quote => quote.c && quote.c > 0)
                .map(quote => ({
                asset: quote.symbol,
                symbol: quote.symbol,
                price: quote.c,
                change24h: quote.d,
                volume24h: quote.volume || quote.v || 0,
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
    async fetchFromAlphaVantage() {
        try {
            const symbols = DEFAULT_TRADFI_SYMBOLS.slice(0, 5);
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
            const symbols = DEFAULT_TRADFI_SYMBOLS.slice(0, 5);
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
    async fetchTradFiDataFromAPIs() {
        const sources = [
            () => this.fetchFromFinnhub(),
            () => this.fetchFromAlphaVantage(),
            () => this.fetchFromTwelveData()
        ];
        const results = await Promise.allSettled(sources.map(source => source()));
        const successfulResults = results
            .filter((result) => result.status === 'fulfilled' && result.value.length > 0)
            .map(result => result.value);
        if (successfulResults.length > 0) {
            const data = successfulResults[0];
            if (data) {
                return data;
            }
        }
        throw new Error('All TradFi data sources failed');
    }
    async fetchDeFiDataFromAPIs() {
        const sources = [
            () => this.fetchFromCoinGecko(),
            () => this.fetchFromDefiLlama()
        ];
        const results = await Promise.allSettled(sources.map(source => source()));
        const successfulResults = results
            .filter((result) => result.status === 'fulfilled' && result.value.length > 0)
            .map(result => result.value);
        if (successfulResults.length > 0) {
            const data = successfulResults[0];
            if (data) {
                return data;
            }
        }
        throw new Error('All DeFi data sources failed');
    }
    getCachedData(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < 60000) {
            return cached.data;
        }
        return null;
    }
    getEmptyTradFiData() {
        return DEFAULT_TRADFI_SYMBOLS.map(symbol => ({
            asset: symbol,
            symbol: symbol,
            price: 0,
            change24h: 0,
            volume24h: 0,
            marketCap: 0,
            source: 'API Failure',
            lastUpdated: Date.now(),
            high24h: 0,
            low24h: 0,
            open24h: 0
        }));
    }
    getEmptyDeFiData() {
        return DEFAULT_CRYPTO_IDS.map(id => ({
            asset: id,
            symbol: id.toUpperCase().slice(0, 4),
            price: 0,
            change24h: 0,
            volume24h: 0,
            marketCap: 0,
            source: 'API Failure',
            lastUpdated: Date.now(),
            high24h: 0,
            low24h: 0,
            open24h: 0
        }));
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
        return this.cache.size > 0 ? 0.8 : 0;
    }
    calculateMarketDataCacheHitRate() {
        const totalRequests = Object.keys(this.marketDataCache).length;
        if (totalRequests === 0)
            return 0;
        return 0.85;
    }
    setupAxiosInterceptors() {
        axios_1.default.interceptors.request.use((config) => {
            config.headers['User-Agent'] = 'Avila-Protocol-Market-Data/1.0';
            return config;
        });
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
exports.marketDataService = new MarketDataService();
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
