import { useState, useEffect, useMemo } from 'react';
import { Search, TrendingUp, TrendingDown, ArrowUpDown, ArrowUp, ArrowDown, DollarSign, BarChart3, Activity, TrendingUp as TrendingUpIcon } from 'lucide-react';
import { marketDataService, StandardizedMarketData } from '../services/marketData';
import AssetDetailModal from '../components/AssetDetailModal';

const DeFiMarkets = () => {
  // State for DeFi data
  const [deFiData, setDeFiData] = useState<StandardizedMarketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for search and sorting
  const [search, setSearch] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof StandardizedMarketData | null; direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' });

  // State for modal
  const [selectedAsset, setSelectedAsset] = useState<StandardizedMarketData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch DeFi data
  useEffect(() => {
    const fetchDeFiData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch data for major crypto assets
        const assets = ['BTC', 'ETH', 'SOL', 'ADA', 'DOT', 'LINK', 'UNI', 'MATIC', 'AVAX', 'ATOM'];
        const promises = assets.map(asset => marketDataService.getMarketData(asset));
        const results = await Promise.allSettled(promises);
        
        const validResults = results
          .filter(result => result.status === 'fulfilled')
          .map(result => (result as PromiseFulfilledResult<StandardizedMarketData>).value);
        
        setDeFiData(validResults);
      } catch (error) {
        console.error('Failed to fetch DeFi data:', error);
        setError('Failed to load decentralized market data');
      } finally {
        setLoading(false);
      }
    };

    fetchDeFiData();
    const interval = setInterval(fetchDeFiData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    let filtered = deFiData.filter(asset =>
      asset.asset.toLowerCase().includes(search.toLowerCase())
    );

    if (sortConfig.key) {
      filtered.sort((a, b) => {
        const aVal = a[sortConfig.key!];
        const bVal = b[sortConfig.key!];

        if (aVal === null || bVal === null) return 0;
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          const aLower = aVal.toLowerCase();
          const bLower = bVal.toLowerCase();
          if (aLower < bLower) return sortConfig.direction === 'asc' ? -1 : 1;
          if (aLower > bLower) return sortConfig.direction === 'asc' ? 1 : -1;
          return 0;
        }
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
          if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
          return 0;
        }
        return 0;
      });
    }

    return filtered;
  }, [deFiData, search, sortConfig]);

  // Handle sorting
  const handleSort = (key: keyof StandardizedMarketData) => {
    if (sortConfig.key === key) {
      setSortConfig({
        key,
        direction: sortConfig.direction === 'asc' ? 'desc' : 'asc'
      });
    } else {
      setSortConfig({ key, direction: 'asc' });
    }
  };

  // Handle asset selection
  const handleAssetClick = (asset: StandardizedMarketData) => {
    setSelectedAsset(asset);
    setIsModalOpen(true);
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

  // Get change display for price change stats
  const getChangeDisplay = (change: number) => {
    if (change === undefined || change === null) return { color: 'text-gray-500', icon: null };
    
    const isPositive = change >= 0;
    return {
      color: isPositive ? 'text-green-600' : 'text-red-600',
      icon: isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />
    };
  };

  // Render sort indicator
  const renderSortIndicator = (key: keyof StandardizedMarketData) => {
    if (sortConfig.key !== key) return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    return sortConfig.direction === 'asc' ? 
      <ArrowUp className="w-4 h-4 text-purple-600" /> : 
      <ArrowDown className="w-4 h-4 text-purple-600" />;
  };

  // Render table header
  const renderTableHeader = (key: keyof StandardizedMarketData, label: string) => (
    <th
      key={key}
      className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      onClick={() => handleSort(key)}
    >
      <div className="flex items-center space-x-1">
        <span>{label}</span>
        {renderSortIndicator(key)}
      </div>
    </th>
  );

  // Render table row
  const renderTableRow = (asset: StandardizedMarketData) => {
    const priceChange24h = asset.price_change_stats?.priceChange24h || 0;
    const changeDisplay = getChangeDisplay(priceChange24h);
    const volume24h = asset.price_change_stats?.volume24h || 0;
    const high24h = asset.price_change_stats?.high24h || 0;

    return (
      <tr
        key={asset.asset}
        className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
        onClick={() => handleAssetClick(asset)}
      >
        <td className="px-4 py-4 whitespace-nowrap">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center text-sm font-bold text-purple-600 dark:text-purple-400">
              {asset.asset.charAt(0)}
            </div>
            <div className="ml-3">
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                {asset.asset}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Cryptocurrency
              </div>
            </div>
          </div>
        </td>
        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
          {formatCurrency(asset.spot_price)}
        </td>
        <td className="px-4 py-4 whitespace-nowrap">
          <div className={`flex items-center space-x-1 ${changeDisplay.color}`}>
            {changeDisplay.icon}
            <span className="font-medium">
              {priceChange24h >= 0 ? '+' : ''}{priceChange24h.toFixed(2)}%
            </span>
          </div>
        </td>
        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
          {formatCurrency(volume24h)}
        </td>
        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
          {formatCurrency(asset.spot_price * 1000000)} {/* Mock market cap */}
        </td>
        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
          {formatCurrency(high24h)}
        </td>
      </tr>
    );
  };

  // Render mobile card view
  const renderMobileCard = (asset: StandardizedMarketData) => {
    const priceChange24h = asset.price_change_stats?.priceChange24h || 0;
    const changeDisplay = getChangeDisplay(priceChange24h);
    const volume24h = asset.price_change_stats?.volume24h || 0;
    const high24h = asset.price_change_stats?.high24h || 0;

    return (
      <div
        key={asset.asset}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => handleAssetClick(asset)}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center text-sm font-bold text-purple-600 dark:text-purple-400">
              {asset.asset.charAt(0)}
            </div>
            <div>
              <div className="font-medium text-gray-900 dark:text-white">
                {asset.asset}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Cryptocurrency
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-gray-900 dark:text-white">
              {formatCurrency(asset.spot_price)}
            </div>
            <div className={`flex items-center justify-end space-x-1 ${changeDisplay.color}`}>
              {changeDisplay.icon}
              <span className="text-sm">
                {priceChange24h >= 0 ? '+' : ''}{priceChange24h.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500 dark:text-gray-400">Volume:</span>
            <span className="ml-2 text-gray-900 dark:text-white">{formatVolume(volume24h)}</span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">24h High:</span>
            <span className="ml-2 text-gray-900 dark:text-white">{formatCurrency(high24h)}</span>
          </div>
        </div>
      </div>
    );
  };

  // Calculate market summary
  const marketSummary = useMemo(() => {
    if (deFiData.length === 0) return null;
    
    const totalValue = deFiData.reduce((sum, asset) => sum + (asset.spot_price || 0), 0);
    const totalVolume = deFiData.reduce((sum, asset) => sum + (asset.price_change_stats?.volume24h || 0), 0);
    const avgChange = deFiData.reduce((sum, asset) => sum + (asset.price_change_stats?.priceChange24h || 0), 0) / deFiData.length;
    
    return {
      totalValue,
      totalVolume,
      avgChange,
      assetCount: deFiData.length
    };
  }, [deFiData]);

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Decentralized Finance Markets
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Real-time cryptocurrency market data
        </p>
      </div>

      {/* Market Summary Cards */}
      {marketSummary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Total Value</h3>
              <DollarSign className="w-5 h-5 text-purple-500" />
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {formatCurrency(marketSummary.totalValue)}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Across {marketSummary.assetCount} assets
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">24h Volume</h3>
              <Activity className="w-5 h-5 text-green-500" />
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {formatVolume(marketSummary.totalVolume)}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Total trading volume
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Avg Change</h3>
              <TrendingUpIcon className="w-5 h-5 text-blue-500" />
            </div>
            <div className={`text-3xl font-bold mb-2 ${marketSummary.avgChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {marketSummary.avgChange >= 0 ? '+' : ''}{marketSummary.avgChange.toFixed(2)}%
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              24h average change
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Active Assets</h3>
              <BarChart3 className="w-5 h-5 text-orange-500" />
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {marketSummary.assetCount}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Cryptocurrencies tracked
            </div>
          </div>
        </div>
      )}

      {/* Markets Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Market Data
          </h2>
          
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search cryptocurrencies..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {/* Desktop Table View */}
          <table className="hidden md:table w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                {renderTableHeader('asset', 'Asset')}
                {renderTableHeader('spot_price', 'Price')}
                {renderTableHeader('asset', '24h Change')}
                {renderTableHeader('asset', '24h Volume')}
                {renderTableHeader('asset', 'Market Cap')}
                {renderTableHeader('asset', '24h High')}
                {renderTableHeader('asset', '24h Low')}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                    <div className="mt-2">Loading decentralized market data...</div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-red-500">
                    {error}
                  </td>
                </tr>
              ) : filteredAndSortedData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    No assets found matching your search.
                  </td>
                </tr>
              ) : (
                filteredAndSortedData.map(asset => renderTableRow(asset))
              )}
            </tbody>
          </table>

          {/* Mobile Card View */}
          <div className="md:hidden p-4 space-y-4">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                <div className="mt-2 text-gray-500 dark:text-gray-400">Loading...</div>
              </div>
            ) : error ? (
              <div className="text-center py-8 text-red-500">{error}</div>
            ) : filteredAndSortedData.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No assets found matching your search.
              </div>
            ) : (
              filteredAndSortedData.map(asset => renderMobileCard(asset))
            )}
          </div>
        </div>
      </div>

      {/* Asset Detail Modal */}
      <AssetDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        asset={selectedAsset}
        assetType="defi"
      />
    </div>
  );
};

export default DeFiMarkets; 