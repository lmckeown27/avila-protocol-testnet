/**
 * Frontend API Service
 * Provides real-time market data fetching from backend APIs
 * No mock data fallbacks - only real market data
 */

import { 
  MarketMetrics
} from './types';

// ============================================================================
// API CONFIGURATION
// ============================================================================

const BACKEND_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

// ============================================================================
// API ENDPOINTS
// ============================================================================

const ENDPOINTS = {
  // Market Data
  totalMarket: `${BACKEND_BASE_URL}/api/market-data/total`,
  stockMarket: `${BACKEND_BASE_URL}/api/market-data/stock-market`,
  etfMarket: `${BACKEND_BASE_URL}/api/market-data/etf-market`,
  digitalAssets: `${BACKEND_BASE_URL}/api/market-data/digital-assets`,
  defiProtocols: `${BACKEND_BASE_URL}/api/market-data/defi-protocols`,
  
  // Asset Data
  stocks: `${BACKEND_BASE_URL}/api/stocks`,
  etfs: `${BACKEND_BASE_URL}/api/etfs`,
  crypto: `${BACKEND_BASE_URL}/api/crypto`,
  digitalAssetsData: `${BACKEND_BASE_URL}/api/digital-assets`,
  defiProtocolsData: `${BACKEND_BASE_URL}/api/defi-protocols`,
  
  // Company Discovery
  companies: `${BACKEND_BASE_URL}/api/companies`,
  companiesStats: `${BACKEND_BASE_URL}/api/companies/stats`,
  
  // Hybrid Cache
  hybridStats: `${BACKEND_BASE_URL}/api/hybrid/stats`,
  hybridAsset: `${BACKEND_BASE_URL}/api/hybrid`,
  hybridTopAssets: `${BACKEND_BASE_URL}/api/hybrid/top`,
  
  // Search
  search: `${BACKEND_BASE_URL}/api/search`,
  
  // Health
  health: `${BACKEND_BASE_URL}/api/health`,
  rateLimits: `${BACKEND_BASE_URL}/api/rate-limits/status`
};

// ============================================================================
// API SERVICE CLASS
// ============================================================================

export class APIService {
  private static instance: APIService;

  private constructor() {}

  static getInstance(): APIService {
    if (!APIService.instance) {
      APIService.instance = new APIService();
    }
    return APIService.instance;
  }

  // ============================================================================
  // MARKET DATA METHODS
  // ============================================================================

  async getTotalMarketData(): Promise<MarketMetrics> {
    try {
      console.log('📊 Fetching real total market data...');
      
      const response = await fetch(ENDPOINTS.totalMarket);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      if (data.success && data.data) {
        console.log('✅ Real total market data fetched successfully');
        return data.data;
      } else {
        throw new Error('Invalid response format from backend');
      }
    } catch (error) {
      console.error('❌ Failed to fetch real total market data:', error);
      throw new Error('Unable to fetch real market data. Please check your connection and try again.');
    }
  }

  async getStockMarketData(): Promise<MarketMetrics> {
    try {
      console.log('📈 Fetching real stock market data...');
      
      const response = await fetch(ENDPOINTS.stockMarket);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      if (data.success && data.data) {
        console.log('✅ Real stock market data fetched successfully');
        return data.data;
      } else {
        throw new Error('Invalid response format from backend');
      }
    } catch (error) {
      console.error('❌ Failed to fetch real stock market data:', error);
      throw new Error('Unable to fetch real stock market data. Please check your connection and try again.');
    }
  }

  async getETFMarketData(): Promise<MarketMetrics> {
    try {
      console.log('📊 Fetching real ETF market data...');
      
      const response = await fetch(ENDPOINTS.etfMarket);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      if (data.success && data.data) {
        console.log('✅ Real ETF market data fetched successfully');
        return data.data;
      } else {
        throw new Error('Invalid response format from backend');
      }
    } catch (error) {
      console.error('❌ Failed to fetch real ETF market data:', error);
      throw new Error('Unable to fetch real ETF market data. Please check your connection and try again.');
    }
  }

