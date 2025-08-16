/**
 * Company Discovery Service
 * Dynamically discovers and fetches company tickers and names from APIs
 * instead of hardcoding company information
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
  maxAssets?: number; // Added for progressive loading
  maxResults?: number; // Legacy support for existing methods
  priority?: 'low' | 'medium' | 'high'; // Added for progressive loading
  useCache?: boolean; // Added for progressive loading
  progressive?: boolean; // Added for progressive loading
  batchNumber?: number; // Added for progressive loading
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
// COMPANY DISCOVERY SERVICE CLASS
// ============================================================================

export class CompanyDiscoveryService {
  private discoveredCompanies: DiscoveredCompanies = {
    stocks: [],
    etfs: [],
    crypto: [],
    timestamp: Date.now(),
    dataSource: 'Progressive Discovery System'
  };
  
  private discoveryCache: Map<string, { data: DiscoveredCompanies; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  
  // Progressive loading state
  private progressiveLoadingState = {
    stocks: { currentBatch: 0, totalDiscovered: 0, maxAssets: 1200, batchSize: 100 },
    etfs: { currentBatch: 0, totalDiscovered: 0, maxAssets: 1000, batchSize: 100 },
    crypto: { currentBatch: 0, totalDiscovered: 0, maxAssets: 2000, batchSize: 100 }
  };

  constructor() {
    // Schedule periodic discovery refresh
    setInterval(() => this.refreshDiscovery(), 60 * 60 * 1000); // Every hour
  }

  /**
   * Generate cache key for discovery options
   */
  private generateCacheKey(options: DiscoveryOptions): string {
    return JSON.stringify(options);
  }

  /**
   * Refresh discovery data
   */
  private async refreshDiscovery(): Promise<void> {
    console.log('🔄 Refreshing company discovery data...');
    try {
      await this.discoverCompaniesProgressive({});
      console.log('✅ Company discovery refresh completed');
    } catch (error) {
      console.error('❌ Company discovery refresh failed:', error);
    }
  }

  /**
   * Get discovered companies with progressive loading
   * This method intelligently manages asset discovery to respect rate limits
   */
  async getDiscoveredCompanies(options: DiscoveryOptions = {}): Promise<DiscoveredCompanies> {
    const cacheKey = this.generateCacheKey(options);
    
    // Check cache first
    if (this.discoveryCache.has(cacheKey)) {
      const cached = this.discoveryCache.get(cacheKey)!;
      if (Date.now() - cached.timestamp < this.CACHE_DURATION) {
        console.log('📋 Using cached company discovery data');
        return cached.data;
      }
    }

    // Progressive discovery - start with manageable batches
    console.log('🚀 Starting progressive company discovery...');
    
    const result = await this.discoverCompaniesProgressive(options);
    
    // Cache the result
    this.discoveryCache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });

    return result;
  }

  /**
   * Progressive discovery that respects rate limits
   * Starts with small batches and gradually expands
   */
  private async discoverCompaniesProgressive(options: DiscoveryOptions): Promise<DiscoveredCompanies> {
    const result: DiscoveredCompanies = { 
      stocks: [], 
      etfs: [], 
      crypto: [],
      timestamp: Date.now(),
      dataSource: 'Progressive Discovery System'
    };

    // Phase 1: Initial discovery with manageable batches
    console.log('📊 Phase 1: Initial discovery with manageable batches...');
    
    // Stocks: Start with 100, expand to 1200
    result.stocks = await this.discoverStocksProgressive(options);
    
    // ETFs: Start with 100, expand to 1000  
    result.etfs = await this.discoverETFsProgressive(options);
    
    // Crypto: Start with 100, expand to 2000
    result.crypto = await this.discoverCryptoProgressive(options);

    console.log(`✅ Progressive discovery completed: ${result.stocks.length} stocks, ${result.etfs.length} ETFs, ${result.crypto.length} crypto`);
    return result;
  }

  /**
   * Progressive stock discovery
   */
  private async discoverStocksProgressive(options: DiscoveryOptions = {}): Promise<CompanyInfo[]> {
    const state = this.progressiveLoadingState.stocks;
    console.log(`📈 Progressive stock discovery: Batch ${state.currentBatch + 1}, Current: ${state.totalDiscovered}/${state.maxAssets}`);
    
    // If we haven't discovered the full amount yet, expand discovery
    if (state.totalDiscovered < state.maxAssets) {
      const newStocks = await this.discoverStocksOptimized({ 
        ...this.getProgressiveOptions('stocks'),
        maxAssets: Math.min(state.batchSize, state.maxAssets - state.totalDiscovered)
      });
      
      // Merge with existing discoveries
      const allStocks = [...this.discoveredCompanies.stocks, ...newStocks];
      const uniqueStocks = this.removeDuplicates(allStocks);
      
      // Update state
      this.discoveredCompanies.stocks = uniqueStocks.slice(0, state.maxAssets);
      state.totalDiscovered = this.discoveredCompanies.stocks.length;
      state.currentBatch++;
      
      console.log(`📈 Stocks expanded to ${state.totalDiscovered}/${state.maxAssets} (Batch ${state.currentBatch})`);
    }
    
    return this.discoveredCompanies.stocks;
  }

  /**
   * Progressive ETF discovery
   */
  private async discoverETFsProgressive(options: DiscoveryOptions = {}): Promise<CompanyInfo[]> {
    const state = this.progressiveLoadingState.etfs;
    console.log(`📊 Progressive ETF discovery: Batch ${state.currentBatch + 1}, Current: ${state.totalDiscovered}/${state.maxAssets}`);
    
    if (state.totalDiscovered < state.maxAssets) {
      const newETFs = await this.discoverETFsOptimized({ 
        ...this.getProgressiveOptions('etfs'),
        maxAssets: Math.min(state.batchSize, state.maxAssets - state.totalDiscovered)
      });
      
      const allETFs = [...this.discoveredCompanies.etfs, ...newETFs];
      const uniqueETFs = this.removeDuplicates(allETFs);
      
      this.discoveredCompanies.etfs = uniqueETFs.slice(0, state.maxAssets);
      state.totalDiscovered = this.discoveredCompanies.etfs.length;
      state.currentBatch++;
      
      console.log(`📊 ETFs expanded to ${state.totalDiscovered}/${state.maxAssets} (Batch ${state.currentBatch})`);
    }
    
    return this.discoveredCompanies.etfs;
  }

  /**
   * Progressive crypto discovery
   */
  private async discoverCryptoProgressive(options: DiscoveryOptions = {}): Promise<CompanyInfo[]> {
    const state = this.progressiveLoadingState.crypto;
    console.log(`🪙 Progressive crypto discovery: Batch ${state.currentBatch + 1}, Current: ${state.totalDiscovered}/${state.maxAssets}`);
    
    if (state.totalDiscovered < state.maxAssets) {
      const newCrypto = await this.discoverCryptoOptimized({ 
        ...this.getProgressiveOptions('crypto'),
        maxAssets: Math.min(state.batchSize, state.maxAssets - state.totalDiscovered)
      });
      
      const allCrypto = [...this.discoveredCompanies.crypto, ...newCrypto];
      const uniqueCrypto = this.removeDuplicates(allCrypto);
      
      this.discoveredCompanies.crypto = uniqueCrypto.slice(0, state.maxAssets);
      state.totalDiscovered = this.discoveredCompanies.crypto.length;
      state.currentBatch++;
      
      console.log(`🪙 Crypto expanded to ${state.totalDiscovered}/${state.maxAssets} (Batch ${state.currentBatch})`);
    }
    
    return this.discoveredCompanies.crypto;
  }

  /**
   * Get progressive discovery options based on current state
   */
  private getProgressiveOptions(assetType: 'stocks' | 'etfs' | 'crypto'): DiscoveryOptions {
    const state = this.progressiveLoadingState[assetType];
    
    return {
      maxAssets: Math.min(state.batchSize, state.maxAssets - state.totalDiscovered),
      priority: 'medium', // Start with medium priority, adjust based on rate limits
      useCache: true,
      progressive: true,
      batchNumber: state.currentBatch
    };
  }

  /**
   * Get current progressive loading status
   */
  getProgressiveLoadingStatus() {
    return {
      stocks: { ...this.progressiveLoadingState.stocks, discovered: this.discoveredCompanies.stocks.length },
      etfs: { ...this.progressiveLoadingState.etfs, discovered: this.discoveredCompanies.etfs.length },
      crypto: { ...this.progressiveLoadingState.crypto, discovered: this.discoveredCompanies.crypto.length }
    };
  }

  /**
   * Force expansion of asset discovery (for manual control)
   */
  async expandAssetDiscovery(assetType: 'stocks' | 'etfs' | 'crypto', targetAmount: number) {
    const state = this.progressiveLoadingState[assetType];
    const currentAmount = this.discoveredCompanies[assetType].length;
    
    if (targetAmount > currentAmount) {
      console.log(`🚀 Manually expanding ${assetType} from ${currentAmount} to ${targetAmount}`);
      
      switch (assetType) {
        case 'stocks':
          await this.discoverStocksProgressive();
          break;
        case 'etfs':
          await this.discoverETFsProgressive();
          break;
        case 'crypto':
          await this.discoverCryptoProgressive();
          break;
      }
    }
    
    return this.discoveredCompanies[assetType].length;
  }

  private async discoverStocksOptimized(options: DiscoveryOptions = {}): Promise<CompanyInfo[]> {
    console.log('📈 Discovering stocks with optimized strategy...');
    
    const stocks: CompanyInfo[] = [];
    
    // Strategy 1: Use Finnhub for stock discovery (60 req/min = very efficient)
    try {
      const finnhubStocks = await this.discoverStocksFromFinnhubOptimized();
      stocks.push(...finnhubStocks);
      console.log(`✅ Finnhub: ${finnhubStocks.length} stocks discovered`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.warn('⚠️ Finnhub stock discovery failed:', errorMessage);
    }

    // Strategy 2: Use Twelve Data as backup for stock discovery (800 req/day = very efficient)
    if (stocks.length < 200) {
      try {
        const twelveDataStocks = await this.discoverStocksFromTwelveDataOptimized();
        stocks.push(...twelveDataStocks);
        console.log(`✅ Twelve Data: ${twelveDataStocks.length} stocks discovered`);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.warn('⚠️ Twelve Data stock discovery failed:', errorMessage);
      }
    }

    // Remove duplicates and limit to requested size
    const uniqueStocks = this.removeDuplicates(stocks);
    const maxAssets = options.maxAssets || 300; // Default to 300 for progressive loading
    return uniqueStocks.slice(0, maxAssets);
  }

  private async discoverStocksFromFinnhubOptimized(): Promise<CompanyInfo[]> {
    const stocks: CompanyInfo[] = [];
    
    // Use multiple free endpoints efficiently - MAXIMIZE within 60 req/min limit
    const endpoints = [
      '/api/v1/stock/symbol?exchange=US', // US stocks
      '/api/v1/stock/symbol?exchange=NASDAQ', // NASDAQ stocks
      '/api/v1/stock/symbol?exchange=NYSE', // NYSE stocks
      '/api/v1/stock/symbol?exchange=AMEX' // AMEX stocks
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`https://finnhub.io${endpoint}&token=${process.env.FINNHUB_API_KEY}`);
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data)) {
            // Get maximum stocks per exchange within rate limits
            const batch = data.slice(0, 300).map((stock: any) => ({
              symbol: stock.symbol,
              name: stock.description || stock.symbol,
              sector: stock.primarySic || 'Unknown',
              industry: stock.primarySic || 'Unknown',
              exchange: stock.primaryExchange || 'Unknown'
            }));
            stocks.push(...batch);
          }
        }
        // Rate limit: 60 req/min = 1 req/sec, add small delay
        await new Promise(resolve => setTimeout(resolve, 1200));
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.warn(`⚠️ Finnhub endpoint ${endpoint} failed:`, errorMessage);
      }
    }

    return stocks;
  }

  private async discoverStocksFromTwelveDataOptimized(): Promise<CompanyInfo[]> {
    const stocks: CompanyInfo[] = [];
    
    try {
      // Use Twelve Data's symbol search efficiently - MAXIMIZE within 800 req/day limit
      const response = await fetch(`https://api.twelvedata.com/stocks?country=US&apikey=${process.env.TWELVE_DATA_API_KEY}`);
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'ok' && Array.isArray(data.data)) {
          // Get maximum stocks within daily rate limit
          const batch = data.data.slice(0, 600).map((stock: any) => ({
            symbol: stock.symbol,
            name: stock.name || stock.symbol,
            sector: stock.sector || 'Unknown',
            industry: stock.industry || 'Unknown',
            exchange: stock.exchange || 'Unknown'
          }));
          stocks.push(...batch);
        }
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.warn('⚠️ Twelve Data discovery failed:', errorMessage);
    }

    return stocks;
  }

  private async discoverStocksFromAlphaVantageOptimized(): Promise<CompanyInfo[]> {
    const stocks: CompanyInfo[] = [];
    
    // Use Alpha Vantage very sparingly - only top stocks
    const topStocks = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'META', 'NVDA', 'AMZN', 'BRK.A', 'JNJ', 'JPM'];
    
    for (const symbol of topStocks) {
      try {
        const response = await fetch(`https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol}&apikey=${process.env.ALPHA_VANTAGE_API_KEY}`);
        if (response.ok) {
          const data = await response.json();
          if (data.Symbol) {
            stocks.push({
              symbol: data.Symbol,
              name: data.Name || data.Symbol,
              sector: data.Sector || 'Unknown',
              industry: data.Industry || 'Unknown',
              exchange: data.Exchange || 'Unknown'
            });
          }
        }
        // Rate limit: 5 req/min = 1 req/12sec
        await new Promise(resolve => setTimeout(resolve, 13000));
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.warn(`⚠️ Alpha Vantage discovery for ${symbol} failed:`, errorMessage);
      }
    }

    return stocks;
  }

  private async discoverETFsOptimized(options: DiscoveryOptions = {}): Promise<CompanyInfo[]> {
    console.log('📊 Discovering ETFs with optimized strategy...');
    
    const etfs: CompanyInfo[] = [];
    
    // Strategy 1: Use Twelve Data for ETF discovery (800 req/day = very efficient)
    try {
      const twelveDataETFs = await this.discoverETFsFromTwelveDataOptimized();
      etfs.push(...twelveDataETFs);
      console.log(`✅ Twelve Data: ${twelveDataETFs.length} ETFs discovered`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.warn('⚠️ Twelve Data ETF discovery failed:', errorMessage);
    }

    // Strategy 2: Use Finnhub as backup for ETF discovery
    if (etfs.length < 200) {
      try {
        const finnhubETFs = await this.discoverETFsFromFinnhubOptimized();
        etfs.push(...finnhubETFs);
        console.log(`✅ Finnhub: ${finnhubETFs.length} ETFs discovered`);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.warn('⚠️ Finnhub ETF discovery failed:', errorMessage);
      }
    }

    // Remove duplicates and limit to requested size
    const uniqueETFs = this.removeDuplicates(etfs);
    const maxAssets = options.maxAssets || 400; // Default to 400 for progressive loading
    return uniqueETFs.slice(0, maxAssets);
  }

  private async discoverETFsFromTwelveDataOptimized(): Promise<CompanyInfo[]> {
    const etfs: CompanyInfo[] = [];
    
    try {
      // Get maximum ETFs within 800 req/day limit
      const response = await fetch(`https://api.twelvedata.com/etfs?country=US&apikey=${process.env.TWELVE_DATA_API_KEY}`);
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'ok' && Array.isArray(data.data)) {
          // Get maximum ETFs within daily rate limit
          const batch = data.data.slice(0, 700).map((etf: any) => ({
            symbol: etf.symbol,
            name: etf.name || etf.symbol,
            sector: 'ETF',
            industry: etf.category || 'Exchange Traded Fund',
            exchange: etf.exchange || 'ETF'
          }));
          etfs.push(...batch);
        }
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.warn('⚠️ Twelve Data ETF discovery failed:', errorMessage);
    }

    return etfs;
  }

  private async discoverETFsFromFinnhubOptimized(): Promise<CompanyInfo[]> {
    const etfs: CompanyInfo[] = [];
    
    try {
      // Get maximum ETFs within 60 req/min limit
      const response = await fetch(`https://finnhub.io/api/v1/etf/list?token=${process.env.FINNHUB_API_KEY}`);
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          // Get maximum ETFs within rate limit
          const batch = data.slice(0, 400).map((etf: any) => ({
            symbol: etf.symbol,
            name: etf.name || etf.symbol,
            sector: 'ETF',
            industry: etf.category || 'Exchange Traded Fund',
            exchange: etf.exchange || 'ETF'
          }));
          etfs.push(...batch);
        }
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.warn('⚠️ Finnhub ETF discovery failed:', errorMessage);
    }

    return etfs;
  }

  private async discoverCryptoOptimized(options: DiscoveryOptions = {}): Promise<CompanyInfo[]> {
    console.log('🪙 Discovering crypto with optimized strategy...');
    
    const crypto: CompanyInfo[] = [];
    
    // Strategy 1: CoinGecko (50 req/min = very efficient) - MAXIMIZE USAGE
    try {
      const coinGeckoCrypto = await this.discoverCryptoFromCoinGeckoOptimized();
      crypto.push(...coinGeckoCrypto);
      console.log(`✅ CoinGecko: ${coinGeckoCrypto.length} crypto discovered`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.warn('⚠️ CoinGecko discovery failed:', errorMessage);
    }

    // Strategy 2: CoinMarketCap (10,000 req/month = very generous) - MAXIMIZE USAGE
    if (crypto.length < 500) {
      try {
        const coinMarketCapCrypto = await this.discoverCryptoFromCoinMarketCapOptimized();
        crypto.push(...coinMarketCapCrypto);
        console.log(`✅ CoinMarketCap: ${coinMarketCapCrypto.length} crypto discovered`);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.warn('⚠️ CoinMarketCap discovery failed:', errorMessage);
      }
    }

    // Strategy 3: DeFi Llama (80 req/min = very generous) - MAXIMIZE USAGE
    if (crypto.length < 800) {
      try {
        const defiLlamaCrypto = await this.discoverCryptoFromDeFiLlamaOptimized();
        crypto.push(...defiLlamaCrypto);
        console.log(`✅ DeFi Llama: ${defiLlamaCrypto.length} crypto discovered`);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.warn('⚠️ DeFi Llama discovery failed:', errorMessage);
      }
    }

    // Remove duplicates and limit to requested size
    const uniqueCrypto = this.removeDuplicates(crypto);
    const maxAssets = options.maxAssets || 800; // Default to 800 for progressive loading
    return uniqueCrypto.slice(0, maxAssets);
  }

  private async discoverCryptoFromCoinGeckoOptimized(): Promise<CompanyInfo[]> {
    const crypto: CompanyInfo[] = [];
    
    try {
      // Get maximum coins by market cap within 50 req/min limit
      for (let page = 1; page <= 4; page++) {
        const response = await fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=${page}&sparkline=false`);
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
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.warn('⚠️ CoinGecko discovery failed:', errorMessage);
    }

    return crypto;
  }

  private async discoverCryptoFromCoinMarketCapOptimized(): Promise<CompanyInfo[]> {
    const crypto: CompanyInfo[] = [];
    
    try {
      // Get maximum coins by market cap within 10,000 req/month limit
      for (let start = 1; start <= 1500; start += 500) {
        const response = await fetch(`https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest?start=${start}&limit=500&convert=USD`, {
          headers: {
            'X-CMC_PRO_API_KEY': process.env.COINMARKETCAP_API_KEY || ''
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.data && Array.isArray(data.data)) {
            const batch = data.data.map((coin: any) => ({
              symbol: coin.symbol || coin.name?.toUpperCase(),
              name: coin.name || coin.symbol?.toUpperCase(),
              sector: 'Cryptocurrency',
              industry: coin.category || 'Digital Asset',
              exchange: 'Crypto Exchange'
            }));
            crypto.push(...batch);
          }
        }
        // Rate limit: 10,000 req/month = very generous, small delay
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.warn('⚠️ CoinMarketCap discovery failed:', errorMessage);
    }

    return crypto;
  }

  private async discoverCryptoFromDeFiLlamaOptimized(): Promise<CompanyInfo[]> {
    const crypto: CompanyInfo[] = [];
    
    try {
      // Get maximum protocols by TVL within 80 req/min limit
      const response = await fetch('https://api.llama.fi/protocols');
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          const batch = data.slice(0, 500).map((protocol: any) => ({
            symbol: protocol.symbol?.toUpperCase() || protocol.name?.substring(0, 5).toUpperCase(),
            name: protocol.name || protocol.symbol?.toUpperCase(),
            sector: 'DeFi Protocol',
            industry: protocol.category || 'Decentralized Finance',
            exchange: 'DeFi Protocol'
          }));
          crypto.push(...batch);
        }
      }

      // Get maximum chains by TVL within 80 req/min limit
      const chainsResponse = await fetch('https://api.llama.fi/chains');
      if (chainsResponse.ok) {
        const chainsData = await chainsResponse.json();
        if (Array.isArray(chainsData)) {
          const batch = chainsData.slice(0, 200).map((chain: any) => ({
            symbol: chain.tokenSymbol?.toUpperCase() || chain.name?.substring(0, 5).toUpperCase(),
            name: chain.name || chain.tokenSymbol?.toUpperCase(),
            sector: 'Blockchain',
            industry: 'Layer 1 Protocol',
            exchange: 'Blockchain Network'
          }));
          crypto.push(...batch);
        }
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.warn('⚠️ DeFi Llama discovery failed:', errorMessage);
    }

    return crypto;
  }

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

  // ============================================================================
  // STOCK DISCOVERY METHODS
  // ============================================================================

  private async discoverStocks(options: DiscoveryOptions): Promise<CompanyInfo[]> {
    const companies: CompanyInfo[] = [];
    
    try {
      // Try Finnhub first (has comprehensive company lists)
      const finnhubCompanies = await this.discoverStocksFromFinnhub(options);
      companies.push(...finnhubCompanies);
      
      if (companies.length === 0) {
        // Fallback to Alpha Vantage
        const alphaVantageCompanies = await this.discoverStocksFromAlphaVantage(options);
        companies.push(...alphaVantageCompanies);
      }
      
      if (companies.length === 0) {
        // Final fallback to Twelve Data
        const twelveDataCompanies = await this.discoverStocksFromTwelveData(options);
        companies.push(...twelveDataCompanies);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.warn('Stock discovery failed:', errorMessage);
    }

    // Remove duplicates and sort by market cap
    return this.removeDuplicateCompanies(companies)
      .sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0))
      .slice(0, options.maxResults || 500);
  }

  private async discoverStocksFromFinnhub(options: DiscoveryOptions): Promise<CompanyInfo[]> {
    try {
      // Get S&P 500 companies (major stocks)
      const sp500Response = await enhancedRateLimitMonitor.scheduleRequest('finnhub', async () => {
        const response = await axios.get('https://finnhub.io/api/v1/index/constituents', {
          params: { 
            symbol: '^GSPC',
            token: API_KEYS.finnhub 
          },
          timeout: 10000
        });
        return response.data;
      }, 'high');

      if (sp500Response && sp500Response.constituents) {
        const companies: CompanyInfo[] = [];
        
        // Process S&P 500 companies
        for (const symbol of sp500Response.constituents.slice(0, options.maxResults || 500)) {
          try {
            // Get company profile for each symbol
            const profileResponse = await enhancedRateLimitMonitor.scheduleRequest('finnhub', async () => {
              const response = await axios.get('https://finnhub.io/api/v1/company/profile2', {
                params: { 
                  symbol,
                  token: API_KEYS.finnhub 
                },
                timeout: 5000
              });
              return response.data;
            }, 'medium');

            if (profileResponse && profileResponse.profile) {
              const profile = profileResponse.profile;
              companies.push({
                symbol: profile.ticker || symbol,
                name: profile.name || symbol,
                sector: profile.finnhubIndustry || 'Unknown',
                industry: profile.finnhubIndustry || 'Unknown',
                marketCap: profile.marketCapitalization ? parseFloat(profile.marketCapitalization) : undefined,
                exchange: profile.exchange || 'Unknown',
                country: profile.country || 'Unknown',
                website: profile.weburl || undefined,
                description: profile.description || undefined
              });
            } else {
              // Fallback to basic info
              companies.push({
                symbol,
                name: symbol,
                sector: 'Unknown',
                industry: 'Unknown'
              });
            }
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.warn(`Failed to get profile for ${symbol}:`, errorMessage);
            // Add basic info anyway
            companies.push({
              symbol,
              name: symbol,
              sector: 'Unknown',
              industry: 'Unknown'
            });
          }
        }
        
        return companies;
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.warn('Finnhub S&P 500 discovery failed:', errorMessage);
    }

    return [];
  }

  private async discoverStocksFromAlphaVantage(options: DiscoveryOptions): Promise<CompanyInfo[]> {
    try {
      // Alpha Vantage has a list of top gainers/losers that we can use
      const topMoversResponse = await enhancedRateLimitMonitor.scheduleRequest('alphaVantage', async () => {
        const response = await axios.get('https://www.alphavantage.co/query', {
          params: {
            function: 'TOP_GAINERS_LOSERS',
            apikey: API_KEYS.alphaVantage
          },
          timeout: 10000
        });
        return response.data;
      }, 'medium');

      if (topMoversResponse && (topMoversResponse.top_gainers || topMoversResponse.top_losers)) {
        const companies: CompanyInfo[] = [];
        
        // Process top gainers
        if (topMoversResponse.top_gainers) {
          for (const stock of topMoversResponse.top_gainers) {
            companies.push({
              symbol: stock.ticker,
              name: stock.price,
              sector: 'Unknown',
              industry: 'Unknown',
              marketCap: undefined
            });
          }
        }
        
        // Process top losers
        if (topMoversResponse.top_losers) {
          for (const stock of topMoversResponse.top_losers) {
            companies.push({
              symbol: stock.ticker,
              name: stock.price,
              sector: 'Unknown',
              industry: 'Unknown',
              marketCap: undefined
            });
          }
        }
        
        return companies;
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.warn('Alpha Vantage discovery failed:', errorMessage);
    }

    return [];
  }

  private async discoverStocksFromTwelveData(options: DiscoveryOptions): Promise<CompanyInfo[]> {
    try {
      // Twelve Data has a stocks list endpoint
      const stocksResponse = await enhancedRateLimitMonitor.scheduleRequest('twelveData', async () => {
        const response = await axios.get('https://api.twelvedata.com/stocks', {
          params: {
            country: 'US',
            apikey: API_KEYS.twelveData
          },
          timeout: 10000
        });
        return response.data;
      }, 'medium');

      if (stocksResponse && stocksResponse.data) {
        return stocksResponse.data.slice(0, options.maxResults || 200).map((stock: any) => ({
          symbol: stock.symbol,
          name: stock.name,
          sector: stock.sector || 'Unknown',
          industry: stock.industry || 'Unknown',
          marketCap: undefined,
          exchange: stock.exchange || 'Unknown',
          country: stock.country || 'Unknown'
        }));
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.warn('Twelve Data discovery failed:', errorMessage);
    }

    return [];
  }

  // ============================================================================
  // ETF DISCOVERY METHODS
  // ============================================================================

  private async discoverETFs(options: DiscoveryOptions): Promise<CompanyInfo[]> {
    try {
      // ETFs are essentially stocks, so we can use stock discovery
      // but filter for known ETF symbols and add ETF-specific properties
      const stockCompanies = await this.discoverStocks({ ...options, maxResults: 1000 });
      
      // Filter for ETFs (common ETF symbols)
      const etfSymbols = new Set([
        'SPY', 'QQQ', 'IWM', 'VTI', 'VEA', 'VWO', 'BND', 'GLD', 'TLT', 'AGG',
        'XLK', 'XLF', 'XLV', 'XLE', 'XLI', 'XLP', 'XLY', 'XLU', 'XLB', 'XLC',
        'EFA', 'EEM', 'FXI', 'EWJ', 'EWG', 'EWU', 'EWC', 'EWA', 'EWZ', 'EWY',
        'USO', 'UNG', 'DBA', 'DBC', 'DJP', 'GSG', 'PPLT', 'PALL'
      ]);
      
      return stockCompanies
        .filter(company => etfSymbols.has(company.symbol))
        .map(company => ({
          ...company,
          sector: this.getETFCategory(company.symbol),
          industry: 'ETF'
        }));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.warn('ETF discovery failed:', errorMessage);
      return [];
    }
  }

  private getETFCategory(symbol: string): string {
    const etfCategories: Record<string, string> = {
      'SPY': 'Broad Market',
      'QQQ': 'Technology',
      'IWM': 'Small Cap',
      'VTI': 'Broad Market',
      'VEA': 'International',
      'VWO': 'Emerging Markets',
      'BND': 'Bonds',
      'GLD': 'Commodity',
      'TLT': 'Bonds',
      'AGG': 'Bonds'
    };
    
    return etfCategories[symbol] || 'Other';
  }

  // ============================================================================
  // CRYPTO DISCOVERY METHODS
  // ============================================================================

  private async discoverCrypto(options: DiscoveryOptions): Promise<CompanyInfo[]> {
    try {
      // Try CoinGecko first (has comprehensive crypto lists)
      const coinGeckoCrypto = await this.discoverCryptoFromCoinGecko(options);
      if (coinGeckoCrypto.length > 0) {
        return coinGeckoCrypto;
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.warn('CoinGecko crypto discovery failed:', errorMessage);
    }

    try {
      // Fallback to CoinMarketCap
      const coinMarketCapCrypto = await this.discoverCryptoFromCoinMarketCap(options);
      if (coinMarketCapCrypto.length > 0) {
        return coinMarketCapCrypto;
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.warn('CoinMarketCap crypto discovery failed:', errorMessage);
    }

    return [];
  }

  private async discoverCryptoFromCoinGecko(options: DiscoveryOptions): Promise<CompanyInfo[]> {
    try {
      const response = await enhancedRateLimitMonitor.scheduleRequest('coinGecko', async () => {
        const response = await axios.get('https://api.coingecko.com/api/v3/coins/markets', {
          params: {
            vs_currency: 'usd',
            order: 'market_cap_desc',
            per_page: options.maxResults || 200,
            page: 1,
            sparkline: false
          },
          timeout: 10000
        });
        return response.data;
      }, 'high');

      return response.map((coin: any) => ({
        symbol: coin.symbol.toUpperCase(),
        name: coin.name,
        sector: this.getCryptoCategory(coin.id),
        industry: 'Cryptocurrency',
        marketCap: coin.market_cap,
        exchange: 'Crypto Exchange',
        country: 'Global',
        website: coin.links?.homepage?.[0] || undefined,
        description: coin.description?.en ? coin.description.en.substring(0, 200) + '...' : undefined
      }));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to discover crypto from CoinGecko:', errorMessage);
      return [];
    }
  }

  private async discoverCryptoFromCoinMarketCap(options: DiscoveryOptions): Promise<CompanyInfo[]> {
    try {
      const response = await enhancedRateLimitMonitor.scheduleRequest('coinMarketCap', async () => {
        const response = await axios.get('https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest', {
          params: {
            start: 1,
            limit: options.maxResults || 200,
            convert: 'USD'
          },
          headers: {
            'X-CMC_PRO_API_KEY': API_KEYS.coinMarketCap
          },
          timeout: 10000
        });
        return response.data;
      }, 'medium');

      return response.data.map((coin: any) => ({
        symbol: coin.symbol,
        name: coin.name,
        sector: this.getCryptoCategory(coin.slug),
        industry: 'Cryptocurrency',
        marketCap: coin.quote.USD.market_cap,
        exchange: 'Crypto Exchange',
        country: 'Global'
      }));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to discover crypto from CoinMarketCap:', errorMessage);
      return [];
    }
  }

  private getCryptoCategory(coinId: string): string {
    const categories: Record<string, string> = {
      'bitcoin': 'Layer 1',
      'ethereum': 'Layer 1',
      'cardano': 'Layer 1',
      'solana': 'Layer 1',
      'polkadot': 'Layer 1',
      'avalanche-2': 'Layer 1',
      'cosmos': 'Layer 1',
      'near': 'Layer 1',
      'algorand': 'Layer 1',
      'tezos': 'Layer 1',
      'chainlink': 'DeFi',
      'uniswap': 'DeFi',
      'aave': 'DeFi',
      'compound': 'DeFi',
      'sushi': 'DeFi',
      'curve-dao-token': 'DeFi',
      'yearn-finance': 'DeFi',
      'synthetix-network-token': 'DeFi',
      '1inch': 'DeFi',
      'balancer': 'DeFi',
      'axie-infinity': 'Gaming',
      'the-sandbox': 'Gaming',
      'decentraland': 'Gaming',
      'enjin-coin': 'Gaming',
      'gala': 'Gaming',
      'illuvium': 'Gaming',
      'star-atlas': 'Gaming',
      'alien-worlds': 'Gaming',
      'splinterlands': 'Gaming',
      'crypto-blades': 'Gaming',
      'dogecoin': 'Meme',
      'shiba-inu': 'Meme',
      'pepe': 'Meme',
      'bonk': 'Meme',
      'floki': 'Meme',
      'baby-doge-coin': 'Meme',
      'safe-moon': 'Meme',
      'elon': 'Meme',
      'doge-killer': 'Meme',
      'baby-shiba-inu': 'Meme'
    };
    
    return categories[coinId] || 'Other';
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private removeDuplicateCompanies(companies: CompanyInfo[]): CompanyInfo[] {
    const seen = new Set<string>();
    return companies.filter(company => {
      const key = company.symbol.toUpperCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  // Force refresh of discovered companies
  async refreshCompanies(): Promise<DiscoveredCompanies> {
    // Clear cache and rediscover
    this.discoveryCache.clear();
    this.progressiveLoadingState.stocks.totalDiscovered = 0;
    this.progressiveLoadingState.etfs.totalDiscovered = 0;
    this.progressiveLoadingState.crypto.totalDiscovered = 0;
    return await this.getDiscoveredCompanies();
  }

  // Search discovered companies
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

  // Get companies by sector
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

  // Get statistics about discovered companies
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
      progressiveLoading: this.getProgressiveLoadingStatus()
    };
  }
}

// Export singleton instance
export const companyDiscoveryService = new CompanyDiscoveryService(); 