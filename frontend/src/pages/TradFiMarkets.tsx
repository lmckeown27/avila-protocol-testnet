import { useState, useEffect, useMemo } from 'react';
import { Search, TrendingUp, TrendingDown, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { backendMarketDataService, NormalizedAsset } from '../services/backendMarketData';
import AssetDetailModal from '../components/AssetDetailModal';

const TradFiMarkets = () => {
  // State for TradFi data
  const [tradFiData, setTradFiData] = useState<NormalizedAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for search and sorting
  const [search, setSearch] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof NormalizedAsset | null; direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' });

  // State for modal
  const [selectedAsset, setSelectedAsset] = useState<NormalizedAsset | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch TradFi data from backend
  useEffect(() => {
    const fetchTradFiData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // First get basic TradFi data
        const basicData = await backendMarketDataService.getStockData();
        
        // Then enhance each asset with P/E data
        const enhancedData = await Promise.all(
          basicData.map(async (asset) => {
            try {
              const enhancedData = await backendMarketDataService.getEnhancedMarketData(asset.symbol);
              return {
                ...asset,
                pe: enhancedData.pe
              };
            } catch (error) {
              console.warn(`Failed to fetch enhanced data for ${asset.symbol}:`, error);
              return asset; // Return basic data if enhanced fetch fails
            }
          })
        );
        
        setTradFiData(enhancedData);
      } catch (error) {
        console.error('Failed to fetch TradFi data from backend:', error);
        setError('Failed to load traditional market data from backend');
      } finally {
        setLoading(false);
      }
    };

    fetchTradFiData();
    const interval = setInterval(fetchTradFiData, 300000); // Refresh every 5 minutes (enhanced data is slower)
    return () => clearInterval(interval);
  }, []);

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    let filtered = tradFiData.filter(asset =>
      asset.symbol.toLowerCase().includes(search.toLowerCase()) ||
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
  }, [tradFiData, search, sortConfig]);

  // Handle sorting
  const handleSort = (key: keyof NormalizedAsset) => {
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
  const handleAssetClick = (asset: NormalizedAsset) => {
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
  const renderSortIndicator = (key: keyof NormalizedAsset) => {
    if (sortConfig.key !== key) return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    return sortConfig.direction === 'asc' ? 
      <ArrowUp className="w-4 h-4 text-blue-600" /> : 
      <ArrowDown className="w-4 h-4 text-blue-600" />;
  };

  // Render table header
  const renderTableHeader = (key: keyof NormalizedAsset, label: string) => (
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
  const renderTableRow = (asset: NormalizedAsset) => {
    const changeDisplay = getChangeDisplay(asset.change24h, asset.change24h);

    return (
      <tr
        key={asset.symbol}
        className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
        onClick={() => handleAssetClick(asset)}
      >
        <td className="px-4 py-4 whitespace-nowrap">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center text-sm font-bold text-blue-600 dark:text-blue-400">
              {asset.symbol.charAt(0)}
            </div>
            <div className="ml-3">
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                {asset.symbol}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {asset.asset}
              </div>
            </div>
          </div>
        </td>
        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
          {formatCurrency(asset.price)}
        </td>
        <td className="px-4 py-4 whitespace-nowrap">
                      <div className={`flex items-center space-x-1 ${changeDisplay.color}`}>
              {changeDisplay.icon}
              <div className="text-right">
                <div className="font-medium">
                  {asset.change24h >= 0 ? '+' : ''}{asset.change24h.toFixed(2)}%
                </div>
              </div>
            </div>
        </td>

        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
          {formatCurrency(asset.marketCap)}
        </td>
        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
          {asset.pe ? asset.pe.toFixed(2) : 'N/A'}
        </td>
        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
          {formatCurrency(asset.high24h)}
        </td>
        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
          {formatCurrency(asset.low24h)}
        </td>
      </tr>
    );
  };

  // Render mobile card view
  const renderMobileCard = (asset: NormalizedAsset) => {
    const changeDisplay = getChangeDisplay(asset.change24h, asset.change24h);

    return (
      <div
        key={asset.symbol}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => handleAssetClick(asset)}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center text-sm font-bold text-blue-600 dark:text-blue-400">
              {asset.symbol.charAt(0)}
            </div>
            <div>
              <div className="font-medium text-gray-900 dark:text-white">
                {asset.symbol}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {asset.asset}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-gray-900 dark:text-white">
              {formatCurrency(asset.price)}
            </div>
            <div className={`flex items-center justify-end space-x-1 ${changeDisplay.color}`}>
              {changeDisplay.icon}
              <div className="text-right">
                <div className="text-sm">
                  {asset.change24h >= 0 ? '+' : ''}{asset.change24h.toFixed(2)}%
                </div>

              </div>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 gap-4 text-sm">
          <div>
            <span className="text-gray-500 dark:text-gray-400">Market Cap:</span>
            <span className="ml-2 text-gray-900 dark:text-white">{formatCurrency(asset.marketCap)}</span>
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
          Stock Market
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Monitor stock market data with real-time pricing, P/E ratios, and market analytics
        </p>
      </div>



      {/* Markets Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Market Data (Free Tier)
          </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Displaying real-time price, market cap, P/E ratios, and daily ranges. Enhanced data for comprehensive market insights.
        </p>
          
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
            <input
              type="text"
              placeholder="Search stocks and ETFs by symbol or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {/* Desktop Table View */}
          <div className="hidden md:block max-h-96 overflow-y-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-10">
                <tr>
                  {renderTableHeader('symbol', 'Asset')}
                  {renderTableHeader('price', 'Price')}
                  {renderTableHeader('change24h', '24h Change')}
                  {renderTableHeader('marketCap', 'Market Cap')}
                  {renderTableHeader('pe', 'P/E Ratio')}
                  {renderTableHeader('high24h', 'Day High')}
                  {renderTableHeader('low24h', 'Day Low')}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      <div className="mt-2">Loading traditional market data...</div>
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
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden max-h-96 overflow-y-auto p-4 space-y-4">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
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
        assetType="tradfi"
      />
    </div>
  );
};

export default TradFiMarkets; 