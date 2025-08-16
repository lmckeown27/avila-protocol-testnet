import { useEffect, useState, useMemo } from 'react';
import { Search, TrendingUp, TrendingDown, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { tradFiDataService, TradFiAsset } from '../services/tradfiData';
import { marketDataService } from '../services/marketData';
import AssetDetailModal from './AssetDetailModal';

const MarketDashboard = () => {
  // State for Stock Market data
  const [stockData, setStockData] = useState<TradFiAsset[]>([]);
  const [stockError, setStockError] = useState<string | null>(null);
  const [stockSortConfig, setStockSortConfig] = useState<{ key: keyof TradFiAsset; direction: 'asc' | 'desc' } | null>(null);

  // State for Digital Assets data
  const [digitalAssetsData, setDigitalAssetsData] = useState<any[]>([]);
  const [digitalAssetsError, setDigitalAssetsError] = useState<string | null>(null);
  const [digitalAssetsSortConfig, setDigitalAssetsSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  // State for search and modal
  const [search, setSearch] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<TradFiAsset | any | null>(null);
  const [selectedAssetType, setSelectedAssetType] = useState<'stock' | 'etf' | 'crypto' | 'defi' | null>(null);

  // Fetch data on component mount
  useEffect(() => {
    const fetchStockData = async () => {
      try {
        const data = await tradFiDataService.getStockMarketOverview();
        setStockData(data.assets);
      } catch (error) {
        console.error('Failed to fetch Stock Market data:', error);
        setStockError('Failed to load Stock Market data.');
      }
    };

    const fetchDigitalAssetsData = async () => {
      try {
        const results = await Promise.allSettled([
          marketDataService.getDigitalAssetsOverview(),
        ]);
        const validResults = results
          .filter((result) => result.status === 'fulfilled')
          .map((result) => (result as PromiseFulfilledResult<any>).value);
        
        setDigitalAssetsData(validResults);
      } catch (error) {
        console.error('Failed to fetch Digital Assets data:', error);
        setDigitalAssetsError('Failed to load Digital Assets data.');
      }
    };

    fetchStockData();
    fetchDigitalAssetsData();

    const interval = setInterval(() => {
      fetchStockData();
      fetchDigitalAssetsData();
    }, 60000); // Refresh every 60 seconds

    return () => clearInterval(interval);
  }, []);

  // Filter and sort Stock Market data
  const filteredAndSortedStock = useMemo(() => {
    let filtered = stockData.filter(asset =>
      asset.symbol.toLowerCase().includes(search.toLowerCase()) ||
      asset.name.toLowerCase().includes(search.toLowerCase())
    );

    if (stockSortConfig) {
      filtered.sort((a, b) => {
        const aVal = a[stockSortConfig.key];
        const bVal = b[stockSortConfig.key];

        if (aVal === null || bVal === null) return 0;
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          const aLower = aVal.toLowerCase();
          const bLower = bVal.toLowerCase();
          if (aLower < bLower) return stockSortConfig.direction === 'asc' ? -1 : 1;
          if (aLower > bLower) return stockSortConfig.direction === 'asc' ? 1 : -1;
          return 0;
        }
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          if (aVal < bVal) return stockSortConfig.direction === 'asc' ? -1 : 1;
          if (aVal > bVal) return stockSortConfig.direction === 'asc' ? 1 : -1;
          return 0;
        }
        return 0;
      });
    }

    return filtered;
  }, [stockData, search, stockSortConfig]);

  // Filter and sort Digital Assets data
  const filteredAndSortedDigitalAssets = useMemo(() => {
    let filtered = digitalAssetsData.filter(asset =>
      asset.symbol?.toLowerCase().includes(search.toLowerCase()) ||
      asset.name?.toLowerCase().includes(search.toLowerCase())
    );

    if (digitalAssetsSortConfig) {
      filtered.sort((a, b) => {
        const aVal = a[digitalAssetsSortConfig.key];
        const bVal = b[digitalAssetsSortConfig.key];

        if (aVal === null || bVal === null) return 0;
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          const aLower = aVal.toLowerCase();
          const bLower = bVal.toLowerCase();
          if (aLower < bLower) return digitalAssetsSortConfig.direction === 'asc' ? -1 : 1;
          if (aLower > bLower) return digitalAssetsSortConfig.direction === 'asc' ? 1 : -1;
          return 0;
        }
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          if (aVal < bVal) return digitalAssetsSortConfig.direction === 'asc' ? -1 : 1;
          if (aVal > bVal) return digitalAssetsSortConfig.direction === 'asc' ? 1 : -1;
          return 0;
        }
        return 0;
      });
    }

    return filtered;
  }, [digitalAssetsData, search, digitalAssetsSortConfig]);

  // Handle sorting
  const handleSort = (key: keyof TradFiAsset | string, type: 'stock' | 'crypto' | 'defi') => {
    if (type === 'stock') {
      const currentConfig = stockSortConfig;
      if (currentConfig?.key === key) {
        setStockSortConfig({
          key: key as keyof TradFiAsset,
          direction: currentConfig.direction === 'asc' ? 'desc' : 'asc'
        });
      } else {
        setStockSortConfig({ key: key as keyof TradFiAsset, direction: 'asc' });
      }
    } else if (type === 'crypto') {
      const currentConfig = digitalAssetsSortConfig;
      if (currentConfig?.key === key) {
        setDigitalAssetsSortConfig({
          key: key as string,
          direction: currentConfig.direction === 'asc' ? 'desc' : 'asc'
        });
      } else {
        setDigitalAssetsSortConfig({ key: key as string, direction: 'asc' });
      }
    }
  };

  // Handle asset selection
  const handleAssetClick = (asset: TradFiAsset | any, type: 'stock' | 'crypto' | 'defi') => {
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
  const renderSortIndicator = (key: keyof TradFiAsset | string, type: 'stock' | 'crypto' | 'defi') => {
    const config = type === 'stock' ? stockSortConfig : digitalAssetsSortConfig;
    if (!config || config.key !== key) return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    return config.direction === 'asc' ? 
      <ArrowUp className="w-4 h-4 text-blue-600" /> : 
      <ArrowDown className="w-4 h-4 text-blue-600" />;
  };

  // Render table header
  const renderTableHeader = (key: keyof TradFiAsset | string, label: string, type: 'stock' | 'crypto' | 'defi') => (
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
  const renderTableRow = (asset: TradFiAsset | any, type: 'stock' | 'crypto' | 'defi') => {
    const changeDisplay = getChangeDisplay(
      'change' in asset ? asset.change : 0, 
      'changePercent' in asset ? asset.changePercent : 0
    );
    const currentPrice = 'price' in asset ? asset.price : asset.spot_price;
    const changePercent = 'changePercent' in asset ? asset.changePercent : 0;
    const marketCap = 'marketCap' in asset ? asset.marketCap : 0;
    const assetKey = 'symbol' in asset ? asset.symbol : asset.asset;

    return (
      <tr
        key={assetKey}
        className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
        onClick={() => handleAssetClick(asset, type)}
      >
        <td className="px-4 py-4 whitespace-nowrap">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center text-sm font-bold text-blue-600 dark:text-blue-400">
              {assetKey.charAt(0)}
            </div>
            <div className="ml-3">
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                {assetKey}
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
          {formatVolume(marketCap)}
        </td>
        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
          {formatCurrency(marketCap)}
        </td>
      </tr>
    );
  };

  // Render mobile card view
  const renderMobileCard = (asset: TradFiAsset | any, type: 'stock' | 'crypto' | 'defi') => {
    const changeDisplay = getChangeDisplay(
      'change' in asset ? asset.change : 0, 
      'changePercent' in asset ? asset.changePercent : 0
    );
    const currentPrice = 'price' in asset ? asset.price : asset.spot_price;
    const changePercent = 'changePercent' in asset ? asset.changePercent : 0;
    const marketCap = 'marketCap' in asset ? asset.marketCap : 0;
    const assetKey = 'symbol' in asset ? asset.symbol : asset.asset;

    return (
      <div
        key={assetKey}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => handleAssetClick(asset, type)}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center text-sm font-bold text-blue-600 dark:text-blue-400">
              {assetKey.charAt(0)}
            </div>
            <div>
              <div className="font-medium text-gray-900 dark:text-white">
                {assetKey}
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
              <div className="text-right">
                <div className="text-sm">
                  {changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 gap-4 text-sm">
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
                {renderTableHeader('symbol', 'Asset', 'stock')}
                {renderTableHeader('price', 'Price', 'stock')}
                {renderTableHeader('change', '24h Change', 'stock')}
                {renderTableHeader('volume', '24h Volume', 'stock')}
                {renderTableHeader('marketCap', 'Market Cap', 'stock')}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {stockError ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-red-500">
                    {stockError}
                  </td>
                </tr>
              ) : filteredAndSortedStock.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    No assets found matching your search.
                  </td>
                </tr>
              ) : (
                filteredAndSortedStock.map(asset => renderTableRow(asset, 'stock'))
              )}
            </tbody>
          </table>

          {/* Mobile Card View */}
          <div className="md:hidden p-4 space-y-4">
            {stockError ? (
              <div className="text-center py-8 text-red-500">{stockError}</div>
            ) : filteredAndSortedStock.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No assets found matching your search.
              </div>
            ) : (
              filteredAndSortedStock.map(asset => renderMobileCard(asset, 'stock'))
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
                {renderTableHeader('symbol', 'Asset', 'crypto')}
                {renderTableHeader('spot_price', 'Price', 'crypto')}
                {renderTableHeader('change', '24h Change', 'crypto')}
                {renderTableHeader('volume', '24h Volume', 'crypto')}
                {renderTableHeader('marketCap', 'Market Cap', 'crypto')}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {digitalAssetsError ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-red-500">
                    {digitalAssetsError}
                  </td>
                </tr>
              ) : filteredAndSortedDigitalAssets.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    No assets found matching your search.
                  </td>
                </tr>
              ) : (
                filteredAndSortedDigitalAssets.map(asset => renderTableRow(asset, 'crypto'))
              )}
            </tbody>
          </table>

          {/* Mobile Card View */}
          <div className="md:hidden p-4 space-y-4">
            {digitalAssetsError ? (
              <div className="text-center py-8 text-red-500">{digitalAssetsError}</div>
            ) : filteredAndSortedDigitalAssets.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No assets found matching your search.
              </div>
            ) : (
              filteredAndSortedDigitalAssets.map(asset => renderMobileCard(asset, 'crypto'))
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