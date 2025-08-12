// Polygon.io Crypto API Service
// Free tier: 5 API calls per minute
// Requires API key for historical data

interface PolygonCryptoAggregate {
  c: number; // Close price
  h: number; // High price
  l: number; // Low price
  n: number; // Number of transactions
  o: number; // Open price
  t: number; // Timestamp
  v: number; // Volume
  vw: number; // Volume weighted average price
}

interface PolygonCryptoAggregatesResponse {
  results: PolygonCryptoAggregate[];
  status: string;
  request_id: string;
  resultsCount: number;
  adjusted: boolean;
  queryCount: number;
  ticker: string;
}

interface PolygonCryptoHistoricalData {
  asset: string;
  data: {
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    vwap: number;
  }[];
  currency: string;
  period: string;
}

interface PolygonCryptoVolatilityData {
  asset: string;
  historicalVolatility: number;
  currentVolatility: number;
  volatilityData: {
    timestamp: number;
    volatility: number;
  }[];
  currency: string;
}

type PolygonCryptoCacheValue = PolygonCryptoHistoricalData | PolygonCryptoVolatilityData;

class PolygonCryptoService {
  private baseUrl = 'https://api.polygon.io/v2';
  private cache = new Map<string, { data: PolygonCryptoCacheValue; timestamp: number }>();
  private readonly CACHE_TTL = 60000; // 60 seconds
  private readonly RATE_LIMIT_DELAY = 12000; // 12 seconds between requests (5 calls/minute)
  
  // API key from environment (optional for free tier)
  private apiKey = process.env.NEXT_PUBLIC_POLYGON_API_KEY || 'demo';

  // Supported crypto assets mapping
  private readonly ASSET_MAPPING: { [key: string]: string } = {
    'BTC': 'X:BTCUSD',
    'ETH': 'X:ETHUSD',
    'SOL': 'X:SOLUSD',
    'ADA': 'X:ADAUSD',
    'DOT': 'X:DOTUSD',
    'LINK': 'X:LINKUSD',
    'UNI': 'X:UNIUSD',
    'MATIC': 'X:MATICUSD',
    'AVAX': 'X:AVAXUSD',
    'ATOM': 'X:ATOMUSD'
  };

