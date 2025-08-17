/**
 * Frontend API Service
 * Provides real-time market data fetching from backend APIs
 * No mock data fallbacks - only real market data
 */

import { 
  MarketMetrics
} from './types';
import { config } from '../config/environment';

// ============================================================================
// API ENDPOINTS
// ============================================================================

const ENDPOINTS = {
  // Market Data
  totalMarket: `${config.backend.baseUrl}/api/market-data/total`,
  stockMarket: `${config.backend.baseUrl}/api/market-data/stock-market`,
  etfMarket: `${config.backend.baseUrl}/api/market-data/etf-market`,
  digitalAssets: `${config.backend.baseUrl}/api/market-data/digital-assets`,
  defiProtocols: `${config.backend.baseUrl}/api/market-data/defi-protocols`,
  
  // Asset Data
  stocks: `${config.backend.baseUrl}/api/market-data/stock-market`,
  etfs: `${config.backend.baseUrl}/api/market-data/etf-market`,
  crypto: `${config.backend.baseUrl}/api/crypto`,
  digitalAssetsData: `${config.backend.baseUrl}/api/digital-assets`,
  defiProtocolsData: `${config.backend.baseUrl}/api/defi-protocols`,
  
  // Company Discovery
  companies: `${config.backend.baseUrl}/api/companies`,
  companiesStats: `${config.backend.baseUrl}/api/companies/stats`,
  
  // Hybrid Cache
  hybridStats: `${config.backend.baseUrl}/api/hybrid/stats`,
  hybridAsset: `${config.backend.baseUrl}/api/hybrid`,
  hybridTopAssets: `${config.backend.baseUrl}/api/hybrid/top`,
  
  // Search
  search: `${config.backend.baseUrl}/api/search`,
  
  // Health
  health: `${config.backend.baseUrl}/api/health`,
  rateLimits: `${config.backend.baseUrl}/api/rate-limits/status`
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
      console.log(`📊 Fetching real stock market data (page ${page}, limit ${limit})...`);
      
      // The stock market endpoint returns all data, so we'll slice it based on page and limit
      const response = await fetch(ENDPOINTS.stocks);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      if (data.success && data.data) {
        // Calculate pagination manually since the endpoint returns all data
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedData = data.data.slice(startIndex, endIndex);
        
        // Filter by search if provided
        const filteredData = search 
          ? paginatedData.filter((stock: any) => 
              stock.symbol.toLowerCase().includes(search.toLowerCase()) ||
              stock.name.toLowerCase().includes(search.toLowerCase())
            )
          : paginatedData;
        
        console.log('✅ Real stock market data fetched successfully');
        return {
          data: filteredData,
          pagination: {
            page,
            limit,
            total: data.data.length,
            totalPages: Math.ceil(data.data.length / limit),
            hasNext: endIndex < data.data.length,
            hasPrev: page > 1
          }
        };
      } else {
        throw new Error('Invalid response format from backend');
      }
    } catch (error) {
      console.error('❌ Failed to fetch real stock market data:', error);
      throw new Error('Unable to fetch real stock market data. Please check your connection and try again.');
    }
  }

  async getETFs(page: number = 1, limit: number = 25, search?: string): Promise<any> {
    try {
      console.log(`📊 Fetching real ETF market data (page ${page}, limit ${limit})...`);
      
      // The ETF market endpoint returns all data, so we'll slice it based on page and limit
      const response = await fetch(ENDPOINTS.etfs);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      if (data.success && data.data) {
        // Calculate pagination manually since the endpoint returns all data
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedData = data.data.slice(startIndex, endIndex);
        
        // Filter by search if provided
        const filteredData = search 
          ? paginatedData.filter((etf: any) => 
              etf.symbol.toLowerCase().includes(search.toLowerCase()) ||
              etf.name.toLowerCase().includes(search.toLowerCase())
            )
          : paginatedData;
        
        console.log('✅ Real ETF market data fetched successfully');
        return {
          data: filteredData,
          pagination: {
            page,
            limit,
            total: data.data.length,
            totalPages: Math.ceil(data.data.length / limit),
            hasNext: endIndex < data.data.length,
            hasPrev: page > 1
          }
        };
      } else {
        throw new Error('Invalid response format from backend');
      }
    } catch (error) {
      console.error('❌ Failed to fetch real ETF market data:', error);
      throw new Error('Unable to fetch real ETF market data. Please check your connection and try again.');
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