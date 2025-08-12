import { useState, useEffect, useCallback, useRef } from 'react';
import { WebSocketManager, WEBSOCKET_CONFIGS } from './websocket';
import { MarketDataAPI } from './api';
import { MarketData, MarketMetrics, DataSourceStatus, DataSourceError } from './types';

export function useDataSourceManager() {
  const [status, setStatus] = useState<DataSourceStatus>('connecting');
  const [isLive, setIsLive] = useState(false);
  const [lastDataUpdate, setLastDataUpdate] = useState<Date | null>(null);
  const [marketData, setMarketData] = useState<MarketData>({});
  const [errors, setErrors] = useState<DataSourceError[]>([]);

  const websocketManagers = useRef<Map<string, WebSocketManager>>(new Map());
  const httpPollingTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const fallbackMode = useRef<Map<string, boolean>>(new Map());
  const lastWebSocketDisconnect = useRef<Map<string, number>>(new Map());

  // Initialize WebSocket connections
  const initializeWebSockets = useCallback(() => {
    Object.entries(WEBSOCKET_CONFIGS).forEach(([key, config]) => {
      const manager = new WebSocketManager(
        config,
        (message) => handleWebSocketMessage(key, message),
        (error) => handleWebSocketError(key, error),
        (status) => handleWebSocketStatusChange(key, status)
      );

      websocketManagers.current.set(key, manager);
      fallbackMode.current.set(key, false);
      lastWebSocketDisconnect.current.set(key, 0);

      // Attempt to connect
      manager.connect();
    });
  }, []);

  // Handle WebSocket messages
  const handleWebSocketMessage = useCallback((source: string, message: any) => {
    console.log(`WebSocket message from ${source}:`, message);
    
    // Switch back to live mode if we were in fallback
    if (fallbackMode.current.get(source)) {
      fallbackMode.current.set(source, false);
      stopHttpPolling(source);
    }

    // Process message and update market data
    updateMarketData(source, message);
    setLastDataUpdate(new Date());
    setIsLive(true);
  }, []);

  // Handle WebSocket errors
  const handleWebSocketError = useCallback((source: string, error: DataSourceError) => {
    console.error(`WebSocket error from ${source}:`, error);
    
    // Add to errors list
    setErrors(prev => [...prev, error]);
    
    // Mark as disconnected
    lastWebSocketDisconnect.current.set(source, Date.now());
    
    // Start HTTP fallback after 5 seconds
    setTimeout(() => {
      if (Date.now() - (lastWebSocketDisconnect.current.get(source) || 0) >= 5000) {
        startHttpFallback(source);
      }
    }, 5000);
  }, []);

  // Handle WebSocket status changes
  const handleWebSocketStatusChange = useCallback((source: string, status: 'connected' | 'disconnected' | 'connecting') => {
    console.log(`WebSocket status change for ${source}:`, status);
    
    if (status === 'disconnected') {
      lastWebSocketDisconnect.current.set(source, Date.now());
      
      // Start HTTP fallback after 5 seconds
      setTimeout(() => {
        if (Date.now() - (lastWebSocketDisconnect.current.get(source) || 0) >= 5000) {
          startHttpFallback(source);
        }
      }, 5000);
    } else if (status === 'connected') {
      // Stop HTTP fallback if WebSocket reconnects
      if (fallbackMode.current.get(source)) {
        fallbackMode.current.set(source, false);
        stopHttpPolling(source);
      }
    }
    
    updateOverallStatus();
  }, []);

  // Start HTTP fallback for a specific source
  const startHttpFallback = useCallback((source: string) => {
    if (fallbackMode.current.get(source)) return; // Already in fallback mode
    
    console.log(`Starting HTTP fallback for ${source}`);
    fallbackMode.current.set(source, true);
    
    // Immediate fetch
    fetchMarketData(source);
    
    // Set up polling every 15 seconds
    const timer = setInterval(() => {
      fetchMarketData(source);
    }, 15000);
    
    httpPollingTimers.current.set(source, timer);
  }, []);

  // Stop HTTP polling for a specific source
  const stopHttpPolling = useCallback((source: string) => {
    const timer = httpPollingTimers.current.get(source);
    if (timer) {
      clearInterval(timer);
      httpPollingTimers.current.delete(source);
    }
  }, []);

  // Fetch market data via HTTP
  const fetchMarketData = useCallback(async (source: string) => {
    try {
      let data: MarketMetrics;
      
      switch (source) {
        case 'polygon':
          data = await MarketDataAPI.getTotalMarketOverview();
          break;
        case 'tradingEconomics':
          data = await MarketDataAPI.getTradFiMarketOverview();
          break;
        case 'dexscreener':
          data = await MarketDataAPI.getDeFiMarketOverview();
          break;
        default:
          console.warn(`Unknown data source: ${source}`);
          return;
      }
      
      // Update market data
      updateMarketData(source, data);
      setLastDataUpdate(new Date());
      setIsLive(false);
      
    } catch (error) {
      console.error(`HTTP fallback failed for ${source}:`, error);
      
      // Add to errors list
      const dataError: DataSourceError = {
        source,
        message: `HTTP fallback failed: ${error}`,
        timestamp: Date.now(),
        retryCount: 0
      };
      setErrors(prev => [...prev, dataError]);
    }
  }, []);

  // Update market data based on source
  const updateMarketData = useCallback((source: string, data: any) => {
    setMarketData(prev => {
      const newData = { ...prev };
      
      switch (source) {
        case 'polygon':
          newData.total = data;
          break;
        case 'tradingEconomics':
          newData.tradfi = data;
          break;
        case 'dexscreener':
          newData.defi = data;
          break;
        default:
          // Handle other sources or update all categories
          if (data.marketCap !== undefined) {
            // This might be general market data, update all categories
            newData.total = { ...newData.total, ...data };
            newData.tradfi = { ...newData.tradfi, ...data };
            newData.defi = { ...newData.defi, ...data };
          }
      }
      
      return newData;
    });
  }, []);

  // Update overall connection status
  const updateOverallStatus = useCallback(() => {
    const allSources = Array.from(websocketManagers.current.keys());
    const connectedSources = allSources.filter(source => 
      websocketManagers.current.get(source)?.isConnected()
    );
    const fallbackSources = allSources.filter(source => 
      fallbackMode.current.get(source)
    );
    
    if (connectedSources.length > 0) {
      setStatus('connected');
      setIsLive(true);
    } else if (fallbackSources.length > 0) {
      setStatus('disconnected');
      setIsLive(false);
    } else {
      setStatus('error');
      setIsLive(false);
    }
  }, []);

  // Connect to all data sources
  const connect = useCallback(() => {
    console.log('Connecting to data sources...');
    setStatus('connecting');
    initializeWebSockets();
  }, [initializeWebSockets]);

  // Disconnect from all data sources
  const disconnect = useCallback(() => {
    console.log('Disconnecting from data sources...');
    
    // Stop all WebSocket connections
    websocketManagers.current.forEach(manager => manager.disconnect());
    
    // Stop all HTTP polling
    httpPollingTimers.current.forEach(timer => clearInterval(timer));
    httpPollingTimers.current.clear();
    
    // Reset state
    setStatus('disconnected');
    setIsLive(false);
    fallbackMode.current.clear();
    lastWebSocketDisconnect.current.clear();
  }, []);

  // Initialize on mount
  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    status,
    isLive,
    lastDataUpdate,
    marketData,
    errors,
    connect,
    disconnect
  };
} 