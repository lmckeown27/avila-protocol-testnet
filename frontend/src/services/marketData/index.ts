// Market Data Service Index
// Combines all data sources with automatic failover and standardized output

import { coinGeckoService, CoinGeckoSpotPrice } from './coingecko';
import { coinPaprikaService, CoinPaprikaSpotPrice } from './coinpaprika';
import { deribitService, DeribitOptionsChain, DeribitOrderBookData, DeribitInstrument } from './deribit';
import { polygonCryptoService, PolygonCryptoVolatilityData } from './polygon';

// Standardized market data structure
export interface StandardizedMarketData {
  timestamp: number;
  asset: string;
  spot_price: number;
  currency: string;
  historical_data: {
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    vwap: number;
  }[];
  options_chain: {
    asset: string;
    underlyingPrice: number;
    instruments: {
      instrument_name: string;
      strike: number;
      option_type: 'call' | 'put';
      expiration: string;
      underlying: string;
      contract_size: number;
    }[];
    calls: {
      instrument_name: string;
      strike: number;
      expiration: string;
      underlying: string;
      contract_size: number;
    }[];
    puts: {
      instrument_name: string;
      strike: number;
      expiration: string;
      underlying: string;
      contract_size: number;
    }[];
    expirations: string[];
  } | null;
  order_book: {
    instrument_name: string;
    bids: { price: number; size: number }[];
    asks: { price: number; size: number }[];
    timestamp: number;
  } | null;
  volatility_data: {
    historicalVolatility: number;
    currentVolatility: number;
    volatilityData: { timestamp: number; volatility: number }[];
  } | null;
  price_change_stats: {
    priceChange1h: number;
    priceChange24h: number;
    priceChange7d: number;
    priceChange30d: number;
    high24h: number;
    low24h: number;
    volume24h: number;
  } | null;
  data_sources: {
    spot_price: 'coingecko' | 'coinpaprika' | 'fallback';
    historical_data: 'polygon' | 'coingecko' | 'fallback';
    options_chain: 'deribit' | 'fallback';
    volatility: 'polygon' | 'fallback';
  };
}

// Service availability status
export interface ServiceStatus {
  coingecko: boolean;
  coinpaprika: boolean;
  deribit: boolean;
  polygon: boolean;
}

// Market data service manager
class MarketDataServiceManager {
  private serviceStatus: ServiceStatus = {
    coingecko: true,
    coinpaprika: true,
    deribit: true,
    polygon: true
  };

  private lastStatusCheck = 0;
  private readonly STATUS_CHECK_INTERVAL = 300000; // 5 minutes

  /**
   * Check service availability and update status
   */
  private async updateServiceStatus(): Promise<void> {
    const now = Date.now();
    if (now - this.lastStatusCheck < this.STATUS_CHECK_INTERVAL) {
      return; // Use cached status
    }

    try {
      const [coingecko, coinpaprika, deribit, polygon] = await Promise.allSettled([
        coinGeckoService.isAvailable(),
        coinPaprikaService.isAvailable(),
        deribitService.isAvailable(),
        polygonCryptoService.isAvailable()
      ]);

      this.serviceStatus = {
        coingecko: coingecko.status === 'fulfilled' && coingecko.value,
        coinpaprika: coinpaprika.status === 'fulfilled' && coinpaprika.value,
        deribit: deribit.status === 'fulfilled' && deribit.value,
        polygon: polygon.status === 'fulfilled' && polygon.value
      };

      this.lastStatusCheck = now;
    } catch (error) {
      console.error('Failed to update service status:', error);
    }
  }

