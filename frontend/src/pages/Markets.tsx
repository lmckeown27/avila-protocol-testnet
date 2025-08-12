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
      <div className="card mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Market Overview</h2>
        <div className="table-container">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Asset</th>
                  <th>Price</th>
                  <th>24h Change</th>
                  <th>24h Volume</th>
                  <th>Market Cap</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr className="hover:bg-gray-50">
                  <td>
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-bold text-sm">M</span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">Total Markets</div>
                        <div className="text-sm text-gray-500">Market Count</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="text-sm font-medium text-gray-900">-</div>
                  </td>
                  <td>
                    <div className="text-sm text-gray-900">-</div>
                  </td>
                  <td>
                    <div className="text-sm font-medium text-blue-600">
                      {markets.length}
                    </div>
                  </td>
                  <td>
                    <div className="text-sm font-medium text-gray-900">-</div>
                  </td>
                  <td className="text-sm font-medium">
                    <button className="btn-secondary text-xs px-3 py-1">
                      View
                    </button>
                  </td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td>
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-green-600 font-bold text-sm">V</span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">Total Volume (24h)</div>
                        <div className="text-sm text-gray-500">24h Trading Volume</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="text-sm font-medium text-gray-900">-</div>
                  </td>
                  <td>
                    <div className="text-sm text-gray-900">-</div>
                  </td>
                  <td>
                    <div className="text-sm font-medium text-green-600">
                      ${(markets.reduce((sum, m) => sum + m.volume24h, 0) / 1000000).toFixed(1)}M
                    </div>
                  </td>
                  <td>
                    <div className="text-sm font-medium text-gray-900">-</div>
                  </td>
                  <td className="text-sm font-medium">
                    <button className="btn-secondary text-xs px-3 py-1">
                      View
                    </button>
                  </td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td>
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                        <span className="text-purple-600 font-bold text-sm">C</span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">Total Market Cap</div>
                        <div className="text-sm text-gray-500">Market Capitalization</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="text-sm font-medium text-gray-900">-</div>
                  </td>
                  <td>
                    <div className="text-sm font-medium text-gray-900">-</div>
                  </td>
                  <td>
                    <div className="text-sm font-medium text-gray-900">-</div>
                  </td>
                  <td>
                    <div className="text-sm font-medium text-purple-600">
                      ${(markets.reduce((sum, m) => sum + m.marketCap, 0) / 1000000000).toFixed(1)}B
                    </div>
                  </td>
                  <td className="text-sm font-medium">
                    <button className="btn-secondary text-xs px-3 py-1">
                      View
                    </button>
                  </td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td>
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                        <span className="text-orange-600 font-bold text-sm">A</span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">Active Markets</div>
                        <div className="text-sm text-gray-500">Active Trading Pairs</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="text-sm font-medium text-gray-900">-</div>
                  </td>
                  <td>
                    <div className="text-sm font-medium text-gray-900">-</div>
                  </td>
                  <td>
                    <div className="text-sm font-medium text-gray-900">-</div>
                  </td>
                  <td>
                    <div className="text-sm font-medium text-gray-900">-</div>
                  </td>
                  <td className="text-sm font-medium">
                    <button className="btn-secondary text-xs px-3 py-1">
                      View
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Markets Table */}
      <div className="table-container">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Asset</th>
                <th>Price</th>
                <th>24h Change</th>
                <th>24h Volume</th>
                <th>Market Cap</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {markets.map((market) => (
                <tr key={market.ticker} className="hover:bg-white">
                  <td>
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
                  <td>
                    <div className="text-sm font-medium text-gray-900">
                      {formatPrice(market.price)}
                    </div>
                  </td>
                  <td>
                    {formatChange(market.change24h)}
                  </td>
                  <td>
                    <div className="text-sm text-gray-900">
                      ${(market.volume24h / 1000).toFixed(0)}K
                    </div>
                  </td>
                  <td>
                    <div className="text-sm font-medium text-gray-900">
                      ${(market.marketCap / 1000000).toFixed(1)}M
                    </div>
                  </td>
                  <td className="text-sm font-medium">
                    <button className="btn-primary text-xs px-3 py-1 mr-2">
                      Trade
                    </button>
                    <button className="btn-secondary text-xs px-3 py-1">
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
      <div className="card animate-fade-in-up">
        <h3 className="text-lg font-semibold text-yellow-800 mb-2">
          🧪 Testnet Environment Notice
        </h3>
        <p className="text-yellow-700 text-sm leading-relaxed">
          These are mock markets for testing purposes. Prices are simulated and do not reflect real market conditions. 
          No real money is involved in testnet trading.
        </p>
      </div>
    </div>
  );
};

export default Markets; 