  async getDigitalAssetsData(): Promise<MarketMetrics> {
    try {
      console.log('💎 Fetching real digital assets data...');
      
      const response = await fetch(ENDPOINTS.digitalAssets);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      if (data.success && data.data) {
        console.log('✅ Real digital assets data fetched successfully');
        return data.data;
      } else {
        throw new Error('Invalid response format from backend');
      }
    } catch (error) {
      console.error('❌ Failed to fetch real digital assets data:', error);
      throw new Error('Unable to fetch real digital assets data. Please check your connection and try again.');
    }
  }

  async getDeFiProtocolsData(): Promise<MarketMetrics> {
    try {
      console.log('🔗 Fetching real DeFi protocols data...');
      
      const response = await fetch(ENDPOINTS.defiProtocols);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      if (data.success && data.data) {
        console.log('✅ Real DeFi protocols data fetched successfully');
        return data.data;
      } else {
        throw new Error('Invalid response format from backend');
      }
    } catch (error) {
      console.error('❌ Failed to fetch real DeFi protocols data:', error);
      throw new Error('Unable to fetch real DeFi protocols data. Please check your connection and try again.');
    }
  }

  // ============================================================================
  // ASSET DATA METHODS
  // ============================================================================

  async getStocks(page: number = 1, limit: number = 25, search?: string): Promise<any> {
    try {
      console.log(`📊 Fetching real stock data (page ${page}, limit ${limit})...`);
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });
      
      if (search) {
        params.append('search', search);
      }
      
