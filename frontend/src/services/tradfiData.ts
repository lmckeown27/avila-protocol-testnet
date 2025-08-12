// TradFi Data Service
// Uses Yahoo Finance free JSON API for stocks and ETFs

interface YahooFinanceQuote {
  symbol: string;
  shortname?: string;
  longname?: string;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  regularMarketVolume: number;
  marketCap: number;
  regularMarketTime: number;
  regularMarketDayHigh: number;
  regularMarketDayLow: number;
  regularMarketOpen: number;
  regularMarketPreviousClose: number;
  exchange: string;
  quoteType: string;
  marketState: string;
}

interface YahooFinanceResponse {
  quoteResponse: {
    result: YahooFinanceQuote[];
    error: any;
  };
}

interface TradFiAsset {
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

interface TradFiMarketData {
  assets: TradFiAsset[];
  timestamp: number;
  totalMarketCap: number;
  totalVolume: number;
}

class TradFiDataService {
  private baseUrl = 'https://query1.finance.yahoo.com/v7/finance/quote';
  private cache = new Map<string, { data: TradFiMarketData; timestamp: number }>();
  private readonly CACHE_TTL = 60000; // 60 seconds
  private readonly RATE_LIMIT_DELAY = 1000; // 1 second between requests

  // Default symbols for major stocks and ETFs
  private readonly DEFAULT_SYMBOLS = [
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX',
    'SPY', 'QQQ', 'IWM', 'VTI', 'VEA', 'VWO', 'BND', 'GLD'
  ];

  /**
   * Get market data for specified symbols
   */
  async getTradfiMarketData(symbols: string[] = this.DEFAULT_SYMBOLS): Promise<TradFiMarketData> {
    const cacheKey = `tradfi_${symbols.sort().join('_')}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      const symbolsParam = symbols.join(',');
      const url = `${this.baseUrl}?symbols=${encodeURIComponent(symbolsParam)}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Avila-Protocol/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`Yahoo Finance API error: ${response.status} ${response.statusText}`);
      }

      const data: YahooFinanceResponse = await response.json();
      
      if (data.quoteResponse.error) {
        throw new Error(`Yahoo Finance API error: ${JSON.stringify(data.quoteResponse.error)}`);
      }

      if (!data.quoteResponse.result || !Array.isArray(data.quoteResponse.result)) {
        throw new Error('Invalid response format from Yahoo Finance API');
      }

      // Transform and filter the data
      const assets: TradFiAsset[] = data.quoteResponse.result
        .filter(quote => quote.regularMarketPrice && quote.regularMarketPrice > 0)
        .map(quote => ({
          symbol: quote.symbol,
          name: quote.shortname || quote.longname || quote.symbol,
          price: quote.regularMarketPrice,
          change: quote.regularMarketChange,
          changePercent: quote.regularMarketChangePercent,
          volume: quote.regularMarketVolume || 0,
          marketCap: quote.marketCap || 0,
          high: quote.regularMarketDayHigh || quote.regularMarketPrice,
          low: quote.regularMarketDayLow || quote.regularMarketPrice,
          open: quote.regularMarketOpen || quote.regularMarketPrice,
          previousClose: quote.regularMarketPreviousClose || quote.regularMarketPrice,
          exchange: quote.exchange || 'Unknown',
          lastUpdated: quote.regularMarketTime * 1000 // Convert to milliseconds
        }));

      // Calculate totals
      const totalMarketCap = assets.reduce((sum, asset) => sum + asset.marketCap, 0);
      const totalVolume = assets.reduce((sum, asset) => sum + asset.volume, 0);

      const result: TradFiMarketData = {
        assets,
        timestamp: Date.now(),
        totalMarketCap,
        totalVolume
      };

      this.setCachedData(cacheKey, result);
      
      // Rate limiting delay
      await this.delay(this.RATE_LIMIT_DELAY);
      
      return result;
    } catch (error) {
      console.error('TradFi getTradfiMarketData error:', error);
      throw error;
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
      // For now, search within default symbols
      // In a real implementation, you might want to use Yahoo Finance search API
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
    // This would typically use Yahoo Finance historical data endpoint
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
        open: price * (1 + (Math.random() - 0.5) * 0.01),
        high: price * (1 + Math.random() * 0.02),
        low: price * (1 - Math.random() * 0.02),
        close: price,
        volume: Math.random() * 10000000 + 1000000
      });
    }
    
    return mockData;
  }

  /**
   * Check if the service is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}?symbols=AAPL`);
      return response.ok;
    } catch (error) {
      console.error('TradFi availability check failed:', error);
      return false;
    }
  }

  /**
   * Get supported symbols list
   */
  getSupportedSymbols(): string[] {
    return [...this.DEFAULT_SYMBOLS];
  }

  /**
   * Clear cache for testing or manual refresh
   */
  clearCache(): void {
    this.cache.clear();
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

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const tradFiDataService = new TradFiDataService();

// Export types for external use
export type {
  TradFiAsset,
  TradFiMarketData,
  YahooFinanceQuote
}; 