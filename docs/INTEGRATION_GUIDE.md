# Integration Guide: Connecting Frontend to Backend

## Overview
This guide provides step-by-step instructions for integrating the React frontend with the Aptos blockchain backend, including configuration, testing, and deployment.

## 1. Prerequisites

### Required Tools
- **Node.js** (v16 or higher)
- **npm** or **yarn**
- **Aptos CLI** (for contract deployment)
- **Petra** or **Pontem** wallet (for testing)

### Required Knowledge
- **React/TypeScript** basics
- **Aptos blockchain** concepts
- **Move language** fundamentals
- **REST API** concepts

## 2. Environment Setup

### Frontend Environment Variables
Create `.env` file in `frontend/` directory:

```env
# Aptos Testnet Configuration
VITE_APTOS_NODE_URL=https://fullnode.testnet.aptoslabs.com
VITE_APTOS_FAUCET_URL=https://faucet.testnet.aptoslabs.com

# Contract Addresses (Replace with actual deployed addresses)
VITE_AVILA_PROTOCOL_ADDRESS=0xYOUR_AVILA_PROTOCOL_ADDRESS
VITE_OPTIONS_CORE_ADDRESS=0xYOUR_OPTIONS_CORE_ADDRESS
VITE_ORDER_BOOK_ADDRESS=0xYOUR_ORDER_BOOK_ADDRESS
VITE_MARGIN_ENGINE_ADDRESS=0xYOUR_MARGIN_ENGINE_ADDRESS
VITE_SETTLEMENT_ENGINE_ADDRESS=0xYOUR_SETTLEMENT_ENGINE_ADDRESS
VITE_COLLATERAL_VAULT_ADDRESS=0xYOUR_COLLATERAL_VAULT_ADDRESS
VITE_TOKENIZED_ASSET_REGISTRY_ADDRESS=0xYOUR_TOKENIZED_ASSET_REGISTRY_ADDRESS
VITE_COMPLIANCE_GATE_ADDRESS=0xYOUR_COMPLIANCE_GATE_ADDRESS
VITE_GOVERNANCE_ADMIN_ADDRESS=0xYOUR_GOVERNANCE_ADMIN_ADDRESS
VITE_MULTI_STOCK_MOCK_ADDRESS=0xYOUR_MULTI_STOCK_MOCK_ADDRESS
VITE_PRICE_ORACLE_ADAPTER_ADDRESS=0xYOUR_PRICE_ORACLE_ADAPTER_ADDRESS
VITE_EVENTS_AND_AUDITING_ADDRESS=0xYOUR_EVENTS_AND_AUDITING_ADDRESS

# App Configuration
VITE_APP_NAME=Avila Protocol
VITE_APP_VERSION=1.0.0
VITE_APP_ENVIRONMENT=testnet
```

### Backend Configuration
Update `backend/typescript/config.ts`:

```typescript
export const config = {
  aptos: {
    nodeUrl: process.env.APTOS_NODE_URL || 'https://fullnode.testnet.aptoslabs.com',
    faucetUrl: process.env.APTOS_FAUCET_URL || 'https://faucet.testnet.aptoslabs.com',
  },
  contracts: {
    avilaProtocol: process.env.AVILA_PROTOCOL_ADDRESS || '',
    optionsCore: process.env.OPTIONS_CORE_ADDRESS || '',
    orderBook: process.env.ORDER_BOOK_ADDRESS || '',
    // ... other contract addresses
  },
  admin: {
    privateKey: process.env.ADMIN_PRIVATE_KEY || '',
  },
};
```

## 3. Smart Contract Deployment

### Deploy Contracts to Testnet
```bash
# Navigate to smart contracts directory
cd backend/smart-contracts

# Compile contracts
aptos move compile

# Deploy to testnet
aptos move publish --named-addresses avila_protocol=YOUR_ADDRESS --profile testnet
```

### Initialize Protocol
```bash
# Navigate to TypeScript backend
cd backend/typescript

# Run initialization script
npm run initialize
```

