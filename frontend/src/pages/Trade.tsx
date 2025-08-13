import { useState } from 'react';
import { useAppStore } from '../stores/appStore';

interface Asset {
  ticker: string;
  name: string;
  decimals: number;
  initialPrice: number;
}

// Mock config for testnet
const config = {
  testnet: {
    mockAssets: [
      { ticker: 'ETH', name: 'Ethereum', decimals: 8, initialPrice: 2500 },
      { ticker: 'BTC', name: 'Bitcoin', decimals: 8, initialPrice: 45000 },
      { ticker: 'SOL', name: 'Solana', decimals: 8, initialPrice: 100 }
    ]
  }
};

export default function Trade() {
  const { isConnected } = useAppStore();
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [orderType, setOrderType] = useState<'call' | 'put'>('call');
  const [quantity, setQuantity] = useState(1);
  const [strikePrice, setStrikePrice] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [premium, setPremium] = useState(0);

  const handlePlaceOrder = () => {
    // Placeholder for order placement logic
    console.log('Placing order:', { selectedAsset, orderType, quantity, strikePrice, expirationDate, premium });
  };

  // Wallet connection check - restored
  if (!isConnected) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Connect Wallet to Trade</h2>
          <p className="text-gray-600 mb-6">You need to connect your wallet to access the trading interface.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Trade Options</h1>
        </div>

      {/* Asset Selection */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Asset</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {config.testnet.mockAssets.map((asset) => (
            <div
              key={asset.ticker}
              className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                selectedAsset?.ticker === asset.ticker
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedAsset(asset)}
            >
              <div className="font-medium text-gray-900">{asset.ticker}</div>
              <div className="text-sm text-gray-500">{asset.name}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Trading Interface */}
      {selectedAsset && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Place Order</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Order Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Order Type
              </label>
              <select
                value={orderType}
                onChange={(e) => setOrderType(e.target.value as 'call' | 'put')}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  orderType === 'call'
                    ? 'border-blue-300 text-blue-700 hover:bg-blue-50'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <option value="call">Call Option</option>
                <option value="put">Put Option</option>
              </select>
            </div>

            {/* Strike Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Strike Price
              </label>
              <input
                type="number"
                value={strikePrice}
                onChange={(e) => setStrikePrice(e.target.value)}
                step="0.01"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  parseFloat(strikePrice) === selectedAsset.initialPrice
                    ? 'border-blue-300 text-blue-700 hover:bg-blue-50'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              />
            </div>

            {/* Expiration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expiration Date
              </label>
              <input
                type="date"
                value={expirationDate}
                onChange={(e) => setExpirationDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  expirationDate === ''
                    ? 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    : 'border-blue-300 text-blue-700 hover:bg-blue-50'
                }`}
              />
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantity (Contracts)
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value))}
                min="1"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  quantity === 1
                    ? 'border-blue-300 text-blue-700 hover:bg-blue-50'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              />
            </div>

            {/* Premium */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Premium per Contract
              </label>
              <input
                type="number"
                value={premium}
                onChange={(e) => setPremium(parseFloat(e.target.value))}
                step="0.01"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  premium === 0
                    ? 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    : 'border-blue-300 text-blue-700 hover:bg-blue-50'
                }`}
              />
            </div>

            {/* Total Cost */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Total Cost
              </label>
              <div className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-900">
                ${(premium * quantity).toFixed(2)}
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Order Summary</h4>
            <div className="text-sm text-gray-700 space-y-1">
              <div>Asset: {selectedAsset.ticker} ({selectedAsset.name})</div>
              <div>Type: {orderType === 'call' ? 'Call' : 'Put'} Option</div>
              <div>Strike: ${strikePrice}</div>
              <div>Expiration: {expirationDate}</div>
              <div>Quantity: {quantity} contract(s)</div>
              <div>Premium: ${premium} per contract</div>
              <div className="font-medium">Total: ${(premium * quantity).toFixed(2)}</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex space-x-4">
            <button
              onClick={handlePlaceOrder}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Place Order
            </button>
            <button
              onClick={() => setSelectedAsset(null)}
              className="px-6 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Market Information */}
      <div className="mt-8 bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Market Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">Call Options</div>
            <p className="text-sm text-gray-700">Right to buy at strike price</p>
            <span className="text-sm text-gray-500">
              Near-the-money options
            </span>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">Put Options</div>
            <p className="text-sm text-gray-700">Right to sell at strike price</p>
            <span className="text-sm text-gray-500">
              Near-the-money options
            </span>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">Risk Management</div>
            <p className="text-sm text-gray-700">Advanced hedging strategies</p>
            <span className="text-sm text-gray-500">
              Portfolio protection
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
} 