  /**
   * Get spot price with automatic failover
   */
  private async getSpotPriceWithFailover(asset: string): Promise<{
    price: number;
    source: 'coingecko' | 'coinpaprika' | 'fallback';
    data: CoinGeckoSpotPrice | CoinPaprikaSpotPrice | null;
  }> {
    // Try CoinGecko first
    if (this.serviceStatus.coingecko) {
      try {
        const data = await coinGeckoService.getSpotPrice(asset);
        return { price: data.price, source: 'coingecko', data };
      } catch (error) {
        console.warn(`CoinGecko failed for ${asset}, trying CoinPaprika:`, error);
      }
    }

    // Try CoinPaprika as backup
    if (this.serviceStatus.coinpaprika) {
      try {
        const data = await coinPaprikaService.getSpotPrice(asset);
        return { price: data.price, source: 'coinpaprika', data };
      } catch (error) {
        console.warn(`CoinPaprika failed for ${asset}:`, error);
      }
    }

    // Fallback to mock data
    const fallbackPrice = this.getFallbackPrice(asset);
    return { price: fallbackPrice, source: 'fallback', data: null };
  }

  /**
   * Get historical data with automatic failover
   */
  private async getHistoricalDataWithFailover(asset: string): Promise<{
    data: any[];
    source: 'polygon' | 'coingecko' | 'fallback';
  }> {
    // Try Polygon first (better for crypto)
    if (this.serviceStatus.polygon) {
      try {
        const data = await polygonCryptoService.getHistoricalDataForDays(asset, 7, 'day');
        return { data: data.data, source: 'polygon' };
      } catch (error) {
        console.warn(`Polygon failed for ${asset}, trying CoinGecko:`, error);
      }
    }

    // Try CoinGecko as backup
    if (this.serviceStatus.coingecko) {
      try {
        const data = await coinGeckoService.getHistoricalData(asset, 7);
        return { data: data.data, source: 'coingecko' };
      } catch (error) {
        console.warn(`CoinGecko failed for ${asset}:`, error);
      }
    }

    // Fallback to mock data
    return { data: this.getFallbackHistoricalData(asset), source: 'fallback' };
  }

  /**
   * Get options chain data
   */
  private async getOptionsChainWithFailover(asset: string): Promise<{
    data: DeribitOptionsChain | null;
    source: 'deribit' | 'fallback';
  }> {
    if (this.serviceStatus.deribit) {
      try {
        const data = await deribitService.getOptionsChain(asset);
        return { data, source: 'deribit' };
      } catch (error) {
        console.warn(`Deribit failed for ${asset}:`, error);
      }
    }

    // Fallback to mock data
    return { data: this.getFallbackOptionsChain(asset), source: 'fallback' };
  }

  /**
   * Get volatility data
   */
  private async getVolatilityDataWithFailover(asset: string): Promise<{
    data: PolygonCryptoVolatilityData | null;
    source: 'polygon' | 'fallback';
  }> {
    if (this.serviceStatus.polygon) {
      try {
        const data = await polygonCryptoService.getVolatilityData(asset, 30);
        return { data, source: 'polygon' };
      } catch (error) {
        console.warn(`Polygon volatility failed for ${asset}:`, error);
      }
    }

    // Fallback to mock data
    return { data: this.getFallbackVolatilityData(asset), source: 'fallback' };
  }

  /**
   * Get price change statistics
   */
  private async getPriceChangeStatsWithFailover(asset: string): Promise<{
    data: any | null;
    source: 'polygon' | 'fallback';
  }> {
    if (this.serviceStatus.polygon) {
      try {
        const data = await polygonCryptoService.getPriceChangeStats(asset);
        return { data, source: 'polygon' };
      } catch (error) {
        console.warn(`Polygon price stats failed for ${asset}:`, error);
      }
    }

    // Fallback to mock data
    return { data: this.getFallbackPriceChangeStats(asset), source: 'fallback' };
  }

