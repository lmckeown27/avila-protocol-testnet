# API Flow: Frontend to Backend Integration

## Overview
This document details the specific API calls, data structures, and integration patterns between the React frontend and the Aptos blockchain backend.

## 1. Frontend Service Architecture

### Service Layer Structure
```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Services                       │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Aptos     │  │  Contract   │  │   Wallet    │        │
│  │  Service    │  │  Service    │  │   Service   │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

### Service Responsibilities
- **`aptos.ts`**: Blockchain connection, account info, balance queries
- **`contracts.ts`**: Smart contract function calls and data retrieval
- **`wallet.ts`**: Wallet connection, transaction signing, account management

## 2. Core API Endpoints

### Aptos Node REST API
```
Base URL: https://fullnode.testnet.aptoslabs.com

GET  /v1                           # Ledger info
GET  /v1/accounts/{address}        # Account information
GET  /v1/accounts/{address}/resource/{resource_type}  # Account resources
POST /v1/transactions             # Submit transaction
GET  /v1/transactions/{hash}      # Transaction details
GET  /v1/events                   # Event queries
```

### Contract Function Calls
```
Module: {contract_address}::{module_name}::{function_name}

Examples:
- 0x123::avila_protocol::initialize
- 0x123::options_core::create_option_series
- 0x123::order_book::place_order
- 0x123::margin_engine::update_margin
```

## 3. Data Flow Patterns

### Read Operations (Query Pattern)
```typescript
// 1. Frontend Component Request
const { assets, setAssets } = useAppStore();

