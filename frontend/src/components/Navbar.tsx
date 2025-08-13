import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useAppStore } from '../stores/appStore';
import { walletService } from '../services/wallet';
import FeedbackModal from './FeedbackModal';

const Navbar = () => {
  const location = useLocation();
  const { isConnected } = useAppStore();
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const handleConnectWallet = async () => {
    try {
      await walletService.connectWallet();
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  };

  const handleDisconnectWallet = async () => {
    try {
      await walletService.disconnectWallet();
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
    }
  };

  return (
    <>
      <nav className="navbar bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4">
          {/* Single flex container with three columns */}
          <div className="flex justify-between items-center h-16">
            
            {/* Left Column: Logo/Brand */}
            <div className="flex-shrink-0">
              <Link to="/" className="text-xl font-bold text-gray-900 dark:text-white">
                Avila Protocol
              </Link>
            </div>

            {/* Center Column: Navigation Links */}
            <div className="hidden md:flex flex-1 justify-center space-x-12">
              <Link to="/" className={`nav-link ${isActive('/') ? 'active' : ''}`}>Home</Link>
              <Link to="/tradfi-markets" className={`nav-link ${isActive('/tradfi-markets') ? 'active' : ''}`}>TradFi Markets</Link>
              <Link to="/defi-markets" className={`nav-link ${isActive('/defi-markets') ? 'active' : ''}`}>DeFi Markets</Link>
              <Link to="/portfolio" className={`nav-link ${isActive('/portfolio') ? 'active' : ''}`}>Portfolio</Link>
            </div>

            {/* Right Column: Feedback and Wallet Buttons */}
            <div className="flex-shrink-0 flex items-center space-x-4">
              <button
                onClick={() => setIsFeedbackOpen(true)}
                className="btn-secondary text-sm px-3 py-2"
              >
                💬 Feedback
              </button>

              {isConnected ? (
                <button
                  onClick={handleDisconnectWallet}
                  className="btn-primary text-sm px-4 py-2"
                >
                  Disconnect Wallet
                </button>
              ) : (
                <button
                  onClick={handleConnectWallet}
                  className="btn-primary text-sm px-4 py-2"
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
};

export default Navbar; 