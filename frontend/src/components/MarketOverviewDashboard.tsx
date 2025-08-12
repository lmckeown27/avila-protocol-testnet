'use client';

import { useState, useEffect } from 'react';
import { useDataSourceManager } from '../lib/dataSourceManager';
import { DataSourceStatus } from '../lib/types';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Wifi, 
  WifiOff,
  RefreshCw
} from 'lucide-react';

interface MarketOverviewDashboardProps {
  className?: string;
}

type TabType = 'total' | 'tradfi' | 'defi';

export default function MarketOverviewDashboard({ className = '' }: MarketOverviewDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabType>('total');
  const [dataSourceStatus, setDataSourceStatus] = useState<DataSourceStatus>('connecting');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const { 
    connect, 
    disconnect, 
    status, 
    isLive, 
    lastDataUpdate,
    marketData
  } = useDataSourceManager();

  // Update local state when data source status changes
  useEffect(() => {
    setDataSourceStatus(status);
    if (lastDataUpdate) {
      setLastUpdated(lastDataUpdate);
    }
  }, [status, lastDataUpdate]);

  // Connect to data sources when component mounts
  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  // Tab navigation
  const tabs = [
    { id: 'total', label: 'Total Market Overview', icon: Activity },
    { id: 'tradfi', label: 'TradFi Market Overview', icon: TrendingUp },
    { id: 'defi', label: 'DeFi Market Overview', icon: TrendingDown }
  ];

  // Render status badge
  const renderStatusBadge = () => {
    if (isLive) {
      return (
        <div className="flex items-center space-x-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span>Live</span>
        </div>
      );
    }
    
    return (
      <div className="flex items-center space-x-2 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
        <RefreshCw className="w-4 h-4 animate-spin" />
        <span>Polling</span>
      </div>
    );
  };

  // Render market overview cards
  const renderMarketCards = () => {
    const data = marketData[activeTab] || {};
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Market Cap Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Market Cap</h3>
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            ${data.marketCap ? (data.marketCap / 1e12).toFixed(2) + 'T' : '--'}
          </div>
          <div className="flex items-center text-sm">
            <span className={`${(data.marketCapChange ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {data.marketCapChange !== undefined ? `${(data.marketCapChange >= 0 ? '+' : '')}${data.marketCapChange.toFixed(2)}%` : '--'}
            </span>
            <span className="text-gray-500 dark:text-gray-400 ml-2">24h</span>
          </div>
        </div>

        {/* Volume Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">24h Volume</h3>
            <Activity className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            ${data.volume ? (data.volume / 1e9).toFixed(2) + 'B' : '--'}
          </div>
          <div className="flex items-center text-sm">
            <span className={`${(data.volumeChange ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {data.volumeChange !== undefined ? `${(data.volumeChange >= 0 ? '+' : '')}${data.volumeChange.toFixed(2)}%` : '--'}
            </span>
            <span className="text-gray-500 dark:text-gray-400 ml-2">24h</span>
          </div>
        </div>

        {/* Sentiment Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Market Sentiment</h3>
            <div className="w-5 h-5 rounded-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500"></div>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {data.sentiment || '--'}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {data.sentimentValue ? `${data.sentimentValue}/100` : '--'}
          </div>
        </div>

        {/* Active Markets Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Active Markets</h3>
            <div className="w-5 h-5 bg-purple-500 rounded-full"></div>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {data.activeMarkets || '--'}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {data.totalMarkets ? `of ${data.totalMarkets} total` : '--'}
          </div>
        </div>

        {/* Price Change Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Price Change</h3>
            <TrendingDown className="w-5 h-5 text-red-500" />
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {data.priceChange !== undefined ? `${(data.priceChange >= 0 ? '+' : '')}${data.priceChange.toFixed(2)}%` : '--'}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {data.priceChange !== undefined ? '24h average' : '--'}
          </div>
        </div>

        {/* Volatility Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Volatility</h3>
            <div className="w-5 h-5 bg-orange-500 rounded-full"></div>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {data.volatility !== undefined ? `${data.volatility.toFixed(2)}%` : '--'}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {data.volatility !== undefined ? 'VIX equivalent' : '--'}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Market Overview Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Real-time market data with live updates and fallback polling
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          {renderStatusBadge()}
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                  isActive
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Connection Status */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              {dataSourceStatus === 'connected' ? (
                <Wifi className="w-5 h-5 text-green-500" />
              ) : (
                <WifiOff className="w-5 h-5 text-red-500" />
              )}
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {dataSourceStatus === 'connected' ? 'WebSocket Connected' : 'HTTP Polling'}
              </span>
            </div>
          </div>
          
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {dataSourceStatus === 'connected' 
              ? 'Real-time data streaming' 
              : 'Fallback mode - reconnecting...'
            }
          </div>
        </div>
      </div>

      {/* Market Overview Cards */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          {tabs.find(t => t.id === activeTab)?.label}
        </h2>
        {renderMarketCards()}
      </div>

      {/* Data Source Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">Data Sources</h3>
        <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
          <p>• Market indices & equities: Polygon.io WebSocket + Financial Modeling Prep API</p>
          <p>• Bond & commodity markets: Trading Economics WebSocket + Alpha Vantage API</p>
          <p>• Forex: Finnhub WebSocket + ExchangeRate.host API</p>
          <p>• DeFi: DexScreener WebSocket + DeFi Llama + CoinGecko APIs</p>
          <p>• Market sentiment: Alternative.me Fear & Greed Index API</p>
        </div>
      </div>
    </div>
  );
} 