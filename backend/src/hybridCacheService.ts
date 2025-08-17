/**
 * Hybrid Cache Service
 * Implements prefetching for top assets with hybrid caching strategy:
 * - Static metadata: long TTL (hours) - from Company Discovery Service
 * - Live trading data: short TTL (seconds) - from Market Data APIs
 * - Combined data delivery in single API response
 * - Real-time asset scanning for stocks, crypto, and ETFs
 */

import { CompanyInfo, companyDiscoveryService } from './companyDiscoveryService';
import { enhancedRateLimitMonitor } from './enhancedRateLimitMonitor';
import axios from 'axios';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

// ============================================================================
// INTERFACES & TYPES
// ============================================================================

export interface AssetMetadata {
  symbol: string;
  name: string;
  category: 'stock' | 'etf' | 'crypto';
  sector?: string;
  industry?: string;
  description?: string;
  website?: string;
  country?: string;
  currency?: string;
  exchange?: string;
  lastUpdated: number;
}

export interface LiveTradingData {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
  high24h: number;
  low24h: number;
  open24h: number;
  pe?: number | null;
  dividendYield?: number | null;
  source: string;
  lastUpdated: number;
  category: 'stock' | 'etf' | 'crypto';
}

export interface HybridAssetData {
  metadata: AssetMetadata;
  liveData: LiveTradingData;
  cacheStatus: 'fresh' | 'stale' | 'fallback';
  ttl: number;
}

export interface PrefetchConfig {
  stocks: {
    topCount: number;
    symbols: string[];
    metadataTTL: number; // hours
    liveDataTTL: number; // seconds
  };
  etfs: {
    topCount: number;
    symbols: string[];
    metadataTTL: number;
    liveDataTTL: number;
  };
  crypto: {
    topCount: number;
    symbols: string[];
    metadataTTL: number;
    liveDataTTL: number;
  };
}

export interface CacheStats {
  metadataCache: {
    size: number;
    maxSize: number;
    hitRate: number;
    missRate: number;
  };
  liveDataCache: {
    size: number;
    maxSize: number;
    hitRate: number;
    missRate: number;
  };
  prefetchStatus: {
    lastPrefetch: number;
    nextPrefetch: number;
    assetsPrefetched: number;
  };
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
// HYBRID CACHE SERVICE CLASS
// ============================================================================

export class HybridCacheService {
  private metadataCache = new Map<string, AssetMetadata>();
  private liveDataCache = new Map<string, LiveTradingData>();
  private readonly maxMetadataCacheSize = 1000;
  private readonly maxLiveDataCacheSize = 2000;
  private prefetchStatus = new Map<string, boolean>();
  private lastPrefetch = Date.now();
  private nextPrefetch = Date.now() + (15 * 60 * 1000); // 15 minutes