  /**
   * Main function to get comprehensive market data for an asset
   */
  async getMarketData(asset: string): Promise<StandardizedMarketData> {
    // Update service status
    await this.updateServiceStatus();

    try {
      // Fetch all data in parallel with failover
      const [
        spotPriceResult,
        historicalResult,
        optionsChainResult,
        volatilityResult,
        priceStatsResult
      ] = await Promise.all([
        this.getSpotPriceWithFailover(asset),
        this.getHistoricalDataWithFailover(asset),
        this.getOptionsChainWithFailover(asset),
        this.getVolatilityDataWithFailover(asset),
        this.getPriceChangeStatsWithFailover(asset)
      ]);

      // Standardize the data
      const standardizedData: StandardizedMarketData = {
        timestamp: Date.now(),
        asset: asset.toUpperCase(),
        spot_price: spotPriceResult.price,
        currency: 'USD',
        historical_data: historicalResult.data,
        options_chain: optionsChainResult.data ? {
          asset: optionsChainResult.data.asset,
          underlyingPrice: optionsChainResult.data.underlyingPrice,
          instruments: optionsChainResult.data.instruments.map((instrument: DeribitInstrument) => ({
            instrument_name: instrument.instrument_name,
            strike: instrument.strike,
            option_type: instrument.option_type,
            expiration: instrument.expiration,
            underlying: instrument.underlying,
            contract_size: instrument.contract_size
          })),
          calls: optionsChainResult.data.calls.map((call: DeribitInstrument) => ({
            instrument_name: call.instrument_name,
            strike: call.strike,
            expiration: call.expiration,
            underlying: call.underlying,
            contract_size: call.contract_size
          })),
          puts: optionsChainResult.data.puts.map((put: DeribitInstrument) => ({
            instrument_name: put.instrument_name,
            strike: put.strike,
            expiration: put.expiration,
            underlying: put.underlying,
            contract_size: put.contract_size
          })),
          expirations: optionsChainResult.data.expirations
        } : null,
        order_book: null, // Will be populated when specific option is requested
        volatility_data: volatilityResult.data ? {
          historicalVolatility: volatilityResult.data.historicalVolatility,
          currentVolatility: volatilityResult.data.currentVolatility,
          volatilityData: volatilityResult.data.volatilityData
        } : null,
        price_change_stats: priceStatsResult.data ? {
          priceChange1h: priceStatsResult.data.priceChange1h,
          priceChange24h: priceStatsResult.data.priceChange24h,
          priceChange7d: priceStatsResult.data.priceChange7d,
          priceChange30d: priceStatsResult.data.priceChange30d,
          high24h: priceStatsResult.data.high24h,
          low24h: priceStatsResult.data.low24h,
          volume24h: priceStatsResult.data.volume24h
        } : null,
        data_sources: {
          spot_price: spotPriceResult.source,
          historical_data: historicalResult.source,
          options_chain: optionsChainResult.source,
          volatility: volatilityResult.source
        }
      };

      return standardizedData;
    } catch (error) {
      console.error(`Failed to get market data for ${asset}:`, error);
      throw error;
    }
  }

  /**
   * Get order book for a specific options instrument
   */
  async getOrderBook(instrumentName: string): Promise<DeribitOrderBookData | null> {
    if (this.serviceStatus.deribit) {
      try {
        return await deribitService.getOrderBook(instrumentName);
      } catch (error) {
        console.warn(`Failed to get order book for ${instrumentName}:`, error);
      }
    }
    return null;
  }

  /**
   * Get service status
   */
  async getServiceStatus(): Promise<ServiceStatus> {
    await this.updateServiceStatus();
    return { ...this.serviceStatus };
  }

  /**
   * Clear all service caches
   */
  clearAllCaches(): void {
    coinGeckoService.clearCache();
    coinPaprikaService.clearCache();
    deribitService.clearCache();
    polygonCryptoService.clearCache();
  }

  // Fallback data generators

  private getFallbackPrice(asset: string): number {
    const fallbackPrices: { [key: string]: number } = {
      'BTC': 45000,
      'ETH': 2800,
      'SOL': 95,
      'ADA': 0.45,
      'DOT': 7.2,
      'LINK': 15.8,
      'UNI': 8.5,
      'MATIC': 0.85,
      'AVAX': 35.2,
      'ATOM': 9.8
    };
    return fallbackPrices[asset.toUpperCase()] || 100;
  }

