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
const app = (0, express_1.default)();
const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : (process.env.HOST || 'localhost');
app.use((0, cors_1.default)());
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
            search: '/api/search',
            companies: '/api/companies',
            rateLimits: '/api/rate-limits/status',
            progressiveLoading: '/api/progressive-loading/status'
        },
        documentation: 'This is the Avila Markets Backend API for market data, company discovery, and progressive asset loading.',
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
app.get('/api/market-data', async (_req, res) => {
    try {
        console.log('📊 Fetching all market data...');
        const data = await enhancedMarketDataService_1.enhancedMarketDataService.getAllMarketData();
        res.json({
            success: true,
            data,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Error fetching market data:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch market data',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
app.get('/api/market-data/stocks', async (_req, res) => {
    try {
        console.log('📈 Fetching Stock Market data...');
        const data = await enhancedMarketDataService_1.enhancedMarketDataService.getStockData();
        res.json({
            success: true,
            data,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Error fetching Stock Market data:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch Stock Market data',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
app.get('/api/market-data/digital-assets', async (_req, res) => {
    try {
        console.log('🌐 Fetching Digital Assets data...');
        const data = await enhancedMarketDataService_1.enhancedMarketDataService.getDigitalAssetsData();
        res.json({
            success: true,
            data,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Error fetching Digital Assets data:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch Digital Assets data',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
app.get('/api/stocks', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 25;
        const sortBy = req.query.sortBy || 'symbol';
        const sortOrder = req.query.sortOrder || 'asc';
        const search = req.query.search;
        const category = req.query.category;
        console.log(`📈 Fetching stocks page ${page}, limit ${limit}, search: ${search || 'none'}, category: ${category || 'all'}`);
        const data = await paginatedMarketDataService_1.paginatedMarketDataService.getStocks({
            page,
            limit,
            sortBy,
            sortOrder,
            search,
            category
        });
        res.json({
            success: true,
            data,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Error fetching paginated stocks:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch stocks',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
app.get('/api/etfs', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 25;
        const sortBy = req.query.sortBy || 'symbol';
        const sortOrder = req.query.sortOrder || 'asc';
        const search = req.query.search;
        const category = req.query.category;
        console.log(`📊 Fetching ETFs page ${page}, limit ${limit}, search: ${search || 'none'}, category: ${category || 'all'}`);
        const data = await paginatedMarketDataService_1.paginatedMarketDataService.getETFs({
            page,
            limit,
            sortBy,
            sortOrder,
            search,
            category
        });
        res.json({
            success: true,
            data,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Error fetching paginated ETFs:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch ETFs',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
app.get('/api/crypto', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 25;
        const sortBy = req.query.sortBy || 'marketCap';
        const sortOrder = req.query.sortOrder || 'desc';
        const search = req.query.search;
        const category = req.query.category;
        console.log(`🌐 Fetching crypto page ${page}, limit ${limit}, search: ${search || 'none'}, category: ${category || 'all'}`);
        const data = await paginatedMarketDataService_1.paginatedMarketDataService.getCrypto({
            page,
            limit,
            sortBy,
            sortOrder,
            search,
            category
        });
        res.json({
            success: true,
            data,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Error fetching paginated crypto:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch crypto',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
app.get('/api/search', async (req, res) => {
    try {
        const query = req.query.q;
        const category = req.query.category;
        if (!query) {
            return res.status(400).json({
                success: false,
                error: 'Search query is required',
                message: 'Please provide a search query using the "q" parameter'
            });
        }
        console.log(`🔍 Searching for "${query}" in category: ${category || 'all'}`);
        const results = await paginatedMarketDataService_1.paginatedMarketDataService.searchAssets(query, category);
        return res.json({
            success: true,
            data: results,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Error searching assets:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to search assets',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
app.get('/api/categories', async (_req, res) => {
    try {
        const discoveredCompanies = await companyDiscoveryService_1.companyDiscoveryService.getDiscoveredCompanies();
        const categories = {
            stocks: groupCompaniesBySector(discoveredCompanies.stocks || []),
            etfs: groupCompaniesBySector(discoveredCompanies.etfs || []),
            crypto: groupCompaniesBySector(discoveredCompanies.crypto || [])
        };
        res.json({
            success: true,
            data: categories,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch categories',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
function groupCompaniesBySector(companies) {
    const grouped = {};
    companies.forEach(company => {
        const sector = company.sector || 'Other';
        if (!grouped[sector]) {
            grouped[sector] = [];
        }
        grouped[sector].push(company.symbol);
    });
    return grouped;
}
app.get('/api/market-data/enhanced/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        console.log(`🔍 Fetching enhanced data for ${symbol}`);
        let marketData;
        if (['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX', 'SPY', 'QQQ', 'IWM', 'VTI', 'VEA', 'VWO', 'BND', 'GLD', '^GSPC', '^DJI', '^IXIC', '^RUT', 'JNJ', 'PG', 'KO', 'PFE', 'VZ', 'T', 'XOM', 'CVX', 'JPM', 'BAC', 'WFC'].includes(symbol.toUpperCase())) {
            marketData = await enhancedMarketDataService_1.enhancedMarketDataService.getEnhancedStockData(symbol.toUpperCase());
        }
        else {
            marketData = { message: 'Enhanced data not available for this asset type' };
        }
        res.json({
            success: true,
            data: marketData,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error(`Error fetching enhanced data for ${req.params.symbol}:`, error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch enhanced data',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
app.get('/api/market-data/cache/stats', (_req, res) => {
    try {
        const cacheStats = enhancedMarketDataService_1.enhancedMarketDataService.getCacheStats();
        const rateLimitStatus = enhancedMarketDataService_1.enhancedMarketDataService.getRateLimitStatus();
        res.json({
            success: true,
            data: {
                cache: cacheStats,
                rateLimits: rateLimitStatus,
                timestamp: new Date().toISOString()
            }
        });
    }
    catch (error) {
        console.error('Error fetching cache stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch cache statistics',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
app.post('/api/market-data/cache/clear', (_req, res) => {
    try {
        enhancedMarketDataService_1.enhancedMarketDataService.clearCache();
        paginatedMarketDataService_1.paginatedMarketDataService.clearCache();
        res.json({
            success: true,
            message: 'Cache cleared successfully',
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Error clearing cache:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to clear cache',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
app.get('/api/rate-limits/status', (_req, res) => {
    try {
        const status = enhancedRateLimitMonitor_1.enhancedRateLimitMonitor.getAllAPILimitStatus();
        res.json({
            success: true,
            data: status,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Error getting rate limit status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get rate limit status',
            message: error instanceof Error ? error.message : 'Unknown error'
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
app.get('/api/companies', async (_req, res) => {
    try {
        console.log('🔍 Fetching discovered companies...');
        const companies = await companyDiscoveryService_1.companyDiscoveryService.getDiscoveredCompanies();
        res.json({
            success: true,
            data: companies,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Error fetching discovered companies:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch discovered companies',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
app.get('/api/companies/stats', async (_req, res) => {
    try {
        console.log('📊 Fetching company discovery statistics...');
        const stats = companyDiscoveryService_1.companyDiscoveryService.getDiscoveryStats();
        res.json({
            success: true,
            data: stats,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Error fetching company discovery stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch company discovery stats',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
app.get('/api/companies/search', async (req, res) => {
    try {
        const query = req.query.q;
        const category = req.query.category;
        if (!query) {
            return res.status(400).json({
                success: false,
                error: 'Search query is required',
                message: 'Please provide a search query using the "q" parameter'
            });
        }
        console.log(`🔍 Searching companies for "${query}" in category: ${category || 'all'}`);
        const results = await companyDiscoveryService_1.companyDiscoveryService.searchCompanies(query, category);
        return res.json({
            success: true,
            data: results,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Error searching companies:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to search companies',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
app.get('/api/companies/sector/:sector', async (req, res) => {
    try {
        const { sector } = req.params;
        const category = req.query.category;
        console.log(`🏷️  Fetching companies in sector "${sector}" for category: ${category || 'all'}`);
        const results = await companyDiscoveryService_1.companyDiscoveryService.getCompaniesBySector(sector, category);
        res.json({
            success: true,
            data: results,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error(`Error fetching companies in sector ${req.params.sector}:`, error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch companies by sector',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
app.post('/api/companies/refresh', async (_req, res) => {
    try {
        console.log('🔄 Forcing company discovery refresh...');
        const companies = await companyDiscoveryService_1.companyDiscoveryService.refreshCompanies();
        res.json({
            success: true,
            data: companies,
            message: 'Company discovery refreshed successfully',
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Error refreshing company discovery:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to refresh company discovery',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
app.get('/api/progressive-loading/status', async (_req, res) => {
    try {
        const status = companyDiscoveryService_1.companyDiscoveryService.getProgressiveLoadingStatus();
        res.json({
            success: true,
            data: status,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Error getting progressive loading status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get progressive loading status',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
app.post('/api/progressive-loading/expand', async (req, res) => {
    try {
        const { assetType, targetAmount } = req.body;
        if (!assetType || !targetAmount) {
            return res.status(400).json({
                success: false,
                error: 'Missing required parameters',
                message: 'assetType and targetAmount are required'
            });
        }
        if (!['stocks', 'etfs', 'crypto'].includes(assetType)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid asset type',
                message: 'assetType must be one of: stocks, etfs, crypto'
            });
        }
        const newAmount = await companyDiscoveryService_1.companyDiscoveryService.expandAssetDiscovery(assetType, targetAmount);
        return res.json({
            success: true,
            data: {
                assetType,
                previousAmount: newAmount - (targetAmount - newAmount),
                newAmount,
                targetAmount
            },
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Error expanding asset discovery:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to expand asset discovery',
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
    console.log('🚀 Enhanced Market Data Service with Pagination Started');
    console.log(`📍 Server: http://${HOST}:${PORT}`);
    console.log(`🔍 Health check: http://${HOST}:${PORT}/api/health`);
    console.log(`📊 Market data: http://${HOST}:${PORT}/api/market-data`);
    console.log(`📈 Stock Market data: http://${HOST}:${PORT}/api/market-data/stocks`);
    console.log(`🌐 Digital Assets data: http://${HOST}:${PORT}/api/market-data/digital-assets`);
    console.log(`📈 Paginated Stocks: http://${HOST}:${PORT}/api/stocks?page=1&limit=25`);
    console.log(`📊 Paginated ETFs: http://${HOST}:${PORT}/api/etfs?page=1&limit=25`);
    console.log(`🌐 Paginated Crypto: http://${HOST}:${PORT}/api/crypto?page=1&limit=25`);
    console.log(`🔍 Search: http://${HOST}:${PORT}/api/search?q=AAPL`);
    console.log(`🏷️  Categories: http://${HOST}:${PORT}/api/categories`);
    console.log(`🔍 Companies: http://${HOST}:${PORT}/api/companies`);
    console.log(`📊 Company Stats: http://${HOST}:${PORT}/api/companies/stats`);
    console.log(`🔍 Company Search: http://${HOST}:${PORT}/api/companies/search?q=AAPL`);
    console.log(`🏷️  Companies by Sector: http://${HOST}:${PORT}/api/companies/sector/Technology`);
    console.log(`🔧 Enhanced market data: http://${HOST}:${PORT}/api/market-data/enhanced/:symbol`);
    console.log(`📊 Cache stats: http://${HOST}:${PORT}/api/market-data/cache/stats`);
    console.log(`⚡ Rate limit status: http://${HOST}:${PORT}/api/rate-limits/status`);
    console.log(`🏥 API health: http://${HOST}:${PORT}/api/health/apis`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌐 Binding to: ${HOST}:${PORT}`);
    console.log('✨ Ready to serve paginated market data with intelligent rate limiting and caching!');
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
