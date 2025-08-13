import axios from 'axios';

// Backend API configuration
const BACKEND_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

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
  getCacheStats(): Promise<any>;
  clearCache(): Promise<void>;
}

class BackendMarketDataService implements IBackendMarketDataService {
  private axiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: BACKEND_BASE_URL,
      timeout: 10000,
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
      const response = await this.axiosInstance.get('/api/market-data');
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
      const response = await this.axiosInstance.get('/api/market-data/tradfi');
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
      const response = await this.axiosInstance.get('/api/market-data/defi');
      return response.data.data || response.data;
    } catch (error) {
      console.error('Failed to fetch DeFi data:', error);
      throw error;
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<any> {
    try {
      const response = await this.axiosInstance.get('/api/market-data/cache/stats');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch cache stats:', error);
      throw error;
    }
  }

  /**
   * Clear the cache
   */
  async clearCache(): Promise<void> {
    try {
      await this.axiosInstance.delete('/api/market-data/cache/clear');
    } catch (error) {
      console.error('Failed to clear cache:', error);
      throw error;
    }
  }

  /**
   * Check if backend is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.axiosInstance.get('/health');
      return response.status === 200;
    } catch (error) {
      console.error('Backend health check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const backendMarketDataService = new BackendMarketDataService();

// Export utility functions
export const getAllMarketData = () => backendMarketDataService.getAllMarketData();
export const getTradFiData = () => backendMarketDataService.getTradFiData();
export const getDeFiData = () => backendMarketDataService.getDeFiData();
export const getCacheStats = () => backendMarketDataService.getCacheStats();
export const clearCache = () => backendMarketDataService.clearCache();
export const healthCheck = () => backendMarketDataService.healthCheck(); 