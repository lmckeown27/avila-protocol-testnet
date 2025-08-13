import { Link } from 'react-router-dom';
import { useAppStore } from '../stores/appStore';

export default function Home() {
  const { isConnected } = useAppStore();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Hero Section */}
      <div className="hero-section text-center py-16 animate-fade-in-up">
        <h1 className="hero-title text-4xl font-bold sm:text-5xl md:text-6xl">
          <span className="gradient-text">Avila Protocol</span>
        </h1>
        <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
          Avila Protocol is currently in testnet, working towards becoming the first decentralized options-with-expirys platform on Aptos that interacts with TradFi Markets. For now, it serves as a mock trading platform designed to develop its UI, learn how to pull data for TradFi and DeFi Markets, and teach users how to trade both traditional and decentralized assets.
        </p>
        
        {/* TradFi and DeFi Markets Buttons */}
        <div className="mt-6 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
          <div className="button-row flex">
            <div className="rounded-md shadow">
              <Link
                to="/tradfi-markets"
                className="btn-primary flex items-center justify-center px-6 py-3 text-base font-medium md:py-4 md:text-lg md:px-8"
              >
                🏛️ TradFi Markets
              </Link>
            </div>
            <div className="rounded-md shadow">
              <Link
                to="/defi-markets"
                className="btn-primary flex items-center justify-center px-6 py-3 text-base font-medium md:py-4 md:text-lg md:px-8"
              >
                🌐 DeFi Markets
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
                to="/portfolio"
                className="btn-primary w-full flex items-center justify-center px-8 py-3 text-base font-medium md:py-4 md:text-lg md:px-10"
              >
                📊 View Portfolio
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gray-50">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:py-16 lg:px-8 lg:flex lg:items-center lg:justify-between">
          <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
            <span className="block">Currently in Testnet</span>
            <span className="block text-blue-600">Help us develop and test the future of decentralized options trading.</span>
          </h2>
        </div>
      </div>
    </div>
  );
} 