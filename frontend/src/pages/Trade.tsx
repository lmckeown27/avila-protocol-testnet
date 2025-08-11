import { useState } from 'react';
import { useAppStore } from '../stores/appStore';
import { config } from '../config/environment';
import { TrendingUp, TrendingDown } from 'lucide-react';

const Trade = () => {
  const { isConnected } = useAppStore();
  const [selectedAsset, setSelectedAsset] = useState(config.testnet.mockAssets[0]);
  const [orderType, setOrderType] = useState<'buy' | 'sell'>('buy');
  const [optionType, setOptionType] = useState<'call' | 'put'>('call');
  const [strikePrice, setStrikePrice] = useState(150);
  const [expiry, setExpiry] = useState(30);
  const [quantity, setQuantity] = useState(1);
  const [premium, setPremium] = useState(5.50);

  if (!isConnected) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Connect Wallet to Trade</h2>
        <p className="text-gray-600 mb-6">You need to connect your wallet to access the trading interface.</p>
        <button className="btn-primary">Connect Wallet</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Trade Options</h1>
        <p className="text-gray-600">Place call and put options orders on tokenized stocks</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Trading Interface */}
        <div className="lg:col-span-2 space-y-6">
          {/* Asset Selection */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Asset</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {config.testnet.mockAssets.map((asset) => (
                <button
                  key={asset.ticker}
                  onClick={() => setSelectedAsset(asset)}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    selectedAsset.ticker === asset.ticker
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium text-gray-900">{asset.ticker}</div>
                  <div className="text-sm text-gray-500">{asset.name}</div>
                  <div className="text-sm font-medium text-primary-600">
                    ${asset.initialPrice}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Order Form */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Place Order</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Order Type
                </label>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setOrderType('buy')}
                    className={`flex-1 py-2 px-4 rounded-lg border font-medium transition-colors ${
                      orderType === 'buy'
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <TrendingUp className="w-4 h-4 inline mr-2" />
                    Buy
                  </button>
                  <button
                    onClick={() => setOrderType('sell')}
                    className={`flex-1 py-2 px-4 rounded-lg border font-medium transition-colors ${
                      orderType === 'sell'
                        ? 'border-red-500 bg-red-50 text-red-700'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <TrendingDown className="w-4 h-4 inline mr-2" />
                    Sell
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Option Type
                </label>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setOptionType('call')}
                    className={`flex-1 py-2 px-4 rounded-lg border font-medium transition-colors ${
                      optionType === 'call'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Call
                  </button>
                  <button
                    onClick={() => setOptionType('put')}
                    className={`flex-1 py-2 px-4 rounded-lg border font-medium transition-colors ${
                      optionType === 'put'
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Put
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Strike Price ($)
                </label>
                <input
                  type="number"
                  value={strikePrice}
                  onChange={(e) => setStrikePrice(Number(e.target.value))}
                  className="input-field"
                  min="0.01"
                  step="0.01"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expiry (days)
                </label>
                <input
                  type="number"
                  value={expiry}
                  onChange={(e) => setExpiry(Number(e.target.value))}
                  className="input-field"
                  min="1"
                  max="365"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity (contracts)
                </label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="input-field"
                  min="1"
                  max="1000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Premium ($)
                </label>
                <input
                  type="number"
                  value={premium}
                  onChange={(e) => setPremium(Number(e.target.value))}
                  className="input-field"
                  min="0.01"
                  step="0.01"
                />
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <span className="text-lg font-medium text-gray-900">Order Summary</span>
                <span className="text-sm text-gray-500">
                  {orderType === 'buy' ? 'Buying' : 'Selling'} {quantity} {optionType} option{quantity > 1 ? 's' : ''}
                </span>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Asset:</span>
                  <span className="font-medium">{selectedAsset.ticker}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Strike Price:</span>
                  <span className="font-medium">${strikePrice}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Expiry:</span>
                  <span className="font-medium">{expiry} days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Premium per contract:</span>
                  <span className="font-medium">${premium}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Premium:</span>
                  <span className="font-medium">${(premium * quantity).toFixed(2)}</span>
                </div>
              </div>

              <button className="w-full btn-primary mt-4">
                Place {orderType === 'buy' ? 'Buy' : 'Sell'} Order
              </button>
            </div>
          </div>
        </div>

        {/* Market Info */}
        <div className="space-y-6">
          {/* Selected Asset Info */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Market Info</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Current Price</span>
                <span className="font-medium text-green-600">${selectedAsset.initialPrice}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">24h Change</span>
                <span className="font-medium text-green-600">+2.45%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">24h Volume</span>
                <span className="font-medium">$1.2M</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Market Cap</span>
                <span className="font-medium">$2.4B</span>
              </div>
            </div>
          </div>

          {/* Options Chain */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Options Chain</h3>
            <div className="space-y-3">
              <div className="text-sm text-gray-500">Near-the-money options</div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Call ${strikePrice}</span>
                  <span className="font-medium">${premium}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Put ${strikePrice}</span>
                  <span className="font-medium">${(premium * 0.8).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Testnet Notice */}
          <div className="card bg-yellow-50 border-yellow-200">
            <h4 className="text-sm font-medium text-yellow-800 mb-2">
              🧪 Testnet Trading
            </h4>
            <p className="text-yellow-700 text-xs">
              This is a mock trading environment. All orders are simulated and no real transactions occur.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Trade; 