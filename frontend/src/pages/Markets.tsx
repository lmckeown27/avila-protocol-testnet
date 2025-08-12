import { Link } from 'react-router-dom';
import { TrendingUp, BarChart3, Activity, Globe, Coins } from 'lucide-react';

const Markets = () => {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Markets Overview
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Access real-time market data for both traditional and decentralized finance
        </p>
      </div>

      {/* Market Type Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* TradFi Markets Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-xl transition-shadow">
          <div className="p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                <Globe className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-blue-600 dark:text-blue-400">Traditional Finance</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">Markets</div>
              </div>
            </div>
            
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Stocks & ETFs
            </h3>
            
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Real-time data for major stocks, ETFs, and traditional market indices. 
              Track performance, volume, and market capitalization across global markets.
            </p>
            
            <div className="space-y-3 mb-6">
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <TrendingUp className="w-4 h-4 text-green-500 mr-2" />
                <span>Major stocks: AAPL, MSFT, GOOGL, TSLA, META</span>
              </div>
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <BarChart3 className="w-4 h-4 text-blue-500 mr-2" />
                <span>Popular ETFs: SPY, QQQ, IWM, VTI, VEA</span>
              </div>
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <Activity className="w-4 h-4 text-purple-500 mr-2" />
                <span>Real-time pricing & volume data</span>
              </div>
            </div>
            
            <Link
              to="/tradfi-markets"
              className="btn-primary w-full text-center py-3"
            >
              View TradFi Markets
            </Link>
          </div>
        </div>

        {/* DeFi Markets Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-xl transition-shadow">
          <div className="p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                <Coins className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-purple-600 dark:text-purple-400">Decentralized Finance</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">Markets</div>
              </div>
            </div>
            
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Cryptocurrencies
            </h3>
            
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Live cryptocurrency market data with real-time pricing, volume, and market metrics. 
              Track the performance of major digital assets and DeFi tokens.
            </p>
            
            <div className="space-y-3 mb-6">
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <TrendingUp className="w-4 h-4 text-green-500 mr-2" />
                <span>Major cryptos: BTC, ETH, SOL, ADA, DOT, LINK</span>
              </div>
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <BarChart3 className="w-4 h-4 text-blue-500 mr-2" />
                <span>DeFi tokens: UNI, MATIC, AVAX, ATOM</span>
              </div>
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <Activity className="w-4 h-4 text-purple-500 mr-2" />
                <span>Live pricing & market analytics</span>
              </div>
            </div>
            
            <Link
              to="/defi-markets"
              className="btn-primary w-full text-center py-3"
            >
              View DeFi Markets
            </Link>
          </div>
        </div>
      </div>

      {/* Market Summary Stats */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Market Overview
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">2</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Market Types</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">20+</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Assets Tracked</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">Real-time</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Data Updates</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">24/7</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Market Access</div>
          </div>
        </div>
      </div>

      {/* Testnet Notice */}
      <div className="card animate-fade-in-up">
        <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
          🧪 Testnet Environment Notice
        </h3>
        <p className="text-yellow-700 dark:text-yellow-300 text-sm leading-relaxed">
          This is a testnet environment for the Avila Protocol. Market data is sourced from real APIs but trading functionality is simulated for testing purposes.
        </p>
      </div>
    </div>
  );
};

export default Markets; 