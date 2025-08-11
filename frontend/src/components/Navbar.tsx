import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAppStore } from '../stores/appStore';
import { walletService } from '../services/wallet';
import FeedbackModal from './FeedbackModal';

export default function Navbar() {
  const { user, isConnected } = useAppStore();
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const location = useLocation();

  const handleWalletConnect = async () => {
    await walletService.connectWallet();
  };

  const handleWalletDisconnect = async () => {
    await walletService.disconnectWallet();
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo and Navigation */}
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link to="/" className="text-xl font-bold text-primary-600">
                  Avila Protocol
                </Link>
              </div>
              
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link
                  to="/"
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    isActive('/') 
                      ? 'border-primary-500 text-gray-900' 
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  Home
                </Link>
                <Link
                  to="/markets"
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    isActive('/markets') 
                      ? 'border-primary-500 text-gray-900' 
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  Markets
                </Link>
                <Link
                  to="/trade"
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    isActive('/trade') 
                      ? 'border-primary-500 text-gray-900' 
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  Trade
                </Link>
                <Link
                  to="/portfolio"
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    isActive('/portfolio') 
                      ? 'border-primary-500 text-gray-900' 
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  Portfolio
                </Link>
                <Link
                  to="/governance"
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    isActive('/governance') 
                      ? 'border-primary-500 text-gray-900' 
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  Governance
                </Link>
                <Link
                  to="/admin"
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    isActive('/admin') 
                      ? 'border-primary-500 text-gray-900' 
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  Admin
                </Link>
              </div>
            </div>

            {/* Right side - Feedback and Wallet */}
            <div className="flex items-center space-x-4">
              {/* Feedback Button */}
              <button
                onClick={() => setIsFeedbackOpen(true)}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-primary-700 bg-primary-100 hover:bg-primary-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                💬 Feedback
              </button>

              {/* Wallet Connection */}
              {isConnected ? (
                <div className="flex items-center space-x-3">
                  <div className="text-sm text-gray-700">
                    <span className="font-medium">
                      {user?.address.slice(0, 6)}...{user?.address.slice(-4)}
                    </span>
                    {user?.isAdmin && (
                      <span className="ml-2 px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                        Admin
                      </span>
                    )}
                  </div>
                  <button
                    onClick={handleWalletDisconnect}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleWalletConnect}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Connect Wallet
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Feedback Modal */}
      <FeedbackModal 
        isOpen={isFeedbackOpen} 
        onClose={() => setIsFeedbackOpen(false)} 
      />
    </>
  );
} 