### Verify Deployment
```bash
# Check contract resources
aptos account list --account YOUR_ADDRESS --profile testnet

# Verify module exists
aptos move show --name avila_protocol --profile testnet
```

## 4. Frontend Integration Steps

### Step 1: Install Dependencies
```bash
cd frontend
npm install
```

### Step 2: Configure Contract Addresses
Update `src/config/environment.ts` with deployed contract addresses:

```typescript
export const config = {
  contracts: {
    avilaProtocol: '0x123...', // Your deployed address
    optionsCore: '0x456...',
    orderBook: '0x789...',
    // ... other addresses
  },
  // ... rest of config
};
```

### Step 3: Test Blockchain Connection
```bash
npm run dev
```

Open browser and check console for connection status:
```
✅ Connected to Aptos testnet
```

### Step 4: Test Wallet Connection
1. Install Petra wallet extension
2. Connect wallet in the app
3. Verify account information loads

## 5. Service Layer Integration

### Aptos Service Testing
```typescript
// Test basic connectivity
const aptosService = new AptosService();
const connected = await aptosService.initialize();
console.log('Connection status:', connected);

// Test account info
const accountInfo = await aptosService.getAccountInfo('YOUR_ADDRESS');
console.log('Account info:', accountInfo);
```

### Contract Service Testing
```typescript
// Test contract interaction
const contractsService = new ContractsService();

// Test reading contract data
const assets = await contractsService.getAssets();
console.log('Assets:', assets);

// Test transaction creation
const payload = contractsService.createOptionSeries({
  underlyingAsset: 'AAPL',
  strikePrice: 150,
  expiration: Date.now() + 86400000,
  optionType: 'call'
});
console.log('Transaction payload:', payload);
```

### Wallet Service Testing
```typescript
// Test wallet connection
const walletService = new WalletService();
const connected = await walletService.connectWallet();
console.log('Wallet connected:', connected);

// Test transaction submission
const result = await walletService.submitTransaction(payload);
console.log('Transaction result:', result);
```

## 6. Component Integration

### Test Page Components
1. **Home Page**: Verify protocol overview loads
2. **Markets Page**: Check asset list displays
3. **Trade Page**: Test order form validation
4. **Portfolio Page**: Verify wallet connection required
5. **Governance Page**: Check admin-only features
6. **Admin Page**: Verify admin wallet access

### Test Core Components
1. **Navbar**: Wallet connect/disconnect
2. **TestnetBanner**: Testnet warning display
3. **NotificationContainer**: Success/error messages

## 7. State Management Integration

### Store Testing
```typescript
// Test store initialization
const { user, isConnected, assets } = useAppStore();

// Test state updates
const { connectWallet, setAssets } = useAppStore();

// Test notifications
const { addNotification } = useAppStore();
addNotification({
  type: 'success',
  title: 'Test',
  message: 'Notification working'
});
```

### State Persistence
Check browser localStorage for:
- `avila-protocol-store`: Main application state
- User preferences and settings

## 8. API Integration Testing

### REST API Endpoints
Test direct Aptos node calls:

```typescript
// Test ledger info
const response = await fetch('https://fullnode.testnet.aptoslabs.com/v1');
const ledgerInfo = await response.json();
console.log('Ledger info:', ledgerInfo);

// Test account resources
const accountResponse = await fetch(
  `https://fullnode.testnet.aptoslabs.com/v1/accounts/YOUR_ADDRESS/resources`
);
const resources = await accountResponse.json();
console.log('Account resources:', resources);
```

### Contract Function Calls
Test Move module function calls:

```typescript
// Test view function
const getPrice = async (assetTicker: string) => {
  const response = await fetch(
    `${nodeUrl}/v1/accounts/${contractAddress}/resource/0x123::price_oracle::Price<${assetTicker}>`
  );
  return await response.json();
};

// Test entry function payload creation
const payload = aptosService.createEntryFunctionPayload(
  config.contracts.multiStockMock,
  'multi_stock_mock',
  'set_price',
  [],
  [assetTicker, newPrice]
);
```

## 9. Error Handling Integration

### Network Error Testing
```typescript
// Test offline scenario
// Disconnect internet and test API calls

