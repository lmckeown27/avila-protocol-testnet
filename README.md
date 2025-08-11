# Avila Protocol

A decentralized options trading platform built on the Aptos blockchain.

## Project Structure

This project has been restructured into a monorepo with clear separation of concerns:

```
avila-protocol/
├── backend/
│   ├── smart-contracts/     # Move smart contracts and tests
│   └── typescript/          # Backend TypeScript services
├── frontend/                # Frontend application (placeholder)
├── docs/                    # Documentation and architecture
└── package.json             # Root workspace configuration
```

## Components

### 🏗️ Backend Smart Contracts (`backend/smart-contracts/`)

Contains all Move smart contracts that power the Avila Protocol:

- **Core Protocol**: `avila_protocol.move` - Main protocol entry point
- **Trading Engine**: `order_book.move`, `margin_engine.move`, `settlement_engine.move`
- **Asset Management**: `collateral_vault.move`, `tokenized_asset_registry.move`
- **Risk & Compliance**: `compliance_gate.move`, `governance_admin.move`
- **Oracle Integration**: `price_oracle_adapter.move`
- **Options Core**: `options_core.move` - Options contract logic
- **Testing**: Comprehensive test suite in `complete_protocol_tests.move`

**Quick Start:**
```bash
cd backend/smart-contracts
aptos move compile
aptos move test
```

### 🔧 Backend TypeScript (`backend/typescript/`)

TypeScript services for deployment, management, and integration:

- **Deployment Scripts**: Automated contract deployment
- **Protocol Management**: Initialization and verification tools
- **Integration Services**: API and external service connectors

**Quick Start:**
```bash
cd backend/typescript
npm install
npm run build
npm run deploy:testnet
```

### 🎨 Frontend (`frontend/`)

Frontend application for user interaction (currently a placeholder).

**Status**: Frontend implementation pending - structure prepared for future development.

### 📚 Documentation (`docs/`)

Comprehensive documentation including:

- **Architecture**: Protocol design and smart contract architecture
- **Deployment**: Setup and deployment instructions
- **Security**: Security considerations and audit information
- **API Reference**: Integration guides and examples

## Getting Started

### Prerequisites

- Node.js >= 16.0.0
- Aptos CLI
- Move language support

### Installation

1. **Clone and install dependencies:**
```bash
git clone <repository-url>
cd avila-protocol
npm run install:all
```

2. **Build all components:**
```bash
npm run build
```

3. **Run tests:**
```bash
npm run test:contracts
```

### Development Workflow

- **Smart Contracts**: Work in `backend/smart-contracts/`
- **Backend Services**: Develop in `backend/typescript/`
- **Frontend**: Implement in `frontend/` (when ready)
- **Documentation**: Update in `docs/`

### Available Scripts

| Script | Description |
|--------|-------------|
| `build:contracts` | Compile Move smart contracts |
| `build:backend` | Build TypeScript backend |
| `build:frontend` | Build frontend application |
| `build` | Build all components |
| `test:contracts` | Run Move contract tests |
| `deploy:testnet` | Deploy to testnet |
| `deploy:mainnet` | Deploy to mainnet |
| `initialize` | Initialize protocol |
| `verify` | Verify deployment |
| `lint` | Check Move code |
| `clean` | Clean build artifacts |
| `format` | Format Move code |

## Architecture

The Avila Protocol is built with a modular architecture:

- **Smart Contract Layer**: Core protocol logic in Move
- **Service Layer**: TypeScript services for external integration
- **Interface Layer**: User-facing applications (future)
- **Documentation Layer**: Comprehensive guides and references

## Contributing

1. Follow the established project structure
2. Develop smart contracts in `backend/smart-contracts/`
3. Add backend services in `backend/typescript/`
4. Update documentation in `docs/`
5. Implement frontend features in `frontend/`

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

For questions and support, please refer to the documentation in the `docs/` directory or open an issue in the repository.
