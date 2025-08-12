import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import { Analytics } from '@vercel/analytics/react';
import Navbar from './components/Navbar';
import TestnetBanner from './components/NotificationContainer';
import Home from './pages/Home';
import Markets from './pages/Markets';
import TradFiMarkets from './pages/TradFiMarkets';
import DeFiMarkets from './pages/DeFiMarkets';
import Trade from './pages/Trade';
import Portfolio from './pages/Portfolio';
import Governance from './pages/Governance';
import Admin from './pages/Admin';
import { useAppStore } from './stores/appStore';
import { aptosService } from './services/aptos';

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

    initializeApp();
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
            <Route path="/trade" element={<Trade />} />
            <Route path="/portfolio" element={<Portfolio />} />
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
