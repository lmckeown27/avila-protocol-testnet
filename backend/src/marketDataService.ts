// Market Data Service for Mock Decentralized Options Platform
// Fetches and normalizes data from multiple free APIs with fallback logic

// Load environment variables from .env file
import dotenv from 'dotenv';
dotenv.config();

import axios, { AxiosResponse, AxiosError } from 'axios';

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
}

export interface MarketDataResponse {
  tradfi: NormalizedAsset[];
  defi: NormalizedAsset[];
  timestamp: number;
  dataSources: string[];
  errors: string[];
}

export interface TradFiAsset {
  symbol: string;
  price: number;
  change: number;
  volume: number;
  marketCap: number;
  high: number;
  low: number;
  open: number;
  name?: string;
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

export interface DeFiProtocol {
  name: string;
  symbol: string;
  tvl: number;
  change_1d: number;
  volume_1d?: number;
  market_cap?: number;
}

// ============================================================================
// API CONFIGURATION
// ============================================================================

const API_CONFIG = {
  // TradFi APIs
  finnhub: {
    baseUrl: 'https://finnhub.io/api/v1',
    token: process.env['FINNHUB_API_KEY'] || 'demo', // Free tier available
    rateLimit: 60 // requests per minute
  },
  alphaVantage: {
    baseUrl: 'https://www.alphavantage.co/query',
    token: process.env['ALPHA_VANTAGE_API_KEY'] || 'demo', // Free tier available
    rateLimit: 5 // requests per minute
  },
  twelveData: {
    baseUrl: 'https://api.twelvedata.com',
    token: process.env['TWELVE_DATA_API_KEY'] || 'demo', // Free tier available
    rateLimit: 8 // requests per minute
  },

  // Crypto APIs
  coinGecko: {
    baseUrl: 'https://api.coingecko.com/api/v3',
    rateLimit: 50 // requests per minute
  },
  coinMarketCap: {
    baseUrl: 'https://pro-api.coinmarketcap.com/v1',
    token: process.env['COINMARKETCAP_API_KEY'] || 'demo',
    rateLimit: 10 // requests per minute
  },
  cryptoCompare: {
    baseUrl: 'https://min-api.cryptocompare.com/data',
    rateLimit: 100 // requests per minute
  },

  // DeFi APIs
  defiLlama: {
    baseUrl: 'https://api.llama.fi',
    rateLimit: 100 // requests per minute
  },
  uniswap: {
    baseUrl: 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v2',
    rateLimit: 100 // requests per minute
  },

  // Sentiment APIs
  alternativeMe: {
    baseUrl: 'https://api.alternative.me',
    rateLimit: 100 // requests per minute
  }
};

// ============================================================================
// DEFAULT ASSET LISTS
// ============================================================================

const DEFAULT_STOCK_SYMBOLS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSFT', 'META', 'NVDA', 'NFLX',
  'SPY', 'QQQ', 'IWM', 'VTI', 'VEA', 'VWO', 'BND', 'GLD',
  '^GSPC', '^DJI', '^IXIC', '^RUT' // Major indices
];

const DEFAULT_CRYPTO_IDS = [
  'bitcoin', 'ethereum', 'chainlink', 'cardano', 'solana',
  'ripple', 'polkadot', 'dogecoin', 'avalanche-2', 'matic-network'
];

const DEFAULT_DEFI_PROTOCOLS = [
  'uniswap', 'aave', 'compound', 'makerdao', 'curve',
  'synthetix', 'yearn-finance', 'balancer', 'sushi', '1inch'
];

// ============================================================================
// MAIN MARKET DATA SERVICE CLASS
// ============================================================================

