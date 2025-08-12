import axios, { AxiosResponse, AxiosError } from 'axios';

// Environment configuration
const POLYGON_API_KEY = process.env.NEXT_PUBLIC_POLYGON_API_KEY || 'demo';
const POLYGON_BASE_URL = 'https://api.polygon.io';

// Type definitions for Polygon.io API responses
export interface PolygonTicker {
  ticker: string;
  name: string;
  market: string;
  locale: string;
  primary_exchange: string;
  type: string;
  active: boolean;
  currency_name: string;
  cik?: string;
  composite_figi?: string;
  share_class_figi?: string;
  market_cap?: number;
  phone_number?: string;
  address?: {
    address1: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  description?: string;
  sic_code?: string;
  sic_description?: string;
  ticker_root?: string;
  homepage_url?: string;
  total_employees?: number;
  list_date?: string;
  branding?: {
    logo_url: string;
    icon_url: string;
  };
  share_class_shares_outstanding?: number;
  weighted_shares_outstanding?: number;
}

export interface PolygonTickersResponse {
  results: PolygonTicker[];
  status: string;
  request_id: string;
  count: number;
  next_url?: string;
}

export interface PolygonAggregate {
  c: number; // Close price
  h: number; // High price
  l: number; // Low price
  n: number; // Number of transactions
  o: number; // Open price
  t: number; // Timestamp
  v: number; // Volume
  vw: number; // Volume weighted average price
}

export interface PolygonAggregatesResponse {
  results: PolygonAggregate[];
  status: string;
  request_id: string;
  resultsCount: number;
  adjusted: boolean;
  queryCount: number;
  ticker: string;
}

export interface PolygonTrade {
  conditions: number[];
  exchange: number;
  price: number;
  size: number;
  timestamp: number;
}

export interface PolygonLastTradeResponse {
  results: PolygonTrade;
  status: string;
  request_id: string;
  ticker: string;
}

export interface PolygonQuote {
  ask: number;
  askSize: number;
  bid: number;
  bidSize: number;
  lastUpdated: number;
  quoteTimestamp: number;
}

export interface PolygonLastQuoteResponse {
  results: PolygonQuote;
  status: string;
  request_id: string;
  ticker: string;
}

export interface PolygonOptionsContract {
  underlying_ticker: string;
  underlying_ticker_name: string;
  contract_type: string;
  exercise_style: string;
  expiration_date: string;
  strike_price: number;
  shares_per_contract: number;
  ticker: string;
  name: string;
  description: string;
  exchange: string;
  currency: string;
  active: boolean;
  last_updated_utc: string;
}

export interface PolygonOptionsContractsResponse {
  results: PolygonOptionsContract[];
  status: string;
  request_id: string;
  count: number;
  next_url?: string;
}

export interface PolygonOptionsSnapshot {
  underlying_ticker: string;
  underlying_ticker_name: string;
  underlying_price: number;
  underlying_asset_id: string;
  underlying_asset_name: string;
  underlying_asset_type: string;
  underlying_asset_exchange: string;
  underlying_asset_currency: string;
  underlying_asset_last_updated_utc: string;
  options: {
    [strikePrice: string]: {
      [expirationDate: string]: {
        [contractType: string]: {
          ticker: string;
          last_quote: {
            ask: number;
            askSize: number;
            bid: number;
            bidSize: number;
            lastUpdated: number;
            quoteTimestamp: number;
          };
          last_trade: {
            conditions: number[];
            exchange: number;
            price: number;
            size: number;
            timestamp: number;
          };
          greeks: {
            delta: number;
            gamma: number;
            theta: number;
            vega: number;
          };
          implied_volatility: number;
          open_interest: number;
          volume: number;
        };
      };
    };
  };
}

export interface PolygonOptionsSnapshotResponse {
  results: PolygonOptionsSnapshot;
  status: string;
  request_id: string;
  underlying_ticker: string;
}

// Error types
export interface PolygonApiError {
  error: string;
  message: string;
  status: number;
  timestamp: string;
}

// Generic helper function to handle GET requests
async function polygonGetRequest<T>(endpoint: string, params: Record<string, any> = {}): Promise<T> {
  try {
    const queryParams = new URLSearchParams({
      apiKey: POLYGON_API_KEY,
      ...params
    });

    const url = `${POLYGON_BASE_URL}${endpoint}?${queryParams.toString()}`;
    
    const response: AxiosResponse<T> = await axios.get(url, {
      timeout: 10000, // 10 second timeout
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Avila-Protocol/1.0'
      }
    });

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<PolygonApiError>;
      
      if (axiosError.response) {
        // Server responded with error status
        const errorData = axiosError.response.data as PolygonApiError;
        throw new Error(`Polygon API Error ${axiosError.response.status}: ${errorData?.message || errorData?.error || 'Unknown error'}`);
      } else if (axiosError.request) {
        // Request made but no response received
        throw new Error('Polygon API request failed: No response received');
      } else {
        // Request setup failed
        throw new Error(`Polygon API request failed: ${axiosError.message}`);
      }
    } else {
      // Non-Axios error
      throw new Error(`Unexpected error: ${(error as Error).message}`);
    }
  }
}

