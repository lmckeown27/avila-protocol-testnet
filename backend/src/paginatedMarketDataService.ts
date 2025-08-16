/**
 * Paginated Market Data Service
 * Implements paginated, lazy-loaded data fetching with real-time API rate limit monitoring
 * Uses dynamic company discovery instead of hardcoded asset lists
 */

import { enhancedRateLimitMonitor, PaginationOptions, PaginatedResponse, APIHealthStatus } from './enhancedRateLimitMonitor';
import { companyDiscoveryService, CompanyInfo } from './companyDiscoveryService';
import { hybridCacheService, HybridAssetData } from './hybridCacheService';
import axios from 'axios';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

// ============================================================================
// INTERFACES & TYPES
// ============================================================================

export interface Asset {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
  source: string;
  lastUpdated: number;
  category: 'stock' | 'etf' | 'crypto';
  sector?: string;
  industry?: string;
  pe?: number | null;
  dividendYield?: number | null;
  high24h?: number;
  low24h?: number;
  open24h?: number;
}

export interface StockAsset extends Asset {
  category: 'stock';
  sector: string;
  industry: string;
  pe: number | null;
  dividendYield: number | null;
}

export interface ETFAsset extends Asset {
  category: 'etf';
  sector: string;
  expenseRatio?: number;
  holdings?: number;
}

export interface CryptoAsset extends Asset {
  category: 'crypto';
  circulatingSupply?: number;
  maxSupply?: number;
  rank?: number;
}

export interface SearchResult {
  assets: Asset[];
  total: number;
  dataSource: string;
  cacheStatus: 'hit' | 'miss' | 'stale';
  searchTime: number;
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
// PAGINATED MARKET DATA SERVICE CLASS
// ============================================================================

export class PaginatedMarketDataService {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private readonly CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes
  private readonly DEFAULT_PAGE_SIZE = 50;
  private readonly MAX_PAGE_SIZE = 100;

  constructor() {
    // Start cache cleanup interval
    setInterval(() => this.cleanupExpiredCache(), 60000); // Every minute
  }

  // ============================================================================
  // STOCK MARKET DATA METHODS
  // ============================================================================