      const response = await fetch(`${ENDPOINTS.stocks}?${params}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      if (data.success && data.data) {
        console.log('✅ Real stock data fetched successfully');
        return data.data;
      } else {
        throw new Error('Invalid response format from backend');
      }
    } catch (error) {
      console.error('❌ Failed to fetch real stock data:', error);
      throw new Error('Unable to fetch real stock data. Please check your connection and try again.');
    }
  }

  async getETFs(page: number = 1, limit: number = 25, search?: string): Promise<any> {
    try {
      console.log(`📊 Fetching real ETF data (page ${page}, limit ${limit})...`);
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });
      
      if (search) {
        params.append('search', search);
      }
      
      const response = await fetch(`${ENDPOINTS.etfs}?${params}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      if (data.success && data.data) {
        console.log('✅ Real ETF data fetched successfully');
        return data.data;
      } else {
        throw new Error('Invalid response format from backend');
      }
    } catch (error) {
      console.error('❌ Failed to fetch real ETF data:', error);
      throw new Error('Unable to fetch real ETF data. Please check your connection and try again.');
    }
  }

  async getCrypto(page: number = 1, limit: number = 25, search?: string): Promise<any> {
    try {
      console.log(`🪙 Fetching real crypto data (page ${page}, limit ${limit})...`);
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });
      
      if (search) {
        params.append('search', search);
      }
      
      const response = await fetch(`${ENDPOINTS.crypto}?${params}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      if (data.success && data.data) {
        console.log('✅ Real crypto data fetched successfully');
        return data.data;
      } else {
        throw new Error('Invalid response format from backend');
      }
    } catch (error) {
      console.error('❌ Failed to fetch real crypto data:', error);
      throw new Error('Unable to fetch real crypto data. Please check your connection and try again.');
    }
  }

  // ============================================================================
  // COMPANY DISCOVERY METHODS
  // ============================================================================

  async getDiscoveredCompanies(): Promise<any> {
    try {
      console.log('🔍 Fetching discovered companies...');
      
      const response = await fetch(ENDPOINTS.companies);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      if (data.success && data.data) {
        console.log('✅ Discovered companies fetched successfully');
        return data.data;
      } else {
        throw new Error('Invalid response format from backend');
      }
    } catch (error) {
      console.error('❌ Failed to fetch discovered companies:', error);
      throw new Error('Unable to fetch discovered companies. Please check your connection and try again.');
    }
  }

  async getCompanyStats(): Promise<any> {
    try {
      console.log('📊 Fetching company discovery stats...');
      
      const response = await fetch(ENDPOINTS.companiesStats);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      if (data.success && data.data) {
        console.log('✅ Company stats fetched successfully');
        return data.data;
      } else {
        throw new Error('Invalid response format from backend');
      }
    } catch (error) {
      console.error('❌ Failed to fetch company stats:', error);
      throw new Error('Unable to fetch company stats. Please check your connection and try again.');
    }
  }

  // ============================================================================
  // HYBRID CACHE METHODS
  // ============================================================================

  async getHybridCacheStats(): Promise<any> {
    try {
      console.log('📦 Fetching hybrid cache stats...');
      
      const response = await fetch(ENDPOINTS.hybridStats);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      if (data.success && data.data) {
        console.log('✅ Hybrid cache stats fetched successfully');
        return data.data;
      } else {
        throw new Error('Invalid response format from backend');
      }
    } catch (error) {
      console.error('❌ Failed to fetch hybrid cache stats:', error);
      throw new Error('Unable to fetch hybrid cache stats. Please check your connection and try again.');
    }
  }

  async getTopAssets(category: 'stocks' | 'etfs' | 'crypto', limit: number = 50): Promise<any> {
    try {
      console.log(`📊 Fetching top ${category} from hybrid cache...`);
      
      const response = await fetch(`${ENDPOINTS.hybridTopAssets}/${category}?limit=${limit}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      if (data.success && data.data) {
        console.log(`✅ Top ${category} fetched successfully`);
        return data.data;
      } else {
        throw new Error('Invalid response format from backend');
      }
    } catch (error) {
      console.error(`❌ Failed to fetch top ${category}:`, error);
      throw new Error(`Unable to fetch top ${category}. Please check your connection and try again.`);
    }
  }

  // ============================================================================
  // SEARCH METHODS
  // ============================================================================

  async searchAssets(query: string, category?: string): Promise<any> {
    try {
      console.log(`🔍 Searching for assets: "${query}"...`);
      
      const params = new URLSearchParams({ q: query });
      if (category) {
        params.append('category', category);
      }
      
      const response = await fetch(`${ENDPOINTS.search}?${params}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      if (data.success && data.data) {
        console.log('✅ Asset search completed successfully');
        return data.data;
      } else {
        throw new Error('Invalid response format from backend');
      }
    } catch (error) {
      console.error('❌ Asset search failed:', error);
      throw new Error('Asset search failed. Please check your connection and try again.');
    }
  }

  // ============================================================================
  // HEALTH & STATUS METHODS
  // ============================================================================

  async getBackendHealth(): Promise<any> {
    try {
      console.log('🏥 Checking backend health...');
      
      const response = await fetch(ENDPOINTS.health);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      if (data.success) {
        console.log('✅ Backend is healthy');
        return data;
      } else {
        throw new Error('Backend health check failed');
      }
    } catch (error) {
      console.error('❌ Backend health check failed:', error);
      throw new Error('Backend is not responding. Please check your connection and try again.');
    }
  }

  async getRateLimitStatus(): Promise<any> {
    try {
      console.log('⏱️ Checking rate limit status...');
      
      const response = await fetch(ENDPOINTS.rateLimits);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      if (data.success && data.data) {
        console.log('✅ Rate limit status fetched successfully');
        return data.data;
      } else {
        throw new Error('Invalid response format from backend');
      }
    } catch (error) {
      console.error('❌ Failed to fetch rate limit status:', error);
      throw new Error('Unable to fetch rate limit status. Please check your connection and try again.');
    }
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================
}

// Export singleton instance
export const apiService = APIService.getInstance(); 