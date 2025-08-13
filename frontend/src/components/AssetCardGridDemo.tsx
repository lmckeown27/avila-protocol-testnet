import React, { useState, useEffect } from 'react';
import AssetCardGrid, { AssetCardData } from './AssetCardGrid';

// ============================================================================
// SAMPLE DATA FOR DEMONSTRATION
// ============================================================================

const sampleTradFiAssets: AssetCardData[] = [
  {
    asset: 'Apple Inc.',
    symbol: 'AAPL',
    name: 'Apple Inc.',
    price: 175.43,
    change24h: 2.34,
    volume24h: 45678900,
    marketCap: 2750000000000,
    source: 'Finnhub',
    lastUpdated: Date.now()
  },
  {
    asset: 'Microsoft Corporation',
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    price: 338.11,
    change24h: -1.87,
    volume24h: 23456700,
    marketCap: 2510000000000,
    source: 'Polygon',
    lastUpdated: Date.now()
  },
  {
    asset: 'Alphabet Inc.',
    symbol: 'GOOGL',
    name: 'Alphabet Inc.',
    price: 142.56,
    change24h: 3.21,
    volume24h: 34567800,
    marketCap: 1780000000000,
    source: 'Alpha Vantage',
    lastUpdated: Date.now()
  },
  {
    asset: 'Amazon.com Inc.',
    symbol: 'AMZN',
    name: 'Amazon.com Inc.',
    price: 145.24,
    change24h: -0.95,
    volume24h: 56789000,
    marketCap: 1500000000000,
    source: 'Twelve Data',
    lastUpdated: Date.now()
  }
];

const sampleCryptoAssets: AssetCardData[] = [
  {
    asset: 'Bitcoin',
    symbol: 'BTC',
    name: 'Bitcoin',
    price: 43250.67,
    change24h: 1250.43,
    volume24h: 23456789000,
    marketCap: 845000000000,
    source: 'CoinGecko',
    lastUpdated: Date.now()
  },
  {
    asset: 'Ethereum',
    symbol: 'ETH',
    name: 'Ethereum',
    price: 2650.89,
    change24h: -87.32,
    volume24h: 15678900000,
    marketCap: 318000000000,
    source: 'Binance',
    lastUpdated: Date.now()
  },
  {
    asset: 'Binance Coin',
    symbol: 'BNB',
    name: 'Binance Coin',
    price: 312.45,
    change24h: 12.67,
    volume24h: 2345678000,
    marketCap: 48100000000,
    source: 'CoinMarketCap',
    lastUpdated: Date.now()
  },
  {
    asset: 'Cardano',
    symbol: 'ADA',
    name: 'Cardano',
    price: 0.4876,
    change24h: 0.0234,
    volume24h: 456789000,
    marketCap: 17200000000,
    source: 'CryptoCompare',
    lastUpdated: Date.now()
  }
];

const sampleDeFiAssets: AssetCardData[] = [
  {
    asset: 'Uniswap',
    symbol: 'UNI',
    name: 'Uniswap Protocol',
    price: 7.89,
    change24h: 0.45,
    volume24h: 234567000,
    marketCap: 4560000000,
    source: 'DefiLlama',
    lastUpdated: Date.now()
  },
  {
    asset: 'Aave',
    symbol: 'AAVE',
    name: 'Aave Protocol',
    price: 245.67,
    change24h: -12.34,
    volume24h: 123456000,
    marketCap: 3450000000,
    source: 'Uniswap',
    lastUpdated: Date.now()
  },
  {
    asset: 'Compound',
    symbol: 'COMP',
    name: 'Compound Protocol',
    price: 67.89,
    change24h: 3.21,
    volume24h: 89012000,
    marketCap: 678000000,
    source: 'Aave',
    lastUpdated: Date.now()
  },
  {
    asset: 'MakerDAO',
    symbol: 'MKR',
    name: 'Maker Protocol',
    price: 1234.56,
    change24h: -45.67,
    volume24h: 45678000,
    marketCap: 1230000000,
    source: 'Compound',
    lastUpdated: Date.now()
  }
];

// ============================================================================
// DEMO COMPONENT
// ============================================================================

