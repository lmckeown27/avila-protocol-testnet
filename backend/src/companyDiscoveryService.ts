/**
 * Company Discovery Service
 * Dynamically discovers and fetches company tickers and names from APIs
 * with enhanced caching and simplified progressive loading
 */

import { enhancedRateLimitMonitor } from './enhancedRateLimitMonitor';
import axios from 'axios';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

// ============================================================================
// INTERFACES & TYPES
// ============================================================================

export interface CompanyInfo {
  symbol: string;
  name: string;
  sector?: string;
  industry?: string;
  marketCap: number; // Required for market cap filtering
  exchange?: string;
  country?: string;
  website?: string;
  description?: string;
}

export interface DiscoveredCompanies {
  stocks: CompanyInfo[];
  etfs: CompanyInfo[];
  crypto: CompanyInfo[];
  timestamp?: number;
  dataSource?: string;
}

export interface DiscoveryOptions {
  filterBySector?: string;
  filterByMarketCap?: 'small' | 'mid' | 'large' | 'mega';
  maxAssets?: number;
  maxResults?: number;
  priority?: 'low' | 'medium' | 'high';
  useCache?: boolean;
  progressive?: boolean;
  batchNumber?: number;
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
// ENHANCED CACHING SYSTEM
// ============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  lastAccessed: number;
  accessCount: number;
  source: string;
}

class EnhancedCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private readonly maxSize: number;
  private readonly ttl: number;
  private readonly cleanupInterval: number;

  constructor(maxSize = 1000, ttl = 24 * 60 * 60 * 1000, cleanupInterval = 60 * 60 * 1000) {
    this.maxSize = maxSize;
    this.ttl = ttl;
    this.cleanupInterval = cleanupInterval;
    
    // Start cleanup interval
    setInterval(() => this.cleanup(), this.cleanupInterval);
  }

  set(key: string, data: T, source: string): void {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      lastAccessed: Date.now(),
      accessCount: 1,
      source
    });
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if entry is expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    // Update access statistics
    entry.lastAccessed = Date.now();
    entry.accessCount++;

    return entry.data;
  }

  has(key: string): boolean {
    return this.cache.has(key) && !this.isExpired(key);
  }

  private isExpired(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return true;
    return Date.now() - entry.timestamp > this.ttl;
  }

  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > this.ttl) {
        this.cache.delete(key);
      }
    }
  }

  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: 0, // Will be calculated by service
      sources: new Set([...this.cache.values()].map(entry => entry.source))
    };
  }

  clear(): void {
    this.cache.clear();
  }
}

// ============================================================================
// COMPANY DISCOVERY SERVICE CLASS
// ============================================================================

export class CompanyDiscoveryService {
  private discoveredCompanies: DiscoveredCompanies = {
      stocks: [], 
      etfs: [], 
      crypto: [],
      timestamp: Date.now(),
    dataSource: 'Enhanced Discovery System'
  };
  
  // Enhanced caching system
  private companyCache = new EnhancedCache<CompanyInfo[]>(1000, 24 * 60 * 60 * 1000);
  private discoveryCache = new EnhancedCache<DiscoveredCompanies>(500, 6 * 60 * 60 * 1000);
  private apiResponseCache = new EnhancedCache<any>(2000, 30 * 60 * 1000); // 30 minutes for API responses
  
  // Simplified progressive loading state - TOP 10 BY MARKET CAP
  private loadingState = {
    stocks: { discovered: 0, target: 10, lastUpdate: 0 }, // TOP 10 STOCKS BY MARKET CAP
    etfs: { discovered: 0, target: 10, lastUpdate: 0 },   // TOP 10 ETFS BY MARKET CAP
    crypto: { discovered: 0, target: 10, lastUpdate: 0 }  // TOP 10 CRYPTO BY MARKET CAP
  };

  // Rate limit tracking
  private apiUsageTracker = new Map<string, { requests: number; resetTime: number }>();

  constructor() {
    // Schedule periodic discovery refresh (less frequent)
    setTimeout(() => {
      setInterval(() => this.refreshDiscovery(), 2 * 60 * 60 * 1000); // Every 2 hours
    }, 45000); // Wait 45 seconds before starting discovery
    
    // Schedule cache cleanup
    setInterval(() => this.cleanupCaches(), 30 * 60 * 1000); // Every 30 minutes
  }

