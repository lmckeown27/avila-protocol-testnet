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
  high: number;
  low: number;
  open: number;
  previousClose: number;
  exchange: string;
  lastUpdated: number;
}

export interface TradFiMarketData {
  assets: TradFiAsset[];
  timestamp: number;
  totalMarketCap: number;
  totalVolume: number;
}

class TradFiDataService {
  private cache = new Map<string, { data: TradFiMarketData; timestamp: number }>();
  private readonly CACHE_TTL = 60000; // 60 seconds

  // Default symbols for major stocks and ETFs
  private readonly DEFAULT_SYMBOLS = [
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX',
    'SPY', 'QQQ', 'IWM', 'VTI', 'VEA', 'VWO', 'BND', 'GLD'
  ];

  /**
   * Get market data for specified symbols from real APIs
   */
  async getTradfiMarketData(symbols: string[] = this.DEFAULT_SYMBOLS): Promise<TradFiMarketData> {
    const cacheKey = `tradfi_${symbols.sort().join('_')}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      // Try to fetch real data from free APIs
      const result = await this.fetchRealMarketData(symbols);
      this.setCachedData(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Failed to fetch real market data, using fallback:', error);
      // Fallback to mock data if all APIs fail
      const fallbackResult = this.generateFallbackData(symbols);
      this.setCachedData(cacheKey, fallbackResult);
      return fallbackResult;
    }
  }

  /**
   * Get market data for a single symbol
   */
  async getAssetData(symbol: string): Promise<TradFiAsset | null> {
    try {
      const marketData = await this.getTradfiMarketData([symbol]);
      return marketData.assets.find(asset => asset.symbol === symbol) || null;
    } catch (error) {
      console.error(`Failed to get asset data for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Get market data for major indices
   */
  async getMajorIndices(): Promise<TradFiAsset[]> {
    const indices = ['^GSPC', '^DJI', '^IXIC', '^RUT']; // S&P 500, Dow, NASDAQ, Russell 2000
    try {
      const marketData = await this.getTradfiMarketData(indices);
      return marketData.assets;
    } catch (error) {
      console.error('Failed to get major indices:', error);
      return [];
    }
  }

  /**
   * Get market data for popular ETFs
   */
  async getPopularETFs(): Promise<TradFiAsset[]> {
    const etfs = ['SPY', 'QQQ', 'IWM', 'VTI', 'VEA', 'VWO', 'BND', 'GLD'];
    try {
      const marketData = await this.getTradfiMarketData(etfs);
      return marketData.assets;
    } catch (error) {
      console.error('Failed to get popular ETFs:', error);
      return [];
    }
  }

  /**
   * Get market data for tech stocks
   */
  async getTechStocks(): Promise<TradFiAsset[]> {
    const techStocks = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX'];
    try {
      const marketData = await this.getTradfiMarketData(techStocks);
      return marketData.assets;
    } catch (error) {
      console.error('Failed to get tech stocks:', error);
      return [];
    }
  }

  /**
   * Search assets by name or symbol
   */
  async searchAssets(query: string): Promise<TradFiAsset[]> {
    if (!query || query.length < 2) {
      return [];
    }

    try {
      // Search within default symbols
      const marketData = await this.getTradfiMarketData();
      const queryLower = query.toLowerCase();
      
      return marketData.assets.filter(asset => 
        asset.symbol.toLowerCase().includes(queryLower) ||
        asset.name.toLowerCase().includes(queryLower)
      );
    } catch (error) {
      console.error('Failed to search assets:', error);
      return [];
    }
  }

  /**
   * Get historical data for an asset (placeholder for future implementation)
   */
  async getHistoricalData(_symbol: string, days: number = 7): Promise<any[]> {
    // This would typically use a historical data endpoint
    // For now, return mock data
    const mockData = [];
    const now = Date.now();
    const basePrice = 100 + Math.random() * 900; // Random base price
    
    for (let i = days - 1; i >= 0; i--) {
      const timestamp = now - (i * 24 * 60 * 60 * 1000);
      const priceVariation = (Math.random() - 0.5) * 0.05; // ±2.5% variation
      const price = basePrice * (1 + priceVariation);
      
      mockData.push({
        timestamp,
        price: parseFloat(price.toFixed(2)),
        volume: Math.floor(Math.random() * 1000000) + 100000,
        change: parseFloat((priceVariation * 100).toFixed(2))
      });
    }
    
    return mockData;
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  // Private helper methods

  private getCachedData(key: string): TradFiMarketData | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }
    return null;
  }

