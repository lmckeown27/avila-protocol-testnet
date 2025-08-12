import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAppStore } from '../stores/appStore';
import { walletService } from '../services/wallet';
import FeedbackModal from './FeedbackModal';
import { LogoAdaptive } from './LogoAdaptive';

export default function Navbar() {
  const { user, isConnected } = useAppStore();
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const location = useLocation();

  const handleWalletConnect = async () => {
    await walletService.connectWallet();
  };

  const handleWalletDisconnect = async () => {
    await walletService.disconnectWallet();
  };

  const isActive = (path: string) => location.pathname === path;

  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <>
      <nav className="navbar">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo and Navigation */}
            <div className="flex flex-1 justify-center">
              <div className="flex-shrink-0 flex items-center absolute left-4">
                <Link to="/" className="flex items-center">
                  <LogoAdaptive 
                    className="w-10 h-10 rounded-full mr-3"
                    alt="Avila Protocol Logo"
                  />
                  <span className="text-xl font-bold text-primary-600">Avila Protocol</span>
                </Link>
              </div>
              
              <div className="hidden sm:flex sm:space-x-8">
                                         <Link
                           to="/"
                           className={`nav-link inline-flex items-center px-1 pt-1 text-sm font-medium ${
                             isActive('/') 
                               ? 'active' 
                               : 'text-gray-500 hover:text-gray-700'
                           }`}
                         >
                           Home
                         </Link>
                                         <Link
                           to="/markets"
                           className={`nav-link inline-flex items-center px-1 pt-1 text-sm font-medium ${
                             isActive('/markets') 
                               ? 'active' 
                               : 'text-gray-500 hover:text-gray-700'
                           }`}
                         >
                           Markets
                         </Link>
                                         <Link
                           to="/trade"
                           className={`nav-link inline-flex items-center px-1 pt-1 text-sm font-medium ${
                             isActive('/trade') 
                               ? 'active' 
                               : 'text-gray-500 hover:text-gray-700'
                           }`}
                         >
                           Trade
                         </Link>
                                         <Link
                           to="/portfolio"
                           className={`nav-link inline-flex items-center px-1 pt-1 text-sm font-medium ${
                             isActive('/portfolio') 
                               ? 'active' 
                               : 'text-gray-500 hover:text-gray-700'
                           }`}
                         >
                           Portfolio
                         </Link>
                                         <Link
                           to="/governance"
                           className={`nav-link inline-flex items-center px-1 pt-1 text-sm font-medium ${
                             isActive('/governance') 
                               ? 'active' 
                               : 'text-gray-500 hover:text-gray-700'
                           }`}
                         >
                           Governance
                         </Link>
                                         <Link
                           to="/admin"
                           className={`nav-link inline-flex items-center px-1 pt-1 text-sm font-medium ${
                             isActive('/admin') 
                               ? 'active' 
                               : 'text-gray-500 hover:text-gray-700'
                           }`}
                         >
                           Admin
                         </Link>
              </div>
              
              {/* Mobile menu button */}
              <div className="sm:hidden">
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
                >
                  <span className="sr-only">Open main menu</span>
                  {isMobileMenuOpen ? (
                    <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Right side - Feedback and Wallet */}
            <div className="flex items-center space-x-4">
                                   {/* Dark Mode Toggle */}
                     <button
                       onClick={toggleDarkMode}
                       className="btn-secondary inline-flex items-center px-3 py-2 text-sm leading-4 font-medium"
                       title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                     >
                       {isDarkMode ? "☀️" : "🌙"}
                     </button>

                     {/* Feedback Button */}
                                     <button
                         onClick={() => setIsFeedbackOpen(true)}
                         className="btn-secondary inline-flex items-center px-3 py-2 text-sm leading-4 font-medium"
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
                             className="btn-secondary inline-flex items-center px-3 py-2 text-sm leading-4 font-medium"
                           >
                             Disconnect
                           </button>
                </div>
              ) : (
                                         <button
                           onClick={handleWalletConnect}
                           className="btn-primary inline-flex items-center px-4 py-2 text-sm font-medium"
                         >
                           Connect Wallet
                         </button>
              )}
            </div>
          </div>
        </div>
        
        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="sm:hidden">
            <div className="pt-2 pb-3 space-y-1 bg-white border-t border-gray-200">
              <Link
                to="/"
                className={`block px-3 py-2 text-base font-medium rounded-md ${
                  isActive('/') 
                    ? 'bg-primary-50 text-primary-700' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Home
              </Link>
              <Link
                to="/markets"
                className={`block px-3 py-2 text-base font-medium rounded-md ${
                  isActive('/markets') 
                    ? 'bg-primary-50 text-primary-700' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Markets
              </Link>
              <Link
                to="/trade"
                className={`block px-3 py-2 text-base font-medium rounded-md ${
                  isActive('/trade') 
                    ? 'bg-primary-50 text-primary-700' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Trade
              </Link>
              <Link
                to="/portfolio"
                className={`block px-3 py-2 text-base font-medium rounded-md ${
                  isActive('/portfolio') 
                    ? 'bg-primary-50 text-primary-700' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Portfolio
              </Link>
              <Link
                to="/governance"
                className={`block px-3 py-2 text-base font-medium rounded-md ${
                  isActive('/governance') 
                    ? 'bg-primary-50 text-primary-700' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Governance
              </Link>
              <Link
                to="/admin"
                className={`block px-3 py-2 text-base font-medium rounded-md ${
                  isActive('/admin') 
                    ? 'bg-primary-50 text-primary-700' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Admin
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Feedback Modal */}
      <FeedbackModal 
        isOpen={isFeedbackOpen} 
        onClose={() => setIsFeedbackOpen(false)} 
      />
    </>
  );
} 