import { Link } from 'react-router-dom';
import { useAppStore } from '../stores/appStore';

export default function Home() {
  const { isConnected } = useAppStore();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Hero Section */}
      <div className="hero-section text-center py-16 animate-fade-in-up">
        <h1 className="hero-title text-4xl font-bold sm:text-5xl md:text-6xl">
          <span className="gradient-text">Avila Markets</span>
        </h1>
        <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
          Market Monitoring Platform
        </p>
        <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
          Avila Markets is a comprehensive market monitoring platform for both Stock Market and Digital Assets markets. Monitor real-time market data, create custom watchlists, and track your favorite assets across multiple exchanges and protocols.
        </p>
        
        {/* Stock Market, Digital Assets, and ETF Market Buttons */}
        <div className="mt-6 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
          <div className="button-row flex flex-wrap justify-center gap-4">
            <div className="rounded-md shadow">
              <Link
                to="/stock-market"
                className="btn-primary flex items-center justify-center px-6 py-3 text-base font-medium md:py-4 md:text-lg md:px-8"
              >
                📈 Stock Market
              </Link>
            </div>
            <div className="rounded-md shadow">
              <Link
                to="/digital-assets"
                className="btn-primary flex items-center justify-center px-6 py-3 text-base font-medium md:py-4 md:text-lg md:px-8"
              >
                🌐 Digital Assets
              </Link>
            </div>
            <div className="rounded-md shadow">
              <Link
                to="/etf-market"
                className="btn-primary flex items-center justify-center px-6 py-3 text-base font-medium md:py-4 md:text-lg md:px-8"
              >
                📊 ETF Market
              </Link>
            </div>
            <div className="rounded-md shadow">
              <Link
                to="/watchlist"
                className="btn-primary flex items-center justify-center px-6 py-3 text-base font-medium md:py-4 md:text-lg md:px-8"
              >
                ⭐ Watchlist
              </Link>
            </div>
          </div>
        </div>
        
        <div className="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
          {/* Wallet Connection - Restored */}
          {!isConnected ? (
            <div className="rounded-md shadow">
              {/* Get Started button removed */}
            </div>
          ) : (
            <div className="rounded-md shadow">
              <Link
                to="/watchlist"
                className="btn-primary w-full flex items-center justify-center px-8 py-3 text-base font-medium md:py-4 md:text-lg md:px-10"
              >
                ⭐ View Watchlist
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gray-50">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:py-16 lg:px-8 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
            <span className="block cta-heading">Real-Time Market Monitoring</span>
            <span className="block cta-subtext">Track Stock Market and Digital Assets markets with advanced watchlist capabilities</span>
          </h2>
        </div>
      </div>
    </div>
  );
} 