  private setCachedData(key: string, data: TradFiMarketData): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Fetch real market data from free APIs
   */
  private async fetchRealMarketData(symbols: string[]): Promise<TradFiMarketData> {
    // Try APIs in sequence for better reliability
    const apis = [
      () => this.fetchFromFinnhub(symbols),
      () => this.fetchFromAlphaVantage(symbols),
      () => this.fetchFromTwelveData(symbols)
    ];

    for (const api of apis) {
      try {
        const data = await api();
        if (data && data.assets.length > 0) {
          return data;
        }
      } catch (error) {
        console.warn('API failed, trying next:', error);
        continue;
      }
    }

    throw new Error('All APIs failed');
  }

  /**
   * Fetch from Finnhub API (60 requests/minute free)
   */
  private async fetchFromFinnhub(symbols: string[]): Promise<TradFiMarketData> {
    const apiKey = process.env.REACT_APP_FINNHUB_API_KEY || 'demo';
    const promises = symbols.map(async (symbol) => {
      try {
        const response = await fetch(
          `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`
        );
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        if (data.c === 0) throw new Error('Invalid price data');
        
        return {
          symbol,
          name: this.getAssetName(symbol),
          price: data.c,
          change: data.d,
          changePercent: data.dp,
          volume: data.v || 0,
          marketCap: (data.c * (data.v || 1000000)) || 0,
          high: data.h || data.c,
          low: data.l || data.c,
          open: data.o || data.c,
          previousClose: data.pc || data.c,
          exchange: 'NASDAQ',
          lastUpdated: Date.now()
        };
      } catch (error) {
        console.warn(`Failed to fetch ${symbol} from Finnhub:`, error);
        return null;
      }
    });

    const results = await Promise.all(promises);
    const validAssets = results.filter(asset => asset !== null) as TradFiAsset[];
    
    if (validAssets.length === 0) {
      throw new Error('No valid data from Finnhub');
    }

    const totalMarketCap = validAssets.reduce((sum, asset) => sum + asset.marketCap, 0);
    const totalVolume = validAssets.reduce((sum, asset) => sum + asset.volume, 0);

    return {
      assets: validAssets,
      timestamp: Date.now(),
      totalMarketCap,
      totalVolume
    };
  }

  /**
   * Fetch from Alpha Vantage API (5 requests/minute free)
   */
  private async fetchFromAlphaVantage(symbols: string[]): Promise<TradFiMarketData> {
    const apiKey = process.env.REACT_APP_ALPHA_VANTAGE_API_KEY || 'demo';
    const promises = symbols.slice(0, 5).map(async (symbol) => { // Limit to 5 due to rate limit
      try {
        const response = await fetch(
          `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`
        );
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        const quote = data['Global Quote'];
        if (!quote || !quote['05. price']) throw new Error('Invalid quote data');
        
        const price = parseFloat(quote['05. price']);
        const change = parseFloat(quote['09. change'] || '0');
        const changePercent = parseFloat(quote['10. change percent']?.replace('%', '') || '0');
        const volume = parseInt(quote['06. volume'] || '0');
        
        return {
          symbol,
          name: this.getAssetName(symbol),
          price,
          change,
          changePercent,
          volume,
          marketCap: price * volume,
          high: parseFloat(quote['03. high'] || price.toString()),
          low: parseFloat(quote['04. low'] || price.toString()),
          open: parseFloat(quote['02. open'] || price.toString()),
          previousClose: parseFloat(quote['08. previous close'] || price.toString()),
          exchange: 'NASDAQ',
          lastUpdated: Date.now()
        };
      } catch (error) {
        console.warn(`Failed to fetch ${symbol} from Alpha Vantage:`, error);
        return null;
      }
    });

    const results = await Promise.all(promises);
    const validAssets = results.filter(asset => asset !== null) as TradFiAsset[];
    
    if (validAssets.length === 0) {
      throw new Error('No valid data from Alpha Vantage');
    }

    const totalMarketCap = validAssets.reduce((sum, asset) => sum + asset.marketCap, 0);
    const totalVolume = validAssets.reduce((sum, asset) => sum + asset.volume, 0);

    return {
      assets: validAssets,
      timestamp: Date.now(),
      totalMarketCap,
      totalVolume
    };
  }