// STOCKS ENDPOINTS

/**
 * List all tickers with optional filtering
 * @param market - Market filter (e.g., 'stocks', 'crypto', 'fx')
 * @param type - Type filter (e.g., 'CS', 'ETF', 'ADRC')
 * @param active - Filter by active status
 * @param limit - Number of results to return (max 1000)
 * @param sort - Sort field (e.g., 'ticker', 'name', 'market')
 * @param order - Sort order ('asc' or 'desc')
 * @returns Promise<PolygonTickersResponse>
 */
export async function getTickers(
  market?: string,
  type?: string,
  active?: boolean,
  limit: number = 1000,
  sort: string = 'ticker',
  order: 'asc' | 'desc' = 'asc'
): Promise<PolygonTickersResponse> {
  const params: Record<string, any> = {
    limit,
    sort,
    order
  };

  if (market) params.market = market;
  if (type) params.type = type;
  if (active !== undefined) params.active = active;

  return polygonGetRequest<PolygonTickersResponse>('/v3/reference/tickers', params);
}

/**
 * Get historical OHLC aggregates for a ticker
 * @param ticker - Stock ticker symbol
 * @param multiplier - Size of the timespan multiplier
 * @param timespan - Size of the time window (minute, hour, day, week, month, quarter, year)
 * @param from - Start of the aggregate time window (ISO 8601 format)
 * @param to - End of the aggregate time window (ISO 8601 format)
 * @param adjusted - Whether the results are adjusted for splits
 * @param sort - Sort order ('asc' or 'desc')
 * @param limit - Number of results to return (max 50000)
 * @returns Promise<PolygonAggregatesResponse>
 */
export async function getAggregates(
  ticker: string,
  multiplier: number,
  timespan: 'minute' | 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year',
  from: string,
  to: string,
  adjusted: boolean = true,
  sort: 'asc' | 'desc' = 'asc',
  limit: number = 50000
): Promise<PolygonAggregatesResponse> {
  const params: Record<string, any> = {
    adjusted,
    sort,
    limit
  };

  const endpoint = `/v2/aggs/ticker/${ticker}/range/${multiplier}/${timespan}/${from}/${to}`;
  return polygonGetRequest<PolygonAggregatesResponse>(endpoint, params);
}

/**
 * Get the last trade for a ticker
 * @param ticker - Stock ticker symbol
 * @returns Promise<PolygonLastTradeResponse>
 */
export async function getLastTrade(ticker: string): Promise<PolygonLastTradeResponse> {
  return polygonGetRequest<PolygonLastTradeResponse>(`/v2/last/trade/${ticker}`);
}

/**
 * Get the last quote for a ticker
 * @param ticker - Stock ticker symbol
 * @returns Promise<PolygonLastQuoteResponse>
 */
export async function getLastQuote(ticker: string): Promise<PolygonLastQuoteResponse> {
  return polygonGetRequest<PolygonLastQuoteResponse>(`/v2/last/quote/${ticker}`);
}

// OPTIONS ENDPOINTS

/**
 * Get options contract details for a specific options ticker
 * @param optionsTicker - Options contract ticker symbol
 * @param underlyingTicker - Underlying stock ticker (optional filter)
 * @param contractType - Contract type filter ('call' or 'put')
 * @param expirationDate - Expiration date filter (YYYY-MM-DD format)
 * @param strikePrice - Strike price filter
 * @param limit - Number of results to return (max 1000)
 * @returns Promise<PolygonOptionsContractsResponse>
 */
