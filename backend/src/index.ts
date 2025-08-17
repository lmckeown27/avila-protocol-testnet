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
// HEALTH CHECK ENDPOINTS
// ============================================================================

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    services: {
      server: 'running',
      cache: 'initializing',
      marketData: 'initializing'
    }
  });
});

app.get('/api/health/ready', (req, res) => {
  // This endpoint checks if the service is ready to handle requests
  const isReady = process.uptime() > 60; // Ready after 1 minute
  
  if (isReady) {
    res.json({
      status: 'ready',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      message: 'Service is ready to handle requests'
    });
  } else {
    res.status(503).json({
      status: 'starting',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      message: 'Service is still starting up',
      estimatedReadyIn: Math.max(0, 60 - process.uptime())
    });
  }
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
app.get('/api/market-data/stock-market', async (req: Request, res: Response) => {
  try {
    console.log('📈 Fetching stock market data...');
    
    // Use the working paginated endpoint instead of the broken enhanced endpoint
    const stockData = await paginatedMarketDataService.getStocks({ page: 1, limit: 50 });
    
    if (stockData && stockData.data) {
      // Transform the data to match the expected format
      const transformedData = stockData.data.map((stock: any) => ({
        asset: stock.symbol,
        symbol: stock.symbol,
        price: stock.price,
        change24h: stock.change24h,
        volume24h: stock.volume24h || 0,
        marketCap: stock.marketCap || 0,
        source: stock.source || 'Multiple APIs',
        lastUpdated: stock.lastUpdated || Date.now(),
        high24h: stock.high24h,
        low24h: stock.low24h,
        open24h: stock.open24h
      }));
      
      return res.json({
        success: true,
        data: transformedData,
        timestamp: new Date().toISOString()
      });
    } else {
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch stock market data'
      });
    }
  } catch (error) {
    console.error('❌ Stock market data fetch error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// ETF Market Data
app.get('/api/market-data/etf-market', async (req: Request, res: Response) => {
  try {
    console.log('📊 Fetching ETF market data...');
    
    // Use the working paginated endpoint instead of the broken enhanced endpoint
    const etfData = await paginatedMarketDataService.getETFs({ page: 1, limit: 50 });
    
    if (etfData && etfData.data) {
      // Transform the data to match the expected format
      const transformedData = etfData.data.map((etf: any) => ({
        asset: etf.symbol,
        symbol: etf.symbol,
        price: etf.price,
        change24h: etf.change24h,
        volume24h: etf.volume24h || 0,
        marketCap: etf.marketCap || 0,
        source: etf.source || 'Multiple APIs',
        lastUpdated: etf.lastUpdated || Date.now(),
        high24h: etf.high24h,
        low24h: etf.low24h,
        open24h: etf.open24h
      }));
      
      return res.json({
        success: true,
        data: transformedData,
        timestamp: new Date().toISOString()
      });
    } else {
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch ETF market data'
      });
    }
  } catch (error) {
    console.error('❌ ETF market data fetch error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// ETF Scraper Service Endpoint
app.get('/api/etf-scraper/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    console.log(`🔍 ETF scraper request for symbol: ${symbol}`);
    
    // Import and use ETF scraper service
    const { etfScraperService } = await import('./etfScraperService');
    const etfData = await etfScraperService.getETFData(symbol);
    
    return res.json({
      success: true,
      data: etfData,
      timestamp: new Date().toISOString(),
      source: 'ETF Scraper Service'
    });
    
  } catch (error) {
    console.error(`❌ ETF scraper error for ${req.params.symbol}:`, error);
    return res.status(500).json({
      success: false,
      error: 'ETF data temporarily unavailable',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ETF Scraper Batch Endpoint
app.post('/api/etf-scraper/batch', async (req: Request, res: Response) => {
  try {
    const { symbols } = req.body;
    
    if (!symbols || !Array.isArray(symbols)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request: symbols array required'
      });
    }
    
    console.log(`🔍 ETF scraper batch request for ${symbols.length} symbols: ${symbols.join(', ')}`);
    
    // Import and use ETF scraper service
    const { etfScraperService } = await import('./etfScraperService');
    const etfData = await etfScraperService.getMultipleETFData(symbols);
    
    return res.json({
      success: true,
      data: etfData,
      timestamp: new Date().toISOString(),
      source: 'ETF Scraper Service',
      count: etfData.length
    });
    
  } catch (error) {
    console.error('❌ ETF scraper batch error:', error);
    return res.status(500).json({
      success: false,
      error: 'ETF data temporarily unavailable',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ETF Scraper Cache Stats
app.get('/api/etf-scraper/cache/stats', async (req: Request, res: Response) => {
  try {
    console.log('📊 Fetching ETF scraper cache stats...');
    
    // Import and use ETF scraper service
    const { etfScraperService } = await import('./etfScraperService');
    const cacheStats = etfScraperService.getCacheStats();
    
    return res.json({
      success: true,
      data: cacheStats,
      timestamp: new Date().toISOString(),
      service: 'ETF Scraper'
    });
    
  } catch (error) {
    console.error('❌ ETF scraper cache stats error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch cache stats'
    });
  }
});

// ETF Scraper Clear Cache
app.post('/api/etf-scraper/cache/clear', async (req: Request, res: Response) => {
  try {
    console.log('🧹 Clearing ETF scraper cache...');
    
    // Import and use ETF scraper service
    const { etfScraperService } = await import('./etfScraperService');
    etfScraperService.clearCache();
    
    return res.json({
      success: true,
      message: 'ETF scraper cache cleared successfully',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ ETF scraper clear cache error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to clear cache'
    });
  }
});

// Get digital assets overview (renamed from defi)
app.get('/api/market-data/digital-assets', async (req: Request, res: Response) => {
  try {
    console.log('🪙 Fetching digital assets data...');
    
    // Use the working paginated endpoint instead of the broken enhanced endpoint
    const cryptoData = await paginatedMarketDataService.getCrypto({ page: 1, limit: 50 });
    
    if (cryptoData && cryptoData.data) {
      // Transform the data to match the expected format
      const transformedData = cryptoData.data.map((crypto: any) => ({
        asset: crypto.symbol,
        symbol: crypto.symbol,
        price: crypto.price,
        change24h: crypto.change24h,
        volume24h: crypto.volume24h || 0,
        marketCap: crypto.marketCap || 0,
        source: crypto.source || 'Multiple APIs',
        lastUpdated: crypto.lastUpdated || Date.now(),
        high24h: crypto.high24h,
        low24h: crypto.low24h,
        open24h: crypto.open24h
      }));
      
      return res.json({
        success: true,
        data: transformedData,
        timestamp: new Date().toISOString()
      });
    } else {
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch digital assets data'
      });
    }
  } catch (error) {
    console.error('❌ Digital assets data fetch error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get DeFi protocols overview
app.get('/api/market-data/defi-protocols', async (req: Request, res: Response) => {
  try {
    console.log('🔗 Fetching DeFi protocols data...');
    
    // Use the working paginated endpoint instead of the broken enhanced endpoint
    const defiData = await paginatedMarketDataService.getCrypto({ page: 1, limit: 50 });
    
    if (defiData && defiData.data) {
      // Transform the data to match the expected format
      const transformedData = defiData.data.map((defi: any) => ({
        asset: defi.symbol,
        symbol: defi.symbol,
        price: defi.price,
        change24h: defi.change24h,
        volume24h: defi.volume24h || 0,
        marketCap: defi.marketCap || 0,
        source: defi.source || 'Multiple APIs',
        lastUpdated: defi.lastUpdated || Date.now(),
        high24h: defi.high24h,
        low24h: defi.low24h,
        open24h: defi.open24h
      }));
      
      return res.json({
        success: true,
        data: transformedData,
        timestamp: new Date().toISOString()
      });
    } else {
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch DeFi protocols data'
      });
    }
  } catch (error) {
    console.error('❌ DeFi protocols data fetch error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// ============================================================================
// ASSET DATA ENDPOINTS (Dynamic Asset Discovery)
// ============================================================================

// Get individual stocks with pagination and search - FROM COMPANY DISCOVERY + LIVE DATA
app.get('/api/stocks', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 25;
    const search = req.query.search as string;

    console.log(`📊 Fetching stocks with live market data (page ${page}, limit ${limit}, search: ${search || 'none'})`);
    
    // Get discovered companies from the discovery service
    const discoveredCompanies = await companyDiscoveryService.getDiscoveredCompanies({
      maxAssets: 100,
      useCache: true
    });
    
    if (discoveredCompanies && discoveredCompanies.stocks) {
      let filteredStocks = discoveredCompanies.stocks;
      
      // Apply search filter if provided
      if (search) {
        filteredStocks = filteredStocks.filter((stock: any) =>
          stock.symbol.toLowerCase().includes(search.toLowerCase()) ||
          stock.name.toLowerCase().includes(search.toLowerCase())
        );
      }
      
      // Apply pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedStocks = filteredStocks.slice(startIndex, endIndex);
      
      // Transform discovered companies to match expected format
      const transformedData = paginatedStocks.map((stock: any) => ({
        asset: stock.symbol,
        symbol: stock.symbol,
        name: stock.name,
        price: stock.price || 0,
        change24h: stock.change24h || 0,
        volume24h: stock.volume24h || 0,
        marketCap: stock.marketCap || 0,
        sector: stock.sector || 'Unknown',
        industry: stock.industry || 'Unknown',
        source: stock.source || 'Company Discovery',
        lastUpdated: stock.lastUpdated || Date.now()
      }));
      
      return res.json({
        success: true,
        data: transformedData,
        pagination: {
          page,
          limit,
          total: filteredStocks.length,
          totalPages: Math.ceil(filteredStocks.length / limit)
        },
        timestamp: new Date().toISOString()
      });
    } else {
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch stock data from company discovery'
      });
    }
  } catch (error) {
    console.error('❌ Stocks fetch error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get individual ETFs with pagination and search - DYNAMICALLY DISCOVERED
app.get('/api/etfs', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 25;
    const search = req.query.search as string;

    console.log(`📊 Fetching dynamically discovered ETFs (page ${page}, limit ${limit}, search: ${search || 'none'})`);
    
    // Get ALL discovered companies (stocks, ETFs, crypto) and filter for ETFs
    const discoveredCompanies = await companyDiscoveryService.getDiscoveredCompanies({
      maxAssets: 100,
      useCache: true
    });
    
    if (discoveredCompanies && discoveredCompanies.etfs) {
      let filteredETFs = discoveredCompanies.etfs;
      
      // Apply search filter if provided
      if (search) {
        filteredETFs = filteredETFs.filter((etf: any) =>
          etf.symbol.toLowerCase().includes(search.toLowerCase()) ||
          etf.name.toLowerCase().includes(search.toLowerCase())
        );
      }
      
      // Apply pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedETFs = filteredETFs.slice(startIndex, endIndex);
      
      // Transform discovered companies to match expected format
      const transformedData = paginatedETFs.map((etf: any) => ({
        asset: etf.symbol,
        symbol: etf.symbol,
        name: etf.name,
        price: etf.price || 0,
        change24h: etf.change24h || 0,
        volume24h: etf.volume24h || 0,
        marketCap: etf.marketCap || 0,
        sector: etf.sector || 'Unknown',
        industry: etf.industry || 'Unknown',
        source: etf.source || 'Dynamic Discovery',
        lastUpdated: etf.lastUpdated || Date.now()
      }));
      
      return res.json({
        success: true,
        data: transformedData,
        pagination: {
          page,
          limit,
          total: filteredETFs.length,
          totalPages: Math.ceil(filteredETFs.length / limit)
        },
        timestamp: new Date().toISOString()
      });
    } else {
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch dynamically discovered ETF data'
      });
    }
  } catch (error) {
    console.error('❌ Dynamic ETFs fetch error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get individual crypto assets with pagination and search - DYNAMICALLY DISCOVERED
app.get('/api/crypto', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 25;
    const search = req.query.search as string;

    console.log(`🪙 Fetching dynamically discovered crypto (page ${page}, limit ${limit}, search: ${search || 'none'})`);
    
    // Get ALL discovered companies (stocks, ETFs, crypto) and filter for crypto
    const discoveredCompanies = await companyDiscoveryService.getDiscoveredCompanies({
      maxAssets: 100,
      useCache: true
    });
    
    if (discoveredCompanies && discoveredCompanies.crypto) {
      let filteredCrypto = discoveredCompanies.crypto;
      
      // Apply search filter if provided
      if (search) {
        filteredCrypto = filteredCrypto.filter((crypto: any) =>
          crypto.symbol.toLowerCase().includes(search.toLowerCase()) ||
          crypto.name.toLowerCase().includes(search.toLowerCase())
        );
      }
      
      // Apply pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedCrypto = filteredCrypto.slice(startIndex, endIndex);
      
      // Transform discovered companies to match expected format
      const transformedData = paginatedCrypto.map((crypto: any) => ({
        asset: crypto.symbol,
        symbol: crypto.symbol,
        name: crypto.name,
        price: crypto.price || 0,
        change24h: crypto.change24h || 0,
        volume24h: crypto.volume24h || 0,
        marketCap: crypto.marketCap || 0,
        sector: crypto.sector || 'Unknown',
        industry: crypto.industry || 'Unknown',
        source: crypto.source || 'Dynamic Discovery',
        lastUpdated: crypto.lastUpdated || Date.now()
      }));
      
      return res.json({
        success: true,
        data: transformedData,
        pagination: {
          page,
          limit,
          total: filteredCrypto.length,
          totalPages: Math.ceil(filteredCrypto.length / limit)
        },
        timestamp: new Date().toISOString()
      });
    } else {
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch dynamically discovered crypto data'
      });
    }
  } catch (error) {
    console.error('❌ Dynamic crypto fetch error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get digital assets data (alias for crypto)
app.get('/api/digital-assets', async (req: Request, res: Response) => {
  try {
    console.log('🪙 Fetching digital assets data...');
    const cryptoData = await paginatedMarketDataService.getCrypto({ page: 1, limit: 50 });
    if (cryptoData && cryptoData.data) {
      const transformedData = cryptoData.data.map((crypto: any) => ({
        asset: crypto.symbol,
        symbol: crypto.symbol,
        price: crypto.price,
        change24h: crypto.change24h,
        volume24h: crypto.volume24h || 0,
        marketCap: crypto.marketCap || 0,
        source: crypto.source || 'Multiple APIs',
        lastUpdated: crypto.lastUpdated || Date.now(),
        high24h: crypto.high24h,
        low24h: crypto.low24h,
        open24h: crypto.open24h
      }));
      return res.json({ success: true, data: transformedData, timestamp: new Date().toISOString() });
    } else {
      return res.status(500).json({ success: false, error: 'Failed to fetch digital assets data' });
    }
  } catch (error) {
    console.error('❌ Digital assets data fetch error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Get DeFi protocols data
app.get('/api/defi-protocols', async (req: Request, res: Response) => {
  try {
    console.log('🔗 Fetching DeFi protocols data...');
    const defiData = await paginatedMarketDataService.getCrypto({ page: 1, limit: 50 });
    if (defiData && defiData.data) {
      const transformedData = defiData.data.map((defi: any) => ({
        asset: defi.symbol,
        symbol: defi.symbol,
        price: defi.price,
        change24h: defi.change24h,
        volume24h: defi.volume24h || 0,
        marketCap: defi.marketCap || 0,
        source: defi.source || 'Multiple APIs',
        lastUpdated: defi.lastUpdated || Date.now(),
        high24h: defi.high24h,
        low24h: defi.low24h,
        open24h: defi.open24h
      }));
      return res.json({ success: true, data: transformedData, timestamp: new Date().toISOString() });
    } else {
      return res.status(500).json({ success: false, error: 'Failed to fetch DeFi protocols data' });
    }
  } catch (error) {
    console.error('❌ DeFi protocols data fetch error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
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