  async getStocks(options: PaginationOptions = { page: 1, limit: 25 }): Promise<PaginatedResponse<StockAsset>> {
    const startTime = Date.now();
    const page = options.page || 1;
    const limit = options.limit || 25;
    const search = options.search;
    const category = options.category;
    const sortBy = options.sortBy || 'symbol';
    const sortOrder = options.sortOrder || 'asc';

    try {
      console.log(`📈 Fetching stocks page ${page}, limit ${limit}, search: ${search || 'none'}, category: ${category || 'all'}`);

      // Get discovered companies
      const discoveredCompanies = await companyDiscoveryService.getDiscoveredCompanies();
      let availableStocks = discoveredCompanies.stocks;

      // Apply search filter
      if (search) {
        availableStocks = availableStocks.filter(stock =>
          stock.symbol.toLowerCase().includes(search.toLowerCase()) ||
          stock.name.toLowerCase().includes(search.toLowerCase())
        );
      }

      // Apply category filter
      if (category && category !== 'all') {
        availableStocks = availableStocks.filter(stock => stock.sector === category);
      }

      // Apply sorting
      availableStocks.sort((a, b) => {
        let aValue: any, bValue: any;
        
        switch (sortBy) {
          case 'symbol':
            aValue = a.symbol;
            bValue = b.symbol;
            break;
          case 'name':
            aValue = a.name;
            bValue = b.name;
            break;
          case 'sector':
            aValue = a.sector;
            bValue = b.sector;
            break;
          default:
            aValue = a.symbol;
            bValue = b.symbol;
        }

        if (sortOrder === 'desc') {
          [aValue, bValue] = [bValue, aValue];
        }

        return aValue.localeCompare(bValue);
      });

      // Calculate pagination
      const total = availableStocks.length;
      const validatedLimit = Math.min(limit, this.MAX_PAGE_SIZE);
      const totalPages = Math.ceil(total / validatedLimit);
      const startIndex = (page - 1) * validatedLimit;
      const endIndex = startIndex + validatedLimit;
      const paginatedStocks = availableStocks.slice(startIndex, endIndex);

      // Fetch market data for paginated stocks
      const stocksWithMarketData = await this.fetchStockMarketData(paginatedStocks);

      const processingTime = Date.now() - startTime;

      return {
        data: stocksWithMarketData,
        pagination: {
          page,
          limit: validatedLimit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        },
        metadata: {
          timestamp: new Date().toISOString(),
          dataSource: 'Multiple APIs - Optimized',
          processingTime
        }
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Error fetching stocks:', errorMessage);
      throw new Error(`Failed to fetch stocks: ${errorMessage}`);
    }
  }

  private async fetchStockMarketData(companies: CompanyInfo[]): Promise<StockAsset[]> {
    const stocksWithData: StockAsset[] = [];
    
    // Process companies in batches to respect rate limits
    const batchSize = 10;
    for (let i = 0; i < companies.length; i += batchSize) {
      const batch = companies.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (company) => {
        try {
          const marketData = await this.fetchSingleStockData(company.symbol);
          if (marketData) {
            return {
              id: company.symbol,
              symbol: company.symbol,
              name: company.name,
              price: marketData.price,
              change24h: marketData.change24h,
              volume24h: marketData.volume24h,
              marketCap: marketData.marketCap,
              source: marketData.source,
              lastUpdated: Date.now(),
              category: 'stock' as const,
              sector: company.sector || 'Unknown',
              industry: company.industry || 'Unknown',
              pe: marketData.pe,
              dividendYield: marketData.dividendYield,
              high24h: marketData.high24h,
              low24h: marketData.low24h,
              open24h: marketData.open24h
            };
          }
        } catch (error) {
          console.warn(`Failed to fetch market data for ${company.symbol}:`, error);
        }
        return null;
      });
      
      const batchResults = await Promise.all(batchPromises);
      stocksWithData.push(...batchResults.filter(Boolean) as StockAsset[]);
      
      // Small delay between batches to respect rate limits
      if (i + batchSize < companies.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return stocksWithData;
  }

  private async fetchSingleStockData(symbol: string): Promise<any> {
    try {
      // First, try to get data from hybrid cache
      const hybridData = await hybridCacheService.getHybridAssetData(symbol, 'stock');
      if (hybridData && hybridData.cacheStatus === 'fresh') {
        console.log(`📋 Using hybrid cache for ${symbol} (${hybridData.cacheStatus})`);
        return {
          price: hybridData.liveData.price,
          change24h: hybridData.liveData.change24h,
          volume24h: hybridData.liveData.volume24h,
          marketCap: hybridData.liveData.marketCap,
          source: hybridData.liveData.source,
          pe: hybridData.liveData.pe,
          dividendYield: hybridData.liveData.dividendYield,
          high24h: hybridData.liveData.high24h,
          low24h: hybridData.liveData.low24h,
          open24h: hybridData.liveData.open24h
        };
      }
      
      // If cache miss or stale, try external APIs
      console.log(`🌐 Fetching fresh data for ${symbol} from external APIs...`);
      
      try {
        // Try Finnhub first
        const finnhubData = await this.fetchStockDataFromFinnhub(symbol);
        if (finnhubData) return finnhubData;
      } catch (error) {
        console.warn(`Finnhub failed for ${symbol}, trying Alpha Vantage...`);
      }

      try {
        // Fallback to Alpha Vantage
        const alphaVantageData = await this.fetchStockDataFromAlphaVantage(symbol);
        if (alphaVantageData) return alphaVantageData;
      } catch (error) {
        console.warn(`Alpha Vantage failed for ${symbol}, trying Twelve Data...`);
      }

      try {
        // Final fallback to Twelve Data
        const twelveDataData = await this.fetchStockDataFromTwelveData(symbol);
        if (twelveDataData) return twelveDataData;
      } catch (error) {
        console.warn(`Twelve Data failed for ${symbol}`);
      }

      // If all APIs fail, return stale cache data if available
      if (hybridData && hybridData.cacheStatus === 'stale') {
        console.log(`📋 Using stale cache data for ${symbol} as fallback`);
        return {
          price: hybridData.liveData.price,
          change24h: hybridData.liveData.change24h,
          volume24h: hybridData.liveData.volume24h,
          marketCap: hybridData.liveData.marketCap,
          source: `${hybridData.liveData.source} (Stale)`,
          pe: hybridData.liveData.pe,
          dividendYield: hybridData.liveData.dividendYield,
          high24h: hybridData.liveData.high24h,
          low24h: hybridData.liveData.low24h,
          open24h: hybridData.liveData.open24h
        };
      }

      return null;
    } catch (error) {
      console.error(`Error fetching data for ${symbol}:`, error);
      return null;
    }
  }

  private async fetchStockDataFromFinnhub(symbol: string): Promise<any> {
    try {
      const data = await enhancedRateLimitMonitor.scheduleRequest('finnhub', async () => {
        const response = await axios.get('https://finnhub.io/api/v1/quote', {
          params: { symbol, token: API_KEYS.finnhub },
          timeout: 10000
        });
        return response.data;
      }, 'high');

      if (data && typeof data === 'object' && data.c && typeof data.d === 'number') {
        return {
          price: data.c,
          change24h: data.dp,
          volume24h: data.v || 0,
          marketCap: 0, // Finnhub doesn't provide market cap in quote endpoint
          source: 'Finnhub',
          pe: null,
          dividendYield: null,
          high24h: data.h,
          low24h: data.l,
          open24h: data.o
        };
      }
    } catch (error) {
      console.warn(`Failed to fetch ${symbol} from Finnhub:`, error);
    }
    return null;
  }

  private async fetchStockDataFromAlphaVantage(symbol: string): Promise<any> {
    try {
      const data = await enhancedRateLimitMonitor.scheduleRequest('alphaVantage', async () => {
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
        return {
          price: parseFloat(quote['05. price']) || 0,
          change24h: parseFloat(quote['10. change percent']?.replace('%', '') || '0'),
          volume24h: parseInt(quote['06. volume'] || '0'),
          marketCap: 0, // Alpha Vantage doesn't provide market cap in global quote
          source: 'Alpha Vantage',
          pe: null,
          dividendYield: null,
          high24h: parseFloat(quote['03. high'] || '0'),
          low24h: parseFloat(quote['04. low'] || '0'),
          open24h: parseFloat(quote['02. open'] || '0')
        };
      }
    } catch (error) {
      console.warn(`Failed to fetch ${symbol} from Alpha Vantage:`, error);
    }
    return null;
  }

  private async fetchStockDataFromTwelveData(symbol: string): Promise<any> {
    try {
      const data = await enhancedRateLimitMonitor.scheduleRequest('twelveData', async () => {
        const response = await axios.get('https://api.twelvedata.com/quote', {
          params: {
            symbol,
            apikey: API_KEYS.twelveData
          },
          timeout: 10000
        });
        return response.data;
      }, 'medium');

      if (data && typeof data === 'object' && data.price) {
        return {
          price: parseFloat(data.price) || 0,
          change24h: parseFloat(data.percent_change || '0'),
          volume24h: parseInt(data.volume || '0'),
          marketCap: parseFloat(data.market_cap || '0'),
          source: 'Twelve Data',
          pe: null,
          dividendYield: null,
          high24h: parseFloat(data.high || '0'),
          low24h: parseFloat(data.low || '0'),
          open24h: parseFloat(data.open || '0')
        };
      }
    } catch (error) {
      console.warn(`Failed to fetch ${symbol} from Twelve Data:`, error);
    }
    return null;
  }

  // ============================================================================
  // ETF DATA METHODS
  // ============================================================================

  async getETFs(options: PaginationOptions = { page: 1, limit: 25 }): Promise<PaginatedResponse<ETFAsset>> {
    const startTime = Date.now();
    const page = options.page || 1;
    const limit = options.limit || 25;
    const search = options.search;
    const category = options.category;
    const sortBy = options.sortBy || 'symbol';
    const sortOrder = options.sortOrder || 'asc';

    try {
      console.log(`📊 Fetching ETFs page ${page}, limit ${limit}, search: ${search || 'none'}, category: ${category || 'all'}`);

      // Get discovered companies
      const discoveredCompanies = await companyDiscoveryService.getDiscoveredCompanies();
      let availableETFs = discoveredCompanies.etfs;

      // Apply search filter
      if (search) {
        availableETFs = availableETFs.filter(etf =>
          etf.symbol.toLowerCase().includes(search.toLowerCase()) ||
          etf.name.toLowerCase().includes(search.toLowerCase())
        );
      }

      // Apply category filter
      if (category && category !== 'all') {
        availableETFs = availableETFs.filter(etf => etf.sector === category);
      }

      // Apply sorting
      availableETFs.sort((a, b) => {
        let aValue: any, bValue: any;
        
        switch (sortBy) {
          case 'symbol':
            aValue = a.symbol;
            bValue = b.symbol;
            break;
          case 'name':
            aValue = a.name;
            bValue = b.name;
            break;
          case 'sector':
            aValue = a.sector;
            bValue = b.sector;
            break;
          default:
            aValue = a.symbol;
            bValue = b.symbol;
        }

        if (sortOrder === 'desc') {
          [aValue, bValue] = [bValue, aValue];
        }

        return aValue.localeCompare(bValue);
      });

      // Calculate pagination
      const total = availableETFs.length;
      const validatedLimit = Math.min(limit, this.MAX_PAGE_SIZE);
      const totalPages = Math.ceil(total / validatedLimit);
      const startIndex = (page - 1) * validatedLimit;
      const endIndex = startIndex + validatedLimit;
      const paginatedETFs = availableETFs.slice(startIndex, endIndex);

      // Fetch market data for paginated ETFs
      const etfsWithMarketData = await this.fetchETFMarketData(paginatedETFs);

      const processingTime = Date.now() - startTime;

      return {
        data: etfsWithMarketData,
        pagination: {
          page,
          limit: validatedLimit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        },
        metadata: {
          timestamp: new Date().toISOString(),
          dataSource: 'Multiple APIs - Optimized',
          processingTime
        }
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Error fetching ETFs:', errorMessage);
      throw new Error(`Failed to fetch ETFs: ${errorMessage}`);
    }
  }

  private async fetchETFMarketData(etfs: CompanyInfo[]): Promise<ETFAsset[]> {
    // ETFs are essentially stocks, so we can reuse the stock fetching logic
    const etfAssets = await this.fetchStockMarketData(etfs);
    
    return etfAssets.map(stock => ({
      ...stock,
      category: 'etf' as const,
      sector: stock.sector,
      expenseRatio: undefined, // Would need additional API calls
      holdings: undefined // Would need additional API calls
    }));
  }

  // ============================================================================
  // CRYPTO DATA METHODS
  // ============================================================================

  async getCrypto(options: PaginationOptions = { page: 1, limit: 25 }): Promise<PaginatedResponse<CryptoAsset>> {
    const startTime = Date.now();
    const page = options.page || 1;
    const limit = options.limit || 25;
    const search = options.search;
    const category = options.category;
    const sortBy = options.sortBy || 'symbol';
    const sortOrder = options.sortOrder || 'asc';

    try {
      console.log(`🪙 Fetching crypto page ${page}, limit ${limit}, search: ${search || 'none'}, category: ${category || 'all'}`);

      // Get discovered companies
      const discoveredCompanies = await companyDiscoveryService.getDiscoveredCompanies();
      let availableCrypto = discoveredCompanies.crypto;

      // Apply search filter
      if (search) {
        availableCrypto = availableCrypto.filter(crypto =>
          crypto.symbol.toLowerCase().includes(search.toLowerCase()) ||
          crypto.name.toLowerCase().includes(search.toLowerCase())
        );
      }

      // Apply category filter
      if (category && category !== 'all') {
        availableCrypto = availableCrypto.filter(crypto => crypto.sector === category);
      }

      // Apply sorting
      availableCrypto.sort((a, b) => {
        let aValue: any, bValue: any;
        
        switch (sortBy) {
          case 'symbol':
            aValue = a.symbol;
            bValue = b.symbol;
            break;
          case 'name':
            aValue = a.name;
            bValue = b.name;
            break;
          case 'sector':
            aValue = a.sector;
            bValue = b.sector;
            break;
          default:
            aValue = a.symbol;
            bValue = b.symbol;
        }

        if (sortOrder === 'desc') {
          [aValue, bValue] = [bValue, aValue];
        }

        return aValue.localeCompare(bValue);
      });

      // Calculate pagination
      const total = availableCrypto.length;
      const validatedLimit = Math.min(limit, this.MAX_PAGE_SIZE);
      const totalPages = Math.ceil(total / validatedLimit);
      const startIndex = (page - 1) * validatedLimit;
      const endIndex = startIndex + validatedLimit;
      const paginatedCrypto = availableCrypto.slice(startIndex, endIndex);

      // Fetch market data for paginated crypto
      const cryptoWithMarketData = await this.fetchCryptoMarketData(paginatedCrypto);

      const processingTime = Date.now() - startTime;

      return {
        data: cryptoWithMarketData,
        pagination: {
          page,
          limit: validatedLimit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        },
        metadata: {
          timestamp: new Date().toISOString(),
          dataSource: 'Multiple APIs - Optimized',
          processingTime
        }
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Error fetching crypto:', errorMessage);
      throw new Error(`Failed to fetch crypto: ${errorMessage}`);
    }
  }

  private async fetchCryptoMarketData(cryptoList: CompanyInfo[]): Promise<CryptoAsset[]> {
    try {
      // Try CoinGecko first
      const coinGeckoCrypto = await this.fetchCryptoFromCoinGecko(cryptoList);
      if (coinGeckoCrypto.length > 0) {
        return coinGeckoCrypto;
      }
    } catch (error) {
      console.warn('CoinGecko failed, trying CoinMarketCap...');
    }

    try {
      // Fallback to CoinMarketCap
      const coinMarketCapCrypto = await this.fetchCryptoFromCoinMarketCap(cryptoList);
      if (coinMarketCapCrypto.length > 0) {
        return coinMarketCapCrypto;
      }
    } catch (error) {
      console.warn('CoinMarketCap failed');
    }

    // Return empty array if all APIs fail
    return [];
  }

  private async fetchCryptoFromCoinGecko(cryptoList: CompanyInfo[]): Promise<CryptoAsset[]> {
    try {
      // First, try to get data from hybrid cache
      const cachedAssets: CryptoAsset[] = [];
      const uncachedSymbols: CompanyInfo[] = [];
      
      for (const crypto of cryptoList) {
        const hybridData = await hybridCacheService.getHybridAssetData(crypto.symbol, 'crypto');
        if (hybridData && hybridData.cacheStatus === 'fresh') {
          console.log(`📋 Using hybrid cache for ${crypto.symbol} (${hybridData.cacheStatus})`);
          cachedAssets.push({
            id: crypto.symbol.toLowerCase(),
            symbol: hybridData.metadata.symbol,
            name: hybridData.metadata.name,
            price: hybridData.liveData.price,
            change24h: hybridData.liveData.change24h,
            volume24h: hybridData.liveData.volume24h,
            marketCap: hybridData.liveData.marketCap,
            source: hybridData.liveData.source,
            lastUpdated: hybridData.liveData.lastUpdated,
            category: 'crypto' as const,
            high24h: hybridData.liveData.high24h,
            low24h: hybridData.liveData.low24h,
            open24h: hybridData.liveData.open24h,
            circulatingSupply: undefined,
            maxSupply: undefined,
            rank: undefined
          });
        } else {
          uncachedSymbols.push(crypto);
        }
      }
      
      // If we have all data from cache, return it
      if (cachedAssets.length === cryptoList.length) {
        console.log(`📋 All ${cachedAssets.length} crypto assets served from hybrid cache`);
        return cachedAssets;
      }
      
      // For uncached symbols, fetch from API
      if (uncachedSymbols.length > 0) {
        console.log(`🌐 Fetching ${uncachedSymbols.length} uncached crypto assets from CoinGecko...`);
        
        const cryptoIds = uncachedSymbols.map(crypto => crypto.symbol.toLowerCase()).join(',');
        
        if (!cryptoIds) {
          return cachedAssets;
        }
        
        const data = await enhancedRateLimitMonitor.scheduleRequest('coinGecko', async () => {
          const response = await axios.get('https://api.coingecko.com/api/v3/coins/markets', {
            params: {
              vs_currency: 'usd',
              ids: cryptoIds,
              order: 'market_cap_desc',
              per_page: 250,
              page: 1,
              sparkline: false
            },
            timeout: 10000
          });
          return response.data;
        }, 'high');

        if (!Array.isArray(data)) {
          console.warn('CoinGecko returned non-array data:', data);
          return cachedAssets;
        }

        const apiAssets = data.map((coin: any) => ({
          id: coin.id,
          symbol: coin.symbol.toUpperCase(),
          name: coin.name,
          price: coin.current_price,
          change24h: coin.price_change_percentage_24h,
          volume24h: coin.total_volume,
          marketCap: coin.market_cap,
          source: 'CoinGecko',
          lastUpdated: Date.now(),
          category: 'crypto' as const,
          high24h: coin.high_24h,
          low24h: coin.low_24h,
          open24h: undefined,
          circulatingSupply: coin.circulating_supply,
          maxSupply: coin.max_supply,
          rank: coin.market_cap_rank
        }));
        
        // Combine cached and API data
        return [...cachedAssets, ...apiAssets];
      }
      
      return cachedAssets;
    } catch (error) {
      console.error('Failed to fetch from CoinGecko:', error);
      
      // Try to return cached data as fallback
      const fallbackAssets: CryptoAsset[] = [];
      for (const crypto of cryptoList) {
        const hybridData = await hybridCacheService.getHybridAssetData(crypto.symbol, 'crypto');
        if (hybridData && hybridData.cacheStatus === 'stale') {
          console.log(`📋 Using stale cache data for ${crypto.symbol} as fallback`);
          fallbackAssets.push({
            id: crypto.symbol.toLowerCase(),
            symbol: hybridData.metadata.symbol,
            name: hybridData.metadata.name,
            price: hybridData.liveData.price,
            change24h: hybridData.liveData.change24h,
            volume24h: hybridData.liveData.volume24h,
            marketCap: hybridData.liveData.marketCap,
            source: `${hybridData.liveData.source} (Stale)`,
            lastUpdated: hybridData.liveData.lastUpdated,
            category: 'crypto' as const,
            high24h: hybridData.liveData.high24h,
            low24h: hybridData.liveData.low24h,
            open24h: hybridData.liveData.open24h,
            circulatingSupply: undefined,
            maxSupply: undefined,
            rank: undefined
          });
        }
      }
      
      return fallbackAssets;
    }
  }

  private async fetchCryptoFromCoinMarketCap(cryptoList: CompanyInfo[]): Promise<CryptoAsset[]> {
    try {
      // If no crypto list, return empty array
      if (!cryptoList || cryptoList.length === 0) {
        return [];
      }

      const data = await enhancedRateLimitMonitor.scheduleRequest('coinMarketCap', async () => {
        const response = await axios.get('https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest', {
          params: {
            start: 1,
            limit: 250,
            convert: 'USD'
          },
          headers: {
            'X-CMC_PRO_API_KEY': API_KEYS.coinMarketCap
          },
          timeout: 10000
        });
        return response.data;
      }, 'medium');

      if (!data || !data.data || !Array.isArray(data.data)) {
        console.warn('CoinMarketCap returned invalid data structure:', data);
        return [];
      }

      // Filter for requested crypto symbols
      const requestedSymbols = new Set(cryptoList.map(c => c.symbol.toUpperCase()));
      
      return data.data
        .filter((coin: any) => requestedSymbols.has(coin.symbol))
        .map((coin: any) => ({
          id: coin.slug,
          symbol: coin.symbol,
          name: coin.name,
          price: coin.quote?.USD?.price || 0,
          change24h: coin.quote?.USD?.percent_change_24h || 0,
          volume24h: coin.quote?.USD?.volume_24h || 0,
          marketCap: coin.quote?.USD?.market_cap || 0,
          source: 'CoinMarketCap',
          lastUpdated: Date.now(),
          category: 'crypto' as const,
          high24h: undefined,
          low24h: undefined,
          open24h: undefined,
          circulatingSupply: coin.circulating_supply,
          maxSupply: coin.max_supply,
          rank: coin.cmc_rank
        }));
    } catch (error) {
      console.error('Failed to fetch from CoinMarketCap:', error);
      return [];
    }
  }

  // ============================================================================
  // SEARCH METHODS
  // ============================================================================

  async searchAssets(query: string, category?: 'stock' | 'etf' | 'crypto'): Promise<SearchResult> {
    const startTime = Date.now();
    
    try {
      let results: Asset[] = [];
      let dataSource = '';

      if (!category || category === 'stock') {
        const stocks = await this.getStocks({ page: 1, limit: 100, search: query });
        results.push(...stocks.data);
        dataSource = stocks.metadata.dataSource;
      }

      if (!category || category === 'etf') {
        const etfs = await this.getETFs({ page: 1, limit: 100, search: query });
        results.push(...etfs.data);
        dataSource = dataSource ? `${dataSource}, ${etfs.metadata.dataSource}` : etfs.metadata.dataSource;
      }

      if (!category || category === 'crypto') {
        const crypto = await this.getCrypto({ page: 1, limit: 100, search: query });
        results.push(...crypto.data);
        dataSource = dataSource ? `${dataSource}, ${crypto.metadata.dataSource}` : crypto.metadata.dataSource;
      }

      // Remove duplicates and sort by relevance
      const uniqueResults = this.removeDuplicates(results);
      const sortedResults = this.sortByRelevance(uniqueResults, query);

      return {
        assets: sortedResults.slice(0, 50), // Limit search results
        total: sortedResults.length,
        dataSource,
        cacheStatus: 'miss',
        searchTime: Date.now() - startTime
      };
    } catch (error) {
      console.error('Search error:', error);
      throw error;
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private sortAssets<T extends Asset>(assets: T[], sortBy: string, sortOrder: 'asc' | 'desc'): T[] {
    return [...assets].sort((a, b) => {
      let aValue: any = a[sortBy as keyof T];
      let bValue: any = b[sortBy as keyof T];

      // Handle null/undefined values
      if (aValue === null || aValue === undefined) aValue = 0;
      if (bValue === null || bValue === undefined) bValue = 0;

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  }

  private sortByRelevance(assets: Asset[], query: string): Asset[] {
    const queryLower = query.toLowerCase();
    
    return assets.sort((a, b) => {
      const aScore = this.calculateRelevanceScore(a, queryLower);
      const bScore = this.calculateRelevanceScore(b, queryLower);
      return bScore - aScore; // Higher score first
    });
  }

  private calculateRelevanceScore(asset: Asset, query: string): number {
    let score = 0;
    
    // Exact symbol match gets highest score
    if (asset.symbol.toLowerCase() === query) score += 100;
    // Symbol starts with query
    else if (asset.symbol.toLowerCase().startsWith(query)) score += 50;
    // Symbol contains query
    else if (asset.symbol.toLowerCase().includes(query)) score += 25;
    
    // Name contains query
    if (asset.name.toLowerCase().includes(query)) score += 20;
    
    // Higher market cap gets slight boost
    score += Math.log10(asset.marketCap + 1) * 0.1;
    
    return score;
  }

  private removeDuplicates(assets: Asset[]): Asset[] {
    const seen = new Set<string>();
    return assets.filter(asset => {
      const key = `${asset.symbol}_${asset.category}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  private getDataSourceInfo(assetType: string): string {
    const sources = enhancedRateLimitMonitor.getHealthStatus()
      .filter(api => api.status === 'healthy')
      .map(api => api.name);
    
    return sources.length > 0 ? sources.join(', ') : 'Fallback';
  }

  private cleanupExpiredCache() {
    const now = Date.now();
    for (const [key, value] of this.cache) {
      if (now - value.timestamp >= value.ttl) {
        this.cache.delete(key);
      }
    }
  }

  // Get cache statistics
  getCacheStats() {
    const now = Date.now();
    let totalItems = 0;
    let expiredItems = 0;
    let validItems = 0;
    
    for (const [key, value] of this.cache) {
      totalItems++;
      if (now - value.timestamp < value.ttl) {
        validItems++;
      } else {
        expiredItems++;
      }
    }
    
    return {
      totalItems,
      validItems,
      expiredItems,
      cacheSize: this.cache.size
    };
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
  }

  // Get rate limit status
  getRateLimitStatus() {
    return enhancedRateLimitMonitor.getRateLimitStatus();
  }

  // Get company discovery stats
  async getCompanyDiscoveryStats() {
    return companyDiscoveryService.getDiscoveryStats();
  }
}

// Export singleton instance
export const paginatedMarketDataService = new PaginatedMarketDataService(); 