/**
 * Enhanced Market Data Service
 * Uses rate limiting, caching, and fallback strategies to prevent API rate limit issues
 */

import { rateLimitManager } from './rateLimitManager';
import axios, { AxiosResponse, AxiosError } from 'axios';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

// ============================================================================
// INTERFACES & TYPES
// ============================================================================

export interface NormalizedAsset {
  asset: string;
  price: number;
  change24h: number; // Percentage change
  volume24h: number;
  marketCap: number;
  source: string;
  lastUpdated: number;
  symbol: string;
  name?: string;
  high24h?: number;
  low24h?: number;
  open24h?: number;
  pe?: number | null;
}

export interface MarketDataResponse {
  stocks: NormalizedAsset[];
  digitalAssets: NormalizedAsset[];
  timestamp: number;
  dataSources: string[];
  errors: string[];
  cacheInfo: {
    hitRate: number;
    totalRequests: number;
    cachedRequests: number;
  };
}

export interface StockAsset {
  symbol: string;
  price: number;
  change: number;
  volume: number;
  marketCap: number;
  high: number;
  low: number;
  open: number;
  name?: string;
  pe?: number;
}

export interface CryptoAsset {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_24h: number;
  total_volume: number;
  market_cap: number;
  high_24h?: number;
  low_24h?: number;
}

// ============================================================================
// API CONFIGURATION
// ============================================================================

const API_KEYS = {
  finnhub: process.env.FINNHUB_API_KEY || 'demo',
  alphaVantage: process.env.ALPHA_VANTAGE_API_KEY || 'demo',
  twelveData: process.env.TWELVE_DATA_API_KEY || 'demo',
  coinMarketCap: process.env.COINMARKETCAP_API_KEY || 'demo'
};

// ============================================================================
// DEFAULT ASSET LISTS
// ============================================================================

const DEFAULT_STOCK_SYMBOLS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX'
  // ETFs removed: SPY, QQQ, IWM, VTI, VEA, VWO, BND, GLD
  // Indices removed: ^GSPC, ^DJI, ^IXIC, ^RUT
];

const DEFAULT_CRYPTO_IDS = [
  'bitcoin', 'ethereum', 'chainlink', 'cardano', 'solana',
  'ripple', 'polkadot', 'dogecoin', 'avalanche-2', 'matic-network'
];

// ============================================================================
// ENHANCED MARKET DATA SERVICE CLASS
// ============================================================================

