# System Flow: Backend to Frontend

## Overview
This document outlines the complete data flow and interaction patterns from the Aptos blockchain backend (Move smart contracts) through the TypeScript backend services to the React frontend.

## Architecture Flow Diagram

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │  TypeScript      │    │  Aptos          │
│   (React)       │◄──►│  Backend         │◄──►│  Blockchain     │
│                 │    │  Services        │    │  (Move)         │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 1. Smart Contract Layer (Backend)

### Core Protocol Contracts
- **`avila_protocol.move`** - Main entry point and protocol coordination
- **`options_core.move`** - Options creation, pricing, and lifecycle management
- **`order_book.move`** - Order matching and trading engine
- **`margin_engine.move`** - Risk management and margin calculations
- **`settlement_engine.move`** - Options settlement and exercise processing

### Asset Management Contracts
- **`collateral_vault.move`** - Collateral storage and management
- **`tokenized_asset_registry.move`** - Asset registration and metadata
- **`multi_stock_mock.move`** - Test assets and mock data generation

### Infrastructure Contracts
- **`price_oracle_adapter.move`** - External price feeds integration
- **`compliance_gate.move`** - KYC and regulatory compliance checks
- **`governance_admin.move`** - Protocol governance and parameter updates
- **`events_and_auditing.move`** - Event logging and audit trails

## 2. TypeScript Backend Services

### Service Layer Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                    TypeScript Backend                      │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Aptos     │  │  Contract   │  │   Mock      │        │
│  │  Service    │  │  Service    │  │   Setup     │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

### Key Services
1. **`aptos.ts`** - Blockchain connection and basic operations
2. **`contracts.ts`** - Smart contract interaction methods
3. **`mockStocksSetup.ts`** - Test data initialization

### Data Flow Patterns
- **Read Operations**: REST API calls to Aptos node
- **Write Operations**: Transaction submission through wallet
- **Event Listening**: Polling for blockchain events
- **State Synchronization**: Periodic updates from blockchain

## 3. Frontend Application Layer

### Component Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                    React Frontend                          │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │    Pages    │  │ Components  │  │   Services  │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │    Store    │  │   Hooks     │  │   Utils     │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

### State Management
- **Zustand Store**: Centralized application state
- **Wallet State**: Connection status and account info
- **Asset State**: Market data and user positions
- **Transaction State**: Pending and completed operations

## 4. Data Flow Examples

### Example 1: User Places an Options Order

```
1. Frontend (Trade.tsx)
   ↓ User input → Form validation
   
2. Frontend Service (contracts.ts)
   ↓ createOrder() → Transaction payload creation
   
3. Wallet Service (wallet.ts)
   ↓ submitTransaction() → Wallet interaction
   
4. Aptos Blockchain
   ↓ order_book.move → Order processing
   
5. Event Emission
   ↓ OrderPlaced event → Blockchain
   
6. Frontend Update
   ↓ Event polling → State update → UI refresh
```

### Example 2: Asset Price Update

```
1. Price Oracle (External)
   ↓ Price change → API call
   
2. Smart Contract (price_oracle_adapter.move)
   ↓ set_price() → Price update
   
3. Event Emission
   ↓ PriceUpdated event → Blockchain
   
4. Frontend Service (aptos.ts)
   ↓ Event polling → Price fetch
   
5. State Update
   ↓ Store update → Component re-render
   
6. UI Update
   ↓ Markets.tsx → Price display update
```

### Example 3: User Portfolio Update

```
1. User Action
   ↓ Login/Wallet connect → Account address
   
2. Frontend Service (aptos.ts)
   ↓ getAccountBalance() → Balance fetch
   
3. Contract Service (contracts.ts)
   ↓ getPositions() → Position data fetch
   
4. State Update
   ↓ Store update → Portfolio state
   
5. UI Update
   ↓ Portfolio.tsx → Position display
```

## 5. Communication Patterns

### Synchronous Operations
- **Immediate UI Updates**: Form validation, local state changes
- **Synchronous API Calls**: Configuration loading, static data

### Asynchronous Operations
- **Blockchain Transactions**: Order placement, asset transfers
- **Event Polling**: Price updates, order status changes
- **Background Sync**: Portfolio updates, market data refresh

### Error Handling
- **Network Errors**: Retry mechanisms, fallback data
- **Transaction Failures**: User notifications, rollback options
- **Validation Errors**: Immediate feedback, form highlighting

## 6. Performance Considerations

### Optimization Strategies
- **Lazy Loading**: Component and route-based code splitting
- **Caching**: Local storage for user preferences, session data
- **Debouncing**: Search inputs, price update requests
- **Virtualization**: Large lists (orders, positions)

### Monitoring Points
- **Transaction Latency**: Time from submission to confirmation
- **API Response Times**: Blockchain node response performance
- **UI Responsiveness**: Component render and update performance
- **Memory Usage**: State management and component lifecycle

## 7. Security Flow

### Authentication Flow
```
1. Wallet Connection → Public key verification
2. Message Signing → Cryptographic proof of ownership
3. Transaction Signing → Authorized blockchain operations
4. Session Management → Secure state persistence
```

### Data Validation
- **Frontend**: Input sanitization, format validation
- **Backend**: Contract-level business logic validation
- **Blockchain**: Consensus-based transaction validation

## 8. Testing Flow

### Test Data Flow
```
1. Mock Setup (mockStocksSetup.ts)
   ↓ Test asset creation → Blockchain deployment
   
2. Frontend Testing
   ↓ Mock data → Component rendering
   
3. Integration Testing
   ↓ Real contracts → End-to-end workflows
   
4. User Acceptance
   ↓ Testnet deployment → User feedback
```

This flow ensures a robust, secure, and user-friendly options trading platform with clear separation of concerns and efficient data flow from blockchain to user interface. 