export const config = {
  // Aptos Testnet Configuration
  aptos: {
    nodeUrl: import.meta.env.VITE_APTOS_NODE_URL || 'https://fullnode.testnet.aptoslabs.com',
    faucetUrl: import.meta.env.VITE_APTOS_FAUCET_URL || 'https://faucet.testnet.aptoslabs.com',
  },
  
  // Backend Configuration
  backend: {
    baseUrl: import.meta.env.VITE_BACKEND_URL || 'https://avila-protocol-testnet.onrender.com',
    timeout: 10000,
    endpoints: {
      health: '/api/health',
      marketData: '/api/market-data',
      tradfi: '/api/market-data/tradfi',
      defi: '/api/market-data/defi',
      cacheStats: '/api/market-data/cache/stats',
    },
  },
  
  // Contract Addresses
  contracts: {
    avilaProtocol: import.meta.env.VITE_AVILA_PROTOCOL_ADDRESS || '',
    optionsCore: import.meta.env.VITE_OPTIONS_CORE_ADDRESS || '',
    orderBook: import.meta.env.VITE_ORDER_BOOK_ADDRESS || '',
    marginEngine: import.meta.env.VITE_MARGIN_ENGINE_ADDRESS || '',
    settlementEngine: import.meta.env.VITE_SETTLEMENT_ENGINE_ADDRESS || '',
    collateralVault: import.meta.env.VITE_COLLATERAL_VAULT_ADDRESS || '',
    tokenizedAssetRegistry: import.meta.env.VITE_TOKENIZED_ASSET_REGISTRY_ADDRESS || '',
    complianceGate: import.meta.env.VITE_COMPLIANCE_GATE_ADDRESS || '',
    governanceAdmin: import.meta.env.VITE_GOVERNANCE_ADMIN_ADDRESS || '',
    multiStockMock: import.meta.env.VITE_MULTI_STOCK_MOCK_ADDRESS || '',
    priceOracleAdapter: import.meta.env.VITE_PRICE_ORACLE_ADAPTER_ADDRESS || '',
    eventsAndAuditing: import.meta.env.VITE_EVENTS_AND_AUDITING_ADDRESS || '',
  },
  
  // App Configuration
  app: {
    name: import.meta.env.VITE_APP_NAME || 'Avila Protocol',
    version: import.meta.env.VITE_APP_VERSION || '1.0.0',
    environment: import.meta.env.VITE_APP_ENVIRONMENT || 'testnet',
  },
  
  // Testnet Configuration
  testnet: {
    isTestnet: true,
    mockAssets: [
      { ticker: 'AAPL', name: 'Apple Inc.', decimals: 8, initialPrice: 150.50 },
      { ticker: 'GOOGL', name: 'Alphabet Inc.', decimals: 8, initialPrice: 2750.00 },
      { ticker: 'TSLA', name: 'Tesla Inc.', decimals: 8, initialPrice: 850.25 },
      { ticker: 'MSFT', name: 'Microsoft Corporation', decimals: 8, initialPrice: 320.75 },
      { ticker: 'AMZN', name: 'Amazon.com Inc.', decimals: 8, initialPrice: 135.50 },
    ],
  },
};

export const isTestnet = config.app.environment === 'testnet';
export const isDevelopment = import.meta.env.DEV; 