import { config } from '../config/environment';

const TestnetBanner = () => {
  if (!config.testnet.isTestnet) {
    return null;
  }

  return (
    <div className="testnet-banner">
      <div className="flex items-center">
        <img 
          src="/src/assets/images/logos/Avilatokenlogo.jpg" 
          alt="Avila Protocol Logo" 
          className="w-8 h-8 mr-2 rounded-full"
        />
        <div>
          <strong className="font-medium">Testnet Environment</strong>
          <span className="ml-2">This is a mock trading environment with no real money. All assets and transactions are for testing purposes only.</span>
        </div>
      </div>
    </div>
  );
};

export default TestnetBanner; 