  /**
   * Fetch from Twelve Data API (8 requests/minute free)
   */
  private async fetchFromTwelveData(symbols: string[]): Promise<TradFiMarketData> {
    const apiKey = process.env.REACT_APP_TWELVE_DATA_API_KEY || 'demo';
    const promises = symbols.slice(0, 8).map(async (symbol) => { // Limit to 8 due to rate limit
      try {
        const response = await fetch(
          `https://api.twelvedata.com/quote?symbol=${symbol}&apikey=${apiKey}`
        );
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        if (data.status === 'error') throw new Error(data.message);
        if (!data.close) throw new Error('Invalid quote data');
        
        const price = parseFloat(data.close);
        const change = parseFloat(data.change || '0');
        const changePercent = parseFloat(data.percent_change || '0');
        const volume = parseInt(data.volume || '0');
        
        return {
          symbol,
          name: data.name || this.getAssetName(symbol),
          price,
          change,
          changePercent,
          volume,
          marketCap: price * volume,
          high: parseFloat(data.high || price.toString()),
          low: parseFloat(data.low || price.toString()),
          open: parseFloat(data.open || price.toString()),
          previousClose: parseFloat(data.previous_close || price.toString()),
          exchange: data.exchange || 'NASDAQ',
          lastUpdated: Date.now()
        };
      } catch (error) {
        console.warn(`Failed to fetch ${symbol} from Twelve Data:`, error);
        return null;
      }
    });

    const results = await Promise.all(promises);
    const validAssets = results.filter(asset => asset !== null) as TradFiAsset[];
    
    if (validAssets.length === 0) {
      throw new Error('No valid data from Twelve Data');
    }

    const totalMarketCap = validAssets.reduce((sum, asset) => sum + asset.marketCap, 0);
    const totalVolume = validAssets.reduce((sum, asset) => sum + asset.volume, 0);

    return {
      assets: validAssets,
      timestamp: Date.now(),
      totalMarketCap,
      totalVolume
    };
  }

  /**
   * Generate fallback data when all APIs fail
   */
  private generateFallbackData(symbols: string[]): TradFiMarketData {
    const mockAssets: TradFiAsset[] = symbols.map((symbol, index) => {
      const basePrice = 100 + (index * 50) + (Math.random() * 200);
      const change = (Math.random() - 0.5) * 20;
      const changePercent = (change / basePrice) * 100;
      
      return {
        symbol,
        name: this.getAssetName(symbol),
        price: basePrice,
        change: change,
        changePercent: changePercent,
        volume: Math.random() * 10000000 + 1000000,
        marketCap: basePrice * (Math.random() * 1000000 + 100000),
        high: basePrice + Math.random() * 10,
        low: basePrice - Math.random() * 5,
        open: basePrice + (Math.random() - 0.5) * 5,
        previousClose: basePrice - change,
        exchange: 'NASDAQ',
        lastUpdated: Date.now()
      };
    });

    const totalMarketCap = mockAssets.reduce((sum, asset) => sum + asset.marketCap, 0);
    const totalVolume = mockAssets.reduce((sum, asset) => sum + asset.volume, 0);

    return {
      assets: mockAssets,
      timestamp: Date.now(),
      totalMarketCap,
      totalVolume,
    };
  }

  /**
   * Get asset names
   */
  private getAssetName(symbol: string): string {
    const names: { [key: string]: string } = {
      'AAPL': 'Apple Inc.',
      'MSFT': 'Microsoft Corporation',
      'GOOGL': 'Alphabet Inc.',
      'AMZN': 'Amazon.com Inc.',
      'TSLA': 'Tesla Inc.',
      'META': 'Meta Platforms Inc.',
      'NVDA': 'NVIDIA Corporation',
      'NFLX': 'Netflix Inc.',
      'SPY': 'SPDR S&P 500 ETF',
      'QQQ': 'Invesco QQQ Trust',
      'IWM': 'iShares Russell 2000 ETF',
      'VTI': 'Vanguard Total Stock Market ETF',
      'VEA': 'Vanguard FTSE Developed Markets ETF',
      'VWO': 'Vanguard FTSE Emerging Markets ETF',
      'BND': 'Vanguard Total Bond Market ETF',
      'GLD': 'SPDR Gold Shares',
      '^GSPC': 'S&P 500 Index',
      '^DJI': 'Dow Jones Industrial Average',
      '^IXIC': 'NASDAQ Composite',
      '^RUT': 'Russell 2000 Index'
    };
    
    return names[symbol] || `${symbol} Corporation`;
  }
}

// Export singleton instance
export const tradFiDataService = new TradFiDataService(); 