// Test rate limiting
// Make rapid API calls to trigger rate limits

// Test invalid responses
// Mock invalid JSON responses
```

### Transaction Error Testing
```typescript
// Test insufficient funds
// Try transaction with 0 balance

// Test invalid parameters
// Submit order with negative price

// Test contract errors
// Call functions with wrong account permissions
```

## 10. Performance Testing

### Load Testing
```typescript
// Test multiple concurrent requests
const concurrentRequests = Array(10).fill(null).map(() => 
  fetch(`${nodeUrl}/v1/accounts/YOUR_ADDRESS/resources`)
);

const results = await Promise.allSettled(concurrentRequests);
console.log('Concurrent request results:', results);
```

### Caching Testing
```typescript
// Test cache hit/miss scenarios
const startTime = Date.now();
const data1 = await getCachedData('key', fetcher);
const cacheHitTime = Date.now() - startTime;

const startTime2 = Date.now();
const data2 = await getCachedData('key', fetcher);
const cacheMissTime = Date.now() - startTime2;

console.log('Cache hit time:', cacheHitTime);
console.log('Cache miss time:', cacheMissTime);
```

## 11. Security Testing

### Authentication Testing
```typescript
// Test wallet signature validation
const message = 'Test message';
const signature = await walletService.signMessage(message);
console.log('Signature:', signature);

// Test transaction signing
const transaction = await walletService.submitTransaction(payload);
console.log('Transaction hash:', transaction.hash);
```

### Input Validation Testing
```typescript
// Test form validation
const testOrder = {
  price: -100, // Invalid price
  quantity: 0,  // Invalid quantity
  expiration: Date.now() - 1000 // Past expiration
};

const validation = validateOrder(testOrder);
console.log('Validation errors:', validation.errors);
```

## 12. Deployment Integration

### Local Development
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Production Deployment
```bash
# Build application
npm run build

# Deploy to Vercel
vercel --prod

# Deploy to Netlify
netlify deploy --prod
```

### Environment Configuration
Ensure production environment variables are set:
- **Vercel**: Environment variables in project settings
- **Netlify**: Environment variables in site settings
- **Other platforms**: Follow platform-specific instructions

## 13. Monitoring and Debugging

### Console Logging
```typescript
// Add comprehensive logging
console.log('API Request:', { url, method, params });
console.log('Response:', { status, data, headers });
console.log('Error:', { message, stack, context });
```

### Error Tracking
```typescript
// Implement error boundary
class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    // Send to error tracking service
  }
}
```

### Performance Monitoring
```typescript
// Monitor API response times
const startTime = performance.now();
const response = await apiCall();
const duration = performance.now() - startTime;
console.log('API call duration:', duration);
```

## 14. Troubleshooting Common Issues

### Connection Issues
```bash
# Check Aptos node status
curl https://fullnode.testnet.aptoslabs.com/v1

# Verify network configuration
aptos node check-connectivity --profile testnet
```

### Contract Issues
```bash
# Verify contract deployment
aptos move show --name avila_protocol --profile testnet

# Check contract resources
aptos account list --account CONTRACT_ADDRESS --profile testnet
```

### Frontend Issues
```bash
# Clear browser cache and storage
# Check browser console for errors
# Verify environment variables are loaded
# Test with different wallet extensions
```

## 15. Next Steps

### Immediate Actions
1. ✅ Deploy smart contracts to testnet
2. ✅ Configure frontend environment variables
3. ✅ Test basic connectivity and wallet connection
4. ✅ Verify all pages load correctly
5. ✅ Test core functionality with mock data

### Future Enhancements
1. **Real-time Updates**: Implement WebSocket connections
2. **Advanced Caching**: Redis or similar for performance
3. **Analytics**: User behavior and performance tracking
4. **Testing**: Unit and integration test coverage
5. **CI/CD**: Automated testing and deployment pipelines

This integration guide provides a comprehensive roadmap for connecting your frontend and backend components, ensuring a robust and maintainable options trading platform. 