export class MarketDataService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  
  // Enhanced cache for market cap, volume, TVL, and fundamental data
  private marketDataCache: { 
    [symbol: string]: { 
      marketCap: number | null; 
      volume: number | null; 
      tvl?: number | null;
      pe?: number | null;

      timestamp: number 
    } 
  } = {};
  
  private readonly CACHE_DURATION_MS = 10 * 60 * 1000; // 10 minutes
  private readonly POLLING_INTERVAL = 30000; // 30 seconds
  private isPolling = false;
  private pollingInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.setupAxiosInterceptors();
  }

  // ============================================================================
  // ENHANCED MARKET DATA FETCHING WITH CACHING
  // ============================================================================

  /**
   * Enhanced function to retrieve TradFi market data (stocks only - ETFs blocked)
   */
  private async getStockMarketData(symbol: string): Promise<{ marketCap: number | null; volume: number | null; pe?: number | null }> {
    // Check if this is an ETF symbol and block API calls
    const etfSymbols = ['SPY', 'QQQ', 'IWM', 'VTI', 'VEA', 'VWO', 'BND', 'GLD', '^GSPC', '^DJI', '^IXIC', '^RUT'];
    if (etfSymbols.includes(symbol)) {
      console.warn(`🚫 ETF data blocked from API for ${symbol}, reroute to scraper`);
      return { marketCap: null, volume: null, pe: null };
    }
          const cacheKey = `stock_${symbol}`;
    const cached = this.marketDataCache[cacheKey];
    const now = Date.now();

    // Return cached data if still valid
    if (cached && now - cached.timestamp < this.CACHE_DURATION_MS) {
      console.log(`📊 Using cached TradFi market data for ${symbol}`);
              return { 
          marketCap: cached.marketCap, 
          volume: cached.volume,
          pe: cached.pe
        };
    }

    let marketCap: number | null = null;
    let volume: number | null = null;
    let pe: number | null = null;

    try {
      // Use Finnhub for TradFi assets (stocks, ETFs)
      console.log(`🔍 Fetching TradFi market data for ${symbol} from Finnhub...`);
      
      // Get market cap from stock/metric endpoint
      const finnhubMetricRes = await axios.get(`${API_CONFIG.finnhub.baseUrl}/stock/metric`, {
        params: { 
          symbol, 
          metric: 'all', 
          token: API_CONFIG.finnhub.token 
        },
        timeout: 5000
      });
      
      if (finnhubMetricRes.data && finnhubMetricRes.data.metric) {
        marketCap = finnhubMetricRes.data.metric.marketCapitalization || null;
        pe = finnhubMetricRes.data.metric.peBasicExclExtraTTM || null;
        console.log(`✅ Finnhub market cap for ${symbol}: ${marketCap}, P/E: ${pe}`);
      }

      // Get volume from quote endpoint
      const finnhubQuoteRes = await axios.get(`${API_CONFIG.finnhub.baseUrl}/quote`, {
        params: { 
          symbol, 
          token: API_CONFIG.finnhub.token 
        },
        timeout: 5000
      });
      
      if (finnhubQuoteRes.data && finnhubQuoteRes.data.v) {
        volume = finnhubQuoteRes.data.v; // 24h volume from quote endpoint
        console.log(`✅ Finnhub volume for ${symbol}: ${volume}`);
      }
      
      console.log(`✅ Finnhub TradFi data for ${symbol}: Market Cap: ${marketCap}, Volume: ${volume}`);
    } catch (err) {
      console.warn(`⚠️ Finnhub TradFi market data fetch failed for ${symbol}:`, err);
    }

    // Fallback to Alpha Vantage for TradFi if needed
    if (!marketCap || !volume) {
      try {
        console.log(`🔍 Fetching TradFi market data for ${symbol} from Alpha Vantage...`);
        
        // Try OVERVIEW for comprehensive fundamental data
        const alphaOverviewRes = await axios.get(API_CONFIG.alphaVantage.baseUrl, {
          params: {
            function: 'OVERVIEW',
            symbol,
            apikey: API_CONFIG.alphaVantage.token
          },
          timeout: 5000
        });
        
        if (alphaOverviewRes.data) {
          // Market cap (if not already from Finnhub)
          if (!marketCap && alphaOverviewRes.data.MarketCapitalization) {
            marketCap = parseFloat(alphaOverviewRes.data.MarketCapitalization);
            console.log(`✅ Alpha Vantage market cap for ${symbol}: ${marketCap}`);
          }
          
          // P/E ratio (if not already from Finnhub)
          if (!pe && alphaOverviewRes.data.PERatio) {
            pe = parseFloat(alphaOverviewRes.data.PERatio);
            console.log(`✅ Alpha Vantage P/E for ${symbol}: ${pe}`);
          }
          

        }

        // Try TIME_SERIES_DAILY for volume
        if (!volume) {
          const alphaVolumeRes = await axios.get(API_CONFIG.alphaVantage.baseUrl, {
            params: {
              function: 'TIME_SERIES_DAILY',
              symbol,
              apikey: API_CONFIG.alphaVantage.token
            },
            timeout: 5000
          });
          
          if (alphaVolumeRes.data && alphaVolumeRes.data['Time Series (Daily)']) {
            const timeSeries = alphaVolumeRes.data['Time Series (Daily)'];
            const latestDate = Object.keys(timeSeries)[0];
            if (latestDate && timeSeries[latestDate]['5. volume']) {
              volume = parseFloat(timeSeries[latestDate]['5. volume']);
              console.log(`✅ Alpha Vantage volume for ${symbol}: ${volume}`);
            }
          }
        }
        
        console.log(`✅ Alpha Vantage TradFi data for ${symbol}: Market Cap: ${marketCap}, Volume: ${volume}, P/E: ${pe}`);
      } catch (err) {
        console.warn(`⚠️ Alpha Vantage TradFi market data fetch failed for ${symbol}:`, err);
      }
    }

    // Use Twelve Data as final fallback - Most comprehensive fallback
    if (!marketCap || !volume || !pe) {
      try {
        console.log(`🔍 Fetching TradFi market data for ${symbol} from Twelve Data...`);
        
        const twelveRes = await axios.get(`${API_CONFIG.twelveData.baseUrl}/stocks`, {
          params: {
            symbol,
            apikey: API_CONFIG.twelveData.token
          },
          timeout: 5000
        });
        
        if (twelveRes.data && twelveRes.data.data && twelveRes.data.data.length > 0) {
          const stockData = twelveRes.data.data[0];
          
          if (!marketCap) marketCap = stockData.market_cap || null;
          if (!volume) volume = stockData.volume || null;
          if (!pe) pe = stockData.pe_ratio || null;
          
          console.log(`✅ Twelve Data TradFi data for ${symbol}: Market Cap: ${marketCap}, Volume: ${volume}, P/E: ${pe}`);
        }
      } catch (err) {
        console.warn(`⚠️ Twelve Data TradFi market data fetch failed for ${symbol}:`, err);
      }
    }

    // Cache the results with TradFi prefix (including new fields)
    this.marketDataCache[cacheKey] = { marketCap, volume, pe, timestamp: now };
    console.log(`💾 Cached TradFi market data for ${symbol}: Market Cap: ${marketCap}, Volume: ${volume}, P/E: ${pe}`);

    return { marketCap, volume, pe };
  }

  /**
   * Enhanced function to retrieve DeFi market data (cryptocurrencies)
   */
  private async getDeFiMarketData(symbol: string): Promise<{ marketCap: number | null; volume: number | null; tvl?: number | null }> {
    const cacheKey = `defi_${symbol}`;
    const cached = this.marketDataCache[cacheKey];
    const now = Date.now();

    // Return cached data if still valid
    if (cached && now - cached.timestamp < this.CACHE_DURATION_MS) {
      console.log(`📊 Using cached DeFi market data for ${symbol}`);
      return { marketCap: cached.marketCap, volume: cached.volume, tvl: cached.tvl };
    }

    let marketCap: number | null = null;
    let volume: number | null = null;
    let tvl: number | null = null;

    try {
      // Use CoinMarketCap for DeFi assets (cryptocurrencies) - Fastest for basic metrics
      if (API_CONFIG.coinMarketCap.token !== 'demo') {
        console.log(`🔍 Fetching DeFi market data for ${symbol} from CoinMarketCap...`);
        try {
          // First, search for the cryptocurrency to get its ID
          const searchRes = await axios.get(`${API_CONFIG.coinMarketCap.baseUrl}/cryptocurrency/map`, {
            params: { 
              symbol: symbol.toUpperCase(),
              limit: 1
            },
            headers: {
              'X-CMC_PRO_API_KEY': API_CONFIG.coinMarketCap.token
            },
            timeout: 10000
          });
          
          if (searchRes.data && searchRes.data.data && searchRes.data.data.length > 0) {
            const coinId = searchRes.data.data[0].id;
            console.log(`✅ Found CoinMarketCap ID for ${symbol}: ${coinId}`);
            
            // Now get the quotes using the ID
            const cmcRes = await axios.get(`${API_CONFIG.coinMarketCap.baseUrl}/cryptocurrency/quotes/latest`, {
              params: { 
                id: coinId,
                convert: 'USD'
              },
              headers: {
                'X-CMC_PRO_API_KEY': API_CONFIG.coinMarketCap.token
              },
              timeout: 10000
            });
            
            if (cmcRes.data && cmcRes.data.data && cmcRes.data.data[coinId]) {
              const coinData = cmcRes.data.data[coinId];
              marketCap = coinData.quote.USD.market_cap || null;
              volume = coinData.quote.USD.volume_24h || null;
              console.log(`✅ CoinMarketCap DeFi data for ${symbol}: Market Cap: ${marketCap}, Volume: ${volume}`);
            }
          }
        } catch (cmcErr) {
          console.warn(`⚠️ CoinMarketCap DeFi fetch failed for ${symbol}:`, cmcErr);
        }
      }

      // Use DeFi Llama for TVL and protocol-specific data - Best for DeFi insights
      try {
        console.log(`🔍 Fetching DeFi protocol data for ${symbol} from DeFi Llama...`);
        
        // Try to get protocol TVL data
        const defiLlamaRes = await axios.get(`${API_CONFIG.defiLlama.baseUrl}/protocols`, {
          timeout: 8000
        });
        
        if (defiLlamaRes.data && Array.isArray(defiLlamaRes.data)) {
          // Find protocol by symbol (case-insensitive)
          const protocol = defiLlamaRes.data.find(p => 
            p.symbol?.toLowerCase() === symbol.toLowerCase() ||
            p.name?.toLowerCase().includes(symbol.toLowerCase())
          );
          
          if (protocol) {
            tvl = protocol.tvl || null;
            console.log(`✅ DeFi Llama protocol data for ${symbol}: TVL: ${tvl}`);
          }
        }
      } catch (defiErr) {
        console.warn(`⚠️ DeFi Llama fetch failed for ${symbol}:`, defiErr);
      }

      // Fallback to CoinGecko for DeFi if needed - Most comprehensive fallback
      if (!marketCap || !volume) {
        try {
          console.log(`🔍 Fetching DeFi market data for ${symbol} from CoinGecko...`);
          const geckoRes = await axios.get(`${API_CONFIG.coinGecko.baseUrl}/simple/price`, {
            params: {
              ids: symbol.toLowerCase(),
              vs_currencies: 'usd',
              include_market_cap: true,
              include_24hr_vol: true
            },
            timeout: 10000
          });
          
          if (geckoRes.data && geckoRes.data[symbol.toLowerCase()]) {
            const coinData = geckoRes.data[symbol.toLowerCase()];
            marketCap = marketCap || coinData.usd_market_cap || null;
            volume = volume || coinData.usd_24h_vol || null;
            console.log(`✅ CoinGecko DeFi data for ${symbol}: Market Cap: ${marketCap}, Volume: ${volume}`);
          }
        } catch (err) {
          console.warn(`⚠️ CoinGecko DeFi market data fetch failed for ${symbol}:`, err);
        }
      }
    } catch (err) {
      console.warn(`⚠️ DeFi market data fetch failed for ${symbol}:`, err);
    }

    // Cache the results with DeFi prefix (including TVL)
    this.marketDataCache[cacheKey] = { marketCap, volume, tvl, timestamp: now };
    console.log(`💾 Cached DeFi market data for ${symbol}: Market Cap: ${marketCap}, Volume: ${volume}, TVL: ${tvl}`);

    return { marketCap, volume, tvl };
  }

  // ============================================================================
  // PUBLIC METHODS
  // ============================================================================

  /**
   * Get all market data (TradFi + DeFi) with fallback logic
   */
  async getAllMarketData(): Promise<MarketDataResponse> {
    try {
      const [tradfiData, defiData] = await Promise.all([
        this.getStockData(),
        this.getDeFiData()
      ]);

      return {
        tradfi: tradfiData,
        defi: defiData,
        timestamp: Date.now(),
        dataSources: this.getActiveDataSources(),
        errors: []
      };
    } catch (error) {
      console.error('Failed to fetch market data:', error);
      return {
        tradfi: this.getEmptyStockData(),
        defi: this.getEmptyDeFiData(),
        timestamp: Date.now(),
        dataSources: ['API Failure'],
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Get TradFi market data with fallback logic
   */
  async getStockData(): Promise<NormalizedAsset[]> {
    const cacheKey = 'tradfi';
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      const result = await this.fetchTradFiDataFromAPIs();
      this.cacheData(cacheKey, result);
      return result;
    } catch (error) {
      console.error('All TradFi APIs failed, returning empty data:', error);
      // Return empty data instead of mock data to indicate API failure
              const emptyResult = this.getEmptyStockData();
      this.cacheData(cacheKey, emptyResult);
      return emptyResult;
    }
  }

  /**
   * Get DeFi market data with fallback logic
   */
  async getDeFiData(): Promise<NormalizedAsset[]> {
    const cacheKey = 'defi';
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      const result = await this.fetchDeFiDataFromAPIs();
      this.cacheData(cacheKey, result);
      return result;
    } catch (error) {
      console.error('All DeFi APIs failed, returning empty data:', error);
      // Return empty data instead of mock data to indicate API failure
      const emptyResult = this.getEmptyDeFiData();
      this.cacheData(cacheKey, emptyResult);
      return emptyResult;
    }
  }

  /**
   * Start polling for real-time updates
   */
  startPolling(callback?: (data: MarketDataResponse) => void): void {
    if (this.isPolling) return;

    this.isPolling = true;
    console.log('🔄 Starting market data polling...');

    this.pollingInterval = setInterval(async () => {
      try {
        const data = await this.getAllMarketData();
        if (callback) callback(data);
      } catch (error) {
        console.error('❌ Polling error:', error);
      }
    }, this.POLLING_INTERVAL);
  }

  /**
   * Stop polling
   */
  stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.isPolling = false;
    console.log('⏹️ Stopped market data polling');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { 
    size: number; 
    keys: string[]; 
    hitRate: number;
    marketDataCache: {
      size: number;
      keys: string[];
      hitRate: number;
    };
  } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      hitRate: this.calculateCacheHitRate(),
      marketDataCache: {
        size: Object.keys(this.marketDataCache).length,
        keys: Object.keys(this.marketDataCache),
        hitRate: this.calculateMarketDataCacheHitRate()
      }
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    console.log('🗑️ Main cache cleared');
  }

  /**
   * Clear enhanced market data cache
   */
  clearMarketDataCache(): void {
    this.marketDataCache = {};
    console.log('🗑️ Enhanced market data cache cleared');
  }

  /**
   * Clear all caches
   */
  clearAllCaches(): void {
    this.cache.clear();
    this.marketDataCache = {};
    console.log('🗑️ All caches cleared');
  }

  // ============================================================================
  // STOCK MARKET DATA SOURCES
  // ============================================================================

  private async fetchFromFinnhub(): Promise<NormalizedAsset[]> {
    try {
      const symbols = DEFAULT_STOCK_SYMBOLS.slice(0, 10); // Limit for free tier
      const promises = symbols.map(async (symbol) => {
        // Fetch basic quote data
        const quoteResponse = await axios.get(`${API_CONFIG.finnhub.baseUrl}/quote`, {
          params: { symbol, token: API_CONFIG.finnhub.token },
          timeout: 5000
        });
        
        // Fetch enhanced market data (market cap and volume)
        const marketData = await this.getStockMarketData(symbol);
        
        return { 
          ...quoteResponse.data, 
          symbol,
          marketCap: marketData.marketCap,
          volume: marketData.volume || quoteResponse.data.v // Use quote volume as fallback
        };
      });

      const results = await Promise.all(promises);
      return results
        .filter(quote => quote.c && quote.c > 0)
        .map(quote => ({
          asset: quote.symbol,
          symbol: quote.symbol,
          price: quote.c,
          change24h: quote.d, // Use the correct percentage change from Finnhub
          volume24h: quote.volume || quote.v || 0,
          marketCap: quote.marketCap || 0,
          source: 'Finnhub',
          lastUpdated: Date.now(),
          high24h: quote.h,
          low24h: quote.l,
          open24h: quote.o
        }));

    } catch (error) {
      console.warn('⚠️ Finnhub fetch failed:', error);
      return [];
    }
  }

  private async fetchFromAlphaVantage(): Promise<NormalizedAsset[]> {
    try {
      const symbols = DEFAULT_STOCK_SYMBOLS.slice(0, 5); // Limit for free tier
      const promises = symbols.map(async (symbol) => {
        const response = await axios.get(API_CONFIG.alphaVantage.baseUrl, {
          params: {
            function: 'TIME_SERIES_INTRADAY',
            symbol,
            interval: '1min',
            apikey: API_CONFIG.alphaVantage.token
          },
          timeout: 5000
        });
        return response.data;
      });

      const results = await Promise.all(promises);
      return results
        .filter(data => data['Time Series (1min)'])
        .map(data => {
          const timeSeries = data['Time Series (1min)'];
          const latestTime = Object.keys(timeSeries)[0];
          if (!latestTime) return null;
          
          const latestData = timeSeries[latestTime];
          if (!latestData) return null;
          
          return {
            asset: data['Meta Data']['2. Symbol'],
            symbol: data['Meta Data']['2. Symbol'],
            price: parseFloat(latestData['4. close']),
            change24h: 0, // Alpha Vantage intraday doesn't provide 24h change // Alpha Vantage intraday doesn't provide 24h change
            volume24h: parseFloat(latestData['5. volume']),
            marketCap: 0,
            source: 'Alpha Vantage',
            lastUpdated: Date.now(),
            high24h: parseFloat(latestData['2. high']),
            low24h: parseFloat(latestData['3. low']),
            open24h: parseFloat(latestData['1. open'])
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);

    } catch (error) {
      console.warn('⚠️ Alpha Vantage fetch failed:', error);
      return [];
    }
  }

  private async fetchFromTwelveData(): Promise<NormalizedAsset[]> {
    try {
      const symbols = DEFAULT_STOCK_SYMBOLS.slice(0, 5); // Limit for free tier
      const promises = symbols.map(async (symbol) => {
        const response = await axios.get(`${API_CONFIG.twelveData.baseUrl}/time_series`, {
          params: {
            symbol,
            interval: '1min',
            apikey: API_CONFIG.twelveData.token
          },
          timeout: 5000
        });
        return response.data;
      });

      const results = await Promise.all(promises);
      return results
        .filter(data => data.values && data.values.length > 0)
        .map(data => {
          const latest = data.values[0];
          return {
            asset: data.meta.symbol,
            symbol: data.meta.symbol,
            price: parseFloat(latest.close),
            change24h: 0, // Twelve Data intraday doesn't provide 24h change // Twelve Data intraday doesn't provide 24h change
            volume24h: parseFloat(latest.volume),
            marketCap: 0,
            source: 'Twelve Data',
            lastUpdated: Date.now(),
            high24h: parseFloat(latest.high),
            low24h: parseFloat(latest.low),
            open24h: parseFloat(latest.open)
          };
        });

    } catch (error) {
      console.warn('⚠️ Twelve Data fetch failed:', error);
      return [];
    }
  }

  // ============================================================================
  // DIGITAL ASSETS DATA SOURCES
  // ============================================================================

  private async fetchFromCoinGecko(): Promise<NormalizedAsset[]> {
    try {
      const response = await axios.get(`${API_CONFIG.coinGecko.baseUrl}/coins/markets`, {
        params: {
          vs_currency: 'usd',
          ids: DEFAULT_CRYPTO_IDS.join(','),
          order: 'market_cap_desc',
          per_page: 20,
          page: 1,
          sparkline: false
        },
        timeout: 10000
      });

      return response.data.map((coin: CryptoAsset) => {
        // Calculate percentage change from absolute change and current price
        const percentageChange = coin.current_price > 0 
          ? (coin.price_change_24h / coin.current_price) * 100 
          : 0;
        
        return {
          asset: coin.name,
          symbol: coin.symbol.toUpperCase(),
          name: coin.name,
          price: coin.current_price,
          change24h: percentageChange, // Use percentage change instead of absolute
          volume24h: coin.total_volume,
          marketCap: coin.market_cap,
          source: 'CoinGecko',
          lastUpdated: Date.now(),
          high24h: coin.high_24h,
          low24h: coin.low_24h
        };
      });

    } catch (error) {
      console.warn('⚠️ CoinGecko fetch failed:', error);
      return [];
    }
  }

  private async fetchFromDefiLlama(): Promise<NormalizedAsset[]> {
    try {
      const response = await axios.get(`${API_CONFIG.defiLlama.baseUrl}/protocols`, {
        timeout: 10000
      });

      return response.data
        .filter((protocol: DeFiProtocol) => 
          DEFAULT_DEFI_PROTOCOLS.includes(protocol.name.toLowerCase())
        )
        .slice(0, 20)
        .map((protocol: DeFiProtocol) => ({
          asset: protocol.name,
          symbol: protocol.symbol.toUpperCase(),
          name: protocol.name,
          price: protocol.tvl / 1000000, // Convert to millions
          change24h: protocol.change_1d || 0,
          volume24h: protocol.volume_1d || 0,
          marketCap: protocol.market_cap || protocol.tvl,
          source: 'DefiLlama',
          lastUpdated: Date.now(),
          high24h: protocol.tvl / 1000000, // Use TVL as placeholder for now
          low24h: protocol.tvl / 1000000,  // Use TVL as placeholder for now
          open24h: protocol.tvl / 1000000  // Use TVL as placeholder for now
        }));

    } catch (error) {
      console.warn('⚠️ DefiLlama fetch failed:', error);
      return [];
    }
  }

  // ============================================================================
  // FALLBACK DATA METHODS
  // ============================================================================

  /**
   * Fetch TradFi data from multiple APIs
   */
  private async fetchTradFiDataFromAPIs(): Promise<NormalizedAsset[]> {
    const sources = [
      () => this.fetchFromFinnhub(),
      () => this.fetchFromAlphaVantage(),
      () => this.fetchFromTwelveData()
    ];

    // Try sources in parallel, use first successful response
    const results = await Promise.allSettled(sources.map(source => source()));
    const successfulResults = results
      .filter((result): result is PromiseFulfilledResult<NormalizedAsset[]> => 
        result.status === 'fulfilled' && result.value.length > 0
      )
      .map(result => result.value);

    if (successfulResults.length > 0) {
      const data = successfulResults[0];
      if (data) {
        return data;
      }
    }

    throw new Error('All TradFi data sources failed');
  }

  /**
   * Fetch DeFi data from multiple APIs
   */
  private async fetchDeFiDataFromAPIs(): Promise<NormalizedAsset[]> {
    const sources = [
      () => this.fetchFromCoinGecko(),
      () => this.fetchFromDefiLlama()
    ];

    // Try sources in parallel, use first successful response
    const results = await Promise.allSettled(sources.map(source => source()));
    const successfulResults = results
      .filter((result): result is PromiseFulfilledResult<NormalizedAsset[]> => 
        result.status === 'fulfilled' && result.value.length > 0
      )
      .map(result => result.value);

    if (successfulResults.length > 0) {
      const data = successfulResults[0];
      if (data) {
        return data;
      }
    }

    throw new Error('All DeFi data sources failed');
  }

  /**
   * Get cached data if available and not expired
   */
  private getCachedData(key: string): NormalizedAsset[] | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < 60000) { // 60 seconds TTL
      return cached.data;
    }
    return null;
  }

  /**
   * Return empty TradFi data to indicate API failure
   */
  private getEmptyStockData(): NormalizedAsset[] {
    return DEFAULT_STOCK_SYMBOLS.map((symbol: string) => ({
      asset: symbol,
      symbol: symbol,
      price: 0,
      change24h: 0,
      volume24h: 0,
      marketCap: 0,
      source: 'API Failure',
      lastUpdated: Date.now(),
      high24h: 0,
      low24h: 0,
      open24h: 0
    }));
  }

  /**
   * Return empty DeFi data to indicate API failure
   */
  private getEmptyDeFiData(): NormalizedAsset[] {
    return DEFAULT_CRYPTO_IDS.map(id => ({
      asset: id,
      symbol: id.toUpperCase().slice(0, 4),
      price: 0,
      change24h: 0,
      volume24h: 0,
      marketCap: 0,
      source: 'API Failure',
      lastUpdated: Date.now(),
      high24h: 0,
      low24h: 0,
      open24h: 0
    }));
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private getActiveDataSources(): string[] {
    const sources: string[] = [];
    if (this.cache.has('stock')) sources.push('Stock Market APIs');
    if (this.cache.has('defi')) sources.push('Digital Assets APIs');
    if (sources.length === 0) sources.push('Fallback');
    return sources;
  }

  private cacheData(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  private calculateCacheHitRate(): number {
    // Simple cache hit rate calculation
    return this.cache.size > 0 ? 0.8 : 0; // Placeholder
  }

  private calculateMarketDataCacheHitRate(): number {
    // Calculate market data cache hit rate
    const totalRequests = Object.keys(this.marketDataCache).length;
    if (totalRequests === 0) return 0;
    
    // For now, return a placeholder - in production you'd track actual hits vs misses
    return 0.85; // Placeholder - 85% hit rate
  }

  private setupAxiosInterceptors(): void {
    // Add request interceptor for rate limiting
    axios.interceptors.request.use((config) => {
      // Add custom headers
      config.headers['User-Agent'] = 'Avila-Protocol-Market-Data/1.0';
      return config;
    });

    // Add response interceptor for error handling
    axios.interceptors.response.use(
      (response: AxiosResponse) => response,
      (error: AxiosError) => {
        if (error.response) {
          console.warn(`⚠️ API Error ${error.response.status}: ${error.response.statusText}`);
        } else if (error.request) {
          console.warn('⚠️ Network Error: No response received');
        } else {
          console.warn('⚠️ Request Error:', error.message);
        }
        return Promise.reject(error);
      }
    );
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

// Export singleton instance
export const marketDataService = new MarketDataService();

// Export utility functions
export const getMarketData = () => marketDataService.getAllMarketData();
export const getStockData = () => marketDataService.getStockData();
export const getDeFiData = () => marketDataService.getDeFiData();
export const startMarketDataPolling = (callback?: (data: MarketDataResponse) => void) => 
  marketDataService.startPolling(callback);
export const stopMarketDataPolling = () => marketDataService.stopPolling(); 