  /**
   * Get historical OHLCV data for a crypto asset
   */
  async getHistoricalData(
    asset: string,
    multiplier: number = 1,
    timespan: 'minute' | 'hour' | 'day' | 'week' | 'month' = 'day',
    from: string,
    to: string
  ): Promise<PolygonCryptoHistoricalData> {
    const cacheKey = `polygon_crypto_historical_${asset}_${multiplier}_${timespan}_${from}_${to}`;
    const cached = this.getCachedData<PolygonCryptoHistoricalData>(cacheKey);
    if (cached) return cached;

    try {
      const ticker = this.ASSET_MAPPING[asset.toUpperCase()];
      if (!ticker) {
        throw new Error(`Unsupported asset: ${asset}`);
      }

      const url = `${this.baseUrl}/aggs/ticker/${ticker}/range/${multiplier}/${timespan}/${from}/${to}?adjusted=true&sort=asc&apiKey=${this.apiKey}`;
      
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Polygon Crypto API error: ${response.status} ${response.statusText}`);
      }

      const data: PolygonCryptoAggregatesResponse = await response.json();
      
      if (!data.results || !Array.isArray(data.results)) {
        throw new Error('Invalid response format from Polygon Crypto API');
      }

      const historicalData = data.results.map(bar => ({
        timestamp: bar.t,
        open: bar.o,
        high: bar.h,
        low: bar.l,
        close: bar.c,
        volume: bar.v,
        vwap: bar.vw
      }));

      const result: PolygonCryptoHistoricalData = {
        asset: asset.toUpperCase(),
        data: historicalData,
        currency: 'USD',
        period: `${multiplier}${timespan}`
      };

      this.setCachedData(cacheKey, result);
      
      // Rate limiting delay
      await this.delay(this.RATE_LIMIT_DELAY);
      
      return result;
    } catch (error) {
      console.error(`Polygon Crypto getHistoricalData error for ${asset}:`, error);
      throw error;
    }
  }

  /**
   * Get historical data for the last N days
   */
  async getHistoricalDataForDays(
    asset: string,
    days: number = 7,
    timespan: 'minute' | 'hour' | 'day' | 'week' | 'month' = 'day'
  ): Promise<PolygonCryptoHistoricalData> {
    const to = new Date().toISOString().split('T')[0];
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    return this.getHistoricalData(asset, 1, timespan, from, to);
  }

  /**
   * Calculate volatility from historical data
   */
  async getVolatilityData(
    asset: string,
    days: number = 30
  ): Promise<PolygonCryptoVolatilityData> {
    const cacheKey = `polygon_crypto_volatility_${asset}_${days}`;
    const cached = this.getCachedData<PolygonCryptoVolatilityData>(cacheKey);
    if (cached) return cached;

    try {
      const historicalData = await this.getHistoricalDataForDays(asset, days, 'day');
      
      if (historicalData.data.length < 2) {
        throw new Error('Insufficient data for volatility calculation');
      }

      // Calculate daily returns
      const returns: number[] = [];
      for (let i = 1; i < historicalData.data.length; i++) {
        const previousClose = historicalData.data[i - 1].close;
        const currentClose = historicalData.data[i].close;
        const dailyReturn = Math.log(currentClose / previousClose);
        returns.push(dailyReturn);
      }

      // Calculate historical volatility (annualized)
      const meanReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
      const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - meanReturn, 2), 0) / returns.length;
      const historicalVolatility = Math.sqrt(variance * 365) * 100; // Annualized percentage

      // Calculate current volatility (last 7 days)
      const recentReturns = returns.slice(-7);
      const recentMeanReturn = recentReturns.reduce((sum, ret) => sum + ret, 0) / recentReturns.length;
      const recentVariance = recentReturns.reduce((sum, ret) => sum + Math.pow(ret - recentMeanReturn, 2), 0) / recentReturns.length;
      const currentVolatility = Math.sqrt(recentVariance * 365) * 100; // Annualized percentage

      // Create volatility time series data
      const volatilityData = historicalData.data.slice(1).map((bar, index) => ({
        timestamp: bar.timestamp,
        volatility: Math.abs(returns[index]) * Math.sqrt(365) * 100
      }));

      const result: PolygonCryptoVolatilityData = {
        asset: asset.toUpperCase(),
        historicalVolatility,
        currentVolatility,
        volatilityData,
        currency: 'USD'
      };

      this.setCachedData(cacheKey, result);
      return result;
    } catch (error) {
      console.error(`Polygon Crypto getVolatilityData error for ${asset}:`, error);
      throw error;
    }
  }

  /**
   * Get market data summary including historical data and volatility
   */
  async getMarketData(asset: string): Promise<{
    historicalData: PolygonCryptoHistoricalData;
    volatilityData: PolygonCryptoVolatilityData;
  }> {
    try {
      const [historicalData, volatilityData] = await Promise.all([
        this.getHistoricalDataForDays(asset, 30, 'day'),
        this.getVolatilityData(asset, 30)
      ]);

      return {
        historicalData,
        volatilityData
      };
    } catch (error) {
      console.error(`Polygon Crypto getMarketData error for ${asset}:`, error);
      throw error;
    }
  }

  /**
   * Get price change statistics for different time periods
   */
  async getPriceChangeStats(asset: string): Promise<{
    asset: string;
    priceChange1h: number;
    priceChange24h: number;
    priceChange7d: number;
    priceChange30d: number;
    high24h: number;
    low24h: number;
    volume24h: number;
  }> {
    try {
      const [hourlyData, dailyData, weeklyData, monthlyData] = await Promise.all([
        this.getHistoricalDataForDays(asset, 1, 'hour'),
        this.getHistoricalDataForDays(asset, 1, 'day'),
        this.getHistoricalDataForDays(asset, 7, 'day'),
        this.getHistoricalDataForDays(asset, 30, 'day')
      ]);

      const currentPrice = dailyData.data[dailyData.data.length - 1]?.close || 0;
      
      const priceChange1h = hourlyData.data.length >= 2 
        ? ((currentPrice - hourlyData.data[hourlyData.data.length - 2].close) / hourlyData.data[hourlyData.data.length - 2].close) * 100
        : 0;
      
      const priceChange24h = dailyData.data.length >= 2
        ? ((currentPrice - dailyData.data[dailyData.data.length - 2].close) / dailyData.data[dailyData.data.length - 2].close) * 100
        : 0;
      
      const priceChange7d = weeklyData.data.length >= 2
        ? ((currentPrice - weeklyData.data[0].close) / weeklyData.data[0].close) * 100
        : 0;
      
      const priceChange30d = monthlyData.data.length >= 2
        ? ((currentPrice - monthlyData.data[0].close) / monthlyData.data[0].close) * 100
        : 0;

      const high24h = Math.max(...dailyData.data.map(bar => bar.high));
      const low24h = Math.min(...dailyData.data.map(bar => bar.low));
      const volume24h = dailyData.data.reduce((sum, bar) => sum + bar.volume, 0);

      return {
        asset: asset.toUpperCase(),
        priceChange1h,
        priceChange24h,
        priceChange7d,
        priceChange30d,
        high24h,
        low24h,
        volume24h
      };
    } catch (error) {
      console.error(`Polygon Crypto getPriceChangeStats error for ${asset}:`, error);
      throw error;
    }
  }

  /**
   * Check if the service is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Try to get a small amount of data to test availability
      const response = await fetch(`${this.baseUrl}/aggs/ticker/X:BTCUSD/range/1/day/${new Date().toISOString().split('T')[0]}/${new Date().toISOString().split('T')[0]}?adjusted=true&sort=asc&apiKey=${this.apiKey}`);
      return response.ok;
    } catch (error) {
      console.error('Polygon Crypto availability check failed:', error);
      return false;
    }
  }

  /**
   * Get supported assets list
   */
  getSupportedAssets(): string[] {
    return Object.keys(this.ASSET_MAPPING);
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

  private getCachedData<T extends PolygonCryptoCacheValue>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data as T;
    }
    return null;
  }

  private setCachedData<T extends PolygonCryptoCacheValue>(key: string, data: T): void {
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
export const polygonCryptoService = new PolygonCryptoService();

// Export types for external use
export type {
  PolygonCryptoHistoricalData,
  PolygonCryptoVolatilityData
}; 