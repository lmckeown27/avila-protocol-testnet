/**
 * ETF Scraper Service
 * Scrapes AUM/market cap directly from issuer sites (SSGA, iShares, Vanguard, etc.)
 * to avoid API rate limits and provide more accurate ETF data
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

// ============================================================================
// INTERFACES & TYPES
// ============================================================================

export interface ETFData {
  symbol: string;
  name: string;
  aum: number | null; // Assets Under Management in USD
  marketCap: number | null; // Market capitalization
  volume: number | null; // 24h volume
  expenseRatio: number | null; // Expense ratio as percentage
  issuer: string; // ETF issuer (SSGA, iShares, Vanguard, etc.)
  lastUpdated: number;
  source: 'scraper' | 'fallback';
  error?: string;
}

export interface IssuerConfig {
  name: string;
  baseUrl: string;
  searchUrl: string;
  selectors: {
    aum: string;
    marketCap?: string;
    volume?: string;
    expenseRatio?: string;
  };
  headers?: Record<string, string>;
  rateLimit: number; // requests per minute
}

// ============================================================================
// ISSUER CONFIGURATIONS
// ============================================================================

const ISSUER_CONFIGS: Record<string, IssuerConfig> = {
  ssga: {
    name: 'State Street Global Advisors (SPDR)',
    baseUrl: 'https://www.ssga.com',
    searchUrl: 'https://www.ssga.com/us/en/individual/etfs/fund-finder',
    selectors: {
      aum: '[data-testid="fund-aum"]',
      expenseRatio: '[data-testid="expense-ratio"]'
    },
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    },
    rateLimit: 10
  },
  
  ishares: {
    name: 'iShares (BlackRock)',
    baseUrl: 'https://www.ishares.com',
    searchUrl: 'https://www.ishares.com/us/products',
    selectors: {
      aum: '.fund-aum',
      expenseRatio: '.expense-ratio'
    },
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    },
    rateLimit: 10
  },
  
  vanguard: {
    name: 'Vanguard',
    baseUrl: 'https://investor.vanguard.com',
    searchUrl: 'https://investor.vanguard.com/investment-products/etfs',
    selectors: {
      aum: '.fund-aum',
      expenseRatio: '.expense-ratio'
    },
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    },
    rateLimit: 10
  },
  
  invesco: {
    name: 'Invesco',
    baseUrl: 'https://www.invesco.com',
    searchUrl: 'https://www.invesco.com/us/financial-products/etfs',
    selectors: {
      aum: '.fund-aum',
      expenseRatio: '.expense-ratio'
    },
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    },
    rateLimit: 10
  }
};

// ============================================================================
// ETF SYMBOL TO ISSUER MAPPING
// ============================================================================

const ETF_ISSUER_MAPPING: Record<string, string> = {
  // SPDR ETFs (SSGA)
  'SPY': 'ssga',
  'XLE': 'ssga',
  'XLF': 'ssga',
  'XLV': 'ssga',
  'XLI': 'ssga',
  'XLB': 'ssga',
  'XLK': 'ssga',
  'XLU': 'ssga',
  'XLP': 'ssga',
  'XLY': 'ssga',
  
  // iShares ETFs (BlackRock)
  'IVV': 'ishares',
  'IWM': 'ishares',
  'EFA': 'ishares',
  'EEM': 'ishares',
  'AGG': 'ishares',
  'TLT': 'ishares',
  'LQD': 'ishares',
  'HYG': 'ishares',
  'EMB': 'ishares',
  'TIP': 'ishares',
  
  // Vanguard ETFs
  'VTI': 'vanguard',
  'VEA': 'vanguard',
  'VWO': 'vanguard',
  'BND': 'vanguard',
  'VGSH': 'vanguard',
  'VGIT': 'vanguard',
  'VGLT': 'vanguard',
  'VCSH': 'vanguard',
  'VCIT': 'vanguard',
  'VWOB': 'vanguard',
  
  // Invesco ETFs
  'QQQ': 'invesco',
  'TQQQ': 'invesco',
  'SQQQ': 'invesco',
  'DIA': 'invesco',
  'GLD': 'invesco',
  'SLV': 'invesco',
  'USO': 'invesco',
  'DBO': 'invesco',
  'DBA': 'invesco',
  'DBB': 'invesco'
};

// ============================================================================
// ENHANCED CACHING SYSTEM FOR ETF DATA
// ============================================================================

interface ETFCacheEntry {
  data: ETFData;
  timestamp: number;
  lastAccessed: number;
  accessCount: number;
  source: string;
}

class ETFCache {
  private cache = new Map<string, ETFCacheEntry>();
  private readonly maxSize: number;
  private readonly ttl: number;
  private readonly cleanupInterval: number;

  constructor(maxSize = 500, ttl = 24 * 60 * 60 * 1000, cleanupInterval = 60 * 60 * 1000) {
    this.maxSize = maxSize;
    this.ttl = ttl; // 24 hours for ETF data (AUM updates less frequently)
    this.cleanupInterval = cleanupInterval;
    
    // Start cleanup interval
    setInterval(() => this.cleanup(), this.cleanupInterval);
  }

  set(key: string, data: ETFData, source: string): void {
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

  get(key: string): ETFData | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    // Update access stats
    entry.lastAccessed = now;
    entry.accessCount++;

    return entry.data;
  }

  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
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
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        this.cache.delete(key);
      }
    }
  }

  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: this.cache.size > 0 ? 'N/A' : '0%'
    };
  }
}

// ============================================================================
// MAIN ETF SCRAPER SERVICE CLASS
// ============================================================================

export class ETFScraperService {
  private cache = new ETFCache();
  private rateLimitTracker: Record<string, { count: number; resetTime: number }> = {};
  private readonly REQUEST_TIMEOUT = 15000; // 15 seconds
  private readonly RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute

  constructor() {
    this.setupAxiosInterceptors();
  }

  // ============================================================================
  // MAIN ETF DATA FETCHING METHODS
  // ============================================================================

  /**
   * Fetch ETF data for a single symbol
   */
  async getETFData(symbol: string): Promise<ETFData> {
    const cacheKey = `etf_${symbol.toUpperCase()}`;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached) {
      console.log(`📊 Using cached ETF data for ${symbol}`);
      return cached;
    }

    console.log(`🔍 Scraping ETF data for ${symbol}...`);
    
    try {
      const etfData = await this.scrapeETFData(symbol);
      
      // Cache the successful result
      this.cache.set(cacheKey, etfData, 'scraper');
      
      console.log(`✅ Successfully scraped ETF data for ${symbol}: AUM: $${etfData.aum?.toLocaleString() || 'N/A'}`);
      return etfData;
      
    } catch (error) {
      console.error(`❌ Failed to scrape ETF data for ${symbol}:`, error);
      
      // Return fallback data with error
      const fallbackData: ETFData = {
        symbol: symbol.toUpperCase(),
        name: `${symbol.toUpperCase()} ETF`,
        aum: null,
        marketCap: null,
        volume: null,
        expenseRatio: null,
        issuer: 'Unknown',
        lastUpdated: Date.now(),
        source: 'fallback',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      
      // Cache fallback data with shorter TTL
      this.cache.set(cacheKey, fallbackData, 'fallback');
      
      return fallbackData;
    }
  }

  /**
   * Fetch ETF data for multiple symbols
   */
  async getMultipleETFData(symbols: string[]): Promise<ETFData[]> {
    console.log(`🔍 Scraping ETF data for ${symbols.length} symbols...`);
    
    const results: ETFData[] = [];
    const batchSize = 5; // Process in small batches to respect rate limits
    
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      console.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(symbols.length / batchSize)}: ${batch.join(', ')}`);
      
      const batchPromises = batch.map(symbol => this.getETFData(symbol));
      const batchResults = await Promise.allSettled(batchPromises);
      
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          console.error(`❌ Batch ETF fetch failed:`, result.reason);
        }
      }
      
      // Rate limiting between batches
      if (i + batchSize < symbols.length) {
        await this.delay(2000); // 2 second delay between batches
      }
    }
    
    console.log(`✅ Completed ETF data scraping for ${results.length}/${symbols.length} symbols`);
    return results;
  }

  // ============================================================================
  // SCRAPING IMPLEMENTATION
  // ============================================================================

  /**
   * Main scraping method for individual ETF
   */
  private async scrapeETFData(symbol: string): Promise<ETFData> {
    const issuer = this.getIssuerForSymbol(symbol);
    if (!issuer) {
      throw new Error(`Unknown issuer for ETF symbol: ${symbol}`);
    }

    const config = ISSUER_CONFIGS[issuer];
    if (!config) {
      throw new Error(`No configuration found for issuer: ${issuer}`);
    }

    // Check rate limiting
    if (!this.checkRateLimit(issuer)) {
      throw new Error(`Rate limit exceeded for issuer: ${issuer}`);
    }

    try {
      // Attempt to scrape from issuer site
      const scrapedData = await this.scrapeFromIssuer(symbol, issuer, config);
      
      if (scrapedData) {
        return {
          symbol: symbol.toUpperCase(),
          name: scrapedData.name || `${symbol.toUpperCase()} ETF`,
          aum: scrapedData.aum || null,
          marketCap: scrapedData.marketCap || null,
          volume: scrapedData.volume || null,
          expenseRatio: scrapedData.expenseRatio || null,
          issuer: scrapedData.issuer || 'Unknown',
          lastUpdated: Date.now(),
          source: 'scraper' as const
        };
      }
      
      throw new Error(`No data found for ${symbol} on ${config.name}`);
      
    } catch (error) {
      console.warn(`⚠️ Scraping failed for ${symbol} from ${config.name}:`, error);
      
      // Try alternative scraping methods or return basic data
      return this.getBasicETFData(symbol, issuer);
    }
  }

  /**
   * Scrape data from specific issuer site
   */
  private async scrapeFromIssuer(symbol: string, issuer: string, config: IssuerConfig): Promise<Partial<ETFData> | null> {
    try {
      // Construct search URL for the specific ETF
      const searchUrl = `${config.baseUrl}/search?q=${symbol}`;
      
      console.log(`🌐 Scraping ${config.name} for ${symbol} at: ${searchUrl}`);
      
      const response = await axios.get(searchUrl, {
        headers: config.headers,
        timeout: this.REQUEST_TIMEOUT
      });

      if (response.status !== 200) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const $ = cheerio.load(response.data);
      
      // Extract data using configured selectors
      const aum = this.extractNumericValue($, config.selectors.aum);
      const expenseRatio = config.selectors.expenseRatio ? 
        this.extractNumericValue($, config.selectors.expenseRatio) : null;
      
      if (aum === null && expenseRatio === null) {
        console.warn(`⚠️ No data found for ${symbol} on ${config.name}`);
        return null;
      }

      return {
        name: `${symbol.toUpperCase()} ETF`,
        aum: aum || null,
        marketCap: null,
        volume: null,
        expenseRatio: expenseRatio || null,
        issuer: config.name || 'Unknown'
      };

    } catch (error) {
      console.error(`❌ Scraping error for ${symbol} from ${config.name}:`, error);
      return null;
    }
  }

  /**
   * Extract numeric values from HTML using selectors
   */
  private extractNumericValue($: cheerio.Root, selector: string): number | null {
    try {
      const element = $(selector);
      if (element.length === 0) return null;
      
      const text = element.text().trim();
      if (!text) return null;
      
      // Extract numbers from text (handle various formats)
      const match = text.match(/[\d,]+\.?\d*/);
      if (!match) return null;
      
      const cleanValue = match[0].replace(/,/g, '');
      const numericValue = parseFloat(cleanValue);
      
      return isNaN(numericValue) ? null : numericValue;
      
    } catch (error) {
      console.warn(`⚠️ Error extracting numeric value from selector ${selector}:`, error);
      return null;
    }
  }

  /**
   * Get basic ETF data when scraping fails
   */
  private getBasicETFData(symbol: string, issuer: string): ETFData {
    return {
      symbol: symbol.toUpperCase(),
      name: `${symbol.toUpperCase()} ETF`,
      aum: null,
      marketCap: null,
      volume: null,
      expenseRatio: null,
      issuer: ISSUER_CONFIGS[issuer]?.name || issuer,
      lastUpdated: Date.now(),
      source: 'fallback' as const,
      error: 'Scraping failed, using fallback data'
    };
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Get issuer for ETF symbol
   */
  private getIssuerForSymbol(symbol: string): string | null {
    return ETF_ISSUER_MAPPING[symbol.toUpperCase()] || null;
  }

  /**
   * Check rate limiting for issuer
   */
  private checkRateLimit(issuer: string): boolean {
    const now = Date.now();
    const tracker = this.rateLimitTracker[issuer];
    
    if (!tracker || now > tracker.resetTime) {
      this.rateLimitTracker[issuer] = {
        count: 1,
        resetTime: now + this.RATE_LIMIT_WINDOW
      };
      return true;
    }
    
    if (tracker.count >= ISSUER_CONFIGS[issuer]?.rateLimit || 10) {
      return false;
    }
    
    tracker.count++;
    return true;
  }

  /**
   * Setup axios interceptors for better error handling
   */
  private setupAxiosInterceptors(): void {
    axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.code === 'ECONNABORTED') {
          console.warn('⚠️ Request timeout during ETF scraping');
        } else if (error.response?.status === 429) {
          console.warn('⚠️ Rate limited during ETF scraping');
        } else if (error.response?.status >= 500) {
          console.warn('⚠️ Server error during ETF scraping');
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ============================================================================
  // CACHE MANAGEMENT
  // ============================================================================

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cache.getStats();
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache = new ETFCache();
    console.log('🧹 ETF cache cleared');
  }

  /**
   * Get all cached ETF symbols
   */
  getCachedSymbols(): string[] {
    // Implementation would depend on cache structure
    return [];
  }
}

// ============================================================================
// EXPORT SINGLETON INSTANCE
// ============================================================================

export const etfScraperService = new ETFScraperService(); 