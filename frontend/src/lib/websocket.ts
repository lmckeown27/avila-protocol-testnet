import { WebSocketMessage, DataSourceConfig, DataSourceError } from './types';

export class WebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectInterval = 5000; // 5 seconds
  private isConnecting = false;
  private messageQueue: WebSocketMessage[] = [];
  private config: DataSourceConfig;
  private onMessage: (message: WebSocketMessage) => void;
  private onError: (error: DataSourceError) => void;
  private onStatusChange: (status: 'connected' | 'disconnected' | 'connecting') => void;

  constructor(
    config: DataSourceConfig,
    onMessage: (message: WebSocketMessage) => void,
    onError: (error: DataSourceError) => void,
    onStatusChange: (status: 'connected' | 'disconnected' | 'connecting') => void
  ) {
    this.config = config;
    this.onMessage = onMessage;
    this.onError = onError;
    this.onStatusChange = onStatusChange;
  }

  connect(): void {
    if (this.isConnecting || this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.isConnecting = true;
    this.onStatusChange('connecting');

    try {
      this.ws = new WebSocket(this.config.websocketUrl);
      this.setupEventHandlers();
    } catch (error) {
      this.handleError('WebSocket connection failed', error);
      this.isConnecting = false;
      this.onStatusChange('disconnected');
    }
  }

  private setupEventHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      this.onStatusChange('connected');
      this.processMessageQueue();
      console.log(`WebSocket connected to ${this.config.websocketUrl}`);
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const message: WebSocketMessage = {
          type: this.determineMessageType(data),
          data,
          timestamp: Date.now()
        };
        this.onMessage(message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    this.ws.onclose = (event) => {
      this.isConnecting = false;
      this.onStatusChange('disconnected');
      
      if (!event.wasClean) {
        this.handleError('WebSocket connection closed unexpectedly', new Error('Connection closed'));
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = (error) => {
      this.handleError('WebSocket error occurred', error);
    };
  }

  private determineMessageType(data: any): string {
    // Determine message type based on data structure
    if (data.ev && data.sym) return 'polygon_stock';
    if (data.symbol && data.price) return 'trading_economics';
    if (data.symbol && data.timestamp) return 'finnhub_forex';
    if (data.pairAddress && data.baseToken) return 'dexscreener';
    return 'unknown';
  }

  private handleError(message: string, error: any): void {
    const dataError: DataSourceError = {
      source: this.config.websocketUrl,
      message: `${message}: ${error?.message || error}`,
      timestamp: Date.now(),
      retryCount: this.reconnectAttempts
    };

    this.onError(dataError);
    console.error('WebSocket error:', dataError);
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectAttempts++;
    const delay = this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff

    this.reconnectTimer = setTimeout(() => {
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      this.connect();
    }, delay);
  }

  private processMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        this.onMessage(message);
      }
    }
  }

  send(message: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      // Queue message for when connection is restored
      this.messageQueue.push({
        type: 'queued',
        data: message,
        timestamp: Date.now()
      });
    }
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.isConnecting = false;
    this.onStatusChange('disconnected');
  }

  getStatus(): 'connected' | 'disconnected' | 'connecting' {
    if (this.isConnecting) return 'connecting';
    if (this.ws?.readyState === WebSocket.OPEN) return 'connected';
    return 'disconnected';
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// WebSocket configurations for different data sources
export const WEBSOCKET_CONFIGS = {
  polygon: {
    websocketUrl: 'wss://socket.polygon.io/stocks',
    httpFallbackUrl: 'https://financialmodelingprep.com/api/v3',
    reconnectInterval: 5000,
    fallbackInterval: 15000
  },
  tradingEconomics: {
    websocketUrl: 'wss://stream.tradingeconomics.com/?client=guest:guest',
    httpFallbackUrl: 'https://www.alphavantage.co/query',
    reconnectInterval: 5000,
    fallbackInterval: 15000
  },
  finnhub: {
    websocketUrl: 'wss://ws.finnhub.io?token=YOUR_TOKEN',
    httpFallbackUrl: 'https://api.exchangerate.host',
    reconnectInterval: 5000,
    fallbackInterval: 15000
  },
  dexscreener: {
    websocketUrl: 'wss://io.dexscreener.com',
    httpFallbackUrl: 'https://api.llama.fi',
    reconnectInterval: 5000,
    fallbackInterval: 15000
  }
}; 