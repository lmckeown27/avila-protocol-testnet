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
const axios_1 = __importDefault(require("axios"));
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
app.get('/api/health', (_req, res) => {
    res.json({
        status: 'ok',
        timestamp: Date.now(),
        service: 'Avila Protocol Market Data Server',
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
        if (['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSFT', 'META', 'NVDA', 'NFLX', 'SPY', 'QQQ', 'IWM', 'VTI', 'VEA', 'VWO', 'BND', 'GLD', '^GSPC', '^DJI', '^IXIC', '^RUT'].includes(symbol.toUpperCase())) {
            marketData = await marketDataService.getTradFiMarketData(symbol.toUpperCase());
        }
        else {
            marketData = await marketDataService.getDeFiMarketData(symbol.toUpperCase());
        }
        return res.json({
            success: true,
            data: {
                symbol: symbol.toUpperCase(),
                marketCap: marketData.marketCap,
                volume: marketData.volume,
                ...(marketData.tvl !== undefined && { tvl: marketData.tvl }),
                timestamp: new Date().toISOString()
            }
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
app.get('/api/market-data/defi-protocols', async (_req, res) => {
    try {
        console.log('🔍 DeFi protocol data request');
        const response = await axios_1.default.get('https://api.llama.fi/protocols', {
            timeout: 10000
        });
        if (response.data && Array.isArray(response.data)) {
            const topProtocols = response.data
                .filter((p) => p.tvl && p.tvl > 0)
                .sort((a, b) => (b.tvl || 0) - (a.tvl || 0))
                .slice(0, 20)
                .map((protocol) => ({
                name: protocol.name,
                symbol: protocol.symbol,
                tvl: protocol.tvl,
                change1h: protocol.change_1h,
                change1d: protocol.change_1d,
                change7d: protocol.change_7d,
                chains: protocol.chains,
                category: protocol.category
            }));
            return res.json({
                success: true,
                data: topProtocols,
                timestamp: new Date().toISOString()
            });
        }
        return res.status(404).json({
            success: false,
            error: 'No DeFi protocol data available'
        });
    }
    catch (error) {
        console.error('DeFi protocol data error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch DeFi protocol data',
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
    console.log(`🔍 Environment check: http://${HOST}:${PORT}/env-check`);
    console.log(`📊 Market data: http://${HOST}:${PORT}/api/market-data`);
    console.log(`🏛️ TradFi data: http://${HOST}:${PORT}/api/market-data/tradfi`);
    console.log(`🌐 DeFi data: http://${HOST}:${PORT}/api/market-data/defi`);
    console.log(`🔧 Enhanced market data: http://${HOST}:${PORT}/api/market-data/enhanced/:symbol`);
    console.log(`🌐 DeFi protocols: http://${HOST}:${PORT}/api/market-data/defi-protocols`);
    console.log(`🌍 Environment: ${process.env['NODE_ENV'] || 'development'}`);
    console.log('✨ Ready to serve real-time market data with enhanced caching!');
});
exports.default = app;