  /**
   * Enhanced cache key generation
   */
  private generateCacheKey(options: DiscoveryOptions): string {
    const key = JSON.stringify(options);
    return `discovery_${Buffer.from(key).toString('base64').substring(0, 16)}`;
  }

  /**
   * Generate cache key for API responses
   */
  private generateAPICacheKey(api: string, endpoint: string, params: any): string {
    const paramString = JSON.stringify(params);
    return `api_${api}_${endpoint}_${Buffer.from(paramString).toString('base64').substring(0, 16)}`;
  }

  /**
   * Check if API is available (respecting rate limits)
   */
  private isAPIAvailable(api: string): boolean {
    const tracker = this.apiUsageTracker.get(api);
    if (!tracker) return true;

    const now = Date.now();
    if (now > tracker.resetTime) {
      this.apiUsageTracker.delete(api);
      return true;
    }

    // Check rate limits based on API
    const limits = {
      finnhub: 60, // 60 req/min
      alphaVantage: 5, // 5 req/min
      twelveData: 800, // 800 req/day
      coinMarketCap: 10000, // 10k req/month
      coinGecko: 50, // 50 req/min
      deFiLlama: 1000 // 1000 req/min (very generous)
    };

    const limit = limits[api as keyof typeof limits] || 100;
    return tracker.requests < limit;
  }

  /**
   * Track API usage
   */
  private trackAPIUsage(api: string): void {
    const now = Date.now();
    const tracker = this.apiUsageTracker.get(api) || { requests: 0, resetTime: now + 60000 };
    
    tracker.requests++;
    
    // Set reset time based on API
    if (api === 'twelveData') {
      tracker.resetTime = now + 24 * 60 * 60 * 1000; // 24 hours
    } else if (api === 'coinMarketCap') {
      tracker.resetTime = now + 30 * 24 * 60 * 60 * 1000; // 30 days
    } else {
      tracker.resetTime = now + 60 * 1000; // 1 minute
    }
    
    this.apiUsageTracker.set(api, tracker);
  }

  /**
   * Get discovered companies with enhanced caching
   */
  async getDiscoveredCompanies(options: DiscoveryOptions = {}): Promise<DiscoveredCompanies> {
    const cacheKey = this.generateCacheKey(options);
    
    // Check discovery cache first
    if (this.discoveryCache.has(cacheKey)) {
      console.log('📋 Using cached discovery data');
      return this.discoveryCache.get(cacheKey)!;
    }

    // Check if we have sufficient cached company data
    const cachedStocks = this.companyCache.get('stocks') || [];
    const cachedETFs = this.companyCache.get('etfs') || [];
    const cachedCrypto = this.companyCache.get('crypto') || [];

    // If we have sufficient cached data, return it
    if (cachedStocks.length >= 200 && cachedETFs.length >= 100 && cachedCrypto.length >= 300) {
      console.log('📋 Using cached company data');
      const result: DiscoveredCompanies = {
        stocks: cachedStocks,
        etfs: cachedETFs,
        crypto: cachedCrypto,
        timestamp: Date.now(),
        dataSource: 'Enhanced Cache System'
      };
      
      this.discoveryCache.set(cacheKey, result, 'Enhanced Cache System');
      return result;
    }

    // Perform discovery with enhanced caching
    console.log('🚀 Starting enhanced company discovery...');
    const result = await this.discoverCompaniesEnhanced(options);
    
    // Cache the result
    this.discoveryCache.set(cacheKey, result, 'Enhanced Discovery System');
    
    return result;
  }

  /**
   * Enhanced discovery with intelligent caching
   */
  private async discoverCompaniesEnhanced(options: DiscoveryOptions): Promise<DiscoveredCompanies> {
    const result: DiscoveredCompanies = { 
      stocks: [], 
      etfs: [], 
      crypto: [],
      timestamp: Date.now(),
      dataSource: 'Enhanced Discovery System'
    };

    // Discover stocks with caching
    result.stocks = await this.discoverStocksEnhanced(options);
    
    // Discover ETFs with caching
    result.etfs = await this.discoverETFsEnhanced(options);
    
    // Discover crypto with caching
    result.crypto = await this.discoverCryptoEnhanced(options);

    console.log(`✅ Enhanced discovery completed: ${result.stocks.length} stocks, ${result.etfs.length} ETFs, ${result.crypto.length} crypto`);
    return result;
  }