export async function getOptionsContracts(
  optionsTicker?: string,
  underlyingTicker?: string,
  contractType?: 'call' | 'put',
  expirationDate?: string,
  strikePrice?: number,
  limit: number = 1000
): Promise<PolygonOptionsContractsResponse> {
  const params: Record<string, any> = {
    limit
  };

  if (underlyingTicker) params.underlying_ticker = underlyingTicker;
  if (contractType) params.contract_type = contractType;
  if (expirationDate) params.expiration_date = expirationDate;
  if (strikePrice) params.strike_price = strikePrice;

  const endpoint = optionsTicker 
    ? `/v3/reference/options/contracts/${optionsTicker}`
    : '/v3/reference/options/contracts';

  return polygonGetRequest<PolygonOptionsContractsResponse>(endpoint, params);
}

/**
 * Get options chain snapshot for an underlying ticker
 * @param underlyingTicker - Underlying stock ticker symbol
 * @returns Promise<PolygonOptionsSnapshotResponse>
 */
export async function getOptionsSnapshot(underlyingTicker: string): Promise<PolygonOptionsSnapshotResponse> {
  return polygonGetRequest<PolygonOptionsSnapshotResponse>(`/v3/snapshot/options/${underlyingTicker}`);
}

// UTILITY FUNCTIONS

/**
 * Get current stock price using last trade
 * @param ticker - Stock ticker symbol
 * @returns Promise<number> - Current stock price
 */
export async function getCurrentStockPrice(ticker: string): Promise<number> {
  try {
    const lastTrade = await getLastTrade(ticker);
    return lastTrade.results.price;
  } catch (error) {
    throw new Error(`Failed to get current price for ${ticker}: ${(error as Error).message}`);
  }
}

/**
 * Get current stock quote (bid/ask)
 * @param ticker - Stock ticker symbol
 * @returns Promise<{bid: number, ask: number, spread: number}>
 */
export async function getCurrentStockQuote(ticker: string): Promise<{bid: number, ask: number, spread: number}> {
  try {
    const lastQuote = await getLastQuote(ticker);
    const bid = lastQuote.results.bid;
    const ask = lastQuote.results.ask;
    const spread = ask - bid;
    
    return { bid, ask, spread };
  } catch (error) {
    throw new Error(`Failed to get current quote for ${ticker}: ${(error as Error).message}`);
  }
}

/**
 * Get options chain for a specific expiration date
 * @param underlyingTicker - Underlying stock ticker
 * @param expirationDate - Expiration date (YYYY-MM-DD format)
 * @returns Promise<PolygonOptionsSnapshotResponse>
 */
export async function getOptionsChainForExpiration(
  underlyingTicker: string, 
  expirationDate: string
): Promise<PolygonOptionsSnapshotResponse> {
  try {
    const snapshot = await getOptionsSnapshot(underlyingTicker);
    
    // Filter for specific expiration date
    const filteredSnapshot: PolygonOptionsSnapshotResponse = {
      ...snapshot,
      results: {
        ...snapshot.results,
        options: {}
      }
    };

    // Filter options by expiration date
    Object.keys(snapshot.results.options).forEach(strikePrice => {
      if (snapshot.results.options[strikePrice][expirationDate]) {
        (filteredSnapshot.results.options as any)[strikePrice] = {
          [expirationDate]: snapshot.results.options[strikePrice][expirationDate]
        };
      }
    });

    return filteredSnapshot;
  } catch (error) {
    throw new Error(`Failed to get options chain for ${underlyingTicker} expiring ${expirationDate}: ${(error as Error).message}`);
  }
}

/**
 * Get implied volatility for a specific options contract
 * @param underlyingTicker - Underlying stock ticker
 * @param strikePrice - Strike price
 * @param expirationDate - Expiration date (YYYY-MM-DD format)
 * @param contractType - Contract type ('call' or 'put')
 * @returns Promise<number> - Implied volatility
 */
export async function getImpliedVolatility(
  underlyingTicker: string,
  strikePrice: number,
  expirationDate: string,
  contractType: 'call' | 'put'
): Promise<number> {
  try {
    const snapshot = await getOptionsSnapshot(underlyingTicker);
    const strikeKey = strikePrice.toString();
    const expirationKey = expirationDate;
    
    if (snapshot.results.options[strikeKey]?.[expirationKey]?.[contractType]?.implied_volatility !== undefined) {
      return snapshot.results.options[strikeKey][expirationKey][contractType].implied_volatility;
    } else {
      throw new Error(`No implied volatility data found for ${underlyingTicker} ${strikePrice} ${expirationDate} ${contractType}`);
    }
  } catch (error) {
    throw new Error(`Failed to get implied volatility: ${(error as Error).message}`);
  }
}

// Export default configuration
export const polygonConfig = {
  apiKey: POLYGON_API_KEY,
  baseUrl: POLYGON_BASE_URL,
  timeout: 10000
}; 