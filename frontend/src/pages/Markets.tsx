import MarketDashboard from '../components/MarketDashboard';

const Markets = () => {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Markets Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Real-time TradFi and DeFi market data
        </p>
      </div>

      {/* MarketDashboard Component - TradFi and DeFi Markets */}
      <MarketDashboard />

      {/* Testnet Notice */}
      <div className="card animate-fade-in-up">
        <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
          🧪 Testnet Environment Notice
        </h3>
        <p className="text-yellow-700 dark:text-yellow-300 text-sm leading-relaxed">
          This is a testnet environment for the Avila Protocol. Market data is sourced from real APIs but trading functionality is simulated for testing purposes.
        </p>
      </div>
    </div>
  );
};

export default Markets; 