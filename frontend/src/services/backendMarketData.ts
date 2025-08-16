import axios from 'axios';
import { config } from '../config/environment';
import { EnhancedMarketData } from '../lib/types';

// Backend API configuration
const BACKEND_BASE_URL = config.backend.baseUrl;

// Types matching the backend
export interface NormalizedAsset {
  asset: string;
  symbol: string;
  price: number;
  change24h: number; // Percentage change

  volume24h: number;
  marketCap: number;
  source: string;
  lastUpdated: number;
  high24h: number;
  low24h: number;
  open24h: number;
  pe?: number | null;
  tvl?: number | null;
}

export interface MarketDataResponse {
  tradfi: NormalizedAsset[];
  defi: NormalizedAsset[];
  timestamp: number;
  dataSources: string[];
  errors: string[];
}

export interface IBackendMarketDataService {
  getAllMarketData(): Promise<MarketDataResponse>;
  getStockData(): Promise<NormalizedAsset[]>;
  getETFsData(): Promise<NormalizedAsset[]>;
  getCryptoData(): Promise<NormalizedAsset[]>;
  getDigitalAssetsData(): Promise<NormalizedAsset[]>;
  getEnhancedMarketData(symbol: string): Promise<EnhancedMarketData>;
  getDeFiProtocols(): Promise<any>;
  getCacheStats(): Promise<any>;
  clearCache(): Promise<void>;
  searchAssets(query: string): Promise<any>;
  getCategories(): Promise<any>;
  getCompanies(): Promise<any>;
  getCompaniesStats(): Promise<any>;
  getRateLimitsStatus(): Promise<any>;
  getRateLimitsTiming(): Promise<any>;
  getRateLimitsRotation(): Promise<any>;
  healthCheck(): Promise<any>;
}

class BackendMarketDataService implements IBackendMarketDataService {
  private axiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: BACKEND_BASE_URL,
      timeout: config.backend.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('Backend API Error:', error);
        if (error.response) {
          console.error(`Status: ${error.response.status}, Message: ${error.response.data?.message || 'Unknown error'}`);
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Get all market data (TradFi + DeFi)
   */
  async getAllMarketData(): Promise<MarketDataResponse> {
    try {
      const response = await this.axiosInstance.get(config.backend.endpoints.marketData);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch all market data:', error);
      throw error;
    }
  }

  /**
   * Get Stock Market data only
   */
  async getStockData(): Promise<NormalizedAsset[]> {
    try {
      const response = await this.axiosInstance.get(config.backend.endpoints.stocks);
      return response.data.data || response.data;
    } catch (error) {
      console.error('Failed to fetch Stock Market data:', error);
      throw error;
    }
  }

  /**
   * Get ETFs data only
   */
  async getETFsData(): Promise<NormalizedAsset[]> {
    try {
      const response = await this.axiosInstance.get(config.backend.endpoints.etfs);
      return response.data.data || response.data;
    } catch (error) {
      console.error('Failed to fetch ETFs data:', error);
      throw error;
    }
  }

  /**
   * Get Crypto data only
   */
  async getCryptoData(): Promise<NormalizedAsset[]> {
    try {
      const response = await this.axiosInstance.get(config.backend.endpoints.crypto);
      return response.data.data || response.data;
    } catch (error) {
      console.error('Failed to fetch Crypto data:', error);
      throw error;
    }
  }

  /**
   * Get Digital Assets market data only
   */
  async getDigitalAssetsData(): Promise<NormalizedAsset[]> {
    try {
      const response = await this.axiosInstance.get(config.backend.endpoints.digitalAssets);
      return response.data.data || response.data;
    } catch (error) {
      console.error('Failed to fetch Digital Assets data:', error);
      throw error;
    }
  }

  /**
   * Get enhanced market data for a specific symbol
   */
  async getEnhancedMarketData(symbol: string): Promise<EnhancedMarketData> {
    try {
      const response = await this.axiosInstance.get(`/api/market-data/enhanced/${symbol}`);
      return response.data.data;
    } catch (error) {
      console.error(`Failed to fetch enhanced market data for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Get DeFi protocol data (TVL, protocol metrics)
   */
  async getDeFiProtocols(): Promise<any> {
    try {
      const response = await this.axiosInstance.get('/api/market-data/defi-protocols');
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch DeFi protocols:', error);
      throw error;
    }
  }

  /**
   * Search assets
   */
  async searchAssets(query: string): Promise<any> {
    try {
      const response = await this.axiosInstance.get(`${config.backend.endpoints.search}?q=${encodeURIComponent(query)}`);
      return response.data.data || response.data;
    } catch (error) {
      console.error('Failed to search assets:', error);
      throw error;
    }
  }

  /**
   * Get categories
   */
  async getCategories(): Promise<any> {
    try {
      const response = await this.axiosInstance.get(config.backend.endpoints.categories);
      return response.data.data || response.data;
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      throw error;
    }
  }

  /**
   * Get companies
   */
  async getCompanies(): Promise<any> {
    try {
      const response = await this.axiosInstance.get(config.backend.endpoints.companies);
      return response.data.data || response.data;
    } catch (error) {
      console.error('Failed to fetch companies:', error);
      throw error;
    }
  }

  /**
   * Get companies stats
   */
  async getCompaniesStats(): Promise<any> {
    try {
      const response = await this.axiosInstance.get(config.backend.endpoints.companiesStats);
      return response.data.data || response.data;
    } catch (error) {
      console.error('Failed to fetch companies stats:', error);
      throw error;
    }
  }

  /**
   * Get rate limits status
   */
  async getRateLimitsStatus(): Promise<any> {
    try {
      const response = await this.axiosInstance.get(config.backend.endpoints.rateLimitsStatus);
      return response.data.data || response.data;
    } catch (error) {
      console.error('Failed to fetch rate limits status:', error);
      throw error;
    }
  }

  /**
   * Get rate limits timing
   */
  async getRateLimitsTiming(): Promise<any> {
    try {
      const response = await this.axiosInstance.get(config.backend.endpoints.rateLimitsTiming);
      return response.data.data || response.data;
    } catch (error) {
      console.error('Failed to fetch rate limits timing:', error);
      throw error;
    }
  }

  /**
   * Get rate limits rotation
   */
  async getRateLimitsRotation(): Promise<any> {
    try {
      const response = await this.axiosInstance.get(config.backend.endpoints.rateLimitsRotation);
      return response.data.data || response.data;
    } catch (error) {
      console.error('Failed to fetch rate limits rotation:', error);
      throw error;
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<any> {
    try {
      const response = await this.axiosInstance.get(config.backend.endpoints.cacheStats);
      return response.data.data || response.data;
    } catch (error) {
      console.error('Failed to fetch cache stats:', error);
      throw error;
    }
  }

  /**
   * Clear cache
   */
  async clearCache(): Promise<void> {
    try {
      await this.axiosInstance.post('/api/market-data/cache/clear');
    } catch (error) {
      console.error('Failed to clear cache:', error);
      throw error;
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<any> {
    try {
      const response = await this.axiosInstance.get(config.backend.endpoints.health);
      return response.data;
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  }
}

export const backendMarketDataService = new BackendMarketDataService(); 