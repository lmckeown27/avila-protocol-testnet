import { config } from '../config/environment';

const TestnetBanner = () => {
  if (!config.testnet.isTestnet) {
    return null;
  }

  return (
    <div className="testnet-banner animate-fade-in-up">
      <div className="flex items-center justify-center text-center">
        <div className="max-w-4xl">
          <strong className="font-bold text-lg block mb-2">🚀 Testnet Environment</strong>
          <span className="text-sm leading-relaxed">
            This is a mock trading environment with no real money. All assets and transactions are for testing purposes only. 
            <span className="block mt-1 text-xs opacity-75">Experience the future of DeFi options trading!</span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default TestnetBanner; 