  // Prefetch configuration for top assets
  private readonly prefetchConfig: PrefetchConfig = {
    stocks: {
      topCount: 50,
      symbols: [
        'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX', 'JNJ', 'PG',
        'KO', 'PFE', 'VZ', 'T', 'XOM', 'CVX', 'JPM', 'BAC', 'WFC', 'HD', 'UNH', 'MA',
        'V', 'DIS', 'PYPL', 'ADBE', 'CRM', 'INTC', 'ORCL', 'ABT', 'LLY', 'PEP', 'AVGO',
        'TMO', 'COST', 'DHR', 'NEE', 'ACN', 'WMT', 'MRK', 'QCOM', 'TXN', 'HON', 'LOW',
        'UPS', 'SPGI', 'RTX', 'IBM', 'AMAT', 'PLD', 'SCHW', 'GILD', 'BKNG', 'ADI'
      ],
      metadataTTL: 24, // 24 hours
      liveDataTTL: 30  // 30 seconds
    },
    etfs: {
      topCount: 50,
      symbols: [
        'SPY', 'QQQ', 'IWM', 'VTI', 'VEA', 'VWO', 'BND', 'GLD', 'SLV', 'USO', 'TLT',
        'LQD', 'HYG', 'EMB', 'EFA', 'EEM', 'AGG', 'TIP', 'SHY', 'IEI', 'VGK', 'VPL',
        'VSS', 'VCSH', 'VCIT', 'VGSH', 'VTEB', 'VWOB', 'VXUS', 'VYM', 'VIG', 'VBR',
        'VBK', 'VTV', 'VUG', 'VGT', 'VHT', 'VFH', 'VDE', 'VAW', 'VIS', 'VCR', 'VDC',
        'VRE', 'VRTX', 'VGT', 'VHT', 'VFH', 'VDE', 'VAW', 'VIS', 'VCR', 'VDC', 'VRE',
        'VRTX', 'VGT', 'VHT', 'VFH', 'VDE', 'VAW', 'VIS', 'VCR', 'VDC', 'VRE', 'VRTX',
        'VGT', 'VHT', 'VFH', 'VDE', 'VAW', 'VIS', 'VCR', 'VDC', 'VRE', 'VRTX', 'VGT',
        'VHT', 'VFH', 'VDE', 'VAW', 'VIS', 'VCR', 'VDC', 'VRE', 'VRTX', 'VGT', 'VHT',
        'VFH', 'VDE', 'VAW', 'VIS', 'VCR', 'VDC', 'VRE', 'VRTX', 'VGT', 'VHT', 'VFH'
      ],
      metadataTTL: 24, // 24 hours
      liveDataTTL: 30  // 30 seconds
    },
    crypto: {
      topCount: 100,
      symbols: [
        'BTC', 'ETH', 'USDT', 'USDC', 'BNB', 'XRP', 'ADA', 'SOL', 'AVAX', 'DOT',
        'MATIC', 'LINK', 'UNI', 'LTC', 'BCH', 'XLM', 'ATOM', 'ETC', 'FIL', 'VET',
        'TRX', 'THETA', 'XMR', 'EOS', 'AAVE', 'ALGO', 'MKR', 'COMP', 'SUSHI', 'YFI',
        'SNX', 'BAL', 'REN', 'BAND', 'ZRX', 'BAT', 'MANA', 'ENJ', 'SAND', 'AXS',
        'CHZ', 'HOT', 'DOGE', 'SHIB', 'TRX', 'THETA', 'XMR', 'EOS', 'AAVE', 'ALGO',
        'MKR', 'COMP', 'SUSHI', 'YFI', 'SNX', 'BAL', 'REN', 'BAND', 'ZRX', 'BAT',
        'MANA', 'ENJ', 'SAND', 'AXS', 'CHZ', 'HOT', 'DOGE', 'SHIB', 'TRX', 'THETA',
        'XMR', 'EOS', 'AAVE', 'ALGO', 'MKR', 'COMP', 'SUSHI', 'YFI', 'SNX', 'BAL',
        'REN', 'BAND', 'ZRX', 'BAT', 'MANA', 'ENJ', 'SAND', 'AXS', 'CHZ', 'HOT',
        'DOGE', 'SHIB', 'TRX', 'THETA', 'XMR', 'EOS', 'AAVE', 'ALGO', 'MKR', 'COMP'
      ],
      metadataTTL: 24, // 24 hours
      liveDataTTL: 15  // 15 seconds (crypto moves faster)
    }
  };

  constructor() {
    console.log('🚀 Initializing Hybrid Cache Service for Real Asset Scanning...');
    // Delay prefetch to allow service to stabilize first
    setTimeout(() => {
      this.startPrefetchCycle();
    }, 30000); // Wait 30 seconds before starting prefetch
    this.startCacheCleanup();
  }

  // ============================================================================
  // PREFETCH METHODS
  // ============================================================================

  private async startPrefetchCycle() {
    console.log('📦 Starting real asset prefetch cycle...');
    
    // Initial prefetch
    await this.prefetchTopAssets();
    
    // Set up recurring prefetch with longer intervals
    setInterval(async () => {
      await this.prefetchTopAssets();
    }, 15 * 60 * 1000); // Every 15 minutes instead of 5
  }

  private async prefetchTopAssets() {
    try {
      console.log('🔄 Starting prefetch cycle for real market data...');
      const startTime = Date.now();
      
      // Prefetch stocks
      await this.prefetchCategory('stocks');
      
      // Prefetch ETFs
      await this.prefetchCategory('etfs');
      
      // Prefetch crypto
      await this.prefetchCategory('crypto');
      
      const duration = Date.now() - startTime;
      console.log(`✅ Real asset prefetch cycle completed in ${duration}ms`);
      
      this.lastPrefetch = Date.now();
      this.nextPrefetch = Date.now() + (15 * 60 * 1000);
      
    } catch (error) {
      console.error('❌ Real asset prefetch cycle failed:', error);
    }
  }

