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
      <nav className="navbar">
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
            </div>

            {/* Right side - Feedback and Wallet */}
            <div className="flex items-center space-x-4">
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
      </nav>

      {/* Feedback Modal */}
      <FeedbackModal 
        isOpen={isFeedbackOpen} 
        onClose={() => setIsFeedbackOpen(false)} 
      />
    </>
  );
} 