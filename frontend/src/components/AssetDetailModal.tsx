import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { X, TrendingUp, TrendingDown, DollarSign, BarChart3, Activity } from 'lucide-react';

interface HistoricalDataPoint {
  date: string;
  price: number;
  volume: number;
}

interface Asset {
  symbol?: string;
  asset?: string;
  name?: string;
  price?: number;
  spot_price?: number;
  change?: number;
  changePercent?: number;
  change24h?: number;
  volume?: number;
  volume24h?: number;
  marketCap?: number;
  high?: number;
  high24h?: number;
  low?: number;
  low24h?: number;
  open?: number;
  previousClose?: number;
  exchange?: string;
  lastUpdated?: number;
  // Enhanced data fields
  pe?: number | null;
  tvl?: number | null;
  category?: string; // Added for filtering historical data
}

interface AssetDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: Asset | null;
  assetType: 'stock' | 'etf' | 'crypto' | 'defi' | null;
}

const AssetDetailModal = ({ isOpen, onClose, asset, assetType }: AssetDetailModalProps) => {
  const [historicalData, setHistoricalData] = useState<HistoricalDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch historical data when modal opens
  useEffect(() => {
    if (isOpen && asset) {
      const fetchHistoricalData = async () => {
        try {
          setIsLoading(true);
          
          // Try to get real historical data from backend
          if (assetType === 'stock' || assetType === 'etf') {
            // For stocks and ETFs, try to get real data from backend
            try {
              // This would be a real API call to get historical data
              // For now, we'll show a message that real historical data is not yet implemented
              console.log('📊 Real historical data not yet implemented for stocks/ETFs');
              setHistoricalData([]);
            } catch (error) {
              console.warn('Failed to fetch real historical data:', error);
            }
          } else if (assetType === 'crypto' || assetType === 'defi') {
            // For crypto and DeFi, try to get real data from backend
            try {
              // This would be a real API call to get historical data
              // For now, we'll show a message that real historical data is not yet implemented
              console.log('🪙 Real historical data not yet implemented for crypto/DeFi');
              setHistoricalData([]);
            } catch (error) {
              console.warn('Failed to fetch real historical data:', error);
            }
          }
          
          setIsLoading(false);
        } catch (error) {
          console.error('Error fetching historical data:', error);
          setIsLoading(false);
        }
      };

      fetchHistoricalData();
    }
  }, [isOpen, asset, assetType]);

  const formatCurrency = (value: number) => {
    if (value === 0) return '$0.00';
    if (value < 1) return `$${value.toFixed(4)}`;
    if (value < 1000) return `$${value.toFixed(2)}`;
    if (value < 1000000) return `$${(value / 1000).toFixed(2)}K`;
    if (value < 1000000000) return `$${(value / 1000000).toFixed(2)}M`;
    return `$${(value / 1000000000).toFixed(2)}B`;
  };

  const formatVolume = (value: number) => {
    if (value === 0) return '0';
    if (value < 1000) return value.toLocaleString();
    if (value < 1000000) return `${(value / 1000).toFixed(1)}K`;
    if (value < 1000000000) return `${(value / 1000000).toFixed(1)}M`;
    return `${(value / 1000000000).toFixed(1)}B`;
  };

  const getChangeColor = (change: number) => {
    if (!change) return 'text-gray-500';
    return change >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const getChangeIcon = (change: number) => {
    if (!change) return null;
    return change >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />;
  };

  if (!isOpen || !asset) return null;

  const currentPrice = asset.price || asset.spot_price || 0;
  const change = asset.change || 0;
  const changePercent = asset.changePercent || 0;
  const volume = asset.volume || 0;
  const marketCap = asset.marketCap || 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {asset.symbol || asset.asset}
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                {asset.name || asset.asset}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Price and Change Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <DollarSign className="w-5 h-5 text-gray-500" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Current Price
                </span>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(currentPrice)}
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                {getChangeIcon(change)}
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  24h Change
                </span>
              </div>
              <div className={`text-2xl font-bold ${getChangeColor(change)}`}>
                {change >= 0 ? '+' : ''}{formatCurrency(change)} ({changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%)
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Activity className="w-5 h-5 text-gray-500" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  24h Volume
                </span>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatVolume(volume)}
              </div>
            </div>
          </div>

          {/* Market Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <BarChart3 className="w-5 h-5 text-gray-500" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Market Cap
                </span>
              </div>
              <div className="text-xl font-semibold text-gray-900 dark:text-white">
                {formatCurrency(marketCap)}
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <TrendingUp className="w-5 h-5 text-gray-500" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Exchange
                </span>
              </div>
              <div className="text-xl font-semibold text-gray-900 dark:text-white">
                {asset.exchange || 'N/A'}
              </div>
            </div>
          </div>

          {/* Enhanced Data Section */}
          {(asset.pe !== null || asset.tvl !== null) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {asset.pe !== null && asset.pe !== undefined && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <TrendingUp className="w-5 h-5 text-blue-500" />
                    <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                      P/E Ratio
                    </span>
                  </div>
                  <div className="text-xl font-semibold text-blue-900 dark:text-blue-100">
                    {asset.pe.toFixed(2)}
                  </div>
                  <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    Price-to-Earnings
                  </div>
                </div>
              )}



              {asset.tvl !== null && asset.tvl !== undefined && (
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <BarChart3 className="w-5 h-5 text-purple-500" />
                    <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                      Total Value Locked
                    </span>
                  </div>
                  <div className="text-xl font-semibold text-purple-900 dark:text-purple-100">
                    {formatCurrency(asset.tvl)}
                  </div>
                  <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                    DeFi protocol value
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Historical Chart */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-4">
              <TrendingUp className="w-5 h-5 text-gray-500" />
              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                7-Day Price History
              </span>
            </div>
            
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={historicalData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#6b7280"
                      fontSize={12}
                    />
                    <YAxis 
                      stroke="#6b7280"
                      fontSize={12}
                      tickFormatter={(value: number) => `$${value.toFixed(2)}`}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: '#1f2937',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#f9fafb'
                      }}
                      formatter={(value: number) => [`$${value.toFixed(2)}`, 'Price']}
                      labelFormatter={(label: string) => `Date: ${label}`}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="price" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Additional Info */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Asset Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600 dark:text-gray-400">Symbol:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">
                  {asset.symbol || asset.asset}
                </span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Type:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">
                  {assetType === 'stock' ? 'Traditional Finance' : 
                   assetType === 'etf' ? 'Traditional Finance' :
                   assetType === 'crypto' ? 'Cryptocurrency' :
                   assetType === 'defi' ? 'Decentralized Finance' : 'Asset'}
                </span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Last Updated:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">
                  {asset.lastUpdated ? new Date(asset.lastUpdated).toLocaleString() : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Currency:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">
                  USD
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssetDetailModal; 