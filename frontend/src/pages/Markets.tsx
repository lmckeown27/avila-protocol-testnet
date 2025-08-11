import { useEffect, useState } from 'react';
import { config } from '../config/environment';
import { TrendingUp, TrendingDown, DollarSign, BarChart3 } from 'lucide-react';

interface MarketData {
  ticker: string;
  name: string;
  price: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
  decimals: number;
}

const Markets = () => {
  const [markets, setMarkets] = useState<MarketData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load mock market data
    const loadMarkets = () => {
      const mockMarkets: MarketData[] = config.testnet.mockAssets.map((asset) => ({
        ticker: asset.ticker,
        name: asset.name,
        price: asset.initialPrice + (Math.random() - 0.5) * 10, // Random price variation
        change24h: (Math.random() - 0.5) * 20, // Random 24h change
        volume24h: Math.random() * 1000000, // Random volume
        marketCap: asset.initialPrice * 1000000, // Mock market cap
        decimals: asset.decimals,
      }));
      
      setMarkets(mockMarkets);
      setIsLoading(false);
    };

    loadMarkets();
  }, []);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(price);
  };

  const formatChange = (change: number) => {
    const isPositive = change >= 0;
    return (
      <span className={`flex items-center ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
        {Math.abs(change).toFixed(2)}%
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Markets</h1>
          <p className="text-gray-600">Explore available tokenized stocks and options markets</p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <BarChart3 className="w-4 h-4" />
          <span>Last updated: {new Date().toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Market Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card bg-gradient-to-r from-blue-50 to-blue-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">Total Markets</p>
              <p className="text-2xl font-bold text-blue-900">{markets.length}</p>
            </div>
            <BarChart3 className="w-8 h-8 text-blue-400" />
          </div>
        </div>
        <div className="card bg-gradient-to-r from-green-50 to-green-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 font-medium">Total Volume (24h)</p>
              <p className="text-2xl font-bold text-green-900">
                ${(markets.reduce((sum, m) => sum + m.volume24h, 0) / 1000000).toFixed(1)}M
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-400" />
          </div>
        </div>
        <div className="card bg-gradient-to-r from-purple-50 to-purple-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-600 font-medium">Total Market Cap</p>
              <p className="text-2xl font-bold text-purple-900">
                ${(markets.reduce((sum, m) => sum + m.marketCap, 0) / 1000000000).toFixed(1)}B
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-purple-400" />
          </div>
        </div>
        <div className="card bg-gradient-to-r from-orange-50 to-orange-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-600 font-medium">Active Markets</p>
              <p className="text-2xl font-bold text-orange-900">{markets.length}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-orange-400" />
          </div>
        </div>
      </div>

      {/* Markets Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Asset
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  24h Change
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  24h Volume
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Market Cap
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {markets.map((market) => (
                <tr key={market.ticker} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                        <span className="text-primary-600 font-bold text-sm">
                          {market.ticker.charAt(0)}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {market.ticker}
                        </div>
                        <div className="text-sm text-gray-500">{market.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {formatPrice(market.price)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {formatChange(market.change24h)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      ${(market.volume24h / 1000).toFixed(0)}K
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      ${(market.marketCap / 1000000).toFixed(1)}M
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button className="text-primary-600 hover:text-primary-900 mr-3">
                      Trade
                    </button>
                    <button className="text-gray-600 hover:text-gray-900">
                      Options
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Testnet Notice */}
      <div className="card bg-yellow-50 border-yellow-200">
        <h3 className="text-lg font-semibold text-yellow-800 mb-2">
          🧪 Testnet Environment Notice
        </h3>
        <p className="text-yellow-700 text-sm">
          These are mock markets for testing purposes. Prices are simulated and do not reflect real market conditions. 
          No real money is involved in testnet trading.
        </p>
      </div>
    </div>
  );
};

export default Markets; 