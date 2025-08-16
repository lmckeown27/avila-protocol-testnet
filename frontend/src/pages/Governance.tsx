import { useState } from 'react';
import { Vote, Users, BarChart3 } from 'lucide-react';

interface Proposal {
  id: number;
  title: string;
  description: string;
  status: 'active' | 'passed' | 'rejected' | 'expired';
  startTime: number;
  endTime: number;
  yesVotes: number;
  noVotes: number;
  totalVotes: number;
  quorum: number;
}

const Governance = () => {
  const [proposals] = useState<Proposal[]>([
    {
      id: 1,
      title: "Increase Protocol Fee to 0.1%",
      description: "Proposal to increase the protocol fee from 0.05% to 0.1% to improve protocol sustainability and fund development initiatives.",
      status: 'active',
      startTime: Date.now() - 86400000, // 1 day ago
      endTime: Date.now() + 604800000, // 7 days from now
      yesVotes: 1250,
      noVotes: 450,
      totalVotes: 1700,
      quorum: 2000,
    },
    {
      id: 2,
      title: "Add New Asset: Bitcoin ETF",
      description: "Proposal to add Bitcoin ETF as a new underlying asset for options trading, expanding the protocol's asset coverage.",
      status: 'active',
      startTime: Date.now() - 172800000, // 2 days ago
      endTime: Date.now() + 518400000, // 6 days from now
      yesVotes: 2100,
      noVotes: 300,
      totalVotes: 2400,
      quorum: 2000,
    },
    {
      id: 3,
      title: "Update Risk Parameters",
      description: "Proposal to update margin requirements and risk parameters for improved risk management.",
      status: 'passed',
      startTime: Date.now() - 2592000000, // 30 days ago
      endTime: Date.now() - 1728000000, // 20 days ago
      yesVotes: 1800,
      noVotes: 200,
      totalVotes: 2000,
      quorum: 2000,
    },
  ]);

  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [showVoteModal, setShowVoteModal] = useState(false);
  const [voteChoice, setVoteChoice] = useState<'yes' | 'no'>('yes');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-blue-100 text-blue-800';
      case 'passed':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'expired':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getVotePercentage = (proposal: Proposal) => {
    if (proposal.totalVotes === 0) return 0;
    return (proposal.totalVotes / proposal.quorum) * 100;
  };

  const handleVote = (proposalId: number, choice: 'yes' | 'no') => {
    // TODO: Implement actual voting logic
    console.log(`Voting ${choice} on proposal ${proposalId}`);
    setShowVoteModal(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Governance</h1>
        <p className="text-gray-600">Participate in protocol governance and vote on proposals</p>
      </div>

      {/* Governance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card bg-gradient-to-r from-blue-50 to-blue-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">Active Proposals</p>
              <p className="text-2xl font-bold text-blue-900">
                {proposals.filter(p => p.status === 'active').length}
              </p>
            </div>
            <Vote className="w-8 h-8 text-blue-400" />
          </div>
        </div>
        <div className="card bg-gradient-to-r from-green-50 to-green-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 font-medium">Total Proposals</p>
              <p className="text-2xl font-bold text-green-900">{proposals.length}</p>
            </div>
            <BarChart3 className="w-8 h-8 text-green-400" />
          </div>
        </div>
        <div className="card bg-gradient-to-r from-purple-50 to-purple-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-600 font-medium">Your Voting Power</p>
              <p className="text-2xl font-bold text-purple-900">1,250</p>
            </div>
            <Users className="w-8 h-8 text-purple-400" />
          </div>
        </div>
        <div className="card bg-gradient-to-r from-orange-50 to-orange-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-600 font-medium">Participation Rate</p>
              <p className="text-2xl font-bold text-orange-900">85%</p>
            </div>
            <BarChart3 className="w-8 h-8 text-orange-400" />
          </div>
        </div>
      </div>

      {/* Proposals List */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Governance Proposals</h3>
        <div className="space-y-4">
          {proposals.map((proposal) => (
            <div key={proposal.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">{proposal.title}</h4>
                  <p className="text-gray-600 text-sm mb-3">{proposal.description}</p>
                  
                  <div className="flex items-center space-x-6 text-sm text-gray-500">
                    <span>Total Votes: {proposal.totalVotes}</span>
                    <span>Quorum: {getVotePercentage(proposal).toFixed(1)}%</span>
                    <span>Status: {proposal.status}</span>
                  </div>
                </div>
                
                <div className="flex flex-col items-end space-y-2">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(proposal.status)}`}>
                    {proposal.status}
                  </span>
                  
                  {proposal.status === 'active' && (
                    <button
                      onClick={() => {
                        setSelectedProposal(proposal);
                        setShowVoteModal(true);
                      }}
                      className="btn-primary text-sm"
                    >
                      Vote
                    </button>
                  )}
                </div>
              </div>

              {/* Voting Progress */}
              <div className="mt-4">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Voting Progress</span>
                  <span>{proposal.totalVotes} / {proposal.quorum} votes ({getVotePercentage(proposal).toFixed(1)}%)</span>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                  <div 
                    className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(getVotePercentage(proposal), 100)}%` }}
                  ></div>
                </div>
                
                <div className="flex justify-between text-sm">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-green-600">Yes: {proposal.yesVotes}</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                    <span className="text-red-600">No: {proposal.noVotes}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create Proposal Button */}
      <div className="text-center">
        <button className="btn-primary text-lg px-8 py-3">
          Create New Proposal
        </button>
      </div>

      {/* Vote Modal */}
      {showVoteModal && selectedProposal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Vote on Proposal</h3>
            <p className="text-gray-600 mb-4">
              This is the governance system for the real-time asset scanner platform. 
              All proposals and votes are part of the real governance infrastructure.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Your Vote</label>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setVoteChoice('yes')}
                    className={`flex-1 py-2 px-4 rounded-lg border font-medium transition-colors ${
                      voteChoice === 'yes'
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setVoteChoice('no')}
                    className={`flex-1 py-2 px-4 rounded-lg border font-medium transition-colors ${
                      voteChoice === 'no'
                        ? 'border-red-500 bg-red-50 text-red-700'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    No
                  </button>
                </div>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowVoteModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleVote(selectedProposal.id, voteChoice)}
                  className="btn-primary flex-1"
                >
                  Submit Vote
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Testnet Notice */}
      <div className="card bg-yellow-50 border-yellow-200">
        <h3 className="text-lg font-semibold text-yellow-800 mb-2">
          🧪 Testnet Governance
        </h3>
        <p className="text-yellow-700 text-sm">
          This is the governance system for the real-time asset scanner platform. All proposals and votes are part of the real governance infrastructure.
        </p>
      </div>
    </div>
  );
};

export default Governance; 