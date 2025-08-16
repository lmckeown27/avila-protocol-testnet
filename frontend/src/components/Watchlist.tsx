import { useState, useEffect } from 'react';
import { Plus, Trash2, Star, StarOff } from 'lucide-react';
import { Watchlist as WatchlistType, WatchlistItem } from '../lib/types';
import { backendMarketDataService, NormalizedAsset } from '../services/backendMarketData';

const Watchlist = () => {
  // State for watchlists
  const [watchlists, setWatchlists] = useState<WatchlistType[]>([]);
  const [selectedWatchlist, setSelectedWatchlist] = useState<WatchlistType | null>(null);
  const [isCreatingWatchlist, setIsCreatingWatchlist] = useState(false);

  
  // State for new/edit watchlist
  const [newWatchlistName, setNewWatchlistName] = useState('');
  const [newWatchlistDescription, setNewWatchlistDescription] = useState('');
  
  // State for adding assets
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NormalizedAsset[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedAssetType, setSelectedAssetType] = useState<'tradfi' | 'defi'>('tradfi');
  
  // State for watchlist data
  const [watchlistData, setWatchlistData] = useState<Record<string, NormalizedAsset[]>>({});
  const [loading, setLoading] = useState(false);

  // Load watchlists from localStorage on component mount
  useEffect(() => {
    const savedWatchlists = localStorage.getItem('avila-watchlists');
    if (savedWatchlists) {
      try {
        const parsed = JSON.parse(savedWatchlists);
        setWatchlists(parsed);
        if (parsed.length > 0) {
          setSelectedWatchlist(parsed[0]);
        }
      } catch (error) {
        console.error('Failed to parse saved watchlists:', error);
      }
    }
  }, []);

  // Save watchlists to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('avila-watchlists', JSON.stringify(watchlists));
  }, [watchlists]);

  // Load market data for watchlist items
  useEffect(() => {
    if (selectedWatchlist && selectedWatchlist.items.length > 0) {
      loadWatchlistData();
    }
  }, [selectedWatchlist]);

  const loadWatchlistData = async () => {
    if (!selectedWatchlist) return;
    
    setLoading(true);
    try {
      const data: Record<string, NormalizedAsset[]> = {};
      
      // Group items by type
      const tradfiItems = selectedWatchlist.items.filter(item => item.type === 'tradfi');
      const defiItems = selectedWatchlist.items.filter(item => item.type === 'defi');
      
      // Fetch TradFi data
      if (tradfiItems.length > 0) {
              const tradfiData = await backendMarketDataService.getStockData();
      const tradfiMap = new Map(tradfiData.map(asset => [asset.symbol, asset]));
        data.tradfi = tradfiItems
          .map(item => tradfiMap.get(item.symbol))
          .filter(Boolean) as NormalizedAsset[];
      }
      
      // Fetch DeFi data
      if (defiItems.length > 0) {
              const defiData = await backendMarketDataService.getDigitalAssetsData();
      const defiMap = new Map(defiData.map((asset: any) => [asset.symbol, asset]));
        data.defi = defiItems
          .map(item => defiMap.get(item.symbol))
          .filter(Boolean) as NormalizedAsset[];
      }
      
      setWatchlistData(data);
    } catch (error) {
      console.error('Failed to load watchlist data:', error);
    } finally {
      setLoading(false);
    }
  };

  const createWatchlist = () => {
    if (!newWatchlistName.trim()) return;
    
    const newWatchlist: WatchlistType = {
      id: Date.now().toString(),
      name: newWatchlistName.trim(),
      description: newWatchlistDescription.trim() || undefined,
      items: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    setWatchlists(prev => [...prev, newWatchlist]);
    setSelectedWatchlist(newWatchlist);
    setIsCreatingWatchlist(false);
    setNewWatchlistName('');
    setNewWatchlistDescription('');
  };

  const deleteWatchlist = (watchlistId: string) => {
    setWatchlists(prev => prev.filter(w => w.id !== watchlistId));
    if (selectedWatchlist?.id === watchlistId) {
      setSelectedWatchlist(watchlists.find(w => w.id !== watchlistId) || null);
    }
  };

  const addAssetToWatchlist = (asset: NormalizedAsset, type: 'tradfi' | 'defi') => {
    if (!selectedWatchlist) return;
    
    const newItem: WatchlistItem = {
      id: Date.now().toString(),
      symbol: asset.symbol,
              name: asset.asset,
      type,
      addedAt: new Date()
    };
    
    const updatedWatchlist = {
      ...selectedWatchlist,
      items: [...selectedWatchlist.items, newItem],
      updatedAt: new Date()
    };
    
    setWatchlists(prev => prev.map(w => 
      w.id === selectedWatchlist.id ? updatedWatchlist : w
    ));
    setSelectedWatchlist(updatedWatchlist);
    setSearchQuery('');
    setSearchResults([]);
  };

  const removeAssetFromWatchlist = (itemId: string) => {
    if (!selectedWatchlist) return;
    
    const updatedWatchlist = {
      ...selectedWatchlist,
      items: selectedWatchlist.items.filter(item => item.id !== itemId),
      updatedAt: new Date()
    };
    
    setWatchlists(prev => prev.map(w => 
      w.id === selectedWatchlist.id ? updatedWatchlist : w
    ));
    setSelectedWatchlist(updatedWatchlist);
  };

  const searchAssets = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    try {
      let results: NormalizedAsset[] = [];
      
      if (selectedAssetType === 'tradfi') {
        const tradfiData = await backendMarketDataService.getStockData();
        results = tradfiData.filter((asset: any) => 
          asset.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
          asset.asset.toLowerCase().includes(searchQuery.toLowerCase())
        );
      } else {
        const defiData = await backendMarketDataService.getDigitalAssetsData();
        results = defiData.filter((asset: any) => 
          asset.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
          asset.asset.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
      
      // Filter out assets already in the watchlist
      const existingSymbols = new Set(selectedWatchlist?.items.map(item => item.symbol) || []);
      results = results.filter(asset => !existingSymbols.has(asset.symbol));
      
      setSearchResults(results.slice(0, 10)); // Limit to 10 results
    } catch (error) {
      console.error('Failed to search assets:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const formatCurrency = (value: number) => {
    if (value === 0) return '$0.00';
    if (value < 1) return `$${value.toFixed(4)}`;
    if (value < 1000) return `$${value.toFixed(2)}`;
    if (value < 1000000) return `$${(value / 1000).toFixed(2)}K`;
    if (value < 1000000000) return `$${(value / 1000000).toFixed(2)}M`;
    return `$${(value / 1000000000).toFixed(2)}B`;
  };

  const getChangeDisplay = (change: number) => {
    if (change === undefined || change === null) return { color: 'text-gray-500', icon: null };
    
    const isPositive = change >= 0;
    return {
      color: isPositive ? 'text-green-600' : 'text-red-600',
      icon: isPositive ? <Star className="w-4 h-4" /> : <StarOff className="w-4 h-4" />
    };
  };

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Market Watchlists
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Create and manage custom watchlists for TradFi and DeFi assets
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Watchlists Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          {/* Create New Watchlist */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Watchlists
            </h3>
            
            {!isCreatingWatchlist ? (
              <button
                onClick={() => setIsCreatingWatchlist(true)}
                className="w-full flex items-center justify-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Watchlist</span>
              </button>
            ) : (
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Watchlist name"
                  value={newWatchlistName}
                  onChange={(e) => setNewWatchlistName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <input
                  type="text"
                  placeholder="Description (optional)"
                  value={newWatchlistDescription}
                  onChange={(e) => setNewWatchlistDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <div className="flex space-x-2">
                  <button
                    onClick={createWatchlist}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg transition-colors"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => {
                      setIsCreatingWatchlist(false);
                      setNewWatchlistName('');
                      setNewWatchlistDescription('');
                    }}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Watchlist List */}
          <div className="space-y-2">
            {watchlists.map(watchlist => (
              <div
                key={watchlist.id}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedWatchlist?.id === watchlist.id
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
                onClick={() => setSelectedWatchlist(watchlist)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {watchlist.name}
                    </h4>
                    {watchlist.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {watchlist.description}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {watchlist.items.length} assets
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteWatchlist(watchlist.id);
                    }}
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Watchlist Content */}
        <div className="lg:col-span-2 space-y-6">
          {selectedWatchlist ? (
            <>
              {/* Watchlist Header */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {selectedWatchlist.name}
                    </h2>
                    {selectedWatchlist.description && (
                      <p className="text-gray-600 dark:text-gray-400">
                        {selectedWatchlist.description}
                      </p>
                    )}
                    <p className="text-sm text-gray-500 dark:text-gray-500">
                      Created {selectedWatchlist.createdAt.toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-purple-600">
                      {selectedWatchlist.items.length}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Assets</p>
                  </div>
                </div>

                {/* Add Asset Section */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    Add Asset
                  </h3>
                  
                  <div className="flex space-x-2 mb-3">
                    <button
                      onClick={() => setSelectedAssetType('tradfi')}
                      className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                        selectedAssetType === 'tradfi'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      TradFi
                    </button>
                    <button
                      onClick={() => setSelectedAssetType('defi')}
                      className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                        selectedAssetType === 'defi'
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      DeFi
                    </button>
                  </div>
                  
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      placeholder={`Search ${selectedAssetType === 'tradfi' ? 'stocks' : 'cryptocurrencies'}...`}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <button
                      onClick={searchAssets}
                      disabled={isSearching}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {isSearching ? 'Searching...' : 'Search'}
                    </button>
                  </div>
                  
                  {/* Search Results */}
                  {searchResults.length > 0 && (
                    <div className="mt-3 max-h-48 overflow-y-auto">
                      {searchResults.map(asset => (
                        <div
                          key={asset.symbol}
                          className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg"
                        >
                          <div>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {asset.symbol}
                            </span>
                            <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                              {asset.asset}
                            </span>
                          </div>
                          <button
                            onClick={() => addAssetToWatchlist(asset, selectedAssetType)}
                            className="text-purple-600 hover:text-purple-700 p-1"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Watchlist Assets */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Watchlist Assets
                  </h3>
                </div>
                
                <div className="overflow-x-auto">
                  <div className="max-h-96 overflow-y-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-10">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Asset
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Type
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Price
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            24h Change
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Market Cap
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {loading ? (
                          <tr>
                            <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                              <div className="mt-2">Loading watchlist data...</div>
                            </td>
                          </tr>
                        ) : selectedWatchlist.items.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                              No assets in this watchlist yet. Add some assets to get started!
                            </td>
                          </tr>
                        ) : (
                          selectedWatchlist.items.map(item => {
                            const assetData = watchlistData[item.type]?.find(
                              asset => asset.symbol === item.symbol
                            );
                            
                            if (!assetData) {
                              return (
                                <tr key={item.id}>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                      <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center text-sm font-bold text-gray-600 dark:text-gray-400">
                                        {item.symbol.charAt(0)}
                                      </div>
                                      <div className="ml-3">
                                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                                          {item.symbol}
                                        </div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                          {item.name}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                      item.type === 'tradfi' 
                                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                        : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                                    }`}>
                                      {item.type === 'tradfi' ? 'TradFi' : 'DeFi'}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                    Loading...
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                    Loading...
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                    Loading...
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    <button
                                      onClick={() => removeAssetFromWatchlist(item.id)}
                                      className="text-red-600 hover:text-red-900 p-1"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            }
                            
                            const changeDisplay = getChangeDisplay(assetData.change24h);
                            
                            return (
                              <tr key={item.id}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center text-sm font-bold text-purple-600 dark:text-purple-400">
                                      {item.symbol.charAt(0)}
                                    </div>
                                    <div className="ml-3">
                                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                                        {item.symbol}
                                      </div>
                                      <div className="text-sm text-gray-500 dark:text-gray-400">
                                        {assetData.asset}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    item.type === 'tradfi' 
                                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                      : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                                  }`}>
                                    {item.type === 'tradfi' ? 'TradFi' : 'DeFi'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                  {formatCurrency(assetData.price)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className={`flex items-center space-x-1 ${changeDisplay.color}`}>
                                    {changeDisplay.icon}
                                    <span className="font-medium">
                                      {assetData.change24h >= 0 ? '+' : ''}{assetData.change24h.toFixed(2)}%
                                    </span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                  {formatCurrency(assetData.marketCap)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                  <button
                                    onClick={() => removeAssetFromWatchlist(item.id)}
                                    className="text-red-600 hover:text-red-900 p-1"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
              <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No Watchlist Selected
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Create a new watchlist or select an existing one to get started
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Watchlist; 