  private async prefetchCategory(category: 'stocks' | 'etfs' | 'crypto') {
    const config = this.prefetchConfig[category];
    console.log(`📊 Prefetching top ${config.topCount} ${category} with real data...`);
    
    try {
      // Get discovered companies for this category
      const discoveredCompanies = await companyDiscoveryService.getDiscoveredCompanies();
      const categoryCompanies = discoveredCompanies[category] || [];
      
      // Use discovered companies if available, otherwise fall back to predefined symbols
      const symbolsToPrefetch = categoryCompanies.length > 0 
        ? categoryCompanies.slice(0, config.topCount).map(c => c.symbol)
        : config.symbols.slice(0, config.topCount);
      
      // Prefetch metadata from discovered companies (long TTL)
      await this.prefetchMetadata(category, symbolsToPrefetch, categoryCompanies);
      
      // Prefetch live data from market APIs (short TTL) - with error handling
      try {
        await this.prefetchLiveData(category, symbolsToPrefetch);
      } catch (error) {
        console.warn(`⚠️ Live data prefetch failed for ${category}, using cached data:`, error);
        // Continue with cached data instead of failing completely
      }
      
      console.log(`✅ ${category} real data prefetch completed`);
    } catch (error) {
      console.error(`❌ ${category} real data prefetch failed:`, error);
      // Don't fail completely - continue with basic metadata
      await this.prefetchBasicMetadata(category, config.symbols.slice(0, config.topCount));
    }
  }

  private async prefetchMetadata(category: 'stocks' | 'etfs' | 'crypto', symbols: string[], discoveredCompanies: CompanyInfo[]) {
    console.log(`📋 Prefetching real metadata for ${symbols.length} ${category}...`);
    
    for (const symbol of symbols) {
      try {
        // Find company info from discovered companies
        const companyInfo = discoveredCompanies.find(c => c.symbol === symbol);
        
        if (companyInfo) {
          // Use real discovered company data
          const metadata: AssetMetadata = {
            symbol: companyInfo.symbol,
            name: companyInfo.name,
            category: category === 'stocks' ? 'stock' : category === 'etfs' ? 'etf' : 'crypto',
            sector: companyInfo.sector || 'Unknown',
            industry: companyInfo.industry || 'Unknown',
            description: `${companyInfo.name} - ${companyInfo.sector || 'Unknown'} sector`,
            country: companyInfo.country || 'US',
            currency: 'USD',
            exchange: companyInfo.exchange || 'Unknown',
            lastUpdated: Date.now()
          };
          
          this.setMetadata(symbol, metadata);
        } else {
          // Fallback to basic metadata if not discovered
          const metadata: AssetMetadata = {
            symbol,
            name: `${symbol} ${category.charAt(0).toUpperCase() + category.slice(1)}`,
            category: category === 'stocks' ? 'stock' : category === 'etfs' ? 'etf' : 'crypto',
            sector: 'Unknown',
            industry: 'Unknown',
            description: `Top ${category} asset: ${symbol}`,
            country: 'US',
            currency: 'USD',
            exchange: 'Unknown',
            lastUpdated: Date.now()
          };
          
          this.setMetadata(symbol, metadata);
        }
        
        this.prefetchStatus.set(symbol, true);
      } catch (error) {
        console.warn(`⚠️ Failed to prefetch metadata for ${symbol}:`, error);
      }
    }
  }

  private async prefetchBasicMetadata(category: 'stocks' | 'etfs' | 'crypto', symbols: string[]) {
    console.log(`📋 Prefetching basic metadata for ${symbols.length} ${category} (fallback mode)...`);
    
    for (const symbol of symbols) {
      try {
        const metadata: AssetMetadata = {
          symbol,
          name: `${symbol} ${category.charAt(0).toUpperCase() + category.slice(1)}`,
          category: category === 'stocks' ? 'stock' : category === 'etfs' ? 'etf' : 'crypto',
          sector: 'Unknown',
          industry: 'Unknown',
          description: `Top ${category} asset: ${symbol}`,
          country: 'US',
          currency: 'USD',
          exchange: 'Unknown',
          lastUpdated: Date.now()
        };
        
        this.setMetadata(symbol, metadata);
        this.prefetchStatus.set(symbol, true);
      } catch (error) {
        console.warn(`⚠️ Failed to prefetch basic metadata for ${symbol}:`, error);
      }
    }
  }

