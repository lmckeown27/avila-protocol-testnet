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
  change24h: number;
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
  getTradFiData(): Promise<NormalizedAsset[]>;
  getDeFiData(): Promise<NormalizedAsset[]>;
  getEnhancedMarketData(symbol: string): Promise<EnhancedMarketData>;
  getDeFiProtocols(): Promise<any>;
  getCacheStats(): Promise<any>;
  clearCache(): Promise<void>;
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
   * Get TradFi market data only
   */
  async getTradFiData(): Promise<NormalizedAsset[]> {
    try {
      const response = await this.axiosInstance.get(config.backend.endpoints.tradfi);
      return response.data.data || response.data;
    } catch (error) {
      console.error('Failed to fetch TradFi data:', error);
      throw error;
    }
  }

  /**
   * Get DeFi market data only
   */
  async getDeFiData(): Promise<NormalizedAsset[]> {
    try {
      const response = await this.axiosInstance.get(config.backend.endpoints.defi);
      return response.data.data || response.data;
    } catch (error) {
      console.error('Failed to fetch DeFi data:', error);
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
   * Get cache statistics
   */
  async getCacheStats(): Promise<any> {
    try {
      const response = await this.axiosInstance.get('/api/market-data/cache/stats');
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
      const response = await this.axiosInstance.get('/health');
      return response.data;
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  }
}

export const backendMarketDataService = new BackendMarketDataService(); 