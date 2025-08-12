// CoinPaprika API Service
// Free API with rate limiting: 100 calls/minute

interface CoinPaprikaTickerResponse {
  id: string;
  name: string;
  symbol: string;
  rank: number;
  circulating_supply: number;
  total_supply: number;
  max_supply: number;
  beta_value: number;
  first_data_at: string;
  last_updated: string;
  quotes: {
    USD: {
      price: number;
      volume_24h: number;
      volume_24h_change_24h: number;
      market_cap: number;
      market_cap_change_24h: number;
      percent_change_15m: number;
      percent_change_30m: number;
      percent_change_1h: number;
      percent_change_6h: number;
      percent_change_12h: number;
      percent_change_24h: number;
      percent_change_7d: number;
      percent_change_30d: number;
      percent_change_1y: number;
      ath_price: number;
      ath_date: string;
      percent_from_price_ath: number;
    };
  };
}

interface CoinPaprikaSpotPrice {
  asset: string;
  price: number;
  currency: string;
  timestamp: number;
  volume24h: number;
  marketCap: number;
  priceChange24h: number;
}

type CoinPaprikaCacheValue = CoinPaprikaSpotPrice | CoinPaprikaSpotPrice[];

class CoinPaprikaService {
  private baseUrl = 'https://api.coinpaprika.com/v1';
  private cache = new Map<string, { data: CoinPaprikaCacheValue; timestamp: number }>();
  private readonly CACHE_TTL = 60000; // 60 seconds
  private readonly RATE_LIMIT_DELAY = 600; // 0.6 seconds between requests (100 calls/minute)

  // Supported assets mapping
  private readonly ASSET_MAPPING: { [key: string]: string } = {
    'BTC': 'btc-bitcoin',
    'ETH': 'eth-ethereum',
    'SOL': 'sol-solana',
    'ADA': 'ada-cardano',
    'DOT': 'dot-polkadot',
    'LINK': 'link-chainlink',
    'UNI': 'uni-uniswap',
    'MATIC': 'matic-polygon',
    'AVAX': 'avax-avalanche',
    'ATOM': 'atom-cosmos'
  };

  /**
   * Get spot price for a single asset
   */
  async getSpotPrice(asset: string): Promise<CoinPaprikaSpotPrice> {
    const cacheKey = `paprika_spot_${asset}`;
    const cached = this.getCachedData<CoinPaprikaSpotPrice>(cacheKey);
    if (cached) return cached;

    try {
      const coinId = this.ASSET_MAPPING[asset.toUpperCase()];
      if (!coinId) {
        throw new Error(`Unsupported asset: ${asset}`);
      }

      const response = await fetch(`${this.baseUrl}/tickers/${coinId}`);

      if (!response.ok) {
        throw new Error(`CoinPaprika API error: ${response.status} ${response.statusText}`);
      }

      const data: CoinPaprikaTickerResponse = await response.json();
      const quote = data.quotes.USD;

      const result: CoinPaprikaSpotPrice = {
        asset: asset.toUpperCase(),
        price: quote.price,
        currency: 'USD',
        timestamp: Date.now(),
        volume24h: quote.volume_24h,
        marketCap: quote.market_cap,
        priceChange24h: quote.percent_change_24h
      };

      this.setCachedData(cacheKey, result);
      
      // Rate limiting delay
      await this.delay(this.RATE_LIMIT_DELAY);
      
      return result;
    } catch (error) {
      console.error(`CoinPaprika getSpotPrice error for ${asset}:`, error);
      throw error;
    }
  }

  /**
   * Get spot prices for multiple assets
   */
  async getMultipleSpotPrices(assets: string[]): Promise<CoinPaprikaSpotPrice[]> {
    const cacheKey = `paprika_spot_multiple_${assets.sort().join('_')}`;
    const cached = this.getCachedData<CoinPaprikaSpotPrice[]>(cacheKey);
    if (cached) return cached;

    try {
      const results: CoinPaprikaSpotPrice[] = [];

      // Process assets sequentially to respect rate limits
      for (const asset of assets) {
        try {
          const price = await this.getSpotPrice(asset);
          results.push(price);
        } catch (error) {
          console.warn(`Failed to get price for ${asset}:`, error);
          // Continue with other assets
        }
      }

      if (results.length === 0) {
        throw new Error('Failed to get prices for any assets');
      }

      this.setCachedData(cacheKey, results);
      return results;
    } catch (error) {
      console.error('CoinPaprika getMultipleSpotPrices error:', error);
      throw error;
    }
  }

  /**
   * Get market data summary for an asset
   */
  async getMarketData(asset: string): Promise<CoinPaprikaSpotPrice> {
    return this.getSpotPrice(asset);
  }

  /**
   * Check if the service is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/tickers/btc-bitcoin`);
      return response.ok;
    } catch (error) {
      console.error('CoinPaprika availability check failed:', error);
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

  private getCachedData<T extends CoinPaprikaCacheValue>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data as T;
    }
    return null;
  }

  private setCachedData<T extends CoinPaprikaCacheValue>(key: string, data: T): void {
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
export const coinPaprikaService = new CoinPaprikaService();

// Export types for external use
export type {
  CoinPaprikaSpotPrice
}; 