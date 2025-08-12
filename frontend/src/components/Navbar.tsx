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
          <div className="flex items-center justify-between h-16">
            {/* Logo/Brand */}
            <div className="flex items-center flex-shrink-0">
              <Link to="/" className="text-xl font-bold text-gray-900 dark:text-white">
                Avila Protocol
              </Link>
            </div>

            {/* Centered Navigation Links */}
            <div className="hidden md:flex items-center justify-center absolute left-1/2 transform -translate-x-1/2">
              <div className="flex items-center space-x-8">
                <Link to="/" className={`nav-link ${isActive('/') ? 'active' : ''}`}>Home</Link>
                <Link to="/markets" className={`nav-link ${isActive('/markets') ? 'active' : ''}`}>Markets</Link>
                <Link to="/tradfi-markets" className={`nav-link ${isActive('/tradfi-markets') ? 'active' : ''}`}>TradFi Markets</Link>
                <Link to="/defi-markets" className={`nav-link ${isActive('/defi-markets') ? 'active' : ''}`}>DeFi Markets</Link>
                <Link to="/trade" className={`nav-link ${isActive('/trade') ? 'active' : ''}`}>Trade</Link>
                <Link to="/portfolio" className={`nav-link ${isActive('/portfolio') ? 'active' : ''}`}>Portfolio</Link>
                <Link to="/governance" className={`nav-link ${isActive('/governance') ? 'active' : ''}`}>Governance</Link>
                <Link to="/admin" className={`nav-link ${isActive('/admin') ? 'active' : ''}`}>Admin</Link>
              </div>
            </div>

            {/* Right Side */}
            <div className="flex items-center space-x-4 flex-shrink-0">
              {/* Feedback Button */}
              <button
                onClick={() => setIsFeedbackOpen(true)}
                className="btn-secondary text-sm px-3 py-2"
              >
                💬 Feedback
              </button>

              {/* Wallet Connection */}
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