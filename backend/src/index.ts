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
import { paginatedMarketDataService } from './paginatedMarketDataService';
import { enhancedRateLimitMonitor, PaginationOptions, PaginatedResponse, APIHealthStatus } from './enhancedRateLimitMonitor';
import { companyDiscoveryService, CompanyInfo } from './companyDiscoveryService';
import { hybridCacheService, HybridAssetData } from './hybridCacheService';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : (process.env.HOST || 'localhost');

// Middleware
app.use(cors({
  origin: [
    'https://avilaprotocol-liam-mckeown-s-projects.vercel.app',
    'https://avila-protocol-testnet.vercel.app',
    'https://avila-protocol-testnet-git-main-lmckeown27.vercel.app',
    'https://avila-protocol-testnet-lmckeown27.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:8080'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept'],
  optionsSuccessStatus: 200
}));
app.use(express.json());

// ============================================================================
// DEBUGGING MIDDLEWARE - Log all incoming requests
// ============================================================================
app.use((req: Request, res: Response, next: any) => {
  console.log(`[DEBUG] Incoming request: ${req.method} ${req.originalUrl}`);
  next();
});

// ============================================================================
// ROOT ENDPOINT - Landing page for Render
// ============================================================================

// Root endpoint for Render and general access
app.get('/', (_req: Request, res: Response) => {
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

// Get total market overview
app.get('/api/market-data/total', async (_req: Request, res: Response) => {
  try {
    const totalMarketData = await enhancedMarketDataService.getAllMarketData();
    res.json({
      success: true,
      data: totalMarketData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Total market data fetch failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch total market data',
      timestamp: new Date().toISOString()
    });
  }
});

// Get stock market overview (renamed from tradfi)
app.get('/api/market-data/stock-market', async (_req: Request, res: Response) => {
  try {
    const stockMarketData = await enhancedMarketDataService.getStockData();
    res.json({
      success: true,
      data: stockMarketData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Stock market data fetch failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stock market data',
      timestamp: new Date().toISOString()
    });
  }
});

// Get ETF market overview
app.get('/api/market-data/etf-market', async (_req: Request, res: Response) => {
  try {
    // For now, use stock data as ETF data since ETFs are stocks
    const etfMarketData = await enhancedMarketDataService.getStockData();
    res.json({
      success: true,
      data: etfMarketData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ ETF market data fetch failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch ETF market data',
      timestamp: new Date().toISOString()
    });
  }
});

// Get digital assets overview (renamed from defi)
app.get('/api/market-data/digital-assets', async (_req: Request, res: Response) => {
  try {
    const digitalAssetsData = await enhancedMarketDataService.getDigitalAssetsData();
    res.json({
      success: true,
      data: digitalAssetsData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Digital assets data fetch failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch digital assets data',
      timestamp: new Date().toISOString()
    });
  }
});

// Get DeFi protocols overview
app.get('/api/market-data/defi-protocols', async (_req: Request, res: Response) => {
  try {
    // For now, use digital assets data as DeFi protocols data
    const defiProtocolsData = await enhancedMarketDataService.getDigitalAssetsData();
    res.json({
      success: true,
      data: defiProtocolsData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ DeFi protocols data fetch failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch DeFi protocols data',
      timestamp: new Date().toISOString()
    });
  }
});

// ============================================================================
// ASSET DATA ENDPOINTS
// ============================================================================

// Get stocks with pagination
app.get('/api/stocks', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 25;
    const search = req.query.search as string;
    
    const options: PaginationOptions = { page, limit };
    if (search) options.search = search;
    
    const stocksData = await paginatedMarketDataService.getStocks(options);
    res.json({
      success: true,
      data: stocksData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Stocks data fetch failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stocks data',
      timestamp: new Date().toISOString()
    });
  }
});

// Get ETFs with pagination
app.get('/api/etfs', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 25;
    const search = req.query.search as string;
    
    const options: PaginationOptions = { page, limit };
    if (search) options.search = search;
    
    const etfsData = await paginatedMarketDataService.getETFs(options);
    res.json({
      success: true,
      data: etfsData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ ETFs data fetch failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch ETFs data',
      timestamp: new Date().toISOString()
    });
  }
});

// Get crypto with pagination
app.get('/api/crypto', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 25;
    const search = req.query.search as string;
    
    const options: PaginationOptions = { page, limit };
    if (search) options.search = search;
    
    const cryptoData = await paginatedMarketDataService.getCrypto(options);
    res.json({
      success: true,
      data: cryptoData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Crypto data fetch failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch crypto data',
      timestamp: new Date().toISOString()
    });
  }
});

