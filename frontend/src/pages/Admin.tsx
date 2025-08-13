import { useState } from 'react';
// import { useAppStore } from '../stores/appStore';
import { Shield, Users, Settings, BarChart3, CheckCircle, XCircle, Clock } from 'lucide-react';

export default function Admin() {
  // const { isConnected, user } = useAppStore();
  const [activeTab, setActiveTab] = useState('overview');
  const [kycRequests, setKycRequests] = useState([
    {
      id: 1,
      userId: 'user123',
      status: 'pending',
      submittedAt: '2024-01-15T10:30:00Z',
      documents: ['passport', 'utility_bill'],
      riskScore: 0.2
    },
    {
      id: 2,
      userId: 'user456',
      status: 'approved',
      submittedAt: '2024-01-14T15:45:00Z',
      documents: ['drivers_license', 'bank_statement'],
      riskScore: 0.1
    }
  ]);

  // Mock user data for testnet
  const mockUser = { role: 'admin', username: 'admin_user' };

  // Wallet connection check - commented out for testnet
  // if (!isConnected) {
  //   return (
  //     <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
  //       <div className="text-center py-12">
  //         <h2 className="text-2xl font-bold text-gray-900 mb-4">Connect Wallet to Access Admin Panel</h2>
  //         <p className="text-gray-600">You need to connect your wallet to access administrative functions.</p>
  //       </div>
  //     </div>
  //   );
  // }

  // Role check - commented out for testnet
  // if (user?.role !== 'admin') {
  //   return (
  //     <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
  //       <div className="text-center py-12">
  //         <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
  //         <p className="text-gray-600">You don't have permission to access the admin panel.</p>
  //       </div>
  //     </div>
  //   );
  // }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
          <p className="text-gray-600">Welcome back, {mockUser.username}</p>
        </div>

      {/* Admin Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card bg-gradient-to-r from-blue-50 to-blue-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">Pending KYC</p>
              <p className="text-2xl font-bold text-blue-900">
                {kycRequests.filter(u => u.status === 'pending').length}
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
                {/* {assetRegistrations.filter(a => a.status === 'pending').length} */}
                0
              </p>
            </div>
            <BarChart3 className="w-8 h-8 text-green-400" />
          </div>
        </div>
        <div className="card bg-gradient-to-r from-purple-50 to-purple-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-600 font-medium">Total Users</p>
              <p className="text-2xl font-bold text-purple-900">{kycRequests.length}</p>
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
                      User ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Risk Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Submitted At
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {kycRequests.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {user.userId}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${user.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm font-medium ${user.riskScore <= 0.3 ? 'text-green-600' : user.riskScore <= 0.7 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {user.riskScore}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <Clock className="w-4 h-4 inline mr-1" /> {new Date(user.submittedAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {user.status === 'pending' && (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => {
                                setKycRequests(requests => requests.map(req => req.id === user.id ? { ...req, status: 'approved' } : req));
                              }}
                              className="text-green-600 hover:text-green-900"
                            >
                              <CheckCircle className="w-4 h-4 inline mr-1" /> Approve
                            </button>
                            <button
                              onClick={() => {
                                setKycRequests(requests => requests.map(req => req.id === user.id ? { ...req, status: 'rejected' } : req));
                              }}
                              className="text-red-600 hover:text-red-900"
                            >
                              <XCircle className="w-4 h-4 inline mr-1" /> Reject
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
                  {/* {assetRegistrations.map((asset) => ( */}
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      Ethereum ETF
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ETH-ETF
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      8
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        pending
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {/* {asset.status === 'pending' && ( */}
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              // setAssetRegistrations(assets => assets.map(req => req.symbol === asset.symbol ? { ...req, status: 'approved' } : req));
                            }}
                            className="text-green-600 hover:text-green-900"
                          >
                            <CheckCircle className="w-4 h-4 inline mr-1" /> Approve
                          </button>
                          <button
                            onClick={() => {
                              // setAssetRegistrations(assets => assets.map(req => req.symbol === asset.symbol ? { ...req, status: 'rejected' } : req));
                            }}
                            className="text-red-600 hover:text-red-900"
                          >
                            <XCircle className="w-4 h-4 inline mr-1" /> Reject
                          </button>
                        </div>
                      {/* )} */}
                    </td>
                  </tr>
                  {/* ))} */}
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
  </div>
  );
} 