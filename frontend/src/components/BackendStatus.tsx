import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Activity, RefreshCw } from 'lucide-react';
import { backendMarketDataService, NormalizedAsset } from '../services/backendMarketData';
import { config } from '../config/environment';

const BackendStatus = () => {
  const [status, setStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [sampleData, setSampleData] = useState<NormalizedAsset[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkBackendStatus();
  }, []);

  const checkBackendStatus = async () => {
    setLoading(true);
    try {
      // Test backend connectivity by trying to fetch market data
      const data = await backendMarketDataService.getTradFiData();
      if (data && data.length > 0) {
        setStatus('connected');
        setSampleData(data.slice(0, 3)); // Show first 3 assets
      } else {
        setStatus('error');
      }
    } catch (error) {
      console.error('Backend connection failed:', error);
      setStatus('error');
    } finally {
      setLoading(false);
      setLastCheck(new Date());
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Activity className="w-5 h-5 text-yellow-500 animate-pulse" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected':
        return 'Backend Connected';
      case 'error':
        return 'Backend Error';
      default:
        return 'Checking Backend...';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Backend Status
        </h3>
        <button
          onClick={checkBackendStatus}
          disabled={loading}
          className="flex items-center space-x-2 px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-md hover:bg-blue-200 dark:hover:bg-blue-800 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="flex items-center space-x-3 mb-4">
        {getStatusIcon()}
        <span className={`font-medium ${
          status === 'connected' ? 'text-green-600 dark:text-green-400' :
          status === 'error' ? 'text-red-600 dark:text-red-400' :
          'text-yellow-600 dark:text-yellow-400'
        }`}>
          {getStatusText()}
        </span>
      </div>

      {lastCheck && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Last checked: {lastCheck.toLocaleTimeString()}
        </p>
      )}

      {status === 'connected' && sampleData.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Sample Data (First 3 Assets):
          </h4>
          <div className="space-y-2">
            {sampleData.map((asset, index) => (
              <div key={index} className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">{asset.symbol}</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  ${asset.price.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <p className="text-sm text-red-700 dark:text-red-300">
            Unable to connect to backend server. Backend URL: {config.backend.baseUrl}
          </p>
        </div>
      )}
    </div>
  );
};

export default BackendStatus; 