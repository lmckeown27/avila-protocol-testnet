import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import FeedbackModal from './FeedbackModal';

interface NavbarProps {}

const Navbar: React.FC<NavbarProps> = () => {
  const location = useLocation();
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <nav className="navbar bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4">
          {/* Single flex container with three columns */}
          <div className="flex justify-between items-center h-16">
            
            {/* Left Column: Logo/Brand */}
            <div className="flex-shrink-0">
              <Link to="/" className="text-xl font-bold text-gray-900 dark:text-white">
                Avila Markets
              </Link>
            </div>

            {/* Center Column: Navigation Links */}
            <div className="hidden md:flex flex-1 justify-center space-x-12">
              <Link to="/" className={`nav-link ${isActive('/') ? 'active' : ''}`}>Home</Link>
              <Link to="/tradfi-markets" className={`nav-link ${isActive('/tradfi-markets') ? 'active' : ''}`}>TradFi Markets</Link>
              <Link to="/defi-markets" className={`nav-link ${isActive('/defi-markets') ? 'active' : ''}`}>DeFi Markets</Link>
              <Link to="/defi-protocols" className={`nav-link ${isActive('/defi-protocols') ? 'active' : ''}`}>DeFi Protocols</Link>
              <Link to="/watchlist" className={`nav-link ${isActive('/watchlist') ? 'active' : ''}`}>Watchlist</Link>
            </div>

            {/* Right Column: Feedback Button Only */}
            <div className="flex-shrink-0 flex items-center">
              <button
                onClick={() => setIsFeedbackOpen(true)}
                className="btn-secondary text-sm px-3 py-2"
              >
                💬 Feedback
              </button>
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