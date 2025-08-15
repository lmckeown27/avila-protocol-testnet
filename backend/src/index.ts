// ============================================================================
// AVILA PROTOCOL - MARKET DATA SERVER
// ============================================================================
// Main entry point for the market data service

// Load environment variables from .env file with explicit path fallback
import path from "path";
import dotenv from "dotenv";

const envPath = path.resolve(process.cwd(), ".env");
dotenv.config({ path: envPath });

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

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { MarketDataService } from './marketDataService';
import axios from 'axios';

// ============================================================================
// SERVER CONFIGURATION
// ============================================================================

const app = express();
const PORT = parseInt(process.env['PORT'] || '3000', 10);
const HOST = process.env['HOST'] || '0.0.0.0';

// Initialize market data service
const marketDataService = new MarketDataService();

// ============================================================================
// MIDDLEWARE
// ============================================================================

// CORS configuration for production
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://avilaprotocol-git-main-liam-mckeown-s-projects.vercel.app',
    'https://avilaprotocol-liam-mckeown-s-projects.vercel.app',
    // Add your Vercel domain here
    process.env['FRONTEND_URL']
  ].filter((url): url is string => Boolean(url)),
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());

// ============================================================================
// ROOT HEALTH CHECK
// ============================================================================

app.get('/', (_req: Request, res: Response) => {
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

// ============================================================================
// HEALTH CHECK
// ============================================================================

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'Avila Protocol Market Data Server',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env['NODE_ENV'] || 'development',
    version: process.env['npm_package_version'] || '1.0.0'
  });
});

// API health endpoint for frontend testing
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    service: 'Avila Protocol Market Data Server',
    environment: process.env['NODE_ENV'] || 'development'
  });
});

// Environment variables status check (does not expose actual values)
app.get('/env-check', (req: Request, res: Response) => {
  const status: Record<string, boolean> = {};
  requiredVars.forEach(key => {
    status[key] = !!process.env[key]; // true if present, false if missing
  });
  res.json({ status: "ok", variables: status });
});

// ============================================================================
// MARKET DATA ENDPOINTS
// ============================================================================

// Get all market data (TradFi + DeFi + Crypto)
app.get('/api/market-data', async (_req: Request, res: Response) => {
  try {
    const data = await marketDataService.getAllMarketData();
    res.json({
      success: true,
      data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching all market data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch market data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get TradFi market data only
app.get('/api/market-data/tradfi', async (_req: Request, res: Response) => {
  try {
    const data = await marketDataService.getTradFiData();
    res.json({
      success: true,
      data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching TradFi data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch TradFi data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get DeFi market data only
app.get('/api/market-data/defi', async (_req: Request, res: Response) => {
  try {
    const data = await marketDataService.getDeFiData();
    res.json({
      success: true,
      data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching DeFi data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch DeFi data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get cache statistics
app.get('/api/market-data/cache/stats', (_req: Request, res: Response) => {
  try {
    const stats = marketDataService.getCacheStats();
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching cache stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cache stats',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Clear cache
app.post('/api/market-data/cache/clear', (_req: Request, res: Response) => {
  try {
    marketDataService.clearCache();
    res.json({
      success: true,
      message: 'Cache cleared successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Enhanced market data test endpoint
app.get('/api/market-data/enhanced/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    if (!symbol) {
      return res.status(400).json({
        success: false,
        error: 'Symbol parameter is required'
      });
    }

    // Determine if this is a TradFi or DeFi asset and use appropriate method
    let marketData;
    if (['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSFT', 'META', 'NVDA', 'NFLX', 'SPY', 'QQQ', 'IWM', 'VTI', 'VEA', 'VWO', 'BND', 'GLD', '^GSPC', '^DJI', '^IXIC', '^RUT', 'JNJ', 'PG', 'KO', 'PFE', 'VZ', 'T', 'XOM', 'CVX', 'JPM', 'BAC', 'WFC'].includes(symbol.toUpperCase())) {
      // TradFi asset - use TradFi method
      marketData = await (marketDataService as any).getTradFiMarketData(symbol.toUpperCase());
    } else {
      // DeFi asset - use DeFi method
      marketData = await (marketDataService as any).getDeFiMarketData(symbol.toUpperCase());
    }
    
    // Build response data based on asset type
    const responseData: any = {
      symbol: symbol.toUpperCase(),
      marketCap: marketData.marketCap,
      volume: marketData.volume,
      timestamp: new Date().toISOString()
    };

    // Add DeFi-specific fields
    if (marketData.tvl !== undefined) {
      responseData.tvl = marketData.tvl;
    }

    // Add TradFi-specific fields
    if (marketData.pe !== undefined) {
      responseData.pe = marketData.pe;
    }
    if (marketData.dividend !== undefined) {
      responseData.dividend = marketData.dividend;
    }

    return res.json({
      success: true,
      data: responseData
    });
  } catch (error) {
    console.error(`Error fetching enhanced market data for ${req.params.symbol}:`, error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch enhanced market data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Clear enhanced market data cache
app.post('/api/market-data/cache/enhanced/clear', (_req: Request, res: Response) => {
  try {
    (marketDataService as any).clearMarketDataCache();
    res.json({
      success: true,
      message: 'Enhanced market data cache cleared successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error clearing enhanced market data cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear enhanced market data cache',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// DeFi protocol data endpoint (TVL, protocol metrics)
app.get('/api/market-data/defi-protocols', async (_req: Request, res: Response) => {
  try {
    console.log('🔍 DeFi protocol data request');
    
    const response = await axios.get('https://api.llama.fi/protocols', {
      timeout: 10000
    });
    
    if (response.data && Array.isArray(response.data)) {
      // Get top 20 protocols by TVL
      const topProtocols = response.data
        .filter((p: any) => p.tvl && p.tvl > 0)
        .sort((a: any, b: any) => (b.tvl || 0) - (a.tvl || 0))
        .slice(0, 20)
        .map((protocol: any) => ({
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
  } catch (error) {
    console.error('DeFi protocol data error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch DeFi protocol data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

// Global error handler
app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: error.message,
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

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

export default app;