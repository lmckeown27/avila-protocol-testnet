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
  marketCap?: number;
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
  
  // Simplified progressive loading state
  private loadingState = {
    stocks: { discovered: 0, target: 100, lastUpdate: 0 },
    etfs: { discovered: 0, target: 100, lastUpdate: 0 },
    crypto: { discovered: 0, target: 200, lastUpdate: 0 }
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
      coinMarketCap: 10000 // 10k req/month
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
   * Enhanced stock discovery with caching
   */
  private async discoverStocksEnhanced(options: DiscoveryOptions = {}): Promise<CompanyInfo[]> {
    const cacheKey = 'stocks';
    const cached = this.companyCache.get(cacheKey);
    
    // If we have sufficient cached data and it's recent, use it
    if (cached && cached.length >= 200) {
      console.log(`📋 Using cached stocks data: ${cached.length} stocks`);
      return cached;
    }

    console.log('📈 Discovering stocks with enhanced caching...');
    
    const stocks: CompanyInfo[] = [];
    
    // Try Finnhub first (most reliable)
    if (this.isAPIAvailable('finnhub')) {
    try {
        const finnhubStocks = await this.discoverStocksFromFinnhubCached();
      stocks.push(...finnhubStocks);
      console.log(`✅ Finnhub: ${finnhubStocks.length} stocks discovered`);
      } catch (error) {
        console.warn('⚠️ Finnhub stock discovery failed:', error);
      }
    }

    // Try Twelve Data as backup
    if (stocks.length < 50 && this.isAPIAvailable('twelveData')) {
      try {
        const twelveDataStocks = await this.discoverStocksFromTwelveDataCached();
        stocks.push(...twelveDataStocks);
        console.log(`✅ Twelve Data: ${twelveDataStocks.length} stocks discovered`);
      } catch (error) {
        console.warn('⚠️ Twelve Data stock discovery failed:', error);
      }
    }

    // Remove duplicates and limit
    const uniqueStocks = this.removeDuplicates(stocks);
    const maxAssets = options.maxAssets || 100;
    const finalStocks = uniqueStocks.slice(0, maxAssets);
    
    // Cache the result
    this.companyCache.set(cacheKey, finalStocks, 'Enhanced Discovery');
    
    // Update loading state
    this.loadingState.stocks.discovered = finalStocks.length;
    this.loadingState.stocks.lastUpdate = Date.now();
    
    return finalStocks;
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
    const exchanges = ['US', 'NASDAQ', 'NYSE', 'AMEX'];
    
    for (const exchange of exchanges) {
      if (!this.isAPIAvailable('finnhub')) break;
      
      try {
        const response = await fetch(`https://finnhub.io/api/v1/stock/symbol?exchange=${exchange}&token=${process.env.FINNHUB_API_KEY}`);
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data)) {
            const batch = data.slice(0, 50).map((stock: any) => ({
              symbol: stock.symbol,
              name: stock.description || stock.symbol,
              sector: stock.primarySic || 'Unknown',
              industry: stock.primarySic || 'Unknown',
              exchange: stock.primaryExchange || exchange
            }));
            stocks.push(...batch);
          }
        }
        
        this.trackAPIUsage('finnhub');
        await new Promise(resolve => setTimeout(resolve, 1200)); // Rate limit: 1 req/sec
      } catch (error) {
        console.warn(`⚠️ Finnhub exchange ${exchange} failed:`, error);
      }
    }

    // Cache the result
    this.apiResponseCache.set(cacheKey, stocks, 'Finnhub');

    return stocks;
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
            exchange: stock.exchange || 'Unknown'
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
   * Enhanced ETF discovery with caching
   */
  private async discoverETFsEnhanced(options: DiscoveryOptions = {}): Promise<CompanyInfo[]> {
    const cacheKey = 'etfs';
    const cached = this.companyCache.get(cacheKey);
    
    if (cached && cached.length >= 100) {
      console.log(`📋 Using cached ETFs data: ${cached.length} ETFs`);
      return cached;
    }

    console.log('📊 Discovering ETFs with enhanced caching...');
    
    const etfs: CompanyInfo[] = [];
    
    // Try Twelve Data first (most reliable for ETFs)
    if (this.isAPIAvailable('twelveData')) {
    try {
        const twelveDataETFs = await this.discoverETFsFromTwelveDataCached();
      etfs.push(...twelveDataETFs);
      console.log(`✅ Twelve Data: ${twelveDataETFs.length} ETFs discovered`);
      } catch (error) {
        console.warn('⚠️ Twelve Data ETF discovery failed:', error);
      }
    }

    // Try Finnhub as backup
    if (etfs.length < 100 && this.isAPIAvailable('finnhub')) {
      try {
        const finnhubETFs = await this.discoverETFsFromFinnhubCached();
        etfs.push(...finnhubETFs);
        console.log(`✅ Finnhub: ${finnhubETFs.length} ETFs discovered`);
      } catch (error) {
        console.warn('⚠️ Finnhub ETF discovery failed:', error);
      }
    }

    const uniqueETFs = this.removeDuplicates(etfs);
    const maxAssets = options.maxAssets || 300;
    const finalETFs = uniqueETFs.slice(0, maxAssets);
    
    // Cache the result
    this.companyCache.set(cacheKey, finalETFs, 'Enhanced Discovery');
    
    // Update loading state
    this.loadingState.etfs.discovered = finalETFs.length;
    this.loadingState.etfs.lastUpdate = Date.now();
    
    return finalETFs;
  }

  /**
   * Cached Twelve Data ETF discovery
   */
  private async discoverETFsFromTwelveDataCached(): Promise<CompanyInfo[]> {
    const cacheKey = this.generateAPICacheKey('twelveData', 'etfs', { country: 'US' });
    const cached = this.apiResponseCache.get(cacheKey);
    
    if (cached) {
      console.log('📋 Using cached Twelve Data ETFs data');
      return cached;
    }

    try {
      const response = await fetch(`https://api.twelvedata.com/etfs?country=US&apikey=${process.env.TWELVE_DATA_API_KEY}`);
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'ok' && Array.isArray(data.data)) {
          const etfs = data.data.slice(0, 200).map((etf: any) => ({
            symbol: etf.symbol,
            name: etf.name || etf.symbol,
            sector: 'ETF',
            industry: etf.category || 'Exchange Traded Fund',
            exchange: etf.exchange || 'ETF'
          }));
          
          // Cache the result
          this.apiResponseCache.set(cacheKey, etfs, 'Twelve Data');
          this.trackAPIUsage('twelveData');
          
          return etfs;
        }
      }
    } catch (error) {
      console.warn('⚠️ Twelve Data ETF discovery failed:', error);
    }

    return [];
  }

  /**
   * Cached Finnhub ETF discovery
   */
  private async discoverETFsFromFinnhubCached(): Promise<CompanyInfo[]> {
    const cacheKey = this.generateAPICacheKey('finnhub', 'etfs', {});
    const cached = this.apiResponseCache.get(cacheKey);
    
    if (cached) {
      console.log('📋 Using cached Finnhub ETFs data');
      return cached;
    }

    try {
      const response = await fetch(`https://finnhub.io/api/v1/etf/list?token=${process.env.FINNHUB_API_KEY}`);
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          const etfs = data.slice(0, 50).map((etf: any) => ({
            symbol: etf.symbol,
            name: etf.name || etf.symbol,
            sector: 'ETF',
            industry: etf.category || 'Exchange Traded Fund',
            exchange: etf.exchange || 'ETF'
          }));
          
          // Cache the result
          this.apiResponseCache.set(cacheKey, etfs, 'Finnhub');
          this.trackAPIUsage('finnhub');
          
          return etfs;
        }
      }
    } catch (error) {
      console.warn('⚠️ Finnhub ETF discovery failed:', error);
    }

    return [];
  }

  /**
   * Enhanced crypto discovery with caching
   */
  private async discoverCryptoEnhanced(options: DiscoveryOptions = {}): Promise<CompanyInfo[]> {
    const cacheKey = 'crypto';
    const cached = this.companyCache.get(cacheKey);
    
    if (cached && cached.length >= 300) {
      console.log(`📋 Using cached crypto data: ${cached.length} crypto`);
      return cached;
    }

    console.log('🪙 Discovering crypto with enhanced caching...');
    
    const crypto: CompanyInfo[] = [];
    
    // Try CoinGecko first (most reliable)
    if (this.isAPIAvailable('coinGecko')) {
    try {
        const coinGeckoCrypto = await this.discoverCryptoFromCoinGeckoCached();
      crypto.push(...coinGeckoCrypto);
      console.log(`✅ CoinGecko: ${coinGeckoCrypto.length} crypto discovered`);
      } catch (error) {
        console.warn('⚠️ CoinGecko discovery failed:', error);
      }
    }

    // Try DeFi Llama as backup (no rate limits)
    if (crypto.length < 400) {
      try {
        const defiLlamaCrypto = await this.discoverCryptoFromDeFiLlamaCached();
        crypto.push(...defiLlamaCrypto);
        console.log(`✅ DeFi Llama: ${defiLlamaCrypto.length} crypto discovered`);
      } catch (error) {
        console.warn('⚠️ DeFi Llama discovery failed:', error);
      }
    }

    const uniqueCrypto = this.removeDuplicates(crypto);
    const maxAssets = options.maxAssets || 200;
    const finalCrypto = uniqueCrypto.slice(0, maxAssets);
    
    // Cache the result
    this.companyCache.set(cacheKey, finalCrypto, 'Enhanced Discovery');
    
    // Update loading state
    this.loadingState.crypto.discovered = finalCrypto.length;
    this.loadingState.crypto.lastUpdate = Date.now();
    
    return finalCrypto;
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
              exchange: 'Crypto Exchange'
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
            exchange: 'DeFi Protocol'
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
            exchange: 'Blockchain Network'
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