  /**
   * Enhanced stock discovery with caching and market cap filtering
   */
  private async discoverStocksEnhanced(options: DiscoveryOptions = {}): Promise<CompanyInfo[]> {
    const cacheKey = 'stocks';
    const cached = this.companyCache.get(cacheKey);
    
    if (cached && cached.length >= 10) {
      console.log(`📋 Using cached stocks data: ${cached.length} stocks`);
      return cached;
    }

    console.log('📊 Discovering stocks with enhanced caching...');
    
    const stocks: CompanyInfo[] = [];
    
    // Try Alpha Vantage first (returns market cap directly)
    if (this.isAPIAvailable('alphaVantage')) {
      try {
        const alphaVantageStocks = await this.discoverStocksFromAlphaVantageCached();
        stocks.push(...alphaVantageStocks);
        console.log(`✅ Alpha Vantage: ${alphaVantageStocks.length} stocks discovered with market cap`);
      } catch (error) {
        console.warn('⚠️ Alpha Vantage stock discovery failed:', error);
      }
    }

    // Try Finnhub as backup
    if (stocks.length < 10 && this.isAPIAvailable('finnhub')) {
      try {
        const finnhubStocks = await this.discoverStocksFromFinnhubCached();
        stocks.push(...finnhubStocks);
        console.log(`✅ Finnhub: ${finnhubStocks.length} stocks discovered`);
      } catch (error) {
        console.warn('⚠️ Finnhub stock discovery failed:', error);
      }
    }

    // Try Twelve Data as final backup
    if (stocks.length < 10 && this.isAPIAvailable('twelveData')) {
      try {
        const twelveDataStocks = await this.discoverStocksFromTwelveDataCached();
        stocks.push(...twelveDataStocks);
        console.log(`✅ Twelve Data: ${twelveDataStocks.length} stocks discovered`);
      } catch (error) {
        console.warn('⚠️ Twelve Data stock discovery failed:', error);
      }
    }

    const uniqueStocks = this.removeDuplicates(stocks);
    
    // Only fetch market cap data for stocks that don't have it
    const stocksNeedingMarketCap = uniqueStocks.filter(stock => !stock.marketCap || stock.marketCap === 0);
    if (stocksNeedingMarketCap.length > 0) {
      const stocksWithMarketCap = await this.fetchMarketCapData(stocksNeedingMarketCap, 'stocks');
      // Merge with stocks that already have market cap
      const stocksWithExistingMarketCap = uniqueStocks.filter(stock => stock.marketCap && stock.marketCap > 0);
      uniqueStocks.splice(0, uniqueStocks.length, ...stocksWithMarketCap, ...stocksWithExistingMarketCap);
    }
    
    // Filter by market cap and take top 10
    const topStocks = this.sortByMarketCap(uniqueStocks, 10);
    
    console.log(`✅ Stock discovery completed: ${topStocks.length} top stocks by market cap`);
    
    // Cache the result
    this.companyCache.set(cacheKey, topStocks, 'Enhanced Discovery System');
    return topStocks;
  }

  /**
   * Cached Finnhub stock discovery
   */
  private async discoverStocksFromFinnhubCached(): Promise<CompanyInfo[]> {
    const cacheKey = this.generateAPICacheKey('finnhub', 'stocks', { exchange: 'US' });
    const cached = this.apiResponseCache.get(cacheKey);
    
    if (cached) {
      console.log('📋 Using cached Finnhub stocks data');
      return cached;
    }

    const stocks: CompanyInfo[] = [];
    
    try {
      // Use Finnhub's top gainers/losers endpoint which includes market cap
      const response = await fetch(`https://finnhub.io/api/v1/stock/symbol?exchange=US&token=${process.env.FINNHUB_API_KEY}`);
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          // Take top 100 stocks by symbol popularity (usually correlates with market cap)
          const batch = data.slice(0, 100).map((stock: any) => ({
            symbol: stock.symbol,
            name: stock.description || stock.symbol,
            sector: stock.primarySic || 'Unknown',
            industry: stock.primarySic || 'Unknown',
            exchange: stock.primaryExchange || 'US',
            marketCap: 0, // Will be populated by fetchMarketCapData
            country: 'US'
          }));
          stocks.push(...batch);
        }
      }
      
