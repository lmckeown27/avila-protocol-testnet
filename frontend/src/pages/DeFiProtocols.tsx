import { useState, useEffect, useMemo } from 'react';
import { Search, TrendingUp, TrendingDown, ArrowUpDown, ArrowUp, ArrowDown, DollarSign, Activity, Tag } from 'lucide-react';
import { backendMarketDataService } from '../services/backendMarketData';

interface DeFiProtocol {
  name: string;
  symbol: string;
  tvl: number;
  change1h: number;
  change1d: number;
  change7d: number;
  chains: string[];
  category: string;
}

const DeFiProtocols = () => {
  // State for DeFi protocol data
  const [protocols, setProtocols] = useState<DeFiProtocol[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for search and sorting
  const [search, setSearch] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof DeFiProtocol | null; direction: 'asc' | 'desc' }>({ key: 'tvl', direction: 'desc' });

  // Fetch DeFi protocol data from backend
  useEffect(() => {
    const fetchProtocols = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await backendMarketDataService.getDeFiProtocols();
        setProtocols(data);
      } catch (error) {
        console.error('Failed to fetch DeFi protocols from backend:', error);
        setError('Failed to load DeFi protocol data from backend');
      } finally {
        setLoading(false);
      }
    };

    fetchProtocols();
    const interval = setInterval(fetchProtocols, 300000); // Refresh every 5 minutes
    return () => clearInterval(interval);
  }, []);

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    let filtered = protocols.filter(protocol =>
      protocol.name.toLowerCase().includes(search.toLowerCase()) ||
      protocol.symbol.toLowerCase().includes(search.toLowerCase()) ||
      protocol.category.toLowerCase().includes(search.toLowerCase())
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
  }, [protocols, search, sortConfig]);

  // Handle sorting
  const handleSort = (key: keyof DeFiProtocol) => {
    if (sortConfig.key === key) {
      setSortConfig({
        key,
        direction: sortConfig.direction === 'asc' ? 'desc' : 'asc'
      });
    } else {
      setSortConfig({ key, direction: 'asc' });
    }
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

  // Format percentage change
  const formatChange = (value: number) => {
    if (value === 0) return '0.00%';
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  // Get change color and icon
  const getChangeDisplay = (change: number) => {
    if (change === 0) return { color: 'text-gray-500', icon: null };
    
    const isPositive = change >= 0;
    return {
      color: isPositive ? 'text-green-600' : 'text-red-600',
      icon: isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />
    };
  };

  // Render sort indicator
  const renderSortIndicator = (key: keyof DeFiProtocol) => {
    if (sortConfig.key !== key) return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    return sortConfig.direction === 'asc' ? 
      <ArrowUp className="w-4 h-4 text-blue-600" /> : 
      <ArrowDown className="w-4 h-4 text-blue-600" />;
  };

  // Render table header
  const renderTableHeader = (key: keyof DeFiProtocol, label: string) => (
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
  const renderTableRow = (protocol: DeFiProtocol) => {
    const change1dDisplay = getChangeDisplay(protocol.change1d);

    return (
      <tr
        key={protocol.symbol}
        className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        <td className="px-4 py-4 whitespace-nowrap">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center text-sm font-bold text-indigo-600 dark:text-indigo-400">
              {protocol.symbol.charAt(0)}
            </div>
            <div className="ml-3">
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                {protocol.name}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {protocol.symbol}
              </div>
            </div>
          </div>
        </td>
        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
          {formatCurrency(protocol.tvl)}
        </td>
        <td className="px-4 py-4 whitespace-nowrap">
          <div className={`flex items-center space-x-1 ${change1dDisplay.color}`}>
            {change1dDisplay.icon}
            <span className="font-medium">
              {formatChange(protocol.change1d)}
            </span>
          </div>
        </td>
        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
          {formatChange(protocol.change7d)}
        </td>
        <td className="px-4 py-4 whitespace-nowrap">
          <div className="flex flex-wrap gap-1">
            {protocol.chains.slice(0, 3).map((chain, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
              >
                {chain}
              </span>
            ))}
            {protocol.chains.length > 3 && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                +{protocol.chains.length - 3}
              </span>
            )}
          </div>
        </td>
        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
            {protocol.category}
          </span>
        </td>
      </tr>
    );
  };

  // Calculate protocol summary
  const protocolSummary = useMemo(() => {
    if (protocols.length === 0) return null;
    
    const totalTVL = protocols.reduce((sum, protocol) => sum + protocol.tvl, 0);
    const avgChange1d = protocols.reduce((sum, protocol) => sum + protocol.change1d, 0) / protocols.length;
    const avgChange7d = protocols.reduce((sum, protocol) => sum + protocol.change7d, 0) / protocols.length;
    
    // Count protocols by category
    const categoryCounts = protocols.reduce((acc, protocol) => {
      acc[protocol.category] = (acc[protocol.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const topCategory = Object.entries(categoryCounts).sort(([,a], [,b]) => b - a)[0];
    
    return {
      totalTVL,
      avgChange1d,
      avgChange7d,
      protocolCount: protocols.length,
      topCategory: topCategory ? `${topCategory[0]} (${topCategory[1]})` : 'N/A'
    };
  }, [protocols]);

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          DeFi Protocols
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Top DeFi protocols by Total Value Locked (TVL) with real-time metrics
        </p>
      </div>

      {/* Protocol Summary Cards */}
      {protocolSummary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Total TVL</h3>
              <DollarSign className="w-5 h-5 text-indigo-500" />
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {formatCurrency(protocolSummary.totalTVL)}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Across {protocolSummary.protocolCount} protocols
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">24h Change</h3>
              <Activity className="w-5 h-5 text-green-500" />
            </div>
            <div className={`text-3xl font-bold mb-2 ${protocolSummary.avgChange1d >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatChange(protocolSummary.avgChange1d)}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Average daily change
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">7d Change</h3>
              <TrendingUp className="w-5 h-5 text-blue-500" />
            </div>
            <div className={`text-3xl font-bold mb-2 ${protocolSummary.avgChange7d >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatChange(protocolSummary.avgChange7d)}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Weekly average change
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Top Category</h3>
              <Tag className="w-5 h-5 text-purple-500" />
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {protocolSummary.topCategory.split(' (')[0]}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Most popular protocol type
            </div>
          </div>
        </div>
      )}

      {/* Protocols Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Protocol Rankings
          </h2>
          
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search protocols by name, symbol, or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {/* Desktop Table View */}
          <table className="hidden md:table w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                {renderTableHeader('name', 'Protocol')}
                {renderTableHeader('tvl', 'TVL')}
                {renderTableHeader('change1d', '24h Change')}
                {renderTableHeader('change7d', '7d Change')}
                {renderTableHeader('chains', 'Chains')}
                {renderTableHeader('category', 'Category')}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                    <div className="mt-2">Loading DeFi protocol data...</div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-red-500">
                    {error}
                  </td>
                </tr>
              ) : filteredAndSortedData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    No protocols found matching your search.
                  </td>
                </tr>
              ) : (
                filteredAndSortedData.map(protocol => renderTableRow(protocol))
              )}
            </tbody>
          </table>

          {/* Mobile Card View */}
          <div className="md:hidden p-4 space-y-4">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                <div className="mt-2 text-gray-500 dark:text-gray-400">Loading...</div>
              </div>
            ) : error ? (
              <div className="text-center py-8 text-red-500">{error}</div>
            ) : filteredAndSortedData.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No protocols found matching your search.
              </div>
            ) : (
              filteredAndSortedData.map(protocol => (
                <div
                  key={protocol.symbol}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center text-sm font-bold text-indigo-600 dark:text-indigo-400">
                        {protocol.symbol.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {protocol.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {protocol.symbol}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-900 dark:text-white">
                        {formatCurrency(protocol.tvl)}
                      </div>
                      <div className={`flex items-center justify-end space-x-1 ${getChangeDisplay(protocol.change1d).color}`}>
                        {getChangeDisplay(protocol.change1d).icon}
                        <span className="text-sm">
                          {formatChange(protocol.change1d)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">7d Change:</span>
                      <span className="ml-2 text-gray-900 dark:text-white">{formatChange(protocol.change7d)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Category:</span>
                      <span className="ml-2 text-gray-900 dark:text-white">{protocol.category}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Chains:</span>
                      <span className="ml-2 text-gray-900 dark:text-white">{protocol.chains.slice(0, 2).join(', ')}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeFiProtocols; 