  private getFallbackHistoricalData(asset: string): any[] {
    const basePrice = this.getFallbackPrice(asset);
    const data = [];
    const now = Date.now();
    
    for (let i = 6; i >= 0; i--) {
      const timestamp = now - (i * 24 * 60 * 60 * 1000);
      const priceVariation = (Math.random() - 0.5) * 0.1; // ±5% variation
      const price = basePrice * (1 + priceVariation);
      
      data.push({
        timestamp,
        open: price * (1 + (Math.random() - 0.5) * 0.02),
        high: price * (1 + Math.random() * 0.03),
        low: price * (1 - Math.random() * 0.03),
        close: price,
        volume: Math.random() * 1000000 + 100000,
        vwap: price
      });
    }
    
    return data;
  }

  private getFallbackOptionsChain(asset: string): DeribitOptionsChain {
    const basePrice = this.getFallbackPrice(asset);
    const expirations = ['2024-01-19', '2024-02-16', '2024-03-15'];
    const strikes = [basePrice * 0.8, basePrice * 0.9, basePrice, basePrice * 1.1, basePrice * 1.2];
    
    const instruments: DeribitInstrument[] = [];
    const calls: DeribitInstrument[] = [];
    const puts: DeribitInstrument[] = [];
    
    expirations.forEach(expiration => {
      strikes.forEach(strike => {
        const callInstrument: DeribitInstrument = {
          instrument_name: `${asset}-${expiration}-C-${strike}`,
          instrument_id: Math.floor(Math.random() * 1000000),
          underlying_index: asset,
          underlying_price: basePrice,
          quote_currency: 'USD',
          base_currency: asset,
          price_currency: 'USD',
          min_qty: 1,
          qty_step: 1,
          min_notional: strike,
          price_step: 0.01,
          created: Date.now(),
          is_active: true,
          settlement_period: 'perpetual',
          tick_size: 0.01,
          taker_commission: 0.0003,
          maker_commission: 0.0001,
          strike,
          option_type: 'call',
          expiration_timestamp: new Date(expiration).getTime(),
          underlying: asset,
          contract_size: 1,
          expiration
        };
        
        const putInstrument: DeribitInstrument = {
          instrument_name: `${asset}-${expiration}-P-${strike}`,
          instrument_id: Math.floor(Math.random() * 1000000),
          underlying_index: asset,
          underlying_price: basePrice,
          quote_currency: 'USD',
          base_currency: asset,
          price_currency: 'USD',
          min_qty: 1,
          qty_step: 1,
          min_notional: strike,
          price_step: 0.01,
          created: Date.now(),
          is_active: true,
          settlement_period: 'perpetual',
          tick_size: 0.01,
          taker_commission: 0.0003,
          maker_commission: 0.0001,
          strike,
          option_type: 'put',
          expiration_timestamp: new Date(expiration).getTime(),
          underlying: asset,
          contract_size: 1,
          expiration
        };
        
        instruments.push(callInstrument, putInstrument);
        calls.push(callInstrument);
        puts.push(putInstrument);
      });
    });
    
    return {
      asset: asset.toUpperCase(),
      underlyingPrice: basePrice,
      instruments,
      calls,
      puts,
      expirations,
      timestamp: Date.now()
    };
  }

  private getFallbackVolatilityData(_asset: string): any {
    return {
      historicalVolatility: 65 + Math.random() * 30,
      currentVolatility: 70 + Math.random() * 25,
      volatilityData: Array.from({ length: 30 }, (_, i) => ({
        timestamp: Date.now() - (29 - i) * 24 * 60 * 60 * 1000,
        volatility: 60 + Math.random() * 40
      }))
    };
  }

  private getFallbackPriceChangeStats(asset: string): any {
    return {
      priceChange1h: (Math.random() - 0.5) * 4,
      priceChange24h: (Math.random() - 0.5) * 8,
      priceChange7d: (Math.random() - 0.5) * 15,
      priceChange30d: (Math.random() - 0.5) * 25,
      high24h: this.getFallbackPrice(asset) * 1.05,
      low24h: this.getFallbackPrice(asset) * 0.95,
      volume24h: Math.random() * 5000000 + 1000000
    };
  }
}

// Export singleton instance
export const marketDataService = new MarketDataServiceManager();

// Export individual services for direct access if needed
export {
  coinGeckoService,
  coinPaprikaService,
  deribitService,
  polygonCryptoService
}; 