import React, { useState, useEffect } from 'react';
import { backendMarketDataService } from '../services/backendMarketData';
import { tradFiDataService } from '../services/tradfiData';

const BackendStatus: React.FC = () => {
  const [status, setStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [etfData, setEtfData] = useState<any>(null);
  const [stockData, setStockData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    testBackendConnection();
  }, []);

  const testBackendConnection = async () => {
    try {
      setStatus('checking');
      setError(null);

      console.log('🧪 Testing backend connection...');
      
      // Test ETF endpoint
      console.log('📊 Testing ETF endpoint...');
      const etfResponse = await backendMarketDataService.getETFsData();
      console.log('✅ ETF data received:', etfResponse);
      setEtfData(etfResponse);

      // Test stock endpoint
      console.log('📈 Testing stock endpoint...');
      const stockResponse = await tradFiDataService.getTopStocks(5);
      console.log('✅ Stock data received:', stockResponse);
      setStockData(stockResponse);

      setStatus('connected');
    } catch (err) {
      console.error('❌ Backend test failed:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setStatus('error');
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Backend Connection Status
      </h3>
      
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${
            status === 'connected' ? 'bg-green-500' : 
            status === 'error' ? 'bg-red-500' : 'bg-yellow-500'
          }`}></div>
          <span className="text-sm font-medium">
            {status === 'connected' ? 'Connected' : 
             status === 'error' ? 'Error' : 'Checking...'}
          </span>
        </div>

        {error && (
          <div className="text-red-600 text-sm">
            Error: {error}
          </div>
        )}

        {etfData && (
          <div className="text-sm">
            <div className="font-medium text-gray-700 dark:text-gray-300">ETF Data:</div>
            <div className="text-gray-600 dark:text-gray-400">
              Type: {typeof etfData}, Length: {Array.isArray(etfData) ? etfData.length : 'N/A'}
            </div>
            <div className="text-gray-600 dark:text-gray-400">
              Sample: {JSON.stringify(etfData.slice(0, 2), null, 2)}
            </div>
          </div>
        )}

        {stockData && (
          <div className="text-sm">
            <div className="font-medium text-gray-700 dark:text-gray-300">Stock Data:</div>
            <div className="text-gray-600 dark:text-gray-400">
              Type: {typeof stockData}, Length: {Array.isArray(stockData) ? stockData.length : 'N/A'}
            </div>
            <div className="text-gray-600 dark:text-gray-400">
              Sample: {JSON.stringify(stockData.slice(0, 2), null, 2)}
            </div>
          </div>
        )}

        <button
          onClick={testBackendConnection}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Test Connection
        </button>
      </div>
    </div>
  );
};

export default BackendStatus; 