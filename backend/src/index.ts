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

import express, { Request, Response } from 'express';
import cors from 'cors';
import { enhancedMarketDataService } from './enhancedMarketDataService';
import { rateLimitManager } from './rateLimitManager';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || 'localhost';

// Middleware
app.use(cors());
app.use(express.json());

// ============================================================================
// HEALTH & STATUS ENDPOINTS
// ============================================================================

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Environment check endpoint
app.get('/env-check', (_req: Request, res: Response) => {
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

// ============================================================================
// MARKET DATA ENDPOINTS
// ============================================================================

// Get all market data
app.get('/api/market-data', async (_req: Request, res: Response) => {
  try {
    console.log('📊 Fetching all market data...');
    const data = await enhancedMarketDataService.getAllMarketData();
    
    res.json({
      success: true,
      data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching market data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch market data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get Stock Market data only
app.get('/api/market-data/stocks', async (_req: Request, res: Response) => {
  try {
    console.log('📈 Fetching Stock Market data...');
    const data = await enhancedMarketDataService.getStockData();
    
    res.json({
      success: true,
      data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching Stock Market data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Stock Market data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get Digital Assets market data only
app.get('/api/market-data/digital-assets', async (_req: Request, res: Response) => {
  try {
    console.log('🌐 Fetching Digital Assets data...');
    const data = await enhancedMarketDataService.getDigitalAssetsData();
    
    res.json({
      success: true,
      data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching Digital Assets data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Digital Assets data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Enhanced market data for specific symbol
app.get('/api/market-data/enhanced/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    console.log(`🔍 Fetching enhanced data for ${symbol}`);
    
    let marketData;
    if (['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX', 'SPY', 'QQQ', 'IWM', 'VTI', 'VEA', 'VWO', 'BND', 'GLD', '^GSPC', '^DJI', '^IXIC', '^RUT', 'JNJ', 'PG', 'KO', 'PFE', 'VZ', 'T', 'XOM', 'CVX', 'JPM', 'BAC', 'WFC'].includes(symbol.toUpperCase())) {
      // Stock Market asset - use Stock Market method
      marketData = await enhancedMarketDataService.getEnhancedStockData(symbol.toUpperCase());
    } else {
      // Digital Asset - use Digital Asset method
      marketData = { message: 'Enhanced data not available for this asset type' };
    }
    
    res.json({
      success: true,
      data: marketData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`Error fetching enhanced data for ${req.params.symbol}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch enhanced data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ============================================================================
// CACHE MANAGEMENT ENDPOINTS
// ============================================================================

// Get cache statistics
app.get('/api/market-data/cache/stats', (_req: Request, res: Response) => {
  try {
    const cacheStats = enhancedMarketDataService.getCacheStats();
    const rateLimitStatus = enhancedMarketDataService.getRateLimitStatus();
    
    res.json({
      success: true,
      data: {
        cache: cacheStats,
        rateLimits: rateLimitStatus,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching cache stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cache statistics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Clear cache
app.post('/api/market-data/cache/clear', (_req: Request, res: Response) => {
  try {
    enhancedMarketDataService.clearCache();
    
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

// ============================================================================
// RATE LIMIT STATUS ENDPOINTS
// ============================================================================

// Get rate limit status for all APIs
app.get('/api/rate-limits/status', (_req: Request, res: Response) => {
  try {
    const status = enhancedMarketDataService.getRateLimitStatus();
    
    res.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching rate limit status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch rate limit status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ============================================================================
// ERROR HANDLING MIDDLEWARE
// ============================================================================

// 404 handler
app.use('*', (_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    message: 'The requested endpoint does not exist'
  });
});

// Global error handler
app.use((error: any, _req: Request, res: Response, _next: any) => {
  console.error('Global error handler:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: error.message || 'An unexpected error occurred'
  });
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

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

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  rateLimitManager.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  rateLimitManager.stop();
  process.exit(0);
});