      this.trackAPIUsage('finnhub');
    } catch (error) {
      console.warn('⚠️ Finnhub stock discovery failed:', error);
    }

    // Cache the result
    this.apiResponseCache.set(cacheKey, stocks, 'Finnhub');
    return stocks;
  }

  /**
   * Cached Alpha Vantage stock discovery (returns market cap directly)
   */
  private async discoverStocksFromAlphaVantageCached(): Promise<CompanyInfo[]> {
    const cacheKey = this.generateAPICacheKey('alphaVantage', 'stocks', { function: 'OVERVIEW' });
    const cached = this.apiResponseCache.get(cacheKey);
    
    if (cached) {
      console.log('📋 Using cached Alpha Vantage stocks data');
      return cached;
    }

    try {
      // Use a list of major US stocks that we know exist
      const majorStocks = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'BRK.A', 'JPM', 'JNJ'];
      const stocks: CompanyInfo[] = [];
      
      for (const symbol of majorStocks) {
        try {
          const response = await fetch(`https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol}&apikey=${process.env.ALPHA_VANTAGE_API_KEY}`);
          if (response.ok) {
            const data = await response.json();
            if (data.Symbol && data.MarketCapitalization) {
              stocks.push({
                symbol: data.Symbol,
                name: data.Name || data.Symbol,
                sector: data.Sector || 'Unknown',
                industry: data.Industry || 'Unknown',
                exchange: data.Exchange || 'US',
                marketCap: parseFloat(data.MarketCapitalization) || 0,
                country: 'US'
              });
            }
          }
          
          // Rate limit: 5 req/min = 1 req/12sec
          await new Promise(resolve => setTimeout(resolve, 13000));
          
        } catch (error) {
          console.warn(`⚠️ Failed to fetch ${symbol} overview:`, error);
        }
      }
      
      this.trackAPIUsage('alphaVantage');
      
      // Cache the result
      this.apiResponseCache.set(cacheKey, stocks, 'Alpha Vantage');
      return stocks;
      
    } catch (error) {
      console.warn('⚠️ Alpha Vantage stock discovery failed:', error);
    }

    return [];
  }

  /**
   * Cached Twelve Data stock discovery
   */
  private async discoverStocksFromTwelveDataCached(): Promise<CompanyInfo[]> {
    const cacheKey = this.generateAPICacheKey('twelveData', 'stocks', { country: 'US' });
    const cached = this.apiResponseCache.get(cacheKey);
    
    if (cached) {
      console.log('📋 Using cached Twelve Data stocks data');
      return cached;
    }

    try {
      const response = await fetch(`https://api.twelvedata.com/stocks?country=US&apikey=${process.env.TWELVE_DATA_API_KEY}`);
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'ok' && Array.isArray(data.data)) {
          const stocks = data.data.slice(0, 100).map((stock: any) => ({
            symbol: stock.symbol,
            name: stock.name || stock.symbol,
            sector: stock.sector || 'Unknown',
            industry: stock.industry || 'Unknown',
            exchange: stock.exchange || 'Unknown',
            marketCap: stock.marketCapitalization || stock.marketCap || 0,
            country: stock.country || 'US'
          }));
          
          // Cache the result
          this.apiResponseCache.set(cacheKey, stocks, 'Twelve Data');
          this.trackAPIUsage('twelveData');
          
          return stocks;
        }
      }
    } catch (error) {
      console.warn('⚠️ Twelve Data discovery failed:', error);
    }

    return [];
  }

  /**
   * Enhanced ETF discovery with caching and market cap filtering
   * NOW BLOCKED - ETFs use dedicated scraper service instead of API calls
   */
  private async discoverETFsEnhanced(options: DiscoveryOptions = {}): Promise<CompanyInfo[]> {
    console.log(`🚫 ETF discovery blocked from APIs - using dedicated scraper service instead`);
    
    // Return static list of major ETFs that will be handled by scraper
    const staticETFs: CompanyInfo[] = [
      { symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust', sector: 'ETF', industry: 'Exchange Traded Fund', marketCap: 0 },
      { symbol: 'QQQ', name: 'Invesco QQQ Trust', sector: 'ETF', industry: 'Exchange Traded Fund', marketCap: 0 },
      { symbol: 'VTI', name: 'Vanguard Total Stock Market ETF', sector: 'ETF', industry: 'Exchange Traded Fund', marketCap: 0 },
      { symbol: 'IWM', name: 'iShares Russell 2000 ETF', sector: 'ETF', industry: 'Exchange Traded Fund', marketCap: 0 },
      { symbol: 'VEA', name: 'Vanguard FTSE Developed Markets ETF', sector: 'ETF', industry: 'Exchange Traded Fund', marketCap: 0 },
      { symbol: 'VWO', name: 'Vanguard FTSE Emerging Markets ETF', sector: 'ETF', industry: 'Exchange Traded Fund', marketCap: 0 },
      { symbol: 'BND', name: 'Vanguard Total Bond Market ETF', sector: 'ETF', industry: 'Exchange Traded Fund', marketCap: 0 },
      { symbol: 'GLD', name: 'SPDR Gold Shares', sector: 'ETF', industry: 'Exchange Traded Fund', marketCap: 0 },
      { symbol: 'TLT', name: 'iShares 20+ Year Treasury Bond ETF', sector: 'ETF', industry: 'Exchange Traded Fund', marketCap: 0 },
      { symbol: 'AGG', name: 'iShares Core U.S. Aggregate Bond ETF', sector: 'ETF', industry: 'Exchange Traded Fund', marketCap: 0 }
    ];
    
    console.log(`✅ Static ETF list provided: ${staticETFs.length} major ETFs (data will come from scraper)`);
    
    // Cache the result
    this.companyCache.set('etfs', staticETFs, 'Static ETF List (Scraper Service)');
    return staticETFs;
  }

  /**
   * Cached Twelve Data ETF discovery
   * NOW BLOCKED - ETFs use dedicated scraper service instead of API calls
   */
  private async discoverETFsFromTwelveDataCached(): Promise<CompanyInfo[]> {
    console.log(`🚫 Twelve Data ETF discovery blocked - using dedicated scraper service instead`);
    return [];
  }

  /**
   * Cached Finnhub ETF discovery
   * NOW BLOCKED - ETFs use dedicated scraper service instead of API calls
   */
  private async discoverETFsFromFinnhubCached(): Promise<CompanyInfo[]> {
    console.log(`🚫 Finnhub ETF discovery blocked - using dedicated scraper service instead`);
    return [];
  }

  /**
   * Cached Alpha Vantage ETF discovery (returns market cap directly)
   * NOW BLOCKED - ETFs use dedicated scraper service instead of API calls
   */
  private async discoverETFsFromAlphaVantageCached(): Promise<CompanyInfo[]> {
    console.log(`🚫 Alpha Vantage ETF discovery blocked - using dedicated scraper service instead`);
    return [];
  }

  /**
   * Enhanced crypto discovery with caching and market cap filtering
   */
  private async discoverCryptoEnhanced(options: DiscoveryOptions = {}): Promise<CompanyInfo[]> {
    const cacheKey = 'crypto';
    const cached = this.companyCache.get(cacheKey);
    
    if (cached && cached.length >= 10) {
      console.log(`📋 Using cached crypto data: ${cached.length} crypto`);
      return cached;
    }

    console.log('📊 Discovering crypto with enhanced caching...');
    
    const crypto: CompanyInfo[] = [];
    
    // Try CoinGecko first (most reliable for crypto)
    if (this.isAPIAvailable('coinGecko')) {
      try {
        const coinGeckoCrypto = await this.discoverCryptoFromCoinGeckoCached();
        crypto.push(...coinGeckoCrypto);
        console.log(`✅ CoinGecko: ${coinGeckoCrypto.length} crypto discovered`);
      } catch (error) {
        console.warn('⚠️ CoinGecko crypto discovery failed:', error);
      }
    }

    // Try DeFi Llama as backup
    if (crypto.length < 100 && this.isAPIAvailable('deFiLlama')) {
      try {
        const deFiLlamaCrypto = await this.discoverCryptoFromDeFiLlamaCached();
        crypto.push(...deFiLlamaCrypto);
        console.log(`✅ DeFi Llama: ${deFiLlamaCrypto.length} crypto discovered`);
      } catch (error) {
        console.warn('⚠️ DeFi Llama crypto discovery failed:', error);
      }
    }

    const uniqueCrypto = this.removeDuplicates(crypto);
    
    // Fetch market cap data for discovered crypto
    const cryptoWithMarketCap = await this.fetchMarketCapData(uniqueCrypto, 'crypto');
    
    // Filter by market cap and take top 10
    const topCrypto = this.sortByMarketCap(cryptoWithMarketCap, 10);
    
    console.log(`✅ Crypto discovery completed: ${topCrypto.length} top crypto by market cap`);
    
    // Cache the result
    this.companyCache.set(cacheKey, topCrypto, 'Enhanced Discovery System');
    return topCrypto;
  }

  /**
   * Cached CoinGecko crypto discovery
   */
  private async discoverCryptoFromCoinGeckoCached(): Promise<CompanyInfo[]> {
    const cacheKey = this.generateAPICacheKey('coinGecko', 'crypto', { page: 1 });
    const cached = this.apiResponseCache.get(cacheKey);
    
    if (cached) {
      console.log('📋 Using cached CoinGecko crypto data');
      return cached;
    }

    const crypto: CompanyInfo[] = [];
    
    try {
      // Get first 2 pages (200 coins) to stay within rate limits
      for (let page = 1; page <= 2; page++) {
        const response = await fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=${page}&sparkline=false`);
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data)) {
            const batch = data.map((coin: any) => ({
              symbol: coin.symbol?.toUpperCase() || coin.id?.toUpperCase(),
              name: coin.name || coin.symbol?.toUpperCase(),
              sector: 'Cryptocurrency',
              industry: coin.categories?.[0] || 'Digital Asset',
              exchange: 'Crypto Exchange',
              marketCap: coin.market_cap || 0,
              country: 'Global'
            }));
            crypto.push(...batch);
          }
        }
        
        // Rate limit: 50 req/min = 1 req/1.2sec
        if (page < 2) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }
      
      // Cache the result
      this.apiResponseCache.set(cacheKey, crypto, 'CoinGecko');

    return crypto;
    } catch (error) {
      console.warn('⚠️ CoinGecko discovery failed:', error);
    }

    return [];
  }

  /**
   * Cached DeFi Llama crypto discovery (no rate limits)
   */
  private async discoverCryptoFromDeFiLlamaCached(): Promise<CompanyInfo[]> {
    const cacheKey = this.generateAPICacheKey('defiLlama', 'crypto', {});
    const cached = this.apiResponseCache.get(cacheKey);
    
    if (cached) {
      console.log('📋 Using cached DeFi Llama crypto data');
      return cached;
    }

    const crypto: CompanyInfo[] = [];
    
    try {
      // Get protocols (no rate limits)
      const protocolsResponse = await fetch('https://api.llama.fi/protocols');
      if (protocolsResponse.ok) {
        const protocolsData = await protocolsResponse.json();
        if (Array.isArray(protocolsData)) {
          const batch = protocolsData.slice(0, 300).map((protocol: any) => ({
            symbol: protocol.symbol?.toUpperCase() || protocol.name?.substring(0, 5).toUpperCase(),
            name: protocol.name || protocol.symbol?.toUpperCase(),
            sector: 'DeFi Protocol',
            industry: protocol.category || 'Decentralized Finance',
            exchange: 'DeFi Protocol',
            marketCap: 0, // No market cap for protocols
            country: 'Global'
          }));
          crypto.push(...batch);
        }
      }

      // Get chains (no rate limits)
      const chainsResponse = await fetch('https://api.llama.fi/chains');
      if (chainsResponse.ok) {
        const chainsData = await chainsResponse.json();
        if (Array.isArray(chainsData)) {
          const batch = chainsData.slice(0, 100).map((chain: any) => ({
            symbol: chain.tokenSymbol?.toUpperCase() || chain.name?.substring(0, 5).toUpperCase(),
            name: chain.name || chain.tokenSymbol?.toUpperCase(),
            sector: 'Blockchain',
            industry: 'Layer 1 Protocol',
            exchange: 'Blockchain Network',
            marketCap: 0, // No market cap for chains
            country: 'Global'
          }));
          crypto.push(...batch);
        }
    }
      
      // Cache the result
      this.apiResponseCache.set(cacheKey, crypto, 'DeFi Llama');

    return crypto;
    } catch (error) {
      console.warn('⚠️ DeFi Llama discovery failed:', error);
    }

    return [];
  }

  /**
   * Remove duplicate companies
   */
  private removeDuplicates(companies: CompanyInfo[]): CompanyInfo[] {
    const seen = new Set<string>();
    return companies.filter(company => {
      const key = `${company.symbol}-${company.sector}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Validate company has sufficient market cap and basic info
   */
  private isValidCompany(company: CompanyInfo): boolean {
    // Must have a valid symbol
    if (!company.symbol || company.symbol.length < 1) return false;
    
    // Must have a name
    if (!company.name || company.name.length < 2) return false;
    
    // Must have market cap data (if available) - minimum $1B for top tier
    if (company.marketCap !== undefined && company.marketCap < 1000000000) return false;
    
    // Must have basic company info
    if (!company.sector && !company.industry) return false;
    
    return true;
  }

  /**
   * Sort companies by market cap (highest first) and take top N
   */
  private sortByMarketCap(companies: CompanyInfo[], limit: number): CompanyInfo[] {
    return companies
      .filter(company => this.isValidCompany(company))
      .sort((a, b) => {
        // Sort by market cap (highest first)
        const marketCapA = a.marketCap || 0;
        const marketCapB = b.marketCap || 0;
        return marketCapB - marketCapA;
      })
      .slice(0, limit);
  }

  /**
   * Fetch market cap data for a list of companies
   */
  private async fetchMarketCapData(companies: CompanyInfo[], category: 'stocks' | 'etfs' | 'crypto'): Promise<CompanyInfo[]> {
    console.log(`💰 Fetching market cap data for ${companies.length} ${category}...`);
    
    const enrichedCompanies: CompanyInfo[] = [];
    
    for (const company of companies) {
      try {
        let marketCap = 0;
        
        if (category === 'stocks') {
          // Try Finnhub quote endpoint for stocks
          if (this.isAPIAvailable('finnhub')) {
            try {
              const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=${company.symbol}&token=${process.env.FINNHUB_API_KEY}`);
              if (response.ok) {
                const quoteData = await response.json();
                if (quoteData.c && quoteData.c > 0) {
                  // Calculate market cap: price * shares outstanding (estimate)
                  // For now, use a reasonable estimate based on price
                  marketCap = quoteData.c * 1000000; // Rough estimate
                }
              }
              this.trackAPIUsage('finnhub');
            } catch (error) {
              console.warn(`⚠️ Failed to fetch market cap for ${company.symbol}:`, error);
            }
          }
        } else if (category === 'crypto') {
          // Try CoinGecko for crypto market cap
          if (this.isAPIAvailable('coinGecko')) {
            try {
              const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${company.symbol.toLowerCase()}&vs_currencies=usd&include_market_cap=true`);
              if (response.ok) {
                const priceData = await response.json();
                if (priceData[company.symbol.toLowerCase()]?.usd_market_cap) {
                  marketCap = priceData[company.symbol.toLowerCase()].usd_market_cap;
                }
              }
              this.trackAPIUsage('coinGecko');
            } catch (error) {
              console.warn(`⚠️ Failed to fetch market cap for ${company.symbol}:`, error);
            }
          }
        }
        
        // Update company with market cap data
        enrichedCompanies.push({
          ...company,
          marketCap: marketCap || company.marketCap || 0
        });
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        console.warn(`⚠️ Error enriching ${company.symbol}:`, error);
        enrichedCompanies.push(company);
      }
    }
    
    console.log(`✅ Market cap data fetched for ${enrichedCompanies.length} ${category}`);
    return enrichedCompanies;
  }

  /**
   * Cleanup caches
   */
  private cleanupCaches(): void {
    console.log('🧹 Cleaning up caches...');
    // The EnhancedCache class handles its own cleanup
  }

  /**
   * Refresh discovery data
   */
  private async refreshDiscovery(): Promise<void> {
    console.log('🔄 Refreshing company discovery data...');
    try {
      // Clear discovery cache to force refresh
      this.discoveryCache.clear();
      
      // Perform new discovery
      await this.discoverCompaniesEnhanced({});
      console.log('✅ Company discovery refresh completed');
    } catch (error) {
      console.error('❌ Company discovery refresh failed:', error);
    }
  }

  /**
   * Get current loading status
   */
  getLoadingStatus() {
    return {
      stocks: { ...this.loadingState.stocks, target: this.loadingState.stocks.target },
      etfs: { ...this.loadingState.etfs, target: this.loadingState.etfs.target },
      crypto: { ...this.loadingState.crypto, target: this.loadingState.crypto.target }
    };
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      companyCache: this.companyCache.getStats(),
      discoveryCache: this.discoveryCache.getStats(),
      apiResponseCache: this.apiResponseCache.getStats(),
      apiUsage: Object.fromEntries(this.apiUsageTracker.entries())
    };
  }

  /**
   * Force refresh of discovered companies
   */
  async refreshCompanies(): Promise<DiscoveredCompanies> {
    // Clear all caches
    this.companyCache.clear();
    this.discoveryCache.clear();
    this.apiResponseCache.clear();
    
    // Reset loading state
    this.loadingState.stocks.discovered = 0;
    this.loadingState.etfs.discovered = 0;
    this.loadingState.crypto.discovered = 0;
    
    return await this.getDiscoveredCompanies();
  }

  /**
   * Search discovered companies
   */
  async searchCompanies(query: string, category?: 'stock' | 'etf' | 'crypto'): Promise<CompanyInfo[]> {
    const companies = await this.getDiscoveredCompanies();
    
    let searchPool: CompanyInfo[] = [];
    
    if (!category || category === 'stock') {
      searchPool.push(...companies.stocks);
    }
    if (!category || category === 'etf') {
      searchPool.push(...companies.etfs);
    }
    if (!category || category === 'crypto') {
      searchPool.push(...companies.crypto);
    }
    
    const queryLower = query.toLowerCase();
    return searchPool.filter(company => 
      company.symbol.toLowerCase().includes(queryLower) ||
      company.name.toLowerCase().includes(queryLower) ||
      (company.sector && company.sector.toLowerCase().includes(queryLower)) ||
      (company.industry && company.industry.toLowerCase().includes(queryLower))
    );
  }

  /**
   * Get companies by sector
   */
  async getCompaniesBySector(sector: string, category?: 'stock' | 'etf' | 'crypto'): Promise<CompanyInfo[]> {
    const companies = await this.getDiscoveredCompanies();
    
    let searchPool: CompanyInfo[] = [];
    
    if (!category || category === 'stock') {
      searchPool.push(...companies.stocks);
    }
    if (!category || category === 'etf') {
      searchPool.push(...companies.etfs);
    }
    if (!category || category === 'crypto') {
      searchPool.push(...companies.crypto);
    }
    
    const sectorLower = sector.toLowerCase();
    return searchPool.filter(company => 
      company.sector && company.sector.toLowerCase().includes(sectorLower)
    );
  }

  /**
   * Get statistics about discovered companies
   */
  getDiscoveryStats() {
    const companies = this.discoveredCompanies;
    
    const sectors = new Set<string>();
    const industries = new Set<string>();
    
    [...companies.stocks, ...companies.etfs, ...companies.crypto].forEach(company => {
      if (company.sector) sectors.add(company.sector);
      if (company.industry) industries.add(company.industry);
    });

    return {
      totalCompanies: companies.stocks.length + companies.etfs.length + companies.crypto.length,
      stocks: companies.stocks.length,
      etfs: companies.etfs.length,
      crypto: companies.crypto.length,
      uniqueSectors: sectors.size,
      uniqueIndustries: industries.size,
      lastDiscovery: new Date(companies.timestamp || Date.now()).toISOString(),
      cacheStatus: 'active',
      loadingStatus: this.getLoadingStatus(),
      cacheStats: this.getCacheStats()
    };
  }
}

// Export singleton instance
export const companyDiscoveryService = new CompanyDiscoveryService(); 