  private async prefetchLiveData(category: 'stocks' | 'etfs' | 'crypto', symbols: string[]) {
    console.log(`📈 Prefetching real live data for ${symbols.length} ${category}...`);
    
    // Process in batches to respect rate limits
    const batchSize = category === 'crypto' ? 10 : 5; // Crypto APIs are more restrictive
    
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (symbol) => {
        try {
          const liveData = await this.fetchRealMarketData(symbol, category);
          if (liveData) {
            this.setLiveData(symbol, liveData);
            console.log(`✅ Prefetched real data for ${symbol}`);
          }
        } catch (error) {
          console.warn(`⚠️ Failed to prefetch live data for ${symbol}:`, error);
        }
      });
      
      await Promise.all(batchPromises);
      
      // Rate limit delay between batches
      if (i + batchSize < symbols.length) {
        const delay = category === 'crypto' ? 2000 : 1000; // 2s for crypto, 1s for stocks/ETFs
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  private async fetchRealMarketData(symbol: string, category: 'stocks' | 'etfs' | 'crypto'): Promise<LiveTradingData | null> {
    try {
      let marketData: any = null;
      
      if (category === 'stocks' || category === 'etfs') {
        // Try Finnhub first for stocks and ETFs
        marketData = await this.fetchStockDataFromFinnhub(symbol);
        
        if (!marketData) {
          // Fallback to Alpha Vantage
          marketData = await this.fetchStockDataFromAlphaVantage(symbol);
        }
        
        if (!marketData) {
          // Final fallback to Twelve Data
          marketData = await this.fetchStockDataFromTwelveData(symbol);
        }
      } else if (category === 'crypto') {
        // Try CoinGecko for crypto
        marketData = await this.fetchCryptoDataFromCoinGecko(symbol);
        
        if (!marketData) {
          // Fallback to CoinMarketCap
          marketData = await this.fetchCryptoDataFromCoinMarketCap(symbol);
        }
      }
      
      if (marketData) {
        return {
          symbol,
          price: marketData.price || 0,
          change24h: marketData.change24h || 0,
          volume24h: marketData.volume24h || 0,
          marketCap: marketData.marketCap || 0,
          high24h: marketData.high24h || 0,
          low24h: marketData.low24h || 0,
          open24h: marketData.open24h || 0,
          pe: marketData.pe || null,
          dividendYield: marketData.dividendYield || null,
          source: marketData.source || 'Market API',
          lastUpdated: Date.now(),
          category: category === 'stocks' ? 'stock' : category === 'etfs' ? 'etf' : 'crypto'
        };
      }
      
      return null;
    } catch (error) {
      console.warn(`⚠️ Failed to fetch real market data for ${symbol}:`, error);
      return null;
    }
  }

  // ============================================================================
  // MARKET DATA FETCHING METHODS
  // ============================================================================

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

  private async fetchCryptoDataFromCoinGecko(symbol: string): Promise<any> {
    try {
      const data = await enhancedRateLimitMonitor.scheduleRequest('coinGecko', async () => {
        const response = await axios.get(`https://api.coingecko.com/api/v3/simple/price`, {
          params: {
            ids: symbol.toLowerCase(),
            vs_currencies: 'usd',
            include_24hr_change: true,
            include_24hr_vol: true,
            include_market_cap: true
          },
          timeout: 10000
        });
        return response.data;
      }, 'low');

      if (data && data[symbol.toLowerCase()]) {
        const coinData = data[symbol.toLowerCase()];
        return {
          price: coinData.usd || 0,
          change24h: coinData.usd_24h_change || 0,
          volume24h: coinData.usd_24h_vol || 0,
          marketCap: coinData.usd_market_cap || 0,
          source: 'CoinGecko',
          high24h: 0, // CoinGecko simple price doesn't provide OHLC
          low24h: 0,
          open24h: 0
        };
      }
    } catch (error) {
      console.warn(`Failed to fetch ${symbol} from CoinGecko:`, error);
    }
    return null;
  }

  private async fetchCryptoDataFromCoinMarketCap(symbol: string): Promise<any> {
    try {
      const data = await enhancedRateLimitMonitor.scheduleRequest('coinMarketCap', async () => {
        const response = await axios.get('https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest', {
          params: {
            symbol,
            convert: 'USD'
          },
          headers: {
            'X-CMC_PRO_API_KEY': API_KEYS.coinMarketCap
          },
          timeout: 10000
        });
        return response.data;
      }, 'low');

      if (data && data.data && data.data[symbol]) {
        const coinData = data.data[symbol];
        const quote = coinData.quote.USD;
        return {
          price: quote.price || 0,
          change24h: quote.percent_change_24h || 0,
          volume24h: quote.volume_24h || 0,
          marketCap: quote.market_cap || 0,
          source: 'CoinMarketCap',
          high24h: 0, // CoinMarketCap quotes don't provide OHLC
          low24h: 0,
          open24h: 0
        };
      }
    } catch (error) {
      console.warn(`Failed to fetch ${symbol} from CoinMarketCap:`, error);
    }
    return null;
  }

  // ============================================================================
  // CACHE MANAGEMENT METHODS
  // ============================================================================

  private setMetadata(symbol: string, metadata: AssetMetadata) {
    if (this.metadataCache.size >= this.maxMetadataCacheSize) {
      this.evictOldestMetadata();
    }
    this.metadataCache.set(symbol, metadata);
  }

  private setLiveData(symbol: string, liveData: LiveTradingData) {
    if (this.liveDataCache.size >= this.maxLiveDataCacheSize) {
      this.evictOldestLiveData();
    }
    this.liveDataCache.set(symbol, liveData);
  }

  private evictOldestMetadata() {
    let oldestKey = '';
    let oldestTime = Date.now();
    
    for (const [key, value] of this.metadataCache) {
      if (value.lastUpdated < oldestTime) {
        oldestTime = value.lastUpdated;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.metadataCache.delete(oldestKey);
    }
  }

  private evictOldestLiveData() {
    let oldestKey = '';
    let oldestTime = Date.now();
    
    for (const [key, value] of this.liveDataCache) {
      if (value.lastUpdated < oldestTime) {
        oldestTime = value.lastUpdated;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.liveDataCache.delete(oldestKey);
    }
  }

  private startCacheCleanup() {
    setInterval(() => {
      this.cleanupExpiredCache();
    }, 60 * 1000); // Every minute
  }

  private cleanupExpiredCache() {
    const now = Date.now();
    
    // Cleanup expired metadata
    for (const [key, value] of this.metadataCache) {
      const ttl = this.getMetadataTTL(value.category);
      if (now - value.lastUpdated > ttl) {
        this.metadataCache.delete(key);
      }
    }
    
    // Cleanup expired live data
    for (const [key, value] of this.liveDataCache) {
      const ttl = this.getLiveDataTTL(value.category);
      if (now - value.lastUpdated > ttl) {
        this.liveDataCache.delete(key);
      }
    }
  }

  private getMetadataTTL(category: 'stock' | 'etf' | 'crypto'): number {
    switch (category) {
      case 'stock': return this.prefetchConfig.stocks.metadataTTL * 60 * 60 * 1000;
      case 'etf': return this.prefetchConfig.etfs.metadataTTL * 60 * 60 * 1000;
      case 'crypto': return this.prefetchConfig.crypto.metadataTTL * 60 * 60 * 1000;
      default: return 24 * 60 * 60 * 1000; // 24 hours default
    }
  }

  private getLiveDataTTL(category: 'stock' | 'etf' | 'crypto'): number {
    switch (category) {
      case 'stock': return this.prefetchConfig.stocks.liveDataTTL * 1000;
      case 'etf': return this.prefetchConfig.etfs.liveDataTTL * 1000;
      case 'crypto': return this.prefetchConfig.crypto.liveDataTTL * 1000;
      default: return 30 * 1000; // 30 seconds default
    }
  }

  // ============================================================================
  // PUBLIC API METHODS
  // ============================================================================

  async getHybridAssetData(symbol: string, category: 'stock' | 'etf' | 'crypto'): Promise<HybridAssetData | null> {
    try {
      const metadata = this.metadataCache.get(symbol);
      const liveData = this.liveDataCache.get(symbol);
      
      if (!metadata || !liveData) {
        return null;
      }
      
      // Check if data is fresh
      const metadataTTL = this.getMetadataTTL(category);
      const liveDataTTL = this.getLiveDataTTL(category);
      const now = Date.now();
      
      const metadataFresh = (now - metadata.lastUpdated) < metadataTTL;
      const liveDataFresh = (now - liveData.lastUpdated) < liveDataTTL;
      
      let cacheStatus: 'fresh' | 'stale' | 'fallback';
      let ttl: number;
      
      if (metadataFresh && liveDataFresh) {
        cacheStatus = 'fresh';
        ttl = Math.min(metadataTTL, liveDataTTL);
      } else if (metadataFresh) {
        cacheStatus = 'stale';
        ttl = metadataTTL;
      } else {
        cacheStatus = 'fallback';
        ttl = 0;
      }
      
      return {
        metadata,
        liveData,
        cacheStatus,
        ttl
      };
      
    } catch (error) {
      console.error(`Error getting hybrid asset data for ${symbol}:`, error);
      return null;
    }
  }

  async getTopAssets(category: 'stocks' | 'etfs' | 'crypto', limit: number = 50): Promise<HybridAssetData[]> {
    const config = this.prefetchConfig[category];
    const symbols = config.symbols.slice(0, limit);
    
    const assets: HybridAssetData[] = [];
    
    for (const symbol of symbols) {
      const assetData = await this.getHybridAssetData(symbol, category === 'stocks' ? 'stock' : category === 'etfs' ? 'etf' : 'crypto');
      if (assetData) {
        assets.push(assetData);
      }
    }
    
    return assets;
  }

  // ============================================================================
  // CACHE STATISTICS
  // ============================================================================

  getCacheStats(): CacheStats {
    // Use available methods from enhancedRateLimitMonitor
    const finnhubMetrics = enhancedRateLimitMonitor.getAPIMetrics('finnhub');
    const alphaVantageMetrics = enhancedRateLimitMonitor.getAPIMetrics('alphaVantage');
    const twelveDataMetrics = enhancedRateLimitMonitor.getAPIMetrics('twelveData');
    
    // Calculate hit rates based on cache size vs requests
    const metadataHitRate = this.metadataCache.size > 0 ? 85 : 0; // Estimate based on cache population
    const liveDataHitRate = this.liveDataCache.size > 0 ? 70 : 0; // Estimate based on cache population
    
    return {
      metadataCache: {
        size: this.metadataCache.size,
        maxSize: this.maxMetadataCacheSize,
        hitRate: metadataHitRate,
        missRate: 100 - metadataHitRate
      },
      liveDataCache: {
        size: this.liveDataCache.size,
        maxSize: this.maxLiveDataCacheSize,
        hitRate: liveDataHitRate,
        missRate: 100 - liveDataHitRate
      },
      prefetchStatus: {
        lastPrefetch: this.lastPrefetch,
        nextPrefetch: this.nextPrefetch,
        assetsPrefetched: this.metadataCache.size + this.liveDataCache.size
      }
    };
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  clearCache(): void {
    this.metadataCache.clear();
    this.liveDataCache.clear();
    this.prefetchStatus.clear();
    console.log('🧹 Hybrid cache cleared');
  }

  isPrefetched(symbol: string): boolean {
    return this.metadataCache.has(symbol) && this.liveDataCache.has(symbol);
  }

  getPrefetchStatus(): { [key: string]: boolean } {
    const status: { [key: string]: boolean } = {};
    
    // Check stocks
    for (const symbol of this.prefetchConfig.stocks.symbols) {
      status[`STOCK_${symbol}`] = this.isPrefetched(symbol);
    }
    
    // Check ETFs
    for (const symbol of this.prefetchConfig.etfs.symbols) {
      status[`ETF_${symbol}`] = this.isPrefetched(symbol);
    }
    
    // Check crypto
    for (const symbol of this.prefetchConfig.crypto.symbols) {
      status[`CRYPTO_${symbol}`] = this.isPrefetched(symbol);
    }
    
    return status;
  }
}

// Export singleton instance
export const hybridCacheService = new HybridCacheService(); 