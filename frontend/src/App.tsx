import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import { Analytics } from '@vercel/analytics/react';
import Navbar from './components/Navbar';
import TestnetBanner from './components/NotificationContainer';
import Home from './pages/Home';
import Markets from './pages/Markets';
import TradFiMarkets from './pages/TradFiMarkets';
import DeFiMarkets from './pages/DeFiMarkets';
import DeFiProtocols from './pages/DeFiProtocols';
import Watchlist from './components/Watchlist';
import Governance from './pages/Governance';
import Admin from './pages/Admin';
import { useAppStore } from './stores/appStore';
import { aptosService } from './services/aptos';
import { runAllBackendTests } from './utils/testBackendConnection';

function App() {
  const { setLoading, setError } = useAppStore();

  useEffect(() => {
    // Initialize Aptos connection
    const initializeApp = async () => {
      try {
        setLoading(true);
        const connected = await aptosService.initialize();
        if (!connected) {
          setError('Failed to connect to Aptos testnet');
        }
      } catch (error) {
        console.error('Failed to initialize app:', error);
        setError('Failed to initialize application');
      } finally {
        setLoading(false);
      }
    };

    // Test backend connectivity
    const testBackend = async () => {
      try {
        console.log('🧪 Testing backend connectivity...');
        await runAllBackendTests();
      } catch (error) {
        console.error('❌ Backend connectivity test failed:', error);
      }
    };

    initializeApp();
    testBackend();
  }, [setLoading, setError]);

  return (
    <Router>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Analytics />
        <TestnetBanner />
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/markets" element={<Markets />} />
            <Route path="/tradfi-markets" element={<TradFiMarkets />} />
            <Route path="/defi-markets" element={<DeFiMarkets />} />
                    <Route path="/defi-protocols" element={<DeFiProtocols />} />
                <Route path="/watchlist" element={<Watchlist />} />
        <Route path="/portfolio" element={<Watchlist />} />
            <Route path="/governance" element={<Governance />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="*" element={<Home />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