// Get digital assets (crypto + DeFi tokens)
app.get('/api/digital-assets', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 25;
    const search = req.query.search as string;
    
    const options: PaginationOptions = { page, limit };
    if (search) options.search = search;
    
    // Use crypto endpoint for digital assets
    const digitalAssetsData = await paginatedMarketDataService.getCrypto(options);
    res.json({
      success: true,
      data: digitalAssetsData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Digital assets data fetch failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch digital assets data',
      timestamp: new Date().toISOString()
    });
  }
});

// Get DeFi protocols
app.get('/api/defi-protocols', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 25;
    const search = req.query.search as string;
    
    const options: PaginationOptions = { page, limit };
    if (search) options.search = search;
    
    // Use crypto endpoint for DeFi protocols
    const defiProtocolsData = await paginatedMarketDataService.getCrypto(options);
    res.json({
      success: true,
      data: defiProtocolsData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ DeFi protocols data fetch failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch DeFi protocols data',
      timestamp: new Date().toISOString()
    });
  }
});

// ============================================================================
// COMPANY DISCOVERY ENDPOINTS
// ============================================================================

// Get all discovered companies
app.get('/api/companies', async (_req: Request, res: Response) => {
  try {
    const companies = await companyDiscoveryService.getDiscoveredCompanies();
    res.json({
      success: true,
      data: companies,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Companies fetch failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch companies',
      timestamp: new Date().toISOString()
    });
  }
});

// Get company discovery statistics
app.get('/api/companies/stats', async (_req: Request, res: Response) => {
  try {
    const stats = companyDiscoveryService.getDiscoveryStats();
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Company stats fetch failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch company stats',
      timestamp: new Date().toISOString()
    });
  }
});

// Search companies
app.get('/api/companies/search', async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;
    const categoryParam = req.query.category;
    let category: 'stock' | 'etf' | 'crypto' | undefined = undefined;
    
    if (categoryParam && typeof categoryParam === 'string') {
      if (['stock', 'etf', 'crypto'].includes(categoryParam)) {
        category = categoryParam as 'stock' | 'etf' | 'crypto';
      }
    }
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required',
        timestamp: new Date().toISOString()
      });
    }
    
    const results = await companyDiscoveryService.searchCompanies(query, category);
    return res.json({
      success: true,
      data: results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Company search failed:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to search companies',
      timestamp: new Date().toISOString()
    });
  }
});

// Get companies by sector
app.get('/api/companies/sector/:sector', async (req: Request, res: Response) => {
  try {
    const sector = req.params.sector;
    const category = req.query.category as 'stock' | 'etf' | 'crypto';
    
    const results = await companyDiscoveryService.getCompaniesBySector(sector, category);
    res.json({
      success: true,
      data: results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Companies by sector fetch failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch companies by sector',
      timestamp: new Date().toISOString()
    });
  }
});

// Force refresh of discovered companies
app.post('/api/companies/refresh', async (_req: Request, res: Response) => {
  try {
    const companies = await companyDiscoveryService.refreshCompanies();
    res.json({
      success: true,
      data: companies,
      message: 'Company discovery refreshed successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Company refresh failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh companies',
      timestamp: new Date().toISOString()
    });
  }
});

// Get loading status
app.get('/api/loading/status', async (_req: Request, res: Response) => {
  try {
    const status = companyDiscoveryService.getLoadingStatus();
    res.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Loading status fetch failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch loading status',
      timestamp: new Date().toISOString()
    });
  }
});

// Get cache statistics
app.get('/api/cache/stats', async (_req: Request, res: Response) => {
  try {
    const stats = companyDiscoveryService.getCacheStats();
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Cache stats fetch failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cache stats',
      timestamp: new Date().toISOString()
    });
  }
});

// ============================================================================
// HYBRID CACHE ENDPOINTS
// ============================================================================

// Get hybrid cache statistics
app.get('/api/hybrid/stats', async (_req: Request, res: Response) => {
  try {
    const stats = hybridCacheService.getCacheStats();
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Hybrid cache stats fetch failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch hybrid cache stats',
      timestamp: new Date().toISOString()
    });
  }
});