export class EnhancedMarketDataService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION_MS = 10 * 60 * 1000; // 10 minutes
  private readonly POLLING_INTERVAL = 30000; // 30 seconds
  private isPolling = false;
  private pollingInterval: NodeJS.Timeout | null = null;
  private totalRequests = 0;
  private cachedRequests = 0;

  constructor() {
    // Start cache cleanup interval
    setInterval(() => {
      this.cleanupExpiredCache();
      rateLimitManager.cleanupExpiredCache();
    }, 60000); // Every minute
  }

  // ============================================================================
  // STOCK MARKET DATA METHODS
  // ============================================================================

  async getStockData(): Promise<NormalizedAsset[]> {
    try {
      // Try Finnhub first (highest priority)
      const finnhubData = await this.getStockDataFromFinnhub();
      if (finnhubData && finnhubData.length > 0) {
        return finnhubData;
      }
    } catch (error) {
      console.warn('Finnhub failed, trying Alpha Vantage...');
    }

    try {
      // Fallback to Alpha Vantage
      const alphaVantageData = await this.getStockDataFromAlphaVantage();
      if (alphaVantageData && alphaVantageData.length > 0) {
        return alphaVantageData;
      }
    } catch (error) {
      console.warn('Alpha Vantage failed, trying Twelve Data...');
    }

    try {
      // Final fallback to Twelve Data
      const twelveDataData = await this.getStockDataFromTwelveData();
      if (twelveDataData && twelveDataData.length > 0) {
        return twelveDataData;
      }
    } catch (error) {
      console.warn('Twelve Data failed');
    }

    // Return empty data if all APIs fail
    return this.getEmptyStockData();
  }

  private async getStockDataFromFinnhub(): Promise<NormalizedAsset[]> {
    const symbols = DEFAULT_STOCK_SYMBOLS.slice(0, 10); // Limit to prevent rate limit issues
    const results: NormalizedAsset[] = [];

    for (const symbol of symbols) {
      try {
        const data = await rateLimitManager.scheduleRequest('finnhub', async () => {
          const response = await axios.get('https://finnhub.io/api/v1/quote', {
            params: { symbol, token: API_KEYS.finnhub },
            timeout: 10000
          });
          return response.data;
        }, 'high');

        if (data && data.c && data.d) {
          results.push({
            asset: symbol,
            symbol: symbol,
            price: data.c,
            change24h: data.dp,
            volume24h: data.v || 0,
            marketCap: 0, // Finnhub doesn't provide market cap in quote endpoint
            source: 'Finnhub',
            lastUpdated: Date.now(),
            high24h: data.h,
            low24h: data.l,
            open24h: data.o
          });
        }
      } catch (error) {
        console.warn(`Failed to fetch ${symbol} from Finnhub:`, error);
      }
    }

    return results;
  }

  private async getStockDataFromAlphaVantage(): Promise<NormalizedAsset[]> {
    const symbols = DEFAULT_STOCK_SYMBOLS.slice(0, 4); // Alpha Vantage has very low rate limit
    const results: NormalizedAsset[] = [];

    for (const symbol of symbols) {
      try {
        const data = await rateLimitManager.scheduleRequest('alphaVantage', async () => {
          const response = await axios.get('https://www.alphavantage.co/query', {
            params: {
              function: 'GLOBAL_QUOTE',
              symbol,
              apikey: API_KEYS.alphaVantage
            },
            timeout: 10000
          });
          return response.data;
        }, 'medium');

        if (data && data['Global Quote'] && data['Global Quote']['05. price']) {
          const quote = data['Global Quote'];
          results.push({
            asset: symbol,
            symbol: symbol,
            price: parseFloat(quote['05. price']),
            change24h: parseFloat(quote['10. change percent'].replace('%', '')),
            volume24h: parseInt(quote['06. volume']),
            marketCap: 0, // Alpha Vantage doesn't provide market cap in global quote
            source: 'Alpha Vantage',
            lastUpdated: Date.now(),
            high24h: parseFloat(quote['03. high']),
            low24h: parseFloat(quote['04. low']),
            open24h: parseFloat(quote['02. open'])
          });
        }
      } catch (error) {
        console.warn(`Failed to fetch ${symbol} from Alpha Vantage:`, error);
      }
    }

    return results;
  }

  private async getStockDataFromTwelveData(): Promise<NormalizedAsset[]> {
    const symbols = DEFAULT_STOCK_SYMBOLS.slice(0, 6); // Twelve Data has moderate rate limit
    const results: NormalizedAsset[] = [];

    for (const symbol of symbols) {
      try {
        const data = await rateLimitManager.scheduleRequest('twelveData', async () => {
          const response = await axios.get('https://api.twelvedata.com/quote', {
            params: {
              symbol,
              apikey: API_KEYS.twelveData
            },
            timeout: 10000
          });
          return response.data;
        }, 'medium');

        if (data && data.price) {
          results.push({
            asset: symbol,
            symbol: symbol,
            price: parseFloat(data.price),
            change24h: parseFloat(data.percent_change || '0'),
            volume24h: parseInt(data.volume || '0'),
            marketCap: parseFloat(data.market_cap || '0'),
            source: 'Twelve Data',
            lastUpdated: Date.now(),
            high24h: parseFloat(data.high || '0'),
            low24h: parseFloat(data.low || '0'),
            open24h: parseFloat(data.open || '0')
          });
        }
      } catch (error) {
        console.warn(`Failed to fetch ${symbol} from Twelve Data:`, error);
      }
    }

    return results;
  }

  // ============================================================================
  // DIGITAL ASSETS DATA METHODS
  // ============================================================================

  async getDigitalAssetsData(): Promise<NormalizedAsset[]> {
    try {
      // Try CoinGecko first (highest rate limit)
      const coinGeckoData = await this.getDigitalAssetsFromCoinGecko();
      if (coinGeckoData && coinGeckoData.length > 0) {
        return coinGeckoData;
      }
    } catch (error) {
      console.warn('CoinGecko failed, trying CoinMarketCap...');
    }

    try {
      // Fallback to CoinMarketCap
      const coinMarketCapData = await this.getDigitalAssetsFromCoinMarketCap();
      if (coinMarketCapData && coinMarketCapData.length > 0) {
        return coinMarketCapData;
      }
    } catch (error) {
      console.warn('CoinMarketCap failed');
    }

    // Return empty data if all APIs fail
    return this.getEmptyDigitalAssetsData();
  }

  private async getDigitalAssetsFromCoinGecko(): Promise<NormalizedAsset[]> {
    try {
      const data = await rateLimitManager.scheduleRequest('coinGecko', async () => {
        const response = await axios.get('https://api.coingecko.com/api/v3/coins/markets', {
          params: {
            vs_currency: 'usd',
            order: 'market_cap_desc',
            per_page: 20,
            page: 1,
            sparkline: false
          },
          timeout: 10000
        });
        return response.data;
      }, 'high');

      return data.map((coin: any) => ({
        asset: coin.symbol.toUpperCase(),
        symbol: coin.symbol.toUpperCase(),
        price: coin.current_price,
        change24h: coin.price_change_percentage_24h,
        volume24h: coin.total_volume,
        marketCap: coin.market_cap,
        source: 'CoinGecko',
        lastUpdated: Date.now(),
        high24h: coin.high_24h,
        low24h: coin.low_24h
      }));
    } catch (error) {
      console.error('Failed to fetch from CoinGecko:', error);
      return [];
    }
  }

  private async getDigitalAssetsFromCoinMarketCap(): Promise<NormalizedAsset[]> {
    try {
      const data = await rateLimitManager.scheduleRequest('coinMarketCap', async () => {
        const response = await axios.get('https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest', {
          params: {
            start: 1,
            limit: 20,
            convert: 'USD'
          },
          headers: {
            'X-CMC_PRO_API_KEY': API_KEYS.coinMarketCap
          },
          timeout: 10000
        });
        return response.data;
      }, 'medium');

      return data.data.map((coin: any) => ({
        asset: coin.symbol,
        symbol: coin.symbol,
        price: coin.quote.USD.price,
        change24h: coin.quote.USD.percent_change_24h,
        volume24h: coin.quote.USD.volume_24h,
        marketCap: coin.quote.USD.market_cap,
        source: 'CoinMarketCap',
        lastUpdated: Date.now()
      }));
    } catch (error) {
      console.error('Failed to fetch from CoinMarketCap:', error);
      return [];
    }
  }

  // ============================================================================
  // ENHANCED DATA METHODS
  // ============================================================================

  async getEnhancedStockData(symbol: string): Promise<any> {
    try {
      // Try to get P/E ratio from Alpha Vantage
      const peData = await rateLimitManager.scheduleRequest('alphaVantage', async () => {
        const response = await axios.get('https://www.alphavantage.co/query', {
          params: {
            function: 'OVERVIEW',
            symbol,
            apikey: API_KEYS.alphaVantage
          },
          timeout: 10000
        });
        return response.data;
      }, 'low');

      if (peData && peData.PERatio) {
        return {
          pe: parseFloat(peData.PERatio),
          marketCap: parseFloat(peData.MarketCapitalization || '0'),
          dividendYield: peData.DividendYield ? parseFloat(peData.DividendYield) : null
        };
      }
    } catch (error) {
      console.warn(`Failed to get enhanced data for ${symbol}:`, error);
    }

    return { pe: null, marketCap: null, dividendYield: null };
  }

  // ============================================================================
  // MAIN MARKET DATA METHODS
  // ============================================================================

  async getAllMarketData(): Promise<MarketDataResponse> {
    this.totalRequests++;
    
    try {
      const [stockData, digitalAssetsData] = await Promise.all([
        this.getStockData(),
        this.getDigitalAssetsData()
      ]);

      const cacheStats = this.getCacheStats();
      
      return {
        stocks: stockData,
        digitalAssets: digitalAssetsData,
        timestamp: Date.now(),
        dataSources: this.getActiveDataSources(),
        errors: [],
        cacheInfo: {
          hitRate: this.totalRequests > 0 ? (this.cachedRequests / this.totalRequests) * 100 : 0,
          totalRequests: this.totalRequests,
          cachedRequests: this.cachedRequests
        }
      };
    } catch (error) {
      console.error('Error fetching all market data:', error);
      return {
        stocks: this.getEmptyStockData(),
        digitalAssets: this.getEmptyDigitalAssetsData(),
        timestamp: Date.now(),
        dataSources: ['Fallback'],
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        cacheInfo: {
          hitRate: 0,
          totalRequests: this.totalRequests,
          cachedRequests: this.cachedRequests
        }
      };
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private getEmptyStockData(): NormalizedAsset[] {
    return DEFAULT_STOCK_SYMBOLS.map(symbol => ({
      asset: symbol,
      symbol: symbol,
      price: 0,
      change24h: 0,
      volume24h: 0,
      marketCap: 0,
      source: 'Fallback',
      lastUpdated: Date.now()
    }));
  }

  private getEmptyDigitalAssetsData(): NormalizedAsset[] {
    return DEFAULT_CRYPTO_IDS.map(id => ({
      asset: id.toUpperCase(),
      symbol: id.toUpperCase(),
      price: 0,
      change24h: 0,
      volume24h: 0,
      marketCap: 0,
      source: 'Fallback',
      lastUpdated: Date.now()
    }));
  }

  private getActiveDataSources(): string[] {
    const sources: string[] = [];
    if (this.cache.has('stocks')) sources.push('Stock Market APIs');
    if (this.cache.has('digitalAssets')) sources.push('Digital Assets APIs');
    if (sources.length === 0) sources.push('Fallback');
    return sources;
  }

  getCacheStats() {
    return rateLimitManager.getCacheStats();
  }

  private cleanupExpiredCache() {
    const now = Date.now();
    for (const [key, value] of this.cache) {
      if (now - value.timestamp >= this.CACHE_DURATION_MS) {
        this.cache.delete(key);
      }
    }
  }

  // Get rate limit manager status
  getRateLimitStatus() {
    return rateLimitManager.getQueueStatus();
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
    rateLimitManager.clearCache();
  }
}

// Export singleton instance
export const enhancedMarketDataService = new EnhancedMarketDataService(); 