// Deribit API Service
// Public API with no authentication required
// Rate limits: 20 requests per second for public endpoints

interface DeribitInstrument {
  instrument_name: string;
  instrument_id: number;
  underlying_index: string;
  underlying_price: number;
  quote_currency: string;
  base_currency: string;
  price_currency: string;
  min_qty: number;
  qty_step: number;
  min_notional: number;
  price_step: number;
  created: number;
  is_active: boolean;
  settlement_period: string;
  tick_size: number;
  taker_commission: number;
  maker_commission: number;
  strike: number;
  option_type: 'call' | 'put';
  expiration_timestamp: number;
  underlying: string;
  contract_size: number;
  expiration: string;
}

interface DeribitInstrumentsResponse {
  jsonrpc: string;
  id: number;
  result: DeribitInstrument[];
}

interface DeribitOrderBookEntry {
  price: number;
  size: number;
}

interface DeribitOrderBook {
  bids: DeribitOrderBookEntry[];
  asks: DeribitOrderBookEntry[];
  timestamp: number;
  stats: {
    volume: number;
    low: number;
    high: number;
  };
}

interface DeribitOrderBookResponse {
  jsonrpc: string;
  id: number;
  result: DeribitOrderBook;
}

interface DeribitOptionsChain {
  asset: string;
  underlyingPrice: number;
  instruments: DeribitInstrument[];
  calls: DeribitInstrument[];
  puts: DeribitInstrument[];
  expirations: string[];
  timestamp: number;
}

interface DeribitOrderBookData {
  instrumentName: string;
  orderBook: DeribitOrderBook;
  timestamp: number;
}

type DeribitCacheValue = DeribitOptionsChain | DeribitOrderBookData | DeribitInstrument[];

class DeribitService {
  private baseUrl = 'https://www.deribit.com/api/v2';
  private cache = new Map<string, { data: DeribitCacheValue; timestamp: number }>();
  private readonly CACHE_TTL = 60000; // 60 seconds
  private readonly RATE_LIMIT_DELAY = 50; // 0.05 seconds between requests (20 requests/second)

  // Supported underlying assets
  private readonly SUPPORTED_ASSETS = ['BTC', 'ETH', 'SOL'];

  /**
   * Get all options instruments for a specific underlying asset
   */
  async getOptionsInstruments(asset: string): Promise<DeribitInstrument[]> {
    const cacheKey = `deribit_instruments_${asset}`;
    const cached = this.getCachedData<DeribitInstrument[]>(cacheKey);
    if (cached) return cached;

    try {
      if (!this.SUPPORTED_ASSETS.includes(asset.toUpperCase())) {
        throw new Error(`Unsupported asset: ${asset}. Supported: ${this.SUPPORTED_ASSETS.join(', ')}`);
      }

      const response = await fetch(
        `${this.baseUrl}/public/get_instruments?currency=${asset.toUpperCase()}&kind=option&expired=false`
      );

      if (!response.ok) {
        throw new Error(`Deribit API error: ${response.status} ${response.statusText}`);
      }

      const data: DeribitInstrumentsResponse = await response.json();
      
      if (!data.result || !Array.isArray(data.result)) {
        throw new Error('Invalid response format from Deribit API');
      }

      // Filter active instruments and sort by expiration
      const instruments = data.result
        .filter(instrument => instrument.is_active)
        .sort((a, b) => a.expiration_timestamp - b.expiration_timestamp);

      this.setCachedData(cacheKey, instruments);
      
      // Rate limiting delay
      await this.delay(this.RATE_LIMIT_DELAY);
      
      return instruments;
    } catch (error) {
      console.error(`Deribit getOptionsInstruments error for ${asset}:`, error);
      throw error;
    }
  }

  /**
   * Get complete options chain for an asset
   */
  async getOptionsChain(asset: string): Promise<DeribitOptionsChain> {
    const cacheKey = `deribit_chain_${asset}`;
    const cached = this.getCachedData<DeribitOptionsChain>(cacheKey);
    if (cached) return cached;

    try {
      const instruments = await this.getOptionsInstruments(asset);
      
      // Separate calls and puts
      const calls = instruments.filter(instrument => instrument.option_type === 'call');
      const puts = instruments.filter(instrument => instrument.option_type === 'put');
      
      // Get unique expirations
      const expirations = [...new Set(instruments.map(instrument => instrument.expiration))].sort();
      
      // Get underlying price from first instrument
      const underlyingPrice = instruments[0]?.underlying_price || 0;

      const result: DeribitOptionsChain = {
        asset: asset.toUpperCase(),
        underlyingPrice,
        instruments,
        calls,
        puts,
        expirations,
        timestamp: Date.now()
      };

      this.setCachedData(cacheKey, result);
      return result;
    } catch (error) {
      console.error(`Deribit getOptionsChain error for ${asset}:`, error);
      throw error;
    }
  }

