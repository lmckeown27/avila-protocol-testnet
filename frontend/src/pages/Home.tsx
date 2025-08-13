import { Link } from 'react-router-dom';
import { useAppStore } from '../stores/appStore';
import { Shield, TrendingUp, Zap, Users, Globe, BarChart3 } from 'lucide-react';

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

      {/* Features Section */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              Why Choose Avila Protocol?
            </h2>
            <p className="mt-4 max-w-2xl text-xl text-gray-500 lg:mx-auto">
              Built for traders, by traders, with cutting-edge technology and security.
            </p>
          </div>

          <div className="mt-20">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {/* Feature 1 */}
              <div className="text-center">
                <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white mx-auto">
                  <Shield className="h-6 w-6" />
                </div>
                <h3 className="mt-6 text-lg font-medium text-gray-900">Secure & Reliable</h3>
                <p className="mt-2 text-base text-gray-500">
                  Built on Aptos blockchain with advanced security measures and audited smart contracts.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="text-center">
                <div className="flex items-center justify-center h-12 w-12 rounded-md bg-green-500 text-white mx-auto">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <h3 className="mt-6 text-lg font-medium text-gray-900">Advanced Trading</h3>
                <p className="mt-2 text-base text-gray-500">
                  Professional-grade options trading with sophisticated risk management tools.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="text-center">
                <div className="flex items-center justify-center h-12 w-12 rounded-md bg-purple-500 text-white mx-auto">
                  <Zap className="h-6 w-6" />
                </div>
                <h3 className="mt-6 text-lg font-medium text-gray-900">High Performance</h3>
                <p className="mt-2 text-base text-gray-500">
                  Lightning-fast execution with sub-second settlement times on Aptos.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="text-center">
                <div className="flex items-center justify-center h-12 w-12 rounded-md bg-orange-500 text-white mx-auto">
                  <Users className="h-6 w-6" />
                </div>
                <h3 className="mt-6 text-lg font-medium text-gray-900">Community Driven</h3>
                <p className="mt-2 text-base text-gray-500">
                  Governed by the community with transparent decision-making processes.
                </p>
              </div>

              {/* Feature 5 */}
              <div className="text-center">
                <div className="flex items-center justify-center h-12 w-12 rounded-md bg-red-500 text-white mx-auto">
                  <Globe className="h-6 w-6" />
                </div>
                <h3 className="mt-6 text-lg font-medium text-gray-900">Global Access</h3>
                <p className="mt-2 text-base text-gray-500">
                  Available 24/7 to traders worldwide with no geographical restrictions.
                </p>
              </div>

              {/* Feature 6 */}
              <div className="text-center">
                <div className="flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white mx-auto">
                  <BarChart3 className="h-6 w-6" />
                </div>
                <h3 className="mt-6 text-lg font-medium text-gray-900">Advanced Analytics</h3>
                <p className="mt-2 text-base text-gray-500">
                  Comprehensive market data and analytics for informed trading decisions.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gray-50">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:py-16 lg:px-8 lg:flex lg:items-center lg:justify-between">
          <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
            <span className="block">Ready to explore markets?</span>
            <span className="block text-blue-600">Experience Avila Protocol's testnet today.</span>
          </h2>
        </div>
      </div>
    </div>
  );
} 