const AssetCardGridDemo: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'tradfi' | 'crypto' | 'defi'>('tradfi');
  const [loading, setLoading] = useState(false);

  // Simulate loading state
  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 1500);
    return () => clearTimeout(timer);
  }, [activeTab]);

  const getActiveAssets = () => {
    switch (activeTab) {
      case 'tradfi':
        return sampleTradFiAssets;
      case 'crypto':
        return sampleCryptoAssets;
      case 'defi':
        return sampleDeFiAssets;
      default:
        return sampleTradFiAssets;
    }
  };

  const getTabConfig = (tab: string) => {
    const configs = {
      tradfi: {
        title: 'Traditional Finance Assets',
        subtitle: 'Stocks, ETFs, and indices from major exchanges',
        color: 'from-blue-500 to-blue-600'
      },
      crypto: {
        title: 'Cryptocurrency Assets',
        subtitle: 'Digital currencies and blockchain tokens',
        color: 'from-yellow-500 to-orange-500'
      },
      defi: {
        title: 'DeFi Protocol Assets',
        subtitle: 'Decentralized finance protocols and governance tokens',
        color: 'from-green-500 to-emerald-500'
      }
    };
    return configs[tab as keyof typeof configs];
  };

  const handleCardClick = (asset: AssetCardData) => {
    console.log('Asset clicked:', asset);
    // You can implement navigation, modal opening, or other actions here
  };

  const activeConfig = getTabConfig(activeTab);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-white mb-4">
          Asset Card Grid Demo
        </h1>
        <p className="text-xl text-slate-300 max-w-2xl mx-auto">
          Interactive card grid displaying TradFi, Crypto, and DeFi assets with hover effects, 
          responsive design, and real-time data integration capabilities.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex justify-center mb-8">
        <div className="bg-slate-800 rounded-xl p-1 border border-slate-700">
          {(['tradfi', 'crypto', 'defi'] as const).map((tab) => {
            const config = getTabConfig(tab);
            const isActive = activeTab === tab;
            
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`
                  px-6 py-3 rounded-lg font-medium transition-all duration-200
                  ${isActive 
                    ? `bg-gradient-to-r ${config.color} text-white shadow-lg` 
                    : 'text-slate-400 hover:text-white hover:bg-slate-700'
                  }
                `}
              >
                {tab === 'tradfi' && '🏛️ TradFi'}
                {tab === 'crypto' && '🌐 Crypto'}
                {tab === 'defi' && '🔗 DeFi'}
              </button>
            );
          })}
        </div>
      </div>

      {/* Asset Grid */}
      <div className="max-w-7xl mx-auto">
        <AssetCardGrid
          assets={getActiveAssets()}
          title={activeConfig.title}
          subtitle={activeConfig.subtitle}
          loading={loading}
          onCardClick={handleCardClick}
          className="mb-8"
        />
      </div>

      {/* Features Showcase */}
      <div className="max-w-4xl mx-auto mt-16">
        <h2 className="text-2xl font-bold text-white text-center mb-8">
          Component Features
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Responsive Grid</h3>
            <p className="text-slate-400 text-sm">
              CSS Grid with auto-fill and minmax for perfect responsive behavior across all screen sizes.
            </p>
          </div>

          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Hover Effects</h3>
            <p className="text-slate-400 text-sm">
              Smooth transform animations with translateY and scale effects on hover.
            </p>
          </div>

          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Search & Filter</h3>
            <p className="text-slate-400 text-sm">
              Real-time search functionality with filtering across asset names, symbols, and sources.
            </p>
          </div>

          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <div className="w-12 h-12 bg-yellow-500 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Dark Theme</h3>
            <p className="text-slate-400 text-sm">
              Beautiful dark theme with gradient backgrounds and proper contrast for readability.
            </p>
          </div>

          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Loading States</h3>
            <p className="text-slate-400 text-sm">
              Skeleton loading animations and graceful handling of empty states.
            </p>
          </div>

          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <div className="w-12 h-12 bg-indigo-500 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Data Integration</h3>
            <p className="text-slate-400 text-sm">
              Ready to integrate with your market data service for real-time asset information.
            </p>
          </div>
        </div>
      </div>

      {/* Usage Instructions */}
      <div className="max-w-4xl mx-auto mt-16">
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h3 className="text-xl font-semibold text-white mb-4">Usage Instructions</h3>
          <div className="space-y-3 text-sm text-slate-300">
            <p>• <strong>Click on any asset card</strong> to trigger the onCardClick callback</p>
            <p>• <strong>Use the search bar</strong> to filter assets by name, symbol, or source</p>
            <p>• <strong>Switch between tabs</strong> to see different asset categories</p>
            <p>• <strong>Hover over cards</strong> to see the interactive hover effects</p>
            <p>• <strong>Responsive design</strong> automatically adapts to screen size</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssetCardGridDemo; 