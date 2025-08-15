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
const rateLimitManager_1 = require("./rateLimitManager");
const app = (0, express_1.default)();
const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || 'localhost';
app.use((0, cors_1.default)());
app.use(express_1.default.json());
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
        const status = enhancedMarketDataService_1.enhancedMarketDataService.getRateLimitStatus();
        res.json({
            success: true,
            data: status,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Error fetching rate limit status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch rate limit status',
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
    console.log('🚀 Enhanced Market Data Service Started');
    console.log(`📍 Server: http://${HOST}:${PORT}`);
    console.log(`🔍 Health check: http://${HOST}:${PORT}/api/health`);
    console.log(`📊 Market data: http://${HOST}:${PORT}/api/market-data`);
    console.log(`📈 Stock Market data: http://${HOST}:${PORT}/api/market-data/stocks`);
    console.log(`🌐 Digital Assets data: http://${HOST}:${PORT}/api/market-data/digital-assets`);
    console.log(`🔧 Enhanced market data: http://${HOST}:${PORT}/api/market-data/enhanced/:symbol`);
    console.log(`📊 Cache stats: http://${HOST}:${PORT}/api/market-data/cache/stats`);
    console.log(`⚡ Rate limit status: http://${HOST}:${PORT}/api/rate-limits/status`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('✨ Ready to serve market data with intelligent rate limiting and caching!');
});
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received, shutting down gracefully...');
    rateLimitManager_1.rateLimitManager.stop();
    process.exit(0);
});
process.on('SIGINT', () => {
    console.log('🛑 SIGINT received, shutting down gracefully...');
    rateLimitManager_1.rateLimitManager.stop();
    process.exit(0);
});