// 2. Service Layer Call
const fetchAssets = async () => {
  try {
    const response = await fetch(`${nodeUrl}/v1/accounts/${address}/resources`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch assets:', error);
    throw error;
  }
};

// 3. State Update
setAssets(processedAssets);
```

### Write Operations (Transaction Pattern)
```typescript
// 1. Frontend Form Submission
const handleOrderSubmit = async (orderData) => {
  try {
    // 2. Create Transaction Payload
    const payload = contractsService.createOrder(orderData);
    
    // 3. Submit via Wallet
    const result = await walletService.submitTransaction(payload);
    
    // 4. Update UI State
    addNotification({
      type: 'success',
      title: 'Order Placed',
      message: `Order submitted: ${result.hash}`
    });
  } catch (error) {
    handleError(error);
  }
};
```

## 4. Specific Contract Interactions

### Options Core Contract
```typescript
// Create Option Series
const createOptionSeries = async (params) => {
  const payload = aptosService.createEntryFunctionPayload(
    config.contracts.optionsCore,
    'options_core',
    'create_option_series',
    ['0x1::aptos_coin::AptosCoin'], // Type arguments
    [
      params.underlyingAsset,
      params.strikePrice,
      params.expiration,
      params.optionType
    ]
  );
  
  return await walletService.submitTransaction(payload);
};

// Get Option Series
const getOptionSeries = async (seriesId) => {
  const response = await fetch(
    `${nodeUrl}/v1/accounts/${contractAddress}/resource/0x123::options_core::OptionSeries<${seriesId}>`
  );
  return await response.json();
};
```

### Order Book Contract
```typescript
// Place Order
const placeOrder = async (orderData) => {
  const payload = aptosService.createEntryFunctionPayload(
    config.contracts.orderBook,
    'order_book',
    'place_order',
    [],
    [
      orderData.seriesId,
      orderData.price,
      orderData.quantity,
      orderData.orderType,
      orderData.expiration
    ]
  );
  
  return await walletService.submitTransaction(payload);
};

// Get Order Book
const getOrderBook = async (seriesId) => {
  const response = await fetch(
    `${nodeUrl}/v1/accounts/${contractAddress}/resource/0x123::order_book::OrderBook<${seriesId}>`
  );
  return await response.json();
};
```

### Margin Engine Contract
```typescript
// Update Margin
const updateMargin = async (positionId, marginAmount) => {
  const payload = aptosService.createEntryFunctionPayload(
    config.contracts.marginEngine,
    'margin_engine',
    'update_margin',
    [],
    [positionId, marginAmount]
  );
  
  return await walletService.submitTransaction(payload);
};

// Get Position
const getPosition = async (positionId) => {
  const response = await fetch(
    `${nodeUrl}/v1/accounts/${contractAddress}/resource/0x123::margin_engine::Position<${positionId}>`
  );
  return await response.json();
};
```

## 5. Event Handling and Polling

### Event Structure
```typescript
interface BlockchainEvent {
  sequence_number: string;
  type: string;
  data: {
    [key: string]: unknown;
  };
  guid: {
    creation_number: string;
    account_address: string;
  };
}
```

### Event Polling Implementation
```typescript
// Poll for new events
const pollEvents = async (lastSequenceNumber: string) => {
  try {
    const response = await fetch(
      `${nodeUrl}/v1/events?start=${lastSequenceNumber}&limit=100`
    );
    const events = await response.json();
    
    // Process events
    events.forEach(event => {
      switch (event.type) {
        case 'OrderPlaced':
          handleOrderPlaced(event.data);
          break;
        case 'PriceUpdated':
          handlePriceUpdated(event.data);
          break;
        case 'PositionUpdated':
          handlePositionUpdated(event.data);
          break;
      }
    });
    
    return events;
  } catch (error) {
    console.error('Failed to poll events:', error);
    throw error;
  }
};
```

## 6. Error Handling Patterns

### Network Error Handling
```typescript
const handleNetworkError = (error: Error) => {
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    return {
      type: 'network',
      message: 'Network connection failed. Please check your internet connection.',
      retry: true
    };
  }
  
  if (error.message.includes('429')) {
    return {
      type: 'rate_limit',
      message: 'Too many requests. Please wait before retrying.',
      retry: true,
      delay: 5000
    };
  }
  
  return {
    type: 'unknown',
    message: 'An unexpected error occurred.',
    retry: false
  };
};
```

### Transaction Error Handling
```typescript
const handleTransactionError = (error: Error) => {
  if (error.message.includes('insufficient_funds')) {
    return {
      type: 'insufficient_funds',
      message: 'Insufficient funds for transaction.',
      action: 'add_funds'
    };
  }
  
  if (error.message.includes('invalid_parameters')) {
    return {
      type: 'validation',
      message: 'Invalid transaction parameters.',
      action: 'fix_inputs'
    };
  }
  
  return {
    type: 'transaction_failed',
    message: 'Transaction failed. Please try again.',
    action: 'retry'
  };
};
```

## 7. State Synchronization

### Real-time Updates
```typescript
// Set up polling intervals
useEffect(() => {
  const intervals = [];
  
  // Poll prices every 30 seconds
  intervals.push(setInterval(() => {
    updateAssetPrices();
  }, 30000));
  
  // Poll user positions every minute
  intervals.push(setInterval(() => {
    updateUserPositions();
  }, 60000));
  
  // Poll order book every 10 seconds
  intervals.push(setInterval(() => {
    updateOrderBook();
  }, 10000));
  
  return () => intervals.forEach(clearInterval);
}, []);
```

### Optimistic Updates
```typescript
// Optimistic order placement
const placeOrderOptimistically = async (orderData) => {
  // 1. Update UI immediately
  const optimisticOrder = {
    ...orderData,
    id: generateId(),
    status: 'pending',
    timestamp: Date.now()
  };
  
  addOrder(optimisticOrder);
  
  try {
    // 2. Submit to blockchain
    const result = await placeOrder(orderData);
    
    // 3. Update with real data
    updateOrder(optimisticOrder.id, {
      status: 'confirmed',
      hash: result.hash
    });
  } catch (error) {
    // 4. Rollback on failure
    removeOrder(optimisticOrder.id);
    throw error;
  }
};
```

## 8. Performance Optimizations

### Request Batching
```typescript
// Batch multiple resource requests
const batchGetResources = async (address: string, resourceTypes: string[]) => {
  const promises = resourceTypes.map(type =>
    fetch(`${nodeUrl}/v1/accounts/${address}/resource/${type}`)
      .then(res => res.json())
      .catch(() => null)
  );
  
  const results = await Promise.allSettled(promises);
  return results.map((result, index) => ({
    type: resourceTypes[index],
    data: result.status === 'fulfilled' ? result.value : null
  }));
};
```

### Caching Strategy
```typescript
// Simple in-memory cache
const cache = new Map();
const CACHE_TTL = 30000; // 30 seconds

const getCachedData = async (key: string, fetcher: () => Promise<any>) => {
  const cached = cache.get(key);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  const data = await fetcher();
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
  
  return data;
};
```

## 9. Security Considerations

### Input Validation
```typescript
// Validate order parameters
const validateOrder = (orderData: OrderData): ValidationResult => {
  const errors: string[] = [];
  
  if (orderData.price <= 0) {
    errors.push('Price must be greater than 0');
  }
  
  if (orderData.quantity <= 0) {
    errors.push('Quantity must be greater than 0');
  }
  
  if (orderData.expiration <= Date.now()) {
    errors.push('Expiration must be in the future');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};
```

### Rate Limiting
```typescript
// Simple rate limiting
const rateLimiter = new Map<string, number[]>();
const RATE_LIMIT = 10; // requests per minute
const RATE_WINDOW = 60000; // 1 minute

const checkRateLimit = (key: string): boolean => {
  const now = Date.now();
  const requests = rateLimiter.get(key) || [];
  
  // Remove old requests
  const recentRequests = requests.filter(time => now - time < RATE_WINDOW);
  
  if (recentRequests.length >= RATE_LIMIT) {
    return false;
  }
  
  recentRequests.push(now);
  rateLimiter.set(key, recentRequests);
  return true;
};
```

This API flow ensures efficient, secure, and maintainable communication between the frontend and backend, with proper error handling, performance optimization, and security measures. 