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
            envCheck: '/env-check',
            marketData: '/api/market-data',
            stocks: '/api/market-data/stocks',
            digitalAssets: '/api/market-data/digital-assets'
        }
    });
});
app.get('/health', (_req, res) => {
    res.json({
        status: 'healthy',
        service: 'Avila Markets Server',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env['NODE_ENV'] || 'development',
        version: process.env['npm_package_version'] || '1.0.0'
    });
});
app.get('/api/health', (_req, res) => {
    res.json({
        status: 'ok',
        timestamp: Date.now(),
        service: 'Avila Markets Server',
        environment: process.env['NODE_ENV'] || 'development'
    });
});
app.get('/env-check', (req, res) => {
    const status = {};
    requiredVars.forEach(key => {
        status[key] = !!process.env[key];
    });
    res.json({ status: "ok", variables: status });
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
app.get('/api/market-data/stocks', async (_req, res) => {
    try {
        const data = await marketDataService.getStockData();
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
        const data = await marketDataService.getDeFiData();
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
app.get('/api/market-data/enhanced/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        if (!symbol) {
            return res.status(400).json({
                success: false,
                error: 'Symbol parameter is required'
            });
        }
        let marketData;
        if (['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSFT', 'META', 'NVDA', 'NFLX', 'SPY', 'QQQ', 'IWM', 'VTI', 'VEA', 'VWO', 'BND', 'GLD', '^GSPC', '^DJI', '^IXIC', '^RUT', 'JNJ', 'PG', 'KO', 'PFE', 'VZ', 'T', 'XOM', 'CVX', 'JPM', 'BAC', 'WFC'].includes(symbol.toUpperCase())) {
            marketData = await marketDataService.getStockMarketData(symbol.toUpperCase());
        }
        else {
            marketData = await marketDataService.getDeFiMarketData(symbol.toUpperCase());
        }
        const responseData = {
            symbol: symbol.toUpperCase(),
            marketCap: marketData.marketCap,
            volume: marketData.volume,
            timestamp: new Date().toISOString()
        };
        if (marketData.tvl !== undefined) {
            responseData.tvl = marketData.tvl;
        }
        if (marketData.pe !== undefined) {
            responseData.pe = marketData.pe;
        }
        return res.json({
            success: true,
            data: responseData
        });
    }
    catch (error) {
        console.error(`Error fetching enhanced market data for ${req.params.symbol}:`, error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch enhanced market data',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
app.post('/api/market-data/cache/enhanced/clear', (_req, res) => {
    try {
        marketDataService.clearMarketDataCache();
        res.json({
            success: true,
            message: 'Enhanced market data cache cleared successfully',
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Error clearing enhanced market data cache:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to clear enhanced market data cache',
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
    console.log('🚀 Avila Markets Server Started!');
    console.log(`📍 Server running at: http://${HOST}:${PORT}`);
    console.log(`🔗 Health check: http://${HOST}:${PORT}/health`);
    console.log(`🔍 Environment check: http://${HOST}:${PORT}/env-check`);
    console.log(`📊 Market data: http://${HOST}:${PORT}/api/market-data`);
    console.log(`📈 Stock Market data: http://${HOST}:${PORT}/api/market-data/stocks`);
    console.log(`🌐 Digital Assets data: http://${HOST}:${PORT}/api/market-data/digital-assets`);
    console.log(`🔧 Enhanced market data: http://${HOST}:${PORT}/api/market-data/enhanced/:symbol`);
    console.log(`🌍 Environment: ${process.env['NODE_ENV'] || 'development'}`);
    console.log('✨ Ready to serve real-time market monitoring data with enhanced caching!');
});
exports.default = app;
