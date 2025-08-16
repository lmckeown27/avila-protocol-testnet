"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
const envPath = path_1.default.resolve(process.cwd(), ".env");
dotenv_1.default.config({ path: envPath });
const requiredVars = [
    "FINNHUB_API_KEY",
    "ALPHA_VANTAGE_API_KEY",
    "TWELVE_DATA_API_KEY",
    "COINMARKETCAP_API_KEY"
];
requiredVars.forEach(key => {
    if (!process.env[key]) {
        console.warn(`⚠️ Missing environment variable: ${key}`);
    }
});
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const enhancedMarketDataService_1 = require("./enhancedMarketDataService");
const paginatedMarketDataService_1 = require("./paginatedMarketDataService");
const enhancedRateLimitMonitor_1 = require("./enhancedRateLimitMonitor");
const companyDiscoveryService_1 = require("./companyDiscoveryService");
const hybridCacheService_1 = require("./hybridCacheService");
const app = (0, express_1.default)();
const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : (process.env.HOST || 'localhost');
app.use((0, cors_1.default)({
    origin: [
        'https://avilaprotocol-liam-mckeown-s-projects.vercel.app',
        'https://avila-protocol-testnet.vercel.app',
        'http://localhost:5173',
        'http://localhost:3000'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express_1.default.json());
app.use((req, res, next) => {
    console.log(`[DEBUG] Incoming request: ${req.method} ${req.originalUrl}`);
    next();
});
app.get('/', (_req, res) => {
    res.json({
        success: true,
        message: 'Avila Markets Backend API',
        version: '1.0.0',
        status: 'operational',
        timestamp: new Date().toISOString(),
        endpoints: {
            health: '/api/health',
            marketData: '/api/market-data',
            stocks: '/api/stocks',
            etfs: '/api/etfs',
            crypto: '/api/crypto',
            digitalAssets: '/api/digital-assets',
            defiProtocols: '/api/defi-protocols',
            search: '/api/search',
            companies: '/api/companies',
            rateLimits: '/api/rate-limits/status',
            loading: '/api/loading/status',
            cache: '/api/cache/stats',
            hybrid: '/api/hybrid'
        },
        documentation: 'This is the Avila Markets Backend API for real-time asset scanning, company discovery, and market data services.',
        environment: process.env.NODE_ENV || 'development'
    });
});
app.get('/api/health', (_req, res) => {
    res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
    });
});
app.get('/env-check', (_req, res) => {
    const envVars = {
        NODE_ENV: process.env.NODE_ENV || 'not set',
        PORT: process.env.PORT || 'not set',
        FINNHUB_API_KEY: process.env.FINNHUB_API_KEY ? 'set' : 'not set',
        ALPHA_VANTAGE_API_KEY: process.env.ALPHA_VANTAGE_API_KEY ? 'set' : 'not set',
        TWELVE_DATA_API_KEY: process.env.TWELVE_DATA_API_KEY ? 'set' : 'not set',
        COINMARKETCAP_API_KEY: process.env.COINMARKETCAP_API_KEY ? 'set' : 'not set'
    };
    res.json({
        success: true,
        environment: envVars,
        timestamp: new Date().toISOString()
    });
});
app.get('/api/market-data/total', async (_req, res) => {
    try {
        const totalMarketData = await enhancedMarketDataService_1.enhancedMarketDataService.getAllMarketData();
        res.json({
            success: true,
            data: totalMarketData,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('❌ Total market data fetch failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch total market data',
            timestamp: new Date().toISOString()
        });
    }
});
app.get('/api/market-data/stock-market', async (_req, res) => {
    try {
        const stockMarketData = await enhancedMarketDataService_1.enhancedMarketDataService.getStockData();
        res.json({
            success: true,
            data: stockMarketData,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('❌ Stock market data fetch failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch stock market data',
            timestamp: new Date().toISOString()
        });
    }
});
app.get('/api/market-data/etf-market', async (_req, res) => {
    try {
        const etfMarketData = await enhancedMarketDataService_1.enhancedMarketDataService.getStockData();
        res.json({
            success: true,
            data: etfMarketData,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('❌ ETF market data fetch failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch ETF market data',
            timestamp: new Date().toISOString()
        });
    }
});
app.get('/api/market-data/digital-assets', async (_req, res) => {
    try {
        const digitalAssetsData = await enhancedMarketDataService_1.enhancedMarketDataService.getDigitalAssetsData();
        res.json({
            success: true,
            data: digitalAssetsData,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('❌ Digital assets data fetch failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch digital assets data',
            timestamp: new Date().toISOString()
        });
    }
});
app.get('/api/market-data/defi-protocols', async (_req, res) => {
    try {
        const defiProtocolsData = await enhancedMarketDataService_1.enhancedMarketDataService.getDigitalAssetsData();
        res.json({
            success: true,
            data: defiProtocolsData,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('❌ DeFi protocols data fetch failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch DeFi protocols data',
            timestamp: new Date().toISOString()
        });
    }
});
app.get('/api/stocks', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 25;
        const search = req.query.search;
        const options = { page, limit };
        if (search)
            options.search = search;
        const stocksData = await paginatedMarketDataService_1.paginatedMarketDataService.getStocks(options);
        res.json({
            success: true,
            data: stocksData,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('❌ Stocks data fetch failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch stocks data',
            timestamp: new Date().toISOString()
        });
    }
});
app.get('/api/etfs', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 25;
        const search = req.query.search;
        const options = { page, limit };
        if (search)
            options.search = search;
        const etfsData = await paginatedMarketDataService_1.paginatedMarketDataService.getETFs(options);
        res.json({
            success: true,
            data: etfsData,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('❌ ETFs data fetch failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch ETFs data',
            timestamp: new Date().toISOString()
        });
    }
});
app.get('/api/crypto', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 25;
        const search = req.query.search;
        const options = { page, limit };
        if (search)
            options.search = search;
        const cryptoData = await paginatedMarketDataService_1.paginatedMarketDataService.getCrypto(options);
        res.json({
            success: true,
            data: cryptoData,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('❌ Crypto data fetch failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch crypto data',
            timestamp: new Date().toISOString()
        });
    }
});
app.get('/api/digital-assets', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 25;
        const search = req.query.search;
        const options = { page, limit };
        if (search)
            options.search = search;
        const digitalAssetsData = await paginatedMarketDataService_1.paginatedMarketDataService.getCrypto(options);
        res.json({
            success: true,
            data: digitalAssetsData,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('❌ Digital assets data fetch failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch digital assets data',
            timestamp: new Date().toISOString()
        });
    }
});
app.get('/api/defi-protocols', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 25;
        const search = req.query.search;
        const options = { page, limit };
        if (search)
            options.search = search;
        const defiProtocolsData = await paginatedMarketDataService_1.paginatedMarketDataService.getCrypto(options);
        res.json({
            success: true,
            data: defiProtocolsData,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('❌ DeFi protocols data fetch failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch DeFi protocols data',
            timestamp: new Date().toISOString()
        });
    }
});
app.get('/api/companies', async (_req, res) => {
    try {
        const companies = await companyDiscoveryService_1.companyDiscoveryService.getDiscoveredCompanies();
        res.json({
            success: true,
            data: companies,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('❌ Companies fetch failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch companies',
            timestamp: new Date().toISOString()
        });
    }
});
app.get('/api/companies/stats', async (_req, res) => {
    try {
        const stats = companyDiscoveryService_1.companyDiscoveryService.getDiscoveryStats();
        res.json({
            success: true,
            data: stats,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('❌ Company stats fetch failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch company stats',
            timestamp: new Date().toISOString()
        });
    }
});
app.get('/api/companies/search', async (req, res) => {
    try {
        const query = req.query.q;
        const categoryParam = req.query.category;
        let category = undefined;
        if (categoryParam && typeof categoryParam === 'string') {
            if (['stock', 'etf', 'crypto'].includes(categoryParam)) {
                category = categoryParam;
            }
        }
        if (!query) {
            return res.status(400).json({
                success: false,
                error: 'Search query is required',
                timestamp: new Date().toISOString()
            });
        }
        const results = await companyDiscoveryService_1.companyDiscoveryService.searchCompanies(query, category);
        return res.json({
            success: true,
            data: results,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('❌ Company search failed:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to search companies',
            timestamp: new Date().toISOString()
        });
    }
});
app.get('/api/companies/sector/:sector', async (req, res) => {
    try {
        const sector = req.params.sector;
        const category = req.query.category;
        const results = await companyDiscoveryService_1.companyDiscoveryService.getCompaniesBySector(sector, category);
        res.json({
            success: true,
            data: results,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('❌ Companies by sector fetch failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch companies by sector',
            timestamp: new Date().toISOString()
        });
    }
});
app.post('/api/companies/refresh', async (_req, res) => {
    try {
        const companies = await companyDiscoveryService_1.companyDiscoveryService.refreshCompanies();
        res.json({
            success: true,
            data: companies,
            message: 'Company discovery refreshed successfully',
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('❌ Company refresh failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to refresh companies',
            timestamp: new Date().toISOString()
        });
    }
});
app.get('/api/loading/status', async (_req, res) => {
    try {
        const status = companyDiscoveryService_1.companyDiscoveryService.getLoadingStatus();
        res.json({
            success: true,
            data: status,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('❌ Loading status fetch failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch loading status',
            timestamp: new Date().toISOString()
        });
    }
});
app.get('/api/cache/stats', async (_req, res) => {
    try {
        const stats = companyDiscoveryService_1.companyDiscoveryService.getCacheStats();
        res.json({
            success: true,
            data: stats,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('❌ Cache stats fetch failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch cache stats',
            timestamp: new Date().toISOString()
        });
    }
});
app.get('/api/hybrid/stats', async (_req, res) => {
    try {
        const stats = hybridCacheService_1.hybridCacheService.getCacheStats();
        res.json({
            success: true,
            data: stats,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('❌ Hybrid cache stats fetch failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch hybrid cache stats',
            timestamp: new Date().toISOString()
        });
    }
});
app.get('/api/hybrid/top/:category', async (req, res) => {
    try {
        const category = req.params.category;
        const limit = parseInt(req.query.limit) || 50;
        const assets = hybridCacheService_1.hybridCacheService.getTopAssets(category, limit);
        res.json({
            success: true,
            data: assets,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('❌ Top assets fetch failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch top assets',
            timestamp: new Date().toISOString()
        });
    }
});
app.get('/api/hybrid/:symbol', async (req, res) => {
    try {
        const symbol = req.params.symbol;
        const category = req.query.category;
        if (!category) {
            return res.status(400).json({
                success: false,
                error: 'Category parameter is required',
                timestamp: new Date().toISOString()
            });
        }
        const assetData = hybridCacheService_1.hybridCacheService.getHybridAssetData(symbol, category);
        if (!assetData) {
            return res.status(404).json({
                success: false,
                error: 'Asset not found in hybrid cache',
                message: `Symbol ${symbol} not found in ${category} cache`,
                timestamp: new Date().toISOString()
            });
        }
        return res.json({
            success: true,
            data: assetData,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('❌ Hybrid asset data fetch failed:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch hybrid asset data',
            timestamp: new Date().toISOString()
        });
    }
});
app.post('/api/hybrid/clear', async (_req, res) => {
    try {
        hybridCacheService_1.hybridCacheService.clearCache();
        res.json({
            success: true,
            message: 'Hybrid cache cleared successfully',
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('❌ Hybrid cache clear failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to clear hybrid cache',
            timestamp: new Date().toISOString()
        });
    }
});
app.get('/api/search', async (req, res) => {
    try {
        const query = req.query.q;
        const categoryParam = req.query.category;
        let category = undefined;
        if (categoryParam && typeof categoryParam === 'string') {
            if (['stock', 'etf', 'crypto'].includes(categoryParam)) {
                category = categoryParam;
            }
        }
        if (!query) {
            return res.status(400).json({
                success: false,
                error: 'Search query is required',
                timestamp: new Date().toISOString()
            });
        }
        const searchResults = await paginatedMarketDataService_1.paginatedMarketDataService.searchAssets(query, category);
        return res.json({
            success: true,
            data: searchResults,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('❌ Asset search failed:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to search assets',
            timestamp: new Date().toISOString()
        });
    }
});
app.get('/api/rate-limits/status', async (_req, res) => {
    try {
        const rateLimitStatus = enhancedRateLimitMonitor_1.enhancedRateLimitMonitor.getRateLimitStatus();
        res.json({
            success: true,
            data: rateLimitStatus,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('❌ Rate limit status fetch failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch rate limit status',
            timestamp: new Date().toISOString()
        });
    }
});
app.get('/api/rate-limits/metrics/:apiName', (req, res) => {
    try {
        const apiName = req.params.apiName;
        const status = enhancedRateLimitMonitor_1.enhancedRateLimitMonitor.getLimitStatus(apiName);
        res.json({
            success: true,
            data: {
                apiName,
                ...status
            },
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error(`Error getting rate limit metrics for ${req.params.apiName}:`, error);
        res.status(500).json({
            success: false,
            error: 'Failed to get rate limit metrics',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
app.get('/api/rate-limits/timing', (_req, res) => {
    try {
        const timing = enhancedRateLimitMonitor_1.enhancedRateLimitMonitor.getAllAPIOptimalTiming();
        res.json({
            success: true,
            data: timing,
            timestamp: new Date().toISOString(),
            message: 'Optimal timing for maintaining constant updates while respecting rate limits'
        });
    }
    catch (error) {
        console.error('Error getting optimal timing information:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get optimal timing information',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
app.get('/api/rate-limits/rotation', (_req, res) => {
    try {
        const rotationStatus = {
            stocks: enhancedRateLimitMonitor_1.enhancedRateLimitMonitor.getAvailableAPIsForType('stocks'),
            etfs: enhancedRateLimitMonitor_1.enhancedRateLimitMonitor.getAvailableAPIsForType('etfs'),
            crypto: enhancedRateLimitMonitor_1.enhancedRateLimitMonitor.getAvailableAPIsForType('crypto'),
            timestamp: new Date().toISOString(),
            message: 'API rotation status showing how APIs work in tandem for constant updates'
        };
        res.json({
            success: true,
            data: rotationStatus
        });
    }
    catch (error) {
        console.error('Error getting API rotation status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get API rotation status',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
app.get('/api/health/apis', (_req, res) => {
    try {
        const healthStatus = enhancedRateLimitMonitor_1.enhancedRateLimitMonitor.getHealthStatus();
        res.json({
            success: true,
            data: healthStatus,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Error fetching API health status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch API health status',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
app.use('*', (_req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        message: 'The requested endpoint does not exist'
    });
});
app.use((error, _req, res, _next) => {
    console.error('Global error handler:', error);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message || 'An unexpected error occurred'
    });
});
app.listen(PORT, HOST, () => {
    console.log('🚀 Avila Markets Backend API Server Started');
    console.log(`📍 Server running at http://${HOST}:${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('');
    console.log('📊 Available Endpoints:');
    console.log(`🏥 Health: http://${HOST}:${PORT}/api/health`);
    console.log(`📈 Market Data: http://${HOST}:${PORT}/api/market-data`);
    console.log(`📊 Stocks: http://${HOST}:${PORT}/api/stocks`);
    console.log(`📊 ETFs: http://${HOST}:${PORT}/api/etfs`);
    console.log(`🪙 Crypto: http://${HOST}:${PORT}/api/crypto`);
    console.log(`💎 Digital Assets: http://${HOST}:${PORT}/api/digital-assets`);
    console.log(`🔗 DeFi Protocols: http://${HOST}:${PORT}/api/defi-protocols`);
    console.log(`🔍 Search: http://${HOST}:${PORT}/api/search`);
    console.log(`🔍 Companies: http://${HOST}:${PORT}/api/companies`);
    console.log(`⏱️ Rate Limits: http://${HOST}:${PORT}/api/rate-limits/status`);
    console.log(`📊 Loading Status: http://${HOST}:${PORT}/api/loading/status`);
    console.log(`📦 Cache Stats: http://${HOST}:${PORT}/api/cache/stats`);
    console.log(`📦 Hybrid Cache: http://${HOST}:${PORT}/api/hybrid/stats`);
});
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received, shutting down gracefully...');
    enhancedRateLimitMonitor_1.enhancedRateLimitMonitor.stop();
    process.exit(0);
});
process.on('SIGINT', () => {
    console.log('🛑 SIGINT received, shutting down gracefully...');
    enhancedRateLimitMonitor_1.enhancedRateLimitMonitor.stop();
    process.exit(0);
});
