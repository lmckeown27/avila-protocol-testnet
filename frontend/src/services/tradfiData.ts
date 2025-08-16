/**
 * TradFi Data Service
 * Provides real-time traditional finance market data
 * No mock data fallbacks - only real market data from backend
 */

import { apiService } from '../lib/api';

// ============================================================================
// INTERFACES & TYPES
// ============================================================================

export interface TradFiAsset {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  sector?: string;
  industry?: string;
  pe?: number;
  dividendYield?: number;
  high24h?: number;
  low24h?: number;
  open24h?: number;
  lastUpdated: number;
}

export interface TradFiMarketData {
  assets: TradFiAsset[];
  totalMarketCap: number;
  totalVolume: number;
  averageChange: number;
  timestamp: number;
}

// ============================================================================
// TRADFI DATA SERVICE CLASS
// ============================================================================

export class TradFiDataService {
  private static instance: TradFiDataService;

  private constructor() {}

  static getInstance(): TradFiDataService {
    if (!TradFiDataService.instance) {
      TradFiDataService.instance = new TradFiDataService();
    }
    return TradFiDataService.instance;
  }

  // ============================================================================
  // STOCK DATA METHODS
  // ============================================================================

  async getStockData(symbols: string[] = []): Promise<TradFiAsset[]> {
    try {
      console.log(`📊 Fetching real stock data for ${symbols.length} symbols...`);
      
      if (symbols.length === 0) {
        // Get all stocks from backend
        const response = await apiService.getStocks(1, 100);
        return this.transformStockData(response.data || []);
      }

      // Get specific stocks
      const stockPromises = symbols.map(async (symbol) => {
        try {
          const response = await apiService.getStocks(1, 1, symbol);
          const stocks = response.data || [];
          return stocks.length > 0 ? this.transformStockData([stocks[0]])[0] : null;
        } catch (error) {
          console.warn(`Failed to fetch stock data for ${symbol}:`, error);
          return null;
        }
      });

      const results = await Promise.all(stockPromises);
      const validStocks = results.filter(Boolean) as TradFiAsset[];
      
      console.log(`✅ Successfully fetched real data for ${validStocks.length} stocks`);
      return validStocks;
    } catch (error) {
      console.error('❌ Failed to fetch real stock data:', error);
      throw new Error('Unable to fetch real stock data. Please check your connection and try again.');
    }
  }

  async getTopStocks(limit: number = 25): Promise<TradFiAsset[]> {
    try {
      console.log(`📊 Fetching top ${limit} stocks from backend...`);
      
      const response = await apiService.getStocks(1, limit);
      const stocks = this.transformStockData(response.data || []);
      
      console.log(`✅ Successfully fetched top ${stocks.length} stocks`);
      return stocks;
    } catch (error) {
      console.error('❌ Failed to fetch top stocks:', error);
      throw new Error('Unable to fetch top stocks. Please check your connection and try again.');
    }
  }

  async searchStocks(query: string): Promise<TradFiAsset[]> {
    try {
      console.log(`🔍 Searching for stocks: "${query}"...`);
      
      const response = await apiService.searchAssets(query, 'stock');
      const stocks = this.transformStockData(response.assets || []);
      
      console.log(`✅ Found ${stocks.length} stocks matching "${query}"`);
      return stocks;
    } catch (error) {
      console.error('❌ Stock search failed:', error);
      throw new Error('Stock search failed. Please check your connection and try again.');
    }
  }

  // ============================================================================
  // ETF DATA METHODS
  // ============================================================================

  async getETFData(symbols: string[] = []): Promise<TradFiAsset[]> {
    try {
      console.log(`📊 Fetching real ETF data for ${symbols.length} symbols...`);
      
      if (symbols.length === 0) {
        // Get all ETFs from backend
        const response = await apiService.getETFs(1, 100);
        return this.transformETFData(response.data || []);
      }

      // Get specific ETFs
      const etfPromises = symbols.map(async (symbol) => {
        try {
          const response = await apiService.getETFs(1, 1, symbol);
          const etfs = response.data || [];
          return etfs.length > 0 ? this.transformETFData([etfs[0]])[0] : null;
        } catch (error) {
          console.warn(`Failed to fetch ETF data for ${symbol}:`, error);
          return null;
        }
      });

      const results = await Promise.all(etfPromises);
      const validETFs = results.filter(Boolean) as TradFiAsset[];
      
      console.log(`✅ Successfully fetched real data for ${validETFs.length} ETFs`);
      return validETFs;
    } catch (error) {
      console.error('❌ Failed to fetch real ETF data:', error);
      throw new Error('Unable to fetch real ETF data. Please check your connection and try again.');
    }
  }