  /**
   * Get order book for a specific options instrument
   */
  async getOrderBook(instrumentName: string): Promise<DeribitOrderBookData> {
    const cacheKey = `deribit_orderbook_${instrumentName}`;
    const cached = this.getCachedData<DeribitOrderBookData>(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(
        `${this.baseUrl}/public/get_order_book?instrument_name=${encodeURIComponent(instrumentName)}&depth=20`
      );

      if (!response.ok) {
        throw new Error(`Deribit API error: ${response.status} ${response.statusText}`);
      }

      const data: DeribitOrderBookResponse = await response.json();
      
      if (!data.result) {
        throw new Error('Invalid response format from Deribit API');
      }

      const result: DeribitOrderBookData = {
        instrumentName,
        orderBook: data.result,
        timestamp: Date.now()
      };

      this.setCachedData(cacheKey, result);
      
      // Rate limiting delay
      await this.delay(this.RATE_LIMIT_DELAY);
      
      return result;
    } catch (error) {
      console.error(`Deribit getOrderBook error for ${instrumentName}:`, error);
      throw error;
    }
  }

  /**
   * Get options chain filtered by expiration date
   */
  async getOptionsChainByExpiration(
    asset: string, 
    expirationDate: string
  ): Promise<DeribitOptionsChain> {
    try {
      const fullChain = await this.getOptionsChain(asset);
      
      // Filter instruments by expiration date
      const filteredInstruments = fullChain.instruments.filter(
        instrument => instrument.expiration === expirationDate
      );
      
      const filteredCalls = filteredInstruments.filter(
        instrument => instrument.option_type === 'call'
      );
      
      const filteredPuts = filteredInstruments.filter(
        instrument => instrument.option_type === 'put'
      );

      return {
        ...fullChain,
        instruments: filteredInstruments,
        calls: filteredCalls,
        puts: filteredPuts,
        expirations: [expirationDate],
        timestamp: Date.now()
      };
    } catch (error) {
      console.error(`Deribit getOptionsChainByExpiration error for ${asset} ${expirationDate}:`, error);
      throw error;
    }
  }

  /**
   * Get options chain filtered by strike price range
   */
  async getOptionsChainByStrikeRange(
    asset: string,
    minStrike: number,
    maxStrike: number
  ): Promise<DeribitOptionsChain> {
    try {
      const fullChain = await this.getOptionsChain(asset);
      
      // Filter instruments by strike price range
      const filteredInstruments = fullChain.instruments.filter(
        instrument => instrument.strike >= minStrike && instrument.strike <= maxStrike
      );
      
      const filteredCalls = filteredInstruments.filter(
        instrument => instrument.option_type === 'call'
      );
      
      const filteredPuts = filteredInstruments.filter(
        instrument => instrument.option_type === 'put'
      );

      // Get unique expirations from filtered instruments
      const filteredExpirations = [...new Set(filteredInstruments.map(instrument => instrument.expiration))].sort();

      return {
        ...fullChain,
        instruments: filteredInstruments,
        calls: filteredCalls,
        puts: filteredPuts,
        expirations: filteredExpirations,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error(`Deribit getOptionsChainByStrikeRange error for ${asset}:`, error);
      throw error;
    }
  }

  /**
   * Get market data summary for options trading
   */
  async getOptionsMarketData(asset: string): Promise<{
    optionsChain: DeribitOptionsChain;
    totalContracts: number;
    activeExpirations: number;
    averageImpliedVolatility?: number;
  }> {
    try {
      const optionsChain = await this.getOptionsChain(asset);
      
      const totalContracts = optionsChain.instruments.length;
      const activeExpirations = optionsChain.expirations.length;
      
      // Note: Deribit public API doesn't provide implied volatility
      // This would require authenticated access to additional endpoints
      
      return {
        optionsChain,
        totalContracts,
        activeExpirations,
        averageImpliedVolatility: undefined
      };
    } catch (error) {
      console.error(`Deribit getOptionsMarketData error for ${asset}:`, error);
      throw error;
    }
  }

  /**
   * Check if the service is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/public/test`);
      return response.ok;
    } catch (error) {
      console.error('Deribit availability check failed:', error);
      return false;
    }
  }

  /**
   * Get supported assets list
   */
  getSupportedAssets(): string[] {
    return [...this.SUPPORTED_ASSETS];
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

  private getCachedData<T extends DeribitCacheValue>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data as T;
    }
    return null;
  }

  private setCachedData<T extends DeribitCacheValue>(key: string, data: T): void {
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
export const deribitService = new DeribitService();

// Export types for external use
export type {
  DeribitInstrument,
  DeribitOptionsChain,
  DeribitOrderBook,
  DeribitOrderBookData
}; 