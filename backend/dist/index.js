"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const marketDataService_1 = require("./marketDataService");
const app = (0, express_1.default)();
const PORT = parseInt(process.env['PORT'] || '3000', 10);
const HOST = process.env['HOST'] || '0.0.0.0';
const marketDataService = new marketDataService_1.MarketDataService();
const corsOptions = {
    origin: [
        'http://localhost:3000',
        'http://localhost:5173',
        'https://avilaprotocol-git-main-liam-mckeown-s-projects.vercel.app',
        'https://avilaprotocol-liam-mckeown-s-projects.vercel.app',
        process.env['FRONTEND_URL']
    ].filter((url) => Boolean(url)),
    credentials: true,
    optionsSuccessStatus: 200
};
app.use((0, cors_1.default)(corsOptions));
app.use(express_1.default.json());
app.get('/', (_req, res) => {
    res.json({
        status: "Backend running",
        service: 'Avila Protocol Market Data Server',
        timestamp: new Date().toISOString(),
        endpoints: {
            health: '/health',
            marketData: '/api/market-data',
            tradfi: '/api/market-data/tradfi',
            defi: '/api/market-data/defi'
        }
    });
});
app.get('/health', (_req, res) => {
    res.json({
        status: 'healthy',
        service: 'Avila Protocol Market Data Server',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env['NODE_ENV'] || 'development',
        version: process.env['npm_package_version'] || '1.0.0'
    });
});
app.get('/api/market-data', async (_req, res) => {
    try {
        const data = await marketDataService.getAllMarketData();
        res.json({
            success: true,
            data,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Error fetching all market data:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch market data',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
app.get('/api/market-data/tradfi', async (_req, res) => {
    try {
        const data = await marketDataService.getTradFiData();
        res.json({
            success: true,
            data,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Error fetching TradFi data:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch TradFi data',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
app.get('/api/market-data/defi', async (_req, res) => {
    try {
        const data = await marketDataService.getDeFiData();
        res.json({
            success: true,
            data,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Error fetching DeFi data:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch DeFi data',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
app.get('/api/market-data/cache/stats', (_req, res) => {
    try {
        const stats = marketDataService.getCacheStats();
        res.json({
            success: true,
            data: stats,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Error fetching cache stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch cache stats',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
app.post('/api/market-data/cache/clear', (_req, res) => {
    try {
        marketDataService.clearCache();
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
app.use((error, _req, res, _next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString()
    });
});
app.listen(PORT, HOST, () => {
    console.log('🚀 Avila Protocol Market Data Server Started!');
    console.log(`📍 Server running at: http://${HOST}:${PORT}`);
    console.log(`🔗 Health check: http://${HOST}:${PORT}/health`);
    console.log(`📊 Market data: http://${HOST}:${PORT}/api/market-data`);
    console.log(`🏛️ TradFi data: http://${HOST}:${PORT}/api/market-data/tradfi`);
    console.log(`🌐 DeFi data: http://${HOST}:${PORT}/api/market-data/defi`);
    console.log(`🌍 Environment: ${process.env['NODE_ENV'] || 'development'}`);
    console.log('✨ Ready to serve real-time market data!');
});
exports.default = app;