  async getTopETFs(limit: number = 25): Promise<TradFiAsset[]> {
    try {
      console.log(`📊 Fetching top ${limit} ETFs from backend...`);
      
      const response = await apiService.getETFs(1, limit);
      const etfs = this.transformETFData(response.data || []);
      
      console.log(`✅ Successfully fetched top ${etfs.length} ETFs`);
      return etfs;
    } catch (error) {
      console.error('❌ Failed to fetch top ETFs:', error);
      throw new Error('Unable to fetch top ETFs. Please check your connection and try again.');
    }
  }

  async searchETFs(query: string): Promise<TradFiAsset[]> {
    try {
      console.log(`🔍 Searching for ETFs: "${query}"...`);
      
      const response = await apiService.searchAssets(query, 'etf');
      const etfs = this.transformETFData(response.assets || []);
      
      console.log(`✅ Found ${etfs.length} ETFs matching "${query}"`);
      return etfs;
    } catch (error) {
      console.error('❌ ETF search failed:', error);
      throw new Error('ETF search failed. Please check your connection and try again.');
    }
  }

  // ============================================================================
  // MARKET OVERVIEW METHODS
  // ============================================================================

  async getStockMarketOverview(): Promise<TradFiMarketData> {
    try {
      console.log('📊 Fetching real stock market overview...');
      
      // Get top stocks and ETFs for additional context
      const [topStocks, topETFs] = await Promise.all([
        this.getTopStocks(50),
        this.getTopETFs(25)
      ]);
      
      const allAssets = [...topStocks, ...topETFs];
      
      const overview: TradFiMarketData = {
        assets: allAssets,
        totalMarketCap: allAssets.reduce((sum, asset) => sum + asset.marketCap, 0),
        totalVolume: allAssets.reduce((sum, asset) => sum + asset.volume, 0),
        averageChange: allAssets.reduce((sum, asset) => sum + asset.changePercent, 0) / allAssets.length,
        timestamp: Date.now()
      };
      
      console.log('✅ Real stock market overview fetched successfully');
      return overview;
    } catch (error) {
      console.error('❌ Failed to fetch real stock market overview:', error);
      throw new Error('Unable to fetch real stock market overview. Please check your connection and try again.');
    }
  }

  // ============================================================================
  // DATA TRANSFORMATION METHODS
  // ============================================================================

  private transformStockData(stocks: any[]): TradFiAsset[] {
    return stocks.map(stock => ({
      symbol: stock.symbol,
      name: stock.name,
      price: stock.price || 0,
      change: stock.change24h || 0,
      changePercent: stock.change24h || 0,
      volume: stock.volume24h || 0,
      marketCap: stock.marketCap || 0,
      sector: stock.sector || 'Unknown',
      industry: stock.industry || 'Unknown',
      pe: stock.pe || null,
      dividendYield: stock.dividendYield || null,
      high24h: stock.high24h || 0,
      low24h: stock.low24h || 0,
      open24h: stock.open24h || 0,
      lastUpdated: stock.lastUpdated || Date.now()
    }));
  }

  private transformETFData(etfs: any[]): TradFiAsset[] {
    return etfs.map(etf => ({
      symbol: etf.symbol,
      name: etf.name,
      price: etf.price || 0,
      change: etf.change24h || 0,
      changePercent: etf.change24h || 0,
      volume: etf.volume24h || 0,
      marketCap: etf.marketCap || 0,
      sector: etf.sector || 'ETF',
      industry: etf.industry || 'Exchange Traded Fund',
      pe: etf.pe || null,
      dividendYield: etf.dividendYield || null,
      high24h: etf.high24h || 0,
      low24h: etf.low24h || 0,
      open24h: etf.open24h || 0,
      lastUpdated: etf.lastUpdated || Date.now()
    }));
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  getServiceStatus(): string {
    return 'Real-time stock market data service operational';
  }

  getLastUpdateTime(): Date {
    return new Date();
  }
}

// Export singleton instance
export const tradFiDataService = TradFiDataService.getInstance(); 