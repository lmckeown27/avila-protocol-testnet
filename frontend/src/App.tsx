import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import { useAppStore } from './stores/appStore';
import { config } from './config/environment';

// Components
import Navbar from './components/Navbar.tsx';
import TestnetBanner from './components/TestnetBanner.tsx';
import NotificationContainer from './components/NotificationContainer.tsx';

// Pages
import Home from './pages/Home.tsx';
import Markets from './pages/Markets.tsx';
import Trade from './pages/Trade.tsx';
import Portfolio from './pages/Portfolio.tsx';
import Governance from './pages/Governance.tsx';
import Admin from './pages/Admin.tsx';

// Services
import { aptosService } from './services/aptos.ts';

function App() {
  const { isLoading, setLoading, setError } = useAppStore();

  useEffect(() => {
    const initializeApp = async () => {
      try {
        setLoading(true);
        
        // Initialize Aptos connection
        const connected = await aptosService.initialize();
        if (!connected) {
          setError('Failed to connect to Aptos testnet');
        }
        
        // Load mock assets for testnet
        if (config.testnet.isTestnet) {
          // TODO: Load assets from price oracle
          console.log('Testnet mode: Loading mock assets');
        }
        
      } catch (error) {
        console.error('Failed to initialize app:', error);
        setError('Failed to initialize application');
      } finally {
        setLoading(false);
      }
    };

    initializeApp();
  }, [setLoading, setError]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Initializing Avila Protocol...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        {/* Testnet Banner */}
        <TestnetBanner />
        
        {/* Navigation */}
        <Navbar />
        
        {/* Main Content */}
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/markets" element={<Markets />} />
            <Route path="/trade" element={<Trade />} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/governance" element={<Governance />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </main>
        
        {/* Notifications */}
        <NotificationContainer />
      </div>
    </Router>
  );
}

export default App;
