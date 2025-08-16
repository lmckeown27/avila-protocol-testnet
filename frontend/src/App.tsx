import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import { Analytics } from '@vercel/analytics/react';
import Navbar from './components/Navbar';
import TestnetBanner from './components/NotificationContainer';
import Home from './pages/Home';
import Markets from './pages/Markets';
import StockMarket from './pages/TradFiMarkets';
import DigitalAssets from './pages/DeFiMarkets';
import ETFMarket from './pages/ETFMarket';
import DeFiProtocols from './pages/DeFiProtocols';
import Watchlist from './components/Watchlist';
import Governance from './pages/Governance';
import Admin from './pages/Admin';
import { useAppStore } from './stores/appStore';
import { aptosService } from './services/aptos';
import { runAllBackendTests, testBackendFromBrowser } from './utils/testBackendConnection';

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
        
        // Also run browser-specific test
        console.log('🌐 Running browser-specific backend test...');
        await testBackendFromBrowser();
      } catch (error) {
        console.error('❌ Backend connectivity test failed:', error);
      }
    };

    initializeApp();
    testBackend();
    
    // Add global test function for manual testing
    (window as any).testBackendConnection = testBackendFromBrowser;
    console.log('🔧 Manual test function available: testBackendConnection()');
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
            <Route path="/stock-market" element={<StockMarket />} />
        <Route path="/digital-assets" element={<DigitalAssets />} />
        <Route path="/etf-market" element={<ETFMarket />} />
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
