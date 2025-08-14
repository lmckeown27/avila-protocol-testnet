// ============================================================================
// AVILA PROTOCOL - MARKET DATA SERVER
// ============================================================================
// Main entry point for the market data service

// Load environment variables from .env file
import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { MarketDataService } from './marketDataService';

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
  console.log(`📊 Market data: http://${HOST}:${PORT}/api/market-data`);
  console.log(`🏛️ TradFi data: http://${HOST}:${PORT}/api/market-data/tradfi`);
  console.log(`🌐 DeFi data: http://${HOST}:${PORT}/api/market-data/defi`);
  console.log(`🌍 Environment: ${process.env['NODE_ENV'] || 'development'}`);
  console.log('✨ Ready to serve real-time market data!');
});

export default app; 