import { MarketMetrics } from './types';

// API configuration
const API_CONFIG = {
  financialModelingPrep: {
    baseUrl: 'https://financialmodelingprep.com/api/v3',
    apiKey: process.env.NEXT_PUBLIC_FMP_API_KEY || 'demo'
  },
  alphaVantage: {
    baseUrl: 'https://www.alphavantage.co/query',
    apiKey: process.env.NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY || 'demo'
  },
  exchangeRate: {
    baseUrl: 'https://api.exchangerate.host'
  },
  deFiLlama: {
    baseUrl: 'https://api.llama.fi'
  },
  coinGecko: {
    baseUrl: 'https://api.coingecko.com/api/v3'
  },
  fearGreed: {
    baseUrl: 'https://api.alternative.me/fng'
  },
  finnhub: {
    baseUrl: 'https://finnhub.io/api/v1',
    apiKey: process.env.NEXT_PUBLIC_FINNHUB_API_KEY || 'demo'
  }
};

// Top stocks to track
const TOP_STOCKS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'BRK.A', 'JPM', 'JNJ',
  'V', 'PG', 'UNH', 'HD', 'MA', 'BAC', 'PFE', 'ABBV', 'KO', 'PEP'
];

// HTTP client with error handling
class HttpClient {
  private async request<T>(url: string, options?: RequestInit): Promise<T> {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed for ${url}:`, error);
      throw error;
    }
  }

  async get<T>(url: string): Promise<T> {
    return this.request<T>(url);
  }

  async post<T>(url: string, data: any): Promise<T> {
    return this.request<T>(url, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
}

const httpClient = new HttpClient();

// Finnhub API integration
export class FinnhubAPI {
  // Get real-time quote for a single stock
  static async getStockQuote(symbol: string): Promise<any> {
    try {
      const url = `${API_CONFIG.finnhub.baseUrl}/quote?symbol=${symbol}&token=${API_CONFIG.finnhub.apiKey}`;
      const response = await httpClient.get<any>(url);
      
      if (response.error) {
        throw new Error(`Finnhub API error: ${response.error}`);
      }
      
      return {
        symbol,
        currentPrice: response.c,
        change: response.d,
        changePercent: response.dp,
        highPrice: response.h,
        lowPrice: response.l,
        openPrice: response.o,
        previousClose: response.pc,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error(`Failed to fetch quote for ${symbol}:`, error);
      throw error;
    }
  }

  // Get real-time quotes for multiple stocks
  static async getMultipleStockQuotes(symbols: string[]): Promise<any[]> {
    try {
      const quotePromises = symbols.map(symbol => this.getStockQuote(symbol));
      const quotes = await Promise.allSettled(quotePromises);
      
      return quotes
        .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
        .map(result => result.value);
    } catch (error) {
      console.error('Failed to fetch multiple stock quotes:', error);
      return [];
    }
  }

  // Get top stocks quotes
  static async getTopStocksQuotes(): Promise<any[]> {
    return this.getMultipleStockQuotes(TOP_STOCKS);
  }

  // Get company profile
  static async getCompanyProfile(symbol: string): Promise<any> {
    try {
      const url = `${API_CONFIG.finnhub.baseUrl}/stock/profile2?symbol=${symbol}&token=${API_CONFIG.finnhub.apiKey}`;
      const response = await httpClient.get<any>(url);
      
      if (response.error) {
        throw new Error(`Finnhub API error: ${response.error}`);
      }
      
      return response;
    } catch (error) {
      console.error(`Failed to fetch company profile for ${symbol}:`, error);
      throw error;
    }
  }

  // Get market news
  static async getMarketNews(category: string = 'general'): Promise<any[]> {
    try {
      const url = `${API_CONFIG.finnhub.baseUrl}/news?category=${category}&token=${API_CONFIG.finnhub.apiKey}`;
      const response = await httpClient.get<any[]>(url);
      
      if (Array.isArray(response) && response.length > 0 && response[0].error) {
        throw new Error(`Finnhub API error: ${response[0].error}`);
      }
      
      return response.slice(0, 10); // Return top 10 news items
    } catch (error) {
      console.error('Failed to fetch market news:', error);
      return [];
    }
  }
}

// Market data API functions
export class MarketDataAPI {
  // Total Market Overview with Finnhub integration
  static async getTotalMarketOverview(): Promise<MarketMetrics> {
    try {
      // Get top stocks quotes from Finnhub
      const topStocksQuotes = await FinnhubAPI.getTopStocksQuotes();
      
      if (topStocksQuotes.length > 0) {
        // Calculate market metrics from real stock data
        const totalMarketCap = topStocksQuotes.reduce((sum, stock) => sum + (stock.currentPrice * 1000000), 0); // Approximate
        const avgChange = topStocksQuotes.reduce((sum, stock) => sum + (stock.changePercent || 0), 0) / topStocksQuotes.length;
        const totalVolume = topStocksQuotes.reduce((sum, stock) => sum + (stock.currentPrice * 100000), 0); // Approximate
        
        // Get market sentiment
        const sentimentData = await this.getMarketSentiment();
        
        return {
          marketCap: totalMarketCap,
          marketCapChange: avgChange,
          volume: totalVolume,
          volumeChange: 0, // Would need historical data
          sentiment: sentimentData.classification,
          sentimentValue: sentimentData.value,
          activeMarkets: topStocksQuotes.length,
          totalMarkets: TOP_STOCKS.length,
          priceChange: avgChange,
          volatility: Math.abs(avgChange) * 2 // Rough volatility estimate
        };
      }
      
      // Fallback to Financial Modeling Prep if Finnhub fails
      const sp500Url = `${API_CONFIG.financialModelingPrep.baseUrl}/quote/^GSPC?apikey=${API_CONFIG.financialModelingPrep.apiKey}`;
      const sp500Data = await httpClient.get<any[]>(sp500Url);
      
      // Get market sentiment
      const sentimentData = await this.getMarketSentiment();
      
      // Get total market cap (approximate)
      const totalMarketCap = await this.getTotalMarketCap();
      
      return {
        marketCap: totalMarketCap,
        marketCapChange: sp500Data[0]?.changesPercentage || 0,
        volume: sp500Data[0]?.volume || 0,
        volumeChange: 0, // Would need historical data
        sentiment: sentimentData.classification,
        sentimentValue: sentimentData.value,
        activeMarkets: 500, // S&P 500
        totalMarkets: 500,
        priceChange: sp500Data[0]?.changesPercentage || 0,
        volatility: 0 // Would need VIX data
      };
    } catch (error) {
      console.error('Failed to fetch total market overview:', error);
      return this.getMockTotalMarketData();
    }
  }

  // TradFi Market Overview with enhanced stock data
  static async getTradFiMarketOverview(): Promise<MarketMetrics> {
    try {
      // Get top stocks quotes from Finnhub
      const topStocksQuotes = await FinnhubAPI.getTopStocksQuotes();
      
      if (topStocksQuotes.length > 0) {
        // Calculate metrics from real stock data
        const totalMarketCap = topStocksQuotes.reduce((sum, stock) => sum + (stock.currentPrice * 1000000), 0);
        const avgChange = topStocksQuotes.reduce((sum, stock) => sum + (stock.changePercent || 0), 0) / topStocksQuotes.length;
        const totalVolume = topStocksQuotes.reduce((sum, stock) => sum + (stock.currentPrice * 100000), 0);
        
        // Get additional market data
        const indices = ['^GSPC', '^IXIC', '^DJI']; // S&P 500, NASDAQ, Dow Jones
        await Promise.allSettled(
          indices.map(index => 
            httpClient.get<any[]>(`${API_CONFIG.financialModelingPrep.baseUrl}/quote/${index}?apikey=${API_CONFIG.financialModelingPrep.apiKey}`)
          )
        );

        // Get commodity data
        const commodities = await this.getCommodityData();
        
        // Get bond data
        const bonds = await this.getBondData();

        const totalMarkets = topStocksQuotes.length + indices.length + commodities.length + bonds.length;

        return {
          marketCap: totalMarketCap,
          marketCapChange: avgChange,
          volume: totalVolume,
          volumeChange: 0,
          sentiment: this.calculateSentiment(avgChange),
          sentimentValue: this.sentimentToValue(this.calculateSentiment(avgChange)),
          activeMarkets: totalMarkets,
          totalMarkets: totalMarkets,
          priceChange: avgChange,
          volatility: Math.abs(avgChange) * 2 // Rough volatility estimate
        };
      }
      
      // Fallback to original method
      const indices = ['^GSPC', '^IXIC', '^DJI']; // S&P 500, NASDAQ, Dow Jones
      const indicesData = await Promise.all(
        indices.map(index => 
          httpClient.get<any[]>(`${API_CONFIG.financialModelingPrep.baseUrl}/quote/${index}?apikey=${API_CONFIG.financialModelingPrep.apiKey}`)
        )
      );

      // Get commodity data
      const commodities = await this.getCommodityData();
      
      // Get bond data
      const bonds = await this.getBondData();

      const totalMarketCap = indicesData.reduce((sum, data) => sum + (data[0]?.marketCap || 0), 0);
      const avgChange = indicesData.reduce((sum, data) => sum + (data[0]?.changesPercentage || 0), 0) / indicesData.length;

      return {
        marketCap: totalMarketCap,
        marketCapChange: avgChange,
        volume: indicesData.reduce((sum, data) => sum + (data[0]?.volume || 0), 0),
        volumeChange: 0,
        sentiment: this.calculateSentiment(avgChange),
        sentimentValue: this.sentimentToValue(this.calculateSentiment(avgChange)),
        activeMarkets: indices.length + commodities.length + bonds.length,
        totalMarkets: 1000, // Approximate
        priceChange: avgChange,
        volatility: Math.abs(avgChange) * 2 // Rough volatility estimate
      };
    } catch (error) {
      console.error('Failed to fetch TradFi market overview:', error);
      return this.getMockTradFiMarketData();
    }
  }

  // DeFi Market Overview
  static async getDeFiMarketOverview(): Promise<MarketMetrics> {
    try {
      // Get DeFi token data from CoinGecko
      const defiTokens = await this.getDeFiTokens();
      
      // Get DeFi protocol TVL from DeFi Llama (stored but not used in current implementation)
      await this.getDeFiProtocolTVL();
      
      // Get DeFi sentiment (based on price performance)
      const avgPriceChange = defiTokens.reduce((sum, token) => sum + (token.price_change_percentage_24h || 0), 0) / defiTokens.length;
      
      const totalMarketCap = defiTokens.reduce((sum, token) => sum + (token.market_cap || 0), 0);
      const totalVolume = defiTokens.reduce((sum, token) => sum + (token.total_volume || 0), 0);

      return {
        marketCap: totalMarketCap,
        marketCapChange: avgPriceChange,
        volume: totalVolume,
        volumeChange: 0,
        sentiment: this.calculateSentiment(avgPriceChange),
        sentimentValue: this.sentimentToValue(this.calculateSentiment(avgPriceChange)),
        activeMarkets: defiTokens.length,
        totalMarkets: defiTokens.length,
        priceChange: avgPriceChange,
        volatility: Math.abs(avgPriceChange) * 3 // DeFi tends to be more volatile
      };
    } catch (error) {
      console.error('Failed to fetch DeFi market overview:', error);
      return this.getMockDeFiMarketData();
    }
  }

  // Helper methods
  private static async getMarketSentiment(): Promise<{ value: number; classification: string }> {
    try {
      const response = await httpClient.get<any>(`${API_CONFIG.fearGreed.baseUrl}/?format=json`);
      return {
        value: parseInt(response.data[0].value),
        classification: response.data[0].classification
      };
    } catch (error) {
      console.error('Failed to fetch market sentiment:', error);
      return { value: 50, classification: 'Neutral' };
    }
  }

  private static async getTotalMarketCap(): Promise<number> {
    // This would require a more comprehensive API
    // For now, return an approximate value
    return 100 * 1e12; // $100 trillion
  }

  private static async getCommodityData(): Promise<any[]> {
    try {
      const commodities = ['GCUSD', 'CLUSD', 'SIUSD']; // Gold, Oil, Silver
      const data = await Promise.all(
        commodities.map(commodity =>
          httpClient.get<any[]>(`${API_CONFIG.financialModelingPrep.baseUrl}/quote/${commodity}?apikey=${API_CONFIG.financialModelingPrep.apiKey}`)
        )
      );
      return data.flat();
    } catch (error) {
      console.error('Failed to fetch commodity data:', error);
      return [];
    }
  }

  private static async getBondData(): Promise<any[]> {
    try {
      const bonds = ['^TNX', '^TYX', '^IRX']; // 10Y, 30Y, 13W Treasury
      const data = await Promise.all(
        bonds.map(bond =>
          httpClient.get<any[]>(`${API_CONFIG.financialModelingPrep.baseUrl}/quote/${bond}?apikey=${API_CONFIG.financialModelingPrep.apiKey}`)
        )
      );
      return data.flat();
    } catch (error) {
      console.error('Failed to fetch bond data:', error);
      return [];
    }
  }

  private static async getDeFiTokens(): Promise<any[]> {
    try {
      const response = await httpClient.get<any>(`${API_CONFIG.coinGecko.baseUrl}/coins/markets?vs_currency=usd&category=decentralized-finance-defi&order=market_cap_desc&per_page=20&page=1&sparkline=false`);
      return response;
    } catch (error) {
      console.error('Failed to fetch DeFi tokens:', error);
      return [];
    }
  }

  private static async getDeFiProtocolTVL(): Promise<any[]> {
    try {
      const response = await httpClient.get<any>(`${API_CONFIG.deFiLlama.baseUrl}/protocols`);
      return response.slice(0, 20); // Top 20 protocols
    } catch (error) {
      console.error('Failed to fetch DeFi protocol TVL:', error);
      return [];
    }
  }

  private static calculateSentiment(change: number): string {
    if (change >= 2) return 'Extreme Greed';
    if (change >= 1) return 'Greed';
    if (change >= 0) return 'Neutral';
    if (change >= -1) return 'Fear';
    return 'Extreme Fear';
  }

  private static sentimentToValue(sentiment: string): number {
    const sentimentMap: { [key: string]: number } = {
      'Extreme Greed': 90,
      'Greed': 70,
      'Neutral': 50,
      'Fear': 30,
      'Extreme Fear': 10
    };
    return sentimentMap[sentiment] || 50;
  }

  // Mock data fallbacks
  private static getMockTotalMarketData(): MarketMetrics {
    return {
      marketCap: 100 * 1e12,
      marketCapChange: 0.85,
      volume: 150 * 1e9,
      volumeChange: 2.3,
      sentiment: 'Greed',
      sentimentValue: 70,
      activeMarkets: 500,
      totalMarkets: 500,
      priceChange: 0.85,
      volatility: 15.2
    };
  }

  private static getMockTradFiMarketData(): MarketMetrics {
    return {
      marketCap: 85 * 1e12,
      marketCapChange: 1.2,
      volume: 120 * 1e9,
      volumeChange: 1.8,
      sentiment: 'Neutral',
      sentimentValue: 55,
      activeMarkets: 750,
      totalMarkets: 1000,
      priceChange: 1.2,
      volatility: 18.5
    };
  }

  private static getMockDeFiMarketData(): MarketMetrics {
    return {
      marketCap: 15 * 1e12,
      marketCapChange: -2.1,
      volume: 30 * 1e9,
      volumeChange: -5.2,
      sentiment: 'Fear',
      sentimentValue: 35,
      activeMarkets: 200,
      totalMarkets: 200,
      priceChange: -2.1,
      volatility: 45.8
    };
  }
} 