// Get top assets by category
app.get('/api/hybrid/top/:category', async (req: Request, res: Response) => {
  try {
    const category = req.params.category as 'stocks' | 'etfs' | 'crypto';
    const limit = parseInt(req.query.limit as string) || 50;
    
    const assets = hybridCacheService.getTopAssets(category, limit);
    res.json({
      success: true,
      data: assets,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Top assets fetch failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch top assets',
      timestamp: new Date().toISOString()
    });
  }
});

// Get specific asset from hybrid cache
app.get('/api/hybrid/:symbol', async (req: Request, res: Response) => {
  try {
    const symbol = req.params.symbol;
    const category = req.query.category as 'stock' | 'etf' | 'crypto';
    
    if (!category) {
      return res.status(400).json({
        success: false,
        error: 'Category parameter is required',
        timestamp: new Date().toISOString()
      });
    }
    
    const assetData = hybridCacheService.getHybridAssetData(symbol, category);
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
  } catch (error) {
    console.error('❌ Hybrid asset data fetch failed:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch hybrid asset data',
      timestamp: new Date().toISOString()
    });
  }
});

// Clear hybrid cache
app.post('/api/hybrid/clear', async (_req: Request, res: Response) => {
  try {
    hybridCacheService.clearCache();
    res.json({
      success: true,
      message: 'Hybrid cache cleared successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Hybrid cache clear failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear hybrid cache',
      timestamp: new Date().toISOString()
    });
  }
});

// ============================================================================
// SEARCH ENDPOINTS
// ============================================================================

// Search across all asset types
app.get('/api/search', async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;
    const categoryParam = req.query.category;
    let category: 'stock' | 'etf' | 'crypto' | undefined = undefined;
    
    if (categoryParam && typeof categoryParam === 'string') {
      if (['stock', 'etf', 'crypto'].includes(categoryParam)) {
        category = categoryParam as 'stock' | 'etf' | 'crypto';
      }
    }
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required',
        timestamp: new Date().toISOString()
      });
    }
    
    const searchResults = await paginatedMarketDataService.searchAssets(query, category);
    return res.json({
      success: true,
      data: searchResults,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Asset search failed:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to search assets',
      timestamp: new Date().toISOString()
    });
  }
});

// ============================================================================
// RATE LIMIT & SYSTEM STATUS ENDPOINTS
// ============================================================================

// Get rate limit status for all APIs
app.get('/api/rate-limits/status', async (_req: Request, res: Response) => {
  try {
    const rateLimitStatus = enhancedRateLimitMonitor.getRateLimitStatus();
    res.json({
      success: true,
      data: rateLimitStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Rate limit status fetch failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch rate limit status',
      timestamp: new Date().toISOString()
    });
  }
});

// Get detailed rate limit metrics for a specific API
app.get('/api/rate-limits/metrics/:apiName', (req: Request, res: Response) => {
  try {
    const apiName = req.params.apiName;
    const status = enhancedRateLimitMonitor.getLimitStatus(apiName);
    
    res.json({
      success: true,
      data: {
        apiName,
        ...status
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`Error getting rate limit metrics for ${req.params.apiName}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to get rate limit metrics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get optimal timing information for maintaining constant updates
app.get('/api/rate-limits/timing', (_req: Request, res: Response) => {
  try {
    const timing = enhancedRateLimitMonitor.getAllAPIOptimalTiming();
    res.json({
      success: true,
      data: timing,
      timestamp: new Date().toISOString(),
      message: 'Optimal timing for maintaining constant updates while respecting rate limits'
    });
  } catch (error) {
    console.error('Error getting optimal timing information:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get optimal timing information',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get API rotation status and coordination information
app.get('/api/rate-limits/rotation', (_req: Request, res: Response) => {
  try {
    const rotationStatus = {
      stocks: enhancedRateLimitMonitor.getAvailableAPIsForType('stocks'),
      etfs: enhancedRateLimitMonitor.getAvailableAPIsForType('etfs'),
      crypto: enhancedRateLimitMonitor.getAvailableAPIsForType('crypto'),
      timestamp: new Date().toISOString(),
      message: 'API rotation status showing how APIs work in tandem for constant updates'
    };
    
    res.json({
      success: true,
      data: rotationStatus
    });
  } catch (error) {
    console.error('Error getting API rotation status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get API rotation status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get detailed API health status
app.get('/api/health/apis', (_req: Request, res: Response) => {
  try {
    const healthStatus = enhancedRateLimitMonitor.getHealthStatus();
    
    res.json({
      success: true,
      data: healthStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching API health status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch API health status',
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

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  enhancedRateLimitMonitor.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  enhancedRateLimitMonitor.stop();
  process.exit(0);
});