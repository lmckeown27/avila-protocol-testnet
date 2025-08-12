import { useState } from 'react';
import { useAppStore } from '../stores/appStore';
import { Shield, Users, BarChart3, Settings, AlertTriangle } from 'lucide-react';

interface ComplianceUser {
  address: string;
  kycStatus: 'pending' | 'approved' | 'rejected';
  lastCheck: number;
  riskScore: number;
}

interface AssetRegistration {
  name: string;
  symbol: string;
  decimals: number;
  metadata: string;
  status: 'pending' | 'approved' | 'rejected';
}

const Admin = () => {
  const { isConnected, user } = useAppStore();
  const [activeTab, setActiveTab] = useState<'compliance' | 'assets' | 'system'>('compliance');
  const [complianceUsers, setComplianceUsers] = useState<ComplianceUser[]>([
    {
      address: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      kycStatus: 'pending',
      lastCheck: Date.now() - 86400000,
      riskScore: 75,
    },
    {
      address: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      kycStatus: 'approved',
      lastCheck: Date.now() - 172800000,
      riskScore: 25,
    },
    {
      address: '0x567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234',
      kycStatus: 'rejected',
      lastCheck: Date.now() - 259200000,
      riskScore: 90,
    },
  ]);

  const [assetRegistrations, setAssetRegistrations] = useState<AssetRegistration[]>([
    {
      name: 'Ethereum ETF',
      symbol: 'ETH-ETF',
      decimals: 8,
      metadata: 'Ethereum Exchange Traded Fund',
      status: 'pending',
    },
    {
      name: 'Solana',
      symbol: 'SOL',
      decimals: 8,
      metadata: 'Solana blockchain token',
      status: 'approved',
    },
  ]);

  if (!isConnected) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Connect Wallet to Access Admin Panel</h2>
        <p className="text-gray-600">You need to connect your wallet to access administrative functions.</p>
      </div>
    );
  }

  if (!user?.isAdmin) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
        <p className="text-gray-600">You do not have administrative privileges to access this page.</p>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRiskScoreColor = (score: number) => {
    if (score <= 30) return 'text-green-600';
    if (score <= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const handleKYCUpdate = (address: string, status: 'approved' | 'rejected') => {
    setComplianceUsers(users => 
      users.map(user => 
        user.address === address 
          ? { ...user, kycStatus: status, lastCheck: Date.now() }
          : user
      )
    );
  };

  const handleAssetUpdate = (symbol: string, status: 'approved' | 'rejected') => {
    setAssetRegistrations(assets => 
      assets.map(asset => 
        asset.symbol === symbol 
          ? { ...asset, status }
          : asset
      )
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
        <p className="text-gray-600">Administrative functions for protocol management</p>
      </div>

      {/* Admin Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card bg-gradient-to-r from-blue-50 to-blue-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">Pending KYC</p>
              <p className="text-2xl font-bold text-blue-900">
                {complianceUsers.filter(u => u.kycStatus === 'pending').length}
              </p>
            </div>
            <Users className="w-8 h-8 text-blue-400" />
          </div>
        </div>
        <div className="card bg-gradient-to-r from-green-50 to-green-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 font-medium">Pending Assets</p>
              <p className="text-2xl font-bold text-green-900">
                {assetRegistrations.filter(a => a.status === 'pending').length}
              </p>
            </div>
            <BarChart3 className="w-8 h-8 text-green-400" />
          </div>
        </div>
        <div className="card bg-gradient-to-r from-purple-50 to-purple-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-600 font-medium">Total Users</p>
              <p className="text-2xl font-bold text-purple-900">{complianceUsers.length}</p>
            </div>
            <Users className="w-8 h-8 text-purple-400" />
          </div>
        </div>
        <div className="card bg-gradient-to-r from-orange-50 to-orange-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-600 font-medium">System Status</p>
              <p className="text-2xl font-bold text-orange-900">Healthy</p>
            </div>
            <Settings className="w-8 h-8 text-orange-400" />
          </div>
        </div>
      </div>

      {/* Admin Tabs */}
      <div className="card">
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('compliance')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'compliance'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Shield className="w-4 h-4 inline mr-2" />
              Compliance Management
            </button>
            <button
              onClick={() => setActiveTab('assets')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'assets'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <BarChart3 className="w-4 h-4 inline mr-2" />
              Asset Registration
            </button>
            <button
              onClick={() => setActiveTab('system')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'system'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Settings className="w-4 h-4 inline mr-2" />
              System Settings
            </button>
          </nav>
        </div>

        {/* Compliance Management Tab */}
        {activeTab === 'compliance' && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">KYC/AML Compliance</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      User Address
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      KYC Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Risk Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Last Check
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {complianceUsers.map((user) => (
                    <tr key={user.address} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {user.address.slice(0, 8)}...{user.address.slice(-8)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(user.kycStatus)}`}>
                          {user.kycStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm font-medium ${getRiskScoreColor(user.riskScore)}`}>
                          {user.riskScore}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(user.lastCheck).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {user.kycStatus === 'pending' && (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleKYCUpdate(user.address, 'approved')}
                              className="text-green-600 hover:text-green-900"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleKYCUpdate(user.address, 'rejected')}
                              className="text-red-600 hover:text-red-900"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Asset Registration Tab */}
        {activeTab === 'assets' && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Asset Registration Requests</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Asset
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ticker
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Initial Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Current Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {assetRegistrations.map((asset) => (
                    <tr key={asset.symbol} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {asset.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {asset.symbol}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {asset.decimals}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(asset.status)}`}>
                          {asset.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {asset.status === 'pending' && (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleAssetUpdate(asset.symbol, 'approved')}
                              className="text-green-600 hover:text-green-900"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleAssetUpdate(asset.symbol, 'rejected')}
                              className="text-red-600 hover:text-red-900"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* System Settings Tab */}
        {activeTab === 'system' && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">System Configuration</h3>
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Protocol Fee Rate (%)
                  </label>
                  <input
                    type="number"
                    defaultValue="0.05"
                    className="input-field"
                    min="0"
                    max="1"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum Margin Requirement (%)
                  </label>
                  <input
                    type="number"
                    defaultValue="10"
                    className="input-field"
                    min="1"
                    max="50"
                    step="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Position Size (USD)
                  </label>
                  <input
                    type="number"
                    defaultValue="1000000"
                    className="input-field"
                    min="1000"
                    step="1000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Emergency Pause
                  </label>
                  <button className="btn-danger w-full">
                    Pause Protocol
                  </button>
                </div>
              </div>
              
              <div className="pt-4 border-t border-gray-200">
                <button className="btn-primary">
                  Save Configuration
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Testnet Notice */}
      <div className="card bg-yellow-50 border-yellow-200">
        <h3 className="text-lg font-semibold text-yellow-800 mb-2">
          🧪 Testnet Admin Panel
        </h3>
        <p className="text-yellow-700 text-sm">
          This is a mock admin panel for testing purposes. All administrative functions are simulated.
        </p>
      </div>
    </div>
  );
};

export default Admin; 