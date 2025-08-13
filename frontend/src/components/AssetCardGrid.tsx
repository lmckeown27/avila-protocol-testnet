import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, BarChart3, Activity } from 'lucide-react';

// ============================================================================
// INTERFACES & TYPES
// ============================================================================

export interface AssetCardData {
  asset: string;
  price: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
  source: string;
  symbol?: string;
  name?: string;
  lastUpdated?: number;
}

interface AssetCardGridProps {
  assets: AssetCardData[];
  title?: string;
  subtitle?: string;
  loading?: boolean;
  emptyMessage?: string;
  onCardClick?: (asset: AssetCardData) => void;
  className?: string;
}

// ============================================================================
// ASSET CARD COMPONENT
// ============================================================================

const AssetCard: React.FC<{ 
  asset: AssetCardData; 
  index: number;
  onClick?: (asset: AssetCardData) => void;
}> = ({ asset, index, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);

  // Format currency values
  const formatCurrency = (value: number): string => {
    if (value === 0) return '$0.00';
    if (value < 1) return `$${value.toFixed(4)}`;
    if (value < 1000) return `$${value.toFixed(2)}`;
    if (value < 1000000) return `$${(value / 1000).toFixed(2)}K`;
    if (value < 1000000000) return `$${(value / 1000000).toFixed(2)}M`;
    return `$${(value / 1000000000).toFixed(2)}B`;
  };

  // Format volume values
  const formatVolume = (value: number): string => {
    if (value === 0) return '0';
    if (value < 1000) return value.toLocaleString();
    if (value < 1000000) return `${(value / 1000).toFixed(1)}K`;
    if (value < 1000000000) return `${(value / 1000000).toFixed(1)}M`;
    return `${(value / 1000000000).toFixed(1)}B`;
  };

  // Get change display properties
  const getChangeDisplay = (change: number) => {
    const isPositive = change >= 0;
    return {
      color: isPositive ? 'text-green-400' : 'text-red-400',
      icon: isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />,
      sign: isPositive ? '+' : ''
    };
  };

  // Get source color
  const getSourceColor = (source: string): string => {
    const sourceColors: { [key: string]: string } = {
      'Finnhub': 'from-blue-500 to-blue-600',
      'Polygon': 'from-purple-500 to-purple-600',
      'Alpha Vantage': 'from-green-500 to-green-600',
      'Twelve Data': 'from-orange-500 to-orange-600',
      'CoinGecko': 'from-yellow-500 to-yellow-600',
      'CoinMarketCap': 'from-red-500 to-red-600',
      'CryptoCompare': 'from-indigo-500 to-indigo-600',
      'Binance': 'from-yellow-400 to-orange-500',
      'DefiLlama': 'from-green-400 to-emerald-500',
      'Uniswap': 'from-pink-500 to-rose-500',
      'Aave': 'from-blue-400 to-cyan-500',
      'Compound': 'from-purple-400 to-violet-500',
      'Fallback': 'from-gray-500 to-gray-600'
    };
    return sourceColors[source] || 'from-gray-500 to-gray-600';
  };

  const changeDisplay = getChangeDisplay(asset.change24h);
  const sourceColor = getSourceColor(asset.source);

  return (
    <div
      className={`
        group relative bg-gradient-to-br from-slate-800 to-slate-900 
        rounded-xl p-6 cursor-pointer transition-all duration-200 ease-out
        border border-slate-700/50 hover:border-slate-600/70
        ${isHovered 
          ? 'transform -translate-y-2 scale-[1.02] shadow-2xl shadow-black/20' 
          : 'shadow-lg shadow-black/10'
        }
        animate-in fade-in slide-in-from-bottom-4
        duration-500 delay-${index * 100}
      `}
      style={{
        animationDelay: `${index * 100}ms`
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onClick?.(asset)}
      title={`${asset.name || asset.asset} - ${asset.source}`}
    >
      {/* Source Badge */}
      <div className="absolute top-3 right-3">
        <div className={`
          px-2 py-1 rounded-full text-xs font-medium text-white
          bg-gradient-to-r ${sourceColor}
          shadow-lg shadow-black/20
        `}>
          {asset.source}
        </div>
      </div>

      {/* Asset Header */}
      <div className="mb-4">
        <div className="flex items-center space-x-3">
          {/* Asset Icon */}
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
            {(asset.symbol || asset.asset).charAt(0).toUpperCase()}
          </div>
          
          {/* Asset Info */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-white truncate">
              {asset.symbol || asset.asset}
            </h3>
            {asset.name && asset.name !== asset.asset && (
              <p className="text-sm text-slate-400 truncate">
                {asset.name}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Price Section */}
      <div className="mb-6">
        <div className="text-3xl font-bold text-white mb-2">
          {formatCurrency(asset.price)}
        </div>
        
        {/* 24h Change */}
        <div className={`flex items-center space-x-2 ${changeDisplay.color}`}>
          {changeDisplay.icon}
          <span className="text-lg font-semibold">
            {changeDisplay.sign}{formatCurrency(asset.change24h)}
          </span>
          <span className="text-sm opacity-80">
            ({changeDisplay.sign}{((asset.change24h / asset.price) * 100).toFixed(2)}%)
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Volume */}
        <div className="bg-slate-700/50 rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-1">
            <Activity className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-400 uppercase tracking-wider">Volume</span>
          </div>
          <div className="text-sm font-semibold text-white">
            {formatVolume(asset.volume24h)}
          </div>
        </div>

        {/* Market Cap */}
        <div className="bg-slate-700/50 rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-1">
            <BarChart3 className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-400 uppercase tracking-wider">Market Cap</span>
          </div>
          <div className="text-sm font-semibold text-white">
            {formatCurrency(asset.marketCap)}
          </div>
        </div>
      </div>

      {/* Hover Overlay */}
      <div className={`
        absolute inset-0 rounded-xl bg-gradient-to-br from-blue-500/10 to-purple-500/10
        opacity-0 group-hover:opacity-100 transition-opacity duration-200
        pointer-events-none
      `} />

      {/* Last Updated */}
      {asset.lastUpdated && (
        <div className="absolute bottom-3 left-3">
          <span className="text-xs text-slate-500">
            {new Date(asset.lastUpdated).toLocaleTimeString()}
          </span>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MAIN GRID COMPONENT
// ============================================================================

const AssetCardGrid: React.FC<AssetCardGridProps> = ({
  assets,
  title = 'Market Assets',
  subtitle = 'Real-time market data from multiple sources',
  loading = false,
  emptyMessage = 'No assets available',
  onCardClick,
  className = ''
}) => {
  const [filteredAssets, setFilteredAssets] = useState<AssetCardData[]>(assets);
  const [searchTerm, setSearchTerm] = useState('');

  // Filter assets based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredAssets(assets);
    } else {
      const filtered = assets.filter(asset =>
        asset.asset.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (asset.symbol && asset.symbol.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (asset.name && asset.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        asset.source.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredAssets(filtered);
    }
  }, [assets, searchTerm]);

  // Loading state
  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        {/* Header */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
          <p className="text-slate-400">{subtitle}</p>
        </div>

        {/* Loading Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, index) => (
            <div
              key={index}
              className="bg-slate-800 rounded-xl p-6 animate-pulse"
            >
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-slate-700 rounded-xl" />
                <div className="flex-1">
                  <div className="h-5 bg-slate-700 rounded mb-2" />
                  <div className="h-4 bg-slate-700 rounded w-3/4" />
                </div>
              </div>
              <div className="h-8 bg-slate-700 rounded mb-4" />
              <div className="h-6 bg-slate-700 rounded mb-6" />
              <div className="grid grid-cols-2 gap-4">
                <div className="h-16 bg-slate-700 rounded" />
                <div className="h-16 bg-slate-700 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (assets.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="w-16 h-16 mx-auto mb-4 bg-slate-700 rounded-full flex items-center justify-center">
          <BarChart3 className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">No Assets Found</h3>
        <p className="text-slate-400">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
        <p className="text-slate-400 mb-6">{subtitle}</p>
        
        {/* Search Bar */}
        <div className="max-w-md mx-auto">
          <div className="relative">
            <input
              type="text"
              placeholder="Search assets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            />
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="text-center">
        <p className="text-slate-400">
          Showing {filteredAssets.length} of {assets.length} assets
        </p>
      </div>

      {/* Asset Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredAssets.map((asset, index) => (
          <AssetCard
            key={`${asset.asset}-${asset.source}-${index}`}
            asset={asset}
            index={index}
            onClick={onCardClick}
          />
        ))}
      </div>

      {/* No Results */}
      {filteredAssets.length === 0 && assets.length > 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-slate-700 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-1.009-5.824-2.562M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">No Results Found</h3>
          <p className="text-slate-400">Try adjusting your search terms</p>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// EXPORTS
// ============================================================================

export default AssetCardGrid; 