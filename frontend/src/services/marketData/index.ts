/**
 * Market Data Service
 * Comprehensive data-fetching layer for real-time asset scanning
 * No mock data fallbacks - only real market data from backend APIs
 */

import { apiService } from '../../lib/api';
import { MarketMetrics } from '../../lib/types';

// ============================================================================
// MARKET DATA SERVICE CLASS
// ============================================================================

export class MarketDataService {
  private static instance: MarketDataService;

  private constructor() {}

  static getInstance(): MarketDataService {
    if (!MarketDataService.instance) {
      MarketDataService.instance = new MarketDataService();
    }
    return MarketDataService.instance;
  }

  // ============================================================================
  // MARKET OVERVIEW METHODS
  // ============================================================================

  async getTotalMarketOverview(): Promise<MarketMetrics> {
    try {
      console.log('📊 Fetching real total market overview...');
      
      const data = await apiService.getTotalMarketData();
      console.log('✅ Real total market overview fetched successfully');
      return data;
    } catch (error) {
      console.error('❌ Failed to fetch real total market overview:', error);
      throw new Error('Unable to fetch real market overview. Please check your connection and try again.');
    }
  }

  async getStockMarketOverview(): Promise<MarketMetrics> {
    try {
      console.log('📈 Fetching real stock market overview...');
      
      const data = await apiService.getStockMarketData();
      console.log('✅ Real stock market overview fetched successfully');
      return data;
      } catch (error) {
      console.error('❌ Failed to fetch real stock market overview:', error);
      throw new Error('Unable to fetch real stock market overview. Please check your connection and try again.');
    }
  }

  async getETFMarketOverview(): Promise<MarketMetrics> {
    try {
      console.log('📊 Fetching real ETF market overview...');
      
      const data = await apiService.getETFMarketData();
      console.log('✅ Real ETF market overview fetched successfully');
      return data;
      } catch (error) {
      console.error('❌ Failed to fetch real ETF market overview:', error);
      throw new Error('Unable to fetch real ETF market overview. Please check your connection and try again.');
    }
  }

  async getDigitalAssetsOverview(): Promise<MarketMetrics> {
    try {
      console.log('💎 Fetching real digital assets overview...');
      
      const data = await apiService.getDigitalAssetsData();
      console.log('✅ Real digital assets overview fetched successfully');
      return data;
      } catch (error) {
      console.error('❌ Failed to fetch real digital assets overview:', error);
      throw new Error('Unable to fetch real digital assets overview. Please check your connection and try again.');
    }
  }

  async getDeFiProtocolsOverview(): Promise<MarketMetrics> {
    try {
      console.log('🔗 Fetching real DeFi protocols overview...');
      
      const data = await apiService.getDeFiProtocolsData();
      console.log('✅ Real DeFi protocols overview fetched successfully');
      return data;
      } catch (error) {
      console.error('❌ Failed to fetch real DeFi protocols overview:', error);
      throw new Error('Unable to fetch real DeFi protocols overview. Please check your connection and try again.');
    }
  }

  // ============================================================================
  // ASSET DATA METHODS
  // ============================================================================

  async getStockData(page: number = 1, limit: number = 25, search?: string): Promise<any> {
    try {
      console.log(`📊 Fetching real stock data (page ${page}, limit ${limit})...`);
      
      const data = await apiService.getStocks(page, limit, search);
      console.log('✅ Real stock data fetched successfully');
      return data;
      } catch (error) {
      console.error('❌ Failed to fetch real stock data:', error);
      throw new Error('Unable to fetch real stock data. Please check your connection and try again.');
    }
  }

  async getETFData(page: number = 1, limit: number = 25, search?: string): Promise<any> {
    try {
      console.log(`📊 Fetching real ETF data (page ${page}, limit ${limit})...`);
      
      const data = await apiService.getETFs(page, limit, search);
      console.log('✅ Real ETF data fetched successfully');
      return data;
      } catch (error) {
      console.error('❌ Failed to fetch real ETF data:', error);
      throw new Error('Unable to fetch real ETF data. Please check your connection and try again.');
    }
  }

  async getCryptoData(page: number = 1, limit: number = 25, search?: string): Promise<any> {
    try {
      console.log(`🪙 Fetching real crypto data (page ${page}, limit ${limit})...`);
      
      const data = await apiService.getCrypto(page, limit, search);
      console.log('✅ Real crypto data fetched successfully');
      return data;
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
      
      const data = await apiService.getDiscoveredCompanies();
      console.log('✅ Discovered companies fetched successfully');
      return data;
    } catch (error) {
      console.error('❌ Failed to fetch discovered companies:', error);
      throw new Error('Unable to fetch discovered companies. Please check your connection and try again.');
    }
  }

  async getCompanyStats(): Promise<any> {
    try {
      console.log('📊 Fetching company discovery stats...');
      
      const data = await apiService.getCompanyStats();
      console.log('✅ Company stats fetched successfully');
      return data;
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
      
      const data = await apiService.getHybridCacheStats();
      console.log('✅ Hybrid cache stats fetched successfully');
      return data;
    } catch (error) {
      console.error('❌ Failed to fetch hybrid cache stats:', error);
      throw new Error('Unable to fetch hybrid cache stats. Please check your connection and try again.');
    }
  }

  async getTopAssets(category: 'stocks' | 'etfs' | 'crypto', limit: number = 50): Promise<any> {
    try {
      console.log(`📊 Fetching top ${category} from hybrid cache...`);
      
      const data = await apiService.getTopAssets(category, limit);
      console.log(`✅ Top ${category} fetched successfully`);
      return data;
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
      
      const data = await apiService.searchAssets(query, category);
      console.log('✅ Asset search completed successfully');
      return data;
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
      
      const data = await apiService.getBackendHealth();
      console.log('✅ Backend is healthy');
      return data;
    } catch (error) {
      console.error('❌ Backend health check failed:', error);
      throw new Error('Backend is not responding. Please check your connection and try again.');
    }
  }

  async getRateLimitStatus(): Promise<any> {
    try {
      console.log('⏱️ Checking rate limit status...');
      
      const data = await apiService.getRateLimitStatus();
      console.log('✅ Rate limit status fetched successfully');
      return data;
    } catch (error) {
      console.error('❌ Failed to fetch rate limit status:', error);
      throw new Error('Unable to fetch rate limit status. Please check your connection and try again.');
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  getServiceStatus(): string {
    return 'Real-time asset scanning service operational';
  }

  getLastUpdateTime(): Date {
    return new Date();
  }
}

// Export singleton instance
export const marketDataService = MarketDataService.getInstance(); 