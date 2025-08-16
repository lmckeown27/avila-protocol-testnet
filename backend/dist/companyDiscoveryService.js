"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.companyDiscoveryService = exports.CompanyDiscoveryService = void 0;
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
class CompanyDiscoveryService {
    constructor() {
        this.discoveredCompanies = null;
        this.lastDiscoveryTime = 0;
        this.DISCOVERY_CACHE_DURATION = 24 * 60 * 60 * 1000;
        setInterval(() => this.refreshCompanies(), 24 * 60 * 60 * 1000);
    }
    async discoverCompanies(options = {}) {
        const now = Date.now();
        if (this.discoveredCompanies && (now - this.lastDiscoveryTime) < this.DISCOVERY_CACHE_DURATION) {
            console.log('📋 Using cached company discovery data');
            return this.discoveredCompanies;
        }
        console.log('🔍 Starting optimized company discovery...');
        try {
            const [stocks, etfs, crypto] = await Promise.all([
                this.discoverStocksOptimized(options),
                this.discoverETFsOptimized(options),
                this.discoverCryptoOptimized(options)
            ]);
            this.discoveredCompanies = {
                stocks,
                etfs,
                crypto,
                timestamp: now,
                dataSource: 'Multiple APIs - Optimized'
            };
            this.lastDiscoveryTime = now;
            console.log(`✅ Optimized discovery completed: ${stocks.length} stocks, ${etfs.length} ETFs, ${crypto.length} crypto`);
            return this.discoveredCompanies;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('❌ Company discovery failed:', errorMessage);
            throw error;
        }
    }
    async discoverStocksOptimized(options) {
        console.log('📈 Discovering stocks with optimized strategy...');
        const stocks = [];
        try {
            const finnhubStocks = await this.discoverStocksFromFinnhubOptimized();
            stocks.push(...finnhubStocks);
            console.log(`✅ Finnhub: ${finnhubStocks.length} stocks discovered`);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.warn('⚠️ Finnhub discovery failed, using fallback:', errorMessage);
        }
        if (stocks.length < 800) {
            try {
                const twelveDataStocks = await this.discoverStocksFromTwelveDataOptimized();
                stocks.push(...twelveDataStocks);
                console.log(`✅ Twelve Data: ${twelveDataStocks.length} stocks discovered`);
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                console.warn('⚠️ Twelve Data discovery failed:', errorMessage);
            }
        }
        if (stocks.length < 200) {
            try {
                const alphaVantageStocks = await this.discoverStocksFromAlphaVantageOptimized();
                stocks.push(...alphaVantageStocks);
                console.log(`✅ Alpha Vantage: ${alphaVantageStocks.length} stocks discovered`);
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                console.warn('⚠️ Alpha Vantage discovery failed:', errorMessage);
            }
        }
        const uniqueStocks = this.removeDuplicates(stocks);
        return uniqueStocks.slice(0, 1500);
    }
    async discoverStocksFromFinnhubOptimized() {
        const stocks = [];
        const endpoints = [
            '/api/v1/stock/symbol?exchange=US',
            '/api/v1/stock/symbol?exchange=NASDAQ',
            '/api/v1/stock/symbol?exchange=NYSE',
            '/api/v1/stock/symbol?exchange=AMEX'
        ];
        for (const endpoint of endpoints) {
            try {
                const response = await fetch(`https://finnhub.io${endpoint}&token=${process.env.FINNHUB_API_KEY}`);
                if (response.ok) {
                    const data = await response.json();
                    if (Array.isArray(data)) {
                        const batch = data.slice(0, 200).map((stock) => ({
                            symbol: stock.symbol,
                            name: stock.description || stock.symbol,
                            sector: stock.primarySic || 'Unknown',
                            industry: stock.primarySic || 'Unknown',
                            exchange: stock.primaryExchange || 'Unknown'
                        }));
                        stocks.push(...batch);
                    }
                }
                await new Promise(resolve => setTimeout(resolve, 1200));
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                console.warn(`⚠️ Finnhub endpoint ${endpoint} failed:`, errorMessage);
            }
        }
        return stocks;
    }
    async discoverStocksFromTwelveDataOptimized() {
        const stocks = [];
        try {
            const response = await fetch(`https://api.twelvedata.com/stocks?country=US&apikey=${process.env.TWELVE_DATA_API_KEY}`);
            if (response.ok) {
                const data = await response.json();
                if (data.status === 'ok' && Array.isArray(data.data)) {
                    const batch = data.data.slice(0, 400).map((stock) => ({
                        symbol: stock.symbol,
                        name: stock.name || stock.symbol,
                        sector: stock.sector || 'Unknown',
                        industry: stock.industry || 'Unknown',
                        exchange: stock.exchange || 'Unknown'
                    }));
                    stocks.push(...batch);
                }
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.warn('⚠️ Twelve Data discovery failed:', errorMessage);
        }
        return stocks;
    }
    async discoverStocksFromAlphaVantageOptimized() {
        const stocks = [];
        const topStocks = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'META', 'NVDA', 'AMZN', 'BRK.A', 'JNJ', 'JPM'];
        for (const symbol of topStocks) {
            try {
                const response = await fetch(`https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol}&apikey=${process.env.ALPHA_VANTAGE_API_KEY}`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.Symbol) {
                        stocks.push({
                            symbol: data.Symbol,
                            name: data.Name || data.Symbol,
                            sector: data.Sector || 'Unknown',
                            industry: data.Industry || 'Unknown',
                            exchange: data.Exchange || 'Unknown'
                        });
                    }
                }
                await new Promise(resolve => setTimeout(resolve, 13000));
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                console.warn(`⚠️ Alpha Vantage discovery for ${symbol} failed:`, errorMessage);
            }
        }
        return stocks;
    }
    async discoverETFsOptimized(options) {
        console.log('📊 Discovering ETFs with optimized strategy...');
        const etfs = [];
        try {
            const twelveDataETFs = await this.discoverETFsFromTwelveDataOptimized();
            etfs.push(...twelveDataETFs);
            console.log(`✅ Twelve Data: ${twelveDataETFs.length} ETFs discovered`);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.warn('⚠️ Twelve Data ETF discovery failed:', errorMessage);
        }
        if (etfs.length < 200) {
            try {
                const finnhubETFs = await this.discoverETFsFromFinnhubOptimized();
                etfs.push(...finnhubETFs);
                console.log(`✅ Finnhub: ${finnhubETFs.length} ETFs discovered`);
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                console.warn('⚠️ Finnhub ETF discovery failed:', errorMessage);
            }
        }
        const uniqueETFs = this.removeDuplicates(etfs);
        return uniqueETFs.slice(0, 1000);
    }
    async discoverETFsFromTwelveDataOptimized() {
        const etfs = [];
        try {
            const response = await fetch(`https://api.twelvedata.com/etfs?country=US&apikey=${process.env.TWELVE_DATA_API_KEY}`);
            if (response.ok) {
                const data = await response.json();
                if (data.status === 'ok' && Array.isArray(data.data)) {
                    const batch = data.data.slice(0, 500).map((etf) => ({
                        symbol: etf.symbol,
                        name: etf.name || etf.symbol,
                        sector: 'ETF',
                        industry: etf.category || 'Exchange Traded Fund',
                        exchange: etf.exchange || 'ETF'
                    }));
                    etfs.push(...batch);
                }
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.warn('⚠️ Twelve Data ETF discovery failed:', errorMessage);
        }
        return etfs;
    }
    async discoverETFsFromFinnhubOptimized() {
        const etfs = [];
        try {
            const response = await fetch(`https://finnhub.io/api/v1/stock/symbol?exchange=ETF&token=${process.env.FINNHUB_API_KEY}`);
            if (response.ok) {
                const data = await response.json();
                if (Array.isArray(data)) {
                    const batch = data.slice(0, 200).map((etf) => ({
                        symbol: etf.symbol,
                        name: etf.description || etf.symbol,
                        sector: 'ETF',
                        industry: 'Exchange Traded Fund',
                        exchange: etf.primaryExchange || 'ETF'
                    }));
                    etfs.push(...batch);
                }
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.warn('⚠️ Finnhub ETF discovery failed:', errorMessage);
        }
        return etfs;
    }
    async discoverCryptoOptimized(options) {
        console.log('🪙 Discovering crypto with optimized strategy...');
        const crypto = [];
        try {
            const coinGeckoCrypto = await this.discoverCryptoFromCoinGeckoOptimized();
            crypto.push(...coinGeckoCrypto);
            console.log(`✅ CoinGecko: ${coinGeckoCrypto.length} crypto discovered`);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.warn('⚠️ CoinGecko discovery failed:', errorMessage);
        }
        if (crypto.length < 800) {
            try {
                const coinMarketCapCrypto = await this.discoverCryptoFromCoinMarketCapOptimized();
                crypto.push(...coinMarketCapCrypto);
                console.log(`✅ CoinMarketCap: ${coinMarketCapCrypto.length} crypto discovered`);
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                console.warn('⚠️ CoinMarketCap discovery failed:', errorMessage);
            }
        }
        if (crypto.length < 1000) {
            try {
                const defiLlamaCrypto = await this.discoverCryptoFromDeFiLlamaOptimized();
                crypto.push(...defiLlamaCrypto);
                console.log(`✅ DeFi Llama: ${defiLlamaCrypto.length} crypto discovered`);
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                console.warn('⚠️ DeFi Llama discovery failed:', errorMessage);
            }
        }
        const uniqueCrypto = this.removeDuplicates(crypto);
        return uniqueCrypto.slice(0, 1500);
    }
    async discoverCryptoFromCoinGeckoOptimized() {
        const crypto = [];
        try {
            for (let page = 1; page <= 3; page++) {
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
                await new Promise(resolve => setTimeout(resolve, 1500));
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.warn('⚠️ CoinGecko discovery failed:', errorMessage);
        }
        return crypto;
    }
    async discoverCryptoFromCoinMarketCapOptimized() {
        const crypto = [];
        try {
            for (let start = 1; start <= 1000; start += 500) {
                const response = await fetch(`https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest?start=${start}&limit=500&convert=USD`, {
                    headers: {
                        'X-CMC_PRO_API_KEY': process.env.COINMARKETCAP_API_KEY || ''
                    }
                });
                if (response.ok) {
                    const data = await response.json();
                    if (data.data && Array.isArray(data.data)) {
                        const batch = data.data.map((coin) => {
                            var _a, _b;
                            return ({
                                symbol: coin.symbol || ((_a = coin.name) === null || _a === void 0 ? void 0 : _a.toUpperCase()),
                                name: coin.name || ((_b = coin.symbol) === null || _b === void 0 ? void 0 : _b.toUpperCase()),
                                sector: 'Cryptocurrency',
                                industry: coin.category || 'Digital Asset',
                                exchange: 'Crypto Exchange'
                            });
                        });
                        crypto.push(...batch);
                    }
                }
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.warn('⚠️ CoinMarketCap discovery failed:', errorMessage);
        }
        return crypto;
    }
    async discoverCryptoFromDeFiLlamaOptimized() {
        const crypto = [];
        try {
            const response = await fetch('https://api.llama.fi/protocols');
            if (response.ok) {
                const data = await response.json();
                if (Array.isArray(data)) {
                    const batch = data.slice(0, 300).map((protocol) => {
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
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.warn('⚠️ DeFi Llama discovery failed:', errorMessage);
        }
        return crypto;
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
    async discoverStocks(options) {
        const companies = [];
        try {
            const finnhubCompanies = await this.discoverStocksFromFinnhub(options);
            companies.push(...finnhubCompanies);
            if (companies.length === 0) {
                const alphaVantageCompanies = await this.discoverStocksFromAlphaVantage(options);
                companies.push(...alphaVantageCompanies);
            }
            if (companies.length === 0) {
                const twelveDataCompanies = await this.discoverStocksFromTwelveData(options);
                companies.push(...twelveDataCompanies);
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.warn('Stock discovery failed:', errorMessage);
        }
        return this.removeDuplicateCompanies(companies)
            .sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0))
            .slice(0, options.maxResults || 500);
    }
    async discoverStocksFromFinnhub(options) {
        try {
            const sp500Response = await enhancedRateLimitMonitor_1.enhancedRateLimitMonitor.scheduleRequest('finnhub', async () => {
                const response = await axios_1.default.get('https://finnhub.io/api/v1/index/constituents', {
                    params: {
                        symbol: '^GSPC',
                        token: API_KEYS.finnhub
                    },
                    timeout: 10000
                });
                return response.data;
            }, 'high');
            if (sp500Response && sp500Response.constituents) {
                const companies = [];
                for (const symbol of sp500Response.constituents.slice(0, options.maxResults || 500)) {
                    try {
                        const profileResponse = await enhancedRateLimitMonitor_1.enhancedRateLimitMonitor.scheduleRequest('finnhub', async () => {
                            const response = await axios_1.default.get('https://finnhub.io/api/v1/company/profile2', {
                                params: {
                                    symbol,
                                    token: API_KEYS.finnhub
                                },
                                timeout: 5000
                            });
                            return response.data;
                        }, 'medium');
                        if (profileResponse && profileResponse.profile) {
                            const profile = profileResponse.profile;
                            companies.push({
                                symbol: profile.ticker || symbol,
                                name: profile.name || symbol,
                                sector: profile.finnhubIndustry || 'Unknown',
                                industry: profile.finnhubIndustry || 'Unknown',
                                marketCap: profile.marketCapitalization ? parseFloat(profile.marketCapitalization) : undefined,
                                exchange: profile.exchange || 'Unknown',
                                country: profile.country || 'Unknown',
                                website: profile.weburl || undefined,
                                description: profile.description || undefined
                            });
                        }
                        else {
                            companies.push({
                                symbol,
                                name: symbol,
                                sector: 'Unknown',
                                industry: 'Unknown'
                            });
                        }
                    }
                    catch (error) {
                        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                        console.warn(`Failed to get profile for ${symbol}:`, errorMessage);
                        companies.push({
                            symbol,
                            name: symbol,
                            sector: 'Unknown',
                            industry: 'Unknown'
                        });
                    }
                }
                return companies;
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.warn('Finnhub S&P 500 discovery failed:', errorMessage);
        }
        return [];
    }
    async discoverStocksFromAlphaVantage(options) {
        try {
            const topMoversResponse = await enhancedRateLimitMonitor_1.enhancedRateLimitMonitor.scheduleRequest('alphaVantage', async () => {
                const response = await axios_1.default.get('https://www.alphavantage.co/query', {
                    params: {
                        function: 'TOP_GAINERS_LOSERS',
                        apikey: API_KEYS.alphaVantage
                    },
                    timeout: 10000
                });
                return response.data;
            }, 'medium');
            if (topMoversResponse && (topMoversResponse.top_gainers || topMoversResponse.top_losers)) {
                const companies = [];
                if (topMoversResponse.top_gainers) {
                    for (const stock of topMoversResponse.top_gainers) {
                        companies.push({
                            symbol: stock.ticker,
                            name: stock.price,
                            sector: 'Unknown',
                            industry: 'Unknown',
                            marketCap: undefined
                        });
                    }
                }
                if (topMoversResponse.top_losers) {
                    for (const stock of topMoversResponse.top_losers) {
                        companies.push({
                            symbol: stock.ticker,
                            name: stock.price,
                            sector: 'Unknown',
                            industry: 'Unknown',
                            marketCap: undefined
                        });
                    }
                }
                return companies;
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.warn('Alpha Vantage discovery failed:', errorMessage);
        }
        return [];
    }
    async discoverStocksFromTwelveData(options) {
        try {
            const stocksResponse = await enhancedRateLimitMonitor_1.enhancedRateLimitMonitor.scheduleRequest('twelveData', async () => {
                const response = await axios_1.default.get('https://api.twelvedata.com/stocks', {
                    params: {
                        country: 'US',
                        apikey: API_KEYS.twelveData
                    },
                    timeout: 10000
                });
                return response.data;
            }, 'medium');
            if (stocksResponse && stocksResponse.data) {
                return stocksResponse.data.slice(0, options.maxResults || 200).map((stock) => ({
                    symbol: stock.symbol,
                    name: stock.name,
                    sector: stock.sector || 'Unknown',
                    industry: stock.industry || 'Unknown',
                    marketCap: undefined,
                    exchange: stock.exchange || 'Unknown',
                    country: stock.country || 'Unknown'
                }));
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.warn('Twelve Data discovery failed:', errorMessage);
        }
        return [];
    }
    async discoverETFs(options) {
        try {
            const stockCompanies = await this.discoverStocks({ ...options, maxResults: 1000 });
            const etfSymbols = new Set([
                'SPY', 'QQQ', 'IWM', 'VTI', 'VEA', 'VWO', 'BND', 'GLD', 'TLT', 'AGG',
                'XLK', 'XLF', 'XLV', 'XLE', 'XLI', 'XLP', 'XLY', 'XLU', 'XLB', 'XLC',
                'EFA', 'EEM', 'FXI', 'EWJ', 'EWG', 'EWU', 'EWC', 'EWA', 'EWZ', 'EWY',
                'USO', 'UNG', 'DBA', 'DBC', 'DJP', 'GSG', 'PPLT', 'PALL'
            ]);
            return stockCompanies
                .filter(company => etfSymbols.has(company.symbol))
                .map(company => ({
                ...company,
                sector: this.getETFCategory(company.symbol),
                industry: 'ETF'
            }));
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.warn('ETF discovery failed:', errorMessage);
            return [];
        }
    }
    getETFCategory(symbol) {
        const etfCategories = {
            'SPY': 'Broad Market',
            'QQQ': 'Technology',
            'IWM': 'Small Cap',
            'VTI': 'Broad Market',
            'VEA': 'International',
            'VWO': 'Emerging Markets',
            'BND': 'Bonds',
            'GLD': 'Commodity',
            'TLT': 'Bonds',
            'AGG': 'Bonds'
        };
        return etfCategories[symbol] || 'Other';
    }
    async discoverCrypto(options) {
        try {
            const coinGeckoCrypto = await this.discoverCryptoFromCoinGecko(options);
            if (coinGeckoCrypto.length > 0) {
                return coinGeckoCrypto;
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.warn('CoinGecko crypto discovery failed:', errorMessage);
        }
        try {
            const coinMarketCapCrypto = await this.discoverCryptoFromCoinMarketCap(options);
            if (coinMarketCapCrypto.length > 0) {
                return coinMarketCapCrypto;
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.warn('CoinMarketCap crypto discovery failed:', errorMessage);
        }
        return [];
    }
    async discoverCryptoFromCoinGecko(options) {
        try {
            const response = await enhancedRateLimitMonitor_1.enhancedRateLimitMonitor.scheduleRequest('coinGecko', async () => {
                const response = await axios_1.default.get('https://api.coingecko.com/api/v3/coins/markets', {
                    params: {
                        vs_currency: 'usd',
                        order: 'market_cap_desc',
                        per_page: options.maxResults || 200,
                        page: 1,
                        sparkline: false
                    },
                    timeout: 10000
                });
                return response.data;
            }, 'high');
            return response.map((coin) => {
                var _a, _b, _c;
                return ({
                    symbol: coin.symbol.toUpperCase(),
                    name: coin.name,
                    sector: this.getCryptoCategory(coin.id),
                    industry: 'Cryptocurrency',
                    marketCap: coin.market_cap,
                    exchange: 'Crypto Exchange',
                    country: 'Global',
                    website: ((_b = (_a = coin.links) === null || _a === void 0 ? void 0 : _a.homepage) === null || _b === void 0 ? void 0 : _b[0]) || undefined,
                    description: ((_c = coin.description) === null || _c === void 0 ? void 0 : _c.en) ? coin.description.en.substring(0, 200) + '...' : undefined
                });
            });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('Failed to discover crypto from CoinGecko:', errorMessage);
            return [];
        }
    }
    async discoverCryptoFromCoinMarketCap(options) {
        try {
            const response = await enhancedRateLimitMonitor_1.enhancedRateLimitMonitor.scheduleRequest('coinMarketCap', async () => {
                const response = await axios_1.default.get('https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest', {
                    params: {
                        start: 1,
                        limit: options.maxResults || 200,
                        convert: 'USD'
                    },
                    headers: {
                        'X-CMC_PRO_API_KEY': API_KEYS.coinMarketCap
                    },
                    timeout: 10000
                });
                return response.data;
            }, 'medium');
            return response.data.map((coin) => ({
                symbol: coin.symbol,
                name: coin.name,
                sector: this.getCryptoCategory(coin.slug),
                industry: 'Cryptocurrency',
                marketCap: coin.quote.USD.market_cap,
                exchange: 'Crypto Exchange',
                country: 'Global'
            }));
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('Failed to discover crypto from CoinMarketCap:', errorMessage);
            return [];
        }
    }
    getCryptoCategory(coinId) {
        const categories = {
            'bitcoin': 'Layer 1',
            'ethereum': 'Layer 1',
            'cardano': 'Layer 1',
            'solana': 'Layer 1',
            'polkadot': 'Layer 1',
            'avalanche-2': 'Layer 1',
            'cosmos': 'Layer 1',
            'near': 'Layer 1',
            'algorand': 'Layer 1',
            'tezos': 'Layer 1',
            'chainlink': 'DeFi',
            'uniswap': 'DeFi',
            'aave': 'DeFi',
            'compound': 'DeFi',
            'sushi': 'DeFi',
            'curve-dao-token': 'DeFi',
            'yearn-finance': 'DeFi',
            'synthetix-network-token': 'DeFi',
            '1inch': 'DeFi',
            'balancer': 'DeFi',
            'axie-infinity': 'Gaming',
            'the-sandbox': 'Gaming',
            'decentraland': 'Gaming',
            'enjin-coin': 'Gaming',
            'gala': 'Gaming',
            'illuvium': 'Gaming',
            'star-atlas': 'Gaming',
            'alien-worlds': 'Gaming',
            'splinterlands': 'Gaming',
            'crypto-blades': 'Gaming',
            'dogecoin': 'Meme',
            'shiba-inu': 'Meme',
            'pepe': 'Meme',
            'bonk': 'Meme',
            'floki': 'Meme',
            'baby-doge-coin': 'Meme',
            'safe-moon': 'Meme',
            'elon': 'Meme',
            'doge-killer': 'Meme',
            'baby-shiba-inu': 'Meme'
        };
        return categories[coinId] || 'Other';
    }
    removeDuplicateCompanies(companies) {
        const seen = new Set();
        return companies.filter(company => {
            const key = company.symbol.toUpperCase();
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }
    schedulePeriodicDiscovery() {
        setInterval(async () => {
            console.log('🔄 Running scheduled company discovery...');
            try {
                await this.discoverCompanies();
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                console.error('Scheduled company discovery failed:', errorMessage);
            }
        }, this.DISCOVERY_CACHE_DURATION);
    }
    async getDiscoveredCompanies() {
        if (!this.discoveredCompanies) {
            return await this.discoverCompanies();
        }
        return this.discoveredCompanies;
    }
    async refreshCompanies() {
        this.discoveredCompanies = null;
        this.lastDiscoveryTime = 0;
        return await this.discoverCompanies();
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
        if (!this.discoveredCompanies) {
            return {
                totalCompanies: 0,
                stocks: 0,
                etfs: 0,
                crypto: 0,
                lastDiscovery: null,
                cacheStatus: 'empty'
            };
        }
        const sectors = new Set();
        const industries = new Set();
        [...this.discoveredCompanies.stocks, ...this.discoveredCompanies.etfs, ...this.discoveredCompanies.crypto].forEach(company => {
            if (company.sector)
                sectors.add(company.sector);
            if (company.industry)
                industries.add(company.industry);
        });
        return {
            totalCompanies: this.discoveredCompanies.stocks.length + this.discoveredCompanies.etfs.length + this.discoveredCompanies.crypto.length,
            stocks: this.discoveredCompanies.stocks.length,
            etfs: this.discoveredCompanies.etfs.length,
            crypto: this.discoveredCompanies.crypto.length,
            uniqueSectors: sectors.size,
            uniqueIndustries: industries.size,
            lastDiscovery: new Date(this.discoveredCompanies.timestamp).toISOString(),
            cacheStatus: 'valid',
            dataSource: this.discoveredCompanies.dataSource
        };
    }
}
exports.CompanyDiscoveryService = CompanyDiscoveryService;
exports.companyDiscoveryService = new CompanyDiscoveryService();
