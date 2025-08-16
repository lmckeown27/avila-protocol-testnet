export const config = {
  // Aptos Testnet Configuration
  aptos: {
    nodeUrl: import.meta.env.VITE_APTOS_NODE_URL || 'https://fullnode.testnet.aptoslabs.com',
    faucetUrl: import.meta.env.VITE_APTOS_FAUCET_URL || 'https://faucet.testnet.aptoslabs.com',
  },
  
  // Backend Configuration
  backend: {
    baseUrl: import.meta.env.VITE_BACKEND_URL || (import.meta.env.MODE === 'development' ? 'http://localhost:3000' : 'https://avila-protocol-testnet.onrender.com'),
    timeout: 10000,
    endpoints: {
      health: '/api/health',
      marketData: '/api/market-data',
      stocks: '/api/stocks',
      etfs: '/api/etfs',
      crypto: '/api/crypto',
      digitalAssets: '/api/crypto',
      search: '/api/search',
      categories: '/api/categories',
      companies: '/api/companies',
      companiesStats: '/api/companies/stats',
      rateLimitsStatus: '/api/rate-limits/status',
      rateLimitsTiming: '/api/rate-limits/timing',
      rateLimitsRotation: '/api/rate-limits/rotation',
      cacheStats: '/api/market-data/cache/stats',
      enhancedMarketData: '/api/market-data/enhanced',
      defiProtocols: '/api/market-data/defi-protocols',
      cacheClear: '/api/market-data/cache/clear',
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
    // Mock assets removed - system now uses real-time data only
  },
};

export const isTestnet = config.app.environment === 'testnet';
export const isDevelopment = import.meta.env.DEV; 