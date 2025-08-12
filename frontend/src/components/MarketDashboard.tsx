import { useEffect, useState, useMemo } from 'react';
import { Search, TrendingUp, TrendingDown, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { tradFiDataService, TradFiAsset } from '../services/tradfiData';
import { marketDataService, StandardizedMarketData } from '../services/marketData';
import AssetDetailModal from './AssetDetailModal';

const MarketDashboard = () => {
  // State for TradFi data
  const [tradFiData, setTradFiData] = useState<TradFiAsset[]>([]);
  const [tradFiError, setTradFiError] = useState<string | null>(null);
  const [tradFiSortConfig, setTradFiSortConfig] = useState<{ key: keyof TradFiAsset; direction: 'asc' | 'desc' } | null>(null);

  // State for DeFi data
  const [deFiData, setDeFiData] = useState<StandardizedMarketData[]>([]);
  const [deFiError, setDeFiError] = useState<string | null>(null);
  const [deFiSortConfig, setDeFiSortConfig] = useState<{ key: keyof StandardizedMarketData; direction: 'asc' | 'desc' } | null>(null);

  // State for search and modal
  const [search, setSearch] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<TradFiAsset | StandardizedMarketData | null>(null);
  const [selectedAssetType, setSelectedAssetType] = useState<'tradfi' | 'defi' | null>(null);

  // Fetch data on component mount
  useEffect(() => {
    const fetchTradFiData = async () => {
      try {
        const data = await tradFiDataService.getTradfiMarketData();
        setTradFiData(data.assets);
      } catch (error) {
        console.error('Failed to fetch TradFi data:', error);
        setTradFiError('Failed to load Traditional Markets data.');
      }
    };

    const fetchDeFiData = async () => {
      try {
        const results = await Promise.allSettled([
          marketDataService.getMarketData('BTC'),
          marketDataService.getMarketData('ETH'),
          marketDataService.getMarketData('SOL'),
          marketDataService.getMarketData('ADA'),
          marketDataService.getMarketData('DOT'),
        ]);
        const validResults = results
          .filter((result) => result.status === 'fulfilled')
          .map((result) => (result as PromiseFulfilledResult<StandardizedMarketData>).value);
        
        setDeFiData(validResults);
      } catch (error) {
        console.error('Failed to fetch DeFi data:', error);
        setDeFiError('Failed to load Decentralized Markets data.');
      }
    };

    fetchTradFiData();
    fetchDeFiData();

    const interval = setInterval(() => {
      fetchTradFiData();
      fetchDeFiData();
    }, 60000); // Refresh every 60 seconds

    return () => clearInterval(interval);
  }, []);

  // Filter and sort TradFi data
  const filteredAndSortedTradFi = useMemo(() => {
    let filtered = tradFiData.filter(asset =>
      asset.symbol.toLowerCase().includes(search.toLowerCase()) ||
      asset.name.toLowerCase().includes(search.toLowerCase())
    );

    if (tradFiSortConfig) {
      filtered.sort((a, b) => {
        const aVal = a[tradFiSortConfig.key];
        const bVal = b[tradFiSortConfig.key];

        if (aVal === null || bVal === null) return 0;
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          const aLower = aVal.toLowerCase();
          const bLower = bVal.toLowerCase();
          if (aLower < bLower) return tradFiSortConfig.direction === 'asc' ? -1 : 1;
          if (aLower > bLower) return tradFiSortConfig.direction === 'asc' ? 1 : -1;
          return 0;
        }
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          if (aVal < bVal) return tradFiSortConfig.direction === 'asc' ? -1 : 1;
          if (aVal > bVal) return tradFiSortConfig.direction === 'asc' ? 1 : -1;
          return 0;
        }
        return 0;
      });
    }

    return filtered;
  }, [tradFiData, search, tradFiSortConfig]);

  // Filter and sort DeFi data
  const filteredAndSortedDeFi = useMemo(() => {
    let filtered = deFiData.filter(asset =>
      asset.asset.toLowerCase().includes(search.toLowerCase())
    );

    if (deFiSortConfig) {
      filtered.sort((a, b) => {
        const aVal = a[deFiSortConfig.key];
        const bVal = b[deFiSortConfig.key];

        if (aVal === null || bVal === null) return 0;
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          const aLower = aVal.toLowerCase();
          const bLower = bVal.toLowerCase();
          if (aLower < bLower) return deFiSortConfig.direction === 'asc' ? -1 : 1;
          if (aLower > bLower) return deFiSortConfig.direction === 'asc' ? 1 : -1;
          return 0;
        }
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          if (aVal < bVal) return deFiSortConfig.direction === 'asc' ? -1 : 1;
          if (aVal > bVal) return deFiSortConfig.direction === 'asc' ? 1 : -1;
          return 0;
        }
        return 0;
      });
    }

    return filtered;
  }, [deFiData, search, deFiSortConfig]);

  // Handle sorting
  const handleSort = (key: keyof TradFiAsset | keyof StandardizedMarketData, type: 'tradfi' | 'defi') => {
    if (type === 'tradfi') {
      const currentConfig = tradFiSortConfig;
      if (currentConfig?.key === key) {
        setTradFiSortConfig({
          key: key as keyof TradFiAsset,
          direction: currentConfig.direction === 'asc' ? 'desc' : 'asc'
        });
      } else {
        setTradFiSortConfig({ key: key as keyof TradFiAsset, direction: 'asc' });
      }
    } else {
      const currentConfig = deFiSortConfig;
      if (currentConfig?.key === key) {
        setDeFiSortConfig({
          key: key as keyof StandardizedMarketData,
          direction: currentConfig.direction === 'asc' ? 'desc' : 'asc'
        });
      } else {
        setDeFiSortConfig({ key: key as keyof StandardizedMarketData, direction: 'asc' });
      }
    }
  };

  // Handle asset selection
  const handleAssetClick = (asset: TradFiAsset | StandardizedMarketData, type: 'tradfi' | 'defi') => {
    setSelectedAsset(asset);
    setSelectedAssetType(type);
  };

  // Format currency
  const formatCurrency = (value: number) => {
    if (value === 0) return '$0.00';
    if (value < 1) return `$${value.toFixed(4)}`;
    if (value < 1000) return `$${value.toFixed(2)}`;
    if (value < 1000000) return `$${(value / 1000).toFixed(2)}K`;
    if (value < 1000000000) return `$${(value / 1000000).toFixed(2)}M`;
    return `$${(value / 1000000000).toFixed(2)}B`;
  };

  // Format volume
  const formatVolume = (value: number) => {
    if (value === 0) return '0';
    if (value < 1000) return value.toLocaleString();
    if (value < 1000000) return `${(value / 1000).toFixed(1)}K`;
    if (value < 1000000000) return `${(value / 1000000).toFixed(1)}M`;
    return `${(value / 1000000000).toFixed(1)}B`;
  };

  // Get change color and icon
  const getChangeDisplay = (change: number, changePercent: number) => {
    if (!change && !changePercent) return { color: 'text-gray-500', icon: null };
    
    const isPositive = (change || 0) >= 0;
    return {
      color: isPositive ? 'text-green-600' : 'text-red-600',
      icon: isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />
    };
  };

  // Render sort indicator
  const renderSortIndicator = (key: keyof TradFiAsset | keyof StandardizedMarketData, type: 'tradfi' | 'defi') => {
    const config = type === 'tradfi' ? tradFiSortConfig : deFiSortConfig;
    if (!config || config.key !== key) return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    return config.direction === 'asc' ? 
      <ArrowUp className="w-4 h-4 text-blue-600" /> : 
      <ArrowDown className="w-4 h-4 text-blue-600" />;
  };

  // Render table header
  const renderTableHeader = (key: keyof TradFiAsset | keyof StandardizedMarketData, label: string, type: 'tradfi' | 'defi') => (
    <th
      key={key}
      className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      onClick={() => handleSort(key, type)}
    >
      <div className="flex items-center space-x-1">
        <span>{label}</span>
        {renderSortIndicator(key, type)}
      </div>
    </th>
  );

  // Render table row
  const renderTableRow = (asset: TradFiAsset | StandardizedMarketData, type: 'tradfi' | 'defi') => {
    const changeDisplay = getChangeDisplay(
      'change' in asset ? asset.change : 0, 
      'changePercent' in asset ? asset.changePercent : 0
    );
    const currentPrice = 'price' in asset ? asset.price : asset.spot_price;
    const changePercent = 'changePercent' in asset ? asset.changePercent : 0;
    const volume = 'volume' in asset ? asset.volume : 0;
    const marketCap = 'marketCap' in asset ? asset.marketCap : 0;

    return (
      <tr
        key={'symbol' in asset ? asset.symbol : asset.asset}
        className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
        onClick={() => handleAssetClick(asset, type)}
      >
        <td className="px-4 py-4 whitespace-nowrap">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center text-sm font-bold text-blue-600 dark:text-blue-400">
              {('symbol' in asset ? asset.symbol : asset.asset).charAt(0)}
            </div>
            <div className="ml-3">
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                {'symbol' in asset ? asset.symbol : asset.asset}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {'name' in asset ? asset.name : asset.asset}
              </div>
            </div>
          </div>
        </td>
        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
          {formatCurrency(currentPrice || 0)}
        </td>
        <td className="px-4 py-4 whitespace-nowrap">
          <div className={`flex items-center space-x-1 ${changeDisplay.color}`}>
            {changeDisplay.icon}
            <span className="font-medium">
              {changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%
            </span>
          </div>
        </td>
        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
          {formatVolume(volume)}
        </td>
        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
          {formatCurrency(marketCap)}
        </td>
      </tr>
    );
  };

  // Render mobile card view
  const renderMobileCard = (asset: TradFiAsset | StandardizedMarketData, type: 'tradfi' | 'defi') => {
    const changeDisplay = getChangeDisplay(
      'change' in asset ? asset.change : 0, 
      'changePercent' in asset ? asset.changePercent : 0
    );
    const currentPrice = 'price' in asset ? asset.price : asset.spot_price;
    const changePercent = 'changePercent' in asset ? asset.changePercent : 0;
    const volume = 'volume' in asset ? asset.volume : 0;
    const marketCap = 'marketCap' in asset ? asset.marketCap : 0;

    return (
      <div
        key={'symbol' in asset ? asset.symbol : asset.asset}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => handleAssetClick(asset, type)}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center text-sm font-bold text-blue-600 dark:text-blue-400">
              {('symbol' in asset ? asset.symbol : asset.asset).charAt(0)}
            </div>
            <div>
              <div className="font-medium text-gray-900 dark:text-white">
                {'symbol' in asset ? asset.symbol : asset.asset}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {'name' in asset ? asset.name : asset.asset}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-gray-900 dark:text-white">
              {formatCurrency(currentPrice || 0)}
            </div>
            <div className={`flex items-center justify-end space-x-1 ${changeDisplay.color}`}>
              {changeDisplay.icon}
              <span className="text-sm">
                {changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500 dark:text-gray-400">Volume:</span>
            <span className="ml-2 text-gray-900 dark:text-white">{formatVolume(volume)}</span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Market Cap:</span>
            <span className="ml-2 text-gray-900 dark:text-white">{formatCurrency(marketCap)}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Market Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Real-time TradFi and DeFi market data
        </p>
      </div>

      {/* Traditional Markets Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Traditional Markets
          </h2>
          
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search stocks and ETFs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {/* Desktop Table View */}
          <table className="hidden md:table w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                {renderTableHeader('symbol', 'Asset', 'tradfi')}
                {renderTableHeader('price', 'Price', 'tradfi')}
                {renderTableHeader('change', '24h Change', 'tradfi')}
                {renderTableHeader('volume', '24h Volume', 'tradfi')}
                {renderTableHeader('marketCap', 'Market Cap', 'tradfi')}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {tradFiError ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-red-500">
                    {tradFiError}
                  </td>
                </tr>
              ) : filteredAndSortedTradFi.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    No assets found matching your search.
                  </td>
                </tr>
              ) : (
                filteredAndSortedTradFi.map(asset => renderTableRow(asset, 'tradfi'))
              )}
            </tbody>
          </table>

          {/* Mobile Card View */}
          <div className="md:hidden p-4 space-y-4">
            {tradFiError ? (
              <div className="text-center py-8 text-red-500">{tradFiError}</div>
            ) : filteredAndSortedTradFi.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No assets found matching your search.
              </div>
            ) : (
              filteredAndSortedTradFi.map(asset => renderMobileCard(asset, 'tradfi'))
            )}
          </div>
        </div>
      </div>

      {/* Decentralized Markets Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Decentralized Markets
          </h2>
          
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search cryptocurrencies..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {/* Desktop Table View */}
          <table className="hidden md:table w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                {renderTableHeader('asset', 'Asset', 'defi')}
                {renderTableHeader('spot_price', 'Price', 'defi')}
                {renderTableHeader('asset', '24h Change', 'defi')}
                {renderTableHeader('asset', '24h Volume', 'defi')}
                {renderTableHeader('asset', 'Market Cap', 'defi')}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {deFiError ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-red-500">
                    {deFiError}
                  </td>
                </tr>
              ) : filteredAndSortedDeFi.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    No assets found matching your search.
                  </td>
                </tr>
              ) : (
                filteredAndSortedDeFi.map(asset => renderTableRow(asset, 'defi'))
              )}
            </tbody>
          </table>

          {/* Mobile Card View */}
          <div className="md:hidden p-4 space-y-4">
            {deFiError ? (
              <div className="text-center py-8 text-red-500">{deFiError}</div>
            ) : filteredAndSortedDeFi.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No assets found matching your search.
              </div>
            ) : (
              filteredAndSortedDeFi.map(asset => renderMobileCard(asset, 'defi'))
            )}
          </div>
        </div>
      </div>

      {/* Asset Detail Modal */}
      <AssetDetailModal
        isOpen={!!selectedAsset}
        onClose={() => setSelectedAsset(null)}
        asset={selectedAsset}
        assetType={selectedAssetType}
      />
    </div>
  );
};

export default MarketDashboard; 