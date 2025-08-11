import { Link } from 'react-router-dom';
import { useAppStore } from '../stores/appStore';

export default function Home() {
  const { isConnected } = useAppStore();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Hero Section */}
      <div className="text-center py-16">
        <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl">
          Welcome to{' '}
          <span className="text-primary-600">Avila Protocol</span>
        </h1>
        <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
          A decentralized options trading platform built on Aptos blockchain
        </p>
        <div className="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
          {!isConnected ? (
            <div className="rounded-md shadow">
              <Link
                to="/trade"
                className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 md:py-4 md:text-lg md:px-10"
              >
                Get Started
              </Link>
            </div>
          ) : (
            <div className="rounded-md shadow">
              <Link
                to="/portfolio"
                className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 md:py-4 md:text-lg md:px-10"
              >
                View Portfolio
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Features Grid */}
      <div className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:text-center">
            <h2 className="text-base text-primary-600 font-semibold tracking-wide uppercase">Features</h2>
            <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              Advanced Options Trading
            </p>
            <p className="mt-4 max-w-2xl text-xl text-gray-500 lg:mx-auto">
              Experience the future of decentralized finance with our comprehensive options trading platform
            </p>
          </div>

          <div className="mt-10">
            <div className="space-y-10 md:space-y-0 md:grid md:grid-cols-2 md:gap-x-8 md:gap-y-10">
              <div className="relative">
                <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-primary-500 text-white">
                  <span className="text-lg font-bold">📊</span>
                </div>
                <p className="ml-16 text-lg leading-6 font-medium text-gray-900">Real-time Trading</p>
                <p className="mt-2 ml-16 text-base text-gray-500">
                  Execute options trades with real-time market data and instant settlement
                </p>
              </div>

              <div className="relative">
                <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-primary-500 text-white">
                  <span className="text-lg font-bold">🔒</span>
                </div>
                <p className="ml-16 text-lg leading-6 font-medium text-gray-900">Secure & Transparent</p>
                <p className="mt-2 ml-16 text-base text-gray-500">
                  Built on Aptos blockchain with smart contract security and transparent operations
                </p>
              </div>

              <div className="relative">
                <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-primary-500 text-white">
                  <span className="text-lg font-bold">⚡</span>
                </div>
                <p className="ml-16 text-lg leading-6 font-medium text-gray-900">Advanced Risk Management</p>
                <p className="mt-2 ml-16 text-base text-gray-500">
                  Sophisticated margin management and risk controls for institutional-grade trading
                </p>
              </div>

              <div className="relative">
                <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-primary-500 text-white">
                  <span className="text-lg font-bold">👥</span>
                </div>
                <p className="ml-16 text-lg leading-6 font-medium text-gray-900">Governance & Compliance</p>
                <p className="mt-2 ml-16 text-base text-gray-500">
                  Community-driven governance with built-in compliance and KYC verification
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Testnet Information */}
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 my-8">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">
              Testnet Environment
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>
                This is a testnet version of Avila Protocol. All trading is simulated with mock assets.
                No real funds are at risk. This environment is designed for testing and feedback purposes.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Start Guide */}
      <div className="py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:text-center">
            <h2 className="text-base text-primary-600 font-semibold tracking-wide uppercase">Quick Start</h2>
            <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              Get Started in Minutes
            </p>
          </div>

          <div className="mt-10">
            <div className="space-y-10 md:space-y-0 md:grid md:grid-cols-3 md:gap-x-8 md:gap-y-10">
              <div className="text-center">
                <div className="flex items-center justify-center h-12 w-12 rounded-md bg-primary-500 text-white mx-auto">
                  <span className="text-lg font-bold">1</span>
                </div>
                <h3 className="mt-6 text-lg font-medium text-gray-900">Connect Wallet</h3>
                <p className="mt-2 text-base text-gray-500">
                  Connect your Petra or Pontem wallet to access the platform
                </p>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center h-12 w-12 rounded-md bg-primary-500 text-white mx-auto">
                  <span className="text-lg font-bold">2</span>
                </div>
                <h3 className="mt-6 text-lg font-medium text-gray-900">Explore Markets</h3>
                <p className="mt-2 text-base text-gray-500">
                  Browse available options and mock assets in the Markets section
                </p>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center h-12 w-12 rounded-md bg-primary-500 text-white mx-auto">
                  <span className="text-lg font-bold">3</span>
                </div>
                <h3 className="mt-6 text-lg font-medium text-gray-900">Start Trading</h3>
                <p className="mt-2 text-base text-gray-500">
                  Place mock orders and explore the trading interface
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Feedback Call-to-Action */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Help Us Improve Avila Protocol
          </h2>
          <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">
            This is a testnet version designed to gather user feedback. Your input helps us build a better 
            options trading platform for the decentralized finance ecosystem.
          </p>
          <div className="mt-8 flex justify-center space-x-4">
            <button
              onClick={() => {
                // This will be handled by the navbar feedback button
                const feedbackButton = document.querySelector('[onclick*="setIsFeedbackOpen"]') as HTMLButtonElement;
                if (feedbackButton) feedbackButton.click();
              }}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              💬 Provide Feedback
            </button>
            <Link
              to="/markets"
              className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Explore Markets
            </Link>
          </div>
          <p className="mt-4 text-sm text-gray-400">
            Your feedback shapes the future of decentralized options trading
          </p>
        </div>
      </div>
    </div>
  );
} 