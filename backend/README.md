# Backend Services

This directory contains the backend components of the Avila Protocol:

- **Smart Contracts**: Move language smart contracts (`smart-contracts/`)
- **TypeScript Services**: Backend services and deployment scripts (`typescript/`)

## Smart Contracts (`smart-contracts/`)

The core protocol logic implemented in Move language.

### Core Components

- **`avila_protocol.move`** - Main protocol entry point and coordination
- **`options_core.move`** - Core options logic and lifecycle management
- **`order_book.move`** - Central limit order book for price discovery
- **`margin_engine.move`** - Risk management and margin calculations
- **`settlement_engine.move`** - Options settlement and payout processing

### Asset Management

- **`collateral_vault.move`** - Secure asset custody and position management
- **`tokenized_asset_registry.move`** - Asset registration and management
- **`multi_stock.move`** - Mock tokenized stocks for testing

### Security & Compliance

- **`compliance_gate.move`** - KYC/AML and regulatory compliance
- **`governance_admin.move`** - Protocol governance and parameter management
- **`events_and_auditing.move`** - Comprehensive event logging and audit trails

### Infrastructure

- **`price_oracle_adapter.move`** - Oracle integration for market data
- **`multi_stock_mock.move`** - Mock implementation for testing

### Testing

- **`complete_protocol_tests.move`** - Comprehensive test suite
- **`multi_stock_mock_test.move`** - Mock asset testing

## TypeScript Services (`typescript/`)

Backend services and utilities for protocol management.

### Deployment Scripts

- **`deploy.js`** - Main deployment script for contracts
- **`deploy_protocol.js`** - Protocol-specific deployment logic
- **`install_aptos_cli.sh`** - Aptos CLI installation script

### Available Commands

```bash
cd typescript
npm install
npm run build
npm run deploy:testnet
npm run deploy:mainnet
npm run initialize
npm run verify
```

## Development Workflow

### Smart Contract Development

1. **Edit contracts** in `smart-contracts/sources/`
2. **Run tests**: `aptos move test`
3. **Compile**: `aptos move compile`
4. **Deploy**: Use TypeScript deployment scripts

### Backend Service Development

1. **Edit services** in `typescript/`
2. **Build**: `npm run build`
3. **Test**: Integrate with smart contracts
4. **Deploy**: Use deployment scripts

## Architecture

The backend follows a layered architecture:

```
┌─────────────────────────────────────┐
│           Frontend Layer            │ (Future)
├─────────────────────────────────────┤
│        TypeScript Services          │ (Integration, Deployment)
├─────────────────────────────────────┤
│         Smart Contract Layer        │ (Core Protocol Logic)
├─────────────────────────────────────┤
│           Aptos Blockchain          │ (Infrastructure)
└─────────────────────────────────────┘
```

## Integration Points

- **Smart Contracts ↔ Aptos**: Direct blockchain interaction
- **TypeScript ↔ Smart Contracts**: SDK-based integration
- **Frontend ↔ Backend**: API-based communication (future)

## Security Considerations

- All smart contracts undergo extensive testing
- Multi-signature governance for critical operations
- Comprehensive audit trails and event logging
- Compliance gate for regulatory requirements

## Testing Strategy

- **Unit Tests**: Individual contract function testing
- **Integration Tests**: Cross-contract interaction testing
- **End-to-End Tests**: Full protocol workflow testing
- **Security Tests**: Vulnerability and attack vector testing

---

*The backend provides the foundation for the entire Avila Protocol ecosystem, with smart contracts handling core logic and TypeScript services managing deployment and integration.* 