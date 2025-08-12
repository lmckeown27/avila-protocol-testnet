// Market data types
export interface MarketMetrics {
  marketCap?: number;
  marketCapChange?: number;
  volume?: number;
  volumeChange?: number;
  sentiment?: string;
  sentimentValue?: number;
  activeMarkets?: number;
  totalMarkets?: number;
  priceChange?: number;
  volatility?: number;
}

export interface MarketData {
  total?: MarketMetrics;
  tradfi?: MarketMetrics;
  defi?: MarketMetrics;
}

// Data source status types
export type DataSourceStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface DataSourceConfig {
  websocketUrl: string;
  httpFallbackUrl: string;
  apiKey?: string;
  reconnectInterval: number;
  fallbackInterval: number;
}

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: number;
}

// API response types
export interface PolygonStockData {
  ev: string;
  sym: string;
  p: number;
  s: number;
  t: number;
  x: number;
  c: number[];
  z: number;
}

export interface TradingEconomicsData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
}

export interface FinnhubForexData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: number;
}

export interface DexScreenerData {
  pairAddress: string;
  baseToken: {
    symbol: string;
    name: string;
    price: number;
    priceUsd: number;
  };
  priceUsd: string;
  priceChange: {
    h24: number;
  };
  liquidity: {
    usd: number;
  };
  volume: {
    h24: number;
  };
}

export interface CoinGeckoData {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  total_volume: number;
  price_change_percentage_24h: number;
  market_cap_change_percentage_24h: number;
}

export interface DeFiLlamaData {
  name: string;
  symbol: string;
  tvl: number;
  change_1d: number;
  change_7d: number;
  change_1m: number;
}

export interface FearGreedData {
  value: number;
  classification: string;
  timestamp: string;
}

// Error types
export interface DataSourceError {
  source: string;
  message: string;
  timestamp: number;
  retryCount: number;
}

// Connection state types
export interface ConnectionState {
  status: DataSourceStatus;
  lastConnected: Date | null;
  lastDisconnected: Date | null;
  reconnectAttempts: number;
  errors: DataSourceError[];
} 