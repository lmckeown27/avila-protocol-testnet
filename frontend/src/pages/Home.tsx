import { Link } from 'react-router-dom';
import { useAppStore } from '../stores/appStore';

export default function Home() {
  const { isConnected } = useAppStore();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Hero Section */}
                     <div className="text-center py-16 animate-fade-in-up">
                 <h1 className="text-4xl font-bold sm:text-5xl md:text-6xl">
                   Welcome to{' '}
                   <span className="gradient-text">Avila Protocol</span>
                 </h1>
        <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
          A decentralized options trading platform built on Aptos blockchain
        </p>
                         <div className="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
                   {!isConnected ? (
                     <div className="rounded-md shadow">
                       <Link
                         to="/trade"
                         className="btn-primary w-full flex items-center justify-center px-8 py-3 text-base font-medium md:py-4 md:text-lg md:px-10"
                       >
                         🚀 Get Started
                       </Link>
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
            <div className="feature-grid">
              <div className="feature-item animate-fade-in-up">
                <div className="feature-icon">📊</div>
                <h3 className="text-lg leading-6 font-medium text-gray-900">Real-time Trading</h3>
                <p className="mt-2 text-base text-gray-500">
                  Execute options trades with real-time market data and instant settlement
                </p>
              </div>

              <div className="feature-item animate-fade-in-up">
                <div className="feature-icon">🔒</div>
                <h3 className="text-lg leading-6 font-medium text-gray-900">Secure & Transparent</h3>
                <p className="mt-2 text-base text-gray-500">
                  Built on Aptos blockchain with smart contract security and transparent operations
                </p>
              </div>

              <div className="feature-item animate-fade-in-up">
                <div className="feature-icon">⚡</div>
                <h3 className="text-lg leading-6 font-medium text-gray-900">Advanced Risk Management</h3>
                <p className="mt-2 text-base text-gray-500">
                  Sophisticated margin management and risk controls for institutional-grade trading
                </p>
              </div>

              <div className="feature-item animate-fade-in-up">
                <div className="feature-icon">👥</div>
                <h3 className="text-lg leading-6 font-medium text-gray-900">Governance & Compliance</h3>
                <p className="mt-2 text-base text-gray-500">
                  Community-driven governance with built-in compliance and KYC verification
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Testnet Information */}
      <div className="card animate-fade-in-up my-8">
        <div className="flex items-center">
          <div className="ml-3">
            <h3 className="text-lg font-semibold text-yellow-800 mb-2">
              🧪 Testnet Environment
            </h3>
            <div className="text-sm text-yellow-700">
              <p className="leading-relaxed">
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
            <div className="feature-grid">
              <div className="feature-item text-center animate-fade-in-up">
                <div className="feature-icon">1</div>
                <h3 className="mt-6 text-lg font-medium text-gray-900">Connect Wallet</h3>
                <p className="mt-2 text-base text-gray-500">
                  Connect your Petra or Pontem wallet to access the platform
                </p>
              </div>

              <div className="feature-item text-center animate-fade-in-up">
                <div className="feature-icon">2</div>
                <h3 className="mt-6 text-lg font-medium text-gray-900">Explore Markets</h3>
                <p className="mt-2 text-base text-gray-500">
                  Browse available options and mock assets in the Markets section
                </p>
              </div>

              <div className="feature-item text-center animate-fade-in-up">
                <div className="feature-icon">3</div>
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
              className="btn-primary inline-flex items-center px-6 py-3 text-base font-medium"
            >
              💬 Provide Feedback
            </button>
            <Link
              to="/markets"
              className="btn-secondary inline-flex items-center px-6 py-3 text-base font-medium"
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