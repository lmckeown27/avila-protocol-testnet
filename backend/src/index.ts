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
import { enhancedRateLimitMonitor } from './enhancedRateLimitMonitor';
import { companyDiscoveryService } from './companyDiscoveryService';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : (process.env.HOST || 'localhost');

// Middleware
app.use(cors({
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
      search: '/api/search',
      companies: '/api/companies',
      rateLimits: '/api/rate-limits/status',
      loading: '/api/loading/status',
      cache: '/api/cache/stats'
    },
    documentation: 'This is the Avila Markets Backend API for market data, company discovery, and progressive asset loading.',
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
// LEGACY MARKET DATA ENDPOINTS (for backward compatibility)
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

// ============================================================================
// NEW PAGINATED ENDPOINTS
// ============================================================================

// Get paginated stocks with search and filtering
app.get('/api/stocks', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 25;
    const sortBy = req.query.sortBy as string || 'symbol';
    const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'asc';
    const search = req.query.search as string;
    const category = req.query.category as string;

    console.log(`📈 Fetching stocks page ${page}, limit ${limit}, search: ${search || 'none'}, category: ${category || 'all'}`);
    
    const data = await paginatedMarketDataService.getStocks({
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
  } catch (error) {
    console.error('Error fetching paginated stocks:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stocks',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get paginated ETFs with search and filtering
app.get('/api/etfs', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 25;
    const sortBy = req.query.sortBy as string || 'symbol';
    const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'asc';
    const search = req.query.search as string;
    const category = req.query.category as string;

    console.log(`📊 Fetching ETFs page ${page}, limit ${limit}, search: ${search || 'none'}, category: ${category || 'all'}`);
    
    const data = await paginatedMarketDataService.getETFs({
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
  } catch (error) {
    console.error('Error fetching paginated ETFs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch ETFs',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get paginated crypto with search and filtering
app.get('/api/crypto', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 25;
    const sortBy = req.query.sortBy as string || 'marketCap';
    const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';
    const search = req.query.search as string;
    const category = req.query.category as string;

    console.log(`🌐 Fetching crypto page ${page}, limit ${limit}, search: ${search || 'none'}, category: ${category || 'all'}`);
    
    const data = await paginatedMarketDataService.getCrypto({
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
  } catch (error) {
    console.error('Error fetching paginated crypto:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch crypto',
      message: error instanceof Error ? error.message : 'Unknown error'
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
    const category = req.query.category as 'stock' | 'etf' | 'crypto';

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required',
        message: 'Please provide a search query using the "q" parameter'
      });
    }

    console.log(`🔍 Searching for "${query}" in category: ${category || 'all'}`);
    
    const results = await paginatedMarketDataService.searchAssets(query, category);
    
    return res.json({
      success: true,
      data: results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error searching assets:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to search assets',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ============================================================================
// CATEGORY ENDPOINTS
// ============================================================================

// Get available categories for each asset type (now dynamically generated)
app.get('/api/categories', async (_req: Request, res: Response) => {
  try {
    const discoveredCompanies = await companyDiscoveryService.getDiscoveredCompanies();
    
    // Generate categories dynamically from discovered companies
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
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch categories',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Helper function to group companies by sector
function groupCompaniesBySector(companies: any[]) {
  const grouped: Record<string, string[]> = {};
  
  companies.forEach(company => {
    const sector = company.sector || 'Other';
    if (!grouped[sector]) {
      grouped[sector] = [];
    }
    grouped[sector].push(company.symbol);
  });
  
  return grouped;
}

// ============================================================================
// ENHANCED DATA ENDPOINTS
// ============================================================================

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
    paginatedMarketDataService.clearCache();
    
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
// RATE LIMIT MONITORING ENDPOINTS
// ============================================================================

// Get rate limit status for all APIs
app.get('/api/rate-limits/status', (_req: Request, res: Response) => {
  try {
    const status = enhancedRateLimitMonitor.getAllAPILimitStatus();
    res.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting rate limit status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get rate limit status',
      message: error instanceof Error ? error.message : 'Unknown error'
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
// COMPANY DISCOVERY ENDPOINTS
// ============================================================================

// Get discovered companies
app.get('/api/companies', async (_req: Request, res: Response) => {
  try {
    console.log('🔍 Fetching discovered companies...');
    const companies = await companyDiscoveryService.getDiscoveredCompanies();
    
    res.json({
      success: true,
      data: companies,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching discovered companies:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch discovered companies',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get company discovery statistics
app.get('/api/companies/stats', async (_req: Request, res: Response) => {
  try {
    console.log('📊 Fetching company discovery statistics...');
    const stats = companyDiscoveryService.getDiscoveryStats();
    
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching company discovery stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch company discovery stats',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Search discovered companies
app.get('/api/companies/search', async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;
    const category = req.query.category as 'stock' | 'etf' | 'crypto';

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required',
        message: 'Please provide a search query using the "q" parameter'
      });
    }

    console.log(`🔍 Searching companies for "${query}" in category: ${category || 'all'}`);
    
    const results = await companyDiscoveryService.searchCompanies(query, category);
    
    return res.json({
      success: true,
      data: results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error searching companies:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to search companies',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get companies by sector
app.get('/api/companies/sector/:sector', async (req: Request, res: Response) => {
  try {
    const { sector } = req.params;
    const category = req.query.category as 'stock' | 'etf' | 'crypto';

    console.log(`🏷️  Fetching companies in sector "${sector}" for category: ${category || 'all'}`);
    
    const results = await companyDiscoveryService.getCompaniesBySector(sector, category);
    
    res.json({
      success: true,
      data: results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`Error fetching companies in sector ${req.params.sector}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch companies by sector',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Force refresh of company discovery
app.post('/api/companies/refresh', async (_req: Request, res: Response) => {
  try {
    console.log('🔄 Forcing company discovery refresh...');
    const companies = await companyDiscoveryService.refreshCompanies();
    
    res.json({
      success: true,
      data: companies,
      message: 'Company discovery refreshed successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error refreshing company discovery:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh company discovery',
      message: error instanceof Error ? error.message : 'Unknown error'
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
    console.error('Error getting loading status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get loading status',
      message: error instanceof Error ? error.message : 'Unknown error'
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
    console.error('Error getting cache statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get cache statistics',
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
  console.log(`📈 Loading status: http://${HOST}:${PORT}/api/loading/status`);
  console.log(`💾 Cache statistics: http://${HOST}:${PORT}/api/cache/stats`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Binding to: ${HOST}:${PORT}`);
  console.log('✨ Ready to serve paginated market data with enhanced caching and simplified loading!');
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