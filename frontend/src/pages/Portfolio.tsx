import { useState } from 'react';
// import { useAppStore } from '../stores/appStore';
import { TrendingUp, DollarSign, BarChart3, Star, Plus, Trash2 } from 'lucide-react';

// Mock data types for testnet
interface MockAsset {
  id: string;
  symbol: string;
  name: string;
  currentPrice: number;
  change24h: number;
  changePercent24h: number;
  marketCap: number;
  volume24h: number;
}

interface MockHolding {
  id: string;
  symbol: string;
  name: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  totalValue: number;
  pnl: number;
  pnlPercent: number;
}

const Portfolio = () => {
  // Mock data for testnet - no wallet connection required
  const [watchlist, setWatchlist] = useState<MockAsset[]>([
    {
      id: '1',
      symbol: 'ETH',
      name: 'Ethereum',
      currentPrice: 2500.00,
      change24h: 125.50,
      changePercent24h: 5.28,
      marketCap: 300000000000,
      volume24h: 15000000000
    },
    {
      id: '2',
      symbol: 'BTC',
      name: 'Bitcoin',
      currentPrice: 45000.00,
      change24h: 2250.00,
      changePercent24h: 5.26,
      marketCap: 880000000000,
      volume24h: 25000000000
    },
    {
      id: '3',
      symbol: 'SOL',
      name: 'Solana',
      currentPrice: 100.00,
      change24h: 8.50,
      changePercent24h: 9.28,
      marketCap: 45000000000,
      volume24h: 3000000000
    }
  ]);

  const [holdings, setHoldings] = useState<MockHolding[]>([
    {
      id: '1',
      symbol: 'ETH',
      name: 'Ethereum',
      quantity: 2.5,
      avgPrice: 2400.00,
      currentPrice: 2500.00,
      totalValue: 6250.00,
      pnl: 250.00,
      pnlPercent: 10.42
    },
    {
      id: '2',
      symbol: 'SOL',
      name: 'Solana',
      quantity: 50,
      avgPrice: 95.00,
      currentPrice: 100.00,
      totalValue: 5000.00,
      pnl: 250.00,
      pnlPercent: 5.26
    }
  ]);

  const [activeTab, setActiveTab] = useState<'overview' | 'watchlist' | 'holdings'>('overview');

  const removeFromWatchlist = (symbol: string) => {
    setWatchlist(watchlist.filter(item => item.symbol !== symbol));
  };

  const buyAsset = (asset: MockAsset, quantity: number, price: number) => {
    const existingHolding = holdings.find(h => h.symbol === asset.symbol);
    
    if (existingHolding) {
      // Update existing holding
      const newQuantity = existingHolding.quantity + quantity;
      const newAvgPrice = ((existingHolding.avgPrice * existingHolding.quantity) + (price * quantity)) / newQuantity;
      const newTotalValue = newQuantity * asset.currentPrice;
      const newPnl = newTotalValue - (newAvgPrice * newQuantity);
      const newPnlPercent = (newPnl / (newAvgPrice * newQuantity)) * 100;

      setHoldings(holdings.map(h => 
        h.symbol === asset.symbol 
          ? { ...h, quantity: newQuantity, avgPrice: newAvgPrice, totalValue: newTotalValue, pnl: newPnl, pnlPercent: newPnlPercent }
          : h
      ));
    } else {
      // Create new holding
      const newHolding: MockHolding = {
        id: Date.now().toString(),
        symbol: asset.symbol,
        name: asset.name,
        quantity: quantity,
        avgPrice: price,
        currentPrice: asset.currentPrice,
        totalValue: quantity * asset.currentPrice,
        pnl: 0,
        pnlPercent: 0
      };
      setHoldings([...holdings, newHolding]);
    }
  };

  const buyHolding = (holding: MockHolding, quantity: number, price: number) => {
    // Convert holding to asset format for buying
    const asset: MockAsset = {
      id: holding.id,
      symbol: holding.symbol,
      name: holding.name,
      currentPrice: holding.currentPrice,
      change24h: 0, // Mock data
      changePercent24h: 0, // Mock data
      marketCap: 0, // Mock data
      volume24h: 0 // Mock data
    };
    buyAsset(asset, quantity, price);
  };

  const sellAsset = (symbol: string, quantity: number) => {
    const holding = holdings.find(h => h.symbol === symbol);
    if (holding && holding.quantity >= quantity) {
      if (holding.quantity === quantity) {
        // Remove holding completely
        setHoldings(holdings.filter(h => h.symbol !== symbol));
      } else {
        // Reduce quantity
        const newQuantity = holding.quantity - quantity;
        const newTotalValue = newQuantity * holding.currentPrice;
        const newPnl = newTotalValue - (holding.avgPrice * newQuantity);
        const newPnlPercent = (newPnl / (holding.avgPrice * newQuantity)) * 100;

        setHoldings(holdings.map(h => 
          h.symbol === symbol 
            ? { ...h, quantity: newQuantity, totalValue: newTotalValue, pnl: newPnl, pnlPercent: newPnlPercent }
            : h
        ));
      }
    }
  };

  const totalPortfolioValue = holdings.reduce((sum, holding) => sum + holding.totalValue, 0);
  const totalPnL = holdings.reduce((sum, holding) => sum + holding.pnl, 0);
  const totalPnLPercent = totalPortfolioValue > 0 ? (totalPnL / (totalPortfolioValue - totalPnL)) * 100 : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Portfolio</h1>
          <p className="text-gray-600">Mock trading environment - no wallet connection required</p>
        </div>

        {/* Portfolio Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card bg-gradient-to-r from-blue-50 to-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Total Portfolio Value</p>
                <p className="text-2xl font-bold text-blue-900">${totalPortfolioValue.toLocaleString()}</p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-400" />
            </div>
          </div>
          <div className="card bg-gradient-to-r from-green-50 to-green-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Total P&L</p>
                <p className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                  ${totalPnL.toLocaleString()}
                </p>
              </div>
              <TrendingUp className={`w-8 h-8 ${totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`} />
            </div>
          </div>
          <div className="card bg-gradient-to-r from-purple-50 to-purple-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">P&L %</p>
                <p className={`text-2xl font-bold ${totalPnLPercent >= 0 ? 'text-purple-900' : 'text-red-900'}`}>
                  {totalPnLPercent.toFixed(2)}%
                </p>
              </div>
              <BarChart3 className="w-8 h-8 text-purple-400" />
            </div>
          </div>
          <div className="card bg-gradient-to-r from-orange-50 to-orange-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 font-medium">Holdings</p>
                <p className="text-2xl font-bold text-orange-900">{holdings.length}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-orange-400" />
            </div>
          </div>
        </div>

        {/* Portfolio Tabs */}
        <div className="card">
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'overview'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('watchlist')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'watchlist'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Watchlist ({watchlist.length})
              </button>
              <button
                onClick={() => setActiveTab('holdings')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'holdings'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Holdings ({holdings.length})
              </button>
            </nav>
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
                <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500">
                  <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No recent trading activity</p>
                  <p className="text-sm">Start trading to see your activity here</p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performers</h3>
                {holdings.length > 0 ? (
                  <div className="space-y-2">
                    {holdings
                      .sort((a, b) => b.pnlPercent - a.pnlPercent)
                      .slice(0, 3)
                      .map((holding) => (
                        <div key={holding.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <div>
                            <span className="font-medium">{holding.symbol}</span>
                            <span className="text-gray-500 ml-2">({holding.name})</span>
                          </div>
                          <div className={`font-medium ${holding.pnlPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {holding.pnlPercent >= 0 ? '+' : ''}{holding.pnlPercent.toFixed(2)}%
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    <p>No holdings yet</p>
                    <p className="text-sm">Add assets to your portfolio to see top performers</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Watchlist Tab */}
          {activeTab === 'watchlist' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Watchlist</h3>
                <button className="btn-primary text-sm px-3 py-2">
                  <Plus className="w-4 h-4 inline mr-1" />
                  Add Asset
                </button>
              </div>
              
              {watchlist.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Star className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Your watchlist is empty</p>
                  <p className="text-sm">Add assets to track their performance</p>
                </div>
              ) : (
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
                          Market Cap
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {watchlist.map((asset) => (
                        <tr key={asset.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                  <span className="text-blue-600 font-bold">{asset.symbol[0]}</span>
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{asset.symbol}</div>
                                <div className="text-sm text-gray-500">{asset.name}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${asset.currentPrice.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              asset.changePercent24h >= 0 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {asset.changePercent24h >= 0 ? '+' : ''}{asset.changePercent24h.toFixed(2)}%
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${(asset.marketCap / 1000000000).toFixed(2)}B
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <button 
                                onClick={() => buyAsset(asset, 1, asset.currentPrice)}
                                className="text-green-600 hover:text-green-900"
                              >
                                Buy
                              </button>
                              <button 
                                onClick={() => removeFromWatchlist(asset.symbol)}
                                className="text-red-600 hover:text-red-900"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Holdings Tab */}
          {activeTab === 'holdings' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Holdings</h3>
              
              {holdings.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No holdings found</p>
                  <p className="text-sm">Buy assets to build your portfolio</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Asset
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Quantity
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Avg Price
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Current Price
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Value
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          P&L
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {holdings.map((holding) => (
                        <tr key={holding.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                  <span className="text-blue-600 font-bold">{holding.symbol[0]}</span>
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{holding.symbol}</div>
                                <div className="text-sm text-gray-500">{holding.name}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {holding.quantity}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${holding.avgPrice.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${holding.currentPrice.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${holding.totalValue.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className={`text-sm font-medium ${holding.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              ${holding.pnl.toFixed(2)}
                            </div>
                            <div className={`text-xs ${holding.pnlPercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                              {holding.pnlPercent >= 0 ? '+' : ''}{holding.pnlPercent.toFixed(2)}%
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <button 
                                onClick={() => buyHolding(holding, 1, holding.currentPrice)}
                                className="text-green-600 hover:text-green-900"
                              >
                                Buy More
                              </button>
                              <button 
                                onClick={() => sellAsset(holding.symbol, 1)}
                                className="text-red-600 hover:text-red-900"
                              >
                                Sell
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Testnet Notice */}
        <div className="card bg-yellow-50 border-yellow-200">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">
            🧪 Mock Trading Environment
          </h3>
          <p className="text-yellow-700 text-sm">
            This is a simulated portfolio for testing purposes. You can add assets to your watchlist, 
            "buy" and "sell" assets, and track your mock portfolio performance without any real money or wallet connection.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Portfolio; 