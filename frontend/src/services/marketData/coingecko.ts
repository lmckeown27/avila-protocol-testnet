// CoinGecko API Service
// Free API with rate limiting: 50 calls/minute

interface CoinGeckoPriceResponse {
  [coinId: string]: {
    [currency: string]: number;
  };
}

interface CoinGeckoMarketChartResponse {
  prices: [number, number][]; // [timestamp, price]
  market_caps: [number, number][]; // [timestamp, market_cap]
  total_volumes: [number, number][]; // [timestamp, volume]
}

interface CoinGeckoSpotPrice {
  asset: string;
  price: number;
  currency: string;
  timestamp: number;
}

interface CoinGeckoHistoricalData {
  asset: string;
  data: {
    timestamp: number;
    price: number;
    marketCap: number;
    volume: number;
  }[];
  currency: string;
}

type CacheValue = CoinGeckoSpotPrice | CoinGeckoSpotPrice[] | CoinGeckoHistoricalData;

class CoinGeckoService {
  private baseUrl = 'https://api.coingecko.com/api/v3';
  private cache = new Map<string, { data: CacheValue; timestamp: number }>();
  private readonly CACHE_TTL = 60000; // 60 seconds
  private readonly RATE_LIMIT_DELAY = 1200; // 1.2 seconds between requests (50 calls/minute)

  // Supported assets mapping
  private readonly ASSET_MAPPING: { [key: string]: string } = {
    'BTC': 'bitcoin',
    'ETH': 'ethereum',
    'SOL': 'solana',
    'ADA': 'cardano',
    'DOT': 'polkadot',
    'LINK': 'chainlink',
    'UNI': 'uniswap',
    'MATIC': 'matic-network',
    'AVAX': 'avalanche-2',
    'ATOM': 'cosmos'
  };

  /**
   * Get spot price for a single asset
   */
  async getSpotPrice(asset: string): Promise<CoinGeckoSpotPrice> {
    const cacheKey = `spot_${asset}`;
    const cached = this.getCachedData<CoinGeckoSpotPrice>(cacheKey);
    if (cached) return cached;

    try {
      const coinId = this.ASSET_MAPPING[asset.toUpperCase()];
      if (!coinId) {
        throw new Error(`Unsupported asset: ${asset}`);
      }

      const response = await fetch(
        `${this.baseUrl}/simple/price?ids=${coinId}&vs_currencies=usd`
      );

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`);
      }

      const data: CoinGeckoPriceResponse = await response.json();
      const price = data[coinId]?.usd;

      if (price === undefined) {
        throw new Error(`No price data found for ${asset}`);
      }

      const result: CoinGeckoSpotPrice = {
        asset: asset.toUpperCase(),
        price,
        currency: 'USD',
        timestamp: Date.now()
      };

      this.setCachedData(cacheKey, result);
      
      // Rate limiting delay
      await this.delay(this.RATE_LIMIT_DELAY);
      
      return result;
    } catch (error) {
      console.error(`CoinGecko getSpotPrice error for ${asset}:`, error);
      throw error;
    }
  }

  /**
   * Get spot prices for multiple assets
   */
  async getMultipleSpotPrices(assets: string[]): Promise<CoinGeckoSpotPrice[]> {
    const cacheKey = `spot_multiple_${assets.sort().join('_')}`;
    const cached = this.getCachedData<CoinGeckoSpotPrice[]>(cacheKey);
    if (cached) return cached;

    try {
      const coinIds = assets
        .map(asset => this.ASSET_MAPPING[asset.toUpperCase()])
        .filter(Boolean);

      if (coinIds.length === 0) {
        throw new Error('No supported assets provided');
      }

      const response = await fetch(
        `${this.baseUrl}/simple/price?ids=${coinIds.join(',')}&vs_currencies=usd`
      );

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`);
      }

      const data: CoinGeckoPriceResponse = await response.json();
      
      const results: CoinGeckoSpotPrice[] = assets
        .map(asset => {
          const coinId = this.ASSET_MAPPING[asset.toUpperCase()];
          const price = coinId ? data[coinId]?.usd : undefined;
          
          return price !== undefined ? {
            asset: asset.toUpperCase(),
            price,
            currency: 'USD',
            timestamp: Date.now()
          } : null;
        })
        .filter(Boolean) as CoinGeckoSpotPrice[];

      this.setCachedData(cacheKey, results);
      
      // Rate limiting delay
      await this.delay(this.RATE_LIMIT_DELAY);
      
      return results;
    } catch (error) {
      console.error('CoinGecko getMultipleSpotPrices error:', error);
      throw error;
    }
  }

  /**
   * Get historical market data for an asset
   */
  async getHistoricalData(
    asset: string, 
    days: number = 7
  ): Promise<CoinGeckoHistoricalData> {
    const cacheKey = `historical_${asset}_${days}`;
    const cached = this.getCachedData<CoinGeckoHistoricalData>(cacheKey);
    if (cached) return cached;

    try {
      const coinId = this.ASSET_MAPPING[asset.toUpperCase()];
      if (!coinId) {
        throw new Error(`Unsupported asset: ${asset}`);
      }

      const response = await fetch(
        `${this.baseUrl}/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`
      );

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`);
      }

      const data: CoinGeckoMarketChartResponse = await response.json();
      
      const historicalData = data.prices.map(([timestamp, price], index) => ({
        timestamp,
        price,
        marketCap: data.market_caps[index]?.[1] || 0,
        volume: data.total_volumes[index]?.[1] || 0
      }));

      const result: CoinGeckoHistoricalData = {
        asset: asset.toUpperCase(),
        data: historicalData,
        currency: 'USD'
      };

      this.setCachedData(cacheKey, result);
      
      // Rate limiting delay
      await this.delay(this.RATE_LIMIT_DELAY);
      
      return result;
    } catch (error) {
      console.error(`CoinGecko getHistoricalData error for ${asset}:`, error);
      throw error;
    }
  }

  /**
   * Get market data summary for an asset
   */
  async getMarketData(asset: string): Promise<{
    spotPrice: CoinGeckoSpotPrice;
    historicalData: CoinGeckoHistoricalData;
  }> {
    try {
      const [spotPrice, historicalData] = await Promise.all([
        this.getSpotPrice(asset),
        this.getHistoricalData(asset, 7)
      ]);

      return {
        spotPrice,
        historicalData
      };
    } catch (error) {
      console.error(`CoinGecko getMarketData error for ${asset}:`, error);
      throw error;
    }
  }

  /**
   * Check if the service is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/ping`);
      return response.ok;
    } catch (error) {
      console.error('CoinGecko availability check failed:', error);
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

  private getCachedData<T extends CacheValue>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data as T;
    }
    return null;
  }

  private setCachedData<T extends CacheValue>(key: string, data: T): void {
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
export const coinGeckoService = new CoinGeckoService();

// Export types for external use
export type {
  CoinGeckoSpotPrice,
  CoinGeckoHistoricalData
}; 